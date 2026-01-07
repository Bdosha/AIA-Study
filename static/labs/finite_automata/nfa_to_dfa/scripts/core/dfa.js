/* ДКА: состояния, алфавит, переходы (ε запрещены), сопоставление подмножеств НКА */
export class DFA {
  constructor() {
    this.states = new Set();
    this.start = null;
    this.finals = new Set();
    this.alphabet = null;
    this.transitions = new Map(); // Map<state, Map<symbol, state>>
    this.subsetMap = new Map();   // Map<state, Set<nfaState>>
  }
  addState(name, subset) {
    this.states.add(name);
    if (!this.transitions.has(name)) this.transitions.set(name, new Map());
    if (subset) this.subsetMap.set(name, new Set(subset));
  }
  setStart(name) { if (!this.states.has(name)) throw new Error("Нет такого состояния"); this.start = name; }
  addFinal(name) { if (!this.states.has(name)) throw new Error("Нет такого состояния"); this.finals.add(name); }
  addTransition(from, sym, to) {
    if (sym === "ε" || /^e(ps)?$/i.test(String(sym))) throw new Error("В ДКА нельзя добавлять ε-переходы");
    if (!this.states.has(from) || !this.states.has(to)) throw new Error("Неизвестные состояния");
    if (!this.transitions.has(from)) this.transitions.set(from, new Map());
    this.transitions.get(from).set(sym, to);
  }
  next(from, sym) { return (this.transitions.get(from) || new Map()).get(sym) ?? null; }

  removeState(name) {
    if (!this.states.has(name)) return;
    this.states.delete(name);
    this.finals.delete(name);
    if (this.start === name) this.start = null;
    this.transitions.delete(name);
    for (const [, mmap] of this.transitions.entries()) {
      for (const [sym, to] of [...mmap.entries()]) if (to === name) mmap.delete(sym);
    }
    this.subsetMap.delete(name);
  }
  removeTransition(from, sym) {
    const mmap = this.transitions.get(from); if (!mmap) return;
    if (sym) mmap.delete(sym); else this.transitions.delete(from);
  }
}