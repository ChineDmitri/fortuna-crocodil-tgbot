import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export const GAME_STATUS = {
  WAITING_WORD: 'WAITING_WORD',
  WAITING_DRAWER: 'WAITING_DRAWER',
  DRAWING: 'DRAWING',
  FINISHED: 'FINISHED',
  STOPPED: 'STOPPED',
  EXPIRED: 'EXPIRED'
};

export const ACTIVE_STATUSES = [
  GAME_STATUS.WAITING_WORD,
  GAME_STATUS.WAITING_DRAWER,
  GAME_STATUS.DRAWING
];

export class Store {
  constructor(databasePath) {
    const resolvedPath = databasePath === ':memory:' ? databasePath : path.resolve(databasePath);

    if (resolvedPath !== ':memory:') {
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('foreign_keys = ON');

    if (resolvedPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
    }

    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        chat_id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        title TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        chat_title TEXT,
        status TEXT NOT NULL,
        secret_word TEXT,
        secret_normalized TEXT,
        creator_id TEXT NOT NULL,
        creator_name TEXT NOT NULL,
        drawer_id TEXT,
        drawer_name TEXT,
        winner_id TEXT,
        winner_name TEXT,
        setup_token TEXT NOT NULL UNIQUE,
        draw_token TEXT UNIQUE,
        image_message_id INTEGER,
        last_image_update_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        finished_at INTEGER
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_games_active_chat
        ON games(chat_id)
        WHERE status IN ('WAITING_WORD', 'WAITING_DRAWER', 'DRAWING');

      CREATE INDEX IF NOT EXISTS ix_games_setup_token ON games(setup_token);
      CREATE INDEX IF NOT EXISTS ix_games_draw_token ON games(draw_token);
      CREATE INDEX IF NOT EXISTS ix_games_expires_at ON games(expires_at);
    `);
  }

  close() {
    this.db.close();
  }

  upsertChat({ chatId, title, language, now }) {
    this.db.prepare(`
      INSERT INTO chats (chat_id, title, language, updated_at)
      VALUES (@chatId, @title, @language, @now)
      ON CONFLICT(chat_id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at
    `).run({
      chatId: String(chatId),
      title: title ?? null,
      language,
      now
    });
  }

  setChatLanguage({ chatId, title, language, now }) {
    this.db.prepare(`
      INSERT INTO chats (chat_id, title, language, updated_at)
      VALUES (@chatId, @title, @language, @now)
      ON CONFLICT(chat_id) DO UPDATE SET
        title = excluded.title,
        language = excluded.language,
        updated_at = excluded.updated_at
    `).run({
      chatId: String(chatId),
      title: title ?? null,
      language,
      now
    });
  }

  getChat(chatId) {
    return this.db.prepare('SELECT * FROM chats WHERE chat_id = ?').get(String(chatId)) ?? null;
  }

  upsertUser({ userId, language, firstName, lastName, username, now }) {
    this.db.prepare(`
      INSERT INTO users (user_id, language, first_name, last_name, username, updated_at)
      VALUES (@userId, @language, @firstName, @lastName, @username, @now)
      ON CONFLICT(user_id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        username = excluded.username,
        updated_at = excluded.updated_at
    `).run({
      userId: String(userId),
      language,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      username: username ?? null,
      now
    });
  }

  setUserLanguage({ userId, language, firstName, lastName, username, now }) {
    this.db.prepare(`
      INSERT INTO users (user_id, language, first_name, last_name, username, updated_at)
      VALUES (@userId, @language, @firstName, @lastName, @username, @now)
      ON CONFLICT(user_id) DO UPDATE SET
        language = excluded.language,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        username = excluded.username,
        updated_at = excluded.updated_at
    `).run({
      userId: String(userId),
      language,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      username: username ?? null,
      now
    });
  }

  getUser(userId) {
    return this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(String(userId)) ?? null;
  }

  createGame(game) {
    this.db.prepare(`
      INSERT INTO games (
        id,
        chat_id,
        chat_title,
        status,
        creator_id,
        creator_name,
        setup_token,
        created_at,
        updated_at,
        expires_at
      )
      VALUES (
        @id,
        @chatId,
        @chatTitle,
        @status,
        @creatorId,
        @creatorName,
        @setupToken,
        @createdAt,
        @updatedAt,
        @expiresAt
      )
    `).run(game);

    return this.getGameById(game.id);
  }

  getGameById(gameId) {
    return this.db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) ?? null;
  }

  getGameBySetupToken(setupToken) {
    return this.db.prepare('SELECT * FROM games WHERE setup_token = ?').get(setupToken) ?? null;
  }

  getGameByDrawToken(drawToken) {
    return this.db.prepare('SELECT * FROM games WHERE draw_token = ?').get(drawToken) ?? null;
  }

  getActiveGame(chatId) {
    return this.db.prepare(`
      SELECT *
      FROM games
      WHERE chat_id = ?
        AND status IN ('WAITING_WORD', 'WAITING_DRAWER', 'DRAWING')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(String(chatId)) ?? null;
  }

  expireDueGames(now) {
    return this.db.prepare(`
      UPDATE games
      SET status = @status,
        updated_at = @now,
        finished_at = @now
      WHERE status IN ('WAITING_WORD', 'WAITING_DRAWER', 'DRAWING')
        AND expires_at <= @now
    `).run({
      status: GAME_STATUS.EXPIRED,
      now
    }).changes;
  }

  setSecretWord({ gameId, word, normalizedWord, now }) {
    this.db.prepare(`
      UPDATE games
      SET secret_word = @word,
        secret_normalized = @normalizedWord,
        status = @status,
        updated_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      word,
      normalizedWord,
      status: GAME_STATUS.WAITING_DRAWER,
      now
    });

    return this.getGameById(gameId);
  }

  setDrawer({ gameId, drawerId, drawerName, drawToken, now }) {
    this.db.prepare(`
      UPDATE games
      SET drawer_id = @drawerId,
        drawer_name = @drawerName,
        draw_token = @drawToken,
        status = @status,
        updated_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      drawerId: String(drawerId),
      drawerName,
      drawToken,
      status: GAME_STATUS.DRAWING,
      now
    });

    return this.getGameById(gameId);
  }

  setImageMessage({ gameId, messageId, now }) {
    this.db.prepare(`
      UPDATE games
      SET image_message_id = @messageId,
        last_image_update_at = @now,
        updated_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      messageId,
      now
    });

    return this.getGameById(gameId);
  }

  touchImageUpdate({ gameId, now }) {
    this.db.prepare(`
      UPDATE games
      SET last_image_update_at = @now,
        updated_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      now
    });

    return this.getGameById(gameId);
  }

  finishGame({ gameId, winnerId, winnerName, now }) {
    this.db.prepare(`
      UPDATE games
      SET status = @status,
        winner_id = @winnerId,
        winner_name = @winnerName,
        updated_at = @now,
        finished_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      winnerId: String(winnerId),
      winnerName,
      status: GAME_STATUS.FINISHED,
      now
    });

    return this.getGameById(gameId);
  }

  stopGame({ gameId, now }) {
    this.db.prepare(`
      UPDATE games
      SET status = @status,
        updated_at = @now,
        finished_at = @now
      WHERE id = @gameId
    `).run({
      gameId,
      status: GAME_STATUS.STOPPED,
      now
    });

    return this.getGameById(gameId);
  }
}
