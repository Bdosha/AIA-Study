import { parseLifeDSL } from './rules.js';

/**
 * Рендерит панель управления и вешает обработчики.
 * Эмитит события на window: ui:start, ui:stop, ui:step, ui:reset,
 * ui:changeSpeed {fps}, ui:changeKernel {kernel}, ui:changeRule {dsl},
 * ui:applyPreset {name}, ui:toggleTheme {theme}
 * @param {HTMLElement} rootEl
 */
export function initControls(rootEl) {
  rootEl.innerHTML = `
    <div class="group">
      <h3>Симуляция</h3>
      <div class="row">
        <button id="btn-start" class="primary">Старт</button>
        <button id="btn-stop">Стоп</button>
        <button id="btn-step">Шаг</button>
        <button id="btn-reset">Сброс</button>
      </div>
      <div class="row n-steps-row">
        <button id="btn-run-n-steps">Сделать N шагов</button>
        <label for="inp-n-steps">Количество шагов N:
          <input id="inp-n-steps" type="number" min="1" max="10000" value="100" />
        </label>
      </div>
    </div>

    <div class="group">
      <h3>Скорость и отображение</h3>
      <div class="row">
        <label>Скорость: <span id="lbl-fps">30</span> FPS</label>
        <input id="rng-fps" type="range" min="1" max="60" value="30" />
        <label><input id="chk-grid" type="checkbox" checked /> Показывать сетку</label>
        <label><input id="chk-auto-hide" type="checkbox" checked /> Авто-скрывать сетку при запуске</label>
  <label><input id="chk-logs" type="checkbox" /> Сохранять статистику</label>
        <label>Тема:
          <select id="sel-theme">
            <option value="dark" selected>Тёмная</option>
            <option value="light">Светлая</option>
          </select>
        </label>
      </div>
    </div>

    <div class="group">
      <h3>Расширенные настройки</h3>
      <div class="subgroup">
          <div class="row">
            <label>Ядро:
              <select id="sel-kernel">
                <option value="edge-3" selected>edge-3</option>
                <option value="moore-12">moore-12</option>
              </select>
            </label>
          </div>
          <div class="row rule-selection">
            <div class="bs-rule-container">
              <div class="bs-rule-header">
                <label>Рождение (B):</label>
              </div>
              <div id="bs-rule-birth" class="bs-rule-chips">
                <!-- Будет заполнено JS -->
              </div>
            </div>
            <div class="bs-rule-container">
              <div class="bs-rule-header">
                <label>Выживание (S):</label>
              </div>
              <div id="bs-rule-survive" class="bs-rule-chips">
                <!-- Будет заполнено JS -->
              </div>
            </div>
            <input id="inp-rule" type="hidden" value="B3/S23" />
          </div>
          <div class="row" style="gap:6px">
            <label>Ширина: <input id="inp-w" type="number" min="5" max="300" step="1" value="100" style="width:80px" /></label>
            <label>Высота: <input id="inp-h" type="number" min="5" max="300" step="1" value="80" style="width:80px" /></label>
            <button id="btn-apply-size">Применить</button>
          </div>
          <div class="row" style="gap:6px">
            <button class="size-preset" data-w="40" data-h="30">40×30</button>
            <button class="size-preset" data-w="60" data-h="40">60×40</button>
            <button class="size-preset" data-w="80" data-h="60">80×60</button>
            <button class="size-preset" data-w="120" data-h="90">120×90</button>
          </div>
          <div class="row">
            <label>Пресет:
              <select id="sel-preset">
                <option value="none" selected>— не выбрано —</option>
                <option value="Random 30">Random 30</option>
                <option value="Random 45">Random 45</option>
                <option value="Lines">Lines</option>
                <option value="Triangles">Triangles</option>
                <option value="Учебный 20×20">Учебный 20×20</option>
              </select>
            </label>
          </div>
          
      </div>
      
    </div>

    <div class="group">
      <h3>Индикаторы</h3>
      <div class="indicators">
        <div class="pill">Шагов: <span id="lbl-steps">0</span></div>
        <div class="pill">Времени: <span id="lbl-time">0</span> сек</div>
      </div>
    </div>

    <div class="group" id="file-group">
      <h3>Файл</h3>
      <div class="row" id="file-body">
        <button id="btn-import">Импорт…</button>
        <button id="btn-export">Экспорт</button>
        <button id="btn-share">Поделиться</button>
      </div>
    </div>
  `;

  const q = (sel) => rootEl.querySelector(sel);
  const emit = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

  // Buttons
  q('#btn-start').addEventListener('click', () => emit('ui:start'));
  q('#btn-stop').addEventListener('click', () => emit('ui:stop'));
  q('#btn-step').addEventListener('click', () => emit('ui:step'));
  q('#btn-reset').addEventListener('click', () => emit('ui:reset'));
  
  // N Steps functionality
  q('#btn-run-n-steps').addEventListener('click', () => {
    const stepsInput = q('#inp-n-steps');
    const steps = parseInt(stepsInput.value, 10);
    if (isNaN(steps) || steps < 1) {
      stepsInput.value = '100';
      return;
    }
    emit('ui:runNSteps', { steps });
  });

  // Kernel
  q('#sel-kernel').addEventListener('change', (e) => emit('ui:changeKernel', { kernel: e.target.value }));

  // Rule DSL with new UI
  const ruleInput = q('#inp-rule');
  const birthChipsContainer = q('#bs-rule-birth');
  const surviveChipsContainer = q('#bs-rule-survive');
  
  // Current state tracking
  let selectedBirths = [3];
  let selectedSurvives = [2, 3];
  
  // Function to update the rule input and emit the change event
  const updateRule = () => {
    // Формируем однозначно парсимый DSL вида "B: 3,10 / S: 2,12".
    // Это гарантирует, что одиночные многозначные значения (например, 10) не будут распадаться на цифры.
    const birthStr = selectedBirths.length > 0 ? selectedBirths.join(',') : '';
    const surviveStr = selectedSurvives.length > 0 ? selectedSurvives.join(',') : '';
    const rule = `B: ${birthStr}/S: ${surviveStr}`;
    ruleInput.value = rule;
    emit('ui:changeRule', { dsl: rule });
  };
  
  // Function to create rule chips for a kernel
  const createRuleChips = (container, isForBirth, maxNeighbors) => {
    container.innerHTML = '';
    for (let i = 0; i <= maxNeighbors; i++) {
      const chip = document.createElement('div');
      chip.className = 'rule-chip';
      chip.textContent = i;
      chip.dataset.value = i;
      
      if ((isForBirth && selectedBirths.includes(i)) || 
          (!isForBirth && selectedSurvives.includes(i))) {
        chip.classList.add('selected');
      }
      
      chip.addEventListener('click', () => {
        const value = parseInt(chip.dataset.value, 10);
        let selectedArray = isForBirth ? selectedBirths : selectedSurvives;
        
        if (selectedArray.includes(value)) {
          selectedArray = selectedArray.filter(v => v !== value);
          chip.classList.remove('selected');
        } else {
          selectedArray.push(value);
          selectedArray.sort((a, b) => a - b);
          chip.classList.add('selected');
        }
        
        if (isForBirth) {
          selectedBirths = selectedArray;
        } else {
          selectedSurvives = selectedArray;
        }
        
        updateRule();
      });
      
      container.appendChild(chip);
    }
  };
  
  // Initialize chips based on the current kernel
  const initRuleChips = () => {
    const kernel = q('#sel-kernel').value;
    const maxNeighbors = kernel === 'edge-3' ? 3 : 12;
    
    createRuleChips(birthChipsContainer, true, maxNeighbors);
    createRuleChips(surviveChipsContainer, false, maxNeighbors);
  };
  
  // Parse and set initial rule
  const parseInitialRule = () => {
    const ruleDSL = ruleInput.value.trim();
    try {
      const parsed = parseLifeDSL(ruleDSL);
      if (parsed) {
        // Сортируем для стабильного порядка отображения и сериализации
        selectedBirths = parsed.births.slice().sort((a,b)=>a-b);
        selectedSurvives = parsed.survives.slice().sort((a,b)=>a-b);
        updateRule();
      }
    } catch (e) {
      console.error('Error parsing initial rule', e);
    }
  };
  
  // Initialize the rule chips
  initRuleChips();
  parseInitialRule();
  
  // Update chips when kernel changes
  q('#sel-kernel').addEventListener('change', () => {
    initRuleChips();
  });
  
  // Legacy support for direct rule input (hidden now)
  ruleInput.addEventListener('change', () => {
    parseInitialRule();
    initRuleChips();
  });

  // Grid size
  q('#btn-apply-size').addEventListener('click', () => {
    const w = Number(q('#inp-w').value);
    const h = Number(q('#inp-h').value);
    const clamp = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));
    const ww = clamp(w, 5, 300);
    const hh = clamp(h, 5, 300);
    emit('ui:resizeGrid', { w: ww, h: hh });
  });
  rootEl.querySelectorAll('.size-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = Number(btn.getAttribute('data-w'));
      const h = Number(btn.getAttribute('data-h'));
      q('#inp-w').value = String(w);
      q('#inp-h').value = String(h);
      emit('ui:resizeGrid', { w, h });
    });
  });

  // Preset
  q('#sel-preset').addEventListener('change', (e) => {
    const name = e.target.value;
    if (name !== 'none') emit('ui:applyPreset', { name });
  });

  // Speed
  const fpsLbl = q('#lbl-fps');
  const fpsRange = q('#rng-fps');
  const onFps = () => { fpsLbl.textContent = fpsRange.value; emit('ui:changeSpeed', { fps: Number(fpsRange.value) }); };
  fpsRange.addEventListener('input', onFps);
  fpsRange.addEventListener('change', onFps);

  // Theme
  q('#sel-theme').addEventListener('change', (e) => emit('ui:toggleTheme', { theme: e.target.value }));
  // Grid visibility
  q('#chk-grid').addEventListener('change', (e) => emit('ui:toggleGridRun', { visible: !!e.target.checked }));
  // Auto-hide grid while running
  q('#chk-auto-hide').addEventListener('change', (e) => emit('ui:toggleAutoHideGrid', { enabled: !!e.target.checked }));
  // Toggle logs
  q('#chk-logs').addEventListener('change', (e) => emit('ui:toggleLogs', { enabled: !!e.target.checked }));

  // File actions
  q('#btn-export').addEventListener('click', () => emit('ui:export'));
  q('#btn-import').addEventListener('click', () => emit('ui:import'));
  q('#btn-share').addEventListener('click', () => emit('ui:share'));
  

  // File group simplified: no toggle button, always visible
}

/** Обновление индикатора количества шагов. */
export function updateStep(n) {
  const el = document.getElementById('lbl-steps');
  if (el) el.textContent = String(n);
}

/** Обновление индикатора прошедшего времени (секунды). */
export function updateTime(seconds) {
  const el = document.getElementById('lbl-time');
  if (el) el.textContent = String(seconds);
}

/** Установить состояние чекбокса видимости сетки программно. */
export function setGridVisibleCheckbox(checked) {
  const el = document.getElementById('chk-grid');
  if (el) el.checked = !!checked;
}

/** Установить состояние чекбокса авто-скрытия программно. */
export function setAutoHideCheckbox(checked) {
  const el = document.getElementById('chk-auto-hide');
  if (el) el.checked = !!checked;
}

/** Установить состояние чекбокса логирования программно. */
export function setLogsCheckbox(checked) {
  const el = document.getElementById('chk-logs');
  if (el) el.checked = !!checked;
}
