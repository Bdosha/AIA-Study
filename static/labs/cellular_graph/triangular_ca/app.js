/**
 * Главный контроллер приложения.
 * Отвечает за инициализацию UI, решётки/рендера/симуляции и связывает события UI с движком.
 */
import { initControls, updateStep, updateTime, setGridVisibleCheckbox, setAutoHideCheckbox, setLogsCheckbox } from './ui-controls.js';
import { Analytics } from './analytics.js';
import { initAnalyticsPanel } from './analytics-panel.js';
import { TriGrid } from './grid-tri.js';
import { initCanvas } from './render.js';
import { Sim } from './sim.js';
import { TrivialRule, Rules } from './rules.js';
import { PRESETS, seedBuffer } from './presets.js';
import { IO } from './io.js';

export const App = {
  /** Запускает приложение: рендерит панель, создаёт решётку/рендер/симуляцию, настраивает события. */
  init() {
    const controls = document.getElementById('controls');
    const canvas = document.getElementById('ca-canvas');
    if (!controls || !canvas) {
      console.error('Не найдены #controls или #ca-canvas');
      return;
    }

    // Рендер панели управления
    initControls(controls);
    // Применить сохранённую тему при старте
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) this.setTheme(savedTheme);
    } catch {}
    // Настройки авто-скрытия сетки
    try {
      const savedAutoHide = localStorage.getItem('autoHideGrid');
      this.autoHideGrid = savedAutoHide ? savedAutoHide === '1' : true; // по умолчанию включено
    } catch { this.autoHideGrid = true; }
    setAutoHideCheckbox(!!this.autoHideGrid);
    // Переключатель аналитики ("Писать логи" = собирать статистику): по умолчанию ВКЛ
    try {
      const savedAnalytic = localStorage.getItem('analyticsEnabled');
      this.analyticsEnabled = savedAnalytic ? savedAnalytic === '1' : true;
    } catch { this.analyticsEnabled = true; }
    setLogsCheckbox(!!this.analyticsEnabled);
    // Отладочный логгер (всегда тихий по умолчанию)
    this._dbg = (..._args) => {};

    // Подписки на события UI — лог для отладки и реальная обработка ниже
    const sub = (type, handler) => window.addEventListener(type, (e) => handler(e.detail));
    sub('ui:start', () => this._dbg('ui:start'));
    sub('ui:stop', () => this._dbg('ui:stop'));
    sub('ui:step', () => this._dbg('ui:step'));
    sub('ui:reset', () => this._dbg('ui:reset'));
    sub('ui:changeSpeed', ({ fps }) => this._dbg('ui:changeSpeed', { fps }));
    sub('ui:changeKernel', ({ kernel }) => this._dbg('ui:changeKernel', { kernel }));
    sub('ui:changeRule', ({ dsl }) => this._dbg('ui:changeRule', { dsl }));
    sub('ui:applyPreset', ({ name }) => this._dbg('ui:applyPreset', { name }));
    sub('ui:toggleTheme', ({ theme }) => this.setTheme(theme));
    // Toggle analytics collection via "Писать логи"
    window.addEventListener('ui:toggleLogs', ({ detail }) => {
      this.analyticsEnabled = !!detail?.enabled;
      try { localStorage.setItem('analyticsEnabled', this.analyticsEnabled ? '1' : '0'); } catch {}
      // при выключении просто перестаём добавлять новые строки статистики
    });

    // Инициализация решётки и канваса
    this.grid = new TriGrid(100, 80, { wrapMode: 'toroidal' });
    this.buffer = new Uint8Array(this.grid.size); // все нули
    this.renderer = initCanvas(canvas);
    this.renderer.resizeToContainer(this.grid);
    this.renderer.drawGrid(this.grid);
    this.renderer.drawCells(this.grid, this.buffer);

    // Симуляция
  this.kernel = 'edge-3';
  this.ruleDSL = 'B3/S23';
  this.rule = Rules.makeLife(this.ruleDSL, this.kernel) || TrivialRule;
    this.sim = new Sim(this.grid);
    this.sim.setBuffer(this.buffer);

    // Аналитика: панель справа
    const analyticsRoot = document.getElementById('analytics');
    this.analytics = new Analytics(this.grid.size);
    this.analyticsUI = initAnalyticsPanel(analyticsRoot);
    // Настройка переключателя «медленнее графики при запуске» + бинды UI
    try {
      const savedSlow = localStorage.getItem('slowCharts');
      this.slowCharts = savedSlow ? savedSlow === '1' : true; // по умолчанию включено
    } catch { this.slowCharts = true; }
    this.analyticsUI.setSlowCharts(!!this.slowCharts);
    this.analyticsUI.bind({
      onResetStats: () => { this.analytics.reset(this.grid.size); this.refreshAnalyticsUI(true); },
      onExportCSV: () => {
        const csv = this.analytics.toCSV(';');
        try {
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'tri-life-stats.csv';
          a.click();
          URL.revokeObjectURL(a.href);
        } catch { console.log(csv); }
      },
      onToggleSlowCharts: (checked) => {
        this.slowCharts = !!checked;
        try { localStorage.setItem('slowCharts', this.slowCharts ? '1' : '0'); } catch {}
        // пересчитать интервал графиков и позволить немедленное обновление
        this._anNextCharts = 0;
      }
    });
    // начальные значения аналитики из текущего буфера
    this.analytics.onResizeOrImport(this.grid.size, this.sim.cur.reduce((a,b)=>a+b,0));
    // Троттлинг обновления UI аналитики:
    // - значения/таблица обновляются ~15 FPS постоянно
    // - графики: ~15 FPS, а при запуске и включённой опции — ~8 FPS
    this._anIntervalValues = 66; // ~15 FPS
    const getChartInterval = () => (this.sim?.running && this.slowCharts) ? 125 : 66;
    this._anIntervalCharts = getChartInterval();
    this._anNextValues = 0;
    this._anNextCharts = 0;
    this.refreshAnalyticsUI = (force=false) => {
      const now = performance.now();
      // Обновление значений и таблицы
      if (force || now >= this._anNextValues) {
        this._anNextValues = now + this._anIntervalValues;
        const snap = this.analytics.getSnapshot();
        this.analyticsUI.updateValues(snap);
        const rows = this.analytics.getLastRows(2000);
        this.analyticsUI.updateTable(rows);
      }
      // Обновление графиков
      this._anIntervalCharts = getChartInterval();
      if (force || now >= this._anNextCharts) {
        this._anNextCharts = now + this._anIntervalCharts;
        // графики по всей истории, но рендер децимируется внутри charts
        this.analyticsUI.updateChartsFrom(this.analytics);
      }
    };

    const redraw = (dirty) => {
      if (Array.isArray(dirty) && dirty.length) {
        this.renderer.drawCells(this.grid, this.sim.cur, dirty);
      } else {
        this.renderer.drawGrid(this.grid);
        this.renderer.drawCells(this.grid, this.sim.cur);
      }
    };
    const refreshIndicators = () => {
      updateStep(this.sim.stepCount);
      updateTime(Math.floor(this.sim.getElapsedMS() / 1000));
    };

    // UI bindings
    window.addEventListener('ui:step', () => {
      const res = this.sim.step(this.rule, this.kernel, true);
      redraw(res.dirty);
      if (this.analyticsEnabled) this.analytics.onStep(res);
      this.refreshAnalyticsUI();
      refreshIndicators();
    });
    
    // Handler for running exactly N steps
    window.addEventListener('ui:runNSteps', ({ detail }) => {
      if (!detail || typeof detail.steps !== 'number') return;
      
      const steps = Math.max(1, Math.min(10000, detail.steps));
      
      // Stop any existing simulation
      this.sim.stop();
      
      // Show progress if many steps
      let progressMessage = null;
      if (steps > 100) {
        progressMessage = document.createElement('div');
        progressMessage.className = 'simulation-progress';
        progressMessage.innerHTML = `<div class="progress-text">Выполнение 0/${steps} шагов...</div>`;
        document.body.appendChild(progressMessage);
      }
      
      // Use requestAnimationFrame for better UI responsiveness
      let stepsDone = 0;
      
      const processSteps = () => {
        const batchSize = Math.min(10, steps - stepsDone);
        
        // Do a batch of steps
        for (let i = 0; i < batchSize; i++) {
          const res = this.sim.step(this.rule, this.kernel, true);
          if (this.analyticsEnabled) this.analytics.onStep(res);
          stepsDone++;
        }
        
        // Update progress message if exists
        if (progressMessage) {
          progressMessage.querySelector('.progress-text').textContent = 
            `Выполнение ${stepsDone}/${steps} шагов...`;
        }
        
        // Update UI
        redraw();
        refreshIndicators();
        this.refreshAnalyticsUI();
        
        // Continue if more steps needed
        if (stepsDone < steps) {
          requestAnimationFrame(processSteps);
        } else {
          // Clean up progress message
          if (progressMessage) {
            document.body.removeChild(progressMessage);
          }
        }
      };
      
      // Start processing steps
      requestAnimationFrame(processSteps);
    });
    window.addEventListener('ui:reset', () => {
      this.sim.reset();
      redraw();
      refreshIndicators();
    });
    window.addEventListener('ui:start', () => {
      // Авто-скрыть сетку, если включено
      if (this.autoHideGrid) {
        this.renderer.setGridVisible(false);
        setGridVisibleCheckbox(false);
        this.renderer.drawGrid(this.grid);
        this.renderer.drawCells(this.grid, this.sim.cur);
      }
      // Переоценить интервалы графиков при запуске
      this._anNextCharts = 0;
      this.sim.run(this.rule, this.kernel, (cur, steps, dt, dirty, stats) => {
        if (this.analyticsEnabled) this.analytics.onStep(stats);
        this.refreshAnalyticsUI();
        redraw(dirty);
        refreshIndicators();
      });
    });
    window.addEventListener('ui:stop', () => {
      this.sim.stop();
      // Вернуть обычный интервал обновления графиков
      this._anNextCharts = 0;
      // Вернуть сетку, если авто-скрытие активно и сетка была скрыта
      if (this.autoHideGrid) {
        this.renderer.setGridVisible(true);
        setGridVisibleCheckbox(true);
        this.renderer.drawGrid(this.grid);
        this.renderer.drawCells(this.grid, this.sim.cur);
      }
      refreshIndicators();
    });
    window.addEventListener('ui:changeSpeed', ({ detail }) => {
      if (detail && typeof detail.fps === 'number') this.sim.fps = detail.fps;
    });
    window.addEventListener('ui:changeKernel', ({ detail }) => {
      if (detail && detail.kernel) {
        this.kernel = detail.kernel;
        const nextRule = Rules.makeLife(this.ruleDSL, this.kernel);
        if (nextRule) this.rule = nextRule; else console.warn('Некорректное правило для ядра, остаёмся на прежнем');
      }
    });
    // Toggle grid visibility
    window.addEventListener('ui:toggleGridRun', ({ detail }) => {
      const vis = !!detail?.visible;
      this.renderer.setGridVisible(vis);
      // Полная перерисовка с учётом слоя сетки
      this.renderer.drawGrid(this.grid);
      this.renderer.drawCells(this.grid, this.sim.cur);
    });
    // Toggle auto-hide grid preference
    window.addEventListener('ui:toggleAutoHideGrid', ({ detail }) => {
      this.autoHideGrid = !!detail?.enabled;
      try { localStorage.setItem('autoHideGrid', this.autoHideGrid ? '1' : '0'); } catch {}
    });
    window.addEventListener('ui:changeRule', ({ detail }) => {
      const dsl = detail?.dsl;
      if (!dsl) return;
      const nextRule = Rules.makeLife(dsl, this.kernel);
      if (nextRule) {
        this.ruleDSL = dsl;
        this.rule = nextRule;
  this._dbg('Rule updated', dsl, 'kernel', this.kernel);
      } else {
        console.warn('Некорректный DSL правила:', dsl);
      }
    });

    // Resize grid (user-defined size)
    window.addEventListener('ui:resizeGrid', ({ detail }) => {
      const w = Number(detail?.w), h = Number(detail?.h);
      if (!Number.isFinite(w) || !Number.isFinite(h)) return;
      if (w <= 0 || h <= 0) return;
      // Остановить текущую симуляцию, если запущена
      this.sim?.stop?.();
      // Пересоздать решётку и симуляцию, сохранить текущие настройки ядра/правила
      this.grid = new TriGrid(w, h, { wrapMode: this.grid.wrapMode || 'toroidal' });
      this.sim = new Sim(this.grid);
      this.renderer.resizeToContainer(this.grid);
      this.rule = Rules.makeLife(this.ruleDSL, this.kernel) || TrivialRule;
      // Буферы пустые после изменения размера
      this.sim.next.fill(0);
      this.sim.stepCount = 0;
      updateStep(0); updateTime(0);
      this.renderer.drawGrid(this.grid);
      this.renderer.drawCells(this.grid, this.sim.cur);
      this.analytics.onResizeOrImport(this.grid.size, 0);
      this.refreshAnalyticsUI(true);
    });

    // Presets
    const applyPreset = (name) => {
      const preset = PRESETS.find(p => p.name === name);
      if (!preset) { console.warn('Пресет не найден:', name); return; }
      const needRecreate = (preset.w !== this.grid.w || preset.h !== this.grid.h);
      if (needRecreate) {
        this.grid = new TriGrid(preset.w, preset.h, { wrapMode: this.grid.wrapMode });
        this.sim = new Sim(this.grid);
        this.renderer.resizeToContainer(this.grid);
      }
      this.kernel = preset.kernel;
      this.ruleDSL = preset.ruleDSL;
      this.rule = Rules.makeLife(this.ruleDSL, this.kernel) || TrivialRule;
      seedBuffer(preset, this.grid, this.sim.cur);
      this.sim.next.fill(0);
      this.sim.stepCount = 0;
      refreshIndicators();
      redraw();
      this.analytics.onResizeOrImport(this.grid.size, this.sim.cur.reduce((a,b)=>a+b,0));
      this.refreshAnalyticsUI(true);
    };
    window.addEventListener('ui:applyPreset', ({ detail }) => applyPreset(detail?.name));

    

    // IO: export/import/share
    window.addEventListener('ui:export', () => {
      const meta = { kernel: this.kernel, ruleDSL: this.ruleDSL, fps: this.sim.fps, theme: document.documentElement.getAttribute('data-theme') || 'dark' };
      const json = IO.exportJSON({ grid: this.grid, buffer: this.sim.cur, meta });
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'tri-life.json'; a.click();
        URL.revokeObjectURL(url);
      } catch {
        console.log(json);
      }
    });
    window.addEventListener('ui:import', async () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) return;
        const text = await file.text();
        try {
          const { gridParams, buffer, meta } = IO.importJSON(text);
          const needRecreate = (gridParams.w !== this.grid.w || gridParams.h !== this.grid.h);
          if (needRecreate) {
            this.grid = new TriGrid(gridParams.w, gridParams.h, { wrapMode: gridParams.wrapMode || 'toroidal' });
            this.sim = new Sim(this.grid);
            this.renderer.resizeToContainer(this.grid);
          }
          this.kernel = meta.kernel || this.kernel;
          this.ruleDSL = meta.ruleDSL || this.ruleDSL;
          this.rule = Rules.makeLife(this.ruleDSL, this.kernel) || TrivialRule;
          this.sim.cur.set(buffer);
          this.sim.next.fill(0);
          this.sim.stepCount = 0;
          refreshIndicators();
          redraw();
          this.analytics.onResizeOrImport(this.grid.size, this.sim.cur.reduce((a,b)=>a+b,0));
          this.refreshAnalyticsUI(true);
        } catch (e) {
          console.warn('Импорт не удался:', e.message);
        }
      };
      input.click();
    });
    window.addEventListener('ui:share', () => {
      const meta = { kernel: this.kernel, ruleDSL: this.ruleDSL, fps: this.sim.fps, theme: document.documentElement.getAttribute('data-theme') || 'dark' };
      const json = IO.exportJSON({ grid: this.grid, buffer: this.sim.cur, meta });
      const href = IO.shareToHash(json);
      // Попытка скопировать ссылку в буфер обмена с надёжными фоллбэками
      const copyViaClipboard = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
          try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
        }
        return false;
      };
      const copyViaExecCommand = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
        return ok;
      };
      (async () => {
        const copied = (await copyViaClipboard(href)) || copyViaExecCommand(href);
        if (copied) {
          alert('Ссылка скопирована в буфер обмена');
        } else {
          // Fallback: показать окно со ссылкой для ручного копирования
          window.prompt('Скопируйте ссылку вручную:', href);
        }
      })();
    });

    // Попытаться восстановиться из hash при старте
    const restored = IO.tryImportFromHash();
    if (restored) {
      const { gridParams, buffer, meta } = restored;
      const needRecreate = (gridParams.w !== this.grid.w || gridParams.h !== this.grid.h);
      if (needRecreate) {
        this.grid = new TriGrid(gridParams.w, gridParams.h, { wrapMode: gridParams.wrapMode || 'toroidal' });
        this.sim = new Sim(this.grid);
        this.renderer.resizeToContainer(this.grid);
      }
      this.kernel = meta.kernel || this.kernel;
      this.ruleDSL = meta.ruleDSL || this.ruleDSL;
      this.rule = Rules.makeLife(this.ruleDSL, this.kernel) || TrivialRule;
      this.sim.cur.set(buffer);
      this.sim.next.fill(0);
      this.sim.stepCount = 0;
      refreshIndicators();
      redraw();
    }

    // Обработка клика по canvas -> инверсия клетки
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;
      const idx = this.renderer.pickIndex(this.grid, x, y);
      if (idx >= 0 && idx < this.buffer.length) {
        const arr = this.sim.cur; // редактируем текущий буфер симуляции
        arr[idx] = arr[idx] ? 0 : 1;
        if (this.analyticsEnabled) this.analytics.onToggleCell(arr[idx] ? 1 : -1);
        redraw([idx]);
        this.refreshAnalyticsUI(true);
      }
    });

    // Hover инспектор соседей
    const onHover = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const x = (clientX - rect.left) * dpr;
      const y = (clientY - rect.top) * dpr;
      const idx = this.renderer.pickIndex(this.grid, x, y);
      if (idx < 0) { this.renderer.clearOverlay(); return; }
      const nbrs = Array.from(this.grid.neighbors(idx, this.kernel));
      let aliveCount = 0;
      for (const j of nbrs) aliveCount += this.sim.cur[j];
      this.renderer.drawOverlay(this.grid, idx, nbrs, aliveCount, this.sim.cur);
    };
    canvas.addEventListener('mousemove', (e) => onHover(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', () => this.renderer.clearOverlay());

    // Ресайз
    window.addEventListener('resize', () => {
      this.renderer.resizeToContainer(this.grid);
      redraw();
    });

    // Горячие клавиши: Space — старт/стоп, . — шаг, R — сброс
    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); this.sim.running ? window.dispatchEvent(new CustomEvent('ui:stop')) : window.dispatchEvent(new CustomEvent('ui:start')); }
      else if (e.key === '.') { window.dispatchEvent(new CustomEvent('ui:step')); }
      else if (e.key && e.key.toLowerCase() === 'r') { window.dispatchEvent(new CustomEvent('ui:reset')); }
    });

  this._dbg('Приложение инициализировано');
  },
  /** Устанавливает тему ('dark'|'light') и перерисовывает канвас. */
  setTheme(theme) {
    const html = document.documentElement;
    const next = theme === 'light' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
  this._dbg('ui:toggleTheme', { theme: next });
    try { localStorage.setItem('theme', next); } catch {}
    // Перерисовать, чтобы применились новые цвета сетки/фона
    if (this.renderer && this.grid && this.sim) {
      this.renderer.drawGrid(this.grid);
      this.renderer.drawCells(this.grid, this.sim.cur);
    }
  }
};

// Автозапуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
