/* Симуляция НКА/ДКА: шаги и принятие */
export function runNFA(nfa, input, epsilon) {
  const steps = [];
  let S = epsilon.ofSet(new Set([nfa.start]));
  steps.push({ i: 0, sym: "ε*", active: [...S] });

  for (let i = 0; i < input.length; i++) {
    const a = input[i];
    const moveSet = new Set();
    for (const q of S) for (const t of nfa.next(q, a)) moveSet.add(t);
    S = epsilon.ofSet(moveSet);
    steps.push({ i: i + 1, sym: a, active: [...S] });
  }
  const accepted = [...S].some(s => nfa.finals.has(s));
  return { steps, accepted };
}

export function runDFA(dfa, input) {
  const steps = [];
  let p = dfa.start;
  steps.push({ i: 0, sym: "", state: p });

  for (let i = 0; i < input.length; i++) {
    const a = input[i];
    const map = dfa.transitions.get(p) || new Map();
    const q = map.get(a);
    p = q ?? null;
    steps.push({ i: i + 1, sym: a, state: p });
    if (p === null) break;
  }
  const accepted = p !== null && dfa.finals.has(p);
  return { steps, accepted };
}