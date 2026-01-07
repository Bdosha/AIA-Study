// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Константы для ограничений
    const MAX_STATES = 8;
    const MAX_INPUT_LENGTH = 20;
    
    // Создание экземпляра НКА
    const nfa = new NFA();

    // Пример НКА для демонстрации (распознает строки, оканчивающиеся на 01)
    nfa.addState('q0', true, false);
    nfa.addState('q1', false, false);
    nfa.addState('q2', false, true);;
    nfa.addState('q3', false, false);
    
    nfa.addSymbol('0');
    nfa.addSymbol('1');
    
    // Переходы для НКА
    nfa.addTransition('q0', '0', 'q1');
    nfa.addTransition('q0', '1', 'q0');
    nfa.addTransition('q1', '1', 'q2');
    nfa.addTransition('q2', '0', 'q3');
    nfa.addTransition('q3', '0', 'q0');
    
    nfa.addEpsilonTransition('q1', 'q3');

    // Инициализация компонентов
    const canvas = document.getElementById('automaton-canvas');
    
    // Создаем глобальные ссылки для доступа из MatrixEditor
    window.visualizer = new AutomatonVisualizer(canvas, nfa);
    window.matrixEditor = new MatrixEditor(nfa);
    window.simulator = new SimulationController(nfa, window.visualizer);

    // Локальные ссылки для удобства
    const matrixEditor = window.matrixEditor;
    const visualizer = window.visualizer;
    const simulator = window.simulator;

    // Первоначальная отрисовка
    visualizer.calculateLayout();
    visualizer.render([nfa.startState]);

    // Ограничение длины входной строки
    const inputField = document.getElementById('input-string');
    if (inputField) {
        inputField.setAttribute('maxlength', MAX_INPUT_LENGTH);
        
        const inputSection = inputField.closest('.input-section');
        if (inputSection) {
            const counterDiv = document.createElement('div');
            counterDiv.id = 'char-counter';
            counterDiv.style.cssText = `
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                text-align: right;
                margin-top: var(--space-4);
            `;
            counterDiv.textContent = `0/${MAX_INPUT_LENGTH}`;
            inputSection.appendChild(counterDiv);

            inputField.addEventListener('input', function() {
                const currentLength = this.value.length;
                counterDiv.textContent = `${currentLength}/${MAX_INPUT_LENGTH}`;
                
                if (currentLength === MAX_INPUT_LENGTH) {
                    counterDiv.style.color = 'var(--color-warning)';
                } else {
                    counterDiv.style.color = 'var(--color-text-secondary)';
                }
            });
        }
    }

    // Функция для проверки валидности символа
    function isValidSymbol(symbol) {
        return symbol && symbol.length === 1 && /^[a-zA-Z0-9]$/.test(symbol);
    }

    // Добавление состояния с ограничением
    document.getElementById('add-state-btn').addEventListener('click', () => {
        if (nfa.states.size >= MAX_STATES) {
            alert(`Достигнуто максимальное количество состояний (${MAX_STATES})`);
            return;
        }

        const newState = 'q' + nfa.states.size;
        nfa.addState(newState, false, false);

        // Добавить переходы для нового состояния по всем символам алфавита
        for (let symbol of nfa.alphabet) {
            nfa.addTransition(newState, symbol, newState);
        }

        // Обновляем все компоненты
        matrixEditor.renderMatrix();
        visualizer.calculateLayout();
        visualizer.render(nfa.currentStates);
        
        // Обновляем состояние кнопки если достигли лимита
        updateButtonStates();
        
        console.log('Добавлено состояние:', newState, `(${nfa.states.size}/${MAX_STATES})`);
    });

    // Добавление символа с валидацией
    document.getElementById('add-symbol-btn').addEventListener('click', () => {
        const newSymbol = prompt('Введите символ (только один символ: буква или цифра):');
        
        if (newSymbol === null) return;
        
        if (!isValidSymbol(newSymbol)) {
            alert('Символ должен быть одним символом (буква или цифра)!');
            return;
        }
        
        if (nfa.alphabet.has(newSymbol)) {
            alert('Этот символ уже существует!');
            return;
        }

        nfa.addSymbol(newSymbol);

        // Добавить переходы по новому символу для всех состояний в себя
        for (let state of nfa.states) {
            nfa.addTransition(state, newSymbol, state);
        }

        // Обновляем все компоненты
        matrixEditor.renderMatrix();
        visualizer.calculateLayout();
        visualizer.render(nfa.currentStates);
        
        console.log('Добавлен символ:', newSymbol);
    });

    // Инициализация состояния кнопок при загрузке
    function updateButtonStates() {
        const addStateBtn = document.getElementById('add-state-btn');
        const addEpsilonBtn = document.getElementById('add-epsilon-btn');
        
        if (nfa.states.size >= MAX_STATES) {
            addStateBtn.disabled = true;
            addStateBtn.textContent = `Максимум состояний (${MAX_STATES})`;
        } else {
            addStateBtn.disabled = false;
            addStateBtn.textContent = 'Добавить состояние';
        }
        
        // Активируем кнопку ε-переходов только если есть хотя бы 2 состояния
        if (addEpsilonBtn) {
            addEpsilonBtn.disabled = nfa.states.size < 2;
        }
    }

    // Сохранение автомата в localStorage
    document.getElementById('save-btn').addEventListener('click', () => {
        const data = {
            states: Array.from(nfa.states),
            alphabet: Array.from(nfa.alphabet),
            transitions: Array.from(nfa.transitions.entries()).map(([key, set]) => [key, Array.from(set)]),
            epsilonTransitions: Array.from(nfa.epsilonTransitions.entries()).map(([key, set]) => [key, Array.from(set)]),
            startState: nfa.startState,
            acceptStates: Array.from(nfa.acceptStates),
            version: '2.0-nfa'
        };
        localStorage.setItem('nfa-data', JSON.stringify(data));
        alert('НКА сохранен!');
    });

    // Загрузка автомата из localStorage с валидацией
    document.getElementById('load-btn').addEventListener('click', () => {
        const data = localStorage.getItem('nfa-data');
        if (!data) {
            alert('Нет сохраненного НКА');
            return;
        }

        try {
            const parsed = JSON.parse(data);
            
            // Валидация загружаемых данных
            if (!parsed.states || !parsed.alphabet || !parsed.transitions || !parsed.epsilonTransitions) {
                throw new Error('Неверный формат данных НКА');
            }
            
            if (parsed.states.length > MAX_STATES) {
                throw new Error(`Слишком много состояний (максимум ${MAX_STATES})`);
            }
            
            // Проверяем символы на валидность
            for (let symbol of parsed.alphabet) {
                if (!isValidSymbol(symbol)) {
                    throw new Error(`Недопустимый символ: "${symbol}"`);
                }
            }

            // Восстанавливаем структуру НКА
            nfa.states = new Set(parsed.states);
            nfa.alphabet = new Set(parsed.alphabet);
            
            // Восстанавливаем обычные переходы
            nfa.transitions = new Map();
            for (let [key, targetArray] of parsed.transitions) {
                nfa.transitions.set(key, new Set(targetArray));
            }
            
            // Восстанавливаем ε-переходы
            nfa.epsilonTransitions = new Map();
            for (let [key, targetArray] of parsed.epsilonTransitions) {
                nfa.epsilonTransitions.set(key, new Set(targetArray));
            }
            
            nfa.startState = parsed.startState;
            nfa.acceptStates = new Set(parsed.acceptStates);
            nfa.reset();

            // Обновляем все компоненты
            matrixEditor.renderMatrix();
            visualizer.calculateLayout();
            visualizer.render([nfa.startState]);
            
            updateButtonStates();
            
            alert('НКА загружен успешно!');
        } catch (error) {
            alert('Ошибка при загрузке НКА: ' + error.message);
        }
    });

    // Вызываем обновление состояния кнопок
    updateButtonStates();
    
    // Добавляем информацию об ограничениях в интерфейс
    setTimeout(() => {
        const matrixControls = document.querySelector('.matrix-controls');
        if (matrixControls && !document.getElementById('limits-info')) {
            const limitsDiv = document.createElement('div');
            limitsDiv.id = 'limits-info';
            limitsDiv.style.cssText = `
                width: 100%;
                padding: var(--space-8);
                background: var(--color-bg-1);
                border-radius: var(--radius-sm);
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                text-align: center;
                border: 1px solid var(--color-border);
            `;
            limitsDiv.innerHTML = `
                <strong>Ограничения НКА:</strong> 
                Максимум ${MAX_STATES} состояний • 
                Максимум ${MAX_INPUT_LENGTH} символов во входной строке • 
                Только односимвольные символы алфавита •
                Поддержка ε-переходов
            `;
            matrixControls.appendChild(limitsDiv);
        }
    }, 100);

    console.log('NFA Simulator инициализирован с ограничениями:', {
        maxStates: MAX_STATES,
        maxInputLength: MAX_INPUT_LENGTH,
        singleCharSymbolsOnly: true,
        epsilonTransitions: true
    });
});