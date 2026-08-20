const { token, strings, snapshotIntervalMs } = window.CROCO;
const telegram = window.Telegram?.WebApp;
const app = document.querySelector('#app');

telegram?.ready();
telegram?.expand();

app.innerHTML = `
  <main class="draw-shell">
    <header class="draw-header">
      <h1>${strings.drawTitle}</h1>
      <button id="clear" class="danger-button" type="button">${strings.clear}</button>
    </header>
    <section class="canvas-wrap">
      <canvas id="canvas"></canvas>
    </section>
    <footer class="draw-footer">
      <div class="toolbar">
        <input id="color" class="color-input" type="color" value="#1d5fd1" aria-label="${strings.color}">
        <label class="toggle">
          <input id="eraser" type="checkbox">
          <span>${strings.eraser}</span>
        </label>
        <div class="field-row range">
          <label for="size">${strings.brushSize}</label>
          <input id="size" type="range" min="2" max="36" value="8">
        </div>
        <div id="status" class="status">${strings.waiting}</div>
      </div>
    </footer>
  </main>
`;

const canvas = document.querySelector('#canvas');
const wrap = document.querySelector('.canvas-wrap');
const ctx = canvas.getContext('2d');
const color = document.querySelector('#color');
const eraser = document.querySelector('#eraser');
const size = document.querySelector('#size');
const clear = document.querySelector('#clear');
const status = document.querySelector('#status');

let drawing = false;
let dirty = false;
let sending = false;
let lastPoint = null;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function fillCanvas() {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function resizeCanvas() {
  const previous = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL('image/png') : null;
  const rect = wrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(320, Math.floor(rect.height * ratio));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  fillCanvas();

  if (previous) {
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = previous;
  }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function drawTo(point) {
  if (!lastPoint) {
    lastPoint = point;
  }

  ctx.save();
  ctx.strokeStyle = eraser.checked ? '#ffffff' : color.value;
  ctx.lineWidth = Number(size.value) * (window.devicePixelRatio || 1);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.restore();
  lastPoint = point;
  dirty = true;
}

async function sendSnapshot() {
  if (!dirty || sending) {
    return;
  }
  if (!telegram?.initData) {
    setStatus(strings.openFromTelegram, true);
    return;
  }

  dirty = false;
  sending = true;
  setStatus(strings.sending);

  try {
    const imageData = canvas.toDataURL('image/jpeg', 0.84);
    const response = await fetch('/api/games/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        imageData,
        initData: telegram.initData
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      throw new Error(body.message || strings.requestFailed);
    }

    setStatus(body.published ? strings.sent : strings.waiting);
  } catch (error) {
    dirty = true;
    setStatus(error.message || strings.requestFailed, true);
  } finally {
    sending = false;
  }
}

canvas.addEventListener('pointerdown', (event) => {
  drawing = true;
  canvas.setPointerCapture(event.pointerId);
  lastPoint = pointFromEvent(event);
  drawTo(lastPoint);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drawing) {
    return;
  }
  drawTo(pointFromEvent(event));
});

canvas.addEventListener('pointerup', async (event) => {
  drawing = false;
  lastPoint = null;
  canvas.releasePointerCapture(event.pointerId);
  await sendSnapshot();
});

canvas.addEventListener('pointercancel', () => {
  drawing = false;
  lastPoint = null;
});

clear.addEventListener('click', async () => {
  fillCanvas();
  dirty = true;
  await sendSnapshot();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
setInterval(sendSnapshot, Math.max(1000, Number(snapshotIntervalMs) || 2000));

if (!telegram?.initData) {
  setStatus(strings.openFromTelegram, true);
}

