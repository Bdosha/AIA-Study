// core/briansBrain.js
;(() => {
  const BB = (window.BB = window.BB || {});
  const { CELL_STATES, DEFAULT_RULES } = BB;

  class BriansBrain {
    constructor(width, height) {
      this.width = Math.max(1, width | 0);
      this.height = Math.max(1, height | 0);
      this.generation = 0;

      // правила по умолчанию
      this.rules = { ...DEFAULT_RULES };

      // сетки
      this.currentGrid = this.createEmptyGrid();
      this.nextGrid    = this.createEmptyGrid();
      this.activityGrid= this.createZeroGrid();

      // статистика
      this.stats = {
        aliveCells: 0,
        density: 0,
        entropy: 0,
        entropyNorm: 0,
      };
    }

    // --- служебные сетки ---
    createEmptyGrid() {
      return Array(this.height).fill(null).map(() =>
        Array(this.width).fill(CELL_STATES.OFF)
      );
    }
    createZeroGrid() {
      return Array(this.height).fill(null).map(() =>
        Array(this.width).fill(0)
      );
    }

    // --- изменение размера поля ---
    resize(newWidth, newHeight) {
      const oldGrid = this.currentGrid;
      const oldWidth = this.width;
      const oldHeight = this.height;

      this.width = newWidth | 0;
      this.height = newHeight | 0;
      this.currentGrid  = this._sanitizeGrid(this.currentGrid, CELL_STATES.OFF);
      this.nextGrid     = this.createEmptyGrid();
      this.activityGrid = this.createZeroGrid();
      this.updateStats();

      // центрируем старое содержимое
      const offsetX = Math.floor((newWidth - oldWidth) / 2);
      const offsetY = Math.floor((newHeight - oldHeight) / 2);
      for (let y = 0; y < oldHeight && y + offsetY < newHeight; y++) {
        for (let x = 0; x < oldWidth && x + offsetX < newWidth; x++) {
          if (offsetX + x >= 0 && offsetY + y >= 0) {
            this.currentGrid[offsetY + y][offsetX + x] = oldGrid[y][x];
          }
        }
      }
      this.updateStats();
    }

    // --- доступ к клеткам ---
    setCell(x, y, state) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.currentGrid[y][x] = state;
      }
    }
    getCell(x, y) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        return this.currentGrid[y][x];
      }
      return CELL_STATES.OFF;
    }

    // --- соседства/правила ---
    countActiveNeighbors(x, y) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx, ny = y + dy;
          if (this.rules.wrapEdges) {
            nx = (nx + this.width) % this.width;
            ny = (ny + this.height) % this.height;
          } else {
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
          }
          if (this.currentGrid[ny][nx] === CELL_STATES.ON) count++;
        }
      }
      return count;
    }

    getNextCellState(x, y) {
      const currentState = this.currentGrid[y][x];
      const activeNeighbors = this.countActiveNeighbors(x, y);

      switch (currentState) {
        case CELL_STATES.OFF:
          if (activeNeighbors === this.rules.birthThreshold) return CELL_STATES.ON;
          if (this.rules.randomChance > 0 &&
              Math.random() * 100 < this.rules.randomChance) return CELL_STATES.ON;
          return CELL_STATES.OFF;

        case CELL_STATES.ON:
          return CELL_STATES.DYING;

        case CELL_STATES.DYING:
        default:
          return CELL_STATES.OFF;
      }
    }

    // --- основной шаг эволюции ---
    step() {
      // если вдруг вообще не того размера — пересоздаём каркасы
      if (!this.nextGrid || this.nextGrid.length !== this.height) {
        this.nextGrid = this.createEmptyGrid();
      }
      if (!this.activityGrid || this.activityGrid.length !== this.height) {
        this.activityGrid = this.createZeroGrid();
      }
      if (!this.currentGrid || this.currentGrid.length !== this.height) {
        this.currentGrid = this.createEmptyGrid();
      }

      for (let y = 0; y < this.height; y++) {
        // 🔒 гарантии на каждую строку
        if (!this.nextGrid[y] || this.nextGrid[y].length !== this.width) {
          this.nextGrid[y] = new Array(this.width).fill(CELL_STATES.OFF);
        }
        if (!this.activityGrid[y] || this.activityGrid[y].length !== this.width) {
          this.activityGrid[y] = new Array(this.width).fill(0);
        }
        if (!this.currentGrid[y] || this.currentGrid[y].length !== this.width) {
          this.currentGrid[y] = new Array(this.width).fill(CELL_STATES.OFF);
        }

        for (let x = 0; x < this.width; x++) {
          const ns = this.getNextCellState(x, y);
          this.nextGrid[y][x] = ns;
          if (ns === CELL_STATES.ON) this.activityGrid[y][x] += 1;
        }
      }

      [this.currentGrid, this.nextGrid] = [this.nextGrid, this.currentGrid];

      // быстро очищаем буфер nextGrid (теперь это бывший currentGrid)
      for (let y = 0; y < this.height; y++) {
        if (!this.nextGrid[y] || this.nextGrid[y].length !== this.width) {
          this.nextGrid[y] = new Array(this.width).fill(CELL_STATES.OFF);
        } else {
          this.nextGrid[y].fill(CELL_STATES.OFF);
        }
      }

      this.generation++;
      this.updateStats();
    }

    // --- метрики и статистика ---
    getCounts(grid = this.currentGrid) {
      let on = 0, dying = 0, off = 0;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const v = grid[y][x];
          if (v === CELL_STATES.ON) on++;
          else if (v === CELL_STATES.DYING) dying++;
          else off++;
        }
      }
      return { on, dying, off, alive: on + dying };
    }

    entropy(grid = this.currentGrid) {
      const { on, dying, off } = this.getCounts(grid);
      const n = on + dying + off || 1;
      const p = [on / n, dying / n, off / n];
      return -p.reduce((s, pi) => (pi > 0 ? s + pi * Math.log2(pi) : s), 0);
    }

    updateStats() {
      let alive = 0;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.currentGrid[y][x] !== CELL_STATES.OFF) alive++;
        }
      }
      this.stats.aliveCells = alive;
      this.stats.density = (alive / (this.width * this.height)) * 100;

      const H = this.entropy(this.currentGrid);
      const Hmax = Math.log2(3);
      const Hnorm = (H / Hmax) || 0;
      this.stats.entropy = +H.toFixed(4);
      this.stats.entropyNorm = +Hnorm.toFixed(4);
    }

    // --- хеш/копии/«песочница» ---
    gridHash(grid = this.currentGrid) {
      let h = 2166136261 >>> 0; // FNV-like
      for (let y = 0; y < this.height; y++) {
        const row = grid[y];
        for (let x = 0; x < this.width; x++) {
          h ^= row[x] + 1;
          h = Math.imul(h, 16777619);
        }
      }
      return h >>> 0;
    }

    cloneGrid(src = this.currentGrid) {
      return src.map(r => r.slice());
    }

    stepOn(grid, rules = this.rules) {
      const next = this.createEmptyGrid();
      const wrap = !!rules.wrapEdges;
      const birth = rules.birthThreshold | 0;
      const rnd = rules.randomChance | 0;
      const H = this.height, W = this.width;

      const countOn = (x, y) => {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx, ny = y + dy;
            if (wrap) { nx = (nx + W) % W; ny = (ny + H) % H; }
            else { if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue; }
            if (grid[ny][nx] === CELL_STATES.ON) c++;
          }
        }
        return c;
      };

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const s = grid[y][x];
          if (s === CELL_STATES.OFF) {
            const n = countOn(x, y);
            if (n === birth || (rnd > 0 && Math.random() * 100 < rnd))
              next[y][x] = CELL_STATES.ON;
            else
              next[y][x] = CELL_STATES.OFF;
          } else if (s === CELL_STATES.ON) next[y][x] = CELL_STATES.DYING;
          else next[y][x] = CELL_STATES.OFF;
        }
      }
      return next;
    }

    setGrid(newGrid) {
      if (!Array.isArray(newGrid)) return;
      this.currentGrid  = this._sanitizeGrid(newGrid, CELL_STATES.OFF);
      this.nextGrid     = this.createEmptyGrid();
      this.activityGrid = this.createZeroGrid();
      this.updateStats();
    }

    // Внутри класса
    _sanitizeGrid(grid, fill = CELL_STATES.OFF) {
      const out = new Array(this.height);
      for (let y = 0; y < this.height; y++) {
        const row = Array.isArray(grid?.[y]) ? grid[y].slice(0, this.width) : [];
        if (row.length < this.width) row.push(...new Array(this.width - row.length).fill(fill));
        out[y] = row;
      }
      return out;
    }

    // --- импорт/экспорт узоров ---
    exportPattern() {
      const cells = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const s = this.currentGrid[y][x];
          if (s !== CELL_STATES.OFF) cells.push([x, y, s]);
        }
      }
      return { width: this.width, height: this.height, cells };
    }

    importPattern(obj) {
      try {
        const { width, height, cells } = obj || {};
        if (!Array.isArray(cells)) throw new Error('Некорректный формат узора');
        this.reset();
        const offX = Math.floor((this.width - width) / 2);
        const offY = Math.floor((this.height - height) / 2);
        for (const [x, y, s] of cells) {
          const tx = x + offX, ty = y + offY;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            this.currentGrid[ty][tx] = s;
          }
        }
        this.updateStats();
      } catch (e) {
        console.error('Ошибка импорта узора:', e);
      }
    }

    // --- анализ/CSV ---
    analyze(maxGenerations = 500, stopWhenExtinct = true) {
      const series = [];
      const seen = new Map(); // hash -> gen
      let period = null;
      let extinctAt = null;

      let sim = this.cloneGrid();
      for (let g = 0; g < maxGenerations; g++) {
        const { on, dying, off, alive } = this.getCounts(sim);
        const density = +(alive / (this.width * this.height) * 100).toFixed(3);
        const H = this.entropy(sim);
        const hash = this.gridHash(sim);

        if (!period) {
          if (seen.has(hash)) period = g - seen.get(hash);
          else seen.set(hash, g);
        }

        series.push({ gen: g, on, dying, off, alive, density, entropy: H, hash });

        if (stopWhenExtinct && alive === 0) { extinctAt = g; break; }
        sim = this.stepOn(sim);
      }

      return { series, detectedPeriod: period, extinctAt };
    }

    toCSV(series) {
      const header = 'gen,on,dying,off,alive,density,entropy,hash';
      const rows = series.map(r =>
        `${r.gen},${r.on},${r.dying},${r.off},${r.alive},${r.density},${r.entropy},${r.hash}`
      );
      return [header, ...rows].join('\n');
    }

    // --- сброс/рандом/пресеты ---
    reset() {
      this.currentGrid = this.createEmptyGrid();
      this.nextGrid = this.createEmptyGrid();
      this.generation = 0;
      this.activityGrid = this.createZeroGrid();
      this.updateStats();
    }

    randomFill(density) {
      const threshold = density / 100;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (Math.random() < threshold) {
            this.currentGrid[y][x] = Math.random() < 0.7 ? CELL_STATES.ON : CELL_STATES.DYING;
          } else {
            this.currentGrid[y][x] = CELL_STATES.OFF;
          }
        }
      }
      this.updateStats();
    }

    setPresetPattern(patternName) {
      this.reset();
      const centerX = Math.floor(this.width / 2);
      const centerY = Math.floor(this.height / 2);

      switch (patternName) {
        case 'single':
          this.setCell(centerX, centerY, CELL_STATES.ON);
          break;

        case 'block':
          this.setCell(centerX, centerY, CELL_STATES.ON);
          this.setCell(centerX + 1, centerY, CELL_STATES.ON);
          this.setCell(centerX, centerY + 1, CELL_STATES.ON);
          this.setCell(centerX + 1, centerY + 1, CELL_STATES.ON);
          break;

        case 'cross':
          this.setCell(centerX, centerY, CELL_STATES.ON);
          this.setCell(centerX - 1, centerY, CELL_STATES.ON);
          this.setCell(centerX + 1, centerY, CELL_STATES.ON);
          this.setCell(centerX, centerY - 1, CELL_STATES.ON);
          this.setCell(centerX, centerY + 1, CELL_STATES.ON);
          break;

        case 'line':
          for (let i = -2; i <= 2; i++) this.setCell(centerX + i, centerY, CELL_STATES.ON);
          break;

        case 'spiral':
          this.setCell(centerX, centerY, CELL_STATES.ON);
          this.setCell(centerX + 1, centerY, CELL_STATES.ON);
          this.setCell(centerX - 1, centerY + 1, CELL_STATES.ON);
          this.setCell(centerX, centerY + 1, CELL_STATES.ON);
          this.setCell(centerX + 1, centerY + 1, CELL_STATES.ON);
          this.setCell(centerX + 2, centerY + 1, CELL_STATES.ON);
          break;

        case 'chaos':
          this.randomFill(25);
          break;

        case 'diag-ship': {
          const x = centerX - 2, y = centerY - 2;
          [
            [0,0],[1,1],[2,2],[3,3],[4,4],
            [1,0],[2,1],[3,2],[4,3]
          ].forEach(([dx,dy]) => this.setCell(x+dx, y+dy, CELL_STATES.ON));
          break;
        }

        case 'ring':
          for (let i = -6; i <= 6; i++) {
            this.setCell(centerX + i, centerY - 6, CELL_STATES.ON);
            this.setCell(centerX + i, centerY + 6, CELL_STATES.ON);
            this.setCell(centerX - 6, centerY + i, CELL_STATES.ON);
            this.setCell(centerX + 6, centerY + i, CELL_STATES.ON);
          }
          break;

        case 'rays':
          for (let i = -10; i <= 10; i++) {
            this.setCell(centerX + i, centerY, CELL_STATES.ON);
            this.setCell(centerX, centerY + i, CELL_STATES.ON);
            this.setCell(centerX + i, centerY + i, CELL_STATES.ON);
            this.setCell(centerX + i, centerY - i, CELL_STATES.ON);
          }
          break;

        case 'burst':
          for (let i = 0; i < 150; i++) {
            const dx = Math.floor((Math.random()*9)-4);
            const dy = Math.floor((Math.random()*9)-4);
            this.setCell(centerX + dx, centerY + dy,
              Math.random() < 0.8 ? CELL_STATES.ON : CELL_STATES.DYING);
          }
          break;

        case 'cross2':
          for (let i = -8; i <= 8; i++) {
            for (let w = -1; w <= 1; w++) {
              this.setCell(centerX + i, centerY + w, CELL_STATES.ON);
              this.setCell(centerX + w, centerY + i, CELL_STATES.ON);
            }
          }
          break;
      }

      this.updateStats();
    }
  }

  BB.BriansBrain = BriansBrain;
})();
