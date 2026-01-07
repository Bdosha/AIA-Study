// scripts/core/gates.js
import { C, ZERO, ONE, IUNIT } from './complex.js';

export const I = () => [[ONE, ZERO],[ZERO, ONE]];
export const X = () => [[ZERO, ONE],[ONE, ZERO]];
export const Y = () => [[ZERO, C(0,-1)],[C(0,1), ZERO]];
export const Z = () => [[ONE, ZERO],[ZERO, C(-1,0)]];
export const H = () => {
  const s = 1/Math.sqrt(2);
  return [[C(s,0), C(s,0)], [C(s,0), C(-s,0)]];
};
export const S = () => [[ONE, ZERO],[ZERO, IUNIT]];
export const T = () => [[ONE, ZERO],[ZERO, C(Math.cos(Math.PI/4), Math.sin(Math.PI/4))]];
export const CNOT4 = () => {
  // 4x4 operator in |00>,|01>,|10>,|11| basis with first qubit as control
  return [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ONE],
    [ZERO, ZERO, ONE, ZERO],
  ];
};

// --- Deutsch oracles (2 qubits: q0 control/input, q1 target/ancilla) ---
export const deutschOracle = (type) => {
  // constant-0: do nothing; constant-1: X on target; balanced: CNOT
  switch (type) {
    case 'constant-0': return I(); // identity on target when embedded as controlled-U? In circuit we apply as 2Q op:
    case 'constant-1': return X(); // we'll map this to a 1Q X on the second wire between H's
    case 'balanced':   return null; // for balanced use explicit CNOT step in circuit builder
    default: throw new Error('Unknown Deutsch oracle type');
  }
};

// --- Grover generic pieces ---
export const groverOraclePhase = (numQubits, markedSet /* array of integers [0..2^n-1] */) => {
  const N = 1 << numQubits;
  const M = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => (r === c ? ONE : ZERO)));
  const marked = new Set(markedSet);
  for (let i = 0; i < N; i++) {
    if (marked.has(i)) M[i][i] = C(-1, 0);
  }
  return M;
};

export const groverDiffuser = (numQubits) => {
  const N = 1 << numQubits;
  const s = 1/Math.sqrt(N);
  // |s><s| = (1/N) * J, D = 2|s><s| - I
  const J = Array.from({ length: N }, () => Array.from({ length: N }, () => C(1/N, 0)));
  const Iden = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => (r===c?ONE:ZERO)));
  const twoJ = J.map(row => row.map(x => C(2*x.re, 2*x.im)));
  // twoJ - I
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    twoJ[r][c] = C(twoJ[r][c].re - (r===c?1:0), twoJ[r][c].im);
  }
  return twoJ;
};
