import { resolveLanguage, t, webStrings } from './i18n.js';

const ASSET_VERSION = '2026-08-20-draw-word-v2';

function assetPath(pathname) {
  return `${pathname}?v=${ASSET_VERSION}`;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function htmlPage({ title, data, script }) {
  return `<!doctype html>
<html lang="${data.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="${assetPath('/static/app.css')}">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="app"></div>
    <script>window.CROCO = ${safeJson(data)};</script>
    <script type="module" src="${assetPath(script)}"></script>
  </body>
</html>`;
}

export function renderCreateWordPage({ lang, token }) {
  const resolved = resolveLanguage(lang);
  return htmlPage({
    title: t(resolved, 'web.createTitle'),
    data: {
      page: 'create-word',
      token,
      lang: resolved,
      strings: webStrings(resolved)
    },
    script: '/static/create-word.js'
  });
}

export function renderDrawPage({ lang, token, snapshotIntervalMs }) {
  const resolved = resolveLanguage(lang);
  return htmlPage({
    title: t(resolved, 'web.drawTitle'),
    data: {
      page: 'draw',
      token,
      lang: resolved,
      snapshotIntervalMs,
      strings: webStrings(resolved)
    },
    script: '/static/draw.js'
  });
}

export function renderStatusPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Croco Bot</title>
    <link rel="stylesheet" href="${assetPath('/static/app.css')}">
  </head>
  <body>
    <main class="panel">
      <h1>Croco Bot</h1>
      <p>HTTP server is running. Open game pages from Telegram buttons.</p>
    </main>
  </body>
</html>`;
}
