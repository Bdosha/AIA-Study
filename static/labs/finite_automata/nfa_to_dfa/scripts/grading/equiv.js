/* Проверка эквивалентности двух ДКА через поиск контрпримера (BFS по парам) */
export function checkEquivalence(dfaA, dfaB) {
  const sigma = [...dfaA.alphabet.symbols];
  const visited = new Set();
  const start = [dfaA.start, dfaB.start];
  const queue = [{ pair: start, word: "" }];

  const finalsA = dfaA.finals, finalsB = dfaB.finals;

  while (queue.length) {
    const { pair: [p, q], word } = queue.shift();
    const key = `${p}|${q}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const accA = p != null && finalsA.has(p);
    const accB = q != null && finalsB.has(q);
    if (accA !== accB) return { equivalent: false, counterexample: word };

    for (const a of sigma) {
      const p2 = (dfaA.transitions.get(p) || new Map()).get(a) ?? null;
      const q2 = (dfaB.transitions.get(q) || new Map()).get(a) ?? null;
      queue.push({ pair: [p2, q2], word: word + a });
    }
  }
  return { equivalent: true };
}