export function publicUrl(config, pathname, params = {}) {
  const base = `${config.publicBaseUrl}/`;
  const url = new URL(pathname.replace(/^\/+/, ''), base);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function telegramStartUrl(botUsername, payload) {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(payload)}`;
}

