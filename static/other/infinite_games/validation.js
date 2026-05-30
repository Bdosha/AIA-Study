(function (root) {
  'use strict';

  function parseNumber(value, label) {
    const parsed = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      throw new Error(`Некорректное числовое значение: ${label}.`);
    }
    return parsed;
  }

  function parsePositive(value, label) {
    const parsed = parseNumber(value, label);
    if (!(parsed > 0)) {
      throw new Error(`${label} должно быть положительным числом.`);
    }
    return parsed;
  }

  function parsePositiveInteger(value, label, minValue = 1) {
    const parsed = Math.floor(parseNumber(value, label));
    if (!(parsed >= minValue)) {
      throw new Error(`${label} должно быть целым числом не меньше ${minValue}.`);
    }
    return parsed;
  }

  function validateBounds(bounds) {
    if (!(bounds.xMin < bounds.xMax)) throw new Error('Должно выполняться x min < x max.');
    if (!(bounds.yMin < bounds.yMax)) throw new Error('Должно выполняться y min < y max.');
  }

  function projectInitialPoint(x0, y0, bounds) {
    const x = root.GridTools.clamp(x0, bounds.xMin, bounds.xMax);
    const y = root.GridTools.clamp(y0, bounds.yMin, bounds.yMax);
    const warnings = [];
    if (Math.abs(x - x0) > 1e-12) {
      warnings.push(`x₀ был вне области и спроецирован в ${root.GameSolver ? root.GameSolver.formatFixed(x, 4) : x}.`);
    }
    if (Math.abs(y - y0) > 1e-12) {
      warnings.push(`y₀ был вне области и спроецирован в ${root.GameSolver ? root.GameSolver.formatFixed(y, 4) : y}.`);
    }
    return { x, y, warnings };
  }

  root.InputValidation = {
    parseNumber,
    parsePositive,
    parsePositiveInteger,
    validateBounds,
    projectInitialPoint
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.InputValidation;
  }
})(typeof window !== 'undefined' ? window : globalThis);
