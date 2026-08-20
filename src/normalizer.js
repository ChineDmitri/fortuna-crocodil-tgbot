export function normalizeWord(value) {
  return String(value ?? '')
    .trim()
    .replace(/[Ёё]/g, 'е')
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase('und')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isWinningGuess(messageText, secretWord) {
  const guess = normalizeWord(messageText);
  const secret = normalizeWord(secretWord);
  return secret.length > 0 && guess === secret;
}

