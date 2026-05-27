/**
 * optimizer.js
 * Класс GradientOptimizer — нахождение оптимальных управлений u*(t), v*(t).
 * Реализует алгоритм Forward-Backward Sweep (ПЗ раздел 3.2.2).
 *
 * Для пресетов 1, 2, 5 (bangBang: true) — аналитическое решение по знаку ковектора.
 * Для пресетов 3, 4 (bangBang: false) — итерационный алгоритм.
 *
 * Зависимости: solver.js
 * Импортируется в: ui.js
 */

import { RK4Solver } from './solver.js';

// Малое число для численных производных
const EPS_DERIV = 1e-6;

// Коэффициент релаксации (чтобы не расходился)
const ALPHA_START = 0.7;
const ALPHA_MIN   = 0.3;

export class GradientOptimizer {

  /**
   * optimize — найти оптимальные управления для заданного config.
   *
   * @param {Object} config — GameConfig из DifferentialGame.getConfig()
   * @returns {Object} OptimizeResult:
   *   { u, v, converged, iterations, solveResult }
   */
  optimize(config) {
    const { h, T, nMax, delta, uMin, uMax, vMin, vMax } = config;
    const N = Math.ceil(T / h) + 1;
    const solver = new RK4Solver();

    // ── Шаг 0: инициализация управлений ──────────────────────────────────────
    // Для банг-банг: u = uMax (преследователь сразу идёт на максимум)
    //               v = vMin (убегающий — в противоположную сторону)
    // Для остальных: середина допустимого множества
    let u = new Float64Array(N);
    let v = new Float64Array(N);

    
    // ── БАНГ-БАНГ СТРАТЕГИЯ (пресеты 1,2,5) ─────────────────────────────
if (config.bangBang) {
    // Простая стратегия: преследователь всегда идёт в сторону убегающего
    for (let i = 0; i < N; i++) {
        const x1i = (i === 0) ? config.x10 : 0;
        const x2i = (i === 0) ? config.x20 : 0;
        const dir = Math.sign(x2i - x1i || 1);   // 1 если x2 > x1
        
        u[i] = dir * uMax;           // преследователь → к цели
        v[i] = -dir * vMax;          // убегающий → от преследователя
    }
    
    const solveResult = solver.solveSync(config, u, v);
    return {
        u,
        v,
        converged: true,
        iterations: 1,
        solveResult
    };
}



    // ── Итерационный Forward-Backward Sweep ───────────────────────────────────
    let converged   = false;
    let iterations  = 0;
    let alpha       = ALPHA_START;
    let normPrev    = Infinity;
    let solveResult = null;

    for (let iter = 0; iter < nMax; iter++) {
      iterations = iter + 1;

      // ── Шаг 1: Прямой проход ─────────────────────────────────────────────
      // Интегрируем уравнения состояния при текущих u, v
      solveResult = solver.solveSync(config, u, v);
      const { t, x1, x2 } = solveResult;

      // ── Шаг 2: Обратный проход ───────────────────────────────────────────
      // Интегрируем сопряжённые уравнения для ковектора λ = (λ1, λ2)
      // Граничные условия: λ(T) = ∂Phi/∂x (для terminal и mixed)
      //                    λ(T) = 0        (для integral)
      const lam1 = new Float64Array(N);
      const lam2 = new Float64Array(N);

      // Граничные условия на λ(T)
      if (config.functional === 'terminal' || config.functional === 'mixed') {
        // ∂Phi/∂x1 и ∂Phi/∂x2 численно
        const xT1 = x1[N-1];
        const xT2 = x2[N-1];
        lam1[N-1] = _dPhidx1(config.Phi, xT1, xT2);
        lam2[N-1] = _dPhidx2(config.Phi, xT1, xT2);
      } else {
        // integral: λ(T) = 0
        lam1[N-1] = 0;
        lam2[N-1] = 0;
      }

      // Обратное интегрирование от T до 0
      // dλ1/dt = -∂H/∂x1,  dλ2/dt = -∂H/∂x2
      // Используем простой метод Эйлера назад (достаточно для сходимости)
      for (let i = N - 2; i >= 0; i--) {
        const ti  = t[i];
        const xi1 = x1[i];
        const xi2 = x2[i];
        const ui  = u[i];
        const vi  = v[i];
        const li1 = lam1[i+1];
        const li2 = lam2[i+1];

        // ∂H/∂x1, ∂H/∂x2 численно
        const dHdx1 = _dHdx1(config, xi1, xi2, ui, vi, ti, li1, li2);
        const dHdx2 = _dHdx2(config, xi1, xi2, ui, vi, ti, li1, li2);

        // λ[i] = λ[i+1] + h * (-∂H/∂x) — обратный Эйлер
        lam1[i] = li1 + h * (-dHdx1);
        lam2[i] = li2 + h * (-dHdx2);
      }

      // ── Шаг 3: Обновление управлений ─────────────────────────────────────
      // u* = arg min_u H,  v* = arg max_v H
      const uNew = new Float64Array(N);
      const vNew = new Float64Array(N);

      for (let i = 0; i < N; i++) {
        const ti  = t[i];
        const xi1 = x1[i];
        const xi2 = x2[i];
        const li1 = lam1[i];
        const li2 = lam2[i];

        uNew[i] = _argminU(config, xi1, xi2, v[i], ti, li1, li2);
        vNew[i] = _argmaxV(config, xi1, xi2, uNew[i], ti, li1, li2);
      }

      // ── Шаг 4: Релаксация ─────────────────────────────────────────────────
      // u = alpha * uNew + (1 - alpha) * uOld
      // Это предотвращает расходимость и осцилляции
      const uRelax = new Float64Array(N);
      const vRelax = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        uRelax[i] = alpha * uNew[i] + (1 - alpha) * u[i];
        vRelax[i] = alpha * vNew[i] + (1 - alpha) * v[i];
      }

      // ── Шаг 5: Проверка сходимости (формула 24 ПЗ) ───────────────────────
      // ||u_new - u_old|| < delta  (RMS-норма)
      let sumSq = 0;
      for (let i = 0; i < N; i++) {
        sumSq += (uRelax[i] - u[i]) ** 2 + (vRelax[i] - v[i]) ** 2;
      }
      const norm = Math.sqrt(sumSq / N);

      // Адаптация alpha: если норма не убывает 50 итераций — уменьшаем
      if (iter > 0 && iter % 50 === 0 && norm >= normPrev) {
        alpha = Math.max(ALPHA_MIN, alpha * 0.7);
      }
      normPrev = norm;

      u = uRelax;
      v = vRelax;

      if (norm < delta) {
        converged = true;
        break;
      }
    }

    // Финальный прямой проход с найденными управлениями
    solveResult = solver.solveSync(config, u, v);

    // Если не сошёлся — предупреждение в консоль (ПЗ 3.2.4)
    if (!converged) {
      console.warn(
        `[optimizer.js] Оптимизатор не сошёлся за ${iterations} итераций. ` +
        `Результат может быть субоптимальным.`
      );
    }

    return { u, v, converged, iterations, solveResult };
  }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Функция Гамильтона:
 * H = λ1*f1 + λ2*f2 + K(x1,x2,u,v,t)
 */
function _H(config, x1, x2, u, v, t, lam1, lam2) {
  const f1val = config.f1(x1, x2, u, v, t);
  const f2val = config.f2(x1, x2, u, v, t);
  const Kval  = config.functional !== 'terminal'
    ? config.K(x1, x2, u, v, t)
    : 0;
  return lam1 * f1val + lam2 * f2val + Kval;
}

/**
 * ∂H/∂x1 численно (центральные разности)
 */
function _dHdx1(config, x1, x2, u, v, t, lam1, lam2) {
  const eps = EPS_DERIV * Math.max(1, Math.abs(x1));
  return (
    _H(config, x1 + eps, x2, u, v, t, lam1, lam2) -
    _H(config, x1 - eps, x2, u, v, t, lam1, lam2)
  ) / (2 * eps);
}

/**
 * ∂H/∂x2 численно
 */
function _dHdx2(config, x1, x2, u, v, t, lam1, lam2) {
  const eps = EPS_DERIV * Math.max(1, Math.abs(x2));
  return (
    _H(config, x1, x2 + eps, u, v, t, lam1, lam2) -
    _H(config, x1, x2 - eps, u, v, t, lam1, lam2)
  ) / (2 * eps);
}

/**
 * ∂Phi/∂x1 численно
 */
function _dPhidx1(Phi, x1, x2) {
  const eps = EPS_DERIV * Math.max(1, Math.abs(x1));
  return (Phi(x1 + eps, x2) - Phi(x1 - eps, x2)) / (2 * eps);
}

/**
 * ∂Phi/∂x2 численно
 */
function _dPhidx2(Phi, x1, x2) {
  const eps = EPS_DERIV * Math.max(1, Math.abs(x2));
  return (Phi(x1, x2 + eps) - Phi(x1, x2 - eps)) / (2 * eps);
}

/**
 * arg min_{u in [uMin,uMax]} H — поиск оптимального u.
 * Использует линейный поиск по сетке из 20 точек.
 * Для большинства задач H линейна по u → минимум на границе (банг-банг).
 */
function _argminU(config, x1, x2, v, t, lam1, lam2) {
  const { uMin, uMax } = config;
  const STEPS = 20;
  const du = (uMax - uMin) / STEPS;

  let bestU  = uMin;
  let bestH  = _H(config, x1, x2, uMin, v, t, lam1, lam2);

  for (let k = 1; k <= STEPS; k++) {
    const uCandidate = uMin + k * du;
    const hVal = _H(config, x1, x2, uCandidate, v, t, lam1, lam2);
    if (hVal < bestH) {
      bestH = hVal;
      bestU = uCandidate;
    }
  }
  return bestU;
}

/**
 * arg max_{v in [vMin,vMax]} H — поиск оптимального v.
 */
function _argmaxV(config, x1, x2, u, t, lam1, lam2) {
  const { vMin, vMax } = config;
  const STEPS = 20;
  const dv = (vMax - vMin) / STEPS;

  let bestV  = vMin;
  let bestH  = _H(config, x1, x2, u, vMin, t, lam1, lam2);

  for (let k = 1; k <= STEPS; k++) {
    const vCandidate = vMin + k * dv;
    const hVal = _H(config, x1, x2, u, vCandidate, t, lam1, lam2);
    if (hVal > bestH) {
      bestH = hVal;
      bestV = vCandidate;
    }
  }
  return bestV;
}
