// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Константы для ограничений
    const MAX_STATES = 8;
    const MAX_INPUT_LENGTH = 20;
    
    // Создание экземпляра автомата
    const dfa = new DFA();

    // Пример автомата для демонстрации
    dfa.addState('q0', true, true);
    dfa.addState('q1', false, false);
    dfa.addSymbol('0');
    dfa.addSymbol('1');
    dfa.addTransition('q0', '0', 'q0');
    dfa.addTransition('q0', '1', 'q1');
    dfa.addTransition('q1', '0', 'q0');
    dfa.addTransition('q1', '1', 'q1');

    // Инициализация компонентов
    const canvas = document.getElementById('automaton-canvas');
    
    // КРИТИЧНО: Создаем глобальные ссылки для доступа из MatrixEditor
    window.visualizer = new AutomatonVisualizer(canvas, dfa);
    window.matrixEditor = new MatrixEditor(dfa);
    window.simulator = new SimulationController(dfa, window.visualizer);

    // Локальные ссылки для удобства
    const matrixEditor = window.matrixEditor;
    const visualizer = window.visualizer;
    const simulator = window.simulator;

    // Первоначальная отрисовка
    visualizer.calculateLayout();
    visualizer.render(dfa.startState);

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
        if (dfa.states.size >= MAX_STATES) {
            alert(`Достигнуто максимальное количество состояний (${MAX_STATES})`);
            return;
        }

        const newState = 'q' + dfa.states.size;
        dfa.addState(newState, false, false);

        // Добавить переходы для нового состояния по всем символам алфавита
        for (let symbol of dfa.alphabet) {
            dfa.addTransition(newState, symbol, newState);
        }

        // Обновляем все компоненты
        matrixEditor.renderMatrix();
        visualizer.calculateLayout();
        visualizer.render(dfa.currentState);
        
        // Обновляем состояние кнопки если достигли лимита
        updateButtonStates();
        
        console.log('Добавлено состояние:', newState, `(${dfa.states.size}/${MAX_STATES})`);
    });

    // Добавление символа с валидацией
    document.getElementById('add-symbol-btn').addEventListener('click', () => {
        const newSymbol = prompt('Введите символ (только один символ: буква или цифра):');
        
        if (newSymbol === null) return;
        
        if (!isValidSymbol(newSymbol)) {
            alert('Символ должен быть одним символом (буква или цифра)!');
            return;
        }
        
        if (dfa.alphabet.has(newSymbol)) {
            alert('Этот символ уже существует!');
            return;
        }

        dfa.addSymbol(newSymbol);

        // Добавить переходы по новому символу для всех состояний в себя
        for (let state of dfa.states) {
            dfa.addTransition(state, newSymbol, state);
        }

        // Обновляем все компоненты
        matrixEditor.renderMatrix();
        visualizer.calculateLayout();
        visualizer.render(dfa.currentState);
        
        console.log('Добавлен символ:', newSymbol);
    });

    // Инициализация состояния кнопок при загрузке
    function updateButtonStates() {
        const addStateBtn = document.getElementById('add-state-btn');
        if (dfa.states.size >= MAX_STATES) {
            addStateBtn.disabled = true;
            addStateBtn.textContent = `Максимум состояний (${MAX_STATES})`;
        } else {
            addStateBtn.disabled = false;
            addStateBtn.textContent = 'Добавить состояние';
        }
    }

    // Сохранение автомата в localStorage
    document.getElementById('save-btn').addEventListener('click', () => {
        const data = {
            states: Array.from(dfa.states),
            alphabet: Array.from(dfa.alphabet),
            transitions: Array.from(dfa.transitions.entries()),
            startState: dfa.startState,
            acceptStates: Array.from(dfa.acceptStates),
            version: '1.0'
        };
        localStorage.setItem('dfa-data', JSON.stringify(data));
        alert('Автомат сохранен!');
    });

    // Загрузка автомата из localStorage с валидацией
    document.getElementById('load-btn').addEventListener('click', () => {
        const data = localStorage.getItem('dfa-data');
        if (!data) {
            alert('Нет сохраненного автомата');
            return;
        }

        try {
            const parsed = JSON.parse(data);
            
            // Валидация загружаемых данных
            if (!parsed.states || !parsed.alphabet || !parsed.transitions) {
                throw new Error('Неверный формат данных');
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

            // Восстанавливаем структуру автомата
            dfa.states = new Set(parsed.states);
            dfa.alphabet = new Set(parsed.alphabet);
            dfa.transitions = new Map(parsed.transitions);
            dfa.startState = parsed.startState;
            dfa.acceptStates = new Set(parsed.acceptStates);
            dfa.reset();

            // Обновляем все компоненты
            matrixEditor.renderMatrix();
            visualizer.calculateLayout();
            visualizer.render(dfa.startState);
            
            updateButtonStates();
            
            alert('Автомат загружен успешно!');
        } catch (error) {
            alert('Ошибка при загрузке автомата: ' + error.message);
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
                <strong>Ограничения:</strong> 
                Максимум ${MAX_STATES} состояний • 
                Максимум ${MAX_INPUT_LENGTH} символов во входной строке • 
                Только односимвольные символы алфавита
            `;
            matrixControls.appendChild(limitsDiv);
        }
    }, 100);

    console.log('DFA Simulator инициализирован с ограничениями:', {
        maxStates: MAX_STATES,
        maxInputLength: MAX_INPUT_LENGTH,
        singleCharSymbolsOnly: true
    });
});
