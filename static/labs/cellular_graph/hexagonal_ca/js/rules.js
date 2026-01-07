/* =====================================
 * Totalistic B/S rules with helpers for UI chips
 * ===================================== */
export class Rules {
  constructor(text = 'B3/S23') { this.set(text); }
  set(text) {
    const m = /B([0-9]*)\/?S?([0-9]*)/i.exec(text) || [];
    this.b = new Set((m[1] || '').split('').filter(x=>x!=='' ).map(Number));
    this.s = new Set((m[2] || '').split('').filter(x=>x!=='' ).map(Number));
    this.text = `B${[...this.b].sort((a,b)=>a-b).join('')}/S${[...this.s].sort((a,b)=>a-b).join('')}`;
  }
  next(alive, n) { return alive ? this.s.has(n) : this.b.has(n); }
  /** chip helpers */
  setFromSets(Bset, Sset){ this.b=new Set(Bset); this.s=new Set(Sset); this.text=`B${[...this.b].sort((a,b)=>a-b).join('')}/S${[...this.s].sort((a,b)=>a-b).join('')}`; }
}