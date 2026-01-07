// scripts/ui/components/probChart.js
// Простая гистограмма вероятностей без внешних библиотек.

export function drawProbabilityChart(canvas, probs = []) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // фон
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0,0,W,H);

  // ось
  ctx.strokeStyle = '#334';
  ctx.beginPath();
  ctx.moveTo(32, H-22);
  ctx.lineTo(W-8, H-22);
  ctx.stroke();

  const n = probs.length || 1;
  const max = Math.max(...probs, 1e-9);
  const innerW = W - 48;
  const bw = Math.max(2, innerW / n - 2);
  const startX = 36;

  // бары
  for (let i = 0; i < n; i++) {
    const p = probs[i] / max;
    const h = Math.floor((H - 36) * p);
    const x = startX + i * (bw + 2);
    const y = H - 22 - h;

    ctx.fillStyle = '#6aa9ff';
    ctx.fillRect(x, y, bw, h);

    // подпись разрежённо
    if (n <= 16 || i % Math.ceil(n/16) === 0) {
      ctx.fillStyle = '#9aa0a6';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(2).padStart(Math.log2(n),'0'), x + bw/2, H - 8);
    }
  }
}
