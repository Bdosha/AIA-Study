/**
 * visualizer.js
 * Класс Visualizer — отрисовка результатов через Plotly.js.
 *
 * Три графика:
 *   1. Траектории x1(t) и x2(t) как функции времени
 *   2. Фазовый портрет: x1 vs x2
 *   3. Управления: u(t) и v(t) с границами
 *
 * Зависимости: Plotly.js (window.Plotly)
 * Импортируется в: ui.js
 */

const ANIMATION_STEPS_PER_FRAME = 5;

const THEME = {
  dark: {
    paper_bgcolor: '#1a1a2e',
    plot_bgcolor:  '#16213e',
    font_color:    '#e0e0e0',
    gridcolor:     '#2a2a4a',
    x1color:       '#4fc3f7',
    x2color:       '#ef5350',
    ucolor:        '#66bb6a',
    vcolor:        '#ffa726',
    capturecolor:  '#b39ddb',
  },
  light: {
    paper_bgcolor: '#ffffff',
    plot_bgcolor:  '#f5f5f5',
    font_color:    '#212121',
    gridcolor:     '#e0e0e0',
    x1color:       '#1565c0',
    x2color:       '#c62828',
    ucolor:        '#2e7d32',
    vcolor:        '#e65100',
    capturecolor:  '#6a1b9a',
  },
};

export class Visualizer {
  constructor(domIds, theme = 'dark') {
    this._ids   = domIds;
    this._theme = theme;

    this._animFrame     = null;
    this._animIndex     = 0;
    this._animData      = null;
    this._animRunning   = false;
    this._controlBounds = null;

    this._lastSolve    = null;
    this._lastOptimize = null;
    this._lastConfig   = null;

    this._initPlots();
  }

  // ─── Публичные методы ───────────────────────────────────────────────────────

  drawAll(solveResult, optimizeResult, config) {
    this._lastSolve     = solveResult;
    this._lastOptimize  = optimizeResult;
    this._lastConfig    = config;
    this._controlBounds = {
      uMin: config.uMin, uMax: config.uMax,
      vMin: config.vMin, vMax: config.vMax,
      T:    config.T,
    };

    this.stopAnimation();
    this._startAnimation(solveResult, optimizeResult);
  }

  stepOnce() {
    if (!this._animData) return false;
    const { N } = this._animData;
    if (this._animIndex >= N - 1) return false;
    this._animIndex = Math.min(this._animIndex + 1, N - 1);
    this._renderFrame(this._animIndex);
    return this._animIndex < N - 1;
  }

  stopAnimation() {
    this._animRunning = false;
    if (this._animFrame !== null) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  reset() {
    this.stopAnimation();
    this._animData      = null;
    this._animIndex     = 0;
    this._controlBounds = null;
    this._lastSolve     = null;
    this._lastOptimize  = null;
    this._lastConfig    = null;
    this._initPlots();
  }

  setTheme(theme) {
    this._theme = theme;
    if (this._lastSolve && this._lastOptimize) {
      this._renderFrame(this._animIndex);
    } else {
      this._initPlots();
    }
  }

  exportPNG() {
    const entries = [
      { key: 'time',    label: 'траектории'  },
      { key: 'phase',   label: 'фаза'        },
      { key: 'control', label: 'управления'  },
    ];
    entries.forEach(({ key, label }) => {
      const el = document.getElementById(this._ids[key]);
      if (!el) return;
      window.Plotly.downloadImage(el, {
        format:   'png',
        width:    1200,
        height:   500,
        filename: `DI-${label}-${new Date().toISOString().slice(0, 10)}`,
      });
    });
  }

  exportCSV() {
    if (!this._lastSolve || !this._lastOptimize) return;
    const { t, x1, x2 } = this._lastSolve;
    const { u, v }       = this._lastOptimize;
    const N              = t.length;

    const rows = ['t,x1,x2,u,v'];
    for (let i = 0; i < N; i++) {
      rows.push(
        `${t[i].toFixed(6)},${x1[i].toFixed(6)},${x2[i].toFixed(6)},` +
        `${(u?.[i] ?? 0).toFixed(6)},${(v?.[i] ?? 0).toFixed(6)}`
      );
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `DI-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Инициализация пустых графиков ─────────────────────────────────────────

  _initPlots() {
    const th = THEME[this._theme];

    const emptyLayout = (title, xlabel, ylabel) => ({
      paper_bgcolor: th.paper_bgcolor,
      plot_bgcolor:  th.plot_bgcolor,
      font: { family: "'Inter', -apple-system, sans-serif", size: 12 },
      title:  { text: title, font: { color: th.font_color, size: 13 } },
      margin: { t: 40, r: 20, b: 50, l: 55 },
      legend: { bgcolor: 'rgba(0,0,0,0)', borderwidth: 0 },
      xaxis:  {
        title: { text: xlabel, font: { color: th.font_color } },
        gridcolor: th.gridcolor, zerolinecolor: th.gridcolor,
      },
      yaxis:  {
        title: { text: ylabel, font: { color: th.font_color } },
        gridcolor: th.gridcolor, zerolinecolor: th.gridcolor,
      },
    });

    const cfg = { responsive: true, displayModeBar: false };

    // График 1: траектории
    window.Plotly.newPlot(
      this._ids.time,
      [
        { x: [], y: [], mode: 'lines', name: 'x₁(t)', line: { color: th.x1color, width: 2 } },
        { x: [], y: [], mode: 'lines', name: 'x₂(t)', line: { color: th.x2color, width: 2 } },
      ],
      emptyLayout('Траектории x₁(t) и x₂(t)', 't', 'x'),
      cfg
    );

    // График 2: фазовый портрет
    window.Plotly.newPlot(
      this._ids.phase,
      [
        { x: [], y: [], mode: 'lines', name: 'Траектория', line: { color: th.x1color, width: 2 } },
      ],
      emptyLayout('Фазовый портрет', 'x₁', 'x₂'),
      cfg
    );

    // График 3: управления
    window.Plotly.newPlot(
      this._ids.control,
      [
        { x: [], y: [], mode: 'lines', name: 'u(t)', line: { color: th.ucolor, width: 2 } },
        { x: [], y: [], mode: 'lines', name: 'v(t)', line: { color: th.vcolor, width: 2 } },
      ],
      emptyLayout('Оптимальные управления', 't', 'u, v'),
      cfg
    );
  }

  // ─── Анимация ───────────────────────────────────────────────────────────────

  _startAnimation(solveResult, optimizeResult) {
    const { t, x1, x2, N, captureTime } = solveResult;
    const { u, v } = optimizeResult;

    this._animData    = { t, x1, x2, u, v, N, captureTime };
    this._animIndex   = 0;
    this._animRunning = true;

    const animate = () => {
      if (!this._animRunning) return;

      const nextIndex = Math.min(this._animIndex + ANIMATION_STEPS_PER_FRAME, N - 1);
      this._renderFrame(nextIndex);
      this._animIndex = nextIndex;

      if (this._animIndex < N - 1) {
        this._animFrame = requestAnimationFrame(animate);
      } else {
        this._animRunning = false;
        this._animFrame   = null;
        if (captureTime !== null) {
          this._markCaptureTime(captureTime);
        }
      }
    };

    this._animFrame = requestAnimationFrame(animate);
  }

  _renderFrame(idx) {
    if (!this._animData) return;
    const { t, x1, x2, u, v } = this._animData;
    const th = THEME[this._theme];

    // ВАЖНО: Array.from — Plotly не принимает Float64Array
    const tS  = Array.from(t.subarray(0, idx + 1));
    const x1S = Array.from(x1.subarray(0, idx + 1));
    const x2S = Array.from(x2.subarray(0, idx + 1));
    const uS  = u ? Array.from(u.subarray(0, idx + 1)) : [];
    const vS  = v ? Array.from(v.subarray(0, idx + 1)) : [];

    const layout = (title, xlabel, ylabel) => this._makeLayout(title, xlabel, ylabel);

    // ── График 1: траектории ────────────────────────────────────────────────
    window.Plotly.react(
      this._ids.time,
      [
        { x: tS, y: x1S, mode: 'lines', name: 'x₁(t)', line: { color: th.x1color, width: 2 } },
        { x: tS, y: x2S, mode: 'lines', name: 'x₂(t)', line: { color: th.x2color, width: 2 } },
      ],
      layout('Траектории x₁(t) и x₂(t)', 't', 'x')
    );

    // ── График 2: фазовый портрет ───────────────────────────────────────────
    window.Plotly.react(
      this._ids.phase,
      [
        { x: x1S, y: x2S, mode: 'lines', name: 'Траектория',
          line: { color: th.x1color, width: 2 } },
        { x: [x1S[0]], y: [x2S[0]], mode: 'markers', name: 'Старт',
          marker: { color: th.x1color, size: 10, symbol: 'circle' } },
        { x: [x1S[x1S.length - 1]], y: [x2S[x2S.length - 1]],
          mode: 'markers', name: 'Сейчас',
          marker: { color: th.x2color, size: 10, symbol: 'diamond' } },
      ],
      layout('Фазовый портрет', 'x₁', 'x₂')
    );

    // ── График 3: управления ────────────────────────────────────────────────
    if (uS.length > 0) {
      const traces = [
        { x: tS, y: uS, mode: 'lines', name: 'u(t)', line: { color: th.ucolor, width: 2 } },
        { x: tS, y: vS, mode: 'lines', name: 'v(t)', line: { color: th.vcolor, width: 2 } },
      ];

      if (this._controlBounds) {
        const { uMin, uMax, vMin, vMax, T } = this._controlBounds;
        const tb = [0, T];
        traces.push(
          { x: tb, y: [uMax, uMax], mode: 'lines', showlegend: false,
            line: { color: th.ucolor, width: 1, dash: 'dash' } },
          { x: tb, y: [uMin, uMin], mode: 'lines', showlegend: false,
            line: { color: th.ucolor, width: 1, dash: 'dash' } },
          { x: tb, y: [vMax, vMax], mode: 'lines', showlegend: false,
            line: { color: th.vcolor, width: 1, dash: 'dash' } },
          { x: tb, y: [vMin, vMin], mode: 'lines', showlegend: false,
            line: { color: th.vcolor, width: 1, dash: 'dash' } }
        );
      }

      window.Plotly.react(this._ids.control, traces, layout('Оптимальные управления', 't', 'u, v'));
    }
  }

  _makeLayout(title, xlabel, ylabel) {
  const th = THEME[this._theme];
  return {
    paper_bgcolor: th.paper_bgcolor,
    plot_bgcolor:  th.plot_bgcolor,
    font:   { color: th.font_color, family: "'Inter', -apple-system, sans-serif", size: 12 },
    title:  { text: title, font: { color: th.font_color, size: 13 } },
    margin: { t: 40, r: 20, b: 50, l: 55 },
    legend: { bgcolor: 'rgba(0,0,0,0)', borderwidth: 0 },
    xaxis: {
      title:         { text: xlabel, font: { color: th.font_color } },
      gridcolor:     th.gridcolor,
      zerolinecolor: th.gridcolor,
      zerolinewidth: 1,
    },
    yaxis: {
      title:         { text: ylabel, font: { color: th.font_color } },
      gridcolor:     th.gridcolor,
      zerolinecolor: th.gridcolor,
      zerolinewidth: 1,
    },
  };
}

  _markCaptureTime(captureTime) {
    const th = THEME[this._theme];
    const shape = {
      type: 'line',
      x0: captureTime, x1: captureTime,
      y0: 0, y1: 1, yref: 'paper',
      line: { color: th.capturecolor, width: 2, dash: 'dot' },
    };
    try {
      window.Plotly.relayout(this._ids.time, { shapes: [shape] });
    } catch (e) { /* игнорируем */ }
  }
}
