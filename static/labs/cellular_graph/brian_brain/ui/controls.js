// ui/controls.js
;(() => {
  const BB = (window.BB = window.BB || {});
  const { COLORS, CELL_STATES, theme, persistence } = BB;

  const {
    savePatternJSON,
    wirePatternFileInput,
    exportAnalysisCSV,
    saveRulesToLS,
    loadRulesFromLS,
    saveGridSnapshotToLS,
    loadGridSnapshotFromLS,
    saveThemeToLS,
  } = (persistence || {});

  class Controls {
    constructor(briansBrain, renderer) {
      this.briansBrain = briansBrain;
      this.renderer = renderer;

      // состояние симуляции
      this.isRunning = false;
      this.intervalId = null;
      this._decayAccum = 0; // редкое затухание теплокарты
      this.speed = 100;     // мс между шагами

      // таймер
      this.startTime = 0;
      this.elapsedTime = 0;
      this.timerInterval = null;

      // анализ
      this.lastAnalysis = null;

      // онлайн-метрики для мини-графиков
      this.seriesLive = { gen: [], density: [], entropy: [] };
      this.chart = {
        density: document.getElementById('chartDensity')?.getContext('2d') || null,
        entropy: document.getElementById('chartEntropy')?.getContext('2d') || null,
        maxPoints: 300
      };

      // RAF-цикл
      this._rafId = null;
      this._lastTs = 0;
      this._accumMs = 0;
      this._tick = this._tick.bind(this);

      // --- инициализация UI ---
      this.initializeControls();

      // --- восстановление сохранённых правил/сетки/темы ---
      try {
        const restoredRules = loadRulesFromLS && loadRulesFromLS();
        if (restoredRules) {
          this.briansBrain.rules.birthThreshold = restoredRules.birthThreshold ?? this.briansBrain.rules.birthThreshold;
          this.briansBrain.rules.randomChance   = restoredRules.randomChance   ?? this.briansBrain.rules.randomChance;
          this.briansBrain.rules.wrapEdges      = restoredRules.wrapEdges      ?? this.briansBrain.rules.wrapEdges;

          // синхронизируем слайдеры/чекбоксы
          const bt = document.getElementById('birthThreshold');
          const rc = document.getElementById('randomChance');
          const we = document.getElementById('wrapEdges');
          if (bt) { bt.value = this.briansBrain.rules.birthThreshold; this.setTextSafe('birthValue', bt.value); }
          if (rc) { rc.value = this.briansBrain.rules.randomChance;   this.setTextSafe('randomValue', rc.value); }
          if (we) { we.checked = !!this.briansBrain.rules.wrapEdges; }
        }

        const snapshot = loadGridSnapshotFromLS && loadGridSnapshotFromLS();
        if (snapshot && Array.isArray(snapshot)
            && snapshot.length === this.briansBrain.height
            && snapshot[0]?.length === this.briansBrain.width) {
          this.briansBrain.setGrid(snapshot);
        }
      } catch (e) {
        console.warn('Не удалось восстановить состояние из localStorage:', e);
      }

      this.updateStatus('stopped');
      this.updateUI();
      this.updateTimer();

      // синхронизируем иконку темы
      const t = (theme && theme.getCurrentTheme && theme.getCurrentTheme())
                || document.documentElement.getAttribute('data-color-scheme') || 'light';
      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) themeToggle.textContent = (t === 'dark') ? '🌙' : '☀️';

      // автоснапшот сетки при уходе со страницы
      window.addEventListener('beforeunload', () => {
        try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
      });
    }

    // -------- легенда цветов (под тему) --------
    syncLegend() {
      const t = this.renderer.theme;
      const map = COLORS[t] || COLORS.light;
      const offEl   = document.querySelector('.legend-color--off');
      const onEl    = document.querySelector('.legend-color--on');
      const dyingEl = document.querySelector('.legend-color--dying');
      if (offEl)   offEl.style.backgroundColor   = map.OFF;
      if (onEl)    onEl.style.backgroundColor    = map.ON;
      if (dyingEl) dyingEl.style.backgroundColor = map.DYING;
    }

    // -------- инициализация DOM-кнопок/слайдеров --------
    initializeControls() {
      // старт/стоп/шаг/сброс
      document.getElementById('startBtn')?.addEventListener('click', () => this.start());
      document.getElementById('stopBtn')?.addEventListener('click', () => this.stop());
      document.getElementById('stepBtn')?.addEventListener('click', () => this.step());
      document.getElementById('resetBtn')?.addEventListener('click', () => this.reset());

      // очистка поля без полного сброса
      const clearBtn = document.getElementById('clearGridBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          for (let y = 0; y < this.briansBrain.height; y++) {
            for (let x = 0; x < this.briansBrain.width; x++) {
              this.briansBrain.currentGrid[y][x] = 0;
              this.briansBrain.nextGrid[y][x] = 0;
              if (this.briansBrain.activityGrid?.[y]) this.briansBrain.activityGrid[y][x] = 0;
            }
          }
          this.briansBrain.stats.aliveCells = 0;
          this.briansBrain.stats.density = 0;
          this.briansBrain.stats.entropy = 0;
          this.briansBrain.stats.entropyNorm = 0;
          try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
          this.renderer.render();
          this._updateDomAndCharts();
        });
      }

      // горячие клавиши
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); this.isRunning ? this.stop() : this.start(); }
        if (e.code === 'Period' || e.key === '.') { e.preventDefault(); this.step(); }
      });

      // переключатель темы
      document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

      // скорость
      const speedSlider = document.getElementById('speedSlider');
      speedSlider?.addEventListener('input', (e) => {
        this.speed = Math.max(1, parseInt(e.target.value) || 100);
        this.setTextSafe('speedValue', this.speed);
        if (this.isRunning) { this.stop(); this.start(); }
      });

      // правила
      document.getElementById('birthThreshold')?.addEventListener('input', (e) => {
        this.briansBrain.rules.birthThreshold = parseInt(e.target.value);
        this.setTextSafe('birthValue', e.target.value);
        try { saveRulesToLS && saveRulesToLS(this.briansBrain.rules); } catch {}
      });
      document.getElementById('randomChance')?.addEventListener('input', (e) => {
        this.briansBrain.rules.randomChance = parseInt(e.target.value);
        this.setTextSafe('randomValue', e.target.value);
        try { saveRulesToLS && saveRulesToLS(this.briansBrain.rules); } catch {}
      });
      document.getElementById('wrapEdges')?.addEventListener('change', (e) => {
        this.briansBrain.rules.wrapEdges = e.target.checked;
        try { saveRulesToLS && saveRulesToLS(this.briansBrain.rules); } catch {}
      });

      // размеры поля
      document.getElementById('gridWidth')?.addEventListener('input', (e) => {
        const newW = parseInt(e.target.value);
        this.setTextSafe('widthValue', newW);
        this.briansBrain.resize(newW, this.briansBrain.height);
        this.renderer.resize();
        this.updateUI();
        try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
      });
      document.getElementById('gridHeight')?.addEventListener('input', (e) => {
        const newH = parseInt(e.target.value);
        this.setTextSafe('heightValue', newH);
        this.briansBrain.resize(this.briansBrain.width, newH);
        this.renderer.resize();
        this.updateUI();
        try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
      });

      // кисти
      document.querySelectorAll('.state-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.state-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const state = parseInt(e.currentTarget.dataset.state);
          this.renderer.setBrushState(state);
        });
      });
      document.getElementById('brushSize')?.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        this.renderer.setBrushSize(size);
        this.setTextSafe('brushValue', size);
      });

      // случайная заливка
      document.getElementById('randomFillBtn')?.addEventListener('click', () => {
        const density = parseInt(document.getElementById('fillDensity').value);
        this.briansBrain.randomFill(density);
        this.updateUI();
        try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
      });
      document.getElementById('fillDensity')?.addEventListener('input', (e) => {
        this.setTextSafe('densityValue', e.target.value);
      });

      // предустановленные паттерны
      const patternSelect = document.getElementById('patternSelect');
      const placePatternBtn = document.getElementById('placePatternBtn');
      if (placePatternBtn && patternSelect) {
        placePatternBtn.addEventListener('click', () => {
          const pattern = patternSelect.value;
          if (!pattern) return;
          this.briansBrain.setPresetPattern(pattern);
          this.updateUI();
          try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
        });
      }

      // анализ
      const analysisGen = document.getElementById('analysisGenerations');
      analysisGen?.addEventListener('input', (e) => {
        this.setTextSafe('analysisGenValue', e.target.value);
      });

      const runBtn = document.getElementById('runAnalysisBtn');
      runBtn?.addEventListener('click', () => {
        const gens = parseInt(document.getElementById('analysisGenerations').value) || 500;

        const startGrid = this.briansBrain.cloneGrid();
        const { series, detectedPeriod } = this.briansBrain.analyze(gens);
        this.lastAnalysis = { series, detectedPeriod, startGrid };

        const first = series[0];
        const last  = series[series.length - 1];
        const maxByDensity = series.reduce((m, r) => r.density > m.density ? r : m, series[0]);

        const lastNonEmpty = (() => {
          for (let i = series.length - 1; i >= 0; i--) if (series[i].alive > 0) return series[i];
          return last;
        })();

        const avgEntropy   = +(series.reduce((s, r) => s + r.entropy, 0) / series.length).toFixed(3);
        const maxByEntropy = series.reduce((m, r) => r.entropy > m.entropy ? r : m, series[0]);
        const ran = series.length;

        const summary = [
          `Поколений: ${ran}`,
          `Период: ${detectedPeriod ?? 'не обнаружен'}` + (last.alive === 0 ? ' (фиксированное пустое состояние)' : ''),
          `Старт. плотность: ${first.density}%`,
          `Итоговая плотность: ${last.density}%`,
          `Макс. плотность: ${maxByDensity.density}% (gen ${maxByDensity.gen})`,
          `Энтропия (последн. ненулевая): ${lastNonEmpty.entropy} (gen ${lastNonEmpty.gen})`,
          `Энтропия (макс.): ${maxByEntropy.entropy} (gen ${maxByEntropy.gen})`,
          `Энтропия (средняя): ${avgEntropy}`,
          `Активные сейчас: ${last.alive}`,
          `Активные максимум: ${series.reduce((m, r) => Math.max(m, r.alive), 0)}`
        ].join(' | ');

        const el = document.getElementById('analysisSummary');
        if (el) el.textContent = summary;
      });

      // показ кадра из анализа
      const showGenBtn   = document.getElementById('showGenBtn');
      const showGenInput = document.getElementById('showGenInput');
      const showGenHint  = document.getElementById('showGenHint');
      if (showGenBtn && showGenInput) {
        showGenBtn.addEventListener('click', () => {
          const tgt = Math.max(0, parseInt(showGenInput.value) || 0);
          if (!this.lastAnalysis || !this.lastAnalysis.startGrid) {
            if (showGenHint) showGenHint.textContent = 'Сначала запустите анализ.';
            return;
          }
          this.stop();
          let grid = this.lastAnalysis.startGrid.map((r) => r.slice());
          for (let g = 0; g < tgt; g++) grid = this.briansBrain.stepOn(grid, this.briansBrain.rules);
          this.briansBrain.setGrid(grid);
          this.updateUI();
          if (showGenHint) showGenHint.textContent = `Показан кадр gen=${tgt}`;
        });
      }

      // --- экспорт CSV (через persistence) ---
      document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        const gens = parseInt(document.getElementById('analysisGenerations').value) || 500;
        const series = (this.lastAnalysis && this.lastAnalysis.series)
          ? this.lastAnalysis.series
          : this.briansBrain.analyze(gens).series;
        try {
          exportAnalysisCSV && exportAnalysisCSV(series, gens);
        } catch (e) {
          console.error('CSV экспорт не удался, fallback:', e);
          const csv  = this.briansBrain.toCSV(series);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href = url;
          a.download = `brians-brain-analysis-${gens}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      });

      // кисть по умолчанию — «возбуждение»
      this.renderer.setBrushState(CELL_STATES.ON);
      document.querySelectorAll('.state-btn').forEach((b) => b.classList.remove('active'));
      document.querySelector('.state-btn[data-state="1"]')?.classList.add('active');

      // тепловая карта
      const toggleHeatmap = document.getElementById('toggleHeatmap');
      toggleHeatmap?.addEventListener('change', (e) => {
        this.renderer.setShowHeatmap(e.target.checked);
      });

      // --- сохранение/загрузка узора (через persistence) ---
      document.getElementById('savePatternBtn')?.addEventListener('click', () => {
        try {
          // передаём ИНСТАНС автомата — persistence сам вызовет exportPattern()
          savePatternJSON && savePatternJSON(this.briansBrain);
        } catch (e) {
          console.error('Не удалось сохранить узор:', e);
        }
      });

      const loadInput = document.getElementById('loadPatternInput');
      if (loadInput) {
        wirePatternFileInput && wirePatternFileInput(
          loadInput,
          this.briansBrain,
          () => {
            this.updateUI();
            try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
          },
          (err) => alert('Не удалось загрузить узор: ' + (err?.message || err))
        );
      }
    }

    // -------- RAF-цикл --------
    _tick(nowMs) {
      if (!this.isRunning) return;
      if (!this._lastTs) this._lastTs = nowMs;
      const dt = nowMs - this._lastTs;
      this._lastTs = nowMs;
      this._accumMs += dt;

      const MAX_STEPS_PER_FRAME = 8;
      let steps = 0;
      while (this._accumMs >= this.speed && steps < MAX_STEPS_PER_FRAME) {
        this.briansBrain.step();
        this._pushLivePoint();
        this._accumMs -= this.speed;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this._accumMs = 0;

      // затухание теплокарты реже
      if (this.renderer.showHeatmap) {
        this._decayAccum += dt;
        const DECAY_INTERVAL = 100;  // мс
        const TAU_MS = 3000;
        if (this._decayAccum >= DECAY_INTERVAL) {
          const ag = this.briansBrain.activityGrid;
          const H = this.briansBrain.height;
          const W = this.briansBrain.width;
          const k = Math.exp(-this._decayAccum / TAU_MS);
          const eps = 0.01;
          for (let y = 0; y < H; y++) {
            const row = ag[y];
            for (let x = 0; x < W; x++) {
              const v = row[x] * k;
              row[x] = (v < eps) ? 0 : v;
            }
          }
          this._decayAccum = 0;
        }
      }

      this.renderer.render();
      this._updateDomAndCharts();
      this._rafId = requestAnimationFrame(this._tick);
    }

    // -------- мини-графики --------
    _clearLiveCharts() {
      this.seriesLive = { gen: [], density: [], entropy: [] };
      [this.chart.density, this.chart.entropy].forEach((ctx) => {
        if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      });
    }

    _pushLivePoint() {
      const dens = Number(this.briansBrain.stats.density);
      if (Number.isFinite(dens)) this.seriesLive.density.push(dens);

      let raw = this.briansBrain.stats?.entropy;
      if (!Number.isFinite(raw)) raw = this.briansBrain.entropy(this.briansBrain.currentGrid);
      if (Number.isFinite(raw)) {
        const last = this.seriesLive.entropy.length ? this.seriesLive.entropy[this.seriesLive.entropy.length - 1] : null;
        const alpha = 0.3;
        const smoothed = (last == null) ? raw : (alpha * raw + (1 - alpha) * last);
        this.seriesLive.entropy.push(smoothed);
      }

      this.seriesLive.gen.push(this.briansBrain.generation);

      const M = this.chart.maxPoints;
      const trim = (arr) => { if (arr.length > M) arr.splice(0, arr.length - M); };
      trim(this.seriesLive.gen);
      trim(this.seriesLive.density);
      trim(this.seriesLive.entropy);
    }

    drawMiniLine(ctx, data, label, decimals = 3) {
      if (!ctx || !data || data.length < 2) return;
      const clean = data.filter(Number.isFinite);
      if (clean.length < 2) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }

      const W = ctx.canvas.width, H = ctx.canvas.height;
      ctx.clearRect(0, 0, W, H);

      const padL = 44, padR = 8, padT = 6, padB = 16;
      const w = W - padL - padR;
      const h = H - padT - padB;

      const n = clean.length;
      const xStep = n > 1 ? (w / (n - 1)) : w;

      const min = Math.min(...clean);
      const max = Math.max(...clean);
      const span = (max - min) || 1;

      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(max.toFixed(decimals), padL - 6, padT + 8);
      ctx.fillText(min.toFixed(decimals), padL - 6, padT + h + 2);

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = padL + i * xStep;
        const y = padT + h - ((clean[i] - min) / span) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#08f';
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText(label, padL, H - 4);
    }

    // -------- управление симуляцией --------
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.updateStatus('running');

      this.startTime = Date.now() - this.elapsedTime;
      this.timerInterval = setInterval(() => this.updateTimer(), 100);
      this.speed = Math.max(1, this.speed | 0);

      this._lastTs = 0;
      this._accumMs = 0;
      this._rafId = requestAnimationFrame(this._tick);
      this.updateButtonStates();
    }

    stop() {
      if (!this.isRunning) return;
      this.isRunning = false;
      this.updateStatus('paused');

      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;

      clearInterval(this.timerInterval);
      this.elapsedTime = Date.now() - this.startTime;
      this.updateButtonStates();
    }

    step() {
      if (this.isRunning) return;
      this.briansBrain.step();
      this._pushLivePoint();
      this.renderer.render();
      this._updateDomAndCharts();

      // периодический автоснапшот (не чаще раза в 50 поколений)
      try {
        if ((this.briansBrain.generation % 50) === 0) {
          saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid);
        }
      } catch {}
    }

    reset() {
      this.stop();
      this.briansBrain.reset();
      this.elapsedTime = 0;

      this._clearLiveCharts();
      this.lastAnalysis = null;
      const el = document.getElementById('analysisSummary');
      if (el) el.textContent = '';

      this.updateStatus('stopped');
      this.renderer.render();
      this._updateDomAndCharts();
      this.updateTimer();
      try { saveGridSnapshotToLS && saveGridSnapshotToLS(this.briansBrain.currentGrid); } catch {}
    }

    // -------- статус/тема/UI --------
    updateStatus(state) {
      const simStatus = document.getElementById('simStatus');
      if (simStatus) {
        if (state === 'running') { simStatus.textContent = '🟢 Запущено'; simStatus.className = 'status running'; }
        else if (state === 'paused') { simStatus.textContent = '🟡 Пауза'; simStatus.className = 'status paused'; }
        else { simStatus.textContent = '🟥 Остановлено'; simStatus.className = 'status stopped'; }
      }

      const bottom = document.getElementById('statusBottom');
      if (bottom) {
        bottom.classList.remove('is-running', 'is-paused', 'is-stopped');
        if (state === 'running')      { bottom.textContent = 'Запущено';  bottom.classList.add('is-running'); }
        else if (state === 'paused')  { bottom.textContent = 'Пауза';      bottom.classList.add('is-paused'); }
        else                          { bottom.textContent = 'Остановлено';bottom.classList.add('is-stopped'); }
      }
    }

    toggleTheme() {
      const newTheme = theme && theme.toggleDocumentTheme ? theme.toggleDocumentTheme() : 'light';
      try { saveThemeToLS && saveThemeToLS(newTheme); } catch {}
      this.renderer.setTheme(newTheme);
      this.syncLegend();
      try { localStorage.setItem('bb-theme', newTheme); } catch {}

      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) themeToggle.textContent = (newTheme === 'dark') ? '🌙' : '☀️';

      this.updateUI();
    }

    updateButtonStates() {
      const startBtn = document.getElementById('startBtn');
      const stopBtn  = document.getElementById('stopBtn');
      const stepBtn  = document.getElementById('stepBtn');

      if (this.isRunning) {
        if (startBtn) startBtn.disabled = true;
        if (stopBtn)  stopBtn.disabled  = false;
        if (stepBtn)  stepBtn.disabled  = true;
      } else {
        if (startBtn) startBtn.disabled = false;
        if (stopBtn)  stopBtn.disabled  = true;
        if (stepBtn)  stepBtn.disabled  = false;
      }
    }

    updateTimer() {
      const current = this.isRunning ? Date.now() - this.startTime : this.elapsedTime;
      const seconds = Math.floor(current / 1000);
      const minutes = Math.floor(seconds / 60);
      const formatted = `${minutes.toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`;
      this.setTextSafe('timer', formatted);
      this.setTextSafe('timeBottom', formatted);
    }

    setTextSafe(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    _updateDomAndCharts() {
      // верхние метки
      this.setTextSafe('generation', this.briansBrain.generation);
      this.setTextSafe('aliveCells', this.briansBrain.stats.aliveCells);
      this.setTextSafe('density', this.briansBrain.stats.density.toFixed(1) + '%');

      // нижняя панель
      this.setTextSafe('genBottom', this.briansBrain.generation);
      this.setTextSafe('aliveBottom', this.briansBrain.stats.aliveCells);
      this.setTextSafe('densityBottom', this.briansBrain.stats.density.toFixed(1) + '%');

      // энтропия
      const H  = Number.isFinite(this.briansBrain.stats.entropy) ? this.briansBrain.stats.entropy : 0;
      const Hn = Number.isFinite(this.briansBrain.stats.entropyNorm) ? Math.round(this.briansBrain.stats.entropyNorm * 100) : 0;
      this.setTextSafe('entropyBottom', `${H.toFixed(3)} (${Hn}%)`);

      // мини-графики
      this.drawMiniLine(this.chart.density, this.seriesLive.density, 'Плотность, %', 1);
      this.drawMiniLine(this.chart.entropy, this.seriesLive.entropy, 'Энтропия, бит', 3);
    }

    updateUI() {
      this.renderer.render();
      this._updateDomAndCharts();
      this.syncLegend();
    }
  }

  BB.Controls = Controls;
})();
