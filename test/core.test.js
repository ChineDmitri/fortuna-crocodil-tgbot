import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validateConfig } from '../src/config.js';
import { languageFromTelegramUser, t } from '../src/i18n.js';
import { GameService } from '../src/gameService.js';
import { normalizeWord, isWinningGuess } from '../src/normalizer.js';
import { Store, GAME_STATUS } from '../src/store.js';
import { validateTelegramWebAppInitData } from '../src/telegramAuth.js';

function config(overrides = {}) {
  return {
    telegramBotToken: '123456:TEST_TOKEN',
    publicBaseUrl: 'https://example.ngrok-free.app',
    http: { port: 3000 },
    database: { path: ':memory:' },
    defaultLanguage: 'ru',
    imageUpdateIntervalMs: 2000,
    gameMaxDurationMinutes: 20,
    snapshotMaxBytes: 1_500_000,
    ...overrides
  };
}

function signedInitData(params, botToken) {
  const searchParams = new URLSearchParams(params);
  const dataCheckString = [...searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  searchParams.set('hash', hash);
  return searchParams.toString();
}

test('normalizes accents, punctuation, spaces, and Russian yo', () => {
  assert.equal(normalizeWord('  Café   noir! '), 'cafe noir');
  assert.equal(normalizeWord('Ёжик'), 'ежик');
  assert.equal(isWinningGuess('cafe noir', 'Café noir'), true);
  assert.equal(isWinningGuess('CAFÉ NOIR!!!', 'café noir'), true);
  assert.equal(isWinningGuess('ЁЖИК', 'ёжик'), true);
  assert.equal(isWinningGuess('cafe', 'Café noir'), false);
});

test('i18n resolves supported languages and falls back to French keys', () => {
  assert.equal(t('en', 'langChanged'), 'Language changed to English.');
  assert.equal(t('ru', 'winner', { winner: 'Ivan', word: 'дом' }), 'Ivan угадал слово: дом. Игра окончена.');
  assert.equal(t('xx', 'langChanged'), 'Язык изменен на русский.');
  assert.equal(languageFromTelegramUser({ language_code: 'en-US' }, 'fr'), 'en');
  assert.equal(languageFromTelegramUser({ language_code: 'de-DE' }, 'fr'), 'fr');
  assert.equal(languageFromTelegramUser({ language_code: 'de-DE' }), 'ru');
});

test('config validation rejects placeholders and accepts a complete local config', () => {
  assert.equal(validateConfig(config()).defaultLanguage, 'ru');
  const { defaultLanguage, ...withoutDefaultLanguage } = config();
  assert.equal(validateConfig(withoutDefaultLanguage).defaultLanguage, 'ru');
  assert.throws(() => validateConfig(config({ telegramBotToken: 'PASTE_BOTFATHER_TOKEN_HERE' })), /telegramBotToken/);
  assert.throws(() => validateConfig(config({ publicBaseUrl: 'http://localhost:3000' })), /HTTPS/);
  assert.throws(() => validateConfig(config({ defaultLanguage: 'de' })), /defaultLanguage/);
});

test('validates Telegram Mini App initData', () => {
  const botToken = '123456:TEST_TOKEN';
  const nowMs = 1_700_000_000_000;
  const initData = signedInitData({
    query_id: 'query-1',
    auth_date: String(Math.floor(nowMs / 1000)),
    user: JSON.stringify({ id: 42, first_name: 'Alice' })
  }, botToken);

  const result = validateTelegramWebAppInitData(initData, botToken, { nowMs });
  assert.equal(result.user.id, 42);
  assert.equal(result.queryId, 'query-1');

  assert.throws(
    () => validateTelegramWebAppInitData(`${initData.replace(/.$/, '0')}`, botToken, { nowMs }),
    /hash/
  );
});

test('game service persists a full game flow in SQLite', () => {
  const store = new Store(':memory:');
  const ids = ['gameid123456', 'setup-token-12345678901234567890', 'draw-token-12345678901234567890'];
  let now = 1_700_000_000_000;
  const service = new GameService({
    store,
    config: config(),
    now: () => now,
    idFactory: (size) => ids.shift().slice(0, size)
  });

  const chat = { id: -1001, type: 'supergroup', title: 'Croco Group' };
  const creator = { id: 1, first_name: 'Alice' };
  const drawer = { id: 2, first_name: 'Bob' };
  const winner = { id: 3, first_name: 'Claire' };

  service.ensureChat(chat, 'fr');
  const started = service.startGame(chat, creator);
  assert.equal(started.ok, true);
  assert.equal(started.game.status, GAME_STATUS.WAITING_WORD);

  const duplicate = service.startGame(chat, creator);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'ACTIVE_GAME');

  const unauthorizedWord = service.setSecretWord({
    setupToken: started.game.setup_token,
    telegramUser: drawer,
    word: 'Café noir'
  });
  assert.equal(unauthorizedWord.reason, 'UNAUTHORIZED');

  const word = service.setSecretWord({
    setupToken: started.game.setup_token,
    telegramUser: creator,
    word: 'Café noir'
  });
  assert.equal(word.ok, true);
  assert.equal(word.game.status, GAME_STATUS.WAITING_DRAWER);
  assert.equal(word.game.secret_normalized, 'cafe noir');

  const creatorDraw = service.assignDrawer({ gameId: started.game.id, telegramUser: creator });
  assert.equal(creatorDraw.reason, 'CREATOR_CANNOT_DRAW');

  const assigned = service.assignDrawer({ gameId: started.game.id, telegramUser: drawer });
  assert.equal(assigned.ok, true);
  assert.equal(assigned.game.status, GAME_STATUS.DRAWING);

  const creatorGuess = service.checkGuess({ chatId: chat.id, telegramUser: creator, text: 'cafe noir' });
  assert.equal(creatorGuess.won, false);
  assert.equal(creatorGuess.excluded, true);

  const drawerGuess = service.checkGuess({ chatId: chat.id, telegramUser: drawer, text: 'cafe noir' });
  assert.equal(drawerGuess.won, false);
  assert.equal(drawerGuess.excluded, true);

  const wrongGuess = service.checkGuess({ chatId: chat.id, telegramUser: winner, text: 'cafe' });
  assert.equal(wrongGuess.won, false);

  const winningGuess = service.checkGuess({ chatId: chat.id, telegramUser: winner, text: 'CAFÉ NOIR!!!' });
  assert.equal(winningGuess.won, true);
  assert.equal(winningGuess.game.status, GAME_STATUS.FINISHED);
  assert.equal(winningGuess.game.winner_name, 'Claire');

  const noStop = service.stopActiveGame(chat.id);
  assert.equal(noStop.reason, 'NO_ACTIVE_GAME');

  now += 1;
  store.close();
});

test('user language preference is persisted and overrides Telegram language_code defaults', () => {
  const store = new Store(':memory:');
  let now = 1_700_000_000_000;
  const service = new GameService({
    store,
    config: config(),
    now: () => now
  });

  const user = {
    id: 99,
    first_name: 'Ivan',
    username: 'ivan',
    language_code: 'ru-RU'
  };

  service.ensureUser(user);
  assert.equal(service.getUserLanguage(user.id), 'ru');

  now += 1;
  service.setUserLanguage(user, 'en');
  assert.equal(service.getUserLanguage(user.id), 'en');

  now += 1;
  service.ensureUser({ ...user, language_code: 'ru-RU', first_name: 'Ivan Updated' });
  assert.equal(service.getUserLanguage(user.id), 'en');
  assert.equal(store.getUser(user.id).first_name, 'Ivan Updated');

  store.close();
});

test('expired games no longer block new games', () => {
  const store = new Store(':memory:');
  const ids = ['firstgame123', 'firstsetup123456789012345678901', 'secondgame12', 'secondsetup12345678901234567890'];
  let now = 1_700_000_000_000;
  const service = new GameService({
    store,
    config: config({ gameMaxDurationMinutes: 1 }),
    now: () => now,
    idFactory: (size) => ids.shift().slice(0, size)
  });
  const chat = { id: -1002, type: 'group', title: 'Group' };
  const creator = { id: 1, first_name: 'Alice' };

  service.ensureChat(chat, 'fr');
  assert.equal(service.startGame(chat, creator).ok, true);
  now += 61_000;
  const second = service.startGame(chat, creator);

  assert.equal(second.ok, true);
  assert.equal(store.getGameById('g_firstgame123').status, GAME_STATUS.EXPIRED);
  store.close();
});
