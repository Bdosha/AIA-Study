/**
 * ui.js
 * Точка входа JS. Единственный файл который знает про DOM.
 * Связывает game.js, solver.js, optimizer.js, visualizer.js, presets.js.
 *
 * Порядок инициализации:
 *   1. DOMContentLoaded
 *   2. Запустить верификацию RK4 (ПЗ 3.4)
 *   3. Загрузить пресет 1 по умолчанию
 *   4. Навесить все обработчики событий
 *
 * Зависимости: все остальные модули
 */

import { DifferentialGame, validateExpression, LIMITS } from './game.js';
import { RK4Solver, runVerification }                   from './solver.js';
import { GradientOptimizer }                            from './optimizer.js';
import { Visualizer }                                   from './visualizer.js';
import { PRESETS, getPreset }                           from './presets.js';

// ─── Глобальное состояние UI ──────────────────────────────────────────────────
let visualizer   = null;
let optimizer    = null;
let isRunning    = false;    // флаг: идёт ли вычисление (защита от двойного запуска)
let cancelHandle = null;     // { cancel() } от solveAsync
let currentStep  = 0;        // текущий индекс для пошагового режима
let stepMode     = false;    // включён ли пошаговый режим
let lastResult   = null;     // { solveResult, optimizeResult, config }

// ─── Точка входа ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // 1. Верификация численных методов (ПЗ 3.4) — результат в консоль
  // Откладываем на 100 мс чтобы Plotly успел инициализироваться
  setTimeout(() => {
  const verif = runVerification();
  if (!verif.test1.passed || !verif.test2.passed) {
    _showStatus('Верификация RK4 не прошла. Проверьте консоль (F12).', 'no-capture');
  }
}, 100);

  // 2. Инициализируем Visualizer
  visualizer = new Visualizer(
    { phase: 'plot-phase', time: 'plot-time', control: 'plot-control' },
    _getCurrentTheme()
  );
  optimizer = new GradientOptimizer();

  // 3. Загружаем пресет 1 по умолчанию
  _loadPreset(1);

  // 4. Навешиваем все обработчики
  _bindEvents();
});

// ─── Загрузка пресета в форму ─────────────────────────────────────────────────
function _loadPreset(id) {
  if (id === 0) {
    // Ручной ввод — очищаем поля, не меняем значения
    _setFormulaDisplay('f1-formula', '');
    _setFormulaDisplay('f2-formula', '');
    _setFormulaDisplay('j-formula', '');
    document.getElementById('preset-desc').textContent = 'Введите уравнения вручную.';
    return;
  }

  const p = getPreset(id);

  // Заполняем текстовые поля функций
  // Для пресетов используем строковые представления
  const f1Str = _funcToString(p.f1, id, 'f1');
  const f2Str = _funcToString(p.f2, id, 'f2');
  document.getElementById('f1-input').value = f1Str;
  document.getElementById('f2-input').value = f2Str;
  _clearFieldError('f1');
  _clearFieldError('f2');

  // Начальные условия
  _setSlider('x10', p.x10, -10, 10);
  _setSlider('x20', p.x20, -10, 10);

  // Ограничения управлений
  _setSlider('umin', p.uMin, -5, 5);
  _setSlider('umax', p.uMax, -5, 5);
  _setSlider('vmin', p.vMin, -5, 5);
  _setSlider('vmax', p.vMax, -5, 5);

  // Параметры метода
  document.getElementById('h-input').value     = p.h;
  document.getElementById('T-input').value     = p.T;
  document.getElementById('nmax-input').value  = p.nMax;
  document.getElementById('delta-input').value = p.delta;

  // Тип функционала
  _setFunctionalTab(p.functional);

  // Отображение формул через KaTeX (если KaTeX загружен)
  _renderKatex('f1-formula', p.f1Latex || f1Str);
  _renderKatex('f2-formula', p.f2Latex || f2Str);
  _renderKatex('j-formula',  p.JLatex  || '');

  // Описание пресета
  document.getElementById('preset-desc').textContent = p.description || '';
}

// ─── Обработчики событий ─────────────────────────────────────────────────────
function _bindEvents() {

  // Выбор пресета
  document.getElementById('preset-select').addEventListener('change', e => {
    _loadPreset(parseInt(e.target.value));
  });

  // Ползунки начальных условий
  ['x10', 'x20', 'umin', 'umax', 'vmin', 'vmax'].forEach(name => {
    const slider = document.getElementById(`${name}-slider`);
    const label  = document.getElementById(`${name}-value`);
    slider.addEventListener('input', () => {
      label.textContent = parseFloat(slider.value).toFixed(2);
    });
  });

  // Валидация полей f1, f2 в реальном времени
  ['f1', 'f2'].forEach(name => {
    const input = document.getElementById(`${name}-input`);
    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (!val) { _clearFieldError(name); return; }
      const res = validateExpression(val, ['x1','x2','u','v','t'], name);
      if (res.valid) {
        input.classList.remove('error');
        input.classList.add('ok');
        document.getElementById(`${name}-error`).textContent = '';
      } else {
        input.classList.remove('ok');
        input.classList.add('error');
        document.getElementById(`${name}-error`).textContent = res.error;
      }
    });
  });

  // Валидация числовых параметров (h, T, nMax, delta)
  _bindParamInput('h-input',     'h',    LIMITS.h);
  _bindParamInput('T-input',     'T',    LIMITS.T);
  _bindParamInput('nmax-input',  'nMax', LIMITS.nMax);
  _bindParamInput('delta-input', 'delta',LIMITS.delta);

  // Табы функционала
  document.querySelectorAll('.functional-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.functional-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Кнопка «Решить»
  document.getElementById('btn-run').addEventListener('click', _handleRun);

  // Кнопка «Стоп»
  document.getElementById('btn-stop').addEventListener('click', _handleStop);

  // Кнопка «Пошагово»
  document.getElementById('btn-step').addEventListener('click', _handleStep);

  // Кнопка «Сброс»
  document.getElementById('btn-reset').addEventListener('click', _handleReset);

  // Экспорт PNG
  document.getElementById('btn-export-png').addEventListener('click', () => {
    visualizer && visualizer.exportPNG();
  });

  // Экспорт CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    visualizer && visualizer.exportCSV();
  });

  // Переключатель темы
  document.getElementById('theme-checkbox').addEventListener('change', e => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    visualizer && visualizer.setTheme(theme);
  });
  // Тёмная тема по умолчанию → чекбокс checked
  document.getElementById('theme-checkbox').checked = true;
}

// ─── Обработчик «Решить» ─────────────────────────────────────────────────────
async function _handleRun() {
  // Защита от двойного запуска
  if (isRunning) return;

  // Собрать конфиг из формы
  let config;
  try {
    config = _buildConfigFromForm();
  } catch (e) {
    _showStatus(e.message, 'no-capture');
    return;
  }

  isRunning = true;
  stepMode  = false;
  _setButtonsState('running');
  _clearStatus();
  _setProgress(0);

  try {
    // 1. Запускаем оптимизатор (синхронно — он сам использует solveSync внутри)
    // Оборачиваем в setTimeout чтобы UI успел обновиться перед тяжёлыми вычислениями
    const optimizeResult = await _runAsync(() => optimizer.optimize(config));

    // 2. Если не сошёлся — показываем предупреждение (ПЗ 3.2.4)
    if (!optimizeResult.converged) {
      _showStatus(
        `Оптимизатор не сошёлся за ${optimizeResult.iterations} итераций. ` +
        `Результат может быть субоптимальным.`,
        'suboptimal'
      );
    }

    // 3. Обновляем информационную панель
    const sr = optimizeResult.solveResult;
    _updateInfoPanel(sr, optimizeResult);

    // 4. Запускаем визуализацию
    lastResult = { solveResult: sr, optimizeResult, config };
    visualizer.drawAll(sr, optimizeResult, config);

    // 5. Разблокируем пошаговый режим
    currentStep = 0;
    stepMode    = false;
    _setButtonsState('done');

  } catch (e) {
    _showStatus(`Ошибка: ${e.message}`, 'no-capture');
    _setButtonsState('idle');
    console.error('[ui.js] Ошибка при решении:', e);
  } finally {
    isRunning = false;
    _setProgress(100);
  }
}

// ─── Обработчик «Стоп» ───────────────────────────────────────────────────────
function _handleStop() {
  if (cancelHandle) {
    cancelHandle.cancel();
    cancelHandle = null;
  }
  visualizer && visualizer.stopAnimation();
  isRunning = false;
  _setButtonsState(lastResult ? 'done' : 'idle');
}

// ─── Обработчик «Пошагово» ───────────────────────────────────────────────────
function _handleStep() {
  if (!lastResult) return;

  if (!stepMode) {
    visualizer.stopAnimation();
    stepMode = true;
}

  const hasMore = visualizer.stepOnce();
  currentStep++;

  if (!hasMore) {
    stepMode = false;
    _showStatus('Воспроизведение завершено.', 'capture');
  }
}

// ─── Обработчик «Сброс» ──────────────────────────────────────────────────────
function _handleReset() {
  _handleStop();
  visualizer && visualizer.reset();
  lastResult  = null;
  currentStep = 0;
  stepMode    = false;
  _clearStatus();
  _clearInfoPanel();
  _setButtonsState('idle');
  _setProgress(0);
}

// ─── Сборка конфига из формы ──────────────────────────────────────────────────
function _buildConfigFromForm() {
  const presetId = parseInt(document.getElementById('preset-select').value);

  // Если выбран пресет и не ручной ввод — используем объект пресета напрямую
  // (функции f1, f2 из пресета уже проверены)
  if (presetId > 0) {
    const p = getPreset(presetId);
    return new DifferentialGame({
      ...p,
      // Переопределяем параметры из формы (пользователь мог изменить)
      x10:   parseFloat(document.getElementById('x10-slider').value),
      x20:   parseFloat(document.getElementById('x20-slider').value),
      uMin:  parseFloat(document.getElementById('umin-slider').value),
      uMax:  parseFloat(document.getElementById('umax-slider').value),
      vMin:  parseFloat(document.getElementById('vmin-slider').value),
      vMax:  parseFloat(document.getElementById('vmax-slider').value),
      h:     parseFloat(document.getElementById('h-input').value),
      T:     parseFloat(document.getElementById('T-input').value),
      nMax:  parseInt(document.getElementById('nmax-input').value),
      delta: parseFloat(document.getElementById('delta-input').value),
    }).getConfig();
  }

  // Ручной ввод
  const f1Str = document.getElementById('f1-input').value.trim();
  const f2Str = document.getElementById('f2-input').value.trim();

  if (!f1Str || !f2Str) {
    throw new Error('Введите выражения для f1 и f2');
  }

  const functional = document.querySelector('.functional-tab.active')?.dataset.type || 'terminal';

  return new DifferentialGame({
    f1Str,
    f2Str,
    x10:   parseFloat(document.getElementById('x10-slider').value),
    x20:   parseFloat(document.getElementById('x20-slider').value),
    uMin:  parseFloat(document.getElementById('umin-slider').value),
    uMax:  parseFloat(document.getElementById('umax-slider').value),
    vMin:  parseFloat(document.getElementById('vmin-slider').value),
    vMax:  parseFloat(document.getElementById('vmax-slider').value),
    h:     parseFloat(document.getElementById('h-input').value),
    T:     parseFloat(document.getElementById('T-input').value),
    nMax:  parseInt(document.getElementById('nmax-input').value),
    delta: parseFloat(document.getElementById('delta-input').value),
    epsilon: 0.05,
    functional,
    Phi:   (x1, x2) => Math.abs(x1 - x2),
    K:     () => 0,
    bangBang: false,
  }).getConfig();
}

// ─── Вспомогательные функции UI ───────────────────────────────────────────────

function _setButtonsState(state) {
  const run    = document.getElementById('btn-run');
  const stop   = document.getElementById('btn-stop');
  const step   = document.getElementById('btn-step');
  const reset  = document.getElementById('btn-reset');
  const expPng = document.getElementById('btn-export-png');
  const expCsv = document.getElementById('btn-export-csv');

  if (state === 'running') {
    run.disabled    = true;
    stop.disabled   = false;
    step.disabled   = true;
    reset.disabled  = true;
    expPng.disabled = true;
    expCsv.disabled = true;
  } else if (state === 'done') {
    run.disabled    = false;
    stop.disabled   = true;
    step.disabled   = false;
    reset.disabled  = false;
    expPng.disabled = false;
    expCsv.disabled = false;
  } else { // idle
    run.disabled    = false;
    stop.disabled   = true;
    step.disabled   = true;
    reset.disabled  = true;
    expPng.disabled = true;
    expCsv.disabled = true;
  }
}

function _updateInfoPanel(sr, or_) {
  const captureEl   = document.getElementById('info-capture');
  const jEl         = document.getElementById('info-J');
  const itersEl     = document.getElementById('info-iters');
  const convergedEl = document.getElementById('info-converged');

  // Время захвата
  if (sr.captureTime !== null) {
    captureEl.textContent = `${sr.captureTime.toFixed(4)} с`;
    captureEl.className   = 'info-value success';
    _showStatus(`Захват достигнут в момент T* = ${sr.captureTime.toFixed(4)}`, 'capture');
  } else if (sr.exitTime !== null) {
    captureEl.textContent = `T_exit = ${sr.exitTime.toFixed(4)} с`;
    captureEl.className   = 'info-value success';
    _showStatus(`Убегающий вышел из области в момент T_exit = ${sr.exitTime.toFixed(4)}`, 'capture');
  } else {
    captureEl.textContent = 'Не достигнут';
    captureEl.className   = 'info-value error';
    // Сообщение из ПЗ раздел 3.1.4
    const T = sr.t[sr.N - 1];
    _showStatus(
      `Захват не достигнут за горизонт интегрирования T = ${T.toFixed(2)}`,
      'no-capture'
    );
  }

  jEl.textContent         = typeof sr.J === 'number' ? sr.J.toFixed(6) : '—';
  itersEl.textContent     = or_.iterations ?? '—';
  convergedEl.textContent = or_.converged ? 'Да' : 'Нет (субоптимально)';
  convergedEl.className   = `info-value ${or_.converged ? 'success' : 'warning'}`;
}

function _clearInfoPanel() {
  ['info-capture','info-J','info-iters','info-converged'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '—'; el.className = 'info-value'; }
  });
}

function _showStatus(message, type) {
  const el = document.getElementById('status-message');
  if (!el) return;
  el.textContent = message;
  el.className   = `status-message ${type}`;
  el.classList.remove('hidden');
}

function _clearStatus() {
  const el = document.getElementById('status-message');
  if (el) {
    el.textContent = '';
    el.className   = 'hidden';
  }
}

function _setProgress(percent) {
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = `${percent}%`;
}

function _setSlider(name, value, min, max) {
  const slider = document.getElementById(`${name}-slider`);
  const label  = document.getElementById(`${name}-value`);
  if (!slider || !label) return;
  // Обновляем min/max если нужно
  if (parseFloat(slider.min) > value) slider.min = min;
  if (parseFloat(slider.max) < value) slider.max = max;
  slider.value      = value;
  label.textContent = parseFloat(value).toFixed(2);
}

function _setFunctionalTab(type) {
  document.querySelectorAll('.functional-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
}

function _bindParamInput(inputId, limitKey, limits) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', () => {
    const val = parseFloat(input.value);
    if (isNaN(val) || val < limits.min || val > limits.max) {
      input.classList.add('warning');
      const clamped = Math.min(limits.max, Math.max(limits.min, isNaN(val) ? limits.default : val));
      input.value = clamped;
      setTimeout(() => input.classList.remove('warning'), 1500);
    }
  });
}

function _clearFieldError(name) {
  const input = document.getElementById(`${name}-input`);
  const error = document.getElementById(`${name}-error`);
  if (input) { input.classList.remove('error', 'ok'); }
  if (error) { error.textContent = ''; }
}

function _getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Рендеринг KaTeX — безопасно (если KaTeX ещё не загружен — просто пропускаем)
function _renderKatex(elementId, latex) {
  const el = document.getElementById(elementId);
  if (!el || !latex) { if (el) el.innerHTML = ''; return; }
  try {
    if (typeof window.katex !== 'undefined') {
      window.katex.render(latex, el, { throwOnError: false, displayMode: false });
    } else {
      el.textContent = latex;
    }
  } catch {
    el.textContent = latex;
  }
}

function _setFormulaDisplay(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Строковое представление функции пресета для текстового поля
function _funcToString(fn, presetId, which) {
  const MAP = {
    1: { f1: 'u',                              f2: 'v' },
    2: { f1: 'u',                              f2: 'v' },
    3: { f1: '0.05 * x1 + u - 0.5',           f2: '0.05 * x2 + v - 0.5' },
    4: { f1: '1.0 * u - 0.5 * x1 - 0.3 * x2', f2: '1.0 * v - 0.5 * x2 - 0.3 * x1' },
    5: { f1: 'u',                              f2: 'v' },
  };
  return MAP[presetId]?.[which] ?? '';
}

// Запускаем синхронную тяжёлую функцию асинхронно через Promise+setTimeout
// чтобы браузер успел обновить UI перед вычислениями
function _runAsync(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(fn()); }
      catch (e) { reject(e); }
    }, 16); // один кадр
  });
}
