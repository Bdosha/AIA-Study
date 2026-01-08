function generateSequences(maxDepth) {
    const allSymbols = new Set();

    for (const state of Object.keys(automaton.transitions)) {
        for (const symbol of Object.keys(automaton.transitions[state])) {
            allSymbols.add(symbol);
        }
    }

    const symbolArray = Array.from(allSymbols);
    if (symbolArray.length === 0) return [];

    const sequences = [];

    for (let depth = 1; depth <= maxDepth; depth++) {
        const newSequences = [];

        for (const seq of sequences) {
            if (seq.length === depth - 1) {
                for (const symbol of symbolArray) {
                    newSequences.push([...seq, symbol]);
                }
            }
        }

        if (depth === 1) {
            for (const symbol of symbolArray) {
                sequences.push([symbol]);
            }
        } else {
            sequences.push(...newSequences);
        }
    }

    return sequences.filter(seq => seq.length > 0);
}

function processSequence(sequence) {
    const symbols = typeof sequence === 'string' ? sequence.split('') : sequence;
    let currentState = automaton.initialState;

    for (const symbol of symbols) {
        if (!automaton.transitions[currentState] || !automaton.transitions[currentState][symbol]) {
            return null;
        }
        currentState = automaton.transitions[currentState][symbol];
    }

    return currentState;
}

function canReachAcceptingState(fromState, visitedStates = new Set()) {
    if (automaton.acceptingStates.includes(fromState)) {
        return true;
    }

    if (visitedStates.has(fromState)) {
        return false;
    }

    visitedStates.add(fromState);

    if (automaton.transitions[fromState]) {
        for (const [symbol, toState] of Object.entries(automaton.transitions[fromState])) {
            if (toState && canReachAcceptingState(toState, new Set(visitedStates))) {
                return true;
            }
        }
    }

    return false;
}




