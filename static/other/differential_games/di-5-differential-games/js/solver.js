/**
 * solver.js
 * Класс RK4Solver — численное интегрирование методом Рунге-Кутты 4-го порядка.
 * Реализует формулы (16)-(20) из ПЗ в правильном порядке: k1→k2→k3→k4→xn+1
 *
 * Два режима:
 *   solveSync  — синхронный, используется ВНУТРИ optimizer (нельзя async в цикле)
 *   solveAsync — асинхронный батчами, используется в UI для финального отображения
 *
 * Зависимости: нет (принимает чистый GameConfig, не импортирует game.js)
 * Импортируется в: optimizer.js, ui.js
 */

// Размер батча для асинхронного решения (шагов за один тик event loop)
const BATCH_SIZE = 500;

export class RK4Solver {

  /**
   * solveSync — синхронное интегрирование
   * Используется внутри optimizer на каждой итерации.
   *
   * @param {Object} config   — GameConfig из DifferentialGame.getConfig()
   * @param {Float64Array} uArr — массив управлений u[i] длиной N
   * @param {Float64Array} vArr — массив управлений v[i] длиной N
   * @returns {Object} SolveResult
   */
  solveSync(config, uArr, vArr) {
    const { f1, f2, x10, x20, h, T, epsilon, functional, Phi, K } = config;

    // Количество шагов (заранее — чтобы аллоцировать Float64Array)
    const N = Math.ceil(T / h) + 1;

    const t  = new Float64Array(N);
    const x1 = new Float64Array(N);
    const x2 = new Float64Array(N);

    // Начальные условия
    t[0]  = 0;
    x1[0] = x10;
    x2[0] = x20;

    let captureTime =
  Math.abs(x10 - x20) <= epsilon ? 0 : null;
    let exitTime    = null;   // для пресета 5 (уклонение)
    let integralJ   = 0;      // накопленный интеграл (метод трапеций)

    for (let i = 0; i < N - 1; i++) {
      const ti = t[i];
      const xi1 = x1[i];
      const xi2 = x2[i];

      // Управления на текущем шаге и на полушаге и на следующем шаге
      // uArr/vArr могут быть короче N если optimizer передаёт неполный массив
      const ui  = _getVal(uArr, i,     config.uMin, config.uMax);
      const ui1 = _getVal(uArr, i + 1, config.uMin, config.uMax);

      // управление на полушаге t + h/2
      const ui2 = 0.5 * (ui + ui1);

      const vi  = _getVal(vArr, i,     config.vMin, config.vMax);
      const vi1 = _getVal(vArr, i + 1, config.vMin, config.vMax);

      // управление на полушаге t + h/2
      const vi2 = 0.5 * (vi + vi1);

      // ── RK4 строго по формулам (16)-(20) ПЗ ──────────────────────────────
      // k1 (16)
      const k1_1 = h * f1(xi1,          xi2,          ui,  vi,  ti);
      const k1_2 = h * f2(xi1,          xi2,          ui,  vi,  ti);

      // k2 (17)
      const k2_1 = h * f1(xi1 + k1_1/2, xi2 + k1_2/2, ui2, vi2, ti + h/2);
      const k2_2 = h * f2(xi1 + k1_1/2, xi2 + k1_2/2, ui2, vi2, ti + h/2);

      // k3 (18)
      const k3_1 = h * f1(xi1 + k2_1/2, xi2 + k2_2/2, ui2, vi2, ti + h/2);
      const k3_2 = h * f2(xi1 + k2_1/2, xi2 + k2_2/2, ui2, vi2, ti + h/2);

      // k4 (19)
      const k4_1 = h * f1(xi1 + k3_1,   xi2 + k3_2,   ui1, vi1, ti + h);
      const k4_2 = h * f2(xi1 + k3_1,   xi2 + k3_2,   ui1, vi1, ti + h);

      // xn+1 (20) — ПОСЛЕ k4, не до
      x1[i+1] = xi1 + (k1_1 + 2*k2_1 + 2*k3_1 + k4_1) / 6;
      x2[i+1] = xi2 + (k1_2 + 2*k2_2 + 2*k3_2 + k4_2) / 6;
      t[i+1]  = ti + h;

      // Накопление интегрального функционала методом трапеций
      if (functional === 'integral' || functional === 'mixed') {
        const K0 = K(xi1,     xi2,     ui,  vi,  ti);
        const K1 = K(x1[i+1], x2[i+1], ui1, vi1, t[i+1]);
        integralJ += (K0 + K1) / 2 * h;
      }

      // Проверка захвата
      if (captureTime === null) {
        if (Math.abs(x1[i+1] - x2[i+1]) < epsilon) {
          captureTime = t[i+1];
        }
      }

      // Проверка выхода из области (пресет 5)
      if (config.exitRegion && exitTime === null) {
        const { a, b } = config.exitRegion;
        if (x2[i+1] < a || x2[i+1] > b) {
          exitTime = t[i+1];
        }
      }
    }

    // Вычисление финального функционала
    const J = _computeJ(config, x1, x2, integralJ, captureTime, exitTime, N);

    return { t, x1, x2, captureTime, exitTime, J, N };
  }

  /**
   * solveAsync — асинхронное интегрирование батчами
   * Используется в UI, не блокирует браузер.
   *
   * @param {Object}       config     — GameConfig
   * @param {Float64Array} uArr       — управления u
   * @param {Float64Array} vArr       — управления v
   * @param {Function}     onProgress — (percent: 0-100) => void
   * @param {Function}     onDone     — (SolveResult) => void
   * @param {Function}     onError    — (Error) => void
   * @returns {Object} { cancel: Function } — вызвать для отмены
   */
  solveAsync(config, uArr, vArr, onProgress, onDone, onError) {
    const { f1, f2, x10, x20, h, T, epsilon, functional, Phi, K } = config;
    const N = Math.ceil(T / h) + 1;

    const t  = new Float64Array(N);
    const x1 = new Float64Array(N);
    const x2 = new Float64Array(N);

    t[0]  = 0;
    x1[0] = x10;
    x2[0] = x20;

    let i           = 0;
    let captureTime =
  Math.abs(x10 - x20) <= epsilon ? 0 : null;
    let exitTime    = null;
    let integralJ   = 0;
    let cancelled   = false;
    let timerId     = null;

    const step = () => {
      if (cancelled) return;

      const batchEnd = Math.min(i + BATCH_SIZE, N - 1);

      try {
        for (; i < batchEnd; i++) {
          const ti  = t[i];
          const xi1 = x1[i];
          const xi2 = x2[i];

          const ui  = _getVal(uArr, i,     config.uMin, config.uMax);
          const ui1 = _getVal(uArr, i + 1, config.uMin, config.uMax);

          // управление на полушаге t + h/2
          const ui2 = 0.5 * (ui + ui1);

          const vi  = _getVal(vArr, i,     config.vMin, config.vMax);
          const vi1 = _getVal(vArr, i + 1, config.vMin, config.vMax);

          // управление на полушаге t + h/2
          const vi2 = 0.5 * (vi + vi1);

          const k1_1 = h * f1(xi1,          xi2,          ui,  vi,  ti);
          const k1_2 = h * f2(xi1,          xi2,          ui,  vi,  ti);
          const k2_1 = h * f1(xi1 + k1_1/2, xi2 + k1_2/2, ui2, vi2, ti + h/2);
          const k2_2 = h * f2(xi1 + k1_1/2, xi2 + k1_2/2, ui2, vi2, ti + h/2);
          const k3_1 = h * f1(xi1 + k2_1/2, xi2 + k2_2/2, ui2, vi2, ti + h/2);
          const k3_2 = h * f2(xi1 + k2_1/2, xi2 + k2_2/2, ui2, vi2, ti + h/2);
          const k4_1 = h * f1(xi1 + k3_1,   xi2 + k3_2,   ui1, vi1, ti + h);
          const k4_2 = h * f2(xi1 + k3_1,   xi2 + k3_2,   ui1, vi1, ti + h);

          x1[i+1] = xi1 + (k1_1 + 2*k2_1 + 2*k3_1 + k4_1) / 6;
          x2[i+1] = xi2 + (k1_2 + 2*k2_2 + 2*k3_2 + k4_2) / 6;
          t[i+1]  = ti + h;

          if (functional === 'integral' || functional === 'mixed') {
            const K0 = K(xi1,     xi2,     ui,  vi,  ti);
            const K1 = K(x1[i+1], x2[i+1], ui1, vi1, t[i+1]);
            integralJ += (K0 + K1) / 2 * h;
          }

          if (captureTime === null) {
            if (Math.abs(x1[i+1] - x2[i+1]) < epsilon) {
              captureTime = t[i+1];
            }
          }

          if (config.exitRegion && exitTime === null) {
            const { a, b } = config.exitRegion;
            if (x2[i+1] < a || x2[i+1] > b) {
              exitTime = t[i+1];
            }
          }
        }
      } catch (err) {
        onError && onError(err);
        return;
      }

      onProgress && onProgress(Math.round((i / (N - 1)) * 100));

      if (i < N - 1) {
        // Ещё не закончили — следующий батч через setTimeout(0)
        timerId = setTimeout(step, 0);
      } else {
        // Готово
        const J = _computeJ(config, x1, x2, integralJ, captureTime, exitTime, N);
        onDone && onDone({ t, x1, x2, captureTime, exitTime, J, N });
      }
    };

    // Запускаем первый батч
    timerId = setTimeout(step, 0);

    return {
      cancel: () => {
        cancelled = true;
        if (timerId !== null) clearTimeout(timerId);
      }
    };
  }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Безопасно получить значение из массива управлений.
 * Если индекс вышел за границу — берём последнее значение (hold last).
 * Если массив пустой или undefined — возвращаем 0.
 */
function _getVal(arr, i, min, max) {
  if (!arr || arr.length === 0) return 0;
  const idx = Math.min(i, arr.length - 1);
  return Math.min(max, Math.max(min, arr[idx]));
}

/**
 * Вычислить финальное значение функционала J.
 */
function _computeJ(config, x1, x2, integralJ, captureTime, exitTime, N) {
    const { functional, Phi, epsilon, isTimeOptimal, T } = config;
    const lastIdx = N - 1;

    if (functional === 'terminal') {
        // Задача уклонения (пресет 5)
        if (config.exitRegion) {
            return exitTime !== null ? exitTime : T;
        }

        // Пресеты 1 и 2 — время первого захвата
        if (isTimeOptimal || config.presetId === 1 || config.presetId === 2) {
            if (captureTime !== null) {
                return captureTime;
            }
            // Захват не достигнут
            return Math.abs(x1[lastIdx] - x2[lastIdx]);
        }

        // Обычный терминальный (например, пресет 4)
        return Phi(x1[lastIdx], x2[lastIdx]);
    }

    if (functional === 'integral') {
        return integralJ;
    }

    if (functional === 'mixed') {
        return Phi(x1[lastIdx], x2[lastIdx]) + integralJ;
    }

    return 0;
}

// ─── Верификация (ПЗ раздел 3.4) ─────────────────────────────────────────────
/**
 * Запускает два тест-кейса из ПЗ.
 * Вызывается при загрузке страницы из ui.js.
 * Результаты выводятся в консоль: [OK] или [FAIL]
 */
export function runVerification() {
  const solver = new RK4Solver();
  const results = {};

  // ── Тест 1 (ПЗ 3.4): u=+1, v=-1, x1(0)=0, x2(0)=3 ──────────────────────
  // Аналитическое решение: x1(t)=t, x2(t)=3-t, T*=1.5
  // Погрешность: |T*_num - 1.5| <= 2*h
  try {
    const h = 0.01;
    const T = 5;
    const N = Math.ceil(T / h) + 1;
    const uArr = new Float64Array(N).fill(1);   // u = +1
    const vArr = new Float64Array(N).fill(-1);  // v = -1

    const config = {
      f1: (x1, x2, u, v, t) => u,
      f2: (x1, x2, u, v, t) => v,
      x10: 0, x20: 3,
      uMin: -1, uMax: 1,
      vMin: -1, vMax: 1,
      h, T,
      epsilon: 1e-6,
      functional: 'terminal',
      Phi: (x1, x2) => Math.abs(x1 - x2),
      K: () => 0,
      exitRegion: null,
    };

    const result = solver.solveSync(config, uArr, vArr);
    const expected = 1.5;
    const tolerance = 2 * h;
    const err = Math.abs((result.captureTime ?? Infinity) - expected);
    const passed = err <= tolerance;

    results.test1 = { passed, error: err, expected, got: result.captureTime };
    console.log(
      passed
        ? `[OK]   RK4 test 1: captureTime=${result.captureTime?.toFixed(4)}, err=${err.toFixed(6)}`
        : `[FAIL] RK4 test 1: captureTime=${result.captureTime}, err=${err}, tolerance=${tolerance}`
    );
  } catch (e) {
    results.test1 = { passed: false, error: e.message };
    console.error('[FAIL] RK4 test 1 exception:', e.message);
  }

  // ── Тест 2 (ПЗ 3.4): f1=u, u=const=2, x1(0)=0 → x1(t)=2t ──────────────
  // Относительная погрешность < 1e-3 при h=0.01
  try {
    const h = 0.01;
    const T = 5;
    const N = Math.ceil(T / h) + 1;
    const uConst = 2;
    const uArr = new Float64Array(N).fill(uConst);
    const vArr = new Float64Array(N).fill(0);

    const config = {
      f1: (x1, x2, u, v, t) => u,
      f2: (x1, x2, u, v, t) => 0,
      x10: 0, x20: 0,
      uMin: -3, uMax: 3,
      vMin: -1, vMax: 1,
      h, T,
      epsilon: 1e-6,
      functional: 'terminal',
      Phi: (x1, x2) => 0,
      K: () => 0,
      exitRegion: null,
    };

    const result = solver.solveSync(config, uArr, vArr);

    // Считаем максимальную относительную погрешность
    let maxRelErr = 0;
    for (let i = 1; i < result.N; i++) {
      const exact = uConst * result.t[i];  // x1(t) = 2t
      if (Math.abs(exact) > 1e-10) {
        const relErr = Math.abs(result.x1[i] - exact) / Math.abs(exact);
        if (relErr > maxRelErr) maxRelErr = relErr;
      }
    }

    const passed = maxRelErr < 1e-3;
    results.test2 = { passed, maxRelErr };
    console.log(
      passed
        ? `[OK]   RK4 test 2: maxRelErr=${maxRelErr.toExponential(3)}`
        : `[FAIL] RK4 test 2: maxRelErr=${maxRelErr.toExponential(3)} (должно быть < 1e-3)`
    );
  } catch (e) {
    results.test2 = { passed: false, error: e.message };
    console.error('[FAIL] RK4 test 2 exception:', e.message);
  }

  return results;
}
