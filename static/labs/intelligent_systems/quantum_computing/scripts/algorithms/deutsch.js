// scripts/algorithms/deutsch.js
// Сборка схемы Дойча: constant-0 / constant-1 / balanced
import { Circuit } from '../core/circuit.js';

export function buildDeutschCircuit(type = 'balanced') {
  // Два кубита: q0 — рабочий, q1 — анилла (инициализируем |1>)
  const c = new Circuit(2);
  const stepsExplain = [];

  // Инициализация |01⟩: X на q1 (слой 0)
  c.addElement({ type: 'X', targets: [1] }, 0);
  stepsExplain.push('Инициализация: состояние |01⟩ (X на q1)');

  // H на обоих (слой 1)
  c.addElement({ type: 'H', targets: [0] }, 1);
  c.addElement({ type: 'H', targets: [1] }, 1);
  stepsExplain.push('Применяем H к обоим кубитам: создаём суперпозицию');

  // Оракул (слой 2)
  // balanced: CNOT (q0→q1)
  // constant-1: X на q1
  // constant-0: ничего
  if (type === 'balanced') {
    c.addElement({ type: 'CNOT', control: 0, targets: [1] }, 2);
    stepsExplain.push('Оракул balanced: CNOT (q0→q1)');
  } else if (type === 'constant-1') {
    c.addElement({ type: 'X', targets: [1] }, 2);
    stepsExplain.push('Оракул constant-1: X на q1');
  } else {
    stepsExplain.push('Оракул constant-0: тождественный оператор (ничего не делаем)');
  }

  // H на первом кубите (слой 3)
  c.addElement({ type: 'H', targets: [0] }, 3);
  stepsExplain.push('Применяем H к q0');

  // Измерение q0 (слой 4)
  c.addElement({ type: 'MEASURE', targets: [0] }, 4);
  stepsExplain.push('Измеряем q0: 0 → функция const, 1 → balanced');

  return { circuit: c, stepsExplain };
}
