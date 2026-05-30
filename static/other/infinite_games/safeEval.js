(function (root) {
  'use strict';

  const FUNCTION_NAMES = new Set([
    'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh',
    'cbrt', 'ceil', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'hypot', 'log',
    'log10', 'log1p', 'log2', 'max', 'min', 'pow', 'round', 'sign', 'sin',
    'sinh', 'sqrt', 'tan', 'tanh', 'trunc'
  ]);

  const CONSTANTS = new Set(['PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT1_2', 'SQRT2']);

  function normalizeExpression(raw) {
    return String(raw || '')
      .replace(/,/g, '.')
      .replace(/\^/g, '**')
      .replace(/\bπ\b/g, 'PI')
      .trim();
  }

  function validateExpression(expr) {
    if (!expr) throw new Error('Функция выигрыша не задана.');

    const withoutStrings = expr.replace(/(['"`]).*?\1/g, '');
    const forbiddenPattern = /[;{}\[\]\\]|=>|\bnew\b|\bthis\b|\bwindow\b|\bdocument\b|\bglobalThis\b|\bglobal\b|\bprocess\b|\brequire\b|\bimport\b|\bFunction\b|\beval\b|\bconstructor\b|__proto__/;
    if (forbiddenPattern.test(withoutStrings)) {
      throw new Error('В выражении найдена недопустимая конструкция.');
    }

    const ids = withoutStrings.match(/[A-Za-z_]\w*/g) || [];
    for (const id of ids) {
      if (id === 'x' || id === 'y') continue;
      if (FUNCTION_NAMES.has(id) || CONSTANTS.has(id) || id === 'Math') continue;
      throw new Error(`Недопустимое имя в выражении: ${id}`);
    }
  }

  function compileExpression(raw) {
    const expr = normalizeExpression(raw);
    validateExpression(expr);

    const mathBindings = [...FUNCTION_NAMES, ...CONSTANTS]
      .map((name) => `const ${name}=Math.${name};`)
      .join('');

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'x',
      'y',
      `${mathBindings} const value = (${expr}); if (!Number.isFinite(value)) { throw new Error('Значение функции не является конечным числом.'); } return value;`
    );

    // Быстрая пробная проверка синтаксиса и конечности значения.
    fn(0, 0);

    return function evaluate(x, y) {
      const value = fn(Number(x), Number(y));
      if (!Number.isFinite(value)) throw new Error('Значение функции не является конечным числом.');
      return value;
    };
  }

  root.SafeEval = { compileExpression, normalizeExpression, validateExpression };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SafeEval;
  }
})(typeof window !== 'undefined' ? window : globalThis);
