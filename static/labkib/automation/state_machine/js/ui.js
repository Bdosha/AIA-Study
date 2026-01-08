// Условие 1: Из начального состояния в допускающее и нет путей-ловушек
function validateCondition1() {
    const maxDepth = 8;
    const sequences = generateSequences(maxDepth);

    const reachableStates = new Set();
    const stateSequences = {};

    for (const sequence of sequences) {
        const result = processSequence(sequence);
        if (result) reachableStates.add(result);
        if (!stateSequences[result]) stateSequences[result] = [];
        stateSequences[result].push(sequence.join(""));
    }

    let allCanReachF = true;
    let problemState = null;

    // Проверка изолированной самопетли
    for (const state of automaton.states) {
        let onlySelfLoop = true;
        for (const from of automaton.states) {
            for (const symbol of automaton.alphabet) {
                if (automaton.transitions[from][symbol] === state && from !== state) {
                    onlySelfLoop = false;
                }
            }
        }
        let allSelfLoop = true;
        for (const symbol of automaton.alphabet) {
            if (automaton.transitions[state][symbol] !== state) {
                allSelfLoop = false;
            }
        }
        if (onlySelfLoop && allSelfLoop) {
            allCanReachF = false;
            problemState = state;
            return {
                passed: false,
                details: `Обнаружено изолированное состояние ${state}: в него нельзя попасть из других состояний и оно ведёт только в себя (только самопетли). Автомат не должен содержать состояний, недостижимых из начального состояния.`
            };
        }
    }
    // Проверка на изолированные подсистемы
    for (const state of automaton.states) {
        if (!reachableStates.has(state) && state !== automaton.initialState) {
            return {
                passed: false,
                details: `Состояние ${state} не достижимо из начального состояния. Автомат не должен содержать состояний, недостижимых из начального состояния.`
            };
        }
    }
    // Конец проверок

    for (const state of reachableStates) {
        if (!canReachAcceptingState(state)) {
            allCanReachF = false;
            problemState = state;
            break;
        }
    }

    if (allCanReachF) {
        return { passed: true, details: "" };
    } else {
        const problemSequencesRaw = stateSequences[problemState] ? stateSequences[problemState].slice(0, 2) : [];
        const problemSequences = problemSequencesRaw
            .flatMap(seq => seq.match(/v1|v2/g) || []) // разбивает строку на отдельные символы v1 или v2
            .join(', ');
        return {
            passed: false,
            details: `Из состояния ${problemState} нельзя попасть в допускающее состояние. Примеры цепочек: ${problemSequences} `
        };
    }
}

// Условие 2: Проверка, что для каждого состояния есть хотя бы один переход
function validateCondition2() {
    let allStatesHaveAtLeastOneTransition = true;
    for (const state of automaton.states) {
        let transitionsExist = false;
        for (const symbol of automaton.alphabet) {
            const target = automaton.transitions[state] && automaton.transitions[state][symbol];
            if (target && target !== "" && target !== null && typeof target !== "undefined") {
                transitionsExist = true;
            }
        }
        if (!transitionsExist) {
            allStatesHaveAtLeastOneTransition = false;
        }
    }
    if (!allStatesHaveAtLeastOneTransition) {
        return {
            passed: false,
            details: "✗ КРИТИЧЕСКИЙ ОТКАЗ: Обнаружены неопределённые переходы — таблица управления повреждена!"
        };
    }
    return {
        passed: true,
        details: "✓ СИСТЕМА АКТИВНА: Все переходы определены, управление полностью функционально"
    };
}

// Основная функция диагностики
function validateAutomaton() {
    updateTransitions();
    const condition1 = validateCondition1();
    const condition2 = validateCondition2();
    const allPassed = condition1.passed && condition2.passed;

    displayValidationResults(condition1, condition2, allPassed);
    drawAutomatonDiagram();
}

function displayValidationResults(condition1, condition2, allPassed) {
    const contentDiv = document.getElementById('validationContent');
    if (!contentDiv) return;

    let html = '';
    html += `
        <div class="validation-item">
            <h4>
                <span class="status ${condition1.passed ? 'status--success' : 'status--error'}">
                    ${condition1.passed ? '✓ НОРМА' : '✗ АВАРИЯ'}
                </span>
                ПРОВЕРКА 1: Навигационная безопасность
            </h4>
            <p class="validation-details">${condition1.details}</p>
        </div>
    `;
    html += `
        <div class="validation-item">
            <h4>
                <span class="status ${condition2.passed ? 'status--success' : 'status--error'}">
                    ${condition2.passed ? '✓ НОРМА' : '✗ АВАРИЯ'}
                </span>
                ПРОВЕРКА 2: Целостность управления
            </h4>
            <p class="validation-details">${condition2.details}</p>
        </div>
    `;
    if (allPassed) {
        html += `
            <div class="final-result final-result--success">
                ✓ СИСТЕМА ПОЛНОСТЬЮ ФУНКЦИОНАЛЬНА — КОРАБЛЬ ГОТОВ К ПОЛЕТУ
            </div>
        `;
    } else {
        html += `
            <div class="final-result final-result--error">
                ✗ КРИТИЧЕСКИЙ ОТКАЗ — ИНИЦИАЛИЗАЦИЯ НЕВОЗМОЖНА
            </div>
        `;
    }
    contentDiv.innerHTML = html;
}

// Инициализация таблицы переходов
function initializeTransitionsTable() {
    const table = document.getElementById('transitionsTable');
    if (!table) return;

    table.innerHTML = '';
    let index = 0;

    for (const state of automaton.states) {
        const row = document.createElement('tr');

        // Первая ячейка — название состояния
        const stateCell = document.createElement('td');
        stateCell.textContent = state;
        stateCell.style.fontWeight = 'bold';
        stateCell.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
        row.appendChild(stateCell);

        // Для каждого символа алфавита
        for (const symbol of automaton.alphabet) {
            const cell = document.createElement('td');
            const select = document.createElement('select');
            select.id = `transition_${state}_${symbol}`;

            select.appendChild(new Option('(выбрать)', ''));
            for (const targetState of automaton.states) {
                select.appendChild(new Option(targetState, targetState));
            }

            if (automaton.transitions[state] && automaton.transitions[state][symbol]) {
                select.value = automaton.transitions[state][symbol];
            }

            select.addEventListener('change', function () {
                updateTransitions();
                drawAutomatonDiagram();
            });

            cell.appendChild(select);
            row.appendChild(cell);
        }

        table.appendChild(row);
    }
}

// Обновление переходов из формы
function updateTransitions() {
    for (const state of automaton.states) {
        if (!automaton.transitions[state]) {
            automaton.transitions[state] = {};
        }
        for (const symbol of automaton.alphabet) {
            const selectId = `transition_${state}_${symbol}`;
            const select = document.getElementById(selectId);
            if (select) {
                automaton.transitions[state][symbol] = select.value;
            } else {
                automaton.transitions[state][symbol] = null;
            }
        }
    }
}


document.addEventListener('DOMContentLoaded', function () {
    initializeTransitionsTable();

    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn) {
        validateBtn.addEventListener('click', validateAutomaton);
    }
});









