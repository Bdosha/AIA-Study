// ─── Допустимые диапазоны параметров (ПЗ таблица 3) ──────────────────────────
export const LIMITS = {
  h:     { min: 0.0001, max: 0.1,  default: 0.01  },
  T:     { min: 0.1,    max: 100,  default: 20    },
  nMax:  { min: 1,      max: 1000, default: 500   },
  delta: { min: 1e-6,   max: 1e-2, default: 1e-4  },
};

// ─── Запрещённые идентификаторы (ПЗ раздел 3.5) ──────────────────────────────
const FORBIDDEN = [
  'fetch', 'XMLHttpRequest', 'import', 'eval',
  'window', 'document', 'localStorage', 'sessionStorage',
  'alert', 'confirm', 'prompt',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'WebSocket', 'Worker', 'indexedDB', 'navigator', 'location',
];

// ─── Разрешённые функции Math (ПЗ раздел 3.5) ────────────────────────────────
const ALLOWED_MATH = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'exp', 'log', 'log2', 'log10',
  'abs', 'sqrt', 'pow', 'cbrt',
  'floor', 'ceil', 'round', 'sign',
  'min', 'max',
  'PI', 'E', 'LN2', 'LN10',
];

// ─── Таймаут на вызов пользовательской функции (ПЗ 3.5) ──────────────────────
const FUNCTION_TIMEOUT_MS = 5;

export class DifferentialGame {
  /**
   * @param {Object} rawConfig — сырой конфиг от UI или из presets.js
   *
   * rawConfig может содержать:
   *   f1Str, f2Str — строки выражений (от пользовательского ввода)
   *   f1, f2       — уже готовые Function (от presets.js)
   *   x10, x20     — начальные условия
   *   uMin, uMax, vMin, vMax — ограничения управлений
   *   T, h, nMax, delta, epsilon — параметры метода
   *   functional   — 'terminal' | 'integral' | 'mixed'
   *   PhiStr / Phi — терминальная часть функционала
   *   KStr   / K   — интегральная часть функционала
   *   presetId     — номер пресета 1-5 или null
   *   params       — доп. параметры для отображения (пресет 4)
   *   exitRegion   — { a, b } для пресета 5
   */
  constructor(rawConfig) {
    this._config = this._build(rawConfig);
  }

  // Вернуть готовый валидированный конфиг
  getConfig() {
    return this._config;
  }

  // ─── Сборка конфига ─────────────────────────────────────────────────────────
  _build(raw) {
    const cfg = {};

    // 1. Числовые параметры с валидацией
    cfg.h     = this._clamp('h',     raw.h);
    cfg.T     = this._clamp('T',     raw.T);
    cfg.nMax  = this._clampInt('nMax', raw.nMax);
    cfg.delta = this._clamp('delta', raw.delta);

    // 2. Начальные условия (числа, без ограничений)
    cfg.x10 = this._toNumber(raw.x10, 0,  'x10');
    cfg.x20 = this._toNumber(raw.x20, 1,  'x20');

    // 3. Ограничения управлений
    cfg.uMin = this._toNumber(raw.uMin, -1, 'uMin');
    cfg.uMax = this._toNumber(raw.uMax,  1, 'uMax');
    cfg.vMin = this._toNumber(raw.vMin, -1, 'vMin');
    cfg.vMax = this._toNumber(raw.vMax,  1, 'vMax');

    if (cfg.uMin >= cfg.uMax) throw new Error('uMin должен быть меньше uMax');
    if (cfg.vMin >= cfg.vMax) throw new Error('vMin должен быть меньше vMax');

    // 4. Порог захвата
    cfg.epsilon = this._toNumber(raw.epsilon, 0.05, 'epsilon');
    if (cfg.epsilon <= 0) throw new Error('epsilon должен быть > 0');

    // 5. Тип функционала
    const validFunctionals = ['terminal', 'integral', 'mixed'];
    cfg.functional = validFunctionals.includes(raw.functional)
      ? raw.functional
      : 'terminal';

    // 6. Функции уравнений движения f1, f2
    // Если переданы готовые Function (из presets.js) — используем напрямую
    // Если переданы строки (из UI) — парсим с защитой
    cfg.f1 = raw.f1 instanceof Function
      ? raw.f1
      : this._parseFunction(raw.f1Str || raw.f1, ['x1','x2','u','v','t'], 'f1');

    cfg.f2 = raw.f2 instanceof Function
      ? raw.f2
      : this._parseFunction(raw.f2Str || raw.f2, ['x1','x2','u','v','t'], 'f2');
// 7. Функционал Phi (терминальная часть)
if (cfg.functional === 'integral') {
    cfg.Phi = () => 0;
} else {
    cfg.Phi = raw.Phi instanceof Function
        ? raw.Phi
        : this._parseFunction(raw.PhiStr || raw.Phi, ['x1','x2'], 'Phi');
}

// 8. Функционал K (интегральная часть)
if (cfg.functional === 'terminal') {
    cfg.K = () => 0;
} else {
    cfg.K = raw.K instanceof Function
        ? raw.K
        : this._parseFunction(raw.KStr || raw.K, ['x1','x2','u','v','t'], 'K');
}

// 9. Оборачиваем Phi и K в таймаут (ПЗ 3.5)
if (!(raw.Phi instanceof Function)) {
    cfg.Phi = this._wrapWithTimeout(cfg.Phi, 'Phi');
}
if (!(raw.K instanceof Function)) {
    cfg.K = this._wrapWithTimeout(cfg.K, 'K');
}

// 10. Обёртка с таймаутом для f1 и f2
if (!(raw.f1 instanceof Function)) {
    cfg.f1 = this._wrapWithTimeout(cfg.f1, 'f1');
}
if (!(raw.f2 instanceof Function)) {
    cfg.f2 = this._wrapWithTimeout(cfg.f2, 'f2');
}

// 11. Метаданные
cfg.presetId = raw.presetId ?? null;
cfg.params = raw.params ?? {};
cfg.exitRegion = raw.exitRegion ?? null;
cfg.bangBang = !!raw.bangBang;
cfg.isTimeOptimal = (raw.presetId === 1 || raw.presetId === 2);

return cfg;
}
  // ─── Валидация и приведение числа к допустимому диапазону ──────────────────
  _clamp(key, value) {
    const { min, max, default: def } = LIMITS[key];
    const n = parseFloat(value);
    if (isNaN(n)) {
      console.warn(`[game.js] ${key} не является числом, используем дефолт ${def}`);
      return def;
    }
    if (n < min || n > max) {
      const clamped = Math.min(max, Math.max(min, n));
      console.warn(`[game.js] ${key}=${n} вне диапазона [${min}, ${max}], сброс к ${clamped}`);
      return clamped;
    }
    return n;
  }

  _clampInt(key, value) {
    return Math.round(this._clamp(key, value));
  }

  _toNumber(value, fallback, name) {
    const n = parseFloat(value);
    if (isNaN(n)) {
      console.warn(`[game.js] ${name} не является числом, используем ${fallback}`);
      return fallback;
    }
    return n;
  }

  // ─── Парсинг строки в Function с защитой (ПЗ раздел 3.5) ──────────────────
  _parseFunction(exprStr, argNames, funcName) {
    if (typeof exprStr !== 'string' || exprStr.trim() === '') {
      throw new Error(`[game.js] Выражение для ${funcName} пустое или не является строкой`);
    }

    // Нормализация: убираем переносы строк, лишние пробелы
    let expr = exprStr.replace(/[\r\n]+/g, ' ').trim();

    // Проверка запрещённых идентификаторов
    for (const forbidden of FORBIDDEN) {
      // Проверяем как отдельное слово (не как часть другого слова)
      const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
      if (regex.test(expr)) {
        throw new Error(
          `[game.js] Выражение "${funcName}" содержит запрещённый идентификатор: "${forbidden}"`
        );
      }
    }

    // Проверка: выражение не должно содержать присваивания
    if (/[^=!<>]=[^=]/.test(expr)) {
      throw new Error(
        `[game.js] Выражение "${funcName}" содержит оператор присваивания`
      );
    }

    // Компиляция через Function constructor
    // Оборачиваем в скобки — это позволяет использовать запятые и ternary
    let fn;
    try {
      // eslint-disable-next-line no-new-func
      fn = new Function(...argNames, `"use strict"; return (${expr});`);
    } catch (e) {
      throw new Error(
        `[game.js] Синтаксическая ошибка в "${funcName}": ${e.message}`
      );
    }

    // Проверочный вызов — убеждаемся что функция вообще работает
    try {
      const testArgs = argNames.map(() => 1.0);
      const result = fn(...testArgs);
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('результат не является конечным числом при тестовых аргументах (все=1)');
      }
    } catch (e) {
      throw new Error(
        `[game.js] Ошибка при тестовом вызове "${funcName}": ${e.message}`
      );
    }

    return fn;
  }

  // ─── Обёртка с таймаутом (ПЗ 3.5: ≤ 5 мс на вызов) ──────────────────────
  _wrapWithTimeout(fn, funcName) {
    return (...args) => {
      const start = performance.now();
      const result = fn(...args);
      const elapsed = performance.now() - start;
      if (elapsed > FUNCTION_TIMEOUT_MS) {
        throw new Error(
          `[game.js] Функция "${funcName}" превысила таймаут ${FUNCTION_TIMEOUT_MS} мс ` +
          `(выполнялась ${elapsed.toFixed(2)} мс)`
        );
      }
      return result;
    };
  }
}

// ─── Вспомогательная функция: валидировать строку выражения без создания игры
// Используется в ui.js для подсветки ошибок в реальном времени
export function validateExpression(exprStr, argNames, funcName) {
  try {
    const game = new DifferentialGame({
      // Минимальный конфиг чтобы не падало на других полях
      [`${funcName === 'f1' ? 'f1Str' : 'f2Str'}`]: exprStr,
      f1Str: funcName === 'f1' ? exprStr : 'x1',
      f2Str: funcName === 'f2' ? exprStr : 'x2',
      x10: 0, x20: 1,
      uMin: -1, uMax: 1,
      vMin: -1, vMax: 1,
      T: 1, h: 0.1, nMax: 10, delta: 1e-4, epsilon: 0.1,
      functional: 'terminal',
      Phi: (x1, x2) => Math.abs(x1 - x2),
      K:   () => 0,
    });
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
