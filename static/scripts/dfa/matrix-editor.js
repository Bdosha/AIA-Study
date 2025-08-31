class MatrixEditor {
    constructor(dfa) {
        this.dfa = dfa;
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
        for (let symbol of this.dfa.alphabet) {
            const th = document.createElement('th');
            th.innerHTML = `
                <div class="header-with-delete">
                    <span>${symbol}</span>
                    <button class="delete-symbol-btn" data-symbol="${symbol}" title="Удалить символ">&#10006;</button>
                </div>
            `;
            headerRow.appendChild(th);
        }
        headerRow.innerHTML += '<th>Принимающее</th><th>Начальное</th>';
        header.appendChild(headerRow);

        // --- Строки по состояниям
        for (let state of this.dfa.states) {
            const row = document.createElement('tr');

            // --- Ячейка с кнопкой удаления и именем состояния
            const stateCell = document.createElement('td');
            stateCell.className = 'state-label';
            stateCell.innerHTML = `
                <button class="delete-state-btn" data-state="${state}" title="Удалить состояние">&#10006;</button>
                <span>${state}</span>
            `;
            row.appendChild(stateCell);

            // --- Ячейки переходов
            for (let symbol of this.dfa.alphabet) {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'transition-input';
                input.dataset.fromState = state;
                input.dataset.symbol = symbol;
                input.value = this.dfa.getNextState(state, symbol) || '';
                input.placeholder = 'Состояние';
                // Только существующее состояние
                input.addEventListener('blur', (e) => {
                    this.updateTransition(state, symbol, e.target.value);
                });
                cell.appendChild(input);
                row.appendChild(cell);
            }

            // --- Чекбокс для принимающего состояния
            const acceptCell = document.createElement('td');
            const acceptCheckbox = document.createElement('input');
            acceptCheckbox.type = 'checkbox';
            acceptCheckbox.checked = this.dfa.acceptStates.has(state);
            acceptCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.dfa.acceptStates.add(state);
                } else {
                    this.dfa.acceptStates.delete(state);
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
            startRadio.checked = this.dfa.startState === state;
            startRadio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.dfa.startState = state;
                }
                this.updateVisualization();
            });
            startCell.appendChild(startRadio);
            row.appendChild(startCell);

            body.appendChild(row);
        }

        this.updateVisualization();
    }

    checkAutomaton() {
        const errors = this.dfa.validate();
        const errorContainer = document.getElementById('validation-errors');

        if (!errorContainer) return;

        if (errors.length > 0) {
            let errorHtml = '<div class="check-header">❌ <strong>Обнаружены ошибки в автомате:</strong></div>';
            errorHtml += errors.map(error => `<div class="error-item">• ${error}</div>`).join('');
            errorContainer.innerHTML = errorHtml;
            errorContainer.className = 'error-container show';
        } else {
            errorContainer.innerHTML = `
                <div class="success-message">
                    <div class="success-header">✅ <strong>Автомат готов к работе!</strong></div>
                    <div class="success-details">
                        • Состояний: ${this.dfa.states.size}<br>
                        • Символов: ${this.dfa.alphabet.size}<br>
                        • Переходов: ${this.dfa.transitions.size}<br>
                        • Начальное состояние: ${this.dfa.startState}<br>
                        • Принимающих состояний: ${this.dfa.acceptStates.size}
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

    updateTransition(fromState, symbol, toState) {
        const trimmed = toState.trim();
        if (trimmed) {
            if (!this.dfa.states.has(trimmed)) {
                alert(`Состояние "${trimmed}" не существует!`);
                this.renderMatrix();
                return;
            }
            this.dfa.addTransition(fromState, symbol, trimmed);
        } else {
            const key = `${fromState},${symbol}`;
            this.dfa.transitions.delete(key);
        }
        this.updateVisualization();
    }

    deleteState(state) {
        if (this.dfa.states.size <= 1) {
            alert('Нельзя удалить последнее состояние!');
            return;
        }
        if (!confirm(`Удалить состояние "${state}"?\nВсе связанные переходы будут удалены.`)) return;

        this.dfa.states.delete(state);
        this.dfa.acceptStates.delete(state);
        if (this.dfa.startState === state) {
            this.dfa.startState = Array.from(this.dfa.states)[0];
        }
        // Удалить связанные переходы
        for (let key of Array.from(this.dfa.transitions.keys())) {
            const [from, to] = key.split(',');
            if (from === state || this.dfa.transitions.get(key) === state) {
                this.dfa.transitions.delete(key);
            }
        }
        this.renderMatrix();
    }

    deleteSymbol(symbol) {
        if (this.dfa.alphabet.size <= 1) {
            alert('Нельзя удалить последний символ!');
            return;
        }
        if (!confirm(`Удалить символ "${symbol}"?\nВсе связанные переходы будут удалены.`)) return;

        this.dfa.alphabet.delete(symbol);
        for (let key of Array.from(this.dfa.transitions.keys())) {
            const [, sym] = key.split(',');
            if (sym === symbol) this.dfa.transitions.delete(key);
        }
        this.renderMatrix();
    }

    attachEventListeners() {
        const addStateBtn = document.getElementById('add-state');
        const addSymbolBtn = document.getElementById('add-symbol');
        const checkBtn = document.getElementById('check-btn');

        if (addStateBtn) {
            addStateBtn.addEventListener('click', () => {
                if (this.dfa.states.size >= this.MAX_STATES) {
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
                if (this.dfa.states.has(trimmedName)) {
                    alert('Состояние с таким именем уже существует!');
                    return;
                }
                this.dfa.addState(trimmedName);
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
                if (this.dfa.alphabet.has(trimmedSymbol)) {
                    alert('Такой символ уже есть.');
                    return;
                }
                this.dfa.addSymbol(trimmedSymbol);
                for (let state of this.dfa.states) {
                    this.dfa.addTransition(state, trimmedSymbol, '');
                }
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
        });

        // Автообновление визуализации при изменениях (например, ручная правка таблицы)
        this.table.addEventListener('change', () => this.updateVisualization());
        this.table.addEventListener('blur', () => this.updateVisualization(), true);
    }

    updateVisualization() {
        if (window.visualizer) {
            if (typeof window.visualizer.calculateLayout === 'function') window.visualizer.calculateLayout();
            window.visualizer.render(this.dfa.currentState);
        }
    }
}