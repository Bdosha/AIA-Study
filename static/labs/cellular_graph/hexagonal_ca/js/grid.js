/* =====================================
 * Hex grid (even-q, pointy-top). Kernels: 6 / 12 / 18. Bounds: toroidal | limited
 * ===================================== */
export class HexGrid {
  constructor(w, h) { this.resize(w, h); }
  resize(w, h) {
    this.w = w|0; this.h = h|0;
    this.a = new Uint8Array(this.w * this.h);
    this.b = new Uint8Array(this.w * this.h);
    this.generation = 0;
  }
  idx(q, r) { return r * this.w + q; }
  inBounds(q, r) { return q >= 0 && q < this.w && r >= 0 && r < this.h; }
  get(q, r) { return this.a[this.idx(q, r)]; }
  set(q, r, v) { this.a[this.idx(q, r)] = v ? 1 : 0; }
  clear() { this.a.fill(0); this.b.fill(0); this.generation = 0; }
  random(p = 0.30) { for (let i = 0; i < this.a.length; i++) this.a[i] = Math.random() < p ? 1 : 0; }

  /** compute neighbors count for kernels 6/12/18 and bounds */
  neighbors(q, r, kernel = 6, bounds = 'toroidal') {
    const even = (r & 1) === 0;
    // 6-neighborhood (edge-adjacent)
    const N6 = even
      ? [[+1,0],[0,+1],[-1,+1],[-1,0],[-1,-1],[0,-1]]
      : [[+1,0],[+1,+1],[0,+1],[-1,0],[0,-1],[+1,-1]];
    // extra vertices to make 12: (second ring touching at vertices)
    const V6 = even
      ? [[+2,0],[+1,+1],[-1,+2],[-2,0],[-1,-1],[+1,-2]]
      : [[+2,0],[+2,+1],[+1,+2],[-2,0],[-2,-1],[-1,-2]];
    const deltas = kernel === 6 ? N6 : (kernel === 12 ? N6.concat(V6) : N6.concat(V6).concat(N6));
    let n = 0;
    for (const [dq, dr] of deltas) {
      let q2 = q + dq, r2 = r + dr;
      if (bounds === 'toroidal') {
        q2 = (q2 % this.w + this.w) % this.w;
        r2 = (r2 % this.h + this.h) % this.h;
        n += this.a[this.idx(q2, r2)];
      } else {
        if (this.inBounds(q2, r2)) n += this.a[this.idx(q2, r2)];
      }
    }
    return n;
  }
}