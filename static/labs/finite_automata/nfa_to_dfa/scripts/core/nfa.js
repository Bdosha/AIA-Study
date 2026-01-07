/* НКА с ε-переходами: множества, алфавит, переходы */
export class NFA {
  constructor() {
    this.states = new Set();
    this.start = null;
    this.finals = new Set();
    this.alphabet = null;
    this.transitions = new Map(); // Map<from, Map<symbol|'ε', Set<to>>>
  }

  addState(id) {
    if (!id) throw new Error("Пустой id");
    this.states.add(id);
    if (!this.transitions.has(id)) this.transitions.set(id, new Map());
  }
  setStart(id) { if (!this.states.has(id)) throw new Error("Нет такого состояния"); this.start = id; }
  addFinal(id) { if (!this.states.has(id)) throw new Error("Нет такого состояния"); this.finals.add(id); }

  addTransition(from, to, { symbols = [], epsilon = false } = {}) {
    if (!this.states.has(from) || !this.states.has(to)) throw new Error("Неизвестные состояния");
    const map = this.transitions.get(from);
    if (epsilon) {
      const key = "ε";
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(to);
    } else {
      symbols.forEach(sym => {
        const key = String(sym);
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(to);
      });
    }
  }

  next(from, key) {
    const map = this.transitions.get(from);
    if (!map) return new Set();
    return new Set(map.get(key) ?? []);
  }

  removeState(id) {
    if (!this.states.has(id)) return;
    this.states.delete(id);
    this.finals.delete(id);
    if (this.start === id) this.start = null;
    this.transitions.delete(id);
    for (const [, mmap] of this.transitions.entries()) {
      for (const [sym, toSet] of mmap.entries()) {
        if (toSet.has(id)) {
          toSet.delete(id);
          if (toSet.size === 0) mmap.delete(sym);
        }
      }
    }
  }

  removeTransition(from, to, { symbols = [], epsilon } = {}) {
    const mmap = this.transitions.get(from);
    if (!mmap) return;
    const delKey = (key) => {
      const set = mmap.get(key);
      if (!set) return;
      if (to) { set.delete(to); if (set.size === 0) mmap.delete(key); }
      else mmap.delete(key);
    };
    if (symbols && symbols.length) symbols.forEach(s => delKey(String(s)));
    else if (epsilon === true) delKey("ε");
    else {
      for (const [k, set] of [...mmap.entries()]) {
        if (!to || set.has(to)) {
          if (to) { set.delete(to); if (set.size === 0) mmap.delete(k); }
          else mmap.delete(k);
        }
      }
    }
  }
}