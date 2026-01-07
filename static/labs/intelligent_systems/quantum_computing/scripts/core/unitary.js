// scripts/core/unitary.js
// Построение унитарной матрицы всей схемы и выгрузка CSV (разрежённо)
import { Complex, C, ONE, ZERO } from './complex.js';
import { eye, matmul } from './linalg.js';
import { I, H, X, Y, Z, S, T } from './gates.js';

/** Кронекер-подъём однокубитного оператора U2 (2x2) на весь регистр из n кубитов, цель — qubit (0..n-1, слева направо). */
function expand1Q(n, qubit, U2) {
  // Соберём как тензорное произведение: I ⊗ ... ⊗ U2 ⊗ ... ⊗ I
  const tensor = (A, B) => {
    const rA = A.length, cA = A[0].length;
    const rB = B.length, cB = B[0].length;
    const out = Array.from({ length: rA * rB }, () => Array.from({ length: cA * cB }, () => ZERO));
    for (let i = 0; i < rA; i++) for (let j = 0; j < cA; j++) {
      const a = A[i][j];
      for (let k = 0; k < rB; k++) for (let l = 0; l < cB; l++) {
        out[i*rB + k][j*cB + l] = Complex.mul(a, B[k][l]);
      }
    }
    return out;
  };

  let out = null;
  for (let q = 0; q < n; q++) {
    const m = (q === qubit) ? U2 : I();
    out = out ? tensor(out, m) : m;
  }
  return out;
}

/** Построить глобальный CNOT (n кубитов) с управлением control и целью target. */
function expandCNOT(n, control, target) {
  const N = 1 << n;
  const M = Array.from({ length: N }, () => Array.from({ length: N }, () => ZERO));
  const ctlBit = 1 << (n - 1 - control);
  const tgtBit = 1 << (n - 1 - target);
  for (let i = 0; i < N; i++) {
    const ctl1 = (i & ctlBit) !== 0;
    const j = ctl1 ? (i ^ tgtBit) : i; // инвертировать только целевой бит, если control==1
    M[j][i] = ONE;
  }
  return M;
}

/** Диффузор D = 2|s><s| - I_N для N=2^n */
function buildDiffuser(n) {
  const N = 1 << n;
  const s = 1 / Math.sqrt(N);
  const I_N = eye(N);
  // |s><s| — матрица из s^2
  const P = Array.from({ length: N }, () => Array.from({ length: N }, () => C(s*s, 0)));
  const twoP = P.map(row => row.map(x => Complex.scale(x, 2)));
  const out = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => Complex.sub(twoP[r][c], I_N[r][c]))
  );
  return out;
}

/** Оракул фазы: диагональная матрица +1, а для помеченных индексов — -1. marked — массив чисел [0..N-1]. */
function buildPhaseOracle(n, marked = []) {
  const N = 1 << n;
  const M = eye(N);
  for (const idx of marked || []) {
    if (idx >=0 && idx < N) M[idx][idx] = C(-1, 0);
  }
  return M;
}

/** Построить унитар всего слоя (конъюнкция элементов слоя). */
function buildLayerUnitary(n, layer = []) {
  const N = 1 << n;
  let U = eye(N);
  for (const el of layer) {
    let Uel = null;
    switch (el.type) {
      case 'H': Uel = expand1Q(n, el.targets[0], H()); break;
      case 'X': Uel = expand1Q(n, el.targets[0], X()); break;
      case 'Y': Uel = expand1Q(n, el.targets[0], Y()); break;
      case 'Z': Uel = expand1Q(n, el.targets[0], Z()); break;
      case 'S': Uel = expand1Q(n, el.targets[0], S()); break;
      case 'T': Uel = expand1Q(n, el.targets[0], T()); break;
      case 'CNOT': Uel = expandCNOT(n, el.control, el.targets[0]); break;
      case 'DIFFUSER': Uel = buildDiffuser(n); break;
      case 'U_FULL': Uel = buildPhaseOracle(n, el.marked || []); break;
      case 'MEASURE':
      case 'MEASURE-ALL':
        Uel = eye(N); // неунитарные операции игнорируем при построении U
        break;
      default:
        Uel = eye(N);
        break;
    }
    U = matmul(Uel, U); // справа-налево внутри слоя
  }
  return U;
}

/** Итоговый унитар схемы: U_circuit = U(L_{k-1}) ... U(L_0) */
export function buildCircuitUnitary(circuit) {
  const n = circuit.qubits;
  let U = eye(1 << n);
  for (let i = 0; i < circuit.layers.length; i++) {
    const Ulayer = buildLayerUnitary(n, circuit.layers[i]);
    U = matmul(Ulayer, U);
  }
  return U;
}

/** Разрежённый CSV для U: "row,col,re,im" (порог eps) */
export function unitaryToSparseCSV(U, eps = 1e-12) {
  const rows = [];
  for (let r = 0; r < U.length; r++) {
    for (let c = 0; c < U[0].length; c++) {
      const z = U[r][c];
      const mag2 = z.re*z.re + z.im*z.im;
      if (mag2 > eps*eps) rows.push(`${r},${c},${z.re},${z.im}`);
    }
  }
  return ['row,col,re,im', ...rows].join('\n');
}
