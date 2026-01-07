/**
 * Утилиты форматирования: комплексные числа, векторы, матрицы.
 */
export function formatComplex(c) {
  // TODO: красиво отформатировать комплексное число c = { re, im }
  const re = c.re.toFixed(3);
  const im = c.im.toFixed(3);
  return `${re} ${im >= 0 ? '+' : '-'} ${Math.abs(im).toFixed(3)}i`;
}

export function formatStateVector(stateVector) {
  // TODO: отформатировать вектор состояния (амплитуды) в бра-кет нотацию
  return stateVector.map((amp, idx) => `(${amp.re.toFixed(2)}+${amp.im.toFixed(2)}i)|${idx}⟩`).join(' + ');
}

export function formatMatrix(matrix) {
  // TODO: отформатировать матрицу в читабельный вид
  return matrix.map(row => row.join('\t')).join('\n');
}
