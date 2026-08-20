import { Telegraf } from 'telegraf';
import { SUPPORTED_LANGUAGES, t } from './i18n.js';
import { callbackKeyboard, urlKeyboard, webAppKeyboard } from './keyboards.js';
import { publicUrl, telegramStartUrl } from './url.js';

const SETUP_PREFIX = 'setup_';
const DRAW_PREFIX = 'draw_';
const DRAW_CALLBACK_PREFIX = 'draw:';

function isGroupChat(chat) {
  return chat && (chat.type === 'group' || chat.type === 'supergroup');
}

function commandArgument(text) {
  return String(text ?? '').trim().split(/\s+/).slice(1).join(' ');
}

function startPayload(ctx) {
  return ctx.startPayload || commandArgument(ctx.message?.text);
}

function setupPayload(game) {
  return `${SETUP_PREFIX}${game.setup_token}`;
}

function drawPayload(game) {
  return `${DRAW_PREFIX}${game.draw_token}`;
}

async function botUsername(ctx, cache) {
  if (!cache.username) {
    const me = ctx.botInfo ?? await ctx.telegram.getMe();
    cache.username = me.username;
  }
  return cache.username;
}

function gameLanguage(game, gameService) {
  return gameService.getChatLanguage(game.chat_id);
}

function userLanguage(user, gameService, fallback) {
  return gameService.getUserLanguage(user.id, fallback);
}

async function sendPrivateCreateInvite({ telegram, config, gameService, game, userId }) {
  const lang = gameService.getUserLanguage(userId, gameLanguage(game, gameService));
  const url = publicUrl(config, '/create-word', { token: game.setup_token, lang });

  await telegram.sendMessage(
    userId,
    t(lang, 'privateCreateIntro', { group: game.chat_title }),
    webAppKeyboard(t(lang, 'createWordButton'), url)
  );
}

async function sendPrivateDrawInvite({ telegram, config, gameService, game, userId }) {
  const lang = gameService.getUserLanguage(userId, gameLanguage(game, gameService));
  const url = publicUrl(config, '/draw', { token: game.draw_token, lang });

  await telegram.sendMessage(
    userId,
    t(lang, 'openDraw'),
    webAppKeyboard(t(lang, 'drawOpenButton'), url)
  );
}

async function handlePrivateStart(ctx, { config, gameService }) {
  const payload = startPayload(ctx);
  const fallbackLang = userLanguage(ctx.from, gameService, config.defaultLanguage);

  if (payload.startsWith(SETUP_PREFIX)) {
    const setupToken = payload.slice(SETUP_PREFIX.length);
    const game = gameService.store.getGameBySetupToken(setupToken);
    const lang = userLanguage(ctx.from, gameService, game ? gameLanguage(game, gameService) : fallbackLang);

    if (!game) {
      await ctx.reply(t(lang, 'invalidStartLink'));
      return;
    }
    if (String(ctx.from.id) !== game.creator_id) {
      await ctx.reply(t(lang, 'notYourGame'));
      return;
    }
    if (game.secret_word) {
      await ctx.reply(t(lang, 'wordAlreadySet'));
      return;
    }

    const url = publicUrl(config, '/create-word', { token: setupToken, lang });
    await ctx.reply(t(lang, 'openCreateWord'), webAppKeyboard(t(lang, 'createWordButton'), url));
    return;
  }

  if (payload.startsWith(DRAW_PREFIX)) {
    const drawToken = payload.slice(DRAW_PREFIX.length);
    const game = gameService.store.getGameByDrawToken(drawToken);
    const lang = userLanguage(ctx.from, gameService, game ? gameLanguage(game, gameService) : fallbackLang);

    if (!game) {
      await ctx.reply(t(lang, 'invalidStartLink'));
      return;
    }
    if (String(ctx.from.id) !== game.drawer_id) {
      await ctx.reply(t(lang, 'notYourGame'));
      return;
    }

    const url = publicUrl(config, '/draw', { token: drawToken, lang });
    await ctx.reply(t(lang, 'openDraw'), webAppKeyboard(t(lang, 'drawOpenButton'), url));
    return;
  }

  await ctx.reply(t(fallbackLang, 'privateHelp'));
}

async function handleGuess(ctx, gameService, text, { replyOnMiss }) {
  const result = gameService.checkGuess({
    chatId: ctx.chat.id,
    telegramUser: ctx.from,
    text
  });

  const lang = result.game
    ? gameLanguage(result.game, gameService)
    : gameService.getChatLanguage(ctx.chat.id);

  if (!result.ok && result.reason === 'EXPIRED') {
    await ctx.reply(t(lang, 'expired'));
    return;
  }

  if (!result.active) {
    if (replyOnMiss) {
      await ctx.reply(t(lang, 'noActiveGame'));
    }
    return;
  }

  if (result.won) {
    await ctx.reply(t(lang, 'winner', {
      winner: result.game.winner_name,
      word: result.game.secret_word
    }));
    return;
  }

  if (replyOnMiss && result.excluded) {
    await ctx.reply(t(lang, 'guessExcluded'));
    return;
  }

  if (replyOnMiss) {
    await ctx.reply(t(lang, 'wrongGuess'));
  }
}

export function createBot({ config, gameService }) {
  const bot = new Telegraf(config.telegramBotToken);
  const cache = { username: null };

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      gameService.ensureUser(ctx.from);
    }

    if (isGroupChat(ctx.chat)) {
      gameService.ensureChat(ctx.chat, gameService.getChatLanguage(ctx.chat.id));
    }

    return next();
  });

  bot.start(async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await handlePrivateStart(ctx, { config, gameService });
      return;
    }

    const lang = gameService.getChatLanguage(ctx.chat.id);
    await ctx.reply(t(lang, 'help'));
  });

  bot.help(async (ctx) => {
    const lang = ctx.chat?.type === 'private'
      ? userLanguage(ctx.from, gameService, config.defaultLanguage)
      : gameService.getChatLanguage(ctx.chat.id);
    await ctx.reply(ctx.chat?.type === 'private' ? t(lang, 'privateHelp') : t(lang, 'help'));
  });

  bot.command('lang', async (ctx) => {
    const requested = commandArgument(ctx.message.text).trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(requested)) {
      const fallback = isGroupChat(ctx.chat)
        ? gameService.getChatLanguage(ctx.chat.id)
        : config.defaultLanguage;
      const lang = userLanguage(ctx.from, gameService, fallback);
      await ctx.reply(t(lang, 'langUsage'));
      return;
    }

    gameService.setUserLanguage(ctx.from, requested);
    if (isGroupChat(ctx.chat)) {
      gameService.setChatLanguage(ctx.chat, requested);
    }

    await ctx.reply(t(requested, 'langChanged'));
  });

  bot.command('newgame', async (ctx) => {
    if (!isGroupChat(ctx.chat)) {
      await ctx.reply(t(userLanguage(ctx.from, gameService, config.defaultLanguage), 'onlyGroups'));
      return;
    }

    const result = gameService.startGame(ctx.chat, ctx.from);
    const lang = gameService.getChatLanguage(ctx.chat.id);

    if (!result.ok) {
      await ctx.reply(t(lang, 'activeGame'));
      return;
    }

    const game = result.game;
    const username = await botUsername(ctx, cache);
    const privateUrl = telegramStartUrl(username, setupPayload(game));
    let privateStatus = t(lang, 'setupPrivateSent');

    try {
      await sendPrivateCreateInvite({
        telegram: ctx.telegram,
        config,
        gameService,
        game,
        userId: ctx.from.id
      });
    } catch {
      privateStatus = t(lang, 'setupPrivateFailed');
    }

    await ctx.reply(
      `${t(lang, 'newGameCreated', { creator: game.creator_name })}\n${privateStatus}`,
      urlKeyboard(t(lang, 'createWordButton'), privateUrl)
    );
  });

  bot.command('stopgame', async (ctx) => {
    if (!isGroupChat(ctx.chat)) {
      await ctx.reply(t(userLanguage(ctx.from, gameService, config.defaultLanguage), 'onlyGroups'));
      return;
    }

    const lang = gameService.getChatLanguage(ctx.chat.id);
    const result = gameService.stopActiveGame(ctx.chat.id);
    await ctx.reply(result.ok ? t(lang, 'stopped') : t(lang, 'noActiveGame'));
  });

  bot.command('guess', async (ctx) => {
    if (!isGroupChat(ctx.chat)) {
      await ctx.reply(t(userLanguage(ctx.from, gameService, config.defaultLanguage), 'onlyGroups'));
      return;
    }

    const guess = commandArgument(ctx.message.text);
    const lang = gameService.getChatLanguage(ctx.chat.id);
    if (!guess) {
      await ctx.reply(t(lang, 'guessUsage'));
      return;
    }

    await handleGuess(ctx, gameService, guess, { replyOnMiss: true });
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data ?? '';
    if (!data.startsWith(DRAW_CALLBACK_PREFIX)) {
      await ctx.answerCbQuery();
      return;
    }

    const gameId = data.slice(DRAW_CALLBACK_PREFIX.length);
    const result = gameService.assignDrawer({ gameId, telegramUser: ctx.from });
    const game = result.game;
    const groupLang = game ? gameLanguage(game, gameService) : config.defaultLanguage;
    const actorLang = userLanguage(ctx.from, gameService, groupLang);

    if (!result.ok) {
      const messages = {
        DRAWER_TAKEN: t(actorLang, 'drawTaken'),
        CREATOR_CANNOT_DRAW: t(actorLang, 'drawerIsCreator'),
        EXPIRED: t(actorLang, 'expired')
      };
      await ctx.answerCbQuery(messages[result.reason] ?? t(actorLang, 'invalidStartLink'), { show_alert: false });
      return;
    }

    await ctx.answerCbQuery(t(actorLang, 'drawerAssigned', { drawer: result.game.drawer_name }));

    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch {
      // The game can continue even if Telegram refuses to edit an old markup.
    }

    const username = await botUsername(ctx, cache);
    const privateUrl = telegramStartUrl(username, drawPayload(result.game));
    let privateStatus = t(groupLang, 'drawerPrivateSent');

    try {
      await sendPrivateDrawInvite({
        telegram: ctx.telegram,
        config,
        gameService,
        game: result.game,
        userId: ctx.from.id
      });
    } catch {
      privateStatus = t(groupLang, 'drawerPrivateFailed');
    }

    await ctx.reply(
      `${t(groupLang, 'drawerAssigned', { drawer: result.game.drawer_name })}\n${privateStatus}`,
      urlKeyboard(t(groupLang, 'drawOpenButton'), privateUrl)
    );
  });

  bot.on('text', async (ctx) => {
    if (!isGroupChat(ctx.chat) || String(ctx.message.text).startsWith('/')) {
      return;
    }

    await handleGuess(ctx, gameService, ctx.message.text, { replyOnMiss: false });
  });

  bot.catch((error) => {
    console.error('Telegram bot error:', error);
  });

  return {
    bot,
    sendWordReadyMessage: async (telegram, game) => {
      const lang = gameLanguage(game, gameService);
      await telegram.sendMessage(
        game.chat_id,
        t(lang, 'wordReady'),
        callbackKeyboard(t(lang, 'drawButton'), `${DRAW_CALLBACK_PREFIX}${game.id}`)
      );
    }
  };
}
