// scripts/core/partialTrace.js
import { C } from './complex.js';

// Return 2x2 reduced density matrix for single target qubit in pure state |psi>
export function reducedDensityOfQubit(psi, nQ, target) {
  const N = 1 << nQ;
  const b = 1 << (nQ - 1 - target);
  // rho = [[a,b],[b*, d]]
  let a = 0, d = 0; // real
  let br = 0, bi = 0; // complex b = br + i bi

  for (let i = 0; i < N; i += (b << 1)) {
    for (let j = 0; j < b; j++) {
      const i0 = i + j;
      const i1 = i0 + b;
      const p0 = psi[i0]; const p1 = psi[i1];
      // a += |p0|^2, d += |p1|^2
      a += p0.re*p0.re + p0.im*p0.im;
      d += p1.re*p1.re + p1.im*p1.im;
      // b += p0 * p1*
      br += p0.re*p1.re + p0.im*p1.im;
      bi += p0.im*p1.re - p0.re*p1.im;
    }
  }
  return [
    [C(a,0), C(br, bi)],
    [C(br, -bi), C(d,0)]
  ];
}

// Bloch vector from 2x2 density matrix rho
export function blochVectorFromRho(rho) {
  const rho00 = rho[0][0].re;
  const rho11 = rho[1][1].re;
  const rho01 = rho[0][1]; // complex
  const x = 2 * rho01.re;
  const y = -2 * rho01.im;
  const z = rho00 - rho11;
  return { x, y, z };
}

// Convenience: compute Bloch vector for target qubit given pure state
export function blochVector(psi, nQ, target = 0) {
  const rho = reducedDensityOfQubit(psi, nQ, target);
  return blochVectorFromRho(rho);
}
