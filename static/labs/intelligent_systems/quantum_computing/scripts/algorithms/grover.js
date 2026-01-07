// scripts/algorithms/grover.js
// Автосборка алгоритма Гровера (по умолчанию n=2, N=4, один помеченный элемент)
import { Circuit } from '../core/circuit.js';

// Перевод битовой строки в int, напр. "11" -> 3
const binToInt = (s) => parseInt(s, 2);

export function buildGroverCircuit({ n = 2, marked = ['11'] } = {}) {
  const c = new Circuit(n);
  const stepsExplain = [];

  // Инициализация |0…0⟩ → H^⊗n (слой 0)
  for (let q = 0; q < n; q++) c.addElement({ type: 'H', targets: [q] }, 0);
  stepsExplain.push('Инициализация |0…0⟩ и применение H^⊗n: равномерная суперпозиция');

  // Оптимальное число итераций: k ≈ ⌊π/4 * √(N/M)⌋
  const N = 1 << n;
  const M = marked.length;
  const k = Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(N / M)));
  stepsExplain.push(`Число итераций Гровера: k = ${k}`);

  const markedInts = marked.map(binToInt);

  for (let it = 0; it < k; it++) {
    // Оракул: инвертирует фазу отмеченных состояний (виртуальный элемент U_FULL)
    c.addElement({ type: 'U_FULL', marked: markedInts }, 1 + 2 * it);
    stepsExplain.push(`Итерация ${it + 1}: Оракул — инвертирует фазу отмеченных состояний`);

    // Диффузор: D = 2|s⟩⟨s| − I (виртуальный элемент DIFFUSER)
    c.addElement({ type: 'DIFFUSER' }, 2 + 2 * it);
    stepsExplain.push('Итерация: Диффузор — инверсия относительно среднего');
  }

  // Измерение всех кубитов (последний слой)
  c.addElement({ type: 'MEASURE-ALL' }, c.layers.length);
  stepsExplain.push('Измерение всех кубитов: получаем помеченное состояние с высокой вероятностью');

  return { circuit: c, stepsExplain };
}
