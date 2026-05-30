(function (root) {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function linspace(min, max, count) {
    const n = Math.max(2, Math.floor(count));
    if (Math.abs(max - min) < 1e-15) return Array.from({ length: n }, () => min);
    return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
  }

  function roundClean(value, digits = 12) {
    if (Math.abs(value) < 1e-12) return 0;
    return Number(value.toFixed(digits));
  }

  function uniqueSorted(values, min, max) {
    const map = new Map();
    for (const value of values) {
      if (!Number.isFinite(value)) continue;
      const clipped = clamp(value, min, max);
      map.set(roundClean(clipped), clipped);
    }
    return [...map.values()].sort((a, b) => a - b);
  }

  function buildGrid(min, max, count, important = []) {
    const base = linspace(min, max, count);
    return uniqueSorted([...base, min, max, (min + max) / 2, ...important], min, max);
  }

  function analyseGrid(fn, bounds, density, importantX = [], importantY = []) {
    const xs = buildGrid(bounds.xMin, bounds.xMax, density, importantX);
    const ys = buildGrid(bounds.yMin, bounds.yMax, density, importantY);
    const z = xs.map((x) => ys.map((y) => fn(x, y)));

    const rowMax = z.map((row) => Math.max(...row));
    const colMin = ys.map((_, j) => Math.min(...xs.map((_, i) => z[i][j])));
    const upper = Math.min(...rowMax);
    const lower = Math.max(...colMin);
    const upperIndex = rowMax.indexOf(upper);
    const lowerIndex = colMin.indexOf(lower);

    return {
      xs,
      ys,
      z,
      rowMax,
      colMin,
      upper,
      lower,
      gap: upper - lower,
      upperPoint: { x: xs[upperIndex], value: upper },
      lowerPoint: { y: ys[lowerIndex], value: lower }
    };
  }

  function nearestIndex(values, target) {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < values.length; i += 1) {
      const distance = Math.abs(values[i] - target);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }

  function pointSaddleViolation(fn, x, y, bounds, density, importantX = [], importantY = []) {
    const xs = buildGrid(bounds.xMin, bounds.xMax, density, [x, ...importantX]);
    const ys = buildGrid(bounds.yMin, bounds.yMax, density, [y, ...importantY]);
    const value = fn(x, y);
    const maxAtX = Math.max(...ys.map((yy) => fn(x, yy)));
    const minAtY = Math.min(...xs.map((xx) => fn(xx, y)));
    return {
      value,
      maxAtX,
      minAtY,
      violation: Math.max(0, maxAtX - value, value - minAtY)
    };
  }

  function findGridSaddles(fn, bounds, density, importantX = [], importantY = [], tolerance = 1e-4) {
    const analysis = analyseGrid(fn, bounds, density, importantX, importantY);
    const candidates = [];

    for (let i = 0; i < analysis.xs.length; i += 1) {
      for (let j = 0; j < analysis.ys.length; j += 1) {
        const value = analysis.z[i][j];
        const isRowMax = Math.abs(value - analysis.rowMax[i]) <= tolerance;
        const isColMin = Math.abs(value - analysis.colMin[j]) <= tolerance;
        const isPrice = Math.abs(value - analysis.upper) <= Math.max(tolerance, Math.abs(analysis.gap) + tolerance);
        if (isRowMax && isColMin && isPrice) {
          candidates.push({ x: analysis.xs[i], y: analysis.ys[j], value });
        }
      }
    }

    return { analysis, candidates };
  }

  root.GridTools = {
    clamp,
    linspace,
    buildGrid,
    analyseGrid,
    pointSaddleViolation,
    findGridSaddles,
    nearestIndex,
    roundClean
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.GridTools;
  }
})(typeof window !== 'undefined' ? window : globalThis);
