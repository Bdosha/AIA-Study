// scripts/core/linalg.js
import { Complex, C, ZERO, ONE } from './complex.js';

// Matrix/Vector are JS arrays of Complex, with row-major 2D for matrices: M[r][c]
// No classes to keep it tree-shakeable & simple.

export const eye = (dim) => {
  const M = Array.from({ length: dim }, (_, r) =>
    Array.from({ length: dim }, (_, c) => (r === c ? ONE : ZERO)));
  return M;
};

export const matmul = (A, B) => {
  const R = A.length, K = A[0].length, Cn = B[0].length;
  const out = Array.from({ length: R }, () => Array.from({ length: Cn }, () => ZERO));
  for (let r = 0; r < R; r++) {
    for (let k = 0; k < K; k++) {
      const a = A[r][k];
      if (a === ZERO || (a.re === 0 && a.im === 0)) continue;
      for (let c = 0; c < Cn; c++) {
        const acc = out[r][c];
        out[r][c] = Complex.add(acc, Complex.mul(a, B[k][c]));
      }
    }
  }
  return out;
};

export const vecmul = (M, v) => {
  const R = M.length, K = M[0].length;
  const out = Array.from({ length: R }, () => ZERO);
  for (let r = 0; r < R; r++) {
    let sum = ZERO;
    for (let k = 0; k < K; k++) {
      sum = Complex.add(sum, Complex.mul(M[r][k], v[k]));
    }
    out[r] = sum;
  }
  return out;
};

export const tensor = (A, B) => {
  // Kronecker product
  const rA = A.length, cA = A[0].length;
  const rB = B.length, cB = B[0].length;
  const out = Array.from({ length: rA * rB }, () => Array.from({ length: cA * cB }, () => ZERO));
  for (let i = 0; i < rA; i++) for (let j = 0; j < cA; j++) {
    const a = A[i][j];
    for (let k = 0; k < rB; k++) for (let l = 0; l < cB; l++) {
      out[i * rB + k][j * cB + l] = Complex.mul(a, B[k][l]);
    }
  }
  return out;
};

export const kronN = (mats) => mats.reduce((acc, m) => tensor(acc, m));

// --- State helpers ---

export const normalizeState = (psi) => {
  let norm = 0;
  for (const amp of psi) norm += Complex.abs2(amp);
  norm = Math.sqrt(norm);
  if (norm === 0) return psi.slice();
  return psi.map(a => Complex.scale(a, 1 / norm));
};

// Apply 1-qubit U (2x2) to |psi> of n qubits on target t (0-based from left: q0 is most-significant bit)
export const apply1Q = (psi, nQ, U, t) => {
  const N = 1 << nQ;
  const bit = 1 << (nQ - 1 - t); // position from MSB
  const out = psi.slice();
  for (let i = 0; i < N; i += (bit << 1)) {
    for (let j = 0; j < bit; j++) {
      const idx0 = i + j;         // target bit = 0
      const idx1 = idx0 + bit;    // target bit = 1
      const a0 = psi[idx0], a1 = psi[idx1];
      out[idx0] = Complex.add(Complex.mul(U[0][0], a0), Complex.mul(U[0][1], a1));
      out[idx1] = Complex.add(Complex.mul(U[1][0], a0), Complex.mul(U[1][1], a1));
    }
  }
  return out;
};

// Apply CNOT efficiently (control c, target t)
export const applyCNOT = (psi, nQ, c, t) => {
  const N = 1 << nQ;
  const bitC = 1 << (nQ - 1 - c);
  const bitT = 1 << (nQ - 1 - t);
  const out = psi.slice();
  for (let i = 0; i < N; i++) {
    if (i & bitC) {
      const idx0 = i & ~bitT;
      const idx1 = idx0 | bitT;
      out[idx0] = psi[idx1];
      out[idx1] = psi[idx0];
    }
  }
  return out;
};

// Apply 2-qubit U (4x4) to qubits q1<q2 by building pairs (00,01,10,11) blocks
export const apply2Q = (psi, nQ, U, q1, q2) => {
  if (q1 === q2) throw new Error('apply2Q: identical qubits');
  if (q1 > q2) [q1, q2] = [q2, q1];
  const N = 1 << nQ;
  const b1 = 1 << (nQ - 1 - q1);
  const b2 = 1 << (nQ - 1 - q2);
  const out = psi.slice();

  for (let base = 0; base < N; base++) {
    // Only process canonical representative (bits at q1,q2 are 00)
    if ((base & b1) || (base & b2)) continue;
    const i00 = base;
    const i01 = base | b2;
    const i10 = base | b1;
    const i11 = base | b1 | b2;

    const v00 = psi[i00], v01 = psi[i01], v10 = psi[i10], v11 = psi[i11];

    const r00 = Complex.add(Complex.add(Complex.mul(U[0][0], v00), Complex.mul(U[0][1], v01)),
                            Complex.add(Complex.mul(U[0][2], v10), Complex.mul(U[0][3], v11)));
    const r01 = Complex.add(Complex.add(Complex.mul(U[1][0], v00), Complex.mul(U[1][1], v01)),
                            Complex.add(Complex.mul(U[1][2], v10), Complex.mul(U[1][3], v11)));
    const r10 = Complex.add(Complex.add(Complex.mul(U[2][0], v00), Complex.mul(U[2][1], v01)),
                            Complex.add(Complex.mul(U[2][2], v10), Complex.mul(U[2][3], v11)));
    const r11 = Complex.add(Complex.add(Complex.mul(U[3][0], v00), Complex.mul(U[3][1], v01)),
                            Complex.add(Complex.mul(U[3][2], v10), Complex.mul(U[3][3], v11)));

    out[i00] = r00; out[i01] = r01; out[i10] = r10; out[i11] = r11;
  }
  return out;
};
