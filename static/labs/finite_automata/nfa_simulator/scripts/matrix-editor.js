class MatrixEditor {
    constructor(nfa) {
        this.nfa = nfa;
        this.table = document.getElementById('transition-matrix');
        this.MAX_STATES = 8;
        this.init();
    }

    init() {
        this.renderMatrix();
        this.attachEventListeners();
    }

    renderMatrix() {
        const header = document.getElementById('matrix-header');
        const body = document.getElementById('matrix-body');

        header.innerHTML = '';
        body.innerHTML = '';

        // --- Заголовочная строка
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Состояние/Символ</th>';
        
        // Символы алфавита
        for (let symbol of this.nfa.alphabet) {
            const th = document.createElement('th');
            th.innerHTML = `
                <div class="header-with-delete">
                    <span>${symbol}</span>
                    <button class="delete-symbol-btn" data-symbol="${symbol}" title="Удалить символ">&#10006;</button>
                </div>
            `;
            headerRow.appendChild(th);
        }
        
        // Столбец для ε-переходов
        const epsilonTh = document.createElement('th');
        epsilonTh.innerHTML = `
            <div class="header-with-delete">
                <span style="color: #7B1FA2;">ε</span>
                <button class="delete-epsilon-btn" title="Удалить все ε-переходы">&#10006;</button>
            </div>
        `;
        headerRow.appendChild(epsilonTh);
        
        headerRow.innerHTML += '<th>Принимающее</th><th>Начальное</th>';
        header.appendChild(headerRow);

        // --- Строки по состояниям
        for (let state of this.nfa.states) {
            const row = document.createElement('tr');

            // --- Ячейка с кнопкой удаления и именем состояния
            const stateCell = document.createElement('td');
            stateCell.className = 'state-label';
            stateCell.innerHTML = `
                <button class="delete-state-btn" data-state="${state}" title="Удалить состояние">&#10006;</button>
                <span>${state}</span>
            `;
            row.appendChild(stateCell);

            // --- Ячейки переходов по символам алфавита
            for (let symbol of this.nfa.alphabet) {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'transition-input';
                input.dataset.fromState = state;
                input.dataset.symbol = symbol;
                
                // Получаем все целевые состояния для этого перехода
                const key = `${state},${symbol}`;
                const targetStates = this.nfa.transitions.get(key) || new Set();
                input.value = Array.from(targetStates).join(',');
                input.placeholder = 'q0,q1,...';
                
                input.addEventListener('blur', (e) => {
                    this.updateTransition(state, symbol, e.target.value);
                });
                
                cell.appendChild(input);
                row.appendChild(cell);
            }

            // --- Ячейка для ε-переходов
            const epsilonCell = document.createElement('td');
            const epsilonInput = document.createElement('input');
            epsilonInput.type = 'text';
            epsilonInput.className = 'transition-input';
            epsilonInput.style.borderColor = '#7B1FA2';
            epsilonInput.dataset.fromState = state;
            
            // Получаем ε-переходы для этого состояния
            const epsilonTargets = this.nfa.epsilonTransitions.get(state) || new Set();
            epsilonInput.value = Array.from(epsilonTargets).join(',');
            epsilonInput.placeholder = 'q0,q1,...';
            
            epsilonInput.addEventListener('blur', (e) => {
                this.updateEpsilonTransition(state, e.target.value);
            });
            
            epsilonCell.appendChild(epsilonInput);
            row.appendChild(epsilonCell);

            // --- Чекбокс для принимающего состояния
            const acceptCell = document.createElement('td');
            const acceptCheckbox = document.createElement('input');
            acceptCheckbox.type = 'checkbox';
            acceptCheckbox.checked = this.nfa.acceptStates.has(state);
            acceptCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.nfa.acceptStates.add(state);
                } else {
                    this.nfa.acceptStates.delete(state);
                }
                this.updateVisualization();
            });
            acceptCell.appendChild(acceptCheckbox);
            row.appendChild(acceptCell);

            // --- Радиокнопка для начального состояния
            const startCell = document.createElement('td');
            const startRadio = document.createElement('input');
            startRadio.type = 'radio';
            startRadio.name = 'start-state';
            startRadio.checked = this.nfa.startState === state;
            startRadio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.nfa.startState = state;
                }
                this.updateVisualization();
            });
            startCell.appendChild(startRadio);
            row.appendChild(startCell);

            body.appendChild(row);
        }

        this.updateVisualization();
    }

    updateTransition(fromState, symbol, toStatesString) {
        const trimmed = toStatesString.trim();
        const key = `${fromState},${symbol}`;
        
        // Удаляем старые переходы
        this.nfa.transitions.delete(key);
        
        if (trimmed) {
            const targetStates = trimmed.split(',').map(s => s.trim()).filter(s => s !== '');
            
            // Проверяем существование целевых состояний
            for (const targetState of targetStates) {
                if (!this.nfa.states.has(targetState)) {
                    alert(`Состояние "${targetState}" не существует!`);
                    this.renderMatrix();
                    return;
                }
            }
            
            // Добавляем новые переходы
            const targetSet = new Set(targetStates);
            this.nfa.transitions.set(key, targetSet);
        }
        
        this.updateVisualization();
    }

    updateEpsilonTransition(fromState, toStatesString) {
        const trimmed = toStatesString.trim();
        
        // Удаляем старые ε-переходы
        this.nfa.epsilonTransitions.delete(fromState);
        
        if (trimmed) {
            const targetStates = trimmed.split(',').map(s => s.trim()).filter(s => s !== '');
            
            // Проверяем существование целевых состояний
            for (const targetState of targetStates) {
                if (!this.nfa.states.has(targetState)) {
                    alert(`Состояние "${targetState}" не существует!`);
                    this.renderMatrix();
                    return;
                }
            }
            
            // Добавляем новые ε-переходы
            const targetSet = new Set(targetStates);
            this.nfa.epsilonTransitions.set(fromState, targetSet);
        }
        
        this.updateVisualization();
    }

    checkAutomaton() {
        const errors = this.nfa.validate();
        const errorContainer = document.getElementById('validation-errors');

        if (!errorContainer) return;

        if (errors.length > 0) {
            let errorHtml = '<div class="check-header">❌ <strong>Обнаружены ошибки в автомате:</strong></div>';
            errorHtml += errors.map(error => `<div class="error-item">• ${error}</div>`).join('');
            errorContainer.innerHTML = errorHtml;
            errorContainer.className = 'error-container show';
        } else {
            // Статистика НКА
            const epsilonCount = Array.from(this.nfa.epsilonTransitions.values())
                .reduce((sum, set) => sum + set.size, 0);
            const nonEpsilonCount = Array.from(this.nfa.transitions.values())
                .reduce((sum, set) => sum + set.size, 0);
            
            errorContainer.innerHTML = `
                <div class="success-message">
                    <div class="success-header">✅ <strong>НКА готов к работе!</strong></div>
                    <div class="success-details">
                        • Состояний: ${this.nfa.states.size}<br>
                        • Символов: ${this.nfa.alphabet.size}<br>
                        • Обычных переходов: ${nonEpsilonCount}<br>
                        • ε-переходов: ${epsilonCount}<br>
                        • Начальное состояние: ${this.nfa.startState}<br>
                        • Принимающих состояний: ${this.nfa.acceptStates.size}
                    </div>
                </div>
            `;
            errorContainer.className = 'success-container show';
        }

        setTimeout(() => {
            errorContainer.classList.remove('show');
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 300);
        }, 10000);
    }

    deleteState(state) {
        if (this.nfa.states.size <= 1) {
            alert('Нельзя удалить последнее состояние!');
            return;
        }
        if (!confirm(`Удалить состояние "${state}"?\nВсе связанные переходы будут удалены.`)) return;

        this.nfa.states.delete(state);
        this.nfa.acceptStates.delete(state);
        if (this.nfa.startState === state) {
            this.nfa.startState = Array.from(this.nfa.states)[0];
        }
        
        // Удалить связанные переходы
        for (let key of Array.from(this.nfa.transitions.keys())) {
            const [from, symbol] = key.split(',');
            if (from === state) {
                this.nfa.transitions.delete(key);
            } else {
                // Удалить состояние из целевых множеств
                const targets = this.nfa.transitions.get(key);
                if (targets && targets.has(state)) {
                    targets.delete(state);
                    if (targets.size === 0) {
                        this.nfa.transitions.delete(key);
                    }
                }
            }
        }
        
        // Удалить ε-переходы
        this.nfa.epsilonTransitions.delete(state);
        for (let [fromState, targets] of this.nfa.epsilonTransitions) {
            if (targets.has(state)) {
                targets.delete(state);
                if (targets.size === 0) {
                    this.nfa.epsilonTransitions.delete(fromState);
                }
            }
        }
        
        this.renderMatrix();
    }

    deleteSymbol(symbol) {
        if (this.nfa.alphabet.size <= 1) {
            alert('Нельзя удалить последний символ!');
            return;
        }
        if (!confirm(`Удалить символ "${symbol}"?\nВсе связанные переходы будут удалены.`)) return;

        this.nfa.alphabet.delete(symbol);
        for (let key of Array.from(this.nfa.transitions.keys())) {
            const [, sym] = key.split(',');
            if (sym === symbol) {
                this.nfa.transitions.delete(key);
            }
        }
        this.renderMatrix();
    }

    deleteAllEpsilonTransitions() {
        if (!confirm('Удалить все ε-переходы?')) return;
        this.nfa.epsilonTransitions.clear();
        this.renderMatrix();
    }

    attachEventListeners() {
        const addStateBtn = document.getElementById('add-state');
        const addSymbolBtn = document.getElementById('add-symbol');
        const checkBtn = document.getElementById('check-btn');

        if (addStateBtn) {
            addStateBtn.addEventListener('click', () => {
                if (this.nfa.states.size >= this.MAX_STATES) {
                    alert(`Максимум состояний: ${this.MAX_STATES}`);
                    return;
                }
                const stateName = prompt('Введите название состояния:');
                if (!stateName || !stateName.trim()) return;
                const trimmedName = stateName.trim();
                if (trimmedName.length > 16) {
                    alert('Название состояния должно быть до 16 символов!');
                    return;
                }
                if (this.nfa.states.has(trimmedName)) {
                    alert('Состояние с таким именем уже существует!');
                    return;
                }
                this.nfa.addState(trimmedName);
                this.renderMatrix();
            });
        }

        if (addSymbolBtn) {
            addSymbolBtn.addEventListener('click', () => {
                const symbol = prompt('Введите символ (1 буква или цифра):');
                if (!symbol || !symbol.trim()) return;
                const trimmedSymbol = symbol.trim();
                if (!/^[a-zA-Z0-9]$/.test(trimmedSymbol)) {
                    alert('Символ должен быть ровно 1 знаком: латиницей или цифрой.');
                    return;
                }
                if (this.nfa.alphabet.has(trimmedSymbol)) {
                    alert('Такой символ уже есть.');
                    return;
                }
                this.nfa.addSymbol(trimmedSymbol);
                this.renderMatrix();
            });
        }

        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkAutomaton());
        }

        // Удаление символов/состояний через делегирование
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-symbol-btn')) {
                const symbol = e.target.dataset.symbol;
                this.deleteSymbol(symbol);
            }
            if (e.target.classList.contains('delete-state-btn')) {
                const state = e.target.dataset.state;
                this.deleteState(state);
            }
            if (e.target.classList.contains('delete-epsilon-btn')) {
                this.deleteAllEpsilonTransitions();
            }
        });

        // Автообновление визуализации при изменениях
        this.table.addEventListener('change', () => this.updateVisualization());
        this.table.addEventListener('blur', () => this.updateVisualization(), true);
    }

    updateVisualization() {
        if (window.visualizer) {
            if (typeof window.visualizer.calculateLayout === 'function') {
                window.visualizer.calculateLayout();
            }
            window.visualizer.render(this.nfa.currentStates);
        }
    }
}