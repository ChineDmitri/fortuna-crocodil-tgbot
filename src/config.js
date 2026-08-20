import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_LANGUAGES } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read config file ${filePath}: ${error.message}`);
  }
}

export function defaultConfigPath() {
  return path.join(projectRoot, 'config.local.json');
}

export function loadConfig(configPath = process.env.CROCO_CONFIG || defaultConfigPath()) {
  const absolutePath = path.resolve(projectRoot, configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Config file not found: ${absolutePath}. Copy config.example.json to config.local.json and edit it.`
    );
  }

  const raw = readJson(absolutePath);
  return validateConfig(raw, absolutePath);
}

export function validateConfig(raw, sourcePath = 'config') {
  assertObject(raw, sourcePath);

  const http = raw.http ?? {};
  const database = raw.database ?? {};
  assertObject(http, 'http');
  assertObject(database, 'database');

  const config = {
    telegramBotToken: String(raw.telegramBotToken ?? '').trim(),
    publicBaseUrl: String(raw.publicBaseUrl ?? '').trim().replace(/\/+$/, ''),
    http: {
      port: Number(http.port ?? 3000)
    },
    database: {
      path: String(database.path ?? './data/croco.sqlite')
    },
    defaultLanguage: String(raw.defaultLanguage ?? 'ru').trim(),
    imageUpdateIntervalMs: Number(raw.imageUpdateIntervalMs ?? 2000),
    gameMaxDurationMinutes: Number(raw.gameMaxDurationMinutes ?? 20),
    snapshotMaxBytes: Number(raw.snapshotMaxBytes ?? 1_500_000)
  };

  if (!config.telegramBotToken || config.telegramBotToken.includes('PASTE_')) {
    throw new Error('telegramBotToken must contain the token from BotFather');
  }

  let publicUrl;
  try {
    publicUrl = new URL(config.publicBaseUrl);
  } catch {
    throw new Error('publicBaseUrl must be a valid URL');
  }

  if (publicUrl.protocol !== 'https:') {
    throw new Error('publicBaseUrl must be an HTTPS URL, for example an ngrok HTTPS URL');
  }

  assertPositiveInteger(config.http.port, 'http.port');
  assertPositiveInteger(config.imageUpdateIntervalMs, 'imageUpdateIntervalMs');
  assertPositiveInteger(config.gameMaxDurationMinutes, 'gameMaxDurationMinutes');
  assertPositiveInteger(config.snapshotMaxBytes, 'snapshotMaxBytes');

  if (!SUPPORTED_LANGUAGES.includes(config.defaultLanguage)) {
    throw new Error(`defaultLanguage must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  return config;
}
