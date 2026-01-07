/* ε-замыкания для НКА (с кешом на уровне состояний) */
export class Epsilon {
  constructor(nfa) {
    this.nfa = nfa;
    this.cache = new Map();
  }
  ofState(q) {
    if (this.cache.has(q)) return new Set(this.cache.get(q));
    const visited = new Set([q]);
    const stack = [q];
    while (stack.length) {
      const cur = stack.pop();
      for (const nxt of this.nfa.next(cur, "ε")) {
        if (!visited.has(nxt)) { visited.add(nxt); stack.push(nxt); }
      }
    }
    this.cache.set(q, visited);
    return new Set(visited);
  }
  ofSet(S) {
    const res = new Set();
    for (const q of S) for (const z of this.ofState(q)) res.add(z);
    return res;
  }
}