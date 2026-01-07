/* Сериализация NFA/DFA в JSON для экспорта */
export function nfaToJSON(nfa) {
  const transitions = [];
  for (const [from, mmap] of nfa.transitions.entries()) {
    for (const [key, set] of mmap.entries()) {
      if (key === "ε") transitions.push(...[...set].map(to => ({ from, to, epsilon: true })));
      else transitions.push(...[...set].map(to => ({ from, to, symbols: [key] })));
    }
  }
  return JSON.stringify({
    alphabet: [...nfa.alphabet.symbols],
    states: [...nfa.states].map(id => ({ id, start: id === nfa.start, final: nfa.finals.has(id) })),
    transitions
  }, null, 2);
}

export function dfaToJSON(dfa) {
  const transitions = [];
  for (const [from, mmap] of dfa.transitions.entries()) {
    for (const [sym, to] of mmap.entries()) transitions.push({ from, to, sym });
  }
  const subset = {};
  for (const [name, set] of dfa.subsetMap.entries()) subset[name] = [...set];
  return JSON.stringify({
    alphabet: [...dfa.alphabet.symbols],
    states: [...dfa.states].map(id => ({ id, start: id === dfa.start, final: dfa.finals.has(id) })),
    transitions,
    subset
  }, null, 2);
}