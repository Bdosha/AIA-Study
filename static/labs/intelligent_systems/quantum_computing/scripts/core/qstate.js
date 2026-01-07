// scripts/core/qstate.js
import { C, ZERO, ONE, Complex } from './complex.js';
import { normalizeState, apply1Q, apply2Q, applyCNOT } from './linalg.js';

export class QState {
  constructor(numQubits = 1) {
    if (numQubits < 1) throw new Error('QState: numQubits >= 1');
    this.n = numQubits;
    const N = 1 << numQubits;
    this.psi = Array.from({ length: N }, (_, i) => (i === 0 ? ONE : ZERO));
  }

  clone() {
    const q = new QState(this.n);
    q.psi = this.psi.slice();
    return q;
  }

  renorm() { this.psi = normalizeState(this.psi); }

  apply1(U, target) {
    this.psi = apply1Q(this.psi, this.n, U, target);
    this.renorm();
  }

  apply2(U, q1, q2) {
    this.psi = apply2Q(this.psi, this.n, U, q1, q2);
    this.renorm();
  }

  applyCNOT(control, target) {
    this.psi = applyCNOT(this.psi, this.n, control, target);
    this.renorm();
  }

  probabilities() {
    return this.psi.map(a => Complex.abs2(a));
  }

  measureAll(random = Math.random) {
    const probs = this.probabilities();
    let r = random();
    let acc = 0, outcome = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      if (r <= acc) { outcome = i; break; }
    }
    // collapse to |outcome>
    this.psi = this.psi.map((_, i) => (i === outcome ? ONE : ZERO));
    return outcome; // integer 0..2^n-1
  }

  measureAt(target, random = Math.random) {
    const bit = 1 << (this.n - 1 - target);
    let p1 = 0;
    for (let i = 0; i < this.psi.length; i++) if (i & bit) p1 += this.psi[i].re*this.psi[i].re + this.psi[i].im*this.psi[i].im;
    const r = random();
    const m = (r < p1) ? 1 : 0;
    const keepMask = m ? bit : 0;
    const newPsi = this.psi.map((a, i) => ( (i & bit) === keepMask ? a : ZERO ));
    this.psi = normalizeState(newPsi);
    return m;
  }
}
