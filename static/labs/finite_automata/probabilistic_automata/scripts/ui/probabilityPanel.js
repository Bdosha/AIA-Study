/**
 * @file probabilityPanel.js - Панель управления вероятностями переходов
 * @module ui/probabilityPanel
 */

class ProbabilityPanel {
    /**
     * Создает панель управления вероятностями
     * @param {HTMLElement} container - Контейнер для панели
     * @param {AutomataModel} model - Модель данных
     * @param {GraphView} graphView - Визуализатор графа (для обновления)
     */
    constructor(container, model, graphView) {
        this.container = container;
        this.model = model;
        this.graphView = graphView;
        this.currentSymbol = null;
        this.currentMatrix = null;
        
        this.init();
        this.setupEventListeners();
    }

    /**
     * Инициализирует панель
     */
    init() {
        this.setCurrentSymbol();
        this.render();
        this.setupEventListeners();
    }

    /**
     * Устанавливает текущий символ (первый из алфавита если не установлен)
     */
    setCurrentSymbol() {
        if (!this.model.currentAutomaton) {
            this.currentSymbol = null;
            return;
        }
        
        const symbols = Array.from(this.model.currentAutomaton.alphabet);
        
        if (symbols.length > 0) {
            // Если currentSymbol не установлен или не существует в алфавите, берем первый символ
            if (!this.currentSymbol || !symbols.includes(this.currentSymbol)) {
                this.currentSymbol = symbols[0];
            }
        } else {
            this.currentSymbol = null;
        }
        
        console.log('Текущий символ установлен:', this.currentSymbol);
    }
    /**
     * Рендерит панель управления
     */
    render() {
        console.log("render начался")
        if (!this.model.currentAutomaton) {
            console.log("Нет активного автомата")
            this.container.innerHTML = '<div class="no-automaton">Нет активного автомата</div>';
            return;
        }

        const automaton = this.model.currentAutomaton;
        const states = automaton.getAllStates();
        console.log("Все состояния:", states)
        
        this.container.innerHTML = `
            <div class="probability-panel">
                <div class="panel-section">
                    <div class="section-title">Управление матрицами переходов</div>
                    
                    <div class="symbol-selector">
                        <label>Текущий символ:</label>
                        <select id="currentSymbolSelect">
                            ${this.renderSymbolOptions()}
                        </select>
                    </div>
                    
                    <div class="matrix-controls">
                        <button id="randomizeMatrix">🎲 Случайная матрица</button>
                    </div>
                    
                    <div class="transition-matrix">
                        <h4>Матрица переходов для символа '${this.currentSymbol}'</h4>
                        ${this.renderTransitionMatrix(states)}
                    </div>
                </div>
                
                <div class="panel-section">
                    <div class="section-title">Начальное распределение</div>
                    ${this.renderInitialDistribution(states)}
                </div>
                
                <div class="panel-section">
                    <div class="section-title">Быстрые действия</div>
                    <div class="quick-actions">
                        <button id="autoGenerate">🤖 Автогенерация ВКА</button>
                        <button id="clearAll">🗑️ Очистить все</button>
                    </div>
                </div>
            </div>
        `;

        this.updateMatrixValidation();
    }

    /**
     * Рендерит опции выбора символов
     */
    renderSymbolOptions() {
        if (!this.model.currentAutomaton) return '';
        
        const symbols = Array.from(this.model.currentAutomaton.alphabet);
        console.log('Алфавит автомата "', this.model.currentAutomaton.name, '": ', symbols);
        return symbols.map(symbol => 
            `<option value="${symbol}" ${symbol === this.currentSymbol ? 'selected' : ''}>${symbol}</option>`
        ).join('');
    }

    /**
     * Рендерит матрицу переходов
     */
    renderTransitionMatrix(states) {
        console.log("Вот все состояния, которые попадают в renderTransitionMatrix: ", states)
        if (states.length === 0) {
            return '<div class="no-states">Нет состояний</div>';
        }

        const matrix = this.model.currentAutomaton.transitionMatrices.getMatrix(this.currentSymbol);
        this.currentMatrix = matrix;

        if (!matrix) {
            return '<div class="no-matrix">Матрица переходов для этого символа еще не создана</div>'
        }

        let html = `
            <table class="probability-matrix">
                <thead>
                    <tr>
                        <th>Из \\ В</th>
                        ${states.map(state => `<th>${state.label || state.id}</th>`).join('')}
                        <th>∑</th>
                    </tr>
                </thead>
                <tbody>
        `;

        states.forEach(fromState => {
            const rowSum = this.calculateRowSum(matrix, fromState.id);
            html += `
                <tr>
                    <td class="state-label">${fromState.label || fromState.id}</td>
            `;
            
            states.forEach(toState => {
                const probability = matrix ? matrix.getTransition(fromState.id, toState.id) : 0;
                // Показываем поле ввода даже для нулевых вероятностей
                const displayValue = probability > 0 ? probability.toFixed(2) :'0.00';

                html += `
                    <td>
                        <input type="number" 
                               class="probability-input" 
                               data-from="${fromState.id}" 
                               data-to="${toState.id}"
                               value="${displayValue}" 
                               min="0" max="1" step="0.1"
                               title="P(${toState.id} | ${fromState.id}, ${this.currentSymbol})">
                    </td>
                `;
            });

            html += `
                    <td class="row-sum ${Math.abs(rowSum - 1.0) > 0.01 ? 'invalid' : 'valid'}" 
                        data-state="${fromState.id}">
                        ${rowSum.toFixed(2)}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div class="matrix-validation" id="matrixValidation"></div>
        `;

        return html;
    }

    /**
     * Рендерит управление начальным распределением
     */
    renderInitialDistribution(states) {
        if (states.length === 0) {
            return '<div class="no-states">Нет состояний</div>';
        }

        const initialDist = this.model.currentAutomaton.initialDistribution;
        
        let html = `
            <div class="initial-distribution">
                <table class="distribution-table">
                    <thead>
                        <tr>
                            <th>Состояние</th>
                            <th>Вероятность</th>
                            <th>Начальное</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        states.forEach(state => {
            const probability = initialDist.getProbability(state.id);
            const isInitial = this.model.currentAutomaton.initialStates.has(state.id);
            
            html += `
                <tr>
                    <td class="state-label">${state.label || state.id}</td>
                    <td>
                        <input type="number" 
                               class="initial-prob-input" 
                               data-state="${state.id}"
                               value="${probability.toFixed(2)}" 
                               min="0" max="1" step="0.1"
                               ${!isInitial ? 'disabled' : ''}>
                    </td>
                    <td>
                        <input type="checkbox" 
                               class="initial-state-checkbox" 
                               data-state="${state.id}"
                               ${isInitial ? 'checked' : ''}>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div class="distribution-controls">
                    <button id="randomizeInitial">🎲 Случайное распределение</button>
                </div>
                <div class="distribution-validation" id="initialValidation"></div>
            </div>
        `;

        return html;
    }

    /**
     * Вычисляет сумму строки матрицы
     */
    calculateRowSum(matrix, fromState) {
        if (!matrix) return 0;
        
        const transitions = matrix.getTransitions(fromState);
        return Object.values(transitions).reduce((sum, prob) => sum + prob, 0);
    }

    /**
     * Пересчитывает и обновляет сумму для строки
     */
    updateRowSum(fromState) {
        const matrix = this.currentMatrix;
        if (!matrix) return 0;
        
        const rowSum = this.calculateRowSum(matrix, fromState);
        const rowSumElement = this.container.querySelector(`.row-sum[data-state="${fromState}"]`);
        
        if (rowSumElement) {
            rowSumElement.textContent = rowSum.toFixed(2);
            rowSumElement.className = `row-sum ${Math.abs(rowSum - 1.0) > 0.01 ? 'invalid' : 'valid'}`;
        }
        
        console.log("updateRowSum отработал, rowSum = ", rowSum)
        return rowSum;
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventListeners() {
        // Обработчик обновления панели вероятностей
        document.addEventListener('probabilityPanelUpdate', (e) => {
            console.log('ProbabilityPanel: получено событие обновления');

            if (e.detail && e.detail.automaton) {
                this.model.currentAutomaton = e.detail.automaton;
            }

            this.setCurrentSymbol();
            this.render();
        });

        // Выбор символа
        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'currentSymbolSelect') {
                this.currentSymbol = e.target.value;
                this.render();
            }
        });

        // Ввод вероятностей переходов
        this.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('probability-input')) {
                this.handleProbabilityChange(e.target);
            }
        });

        // Изменение вероятностей переходов (при потере фокуса)
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('probability-input')) {
                this.handleProbabilityChange(e.target);
            }
        });

        // Ввод начальных вероятностей
        this.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('initial-prob-input')) {
                this.handleInitialProbabilityChange(e.target);
            }
        });

        // Переключение начальных состояний
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('initial-state-checkbox')) {
                this.handleInitialStateToggle(e.target);
            }
        });

        // Кнопки управления
        this.container.addEventListener('click', (e) => {
            switch (e.target.id) {
                case 'randomizeMatrix':
                    this.randomizeMatrix();
                    break;
                case 'normalizeMatrix':
                    this.normalizeMatrix();
                    break;
                case 'randomizeInitial':
                    this.randomizeInitialDistribution();
                    break;
                case 'normalizeInitial':
                    this.normalizeInitialDistribution();
                    break;
                case 'autoGenerate':
                    this.autoGenerateAutomaton();
                    break;
                case 'clearAll':
                    this.clearAll();
                    break;
            }
        });
    }

    /**
     * Обрабатывает изменение вероятности перехода
     */
    handleProbabilityChange(input) {
        const fromState = input.dataset.from;
        const toState = input.dataset.to;
        const probability = parseFloat(input.value) || 0;

        try {
            const matrix = this.model.currentAutomaton.transitionMatrices.getMatrix(this.currentSymbol);
            if (!matrix) {
                console.error('Матрица для символа', this.currentSymbol, "не найдена")
                return;
            }
            // ВРЕМЕННО отключаем автонормализацию
            const wasAutoNormalize = matrix.autoNormalize;
            matrix.setAutoNormalize(false);

            this.model.currentAutomaton.setTransition(fromState, toState, this.currentSymbol, probability);

            // Восстанавливаем автонормализацию
            matrix.setAutoNormalize(wasAutoNormalize);
            
            this.updateRowSum(fromState);
            this.updateMatrixValidation();
            this.graphView.update();
            this.model.currentAutomaton.isValid();
            this.updateInitialValidation();
        } catch (error) {
            console.error('Ошибка установки перехода:', error);
            input.value = '0';
        }
    }

    /**
     * Обрабатывает изменение начальной вероятности
     */
    handleInitialProbabilityChange(input) {
        const stateId = input.dataset.state;
        const probability = parseFloat(input.value) || 0;

        this.model.currentAutomaton.initialDistribution.setProbability(stateId, probability);
        this.updateInitialValidation();

        // try {
        //     this.model.currentAutomaton.initialDistribution.setProbability(stateId, probability);
        //     this.updateInitialValidation();

        // } catch (error) {
        //     console.error('Ошибка установки начальной вероятности:', error);
        //     input.value = '0';
        // }
    }

    /**
     * Обрабатывает переключение начального состояния
     */
    handleInitialStateToggle(checkbox) {
        const stateId = checkbox.dataset.state;
        const isInitial = checkbox.checked;

        try {
            const state = this.model.currentAutomaton.getState(stateId);
            
            if (isInitial) {
                this.model.currentAutomaton.initialStates.add(stateId);
            } else {
                this.model.currentAutomaton.initialStates.delete(stateId);
            }

            // Обновляем начальное распределение
            this.model.currentAutomaton.updateInitialDistribution();
            
            // Перерисовываем панель
            this.render();
            this.graphView.update();

            this.updateInitialValidation();
            
        } catch (error) {
            console.error('Ошибка переключения начального состояния:', error);
            checkbox.checked = !isInitial;
        }
    }


    /**
     * Генерирует случайную матрицу переходов
     */
    randomizeMatrix(symbol = this.currentSymbol, updateView = true) {
        const automaton = this.model.currentAutomaton;
        const states = automaton.getAllStates();
        const matrix = automaton.transitionMatrices.getMatrix(symbol);

        // Временно отключаем автонормализацию
        if (matrix) {
            matrix.setAutoNormalize(false);
        }

        // Генерируем случайные вероятности
        states.forEach(fromState => {
            const transitions = {};
            let total = 0;

            // Случайные значения для каждого перехода
            states.forEach(toState => {
                const prob = Math.random();
                transitions[toState.id] = prob;
                total += prob;
            });

            // Нормализуем
            states.forEach(toState => {
                const normalizedProb = transitions[toState.id] / total;
                automaton.setTransition(fromState.id, toState.id, symbol, normalizedProb);
            });
        });

        // Включаем обратно автонормализацию
        if (matrix) {
            matrix.setAutoNormalize(true);
            matrix.normalizeAll();
        }

        if (updateView) {
            this.render();
            this.graphView.update();
        }
    }

    /**
     * Нормализует матрицу переходов
     */
    normalizeMatrix() {
        const matrix = this.model.currentAutomaton.transitionMatrices.getMatrix(this.currentSymbol);
        if (matrix) {
            matrix.normalizeAll();
            this.render();
            this.graphView.update();
        }
    }

    /**
     * Генерирует случайное начальное распределение
     */
    randomizeInitialDistribution() {
        const automaton = this.model.currentAutomaton;
        const initialStates = Array.from(automaton.initialStates);
        
        if (initialStates.length === 0) {
            alert('Нет начальных состояний');
            return;
        }

        // Генерируем случайные вероятности
        const probabilities = {};
        let total = 0;

        initialStates.forEach(stateId => {
            const prob = Math.random();
            probabilities[stateId] = prob;
            total += prob;
        });

        // Нормализуем и устанавливаем
        initialStates.forEach(stateId => {
            const normalizedProb = probabilities[stateId] / total;
            automaton.initialDistribution.setProbability(stateId, normalizedProb);
        });

        this.render();
        this.updateInitialValidation();
    }

    /**
     * Нормализует начальное распределение
     */
    normalizeInitialDistribution() {
        this.model.currentAutomaton.initialDistribution.normalize();
        this.render();
        this.updateInitialValidation();
    }

    /**
     * Автоматически генерирует простой автомат
     */
    autoGenerateAutomaton() {
        const automatonId = this.model.createAutomaton('Автогенерированный ВКА');
        const automaton = this.model.currentAutomaton;

        // Добавляем 3 состояния
        automaton.addState('q0', true, false, 200, 150);
        automaton.addState('q1', false, false, 400, 150);
        automaton.addState('q2', false, false, 300, 350);

        // Добавляем символы
        automaton.addSymbol('a');
        automaton.addSymbol('b');

        // Случайные переходы
        this.currentSymbol = 'a';
        this.randomizeMatrix();
        
        this.currentSymbol = 'b';
        this.randomizeMatrix();

        // Случайное начальное распределение
        this.randomizeInitialDistribution();

        // ОБНОВЛЯЕМ АВТОМАТ В GRAPHVIEW
        if (this.graphView) {
            this.graphView.automaton = automaton; // Явно устанавливаем новый автомат
            this.graphView.randomizePositions();
        }

        this.render();
    }

    /**
     * Очищает все настройки (создает новый пустой автомат)
     */
    clearAll() {
        if (confirm('Вы уверены, что хотите удалить текущий автомат и создать новый?')) {
            // Создаем новый автомат
            const newAutomatonId = this.model.createAutomaton('Новый автомат');
            this.model.currentAutomaton = this.model.getAutomaton(newAutomatonId);
            
            // Обновляем визуализацию
            if (this.graphView) {
                this.graphView.automaton = this.model.currentAutomaton;
                this.graphView.render();
            }
            
            this.render();
            console.log('Создан новый пустой автомат');
        }
    }

    /**
     * Обновляет валидацию матрицы
     */
    updateMatrixValidation() {
        const validationElement = this.container.querySelector('#matrixValidation');
        if (!validationElement) return;

        const matrix = this.model.currentAutomaton.transitionMatrices.getMatrix(this.currentSymbol);
        if (!matrix) {
            validationElement.innerHTML = '<div class="validation-error">Матрица не существует</div>';
            return;
        }

        const states = Array.from(this.model.currentAutomaton.states.keys());
        const isValid = matrix.isValid(states);

        if (isValid) {
            validationElement.innerHTML = '<div class="validation-success">✓ Матрица валидна</div>';
        } else {
            const errors = matrix.validationErrors.join('<br>');
            validationElement.innerHTML = `<div class="validation-error">✗ Ошибки валидации:<br>${errors}</div>`;
        }
    }

    /**
     * Обновляет валидацию начального распределения
     */
    updateInitialValidation() {
        const validationElement = this.container.querySelector('#initialValidation');
        if (!validationElement) return;

        const isValid = this.model.currentAutomaton.initialDistribution.isValid();
        const totalSum = this.model.currentAutomaton.initialDistribution.getTotalProbability();

        console.log('Initial distribution validation:', { totalSum, isValid });

        if (isValid) {
            validationElement.innerHTML = '<div class="validation-success">✓ Начальное распределение валидно</div>';
        } else {
            validationElement.innerHTML = '<div class="validation-error">✗ Сумма вероятностей ≠ 1</div>';
        }
    }
    
    /**
     * Обновляет панель
     */
    update() {
        this.render();
    }


    /**
     * Уничтожает панель
     */
    destroy() {
        // Очищаем контейнер
        this.container.innerHTML = '';
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProbabilityPanel };
} else {
    window.ProbabilityPanel = ProbabilityPanel;
}