/**
 * UIController — связывает DOM (панель управления) и движок симуляции.
 * Ключевые требования ТЗ:
 *  - Параметры применяются ТОЛЬКО по кнопке «Старт» или при переходе в «Работа».
 *  - Если W/H, правило и число муравьёв НЕ менялись (и не выбран новый пресет) —
 *    симуляция продолжитcя с места паузы (без сброса).
 *  - Валидация min/max с всплывающим окном.
 *  - Режим «Работа» визуально блокирует поля.
 *  - Адаптив: контейнер поля с aspect-ratio (+ JS fallback для Safari 14).
 *  - Хоткеи: Пробел — старт/пауза; N — один шаг.
 */

import { presetDefault, presetsLangton, presetsTurmites } from './presets.js';

const LIMITS = Object.freeze({
  MIN_W: 30,  MIN_H: 20,
  MAX_W: 220, MAX_H: 160,
  MIN_ANTS: 1, MAX_ANTS: 16,
  // меньше дефолты — крупнее визуальный масштаб
  DEF_W: 90,  DEF_H: 60,
  MAX_RULE_LEN: 64,
});

const clamp = (n,a,b)=> Math.max(a, Math.min(b, n|0));

export class UIController{
  /**
   * @param {{ sim:any, renderer:any, theme?:any }} deps
   *  sim — объект симуляции с API: configure({width,height,rule,ants,spawn?}), start/stop/update/step,
   *       setSpeed(n), snapshot(), formattedTime(), get width/height/ruleString/antsCount/steps/running.
   *  renderer — Renderer (canvas + grid overlay).
   */
  constructor({ sim, renderer, theme }){
    this.sim = sim;
    this.renderer = renderer;
    this.theme = theme;

    // Кэш нужных DOM-элементов
    this.el = {
      modeSetupBtn: document.getElementById('modeSetup'),
      modeRunBtn: document.getElementById('modeRun'),
      setupPanel: document.getElementById('setupPanel'),

      gridWidth:  document.getElementById('gridWidth'),
      gridHeight: document.getElementById('gridHeight'),
      ruleInput:  document.getElementById('ruleInput'),
      antsCount:  document.getElementById('antsCount'),

      startBtn: document.getElementById('startBtn'),
      stopBtn:  document.getElementById('stopBtn'),
      stepBtn:  document.getElementById('stepBtn'),
      resetBtn: document.getElementById('resetBtn'),
      speedRange: document.getElementById('speedRange'),

      toggleGrid: document.getElementById('toggleGrid'),

      antsIndicator: document.getElementById('antsIndicator'),
      patternsLangton: document.getElementById('patternsLangton'),
      patternsTurmites: document.getElementById('patternsTurmites'),
      ruleLegend: document.getElementById('ruleLegend'),

      toolRadios: document.querySelectorAll('input[name="tool"]'),

      stepCounter: document.getElementById('stepCounter'),
      timer: document.getElementById('timer'),
      fps: document.getElementById('fps'),
      canvas: document.getElementById('viewport'),
      gridOverlay: document.getElementById('gridOverlay'),
    };

    // «Отложенные» параметры — копия того, что в инпутах (применяем по Старт/Работа)
    this.pending = { width: LIMITS.DEF_W, height: LIMITS.DEF_H, rule: 'RL', ants: 1, spawn: null };
    // Последние применённые (для решения «продолжать без сброса»)
    this.lastApplied = { width: LIMITS.DEF_W, height: LIMITS.DEF_H, rule: 'RL', ants: 1 };

    // Режим и состояние анимации
    this.mode = 'setup';
    this._raf = null;
    this._lastFrame = performance.now();
    this._fpsCounter = { frames: 0, last: performance.now() };
    this.tool = 'antAdd';

    // Fallback-наблюдатель для aspect-ratio
    this._arRO = null;
  }

  /** Инициализация UI и первой конфигурации симуляции */
  init(){
    // Страховка min/max на случай старого HTML
    if(this.el.gridWidth){  this.el.gridWidth.min  = LIMITS.MIN_W; this.el.gridWidth.max  = LIMITS.MAX_W; }
    if(this.el.gridHeight){ this.el.gridHeight.min = LIMITS.MIN_H; this.el.gridHeight.max = LIMITS.MAX_H; }
    if(this.el.antsCount){  this.el.antsCount.min  = LIMITS.MIN_ANTS; this.el.antsCount.max = LIMITS.MAX_ANTS; }

    // Начальные значения из полей и пресета по умолчанию
    const p = presetDefault();
    const w0 = clamp(parseInt(this.el.gridWidth.value,10)  || LIMITS.DEF_W, LIMITS.MIN_W, LIMITS.MAX_W);
    const h0 = clamp(parseInt(this.el.gridHeight.value,10) || LIMITS.DEF_H, LIMITS.MIN_H, LIMITS.MAX_H);
    const r0 = (this.el.ruleInput.value || p.rule).toUpperCase().replace(/[^LRFU]/g,'').slice(0, LIMITS.MAX_RULE_LEN) || 'RL';
    const a0 = clamp(parseInt(this.el.antsCount.value,10) || p.ants, LIMITS.MIN_ANTS, LIMITS.MAX_ANTS);

    // Нормализуем инпуты
    this.el.gridWidth.value  = w0;
    this.el.gridHeight.value = h0;
    this.el.ruleInput.value  = r0;
    this.el.antsCount.value  = a0;

    // Применяем стартовую конфигурацию один раз
    this.sim.configure({ width: w0, height: h0, rule: r0, ants: a0 });
    this.lastApplied = { width: w0, height: h0, rule: r0, ants: a0 };

    // Подключаем overlay-сетку
    this.renderer.attachGridOverlay(this.el.gridOverlay);

    // pending = текущее состояние полей
    this.readInputsToPending();

    // Рендер карточек паттернов
    this.renderPatterns();

    // Режимы
    this.el.modeSetupBtn.addEventListener('click', ()=> this.setMode('setup'));
    this.el.modeRunBtn.addEventListener('click', ()=>{
      // При переходе в «Работа» применяем pending ТОЛЬКО если есть изменения
      if(this.hasPendingChanges()){
        if(!this.applyPending()) return;
      }
      this.setMode('run');
    });

    // Кнопки управления
    this.el.startBtn.addEventListener('click', ()=>{
      if(this.sim.running) return;
      if(this.hasPendingChanges()){
        if(!this.applyPending()) return;
      }
      this.start();
    });
    this.el.stopBtn.addEventListener('click', ()=> this.stop());
    this.el.stepBtn.addEventListener('click', ()=> this.stepOnce());
    this.el.resetBtn.addEventListener('click', ()=> this.reset());

    // Скорость
    this.el.speedRange.addEventListener('input', ()=> {
      this.sim.setSpeed(parseInt(this.el.speedRange.value, 10) || 10);
    });
    this.sim.setSpeed(parseInt(this.el.speedRange.value, 10) || 10);

    // Тумблер сетки
    if (this.el.toggleGrid){
      this.el.toggleGrid.addEventListener('change', ()=>{
        this.renderer.showGrid = this.el.toggleGrid.checked;
        this.renderer.updateGridOverlay();
      });
    }

    // Инпуты: обновляем только pending и легенду (НЕ применяем!)
    const onFieldsChange = ()=>{
      this.readInputsToPending();
      const ruleClean = (this.el.ruleInput.value || '').toUpperCase().replace(/[^LRFU]/g,'').slice(0, LIMITS.MAX_RULE_LEN);
      this.updateRuleLegend(ruleClean || 'RL');
    };
    ['change','keyup','blur'].forEach(evt=>{
      this.el.gridWidth.addEventListener(evt, onFieldsChange);
      this.el.gridHeight.addEventListener(evt, onFieldsChange);
      this.el.ruleInput.addEventListener(evt, onFieldsChange);
      this.el.antsCount.addEventListener(evt, onFieldsChange);
    });

    // Инструменты: карандаш/ластик
    this.el.toolRadios.forEach(r=>{
      r.addEventListener('change', ()=>{ if(r.checked) this.tool = r.value; });
    });

    // Клик по канвасу → координаты клетки → добавление/удаление муравья
    this.el.canvas.addEventListener('click', (e)=>{
      const cell = this.renderer.clientToCell(e.clientX, e.clientY);
      if(!cell) return;
      const { x, y } = cell;
      if(this.tool === 'antAdd'){
        const ok = this.sim.addAntAt(x,y);
        if(!ok) this.flashAntsIndicator();
      }else if(this.tool === 'antErase'){
        this.sim.removeAntAt(x,y);
      }
      this.renderer.draw(this.sim.snapshot());
      this.updateAntsIndicator();
    });

    // Первая отрисовка
    this.renderer.resizeToGrid(this.sim.width, this.sim.height);
    this.fitContainerAspect(this.sim.width, this.sim.height);
    this.updateRuleLegend(this.sim.ruleString);
    this.renderer.draw(this.sim.snapshot());
    this.updateStats();
    this.updateAntsIndicator();

    // Ресайз окна → пересчёт метрик/сеток и редро
    window.addEventListener('resize', ()=>{
      this.renderer.updateViewportMetrics();
      this.renderer.updateGridOverlay();
      this.renderer.draw(this.sim.snapshot());
    });

    // Хоткеи: пробел — старт/пауза; N — шаг
    window.addEventListener('keydown', (e)=>{
      if(e.code === 'Space'){
        e.preventDefault();
        if(this.sim.running){
          this.stop();
        }else{
          if(this.hasPendingChanges()){
            if(!this.applyPending()) return;
          }
          this.start();
        }
      }
      if(e.key.toLowerCase() === 'n'){ this.stepOnce(); }
    });
  }

  // ---------- Работа с pending и валидацией ----------

  /** Считываем значения инпутов в pending, без применения. */
  readInputsToPending(){
    const w = parseInt(this.el.gridWidth.value, 10);
    const h = parseInt(this.el.gridHeight.value, 10);
    const a = parseInt(this.el.antsCount.value, 10);
    const r = (this.el.ruleInput.value || '').toUpperCase().replace(/[^LRFU]/g,'').slice(0, LIMITS.MAX_RULE_LEN);
    this.pending = {
      width: isNaN(w) ? LIMITS.DEF_W : w,
      height:isNaN(h) ? LIMITS.DEF_H : h,
      ants:  isNaN(a) ? 1 : a,
      rule:  r.length ? r : 'RL',
      // spawn подставляется пресетами; ручной ввод его не меняет
      spawn: this.pending.spawn || null,
    };
  }

  /**
   * Есть ли реальные изменения по сравнения с lastApplied?
   * Учитываем только W/H, правило, число муравьёв — карандаш не влияет.
   * Если в pending есть spawn (последний выбран пресет) — это тоже «изменения».
   */
  hasPendingChanges(){
    if(this.pending.spawn && this.pending.spawn.length) return true;
    return (
      this.pending.width  !== this.lastApplied.width ||
      this.pending.height !== this.lastApplied.height ||
      this.pending.rule   !== this.lastApplied.rule ||
      this.pending.ants   !== this.lastApplied.ants
    );
  }

  /** Проверяем min/max и допустимые символы правила (L/R/F/U). */
  validatePending(){
    const err = [];
    const p = this.pending;
    if(p.width < LIMITS.MIN_W || p.width > LIMITS.MAX_W){
      err.push(`Ширина: от ${LIMITS.MIN_W} до ${LIMITS.MAX_W} клеток.`);
    }
    if(p.height < LIMITS.MIN_H || p.height > LIMITS.MAX_H){
      err.push(`Высота: от ${LIMITS.MIN_H} до ${LIMITS.MAX_H} клеток.`);
    }
    if(p.ants < LIMITS.MIN_ANTS || p.ants > LIMITS.MAX_ANTS){
      err.push(`Количество муравьёв: от ${LIMITS.MIN_ANTS} до ${LIMITS.MAX_ANTS}.`);
    }
    if(!/^[LRFU]+$/.test(p.rule)){
      err.push(`Правило: только символы L/R/F/U, длина 1–${LIMITS.MAX_RULE_LEN}.`);
    }
    return { ok: err.length===0, errors: err };
  }

  /**
   * Применяем pending-параметры (если валидны).
   * Если параметров-изменений нет и нет spawn — ничего не трогаем (продолжим симуляцию без сброса).
   * @returns {boolean} удачно ли применили/пропустили
   */
  applyPending(){
    this.readInputsToPending();
    const v = this.validatePending();
    if(!v.ok){ alert('Некорректные параметры:\n• ' + v.errors.join('\n• ')); return false; }

    const { width, height, rule, ants, spawn } = this.pending;

    // Нет изменений и нет нового spawn → оставляем текущее состояние
    if(!spawn && !this.hasPendingChanges()){
      return true;
    }

    // Иначе — пересоздаём поле/муравьёв
    this.stop();
    this.sim.configure({ width, height, rule, ants, spawn: spawn || [] });
    this.pending.spawn = null; // spawn применили — больше его не повторяем

    // Фиксируем lastApplied
    this.lastApplied = { width, height, rule, ants };

    // Обновляем рендер/легенду
    this.renderer.resizeToGrid(width, height);
    this.fitContainerAspect(width, height);
    this.updateRuleLegend(rule);
    this.renderer.draw(this.sim.snapshot());
    this.updateStats();
    this.updateAntsIndicator();
    return true;
  }

  // ---------- Пресеты (заполняют поля и pending; НЕ применяют сразу) ----------

  renderPatterns(){
    const renderList = (container, provider) => {
      if(!container) return;
      container.innerHTML = '';
      for(const p of provider()){
        const card = document.createElement('div');
        card.className = 'pattern-card';

        const title = document.createElement('div');
        title.innerHTML = `<strong>${p.name}</strong> — правило <code>${p.rule}</code>`;

        const desc = document.createElement('div');
        desc.className = 'note';
        const antsInfo = p.spawn && p.spawn.length ? ` (мин. муравьёв: ${p.spawn.length}, выберете и нажмите старт)` : '';
        desc.textContent = (p.note || '') + antsInfo;

        const legend = document.createElement('div');
        legend.className = 'rule-legend';
        for(let i=0;i<p.rule.length;i++){
          const sw = document.createElement('span');
          sw.className = 'rule-chip';
          const color = this.stateColor(i);
          sw.innerHTML = `<span class="swatch" style="background:${color};"></span><span class="turn">${p.rule[i]}</span>`;
          legend.appendChild(sw);
        }

        const btn = document.createElement('button');
        btn.textContent = 'Загрузить';
        btn.addEventListener('click', ()=>{
          this.setMode('setup');
          const w = clamp(p.width  || LIMITS.DEF_W, LIMITS.MIN_W, LIMITS.MAX_W);
          const h = clamp(p.height || LIMITS.DEF_H, LIMITS.MIN_H, LIMITS.MAX_H);
          this.el.gridWidth.value  = w;
          this.el.gridHeight.value = h;
          this.el.ruleInput.value  = p.rule;
          const ants = (p.spawn && p.spawn.length) ? p.spawn.length : (p.ants || 1);
          this.el.antsCount.value  = clamp(ants, LIMITS.MIN_ANTS, LIMITS.MAX_ANTS);

          // pending обновляем и сохраняем spawn; будет применён при Старт/Работа
          this.readInputsToPending();
          this.pending.spawn = p.spawn ? [...p.spawn] : null;

          this.updateRuleLegend(p.rule);
        });

        card.appendChild(title);
        card.appendChild(legend);
        card.appendChild(desc);
        card.appendChild(btn);
        container.appendChild(card);
      }
    };

    const fallback = document.getElementById('patterns') || null;
    renderList(this.el.patternsLangton  || fallback, presetsLangton);
    renderList(this.el.patternsTurmites || fallback, presetsTurmites);
  }

  // ---------- Вспомогательные (цвета/легенда/режимы/цикл/адаптив) ----------

  /** Цвет «состояния» клетки i для чипа легенды (берём из CSS-палитры). */
  stateColor(i){
    const css = getComputedStyle(document.body);
    const palette = [
      css.getPropertyValue('--cell1').trim() || '#d6d6d6',
      css.getPropertyValue('--cell2').trim() || '#6aa9ff',
      css.getPropertyValue('--cell3').trim() || '#a879ff',
      '#5fd38d', '#ffb86b', '#f78fb3', '#ffd866', '#9aedfe'
    ];
    return palette[i % palette.length];
  }

  /** Перерисовать мини-легенду правил (цвет состояния → действие). */
  updateRuleLegend(rule){
    if(!this.el.ruleLegend) return;
    const cont = this.el.ruleLegend;
    cont.innerHTML='';
    for(let i=0;i<rule.length;i++){
      const chip = document.createElement('span');
      chip.className='rule-chip';
      const color = this.stateColor(i);
      chip.innerHTML = `<span class="swatch" style="background:${color};"></span><span class="turn">${rule[i]}</span>`;
      cont.appendChild(chip);
    }
  }

  /** Установить режим и визуально заблокировать/разблокировать поля настройки. */
  setMode(mode){
    if(mode !== 'setup' && mode !== 'run') return;
    this.mode = mode;
    this.el.modeSetupBtn?.setAttribute('aria-pressed', String(mode==='setup'));
    this.el.modeRunBtn?.setAttribute('aria-pressed', String(mode==='run'));

    const lock = (mode==='run');
    this.el.setupPanel?.classList.toggle('locked', lock);
    this.el.setupPanel?.setAttribute('aria-disabled', String(lock));
    this.el.setupPanel?.querySelectorAll('input,select,button').forEach(el=>{
      if(el.closest('.row')) return; // кнопки старт/пауза не трогаем
      el.disabled = lock;
    });
  }

  /** Запустить анимационный цикл. */
  start(){
    if(this.sim.running) return;
    this.setMode('run');
    this.sim.start();
    this._lastFrame = performance.now();

    const loop = (t)=>{
      if(!this.sim.running) return;
      const dt = (t - this._lastFrame) / 1000;
      this._lastFrame = t;

      this.sim.update(dt);
      this.renderer.draw(this.sim.snapshot());
      this.updateStats();

      // Простейший fps-счётчик
      this._fpsCounter.frames += 1;
      if(t - this._fpsCounter.last > 1000){
        const fps = this._fpsCounter.frames;
        this._fpsCounter.frames = 0;
        this._fpsCounter.last = t;
        this.el.fps.textContent = String(fps);
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  /** Пауза (без сброса состояния). */
  stop(){
    this.sim.stop();
    if(this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.setMode('setup');
  }

  /** Один шаг моделирования. */
  stepOnce(){
    const advanced = this.sim.step();
    if(advanced) this.renderer.draw(this.sim.snapshot());
    this.updateStats();
  }

  /** Сброс (без применения pending): пересоздаём текущую конфигурацию. */
  reset(){
    const w = this.sim.width, h = this.sim.height, rule = this.sim.ruleString, ants = this.sim.antsCount;
    this.stop();
    this.sim.configure({ width:w, height:h, rule, ants });
    this.renderer.resizeToGrid(this.sim.width, this.sim.height);
    this.fitContainerAspect(this.sim.width, this.sim.height);
    this.updateRuleLegend(rule);
    this.renderer.draw(this.sim.snapshot());
    this.updateStats();
    this.updateAntsIndicator();
  }

  /** Обновление блоков статистики (шаги/время). */
  updateStats(){
    this.el.stepCounter.textContent = String(this.sim.steps);
    this.el.timer.textContent = this.sim.formattedTime();
  }

  /** Индикатор числа муравьёв. */
  updateAntsIndicator(){
    this.el.antsIndicator.textContent = `${this.sim.antsCount}/${LIMITS.MAX_ANTS}`;
  }

  /** Короткая подсветка индикатора при переполнении лимита. */
  flashAntsIndicator(){
    const el = this.el.antsIndicator;
    const old = el.style.color;
    el.style.color = 'var(--danger)';
    setTimeout(()=> el.style.color = old, 300);
  }

  /**
   * Задание аспект-отношения контейнера поля.
   * Используем CSS `aspect-ratio`, а для старых браузеров — JS fallback.
   */
  fitContainerAspect(width, height){
    const container = document.querySelector('.canvas-wrap');
    if(!container) return;

    // Современный путь
    const ratio = `${width} / ${height}`;
    container.style.aspectRatio = ratio;

    // Fallback для старых Safari (14.x), где aspect-ratio может отсутствовать
    const supportsAR = (window.CSS && CSS.supports && CSS.supports('aspect-ratio: 1/1'));
    if(!supportsAR){
      const setH = () => {
        const w = container.clientWidth || 1;
        container.style.height = Math.round(w * (height/width)) + 'px';
      };
      setH();
      if(!this._arRO){
        this._arRO = new ResizeObserver(setH);
        this._arRO.observe(container);
        window.addEventListener('orientationchange', setH, { passive:true });
      }
    }
  }
}
