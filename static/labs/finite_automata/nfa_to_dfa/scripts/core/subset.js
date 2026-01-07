/* Построение ДКА по НКА методом подмножеств (с опциональной трассировкой) */
import { DFA } from "./dfa.js";
import { Epsilon } from "./epsilon.js";

export function buildDFA(nfa, traceFn) {
  if (!nfa.start) throw new Error("Не задано начальное состояние НКА");
  const eps = new Epsilon(nfa);
  const sigma = nfa.alphabet.toArray();

  const dfa = new DFA();
  dfa.alphabet = nfa.alphabet;

  const startSet = eps.ofSet(new Set([nfa.start]));
  const nameOf = new Map(); const setOf = new Map(); const queue = [];
  const keyOf = (S) => JSON.stringify([...S].sort());
  const hasFinal = (S) => { for (const q of S) if (nfa.finals.has(q)) return true; return false; };

  let code = "A".charCodeAt(0);
  const startKey = keyOf(startSet);
  const startName = String.fromCharCode(code++);
  nameOf.set(startKey, startName); setOf.set(startName, startSet);
  dfa.addState(startName, startSet); if (hasFinal(startSet)) dfa.addFinal(startName);
  dfa.setStart(startName); queue.push(startName);

  while (queue.length) {
    const srcName = queue.shift();
    const I = setOf.get(srcName);

    for (const a of sigma) {
      const moveSet = new Set(); for (const q of I) for (const t of nfa.next(q, a)) moveSet.add(t);
      const J = eps.ofSet(moveSet);

      if (traceFn) traceFn(I, a, J);
      if (J.size === 0) continue;

      const jKey = keyOf(J);
      let dstName = nameOf.get(jKey);
      if (!dstName) {
        dstName = String.fromCharCode(code++); if (code > "Z".charCodeAt(0)) code = "A".charCodeAt(0);
        nameOf.set(jKey, dstName); setOf.set(dstName, J);
        dfa.addState(dstName, J); if (hasFinal(J)) dfa.addFinal(dstName);
        queue.push(dstName);
      }
      dfa.addTransition(srcName, a, dstName);
    }
  }
  return dfa;
}