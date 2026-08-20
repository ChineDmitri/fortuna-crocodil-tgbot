const { token, strings } = window.CROCO;
const telegram = window.Telegram?.WebApp;
const app = document.querySelector('#app');

telegram?.ready();
telegram?.expand();

app.innerHTML = `
  <main class="panel">
    <h1>${strings.createTitle}</h1>
    <p>${strings.createSubtitle}</p>
    <form id="word-form">
      <label for="word">${strings.wordLabel}</label>
      <input class="text-input" id="word" name="word" autocomplete="off" maxlength="60" placeholder="${strings.wordPlaceholder}" required>
      <button class="primary-button" type="submit">${strings.saveWord}</button>
    </form>
    <div id="status" class="status"></div>
  </main>
`;

const form = document.querySelector('#word-form');
const input = document.querySelector('#word');
const status = document.querySelector('#status');

if (!telegram?.initData) {
  status.textContent = strings.openFromTelegram;
  status.classList.add('error');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.classList.remove('error');

  const word = input.value.trim().replace(/\s+/g, ' ');
  if (word.length < 2 || word.length > 60) {
    status.textContent = strings.invalidWord;
    status.classList.add('error');
    return;
  }

  try {
    const response = await fetch('/api/games/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        word,
        initData: telegram?.initData || ''
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      throw new Error(body.message || strings.requestFailed);
    }

    status.textContent = strings.saved;
    form.querySelector('button').disabled = true;
    input.disabled = true;
    setTimeout(() => telegram?.close(), 800);
  } catch (error) {
    status.textContent = error.message || strings.requestFailed;
    status.classList.add('error');
  }
});

input.focus();

