// scripts/presets/list.js
import { Circuit } from '../core/circuit.js';
import { buildDeutschCircuit } from '../algorithms/deutsch.js';
import { buildGroverCircuit } from '../algorithms/grover.js';

export const presets = [
  {
    id: 'h-on-zero',
    title: 'Hadamard |0⟩',
    build() {
      const c = new Circuit(1);
      c.addElement({ type: 'H', targets: [0] }, 0);
      return { circuit: c, stepsExplain: ['H на |0⟩ даёт суперпозицию (|0⟩+|1⟩)/√2'] };
    }
  },
  {
    id: 'bell',
    title: 'Пара Белла',
    build() {
      const c = new Circuit(2);
      c.addElement({ type: 'H', targets: [0] }, 0);
      c.addElement({ type: 'CNOT', control: 0, targets: [1] }, 1);
      return { circuit: c, stepsExplain: ['H на q0', 'CNOT q0→q1: создаётся состояние Белла'] };
    }
  },
  {
    id: 'deutsch-balanced',
    title: 'Дойч (balanced)',
    build() { return buildDeutschCircuit('balanced'); }
  },
  {
    id: 'deutsch-const0',
    title: 'Дойч (constant-0)',
    build() { return buildDeutschCircuit('constant-0'); }
  },
  {
    id: 'deutsch-const1',
    title: 'Дойч (constant-1)',
    build() { return buildDeutschCircuit('constant-1'); }
  },
  {
    id: 'grover-n4',
    title: 'Гровер N=4 (метка 11)',
    build() { return buildGroverCircuit({ n: 2, marked: ['11'] }); }
  }
];
