// Простые мини‑графики без библиотек: линия с децимацией по пикселям
export function initLineChart(canvas, { color = '#4ea1ff', gridColor = 'rgba(255,255,255,.1)', lineWidth = 1 } = {}) {
  const ctx = canvas.getContext('2d');
  const state = { series: [], color, gridColor, lineWidth, dpr: 1, w: 0, h: 0, hoverX: -1, lastDrawAt: 0 };

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.dpr = dpr;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, Math.floor(rect.width * dpr));
    const h = Math.max(10, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    state.w = w; state.h = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(1, 1);
    draw();
  }

  function clear() {
    ctx.clearRect(0, 0, state.w, state.h);
  }

  function drawGrid(min, max) {
    const { w, h } = state;
    ctx.save();
    ctx.strokeStyle = state.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // рамка
    ctx.rect(0.5, 0.5, w - 1, h - 1);
    // 3 горизонтальные линии
    for (let i = 1; i <= 3; i++) {
      const y = 0.5 + Math.round((h - 1) * (i / 4));
      ctx.moveTo(0.5, y); ctx.lineTo(w - 0.5, y);
    }
    ctx.stroke();
    // подписи осей
    const ctlColor = getComputedStyle(document.documentElement).getPropertyValue('--control-text').trim() || '#ddd';
    ctx.fillStyle = ctlColor;
    ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu';
    ctx.textBaseline = 'top';
    ctx.fillText(String(max), 4, 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(min), 4, h - 2);
    // x first/last
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText('1', 4, h - 2);
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.max(1, state.series.length)), w - 4, h - 2);
    ctx.restore();
  }

  function decimateToWidth(arr, width) {
    // Бакетизация по пиксельным колонкам: берём min/max в бакете для сохранения экстремумов
    const n = arr.length;
    if (n <= width) {
      // достаточно точек — рисуем как есть
      return arr.map((v, i) => ({ x: (i / (n - 1)) * (width - 1), yv: v }));
    }
    const step = n / width;
    const points = [];
    for (let bx = 0; bx < width; bx++) {
      const start = Math.floor(bx * step);
      const end = Math.min(n, Math.floor((bx + 1) * step));
      if (start >= end) continue;
      let min = Infinity, max = -Infinity;
      for (let i = start; i < end; i++) {
        const v = arr[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const x = bx;
      if (min === max) {
        points.push({ x, yv: min });
      } else {
        points.push({ x, yv: min }, { x, yv: max });
      }
    }
    return points;
  }

  function draw() {
    clear();
    if (!state.series || state.series.length < 2) { drawGrid(0, 1); return; }
    const { w, h } = state;
    // вычисляем мин/макс
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < state.series.length; i++) {
      const v = state.series[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!isFinite(min) || !isFinite(max)) return;
    if (min === max) { max = min + 1; }
    const usableW = w - 2; // поля по 1px
    const usableH = h - 2;
    drawGrid(min, max);
    const pts = decimateToWidth(state.series, Math.max(2, usableW));

    ctx.save();
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.lineWidth;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = 1 + pts[i].x; // оставим 1px поля
      const t = (pts[i].yv - min) / (max - min);
      const py = 1 + (1 - t) * usableH;
      if (i === 0) ctx.moveTo(px + 0.5, py + 0.5);
      else ctx.lineTo(px + 0.5, py + 0.5);
    }
    ctx.stroke();
    ctx.restore();

    // crosshair + tooltip
    if (state.hoverX >= 0) {
      const n = state.series.length;
      const xIndex = Math.round((state.hoverX / usableW) * (n - 1));
      const xPix = 1 + Math.round((xIndex / (n - 1)) * usableW);
      const yVal = state.series[xIndex];
      const t = (yVal - min) / (max - min);
      const yPix = 1 + (1 - t) * usableH;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(xPix + 0.5, 1); ctx.lineTo(xPix + 0.5, h - 1);
      ctx.stroke();
      // tooltip box
      const label = `x=${xIndex+1} y=${yVal}`;
      ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu';
      const tw = Math.ceil(ctx.measureText(label).width) + 8;
      const th = 16;
      let bx = Math.min(Math.max(2, xPix + 6), w - tw - 2);
      let by = Math.min(Math.max(2, yPix - th - 6), h - th - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, tw, th);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, th - 1);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + 4, by + th / 2);
      ctx.restore();
    }
  }

  function setData(arr) {
    state.series = Array.isArray(arr) ? arr : [];
    draw();
  }
  function onMove(ev) {
    const rect = canvas.getBoundingClientRect();
    const dpr = state.dpr;
    const x = (ev.clientX - rect.left) * dpr;
    const usableW = state.w - 2;
    state.hoverX = Math.min(Math.max(0, x - 1), usableW);
    // rAF троттлинг
    const now = performance.now();
    if (now - state.lastDrawAt > 16) { state.lastDrawAt = now; draw(); }
  }
  function onLeave() { state.hoverX = -1; draw(); }

  window.addEventListener('resize', () => resize());
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  // Инициализация размеров при первом вызове
  setTimeout(resize, 0);

  return { resize, setData, redraw: draw };
}
