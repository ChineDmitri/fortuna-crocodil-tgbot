import { Input } from 'telegraf';
import { t } from './i18n.js';

export class SnapshotPublisher {
  constructor({ telegram, store, gameService, config, now = () => Date.now() }) {
    this.telegram = telegram;
    this.store = store;
    this.gameService = gameService;
    this.config = config;
    this.now = now;
  }

  async publish(game, imageBuffer) {
    const now = this.now();
    const lastUpdate = Number(game.last_image_update_at ?? 0);

    if (
      game.image_message_id
      && lastUpdate
      && now - lastUpdate < this.config.imageUpdateIntervalMs
    ) {
      return { published: false, reason: 'THROTTLED' };
    }

    const lang = this.gameService.getChatLanguage(game.chat_id);
    const caption = t(lang, 'firstImageCaption', { drawer: game.drawer_name });
    const photo = Input.fromBuffer(imageBuffer, `croco-${game.id}.jpg`);

    if (!game.image_message_id) {
      const message = await this.telegram.sendPhoto(game.chat_id, photo, { caption });
      this.store.setImageMessage({
        gameId: game.id,
        messageId: message.message_id,
        now
      });
      return { published: true, mode: 'sent', messageId: message.message_id };
    }

    try {
      await this.telegram.editMessageMedia(
        game.chat_id,
        game.image_message_id,
        undefined,
        { type: 'photo', media: photo, caption }
      );
      this.store.touchImageUpdate({ gameId: game.id, now });
      return { published: true, mode: 'edited', messageId: game.image_message_id };
    } catch (error) {
      const message = await this.telegram.sendPhoto(game.chat_id, photo, { caption });
      this.store.setImageMessage({
        gameId: game.id,
        messageId: message.message_id,
        now
      });
      return {
        published: true,
        mode: 'resent',
        messageId: message.message_id,
        previousEditError: error.message
      };
    }
  }
}

