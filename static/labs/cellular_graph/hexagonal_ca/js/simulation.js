/* =====================================
 * Single step with double buffering
 * ===================================== */
export class Simulation {
  constructor(grid, rules){ this.grid=grid; this.rules=rules; this.alive=0; this.kernel=6; this.bounds='toroidal'; }
  setKernel(k){ this.kernel = (k===12||k===18)?k:6; }
  setBounds(b){ this.bounds = (b==='limited')?'limited':'toroidal'; }
  step(){ const g=this.grid, A=g.a, B=g.b; let alive=0; for(let r=0;r<g.h;r++){ for(let q=0;q<g.w;q++){ const i=g.idx(q,r); const n=g.neighbors(q,r,this.kernel,this.bounds); const next=this.rules.next(A[i]===1,n)?1:0; B[i]=next; alive+=next; }} g.a.set(B); g.generation++; this.alive=alive; return alive; }
}