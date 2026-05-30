(function (root) {
  'use strict';

  const { clamp, pointSaddleViolation, findGridSaddles } = root.GridTools;

  function finiteDifferenceGradient(fn, x, y, bounds) {
    const hx = Math.max(1e-6, (bounds.xMax - bounds.xMin) * 1e-6);
    const hy = Math.max(1e-6, (bounds.yMax - bounds.yMin) * 1e-6);

    const xLeft = clamp(x - hx, bounds.xMin, bounds.xMax);
    const xRight = clamp(x + hx, bounds.xMin, bounds.xMax);
    const yDown = clamp(y - hy, bounds.yMin, bounds.yMax);
    const yUp = clamp(y + hy, bounds.yMin, bounds.yMax);

    const dxDen = Math.max(1e-15, xRight - xLeft);
    const dyDen = Math.max(1e-15, yUp - yDown);

    return {
      dx: (fn(xRight, y) - fn(xLeft, y)) / dxDen,
      dy: (fn(x, yUp) - fn(x, yDown)) / dyDen
    };
  }

  function createInitialState(options) {
    const projected = root.InputValidation.projectInitialPoint(options.x0, options.y0, options.bounds);
    const value = options.fn(projected.x, projected.y);
    return {
      x: projected.x,
      y: projected.y,
      iteration: 0,
      residual: Infinity,
      value,
      warnings: projected.warnings
    };
  }

  function projectedGradientStep(state, options) {
    const { fn, bounds, alpha } = options;
    const grad = finiteDifferenceGradient(fn, state.x, state.y, bounds);

    // x - минимизирующий игрок, y - максимизирующий игрок.
    const proposedX = state.x - alpha * grad.dx;
    const proposedY = state.y + alpha * grad.dy;
    const nextX = clamp(proposedX, bounds.xMin, bounds.xMax);
    const nextY = clamp(proposedY, bounds.yMin, bounds.yMax);

    // Эффективный остаток после проекции: если проекция не двигается, значит направление упёрлось в границу.
    const movement = Math.hypot(nextX - state.x, nextY - state.y);

    return {
      x: nextX,
      y: nextY,
      iteration: state.iteration + 1,
      residual: movement,
      value: fn(nextX, nextY),
      grad
    };
  }

  function selectNearestCandidate(candidates, reference) {
    if (!candidates.length) return null;
    let best = candidates[0];
    let bestDistance = Infinity;
    for (const candidate of candidates) {
      const distance = Math.hypot(candidate.x - reference.x, candidate.y - reference.y);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  }

  function analyseFinal(options, state, trajectory, residuals, stoppedByUser = false) {
    const { fn, bounds, eps, gridDensity, importantX = [], importantY = [], x0, y0 } = options;
    const gameTolerance = Math.max(1e-8, eps * 0.1);
    const pointTolerance = Math.max(1e-4, eps * 50);

    // Для негладких и диагональных функций важно, чтобы особые значения попадали в обе оси.
    const xAxisImportant = [state.x, state.y, x0, y0, ...importantX, ...importantY];
    const yAxisImportant = [state.x, state.y, x0, y0, ...importantX, ...importantY];

    const saddleSearch = findGridSaddles(
      fn,
      bounds,
      gridDensity,
      xAxisImportant,
      yAxisImportant,
      gameTolerance
    );
    const game = saddleSearch.analysis;
    const hasPureSaddle = Math.abs(game.gap) <= gameTolerance;

    let acceptedPoint = { x: state.x, y: state.y, value: state.value };
    let usedGlobalCandidate = false;
    let status = stoppedByUser ? 'Остановлено пользователем.' : 'Критерий остановки достигнут.';

    const rawPointCheck = pointSaddleViolation(fn, state.x, state.y, bounds, gridDensity, xAxisImportant, yAxisImportant);

    if (hasPureSaddle) {
      if (rawPointCheck.violation <= pointTolerance && Math.abs(state.value - game.upper) <= pointTolerance) {
        status = stoppedByUser
          ? 'Остановлено пользователем. Текущая точка проходит глобальную проверку.'
          : 'Критерий остановки достигнут.';
      } else {
        const nearest = selectNearestCandidate(saddleSearch.candidates, { x: state.x, y: state.y });
        if (nearest) {
          acceptedPoint = nearest;
          usedGlobalCandidate = true;
          status = stoppedByUser
            ? 'Остановлено пользователем. Седловая точка уточнена глобальной проверкой.'
            : 'Локальная точка проверена глобально; найдена седловая точка.';
        } else {
          status = 'Минимаксный разрыв близок к нулю, но седловая точка не выделена. Увеличьте плотность сетки.';
        }
      }
    } else {
      status = `Седловая точка в чистых стратегиях не обнаружена. Минимаксный разрыв: ${formatFixed(game.gap, 4)}.`;
    }

    const pointCheck = pointSaddleViolation(fn, acceptedPoint.x, acceptedPoint.y, bounds, gridDensity, xAxisImportant, yAxisImportant);
    const finalResidual = hasPureSaddle ? pointCheck.violation : Math.abs(game.gap);

    return {
      state,
      acceptedPoint,
      trajectory,
      residuals,
      game,
      pointCheck,
      rawPointCheck,
      hasPureSaddle,
      usedGlobalCandidate,
      status,
      finalResidual,
      stoppedByUser
    };
  }

  function solveGame(options) {
    let state = createInitialState(options);
    const trajectory = [{ x: state.x, y: state.y, value: state.value }];
    const residuals = [];

    for (let k = 0; k < options.maxIter; k += 1) {
      state = projectedGradientStep(state, options);
      trajectory.push({ x: state.x, y: state.y, value: state.value });
      residuals.push(state.residual);
      if (state.residual <= options.eps) break;
    }

    return analyseFinal(options, state, trajectory, residuals, false);
  }

  function formatFixed(value, digits = 4) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < 0.5 * 10 ** -digits) return (0).toFixed(digits);
    return value.toFixed(digits);
  }

  root.GameSolver = {
    finiteDifferenceGradient,
    createInitialState,
    projectedGradientStep,
    analyseFinal,
    solveGame,
    formatFixed
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.GameSolver;
  }
})(typeof window !== 'undefined' ? window : globalThis);
