import { nanoid } from 'nanoid';
import { languageFromTelegramUser } from './i18n.js';
import { GAME_STATUS } from './store.js';
import { isWinningGuess, normalizeWord } from './normalizer.js';

const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 60;

function asId(value) {
  return String(value);
}

export function displayName(user) {
  const realName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (realName) {
    return realName;
  }
  if (user.username) {
    return `@${user.username}`;
  }
  return `user ${user.id}`;
}

export function chatTitle(chat) {
  return chat.title || chat.username || chat.first_name || String(chat.id);
}

export class GameService {
  constructor({ store, config, now = () => Date.now(), idFactory = nanoid }) {
    this.store = store;
    this.config = config;
    this.now = now;
    this.idFactory = idFactory;
  }

  ensureChat(chat, language) {
    const now = this.now();
    this.store.upsertChat({
      chatId: chat.id,
      title: chatTitle(chat),
      language: language ?? this.config.defaultLanguage,
      now
    });
    return this.store.getChat(chat.id);
  }

  getChatLanguage(chatId) {
    return this.store.getChat(chatId)?.language ?? this.config.defaultLanguage;
  }

  setChatLanguage(chat, language) {
    this.store.setChatLanguage({
      chatId: chat.id,
      title: chatTitle(chat),
      language,
      now: this.now()
    });
  }

  ensureUser(user) {
    if (!user?.id) {
      return null;
    }

    const fallbackLanguage = languageFromTelegramUser(user, this.config.defaultLanguage);
    this.store.upsertUser({
      userId: user.id,
      language: fallbackLanguage,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      now: this.now()
    });

    return this.store.getUser(user.id);
  }

  getUserLanguage(userId, fallback = this.config.defaultLanguage) {
    return this.store.getUser(userId)?.language ?? fallback;
  }

  setUserLanguage(user, language) {
    this.store.setUserLanguage({
      userId: user.id,
      language,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      now: this.now()
    });
  }

  startGame(chat, creator) {
    const now = this.now();
    this.store.expireDueGames(now);

    const existing = this.store.getActiveGame(chat.id);
    if (existing) {
      return { ok: false, reason: 'ACTIVE_GAME', game: existing };
    }

    const game = this.store.createGame({
      id: `g_${this.idFactory(12)}`,
      chatId: asId(chat.id),
      chatTitle: chatTitle(chat),
      status: GAME_STATUS.WAITING_WORD,
      creatorId: asId(creator.id),
      creatorName: displayName(creator),
      setupToken: this.idFactory(32),
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.config.gameMaxDurationMinutes * 60 * 1000
    });

    return { ok: true, game };
  }

  setSecretWord({ setupToken, telegramUser, word }) {
    const now = this.now();
    this.store.expireDueGames(now);

    const game = this.store.getGameBySetupToken(setupToken);
    if (!game) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (game.status === GAME_STATUS.EXPIRED || game.expires_at <= now) {
      return { ok: false, reason: 'EXPIRED', game };
    }
    if (game.creator_id !== asId(telegramUser.id)) {
      return { ok: false, reason: 'UNAUTHORIZED', game };
    }
    if (game.status !== GAME_STATUS.WAITING_WORD) {
      return { ok: false, reason: 'BAD_STATUS', game };
    }

    const cleanWord = String(word ?? '').trim().replace(/\s+/g, ' ');
    const normalizedWord = normalizeWord(cleanWord);
    if (
      cleanWord.length < MIN_WORD_LENGTH
      || cleanWord.length > MAX_WORD_LENGTH
      || normalizedWord.length < MIN_WORD_LENGTH
    ) {
      return { ok: false, reason: 'INVALID_WORD', game };
    }

    const updatedGame = this.store.setSecretWord({
      gameId: game.id,
      word: cleanWord,
      normalizedWord,
      now
    });

    return { ok: true, game: updatedGame };
  }

  assignDrawer({ gameId, telegramUser }) {
    const now = this.now();
    this.store.expireDueGames(now);

    const game = this.store.getGameById(gameId);
    if (!game) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (game.status === GAME_STATUS.EXPIRED || game.expires_at <= now) {
      return { ok: false, reason: 'EXPIRED', game };
    }
    if (game.status === GAME_STATUS.DRAWING) {
      return { ok: false, reason: 'DRAWER_TAKEN', game };
    }
    if (game.status !== GAME_STATUS.WAITING_DRAWER) {
      return { ok: false, reason: 'BAD_STATUS', game };
    }
    if (game.creator_id === asId(telegramUser.id)) {
      return { ok: false, reason: 'CREATOR_CANNOT_DRAW', game };
    }

    const updatedGame = this.store.setDrawer({
      gameId: game.id,
      drawerId: telegramUser.id,
      drawerName: displayName(telegramUser),
      drawToken: this.idFactory(32),
      now
    });

    return { ok: true, game: updatedGame };
  }

  authorizeSnapshot({ drawToken, telegramUser }) {
    const now = this.now();
    this.store.expireDueGames(now);

    const game = this.store.getGameByDrawToken(drawToken);
    if (!game) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (game.status === GAME_STATUS.EXPIRED || game.expires_at <= now) {
      return { ok: false, reason: 'EXPIRED', game };
    }
    if (game.status !== GAME_STATUS.DRAWING) {
      return { ok: false, reason: 'BAD_STATUS', game };
    }
    if (game.drawer_id !== asId(telegramUser.id)) {
      return { ok: false, reason: 'UNAUTHORIZED', game };
    }

    return { ok: true, game };
  }

  checkGuess({ chatId, telegramUser, text }) {
    const now = this.now();
    this.store.expireDueGames(now);

    const game = this.store.getActiveGame(chatId);
    if (!game) {
      return { ok: true, active: false };
    }
    if (game.expires_at <= now) {
      return { ok: false, reason: 'EXPIRED', game };
    }
    if (game.status !== GAME_STATUS.DRAWING) {
      return { ok: true, active: true, won: false, game };
    }

    const userId = asId(telegramUser.id);
    if (userId === game.creator_id || userId === game.drawer_id) {
      return { ok: true, active: true, won: false, excluded: true, game };
    }

    if (!isWinningGuess(text, game.secret_word)) {
      return { ok: true, active: true, won: false, game };
    }

    const updatedGame = this.store.finishGame({
      gameId: game.id,
      winnerId: telegramUser.id,
      winnerName: displayName(telegramUser),
      now
    });

    return { ok: true, active: true, won: true, game: updatedGame };
  }

  stopActiveGame(chatId) {
    const now = this.now();
    this.store.expireDueGames(now);

    const game = this.store.getActiveGame(chatId);
    if (!game) {
      return { ok: false, reason: 'NO_ACTIVE_GAME' };
    }

    return {
      ok: true,
      game: this.store.stopGame({ gameId: game.id, now })
    };
  }
}
