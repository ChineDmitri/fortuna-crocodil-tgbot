# Croco Bot

Telegram group drawing game bot in Node.js. One player creates a secret word, another player draws it in a Telegram Mini App canvas, and the bot updates the drawing image in the group until someone guesses the word.

Russian documentation is available in [README_RU.md](README_RU.md).

## Telegram Setup

1. Create a bot with BotFather and keep the token.
2. In BotFather, open `/setprivacy` and choose `Disable`.
   Without this, the bot cannot read normal group messages. Players can still guess with `/guess word`.
3. Add the bot to your Telegram group.
4. Players who create a word or draw must be able to open a private chat with the bot. If the bot cannot message them yet, the group will show a `Start` link.

Telegram note: inline `web_app` buttons are available only in private chats. The game stays in the group, but the word form and drawing canvas open in the bot private chat with Telegram `initData` validation.

## Installation

```bash
npm install
cp config.example.json config.local.json
```

Edit `config.local.json`:

```json
{
  "telegramBotToken": "123456:ABCDEF",
  "publicBaseUrl": "https://your-ngrok-domain.ngrok-free.app",
  "http": {
    "port": 3000
  },
  "database": {
    "path": "./data/croco.sqlite"
  },
  "defaultLanguage": "ru",
  "imageUpdateIntervalMs": 2000,
  "gameMaxDurationMinutes": 20,
  "snapshotMaxBytes": 1500000
}
```

`config.local.json` is ignored by git.

## Local Development With ngrok

Terminal 1:

```bash
ngrok http 3000
```

Copy the HTTPS URL shown by ngrok, for example:

```text
https://abc-123.ngrok-free.app
```

Paste that URL into `publicBaseUrl` in `config.local.json`.

Terminal 2:

```bash
npm run dev
```

The bot uses Telegram polling for group messages. ngrok is only used to expose the Mini App pages and drawing canvas over HTTPS.

With a free ngrok account, the URL often changes. Update `publicBaseUrl` and restart `npm run dev` when that happens.

## Languages

The bot supports Russian, English, and French through i18n. The default language is Russian.

Language is stored in SQLite:

- per user, for the bot private chat, Mini App buttons, secret word form, and drawing canvas;
- per group, for public messages, because Telegram sends one shared message to the whole group.

When a user is seen for the first time, the bot uses Telegram `language_code` if it is supported. After that, `/lang ru`, `/lang en`, or `/lang fr` saves the user's personal preference. When the command is sent in a group, it also changes the group language.

## Commands

```text
/newgame       start a game in the group
/stopgame      stop the active game
/guess word    submit an answer, useful if Privacy Mode is enabled
/lang ru       save Russian as your language
/lang en       save English as your language
/lang fr       save French as your language
/help          show help
```

## Game Flow

1. A player sends `/newgame` in the group.
2. The bot sends that player a private Mini App to enter the secret word.
3. When the word is saved, the bot asks in the group who wants to draw.
4. The first player who taps the draw button becomes the drawer.
5. The bot sends the drawer a private canvas. The secret word is displayed at the top of that canvas for the drawer only.
6. The canvas sends snapshots to the server; the bot posts and then edits the drawing image in the group.
7. The first matching group message wins. If the bot cannot read normal group messages, use `/guess word`.

Guesses are case-insensitive and ignore accents and punctuation: `CAFE NOIR!!!` matches `cafe noir`. The word creator and drawer cannot win the round.

## Tests

```bash
npm test
```

Tests cover word normalization, i18n, user language preferences, config validation, Telegram `initData` verification, and game transitions with SQLite.
