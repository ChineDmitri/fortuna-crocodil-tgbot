import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { t } from './i18n.js';
import { validateTelegramWebAppInitData } from './telegramAuth.js';
import { renderCreateWordPage, renderDrawPage, renderStatusPage } from './webPages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function apiError(res, status, code, message) {
  return res.status(status).json({ ok: false, code, message });
}

function decodeImageDataUrl(imageData, maxBytes) {
  if (typeof imageData !== 'string') {
    throw new Error('imageData must be a data URL');
  }

  const match = imageData.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('imageData must be a PNG or JPEG data URL');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > maxBytes) {
    throw new Error(`imageData is too large; max ${maxBytes} bytes`);
  }

  return buffer;
}

function requestUser(req, config) {
  return validateTelegramWebAppInitData(req.body?.initData, config.telegramBotToken).user;
}

function errorForGameReason(reason, lang, action = 'generic') {
  const map = {
    NOT_FOUND: [404, 'NOT_FOUND', t(lang, 'invalidStartLink')],
    EXPIRED: [410, 'EXPIRED', t(lang, 'expired')],
    UNAUTHORIZED: [403, 'UNAUTHORIZED', t(lang, 'notYourGame')],
    BAD_STATUS: [409, 'BAD_STATUS', action === 'word' ? t(lang, 'wordAlreadySet') : t(lang, 'badGameState')],
    INVALID_WORD: [400, 'INVALID_WORD', t(lang, 'web.invalidWord')]
  };
  return map[reason] ?? [400, reason, reason];
}

export function createHttpServer({
  config,
  gameService,
  snapshotPublisher,
  telegram,
  sendWordReadyMessage
}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: Math.ceil(config.snapshotMaxBytes * 2.2) }));
  app.use('/static', express.static(path.join(projectRoot, 'public'), {
    etag: true,
    maxAge: '1h'
  }));

  app.get('/', (_req, res) => {
    res.type('html').send(renderStatusPage());
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/create-word', (req, res) => {
    const token = String(req.query.token ?? '');
    const game = gameService.store.getGameBySetupToken(token);
    const lang = req.query.lang || (game ? gameService.getChatLanguage(game.chat_id) : config.defaultLanguage);

    if (!token || !game) {
      res.status(404).type('html').send(renderStatusPage());
      return;
    }

    res.type('html').send(renderCreateWordPage({ lang, token }));
  });

  app.get('/draw', (req, res) => {
    const token = String(req.query.token ?? '');
    const game = gameService.store.getGameByDrawToken(token);
    const lang = req.query.lang || (game ? gameService.getChatLanguage(game.chat_id) : config.defaultLanguage);

    if (!token || !game) {
      res.status(404).type('html').send(renderStatusPage());
      return;
    }

    res.type('html').send(renderDrawPage({
      lang,
      token,
      snapshotIntervalMs: config.imageUpdateIntervalMs
    }));
  });

  app.post('/api/games/word', async (req, res) => {
    const token = String(req.body?.token ?? '');
    let telegramUser;

    try {
      telegramUser = requestUser(req, config);
      gameService.ensureUser(telegramUser);
    } catch (error) {
      return apiError(res, 401, 'INVALID_INIT_DATA', error.message);
    }

    const game = gameService.store.getGameBySetupToken(token);
    const lang = gameService.getUserLanguage(
      telegramUser.id,
      game ? gameService.getChatLanguage(game.chat_id) : config.defaultLanguage
    );
    const result = gameService.setSecretWord({
      setupToken: token,
      telegramUser,
      word: req.body?.word
    });

    if (!result.ok) {
      const [status, code, message] = errorForGameReason(result.reason, lang, 'word');
      return apiError(res, status, code, message);
    }

    try {
      await sendWordReadyMessage(telegram, result.game);
    } catch (error) {
      console.error('Could not notify group that the word is ready:', error);
    }

    return res.json({ ok: true });
  });

  app.post('/api/games/snapshot', async (req, res) => {
    const token = String(req.body?.token ?? '');
    let telegramUser;

    try {
      telegramUser = requestUser(req, config);
      gameService.ensureUser(telegramUser);
    } catch (error) {
      return apiError(res, 401, 'INVALID_INIT_DATA', error.message);
    }

    const auth = gameService.authorizeSnapshot({ drawToken: token, telegramUser });
    const lang = gameService.getUserLanguage(
      telegramUser.id,
      auth.game ? gameService.getChatLanguage(auth.game.chat_id) : config.defaultLanguage
    );

    if (!auth.ok) {
      const [status, code, message] = errorForGameReason(auth.reason, lang);
      return apiError(res, status, code, message);
    }

    let imageBuffer;
    try {
      imageBuffer = decodeImageDataUrl(req.body?.imageData, config.snapshotMaxBytes);
    } catch (error) {
      return apiError(res, 400, 'INVALID_IMAGE', error.message);
    }

    try {
      const publishResult = await snapshotPublisher.publish(auth.game, imageBuffer);
      return res.json({ ok: true, ...publishResult });
    } catch (error) {
      console.error('Could not publish snapshot:', error);
      return apiError(res, 502, 'TELEGRAM_PUBLISH_FAILED', t(lang, 'web.requestFailed'));
    }
  });

  return app;
}
