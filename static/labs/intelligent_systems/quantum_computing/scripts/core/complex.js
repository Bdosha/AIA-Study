// scripts/core/complex.js
// Minimal immutable Complex, used across linalg & states.

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
    Object.freeze(this);
  }
  static fromPolar(r, theta) { return new Complex(r * Math.cos(theta), r * Math.sin(theta)); }
  static add(a, b) { return new Complex(a.re + b.re, a.im + b.im); }
  static sub(a, b) { return new Complex(a.re - b.re, a.im - b.im); }
  static mul(a, b) { // (a+ib)(c+id) = (ac - bd) + i(ad+bc)
    return new Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  }
  static conj(a) { return new Complex(a.re, -a.im); }
  static scale(a, s) { return new Complex(a.re * s, a.im * s); }
  static equals(a, b, eps = 1e-12) { return Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps; }
  static abs2(a) { return a.re * a.re + a.im * a.im; }
}

// Short helpers
export const C = (re = 0, im = 0) => new Complex(re, im);
export const ONE = C(1, 0);
export const ZERO = C(0, 0);
export const IUNIT = C(0, 1);

// e^{i theta}
export const cis = (theta) => Complex.fromPolar(1, theta);
