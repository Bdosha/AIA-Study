window.automaton = {
    states: ['q0', 'q1', 'q2', 'q3'],
    alphabet: ['v1', 'v2'],
    initialState: 'q0',
    acceptingStates: ['q0', 'q2'],
    transitions: {}
};

// Инициализация структуры переходов
function initializeTransitions() {
    automaton.states.forEach(state => {
        automaton.transitions[state] = {};
        automaton.alphabet.forEach(symbol => {
            automaton.transitions[state][symbol] = null;
        });
    });
}

// Обновление переходов из таблицы UI
function updateTransitions() {
    // Очищаем старые переходы
    automaton.states.forEach(state => {
        automaton.transitions[state] = {};
        automaton.alphabet.forEach(symbol => {
            automaton.transitions[state][symbol] = null;
        });
    });

    automaton.states.forEach(fromState => {
        automaton.alphabet.forEach(symbol => {
            const selectId = `transition_${fromState}_${symbol}`;
            const toStateSelect = document.getElementById(selectId);
            if (toStateSelect) {
                const toState = toStateSelect.value;
                automaton.transitions[fromState][symbol] = toState ? toState : null;
            }
        });
    });
    console.log(JSON.stringify(automaton.transitions, null, 2));
}

function isAccepted(sequence) {
    const finalState = processSequence(sequence);
    return finalState !== null && automaton.acceptingStates.includes(finalState);
}

// Пример функции: обработка цепочки сигналов
function processSequence(sequence) {
    let currentState = automaton.initialState;
    for (const symbol of sequence) {
        if (!automaton.alphabet.includes(symbol)) return null;
        const nextState = automaton.transitions[currentState][symbol];
        if (!nextState) return null;
        currentState = nextState;
    }
    return currentState;
}
initializeTransitions();



