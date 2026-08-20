import crypto from 'node:crypto';

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export function validateTelegramWebAppInitData(initData, botToken, options = {}) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Missing Telegram initData');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash) {
    throw new Error('Telegram initData hash is missing');
  }

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const calculated = Buffer.from(calculatedHash, 'hex');

  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    throw new Error('Telegram initData hash is invalid');
  }

  const authDate = Number(params.get('auth_date'));
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  if (Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0) {
    const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
    if (!Number.isInteger(authDate) || nowSeconds - authDate > maxAgeSeconds) {
      throw new Error('Telegram initData is expired');
    }
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('Telegram initData user is missing');
  }

  return {
    queryId: params.get('query_id'),
    user: JSON.parse(userRaw),
    raw: Object.fromEntries(params.entries())
  };
}

