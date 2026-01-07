// scripts/charts.js
// Лёгкий отрисовщик двух линий (энтропия и параметр порядка) на canvas с учётом DPR.

export class ChartManager {
  constructor() {
    this.entropyChartCanvas = document.getElementById('entropy-chart');
    this.orderChartCanvas = document.getElementById('order-chart');

    this.entropyCtx = this.entropyChartCanvas.getContext('2d');
    this.orderCtx   = this.orderChartCanvas.getContext('2d');

    this.entropyData = [];
    this.orderData = [];
    this.maxDataPoints = 200;

    this.resizeCharts();
    window.addEventListener('resize', () => {
      this.resizeCharts();
      this.drawCharts();
    });

    this.drawCharts();
  }

  reset() {
    this.entropyData = [];
    this.orderData = [];
    this.drawCharts();
  }

  resizeCharts() {
    const dpr = window.devicePixelRatio || 1;
    const container = this.entropyChartCanvas.parentElement;
    const cssW = container.clientWidth;
    const cssH = 150;

    for (const c of [this.entropyChartCanvas, this.orderChartCanvas]) {
      c.style.width = cssW + 'px';
      c.style.height = cssH + 'px';
      c.width = Math.floor(cssW * dpr);
      c.height = Math.floor(cssH * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  update(entropy, orderParameter, step) {
    this.entropyData.push({ x: step, y: entropy });
    this.orderData.push({ x: step, y: orderParameter });

    if (this.entropyData.length > this.maxDataPoints) {
      this.entropyData.shift();
      this.orderData.shift();
    }
    this.drawCharts();
  }

  drawCharts() {
    this.drawChart(this.entropyCtx, this.entropyData, 'Энтропия');
    this.drawChart(this.orderCtx, this.orderData, 'Параметр порядка');
  }

  drawChart(ctx, data, label) {
    const width = ctx.canvas.width / (window.devicePixelRatio || 1);
    const height = ctx.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#aaa';
    const axisColor = getComputedStyle(document.body).getPropertyValue('--border-color') || '#444';

    if (data.length < 2) {
      ctx.fillStyle = textColor;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} — данные появятся после запуска`, width / 2, height / 2);
      return;
    }

    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);

    let xMin = Math.min(...xValues);
    let xMax = Math.max(...xValues);
    let yMin = Math.min(...yValues);
    let yMax = Math.max(...yValues);

    if (!isFinite(xMin) || !isFinite(xMax)) { xMin = 0; xMax = 1; }
    if (!isFinite(yMin) || !isFinite(yMax)) { yMin = 0; yMax = 1; }
    if (xMax === xMin) xMax = xMin + 1;
    if (yMax === yMin) yMax = yMin + 1;

    const pad = 8;
    const W = width - pad * 2;
    const H = height - pad * 2;

    const x2px = x => pad + ( (x - xMin) / (xMax - xMin) ) * W;
    const y2px = y => pad + H - ( (y - yMin) / (yMax - yMin) ) * H;

    // Оси
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad + H);
    ctx.lineTo(pad + W, pad + H);
    ctx.stroke();

    // Серия
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-secondary') || '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x2px(data[0].x), y2px(data[0].y));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(x2px(data[i].x), y2px(data[i].y));
    }
    ctx.stroke();

    // Подпись
    ctx.fillStyle = textColor;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, pad, pad - 2 + 10);
  }
}
