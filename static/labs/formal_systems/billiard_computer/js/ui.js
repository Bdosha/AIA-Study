class UI {
  constructor({physics, logic, renderer}){
    this.physics = physics; this.logic = logic; this.renderer = renderer;
    this.fps = 0; this._frameSub = null; this._logView = null;
    this.canvas = null; // Будет установлен при attachControls
    this.isFirstStart = true; // Отслеживание первого запуска симуляции
    this.isMac = /Mac/i.test(navigator.platform||'') || /Mac/i.test(navigator.userAgent||'');
    this._renameInput = null; // overlay input for renaming labels

    this._lastEventStamp = new Map(); // key -> lastTimestamp
    physics.onEvent((e)=> this.logEvent(e));
    
    logger.logSystem('UI module initialized', {
      physicsEngine: !!physics,
      logicLayer: !!logic,
      renderer: !!renderer
    });
  }

  attachControls(ids){
    this._controlIds = ids; // <------ ДОБАВИТЬ ЭТУ СТРОКУ ДЛЯ ГЛОБАЛЬНОЙ ДОСТУПНОСТИ
    const el = (k)=> ids[k];
    this._logView = el('logView');
    this.canvas = document.getElementById('scene');
    this._inputSpawnList = el('inputSpawnList');
    
    // Подключаем физический движок к логическому слою
    this.physics.setLogicLayer(this.logic);
    
    // Добавляем обработчики событий мыши для перетаскивания объектов
    this.setupMouseHandlers();
    
    logger.logSystem('UI controls attached', {
      controlsCount: Object.keys(ids).length,
      controls: Object.keys(ids),
      canvas: !!this.canvas
    });
    
    // Инициализируем чекбоксы входов (все включены по умолчанию)
    this.refreshInputCheckboxes({checkAll:true});
    
    const updateIndicators = ({fps})=>{
      logger.logDebug('[DEBUG INVESTIGATION] updateIndicators вызван: stepCount='+this.physics.stepCount+' time='+this.physics.time+' balls='+this.physics.balls.length);
      if (fps) {
        ids.fps.textContent = String(fps);
        this.fps = fps;
      }
      ids.stepCount.textContent = String(this.physics.stepCount);
      ids.simTime.textContent = this.physics.time.toFixed(2);
      this.renderer.renderOnce();
    };
    const isMac = /Mac/i.test(navigator.platform||'') || /Mac/i.test(navigator.userAgent||'');

    // Перепривязываем обработчик Старт на каждом attachControls (устойчиво после импорта/Debug)
    const prevStartHandler = this._handleStart;
    if (prevStartHandler) ids.startBtn?.removeEventListener('click', prevStartHandler);
    this._handleStart = ()=> {
      logger.logUI('Simulation started', ids.startBtn);
      if (this.isFirstStart) this.physics.balls.length = 0;
      // [DEBUG-PATCH] Log which checkboxes are selected and available inputs
      const selectedIds = Array.from(this._inputSpawnList?.querySelectorAll('input[type="checkbox"]:checked')||[]).map(cb=>cb.value);
      logger.logDebug('[DEBUG] Selected input IDs for spawn:', {selectedIds, allInputs:(this.logic.getInputs ? this.logic.getInputs() : [])});
      if (this.isFirstStart) {
        const spawnedBalls = selectedIds.length ? this.logic.spawnBallsAtInputs(selectedIds) : [];
        this.isFirstStart = false; 
        if (spawnedBalls.length > 0) {
          logger.logUI('Auto-spawned balls on first start', ids.startBtn, { count: spawnedBalls.length });
        } else {
          logger.logDebug('[DEBUG] No balls spawned on first start', {selectedIds, allInputs:(this.logic.getInputs ? this.logic.getInputs() : [])});
        }
      }
      this.physics.run(updateIndicators);
    };
    // На всякий случай гарантируем, что кнопка активна
    if (ids.startBtn) ids.startBtn.disabled = false;
    ids.startBtn?.addEventListener('click', ()=> { logger.logDebug('[DEBUG INVESTIGATION] Клик по старт.'); this._handleStart(); });
    ids.stopBtn.addEventListener('click', ()=> { logger.logDebug('[DEBUG INVESTIGATION] Клик по стоп.'); this.physics.pause(); });
    ids.stepBtn.addEventListener('click', ()=> { logger.logDebug('[DEBUG INVESTIGATION] Клик по шаг.'); this.physics.tick(); updateIndicators({}); });
    ids.resetBtn.addEventListener('click', ()=> { logger.logDebug('[DEBUG INVESTIGATION] Клик по сброс.'); this.physics.pause(); this.physics.reset(); this.physics.balls.length = 0; this.renderer.renderOnce(); this.isFirstStart = true; updateIndicators({}); });
    ids.speedRange.addEventListener('input', (e)=> { 
      const newSpeed = Number(e.target.value);
      logger.logUI('Speed changed', ids.speedRange, { newSpeed });
      this.physics.speedScale = newSpeed; 
    });

    // Для отображения значения скорости рядом с ползунком
    const speedValueEl = document.getElementById('speedValue');
    if (speedValueEl && ids.speedRange) {
      speedValueEl.textContent = Number(ids.speedRange.value).toFixed(1);
      ids.speedRange.addEventListener('input', (e)=> { 
        const newSpeed = Number(ids.speedRange.value);
        speedValueEl.textContent = newSpeed.toFixed(1);
      });
    }

    ids.presetSelect.addEventListener('change', ()=> { 
      const preset = ids.presetSelect.value;
      logger.logUI('Preset changed', ids.presetSelect, { preset });
      this.physics.pause(); // Останавливаем симуляцию перед загрузкой
      this.logic.loadPreset(preset); 
      this.physics.pause(); // Останавливаем симуляцию после загрузки для гарантии
      this.isFirstStart = true; // Сбрасываем флаг первого запуска при смене пресета
      this._logView.textContent = ''; // Очищаем логи
      // Жестко обнуляем индикаторы без запуска цикла обновления
      ids.stepCount.textContent = '0';
      ids.simTime.textContent = '0.00';
      ids.fps.textContent = '0';
      this.refreshInputCheckboxes({checkAll:true});
      this.renderer.renderOnce();
      this.logLine(`preset: ${preset}`); 
    });

    // === ЦИКЛ ПРОВЕРОК ===
    this._cycleState = { running: false, abort: false };
    ids.cycleBtn?.addEventListener('click', async ()=>{
      if (!this._cycleState.running) {
        this._cycleState.running = true; this._cycleState.abort = false;
        ids.cycleBtn.textContent = 'Остановить цикл';
        ids.cycleBtn.classList.add('danger');
        logger.logUI('Checks cycle started', ids.cycleBtn);
        try {
          await this.runChecksCycle(updateIndicators);
        } finally {
          this._cycleState.running = false; this._cycleState.abort = false;
          ids.cycleBtn.textContent = 'Цикл проверок';
          ids.cycleBtn.classList.remove('danger');
          logger.logUI('Checks cycle finished', ids.cycleBtn);
        }
      } else {
        this._cycleState.abort = true;
        logger.logUI('Checks cycle abort requested', ids.cycleBtn);
      }
    });

    // Переводим кнопку «Стена» в режим рисования линии (drag to create)
    ids.addWallBtn.addEventListener('click', ()=> { 
      logger.logUI('Add wall mode activated', ids.addWallBtn);
      this._wallDrawMode = true;
      this._wallDrawStart = null; // {x,y}
      this._wallDragActive = false;
    });
    // ===== ДОБАВИТЬ STATE для preview-вставки (UI):
    this._pendingPreview = null; // {type, x, y, width, height}

    // --- Добавить обработчики для canvas ---
    // Получаем координаты мыши относительно канваса (универсально)
    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };
    this._getMousePos = getMousePos; // нужно для глобального доступа

    // Флаг: хотим показать превью (потенциально активен вне canvas)
    this._wantPreviewType = null; // 'input'|'output'|null

    this.canvas.addEventListener('mouseenter', (e)=>{
      this._isCursorOnCanvas = true;
      // Если хотим активировать превью — делаем его
      if (this._wantPreviewType && !this._pendingPreview) {
        this._pendingPreview = {type: this._wantPreviewType, width:60, height:60, x:0, y:0, label:(this._wantPreviewType==='input'?'Вход':'Выход')};
        this.renderer.renderOnce();
      }
    });
    this.canvas.addEventListener('mouseleave', (e)=>{
      this._isCursorOnCanvas = false;
      // Выход с Canvas — прячем превью
      if (this._pendingPreview) {
        this._pendingPreview = null;
        this.renderer.renderOnce();
      }
    });
    this.canvas.addEventListener('mousemove', (e)=>{
      if (this._pendingPreview && this._isCursorOnCanvas) {
        const pos = getMousePos(e);
        this._pendingPreview.x = pos.x;
        this._pendingPreview.y = pos.y;
        this.renderer.renderOnce();
      }
    });
    // ЛКМ: подтверждение вставки превью-объекта (по canvas)
    this.canvas.addEventListener('mousedown', (e)=>{
      if (this._pendingPreview && e.button === 0) {
        e.preventDefault();
        const {type, x, y, width, height, label} = this._pendingPreview;
        // Теперь x и y — центр! Вставлять нужно центрированно.
        const created = this.logic.addSceneObject(type, x - width/2, y - height/2, width, height, {label});
        // ВАЖНО: при добавлении "входа" через превью нужно обновить UI-список входов,
        // иначе новый вход может не участвовать в спавне шариков (чекбоксы не знают о нём).
        if (type === 'input') {
          this.refreshInputCheckboxes({ ensureChecked: new Set([created.id]) });
        }
        this._pendingPreview = null;
        this._wantPreviewType = null;
        this.renderer.renderOnce();
      }
    });
    this.canvas.addEventListener('contextmenu', (e)=>{ if (this._pendingPreview) e.preventDefault(); });

    // Универсальный хелпер для старой каскадной вставки
    function placeInputCascade() {
      const inputs = this.logic.sceneObjects.filter(o => o.type === 'input');
      const n = inputs.length;
      const dx = 28, dy = 22;
      const baseX = Math.round(this.physics.bounds.width * 0.42);
      const baseY = Math.round(this.physics.bounds.height * 0.38);
      const obj = this.logic.addSceneObject('input', baseX + n * dx, baseY + n * dy, 60, 60, {label: 'Вход'});
      this.refreshInputCheckboxes({ensureChecked: new Set([obj.id])});
      this.renderer.renderOnce();
    }
    function placeOutputCascade() {
      const outputs = this.logic.sceneObjects.filter(o => o.type === 'output');
      const n = outputs.length;
      const dx = 28, dy = 22;
      const baseX = Math.round(this.physics.bounds.width * 0.58);
      const baseY = Math.round(this.physics.bounds.height * 0.38);
      const obj = this.logic.addSceneObject('output', baseX + n * dx, baseY + n * dy, 60, 60, {label: 'Выход'});
      this.refreshInputCheckboxes({checkAll:true}); // Добавлено обновление чекбоксов
      this.renderer.renderOnce();
    }

    // === Модификация кнопок input/output ===
    ids.addInputBtn.addEventListener('click', ()=> { 
      logger.logUI('Add input clicked', ids.addInputBtn);
      if (this._isCursorOnCanvas) {
        this._wantPreviewType = 'input';
        this._pendingPreview = {type:'input', width:60, height:60, x:0, y:0, label:'Вход'};
        this.renderer.renderOnce();
      } else {
        this._wantPreviewType = null;
        placeInputCascade.call(this);
      }
    });
    ids.addOutputBtn.addEventListener('click', ()=> { 
      logger.logUI('Add output clicked', ids.addOutputBtn);
      if (this._isCursorOnCanvas) {
        this._wantPreviewType = 'output';
        this._pendingPreview = {type:'output', width:60, height:60, x:0, y:0, label:'Выход'};
        this.renderer.renderOnce();
      } else {
        this._wantPreviewType = null;
        placeOutputCascade.call(this);
      }
    });

    ids.spawnBallsBtn.addEventListener('click', ()=> { 
      logger.logUI('Spawn balls clicked', ids.spawnBallsBtn);
      this.physics.balls.length = 0;
      const selectedIds = Array.from(this._inputSpawnList?.querySelectorAll('input[type="checkbox"]:checked')||[]).map(cb=>cb.value);
      const spawnedBalls = selectedIds.length ? this.logic.spawnBallsAtInputs(selectedIds) : [];
      this.renderer.renderOnce();
      if (spawnedBalls.length > 0) {
        this.logLine(`создано шариков: ${spawnedBalls.length}`);
      } else {
        this.logLine('нет выбранных входов для создания шариков');
      }
    });

    // Удаление всех шаров со сцены
    ids.clearBallsBtn.addEventListener('click', ()=>{
      const before = this.physics.balls.length;
      this.physics.balls.length = 0;
      this.renderer.renderOnce();
      this.logLine(`удалено шаров: ${before}`);
      logger.logUI('All balls cleared', ids.clearBallsBtn, { removed: before });
    });

    // Переименование выбранного объекта (вход/выход)
    if (this._objectNameInput){
      this._objectNameInput.addEventListener('change', ()=>{
        const obj = this.logic.selectedObject;
        if (obj && (obj.type === 'input' || obj.type === 'output')){
          const prev = obj.data?.label;
          this.logic.renameObject(obj.id, this._objectNameInput.value);
          this.refreshInputSelect();
          this.renderer.renderOnce();
          logger.logUI('Object renamed via input', this._objectNameInput, { id: obj.id, from: prev, to: obj.data.label });
        }
      });
    }

    ids.clearLogsBtn.addEventListener('click', ()=> { 
      logger.logUI('Clear logs clicked', ids.clearLogsBtn);
      this._logView.textContent=''; 
    });

    // Hotkeys
    window.addEventListener('keydown', (ev)=>{
      const isCmdOrCtrl = ev.metaKey || ev.ctrlKey;
      if (isCmdOrCtrl && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        const undone = this.logic.undo?.();
        if (undone) {
          logger.logUI('Undo (Ctrl/Cmd+Z)', null);
          this.renderer.renderOnce();
        }
        return;
      }
    // Group rotation via arrows when selection exists
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){
      const selection = this.logic.getSelection?.() || [];
      if (selection.length){
        const delta = ev.key==='ArrowLeft' ? -Math.PI/12 : ev.key==='ArrowRight' ? Math.PI/12 : ev.key==='ArrowUp' ? -Math.PI/6 : Math.PI/6;
        this.logic.pushUndo?.();
        for(const obj of selection){
          if (obj.type === 'wall' || obj.type === 'input'){
            obj.rotation = (obj.rotation || 0) + delta;
          }
        }
        this.renderer.renderOnce();
        ev.preventDefault();
        return;
      }
    }
    // Delete selection via Delete/Backspace
    if (ev.key === 'Delete' || ev.key === 'Backspace'){
      const selection = this.logic.getSelection?.() || [];
      if (selection.length){
        this.logic.pushUndo?.();
        let inputDeleted = false;
        for(const obj of selection){ 
          if(obj.type === 'input') inputDeleted = true;
          this.logic.removeSceneObject(obj.id); 
        }
        this.renderer.renderOnce();
        if(inputDeleted) this.refreshInputCheckboxes({checkAll:true}); // Добавлено обновление чекбоксов
        logger.logUI('Delete selection', null, { count: selection.length });
        ev.preventDefault();
        return;
      }
    }
      // ВСЕ горячие клавиши анализируем только по event.code
      // + и = (Equal) всегда увеличивают скорость (на любых раскладах и платформах)
      if (ev.code === 'Equal') { // и просто =, и Shift+Equal, и на русской
        logger.logUI('Hotkey: increase speed', null, { code: 'Equal', shift: ev.shiftKey });
        ids.speedRange.stepUp(); 
        ids.speedRange.dispatchEvent(new Event('input')); 
        if (speedValueEl) speedValueEl.textContent = Number(ids.speedRange.value).toFixed(1);
        return;
      }
      // - (Minus) уменьшает скорость
      if (ev.code === 'Minus') {
        logger.logUI('Hotkey: decrease speed', null, { code: 'Minus' });
        ids.speedRange.stepDown(); 
        ids.speedRange.dispatchEvent(new Event('input'));
        if (speedValueEl) speedValueEl.textContent = Number(ids.speedRange.value).toFixed(1);
        return;
      }
      // S (англ.) и Ы (рус.) — шаг вперёд
      if (ev.code === 'KeyS') {
        logger.logUI('Hotkey: simulation step', null, { code: 'KeyS' });
        this.physics.tick(); 
        updateIndicators({}); 
        return;
      }
      // R (англ.) и К (рус.) — сброс симуляции
      if (ev.code === 'KeyR' || ev.key === 'к' || ev.key === 'К') {
        logger.logUI('Hotkey: reset simulation', null, { code: ev.code, key: ev.key });
        if (ids.resetBtn) {
          ids.resetBtn.click();
        } else {
          this.physics.reset();
          updateIndicators && updateIndicators({});
        }
        ev.preventDefault();
        return;
      }
      // Пробел — пауза/старт (то же для всех раскладок)
      if (ev.code === 'Space') {
        ev.preventDefault(); 
        if (this.physics.running) {
          logger.logUI('Hotkey: pause simulation', null, { code: 'Space' });
          this.physics.pause(); 
        } else {
          logger.logUI('Hotkey: start simulation', null, { code: 'Space' });
          this._handleStart(); // <-- теперь одинаково с кнопкой Старт (и мячи тоже спавнятся)
        }
        return;
      }
      // W (англ.) и Ц (рус.) — создать стену
      if (ev.code === 'KeyW') {
        logger.logUI('Hotkey: add wall', null, { code: 'KeyW' });
        ids.addWallBtn?.click();
        return;
      }
      // I (англ.) и Ш (рус.) — создать вход (теперь напрямую с preview)
      if (ev.code === 'KeyI') {
        logger.logUI('Hotkey: add input', null, { code: 'KeyI' });
        // Гарантируем абсолютно одинаковое поведение с кнопкой (index.html: addInputBtn)
        ids.addInputBtn?.click();
        return;
      }
      // O (англ.) и Щ (рус.) — создать выход (теперь напрямую с preview)
      if (ev.code === 'KeyO') {
        logger.logUI('Hotkey: add output', null, { code: 'KeyO' });
        // Гарантируем абсолютно одинаковое поведение с кнопкой (index.html: addOutputBtn)
        ids.addOutputBtn?.click();
        return;
      }
      // Остальные хоткеи аналогично реализовать через ev.code...
      // Single-object arrow rotation kept implicitly handled by group branch when no selection
    });

    // --- DEBUG TOGGLE BUTTON ---
    const debugBtn = document.getElementById('debugToggleBtn');
    const logsPanel = document.querySelector('.panel.logs');
    const updateDebugUI = () => {
      const enabled = !!window.PHYS_DEBUG;
      debugBtn.textContent = enabled ? 'Вкл' : 'Выкл';
      debugBtn.style.color = enabled ? 'limegreen' : '';
      debugBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      if (logsPanel) logsPanel.style.display = enabled ? '' : 'none';
    }
    if (!this._handleDebugToggle) {
      this._handleDebugToggle = () => {
        window.PHYS_DEBUG = !window.PHYS_DEBUG;
        if (typeof this.physics.setDebug === 'function') this.physics.setDebug(window.PHYS_DEBUG);
        updateDebugUI();
        logger.logDebug('Debug-режим переключен пользователем', {enabled: window.PHYS_DEBUG});
        // === [PATCH: RESET UI STATE ON DEBUG TOGGLE] ===
        this.physics.pause();
        this.physics.reset();
        this.isFirstStart = true;
        if (this._logView) this._logView.textContent = '';
        if (this._controlIds) {
          if (this._controlIds.stepCount) this._controlIds.stepCount.textContent = '0';
          if (this._controlIds.simTime) this._controlIds.simTime.textContent = '0.00';
          if (this._controlIds.fps) this._controlIds.fps.textContent = '0';
        }
        // [DEBUG-PATCH] Force refresh checkboxes for all inputs again (timeout for DOM update)
        this.refreshInputCheckboxes && this.refreshInputCheckboxes({checkAll:true});
        setTimeout(() => this.refreshInputCheckboxes && this.refreshInputCheckboxes({checkAll:true}), 10);
        this.renderer && this.renderer.renderOnce();
        // === [PATCH: ENSURE START BUTTON ACTIVE AFTER DEBUG TOGGLE] ===
        if (this._controlIds && this._controlIds.startBtn) {
          // снять возможные предыдущие обработчики и перепривязать актуальный
          if (this._handleStart) this._controlIds.startBtn.removeEventListener('click', this._handleStart);
          this._controlIds.startBtn.disabled = false;
          this._controlIds.startBtn.addEventListener('click', this._handleStart);
        }
      };
    }
    // Снимаем старый обработчик перед добавлением (fix для repeat-attach)
    debugBtn?.removeEventListener('click', this._handleDebugToggle);
    if (debugBtn) {
      debugBtn.addEventListener('click', this._handleDebugToggle);
      updateDebugUI();
    }

    // Resize once for proper bounds
    setTimeout(()=> this.renderer.resize(), 0);

    // Обновляем панель логов уже при инициализации
    if (logsPanel) logsPanel.style.display = window.PHYS_DEBUG ? '' : 'none';

    // ESC, Delete — отмена preview
    document.addEventListener('keydown', (e) => {
      if (this._pendingPreview && (e.code === 'Escape' || e.code === 'Delete' || e.key === 'Esc')) {
        this._pendingPreview = null;
        this._wantPreviewType = null;
        this.renderer.renderOnce();
      }
    });
    // Клик вне canvas — отмена превью
    document.body.addEventListener('mousedown', (e)=>{
      if (this._pendingPreview) {
        // если это НЕ клик ЛКМ по canvas, отменяем превью
        if (!(e.target === this.canvas && e.button === 0)) {
          this._pendingPreview = null;
          this._wantPreviewType = null;
          this.renderer.renderOnce();
        }
      }
    });
  }

  logLine(text){ if (this._logView){ const ts = this.physics.time.toFixed(3); this._logView.textContent += `[${ts}] ${text}\n`; this._logView.scrollTop = this._logView.scrollHeight; } }
  logEvent(e){
    // Простая дедупликация одинаковых событий в окне 150мс по ключу (kind/type/ball/object)
    const key = e.kind === 'sceneObject' ? `${e.kind}:${e.type}:${e.ball}:${e.object}` : e.kind === 'wall' ? `${e.kind}:${e.axis}:${e.ball}` : e.kind === 'ball' ? `${e.kind}:${e.a}:${e.b}` : `${e.kind}`;
    const nowT = this.physics.time; // используем сим-время
    const lastT = this._lastEventStamp.get(key) ?? -Infinity;
    if (nowT - lastT < 0.15) { return; }
    this._lastEventStamp.set(key, nowT);
    if (e.kind === 'wall') {
      this.logLine(`столкновение со стенкой (${e.axis}) · ${e.ball}`);
      logger.logPhysics('Wall collision', {
        ball: e.ball,
        axis: e.axis,
        time: e.t
      });
    }
    else if (e.kind === 'ball') {
      this.logLine(`столкновение шар–шар · ${e.a} ⟂ ${e.b}`);
      logger.logPhysics('Ball collision', {
        ballA: e.a,
        ballB: e.b,
        time: e.t
      });
    }
    else if (e.kind === 'sceneObject') {
      if (e.type === 'wall_bounce') {
        this.logLine(`отскок от стены · ${e.ball} ⟂ ${e.object}`);
        logger.logPhysics('Scene object collision', {
          ball: e.ball,
          object: e.object,
          type: e.type,
          time: e.t
        });
      }
      else if (e.type === 'output_capture') {
        const name = e.objectLabel ? ` (${e.objectLabel})` : '';
        this.logLine(`шарик остановлен в выходе${name} · ${e.ball} → ${e.object}`);
        logger.logPhysics('Scene object interaction', {
          ball: e.ball,
          object: e.object,
          type: e.type,
          objectLabel: e.objectLabel,
          time: e.t
        });
      }
      else if (e.type === 'input_pass') {
        const name = e.objectLabel ? ` (${e.objectLabel})` : '';
        this.logLine(`проход через вход${name} · ${e.ball} → ${e.object}`);
        logger.logPhysics('Scene object interaction', {
          ball: e.ball,
          object: e.object,
          type: e.type,
          objectLabel: e.objectLabel,
          time: e.t
        });
      }
    }
  }

  // === Overlay уведомления ===
  _ensureOverlay(){
    if (this._overlay) return this._overlay;
    const el = document.createElement('div');
    el.id = 'bbm-overlay';
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.right = '0';
    el.style.bottom = '0';
    el.style.display = 'none';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.zIndex = '1000';
    el.style.background = 'rgba(0,0,0,0.35)';
    const inner = document.createElement('div');
    inner.style.background = 'var(--surface)';
    inner.style.color = 'var(--text)';
    inner.style.padding = '16px 20px';
    inner.style.borderRadius = '12px';
    inner.style.boxShadow = 'var(--shadow)';
    inner.style.fontSize = '16px';
    inner.style.maxWidth = '80vw';
    inner.style.textAlign = 'center';
    el.appendChild(inner);
    document.body.appendChild(el);
    this._overlay = el; this._overlayInner = inner;
    return el;
  }
  async showOverlay(message, ms){
    this._ensureOverlay();
    this._overlayInner.textContent = message;
    this._overlay.style.display = 'flex';
    await new Promise(res=> setTimeout(res, ms));
    this._overlay.style.display = 'none';
  }

  // === Цикл проверок ===
  async runChecksCycle(updateIndicators){
    this.physics.pause();
    this.physics.reset();
    this.renderer.renderOnce();
    const inputs = this.logic.getInputs?.() || [];
    if (inputs.length === 0) { await this.showOverlay('Нет входов для проверки', 1200); return; }
    const in1 = inputs[0];
    const in2 = inputs[1] || null;
    const combos = [];
    if (in1) combos.push([in1]);
    if (in2) combos.push([in2]);
    if (in1 && in2) combos.push([in1, in2]);
    if (!combos.length) { await this.showOverlay('Недостаточно входов для цикла', 1200); return; }

    const capturedOutputs = new Set();
    const unsub = this.physics.onEvent((ev)=>{
      if (ev.kind === 'sceneObject' && ev.type === 'output_capture'){
        const label = ev.objectLabel || '';
        if (label.toLowerCase() !== 'trash') capturedOutputs.add(label || ev.object);
      }
    });
    const ids = this._controlIds || {};
    try{
      for (const combo of combos){
        if (this._cycleState?.abort) break;
        const comboIds = new Set(combo.map(i=>i.id));
        if (this.refreshInputCheckboxes) {
          this.refreshInputCheckboxes({checkAll:false, ensureChecked: comboIds, forceExact: true});
        }
        // Ждем завершения изменения DOM-галочек
        await new Promise(res=>setTimeout(res,0));
        const names = combo.map(i=> i.data?.label || 'Вход').join(' + ');
        await this.showOverlay(`Старт: ${names}`, 2000);
        if (this._cycleState?.abort) break;
        this.physics.pause();
        this.physics.reset();
        if (ids.spawnBallsBtn) ids.spawnBallsBtn.click();
        this.renderer.renderOnce();
        this.physics.run(updateIndicators);
        await this.waitUntilNoBalls(30_000);
        this.physics.pause();
        if (this._cycleState?.abort) {
          if (ids.resetBtn) ids.resetBtn.click();
          if (ids.clearBallsBtn) ids.clearBallsBtn.click();
          break;
        }
        const list = Array.from(capturedOutputs).filter(s=> String(s).toLowerCase() !== 'trash');
        const text = list.length ? `Выходы: ${list.join(', ')}` : 'Выходы: —';
        await this.showOverlay(text, 3000);
        capturedOutputs.clear();
      }
    } finally {
      unsub?.();
      this.physics.pause();
      this.renderer.renderOnce();
      // ВСЕГДА по завершению цикла (или если он был abort) — жмем reset и clearBalls
      if (ids.resetBtn) ids.resetBtn.click();
      if (ids.clearBallsBtn) ids.clearBallsBtn.click();
    }
  }

  waitUntilNoBalls(timeoutMs){
    return new Promise((resolve)=>{
      const start = performance.now();
      const check = ()=>{
        if (this._cycleState?.abort) return resolve();
        if (this.physics.balls.length === 0) return resolve();
        if (performance.now() - start > timeoutMs) return resolve();
        setTimeout(check, 100);
      };
      check();
    });
  }

  exportJSON(){
    logger.logSystem('Scene export started', {
      ballsCount: this.physics.balls.length,
      gatesCount: this.logic.gates.length,
      sceneObjectsCount: this.logic.sceneObjects.length
    });
    
    const data = {
      bounds: this.physics.bounds,
      balls: this.physics.balls.map(({id,x,y,vx,vy,r,m,color})=>({id,x,y,vx,vy,r,m,color})),
      gates: this.logic.gates,
      sceneObjects: this.logic.sceneObjects,
      timing: { step: this.physics.dt },
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    downloadBlob(blob, `bbm_scene_${Date.now()}.json`);
    
    logger.logSystem('Scene export completed', { filename: `bbm_scene_${Date.now()}.json` });
  }

  importJSON(){
    logger.logSystem('Scene import started');
    const input = document.getElementById('fileInput');
    input.onchange = async () => {
      const file = input.files?.[0]; 
      if (!file) return; 
      
      logger.logSystem('File selected for import', {
        filename: file.name,
        size: file.size,
        type: file.type
      });
      
      const text = await file.text();
      try{
        const json = JSON.parse(text);
        // Переводим пресет-селектор в режим "Своя версия" перед импортом
        const ids = this._controlIds || {};
        if (ids.presetSelect) {
          ids.presetSelect.value = 'custom';
        }
        // Останавливаем симуляцию перед изменением сцены
        this.physics.pause();
        this.logic.clear();
        this.physics.setBounds(json.bounds?.width||1280, json.bounds?.height||720);
        // Не импортируем шары - они создаются только в центрах объектов "Вход"
        // for(const b of json.balls||[]) this.physics.addBall(b);
        // Если в JSON объекты стен заданы сегментами (x1,y1,x2,y2) — конвертируем их
        for(const w of json.sceneObjects||[]) {
          if (w && (w.x1 !== undefined || w.y1 !== undefined) && (w.x2 !== undefined || w.y2 !== undefined)) {
            const dx = (w.x2 ?? w.x1) - w.x1;
            const dy = (w.y2 ?? w.y1) - w.y1;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const height = 10;
            const centerX = (w.x1 + (w.x2 ?? w.x1)) / 2;
            const centerY = (w.y1 + (w.y2 ?? w.y1)) / 2;
            const wallObj = this.logic.addSceneObject('wall', centerX - length/2, centerY - height/2, (length || 10), height, {});
            wallObj.rotation = angle;
          }
        }
        this.logic.gates = json.gates||[];
        
        // Импортируем объекты сцены
        for(const obj of json.sceneObjects||[]) {
          if (obj && obj.type && obj.x !== undefined && obj.y !== undefined && obj.width !== undefined && obj.height !== undefined) {
            const newObj = this.logic.addSceneObject(obj.type, obj.x, obj.y, obj.width, obj.height, obj.data);
            // Восстанавливаем поворот если он был сохранен
            if (obj.rotation !== undefined) {
              newObj.rotation = obj.rotation;
            }
          }
        }
        
        this.physics.reset(); 
        this.isFirstStart = true; // Сбрасываем флаг первого запуска при импорте
        this.renderer.renderOnce(); 
        this.refreshInputCheckboxes({checkAll:true}); 
        this.isFirstStart = true;
        if (this._controlIds) this.attachControls(this._controlIds); // повторная активация кнопок
        // Гарантируем работоспособность кнопки Старт после импорта
        if ((this._controlIds||{}).startBtn) (this._controlIds.startBtn.disabled = false);
        this.logLine('импортирована сцена JSON');
        
        logger.logSystem('Scene import completed', {
          ballsImported: json.balls?.length || 0,
          gatesImported: json.gates?.length || 0,
          sceneObjectsImported: json.sceneObjects?.length || 0
        });
      }catch(err){ 
        logger.logError(err, { action: 'importJSON', filename: file.name });
        alert('Не удалось загрузить JSON: ' + err.message); 
      }
      input.value = '';
    };
    input.click();
  }

  exportCSV(){
    logger.logSystem('CSV export started', {
      ballsCount: this.physics.balls.length
    });
    
    // Minimal CSV example: current state snapshot
    const lines = ['time,ball_id,x,y,vx,vy,event_tag'];
    const t = this.physics.time.toFixed(3);
    for(const b of this.physics.balls){ lines.push(`${t},${b.id},${b.x.toFixed(2)},${b.y.toFixed(2)},${b.vx.toFixed(2)},${b.vy.toFixed(2)},snapshot`); }
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    downloadBlob(blob, `bbm_log_${Date.now()}.csv`);
    
    logger.logSystem('CSV export completed', { 
      filename: `bbm_log_${Date.now()}.csv`,
      rowsCount: lines.length - 1
    });
  }

  setupMouseHandlers() {
    if (!this.canvas) return;

    // Получаем координаты мыши относительно канваса
    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    // Начало перетаскивания / начало рисования стены
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);

      // Режим рисования стены
      if (this._wallDrawMode) {
        this._wallDrawStart = { x: pos.x, y: pos.y };
        this._wallDragActive = true;
        // начальный preview
        this.renderer.setWallPreview({ x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0 });
        this.renderer.renderOnce();
        e.preventDefault();
        return;
      }
      
      // Сначала проверяем клик по кнопкам выделенного объекта (если есть)
      if (this.logic.selectedObject) {
        const selectedObj = this.logic.selectedObject;
        
        // Проверка кнопки поворота
        if (this.logic.isRotationButtonHit(pos.x, pos.y, selectedObj)) {
          const selection = this.logic.getSelection?.() || [];
          if (selection.length > 1){
            // Групповой поворот
            this.logic.pushUndo?.();
            this.isRotatingGroup = true;
            const centerX = selectedObj.x + selectedObj.width/2;
            const centerY = selectedObj.y + selectedObj.height/2;
            this.groupRotationStartAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
            this.groupStartRotations = new Map();
            for(const o of selection){ this.groupStartRotations.set(o, o.rotation||0); }
            this.canvas.style.cursor = 'crosshair';
          } else if (selectedObj.type === 'wall') {
            // Одиночный поворот перетаскиванием
            this.isRotating = true;
            this.rotationStartAngle = Math.atan2(pos.y - (selectedObj.y + selectedObj.height/2), pos.x - (selectedObj.x + selectedObj.width/2)) - (selectedObj.rotation||0);
            this.canvas.style.cursor = 'crosshair';
          } else if (selectedObj.type === 'input') {
            // Поворот входа на 90 градусов по клику (выход не поворачивается)
            selectedObj.rotation = (selectedObj.rotation || 0) + Math.PI / 2;
            this.renderer.renderOnce();
            logger.logUI('IO object rotated 90°', null, { objectId: selectedObj.id, objectType: selectedObj.type });
          }
          e.preventDefault();
          return;
        }
        
        // Проверка кнопки масштабирования (только для стен)
        if (selectedObj.type === 'wall' && this.logic.isScaleButtonHit(pos.x, pos.y, selectedObj)) {
          const selection = this.logic.getSelection?.() || [];
          if (selection.length > 1){
            // Групповое масштабирование
            this.logic.pushUndo?.();
            this.isScalingGroup = true;
            const centerX = selectedObj.x + selectedObj.width/2;
            const centerY = selectedObj.y + selectedObj.height/2;
            this.groupScaleStartDist = Math.hypot(pos.x - centerX, pos.y - centerY);
            this.groupStartSizes = new Map();
            for(const o of selection){ this.groupStartSizes.set(o, { width: o.width, height: o.height }); }
            this.canvas.style.cursor = 'nwse-resize';
          } else {
            this.isScaling = true;
            this.scaleStartPos = { x: pos.x, y: pos.y };
            this.scaleStartSize = { width: selectedObj.width, height: selectedObj.height };
            this.canvas.style.cursor = 'nwse-resize';
          }
          e.preventDefault();
          return;
        }
      }
      
      // Переименование по клику на подпись, если объект уже выбран
      if (this.logic.selectedObject) {
        const so = this.logic.selectedObject;
        if ((so.type === 'input' || so.type === 'output') && this.isLabelHit(so, pos.x, pos.y)) {
          this.showRenameInput(so);
          e.preventDefault();
          return;
        }
      }
      
      // Теперь проверяем клик по объектам
      const obj = this.logic.getObjectAt(pos.x, pos.y);
      
      if (obj) {
        // Поддержка мультивыделения: Cmd (Mac) / Ctrl (Win) или Shift
        const multiKey = (this.isMac ? e.metaKey : e.ctrlKey) || e.shiftKey;
        if (multiKey) {
          this.logic.toggleSelection(obj);
          this.renderer.renderOnce();
          e.preventDefault();
          return;
        }
        // Обычное перетаскивание (для группы или одиночного)
        this.logic.startDrag(obj, pos.x, pos.y);
        this.canvas.style.cursor = 'grabbing';
        // Нет отдельного поля имени — переименуем по dblclick/click по подписи
        this.renderer.renderOnce(); // Перерисовываем для отображения кнопок
        e.preventDefault();
      } else {
        // Клик по пустому месту: без модификатора — снятие выделения
        const multiKey = (this.isMac ? e.metaKey : e.ctrlKey) || e.shiftKey;
        if (!multiKey) this.logic.selectObject(null);
        this.renderer.renderOnce();
      }
    });

    // Переименование по двойному клику на подпись (без необходимости выделения)
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getMousePos(e);
      // Найдем первый объект, подпись которого под курсором
      for (const obj of this.logic.sceneObjects) {
        if ((obj.type === 'input' || obj.type === 'output') && this.isLabelHit(obj, pos.x, pos.y)) {
          this.showRenameInput(obj);
          e.preventDefault();
          return;
        }
      }
    });

    // Перетаскивание / динамический preview стены
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getMousePos(e);
      
      // Рисование стены — обновляем превью
      if (this._wallDragActive && this._wallDrawStart) {
        const sx = this._wallDrawStart.x, sy = this._wallDrawStart.y;
        const dx = pos.x - sx, dy = pos.y - sy;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const width = Math.max(4, length);
        const height = 10; // толщина стены
        const x = sx + Math.cos(angle) * (length/2) - width/2; // центрирование потом вращением
        const y = sy + Math.sin(angle) * (length/2) - height/2;
        this.renderer.setWallPreview({ x, y, width, height, rotation: angle });
        this.renderer.renderOnce();
        return;
      }

      if (this.logic.isDragging) {
        this.logic.updateDrag(pos.x, pos.y);
        this.renderer.renderOnce();
      } else if (this.isRotatingGroup && this.logic.getSelection?.()?.length) {
        // Групповой поворот
        const obj = this.logic.selectedObject;
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
        const delta = currentAngle - (this.groupRotationStartAngle||0);
        for(const o of this.logic.getSelection()){
          if (o.type === 'wall' || o.type === 'input'){
            const start = this.groupStartRotations?.get(o) || 0;
            o.rotation = start + delta;
          }
        }
        this.renderer.renderOnce();
      } else if (this.isRotating && this.logic.selectedObject) {
        // Поворот объекта
        const obj = this.logic.selectedObject;
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
        const newRotation = currentAngle - this.rotationStartAngle;
        obj.rotation = newRotation;
        this.renderer.renderOnce();
      } else if (this.isScalingGroup && this.logic.getSelection?.()?.length) {
        // Групповое масштабирование
        const obj = this.logic.selectedObject;
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const currentDist = Math.hypot(pos.x - centerX, pos.y - centerY);
        const scaleFactor = Math.max(0.05, currentDist / Math.max(0.0001, this.groupScaleStartDist||1));
        for(const o of this.logic.getSelection()){
          const start = this.groupStartSizes?.get(o);
          if (!start) continue;
          const oCenterX = o.x + o.width/2;
          const oCenterY = o.y + o.height/2;
          o.width = Math.max(10, Math.min(800, start.width * scaleFactor));
          o.height = Math.max(10, Math.min(800, start.height * scaleFactor));
          o.x = oCenterX - o.width/2;
          o.y = oCenterY - o.height/2;
        }
        this.renderer.renderOnce();
      } else if (this.isScaling && this.logic.selectedObject) {
        // Масштабирование объекта
        const obj = this.logic.selectedObject;
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        
        // Вычисляем расстояние от центра до текущей позиции мыши
        const currentDist = Math.hypot(pos.x - centerX, pos.y - centerY);
        const startDist = Math.hypot(this.scaleStartPos.x - centerX, this.scaleStartPos.y - centerY);
        
        // Вычисляем коэффициент масштабирования
        const scaleFactor = currentDist / startDist;
        
        // Применяем масштабирование относительно начального размера
        obj.width = Math.max(10, Math.min(800, this.scaleStartSize.width * scaleFactor));
        obj.height = Math.max(10, Math.min(800, this.scaleStartSize.height * scaleFactor));
        
        // Центрируем объект обратно
        obj.x = centerX - obj.width / 2;
        obj.y = centerY - obj.height / 2;
        
        this.renderer.renderOnce();
      } else {
        // Сначала проверяем кнопки выделенного объекта
        if (this.logic.selectedObject) {
          const selectedObj = this.logic.selectedObject;
          
          if (this.logic.isRotationButtonHit(pos.x, pos.y, selectedObj)) {
            this.canvas.style.cursor = 'pointer';
            return;
          }
          
          if (selectedObj.type === 'wall' && this.logic.isScaleButtonHit(pos.x, pos.y, selectedObj)) {
            this.canvas.style.cursor = 'nwse-resize';
            return;
          }
        }
        
        // Проверяем, находимся ли мы над объектом для изменения курсора
        const obj = this.logic.getObjectAt(pos.x, pos.y);
        if (obj) {
          this.canvas.style.cursor = 'grab';
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    });

    // Конец перетаскивания / завершение рисования стены
    this.canvas.addEventListener('mouseup', (e) => {
      if (this._wallDragActive && this._wallDrawStart) {
        const pos = getMousePos(e);
        const sx = this._wallDrawStart.x, sy = this._wallDrawStart.y;
        const dx = pos.x - sx, dy = pos.y - sy;
        const length = Math.hypot(dx, dy);
        if (length >= 2) {
          // Undo snapshot before changing logic
          this.logic.pushUndo?.();
          // Создаем только объект сцены — физика использует коллизии с повернутыми прямоугольниками
          const angle = Math.atan2(dy, dx);
          const height = 10;
          const centerX = (sx + pos.x) / 2;
          const centerY = (sy + pos.y) / 2;
          const width = length;
          const wallObj = this.logic.addSceneObject('wall', centerX - width/2, centerY - height/2, width, height, {});
          wallObj.rotation = angle;
          logger.logUI('Wall created by drag', null, { start: this._wallDrawStart, end: pos, angle });
        }
        // Выходим из режима рисования стены
        this._wallDrawMode = false;
        this._wallDragActive = false;
        this._wallDrawStart = null;
        this.renderer.setWallPreview(null);
        this.renderer.renderOnce();
        e.preventDefault();
        return;
      }
      if (this.logic.isDragging) {
        this.logic.endDrag();
        this.canvas.style.cursor = 'default';
      } else if (this.isRotating) {
        this.isRotating = false;
        this.rotationStartAngle = null;
        this.canvas.style.cursor = 'default';
      } else if (this.isScaling) {
        this.isScaling = false;
        this.scaleStartPos = null;
        this.scaleStartSize = null;
        this.canvas.style.cursor = 'default';
      }
    });

    // Отмена перетаскивания при выходе за пределы канваса
    this.canvas.addEventListener('mouseleave', () => {
      if (this.logic.isDragging) {
        this.logic.endDrag();
        this.canvas.style.cursor = 'default';
      } else if (this.isRotating) {
        this.isRotating = false;
        this.rotationStartAngle = null;
        this.canvas.style.cursor = 'default';
      } else if (this.isScaling) {
        this.isScaling = false;
        this.scaleStartPos = null;
        this.scaleStartSize = null;
        this.canvas.style.cursor = 'default';
      }
    });

    // Обработка клика правой кнопкой для удаления объекта (без подтверждения)
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const obj = this.logic.getObjectAt(pos.x, pos.y);
      
      if (obj) {
        this.logic.removeSceneObject(obj.id);
        this.renderer.renderOnce();
        this.logLine(`удален объект: ${obj.type}`);
        if (obj.type === 'input') this.refreshInputCheckboxes();
      } else if (this._wallDragActive) {
        // Отмена рисования стены по ПКМ
        this._wallDragActive = false;
        this._wallDrawStart = null;
        this.renderer.setWallPreview(null);
        this.renderer.renderOnce();
      }
    });

    logger.logSystem('Mouse handlers setup', {
      canvas: !!this.canvas,
      handlers: ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'contextmenu']
    });
  }

  getLabelCanvasPos(obj){
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const labelDistance = Math.max(obj.width, obj.height) / 2 + 15;
    return { x: centerX, y: centerY + labelDistance };
  }

  isLabelHit(obj, x, y){
    const { x: lx, y: ly } = this.getLabelCanvasPos(obj);
    const ctx = this.renderer?.ctx;
    const text = String(obj.data?.label || '');
    let halfW = 40;
    if (ctx) {
      ctx.save();
      ctx.font = '10px Inter, system-ui';
      const w = ctx.measureText(text).width;
      ctx.restore();
      halfW = Math.max(20, w / 2 + 6);
    }
    const halfH = 10; // приблизительная половина высоты текста
    return x >= (lx - halfW) && x <= (lx + halfW) && y >= (ly - halfH) && y <= (ly + halfH);
  }

  showRenameInput(obj){
    if (!this.canvas) return;
    if (!(obj.type === 'input' || obj.type === 'output')) return;
    // Создаем/переиспользуем overlay input
    if (!this._renameInput){
      const input = document.createElement('input');
      input.type = 'text';
      input.style.position = 'absolute';
      input.style.zIndex = '1000';
      input.style.padding = '2px 6px';
      input.style.font = '10px Inter, system-ui';
      input.style.border = '1px solid #888';
      input.style.borderRadius = '4px';
      input.style.background = 'var(--panel-bg, #1a1f2b)';
      input.style.color = 'var(--text-color, #fff)';
      document.body.appendChild(input);
      this._renameInput = input;
    }
    const input = this._renameInput;
    const rect = this.canvas.getBoundingClientRect();
    const { x: lx, y: ly } = this.getLabelCanvasPos(obj);
    // Переводим координаты canvas -> CSS пиксели
    const cssLeft = rect.left + (lx / this.canvas.width) * rect.width;
    const cssTop = rect.top + (ly / this.canvas.height) * rect.height;
    input.value = String(obj.data?.label || '');
    input.style.left = `${Math.round(cssLeft - 50)}px`;
    input.style.top = `${Math.round(cssTop - 10)}px`;
    input.style.width = '120px';
    input.style.display = 'block';
    input.onkeydown = (ev)=>{
      if (ev.key === 'Enter') { input.blur(); }
      if (ev.key === 'Escape') { input.value = String(obj.data?.label || ''); input.blur(); }
    };
    input.onblur = ()=>{
      const newVal = input.value;
      this.logic.renameObject(obj.id, newVal);
      input.style.display = 'none';
      this.refreshInputCheckboxes();
      this.renderer.renderOnce();
    };
    input.focus();
    input.select();
  }

  refreshInputCheckboxes(options){
    if (!this._inputSpawnList) return;
    const list = this._inputSpawnList;
    const prevChecked = new Set(Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb=>cb.value));
    const ensureChecked = options?.ensureChecked || new Set();
    const checkAll = options?.checkAll || false;
    const forceExact = !!options?.forceExact;
    list.innerHTML = '';
    for (const input of this.logic.getInputs?.() || []){
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.gap = '8px';
      label.style.alignItems = 'center';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = input.id;
      cb.checked = forceExact
        ? ensureChecked.has(input.id)
        : (checkAll || prevChecked.has(input.id) || ensureChecked.has(input.id));
      const span = document.createElement('span');
      span.textContent = input.data?.label || 'Вход';
      label.appendChild(cb);
      label.appendChild(span);
      list.appendChild(label);
    }
  }
}
window.UI = UI;

function downloadBlob(blob, filename){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 0);
}


