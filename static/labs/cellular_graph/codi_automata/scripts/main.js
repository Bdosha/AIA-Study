// scripts/main.js
// Главный модуль приложения: UI + симуляция + метрики + экспорт.

import { CellularAutomata } from './ca-engine.js';
import { ChartManager } from './charts.js';
import { StorageManager } from './storage.js';
import { CSVExporter } from './csv-export.js';

class StochasticCellularAutomataApp {
  constructor() {
    this.ca = null;
    this.isRunning = false;
    this.animationId = null;

    this.stepCounter = 0;
    this.startTime = 0;
    this.currentTime = 0;

    this.viewOffsetX = 0; // смещение в клетках
    this.viewOffsetY = 0;


    this.canvas = null;
    this.ctx = null;

    this.charts = new ChartManager();
    this.storage = new StorageManager();
    this.exporter = new CSVExporter();

    this.metricsHistory = [];

    this.init();
  }

  // ========= Инициализация =========
  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.resetSimulation();
  }

  // ========= Canvas / рендер =========
  setupCanvas() {
    this.canvas = document.getElementById('grid-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.updateCanvasSize();

    window.addEventListener('resize', () => {
      this.updateCanvasSize();
      this.renderGrid();
    });
  }

  updateCanvasSize() {
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;

    const cssWidth = Math.max(200, container.clientWidth - 40);
    const cssHeight = Math.max(200, container.clientHeight - 40);

    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';

    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.updateViewScrollLimits();

  }

    // Пересчёт пределов прокрутки в зависимости от размера сетки и canvas
  updateViewScrollLimits() {
    if (!this.ca || !this.canvas) return;

    const cellSize = parseInt(document.getElementById('cell-size').value, 10) || 4;
    const dpr = window.devicePixelRatio || 1;
    const viewWidth  = this.canvas.width / dpr;
    const viewHeight = this.canvas.height / dpr;

    const maxColsVisible = Math.floor(viewWidth / cellSize);
    const maxRowsVisible = Math.floor(viewHeight / cellSize);

    const maxOffsetX = Math.max(0, this.ca.width  - maxColsVisible);
    const maxOffsetY = Math.max(0, this.ca.height - maxRowsVisible);

    const groupX  = document.getElementById('view-scroll-x-group');
    const sliderX = document.getElementById('view-offset-x');
    const groupY  = document.getElementById('view-scroll-y-group');
    const sliderY = document.getElementById('view-offset-y');

    if (sliderX && groupX) {
      if (maxOffsetX > 0) {
        groupX.style.display = '';
        sliderX.max = String(maxOffsetX);
        if (this.viewOffsetX > maxOffsetX) this.viewOffsetX = maxOffsetX;
        sliderX.value = String(this.viewOffsetX);
      } else {
        groupX.style.display = 'none';
        this.viewOffsetX = 0;
        sliderX.value = '0';
      }
    }

    if (sliderY && groupY) {
      if (maxOffsetY > 0) {
        groupY.style.display = '';
        sliderY.max = String(maxOffsetY);
        if (this.viewOffsetY > maxOffsetY) this.viewOffsetY = maxOffsetY;
        sliderY.value = String(this.viewOffsetY);
      } else {
        groupY.style.display = 'none';
        this.viewOffsetY = 0;
        sliderY.value = '0';
      }
    }
  }


  renderGrid() {
    if (!this.ca || !this.canvas) return;

    const { width, height, grid } = this.ca;
    const cellSize = parseInt(document.getElementById('cell-size').value, 10) || 4;

    const dpr = window.devicePixelRatio || 1;
    const viewWidth  = this.canvas.width  / dpr;
    const viewHeight = this.canvas.height / dpr;

    // Сколько клеток реально помещается
    const maxColsVisible = Math.max(1, Math.floor(viewWidth  / cellSize));
    const maxRowsVisible = Math.max(1, Math.floor(viewHeight / cellSize));

    // Ограничиваем смещения
    const maxOffsetX = Math.max(0, width  - maxColsVisible);
    const maxOffsetY = Math.max(0, height - maxRowsVisible);
    const offsetX = Math.max(0, Math.min(this.viewOffsetX || 0, maxOffsetX));
    const offsetY = Math.max(0, Math.min(this.viewOffsetY || 0, maxOffsetY));

    this.viewOffsetX = offsetX;
    this.viewOffsetY = offsetY;

    // --- Полная очистка canvas (чтобы не было "хвостов" снизу) ---
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Фон
    const bg = getComputedStyle(document.body).getPropertyValue('--bg-primary') || '#ffffff';
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, viewWidth, viewHeight);

    const colors = [
      '#000000', '#4CAF50', '#2196F3', '#FFC107',
      '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'
    ];
    const drawSize = Math.max(1, cellSize - 1);

    const rows = Math.min(height - offsetY, maxRowsVisible);
    const cols = Math.min(width  - offsetX, maxColsVisible);

    for (let y = 0; y < rows; y++) {
      const gy = y + offsetY;
      for (let x = 0; x < cols; x++) {
        const gx = x + offsetX;
        const s = grid[gy][gx];
        if (s > 0) {
          this.ctx.fillStyle = colors[s % colors.length];
          this.ctx.fillRect(
            x * cellSize,
            y * cellSize,
            drawSize,
            drawSize
          );
        }
      }
    }
  }


  // ========= Привязка UI =========
  setupEventListeners() {
    // Тема
    document.getElementById('theme-toggle')
      .addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        document.body.classList.toggle('dark-theme');
      });

    // Экспорт / сохранение
    document.getElementById('export-csv')
      .addEventListener('click', () => this.exportData());
    document.getElementById('save-state')
      .addEventListener('click', () => this.saveState());
    document.getElementById('load-state')
      .addEventListener('click', () => this.loadState());
    document.getElementById('export-grid')
      .addEventListener('click', () => this.exportGrid());

    // Слайдеры: отображение значений
    document.getElementById('density')
      .addEventListener('input', e =>
        document.getElementById('density-value').textContent = e.target.value
      );
    document.getElementById('simulation-speed')
      .addEventListener('input', e =>
        document.getElementById('speed-value').textContent = e.target.value
      );

    // Параметр правила — немедленно применяем
    document.getElementById('noise-prob')
      .addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        document.getElementById('noise-value').textContent = val.toFixed(2);
        if (this.ca) this.ca.noiseProbability = val;
      });

    // Смена правила
    document.getElementById('rule-select')
      .addEventListener('change', e => {
        if (this.ca) this.ca.ruleType = e.target.value;
        this.updateRuleUi();
      });

    // Смена числа состояний — пересоздать автомат
    document.getElementById('states-count')
      .addEventListener('change', () => this.resetSimulation());

    // Управление симуляцией
    document.getElementById('start-btn').addEventListener('click', () => this.startSimulation());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopSimulation());
    document.getElementById('step-btn').addEventListener('click', () => this.stepSimulation());
    document.getElementById('reset-btn').addEventListener('click', () => this.resetSimulation());

    // Геометрия/масштаб
    document.getElementById('grid-width').addEventListener('change', () => this.resetSimulation());
    document.getElementById('grid-height').addEventListener('change', () => this.resetSimulation());
    document.getElementById('cell-size')
      .addEventListener('change', () => {
        this.updateViewScrollLimits();
        this.renderGrid();
      });


    // Паттерны (10 шт. из ПЗ)
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.applyPattern(e.currentTarget.dataset.pattern));
    });
    // Импорт пользовательского шаблона (JSON)
    const templateInput = document.getElementById('template-file');
    if (templateInput) {
      templateInput.addEventListener('change', (e) => this.handleTemplateImport(e));
    }

        // Прокрутка видимой области сетки
    const offsetXSlider = document.getElementById('view-offset-x');
    if (offsetXSlider) {
      offsetXSlider.addEventListener('input', (e) => {
        this.viewOffsetX = parseInt(e.target.value, 10) || 0;
        this.renderGrid();
      });
    }

    const offsetYSlider = document.getElementById('view-offset-y');
    if (offsetYSlider) {
      offsetYSlider.addEventListener('input', (e) => {
        this.viewOffsetY = parseInt(e.target.value, 10) || 0;
        this.renderGrid();
      });
    }


    // Начальные подписи под ползунком правила
    this.updateRuleUi();
  }

  updateRuleUi() {
    const rule = document.getElementById('rule-select').value;
    const label = document.getElementById('noise-label');
    const range = document.getElementById('noise-prob');

    // ВНИМАНИЕ: ca-engine.js для Ising ожидает β в диапазоне [0..1], который умножается на betaMax внутри движка.
    if (rule === 'majority') {
      label.textContent = 'Параметр правила (η, шум):';
      range.min = '0'; range.max = '1'; range.step = '0.01';
      if (parseFloat(range.value) > 1) range.value = '0.10';
    } else if (rule === 'vote') {
      label.textContent = 'Параметр правила (p, инверсия):';
      range.min = '0'; range.max = '1'; range.step = '0.01';
    } else if (rule === 'ising') {
      label.textContent = 'Параметр правила (β, норм., 0..1):';
      range.min = '0'; range.max = '1'; range.step = '0.01';
      if (parseFloat(range.value) > 1) range.value = '0.25';
    } else {
      label.textContent = 'Параметр правила:';
      range.min = '0'; range.max = '1'; range.step = '0.01';
    }
    document.getElementById('noise-value').textContent = parseFloat(range.value).toFixed(2);
    if (this.ca) this.ca.noiseProbability = parseFloat(range.value);
  }

  // ========= Жизненный цикл симуляции =========
  createAutomata() {
    const width  = parseInt(document.getElementById('grid-width').value, 10);
    const height = parseInt(document.getElementById('grid-height').value, 10);
    const states = parseInt(document.getElementById('states-count').value, 10);
    const noise  = parseFloat(document.getElementById('noise-prob').value);
    const rule   = document.getElementById('rule-select').value;

    this.ca = new CellularAutomata(width, height, states, rule, noise);

    const init   = document.getElementById('initial-state').value;
    const dens   = parseFloat(document.getElementById('density').value);
    this.ca.initialize(init, dens);

    this.viewOffsetX = 0;
    this.viewOffsetY = 0;
    this.updateViewScrollLimits();

  }

  startSimulation() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() - this.currentTime * 1000;
    this.updateControlButtons(true);

    const loop = () => {
      if (!this.isRunning) return;
      this.step();
      const speed = parseInt(document.getElementById('simulation-speed').value, 10);
      const interval = Math.max(16, 1000 / speed);
      this.animationId = setTimeout(loop, interval);
    };
    loop();
  }

  stopSimulation() {
    this.isRunning = false;
    this.updateControlButtons(false);
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }

  stepSimulation() {
    if (this.isRunning) return;
    this.step();
  }

  step() {
    if (!this.ca) return;
    this.ca.step();
    this.stepCounter++;
    this.currentTime = (performance.now() - this.startTime) / 1000;

    this.renderGrid();
    this.updateInfo();
    this.updateMetrics();
  }

  resetSimulation() {
    this.stopSimulation();
    this.createAutomata();
    this.stepCounter = 0;
    this.currentTime = 0;
    this.startTime = performance.now();
    this.metricsHistory = [];
    this.charts.reset();

    this.renderGrid();
    this.updateInfo();
    this.updateMetrics();
  }

  updateControlButtons(running) {
    document.getElementById('start-btn').disabled = running;
    document.getElementById('stop-btn').disabled = !running;
    document.getElementById('step-btn').disabled = running;
  }

  updateInfo() {
    document.getElementById('step-counter').textContent = this.stepCounter;
    document.getElementById('time-counter').textContent = this.currentTime.toFixed(1);
  }

  // ========= Метрики =========
  calculateOrderParameter() {
    // Для N>2: доля одинаковых соседних пар (правдоподобная кластерная мера)
    const { grid, width, height } = this.ca;
    let similar = 0, total = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = grid[y][x];
        const sRight = grid[y][(x + 1) % width];
        if (s === sRight) similar++;
        total++;
        const sDown = grid[(y + 1) % height][x];
        if (s === sDown) similar++;
        total++;
      }
    }
    return total ? similar / total : 0;
  }

  updateMetrics() {
    if (!this.ca) return;

    const stats = this.ca.getGridStatistics();
    const total = stats.totalCells;

    // Энтропия Шеннона (нормированная)
    let H = 0;
    for (let i = 0; i < stats.stateCount.length; i++) {
      const p = stats.stateCount[i] / total;
      if (p > 0) H -= p * Math.log2(p);
    }
    const Hmax = Math.log2(stats.stateCount.length);
    const Hnorm = Hmax > 0 ? H / Hmax : 0;

    // Параметр порядка:
    // - 2 состояния: |m| = |(N1 - N0)/N|
    // - иначе: кластерная мера
    let orderParam;
    if (this.ca.states === 2) {
      const n1 = stats.stateCount[1] || 0;
      const n0 = stats.stateCount[0] || 0;
      const m = (n1 - n0) / total;
      orderParam = Math.abs(m);
    } else {
      orderParam = this.calculateOrderParameter();
    }

    const active = total - (stats.stateCount[0] || 0);

    // UI
    document.getElementById('current-entropy').textContent = Hnorm.toFixed(3);
    document.getElementById('order-parameter').textContent = orderParam.toFixed(3);
    document.getElementById('active-cells').textContent = active;
    document.getElementById('entropy-value').textContent = Hnorm.toFixed(3);

    // История
    this.metricsHistory.push({
      step: this.stepCounter,
      time: this.currentTime,
      entropy: Hnorm,
      orderParameter: orderParam,
      activeCells: active
    });
    if (this.metricsHistory.length > 1000) this.metricsHistory.shift();

    // Графики
    this.charts.update(Hnorm, orderParam, this.stepCounter);
  }

  // ========= Паттерны (ПЗ 3.2.1 — 10 шт.) =========
  applyPattern(name) {
    if (!this.ca) this.createAutomata();
    const { width: W, height: H } = this.ca;

    const p = parseFloat(document.getElementById('density').value) || 0.5; // плотность
    const eps = 0.02;                 // «соль-перец»
    const stripesW = Math.max(2, Math.floor(W / 10));
    const islandsCount = 6;
    const islandsR = Math.max(2, Math.floor(Math.min(W, H) / 10));

    const zeroAll = () => {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          this.ca.grid[y][x] = 0;
        }
      }
    };

    const rnd = this.ca.rand ? this.ca.rand : Math.random;
    const states = this.ca.states;

    // случайное ненулевое состояние для N>2
    const randomNonZero = () => 1 + Math.floor(rnd() * Math.max(1, states - 1));
    const activeState = () => (states === 2 ? 1 : randomNonZero());

    switch (name) {
      // 1) Случайная (p)
      case 'random': {
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (rnd() < p) {
              this.ca.grid[y][x] = activeState();
            } else {
              this.ca.grid[y][x] = 0;
            }
          }
        }
        break;
      }

      // 2) Шахматка
      case 'checkerboard': {
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const on = ((x + y) & 1) === 1;
            this.ca.grid[y][x] = on ? activeState() : 0;
          }
        }
        break;
      }

      // 3) Полосы (вертикальные)
      case 'stripes-v': {
        zeroAll();
        for (let x = 0; x < W; x++) {
          const on = Math.floor(x / stripesW) % 2 === 0;
          if (on) {
            const stripeState = activeState(); // один цвет на полосу
            for (let y = 0; y < H; y++) {
              this.ca.grid[y][x] = stripeState;
            }
          }
        }
        break;
      }

      // 4) Два домена (левая половина — активная, правая — фон)
      case 'two-domains': {
        zeroAll();
        const s = activeState();
        const mid = Math.floor(W / 2);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < mid; x++) {
            this.ca.grid[y][x] = s;
          }
        }
        break;
      }

      // 5) Острова на фоне
      case 'islands': {
        zeroAll();
        const pbg = Math.min(0.15, p);
        // разреженный фон
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            this.ca.grid[y][x] = (rnd() < pbg) ? activeState() : 0;
          }
        }
        // острова
        for (let k = 0; k < islandsCount; k++) {
          const cx = Math.floor(rnd() * W), cy = Math.floor(rnd() * H);
          const islandState = activeState();
          for (let y = cy - islandsR; y <= cy + islandsR; y++) {
            for (let x = cx - islandsR; x <= cx + islandsR; x++) {
              const X = (x + W) % W;
              const Y = (y + H) % H;
              const dx = x - cx, dy = y - cy;
              if (dx * dx + dy * dy <= islandsR * islandsR) {
                this.ca.grid[Y][X] = islandState;
              }
            }
          }
        }
        break;
      }

      // 6) «Соль-перец» — ε-инверсии поверх текущего состояния
      case 'salt-pepper': {
        const epsilon = eps;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (rnd() < epsilon) {
              if (states === 2) {
                this.ca.grid[y][x] = 1 - (this.ca.grid[y][x] ? 1 : 0);
              } else {
                this.ca.grid[y][x] = activeState();
              }
            }
          }
        }
        break;
      }

      // 7) Градиент плотности вдоль X
      case 'gradient-x': {
        const pmin = 0.1, pmax = 0.9;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const t = (W > 1) ? (x / (W - 1)) : 0;
            const px = pmin + (pmax - pmin) * t;
            if (rnd() < px) {
              this.ca.grid[y][x] = activeState();
            } else {
              this.ca.grid[y][x] = 0;
            }
          }
        }
        break;
      }

      // 8) Перколяция около порога (site p≈0.59)
      case 'percolation': {
        const pperc = 0.59;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (rnd() < pperc) {
              this.ca.grid[y][x] = activeState();
            } else {
              this.ca.grid[y][x] = 0;
            }
          }
        }
        break;
      }

      // 9) Линия-затравка по центру
      case 'seed-line': {
        zeroAll();
        const cy = Math.floor(H / 2);
        for (let x = 0; x < W; x++) {
          this.ca.grid[cy][x] = activeState();
        }
        break;
      }

      // 10) Импорт пользовательского шаблона (JSON)
      case 'import-template': {
        const input = document.getElementById('template-file');
        if (input) input.click();
        return; // продолжение после выбора файла
      }

      default:
        alert('Неизвестный паттерн: ' + name);
        return;
    }

    // Синхронизация и перерисовка
    this.ca.copyGrid(this.ca.grid, this.ca.previousGrid);
    this.stepCounter = 0;
    this.currentTime = 0;
    this.metricsHistory = [];
    this.charts.reset();
    this.renderGrid();
    this.updateInfo();
    this.updateMetrics();
  }


  // Импорт JSON { "grid": [[0,1,...], ...] }
  handleTemplateImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj.grid || !Array.isArray(obj.grid) || !Array.isArray(obj.grid[0])) {
          alert('Неверный формат JSON. Ожидается {"grid":[[...],...]}');
          return;
        }
        const H = obj.grid.length, W = obj.grid[0].length;
        // Подгоняем размер автомата
        document.getElementById('grid-width').value  = W;
        document.getElementById('grid-height').value = H;
        this.createAutomata();
        // Копируем сетку (бинаризация значений)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          this.ca.grid[y][x] = Number(obj.grid[y][x]) ? 1 : 0;
        }
        this.ca.copyGrid(this.ca.grid, this.ca.previousGrid);
        this.stepCounter = 0;
        this.currentTime = 0;
        this.metricsHistory = [];
        this.charts.reset();
        this.renderGrid();
        this.updateInfo();
        this.updateMetrics();
        alert('Шаблон импортирован.');
      } catch (err) {
        console.error(err);
        alert('Ошибка чтения JSON: ' + err.message);
      } finally {
        // чтобы можно было выбрать тот же файл снова
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ========= Экспорт/сохранение =========
  exportData() {
    if (!this.ca) return;
    const stats = this.ca.getGridStatistics();

    const data = {
      steps: this.stepCounter,
      time: this.currentTime,
      parameters: {
        width: this.ca.width,
        height: this.ca.height,
        states: this.ca.states,
        rule: this.ca.ruleType,
        noise: this.ca.noiseProbability,
        initialState: document.getElementById('initial-state').value
      },
      statistics: {
        totalCells: stats.totalCells,
        stateCount: stats.stateCount,
        finalGrid: this.ca.grid
      },
      history: this.metricsHistory
    };

    this.exporter.exportToCSV(data);
  }

  saveState() {
    if (!this.ca) return;
    const last = this.metricsHistory[this.metricsHistory.length - 1] || {
      entropy: 0, orderParameter: 0
    };

    const state = {
      grid: JSON.parse(JSON.stringify(this.ca.grid)),
      stepCounter: this.stepCounter,
      parameters: {
        width: this.ca.width,
        height: this.ca.height,
        states: this.ca.states,
        rule: this.ca.ruleType,
        noise: this.ca.noiseProbability
      },
      metrics: {
        entropy: last.entropy,
        orderParameter: last.orderParameter
      }
    };

    const id = this.storage.saveState(state);
    alert(id ? 'Состояние сохранено!' : 'Ошибка при сохранении состояния');
  }

  loadState() {
    const saved = this.storage.loadState();
    if (!saved) {
      alert('Нет сохраненных состояний');
      return;
    }

    document.getElementById('grid-width').value   = saved.parameters.width;
    document.getElementById('grid-height').value  = saved.parameters.height;
    document.getElementById('states-count').value = saved.parameters.states;
    document.getElementById('rule-select').value  = saved.parameters.rule;
    document.getElementById('noise-prob').value   = saved.parameters.noise;
    document.getElementById('noise-value').textContent = String(saved.parameters.noise);

    this.updateRuleUi();
    this.createAutomata();

    this.ca.grid = saved.grid;
    this.ca.copyGrid(this.ca.grid, this.ca.previousGrid);

    this.stepCounter = saved.stepCounter || 0;
    this.currentTime = 0;
    this.startTime = performance.now();

    this.metricsHistory = [];
    this.charts.reset();

    this.renderGrid();
    this.updateInfo();
    this.updateMetrics();

    alert(`Состояние загружено (шаг: ${this.stepCounter})`);
  }

  exportGrid() {
    if (!this.ca) return;
    this.exporter.exportGridToCSV(this.ca.grid, `grid_${this.stepCounter}_steps.csv`);
  }
}

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
  new StochasticCellularAutomataApp();
});
