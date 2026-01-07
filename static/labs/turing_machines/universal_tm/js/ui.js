class UI {
    constructor(turingMachine, simulator) {
        this.tm = turingMachine;
        this.simulator = simulator;
        this.currentTheme = 'dark';
        
        this.initializeEventListeners();
        this.updateUI();
    }
    
    initializeEventListeners() {
        // Переключение темы (тумблер)
        document.getElementById('theme-toggle').addEventListener('change', (e) => {
            this.toggleTheme();
        });
        
        // Управление симуляцией
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.simulator.isRunning) {
                this.simulator.pause();
            } else {
                this.startSimulation();
            }
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.simulator.pause();
        });
        
        document.getElementById('step-btn').addEventListener('click', () => {
            this.stepSimulation();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.simulator.reset();
        });
        
        // Управление лентой
        document.getElementById('clear-tape').addEventListener('click', () => {
            this.tm.initializeTape();
            this.updateTape();
            document.getElementById('tape-input').value = '';
        });
        
        document.getElementById('reset-tape').addEventListener('click', () => {
            this.tm.reset();
            this.updateTape();
        });
        
        // Редактирование ленты
        document.getElementById('apply-tape').addEventListener('click', () => {
            this.applyTapeContent();
        });
        
        document.getElementById('tape-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyTapeContent();
            }
        });
        
        // Таблица переходов
        document.getElementById('add-transition').addEventListener('click', () => {
            this.addTransitionRow();
        });
        
        // Библиотека программ
        document.getElementById('load-program').addEventListener('click', () => {
            this.loadSelectedProgram();
        });
        
        // Импорт/Экспорт
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportConfiguration();
        });
        
        document.getElementById('import-trigger').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        document.getElementById('import-file').addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        document.getElementById('import-confirm').addEventListener('click', () => {
            this.importConfiguration();
        });
        
        // Настройки конфигурации
        document.getElementById('alphabet').addEventListener('change', (e) => {
            this.updateConfiguration();
        });
        
        document.getElementById('states').addEventListener('change', (e) => {
            this.updateConfiguration();
            this.updateStatesDropdown();
        });
        
        document.getElementById('initial-state').addEventListener('change', (e) => {
            this.updateConfiguration();
        });
        
        document.getElementById('final-states').addEventListener('change', (e) => {
            this.updateConfiguration();
        });
        
        // Callbacks симулятора
        this.simulator.onStep = (result, stepCount) => {
            this.updateTape();
            this.updateInfoPanel(result, stepCount);
            this.highlightActiveTransition(result);
        };
        
        this.simulator.onStateChange = (state, stats) => {
            this.updateControlButtons(state);
            this.updateInfoPanel(null, stats.steps);
        };
        
        this.simulator.onError = (error) => {
            alert(`Ошибка: ${error}`);
        };
    }
    
    startSimulation() {
        // First validate the configuration
        if (!this.validateConfiguration()) {
            return;
        }
        
        // Apply the transition table to the Turing machine
        this.tm.setTransitionFunction(this.tm.transitionTable);
        
        // Start simulation
        this.simulator.start();
    }
    
    stepSimulation() {
        if (!this.simulator.isRunning) {
            if (!this.validateConfiguration()) {
                return;
            }
            this.tm.setTransitionFunction(this.tm.transitionTable);
        }
        
        this.simulator.step();
    }
    
    validateConfiguration() {
        // Check if transition table is not empty
        if (this.tm.transitionTable.size === 0) {
            alert('Таблица переходов пуста! Добавьте хотя бы один переход.');
            return false;
        }
        
        // Check if initial state is set
        if (!this.tm.initialState) {
            alert('Начальное состояние не задано!');
            return false;
        }
        
        return true;
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Обновляем label тумблера
        const themeLabel = document.querySelector('.theme-label');
        themeLabel.textContent = this.currentTheme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
        
        localStorage.setItem('theme', this.currentTheme);
    }
    
    applyTapeContent() {
        const tapeInput = document.getElementById('tape-input');
        const symbols = tapeInput.value.split(' ').filter(symbol => symbol !== '');
        
        // Если ввод пустой, используем пробел как пустую ячейку
        if (symbols.length === 0) {
            symbols.push(' ');
        }
        
        this.tm.initializeTape(symbols);
        this.updateTape();
        
        // Показываем подтверждение
        const originalText = tapeInput.placeholder;
        tapeInput.placeholder = "Лента обновлена!";
        setTimeout(() => {
            tapeInput.placeholder = originalText;
        }, 1000);
    }
    
    updateTape() {
        const tapeElement = document.getElementById('tape');
        const tapeState = this.tm.getTapeState();
        
        tapeElement.innerHTML = '';
        
        tapeState.cells.forEach(cell => {
            const cellElement = document.createElement('div');
            cellElement.className = `tape-cell ${cell.isActive ? 'active' : ''}`;
            cellElement.textContent = cell.symbol === ' ' ? '□' : cell.symbol;
            
            const indexElement = document.createElement('div');
            indexElement.className = 'tape-index';
            indexElement.textContent = cell.position;
            
            cellElement.appendChild(indexElement);
            tapeElement.appendChild(cellElement);
        });
    }
    
    updateInfoPanel(stepResult, stepCount) {
        document.getElementById('head-position').textContent = this.tm.headPosition;
        document.getElementById('steps-counter').textContent = stepCount;
        
        let status = 'Готов';
        let statusClass = 'ready';
        
        if (this.simulator.isRunning) {
            status = 'Выполняется';
            statusClass = 'running';
        } else if (this.tm.isInFinalState()) {
            status = 'Завершено';
            statusClass = 'completed';
        }
        
        const statusElement = document.getElementById('simulation-status');
        statusElement.textContent = status;
        statusElement.className = `stat-value ${statusClass}`;
        
        if (stepResult) {
            const command = `${stepResult.currentState}, ${stepResult.currentSymbol} → ${stepResult.newState}, ${stepResult.newSymbol}, ${stepResult.direction}`;
            document.getElementById('current-command').textContent = command;
        }
    }
    
    updateControlButtons(state) {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (state === 'running') {
            startBtn.textContent = 'Продолжить';
            pauseBtn.disabled = false;
        } else {
            startBtn.textContent = 'Старт';
            pauseBtn.disabled = true;
        }
    }
    
    highlightActiveTransition(stepResult) {
        const rows = document.querySelectorAll('#transition-body tr');
        rows.forEach(row => row.classList.remove('active-transition'));
        
        if (stepResult) {
            const key = `${stepResult.currentState},${stepResult.currentSymbol}`;
            const row = document.querySelector(`tr[data-key="${key}"]`);
            if (row) {
                row.classList.add('active-transition');
            }
        }
    }
    
    addTransitionRow(currentState = this.tm.initialState, readSymbol = '', newState = this.tm.initialState, writeSymbol = '', direction = 'R') {
        const tableBody = document.getElementById('transition-body');
        const newRow = document.createElement('tr');
        
        newRow.innerHTML = `
            <td>
                <select class="transition-state">
                    ${this.tm.states.map(state => `<option value="${state}" ${state === currentState ? 'selected' : ''}>${state}</option>`).join('')}
                </select>
            </td>
            <td><input type="text" class="transition-symbol" maxlength="1" value="${readSymbol}"></td>
            <td>
                <select class="transition-new-state">
                    ${this.tm.states.map(state => `<option value="${state}" ${state === newState ? 'selected' : ''}>${state}</option>`).join('')}
                </select>
            </td>
            <td><input type="text" class="transition-new-symbol" maxlength="1" value="${writeSymbol}"></td>
            <td>
                <select class="transition-direction">
                    <option value="L" ${direction === 'L' ? 'selected' : ''}>L</option>
                    <option value="R" ${direction === 'R' ? 'selected' : ''}>R</option>
                    <option value="S" ${direction === 'S' ? 'selected' : ''}>S</option>
                </select>
            </td>
            <td>
                <button class="btn-danger remove-transition">Удалить</button>
            </td>
        `;
        
        newRow.querySelector('.remove-transition').addEventListener('click', () => {
            tableBody.removeChild(newRow);
            this.updateTransitionTable();
        });
        
        const inputs = newRow.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateTransitionTable();
            });
        });
        
        tableBody.appendChild(newRow);
    }
    
    updateTransitionTable() {
        this.tm.transitionTable.clear();
        
        const rows = document.querySelectorAll('#transition-body tr');
        rows.forEach((row, index) => {
            const currentState = row.querySelector('.transition-state').value;
            const readSymbol = row.querySelector('.transition-symbol').value;
            const newState = row.querySelector('.transition-new-state').value;
            const writeSymbol = row.querySelector('.transition-new-symbol').value;
            const direction = row.querySelector('.transition-direction').value;
            
            if (currentState && readSymbol) {
                row.dataset.key = `${currentState},${readSymbol}`;
                this.tm.addTransition(currentState, readSymbol, newState, writeSymbol, direction);
            }
        });
    }
    
    updateStatesDropdown() {
        const initialSelect = document.getElementById('initial-state');
        initialSelect.innerHTML = this.tm.states.map(state => `<option value="${state}" ${state === this.tm.initialState ? 'selected' : ''}>${state}</option>`).join('');
    }
    
    updateConfiguration() {
        const alphabetInput = document.getElementById('alphabet').value.split(',').map(s => s.trim()).filter(s => s);
        this.tm.setAlphabet(alphabetInput);
        
        const statesInput = document.getElementById('states').value.split(',').map(s => s.trim()).filter(s => s);
        this.tm.setStates(statesInput);
        
        const initialState = document.getElementById('initial-state').value;
        this.tm.setInitialState(initialState);
        
        const finalStatesInput = document.getElementById('final-states').value.split(',').map(s => s.trim()).filter(s => s);
        this.tm.setFinalStates(finalStatesInput);
        
        // Обновляем дропдауны в таблице переходов
        const stateSelects = document.querySelectorAll('.transition-state, .transition-new-state');
        stateSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = this.tm.states.map(state => `<option value="${state}" ${state === currentValue ? 'selected' : ''}>${state}</option>`).join('');
        });
    }
    
    loadSelectedProgram() {
        const programSelect = document.getElementById('program-select');
        const programName = programSelect.value;
        
        const programs = {
            addition: {
                name: 'Сложение унарных чисел',
                alphabet: ['1', '+', ' '],
                states: ['q0', 'q1', 'q2', 'q3', 'qf'],
                initialState: 'q0',
                finalStates: ['qf'],
                initialTape: ['1', '1', '1', '+', '1', '1'],
                transitions: [
                    { currentState: 'q0', readSymbol: '1', newState: 'q0', writeSymbol: '1', direction: 'R' },
                    { currentState: 'q0', readSymbol: '+', newState: 'q1', writeSymbol: '1', direction: 'R' },
                    { currentState: 'q1', readSymbol: '1', newState: 'q1', writeSymbol: '1', direction: 'R' },
                    { currentState: 'q1', readSymbol: ' ', newState: 'q2', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'q2', readSymbol: '1', newState: 'q3', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'q3', readSymbol: '1', newState: 'q3', writeSymbol: '1', direction: 'L' },
                    { currentState: 'q3', readSymbol: ' ', newState: 'qf', writeSymbol: ' ', direction: 'S' },
                    { currentState: 'q0', readSymbol: ' ', newState: 'qf', writeSymbol: ' ', direction: 'S' },
                    { currentState: 'q1', readSymbol: '+', newState: 'qf', writeSymbol: '+', direction: 'S' },
                    { currentState: 'q2', readSymbol: ' ', newState: 'qf', writeSymbol: ' ', direction: 'S' },
                    { currentState: 'q2', readSymbol: '+', newState: 'qf', writeSymbol: '+', direction: 'S' },
                    { currentState: 'q3', readSymbol: '+', newState: 'qf', writeSymbol: '+', direction: 'S' }
                ]
            },
            multiplication: {
                name: 'Умножение унарных чисел',
                alphabet: ['1', '*', '2', '3', '4', ' '],
                states: ['start', 'get', 'right', 'read', 'copy', 'moreCopy', 'findNext', 'lastCopy', 'restart', 'cleanup', 'halt'],
                initialState: 'start',
                finalStates: ['halt'],
                initialTape: ['1', '1', '*', '1', '1', '1'],
                transitions: [
                    { currentState: 'start', readSymbol: '1', newState: 'get', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'get', readSymbol: '1', newState: 'right', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'get', readSymbol: '*', newState: 'cleanup', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'right', readSymbol: '1', newState: 'right', writeSymbol: '1', direction: 'R' },
                    { currentState: 'right', readSymbol: '*', newState: 'read', writeSymbol: '*', direction: 'R' },
                    { currentState: 'read', readSymbol: '1', newState: 'copy', writeSymbol: '2', direction: 'R' },
                    { currentState: 'read', readSymbol: '2', newState: 'read', writeSymbol: '2', direction: 'R' },
                    { currentState: 'copy', readSymbol: '1', newState: 'moreCopy', writeSymbol: '4', direction: 'R' },
                    { currentState: 'copy', readSymbol: '3', newState: 'lastCopy', writeSymbol: '1', direction: 'R' },
                    { currentState: 'copy', readSymbol: ' ', newState: 'restart', writeSymbol: '1', direction: 'L' },
                    { currentState: 'moreCopy', readSymbol: '1', newState: 'moreCopy', writeSymbol: '1', direction: 'R' },
                    { currentState: 'moreCopy', readSymbol: '3', newState: 'moreCopy', writeSymbol: '3', direction: 'R' },
                    { currentState: 'moreCopy', readSymbol: ' ', newState: 'findNext', writeSymbol: '3', direction: 'L' },
                    { currentState: 'findNext', readSymbol: '1', newState: 'findNext', writeSymbol: '1', direction: 'L' },
                    { currentState: 'findNext', readSymbol: '3', newState: 'findNext', writeSymbol: '3', direction: 'L' },
                    { currentState: 'findNext', readSymbol: '4', newState: 'copy', writeSymbol: '2', direction: 'R' },
                    { currentState: 'lastCopy', readSymbol: '1', newState: 'lastCopy', writeSymbol: '1', direction: 'R' },
                    { currentState: 'lastCopy', readSymbol: '2', newState: 'lastCopy', writeSymbol: '1', direction: 'R' },
                    { currentState: 'lastCopy', readSymbol: '3', newState: 'lastCopy', writeSymbol: '1', direction: 'R' },
                    { currentState: 'lastCopy', readSymbol: ' ', newState: 'restart', writeSymbol: '1', direction: 'L' },
                    { currentState: 'restart', readSymbol: '*', newState: 'restart', writeSymbol: '*', direction: 'L' },
                    { currentState: 'restart', readSymbol: '1', newState: 'restart', writeSymbol: '1', direction: 'L' },
                    { currentState: 'restart', readSymbol: '2', newState: 'restart', writeSymbol: '2', direction: 'L' },
                    { currentState: 'restart', readSymbol: ' ', newState: 'get', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'cleanup', readSymbol: '1', newState: 'cleanup', writeSymbol: '1', direction: 'R' },
                    { currentState: 'cleanup', readSymbol: '2', newState: 'cleanup', writeSymbol: '1', direction: 'R' },
                    { currentState: 'cleanup', readSymbol: ' ', newState: 'halt', writeSymbol: ' ', direction: 'L' }
                ]
            },
            palindrome: {
                alphabet: ['a', 'b', ' '],
                states: ['start', 'findRighta', 'findRightb', 'matchRighta', 'matchRightb', 'reverseStart', 'findLefta', 'findLeftb', 'matchLefta', 'matchLeftb', 'accept', 'reject'],
                initialState: 'start',
                finalStates: ['accept'],
                initialTape: ['a', 'b', 'a'], // Пример для теста, можно изменить
                transitions: [
                    { currentState: 'start', readSymbol: 'a', newState: 'findRighta', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'start', readSymbol: 'b', newState: 'findRightb', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'start', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'findRighta', readSymbol: 'a', newState: 'findRighta', writeSymbol: 'a', direction: 'R' },
                    { currentState: 'findRighta', readSymbol: 'b', newState: 'findRighta', writeSymbol: 'b', direction: 'R' },
                    { currentState: 'findRighta', readSymbol: ' ', newState: 'matchRighta', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'matchRighta', readSymbol: 'a', newState: 'reverseStart', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'matchRighta', readSymbol: 'b', newState: 'reject', writeSymbol: 'b', direction: 'L' },
                    { currentState: 'matchRighta', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'findRightb', readSymbol: 'a', newState: 'findRightb', writeSymbol: 'a', direction: 'R' },
                    { currentState: 'findRightb', readSymbol: 'b', newState: 'findRightb', writeSymbol: 'b', direction: 'R' },
                    { currentState: 'findRightb', readSymbol: ' ', newState: 'matchRightb', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'matchRightb', readSymbol: 'a', newState: 'reject', writeSymbol: 'a', direction: 'L' },
                    { currentState: 'matchRightb', readSymbol: 'b', newState: 'reverseStart', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'matchRightb', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'reverseStart', readSymbol: 'a', newState: 'findLefta', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'reverseStart', readSymbol: 'b', newState: 'findLeftb', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'reverseStart', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'L' },
                    { currentState: 'findLefta', readSymbol: 'a', newState: 'findLefta', writeSymbol: 'a', direction: 'L' },
                    { currentState: 'findLefta', readSymbol: 'b', newState: 'findLefta', writeSymbol: 'b', direction: 'L' },
                    { currentState: 'findLefta', readSymbol: ' ', newState: 'matchLefta', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'matchLefta', readSymbol: 'a', newState: 'start', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'matchLefta', readSymbol: 'b', newState: 'reject', writeSymbol: 'b', direction: 'R' },
                    { currentState: 'matchLefta', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'findLeftb', readSymbol: 'a', newState: 'findLeftb', writeSymbol: 'a', direction: 'L' },
                    { currentState: 'findLeftb', readSymbol: 'b', newState: 'findLeftb', writeSymbol: 'b', direction: 'L' },
                    { currentState: 'findLeftb', readSymbol: ' ', newState: 'matchLeftb', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'matchLeftb', readSymbol: 'a', newState: 'reject', writeSymbol: 'a', direction: 'R' },
                    { currentState: 'matchLeftb', readSymbol: 'b', newState: 'start', writeSymbol: ' ', direction: 'R' },
                    { currentState: 'matchLeftb', readSymbol: ' ', newState: 'accept', writeSymbol: ' ', direction: 'R' },
                    // Для reject - зацикливаем, чтобы не было ошибки, но симулятор остановится как reject (не final)
                    { currentState: 'reject', readSymbol: 'a', newState: 'reject', writeSymbol: 'a', direction: 'S' },
                    { currentState: 'reject', readSymbol: 'b', newState: 'reject', writeSymbol: 'b', direction: 'S' },
                    { currentState: 'reject', readSymbol: ' ', newState: 'reject', writeSymbol: ' ', direction: 'S' }
                ]
            },
            copy: {
                alphabet: ["a", "b", " ", "C", "X", "Y"],
                states: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"],
                initialState: "q1",
                finalStates: ["q9"],
                initialTape: ["a", "b"],
                transitions: [
                    {currentState: "q1", readSymbol: "a", newState: "q1", writeSymbol: "a", direction: "R"},
                    {currentState: "q1", readSymbol: "b", newState: "q1", writeSymbol: "b", direction: "R"},
                    {currentState: "q1", readSymbol: " ", newState: "q2", writeSymbol: "C", direction: "L"},
                    {currentState: "q2", readSymbol: "a", newState: "q2", writeSymbol: "a", direction: "L"},
                    {currentState: "q2", readSymbol: "b", newState: "q2", writeSymbol: "b", direction: "L"},
                    {currentState: "q2", readSymbol: " ", newState: "q3", writeSymbol: " ", direction: "R"},
                    {currentState: "q3", readSymbol: "a", newState: "q4", writeSymbol: "X", direction: "R"},
                    {currentState: "q3", readSymbol: "b", newState: "q5", writeSymbol: "Y", direction: "R"},
                    {currentState: "q3", readSymbol: "C", newState: "q7", writeSymbol: "C", direction: "L"},
                    {currentState: "q4", readSymbol: "a", newState: "q4", writeSymbol: "a", direction: "R"},
                    {currentState: "q4", readSymbol: "b", newState: "q4", writeSymbol: "b", direction: "R"},
                    {currentState: "q4", readSymbol: "C", newState: "q4", writeSymbol: "C", direction: "R"},
                    {currentState: "q4", readSymbol: " ", newState: "q6", writeSymbol: "a", direction: "L"},
                    {currentState: "q5", readSymbol: "a", newState: "q5", writeSymbol: "a", direction: "R"},
                    {currentState: "q5", readSymbol: "b", newState: "q5", writeSymbol: "b", direction: "R"},
                    {currentState: "q5", readSymbol: "C", newState: "q5", writeSymbol: "C", direction: "R"},
                    {currentState: "q5", readSymbol: " ", newState: "q6", writeSymbol: "b", direction: "L"},
                    {currentState: "q6", readSymbol: "a", newState: "q6", writeSymbol: "a", direction: "L"},
                    {currentState: "q6", readSymbol: "b", newState: "q6", writeSymbol: "b", direction: "L"},
                    {currentState: "q6", readSymbol: "C", newState: "q6", writeSymbol: "C", direction: "L"},
                    {currentState: "q6", readSymbol: "X", newState: "q3", writeSymbol: "a", direction: "R"},
                    {currentState: "q6", readSymbol: "Y", newState: "q3", writeSymbol: "b", direction: "R"},
                    {currentState: "q7", readSymbol: "a", newState: "q7", writeSymbol: "a", direction: "L"},
                    {currentState: "q7", readSymbol: "b", newState: "q7", writeSymbol: "b", direction: "L"},
                    {currentState: "q7", readSymbol: " ", newState: "q8", writeSymbol: " ", direction: "R"},
                    // Добавленные переходы для удаления C
                    {currentState: "q8", readSymbol: "a", newState: "q8", writeSymbol: "a", direction: "R"},
                    {currentState: "q8", readSymbol: "b", newState: "q8", writeSymbol: "b", direction: "R"},
                    {currentState: "q8", readSymbol: "C", newState: "q9", writeSymbol: " ", direction: "S"},
                    {currentState: "q8", readSymbol: "X", newState: "q8", writeSymbol: "X", direction: "R"},
                    {currentState: "q8", readSymbol: "Y", newState: "q8", writeSymbol: "Y", direction: "R"},
                    {currentState: "q8", readSymbol: " ", newState: "q8", writeSymbol: " ", direction: "R"},
                    // Безопасные переходы для q9 (финальное состояние)
                    {currentState: "q9", readSymbol: "a", newState: "q9", writeSymbol: "a", direction: "S"},
                    {currentState: "q9", readSymbol: "b", newState: "q9", writeSymbol: "b", direction: "S"},
                    {currentState: "q9", readSymbol: "C", newState: "q9", writeSymbol: "C", direction: "S"},
                    {currentState: "q9", readSymbol: "X", newState: "q9", writeSymbol: "X", direction: "S"},
                    {currentState: "q9", readSymbol: "Y", newState: "q9", writeSymbol: "Y", direction: "S"},
                    {currentState: "q9", readSymbol: " ", newState: "q9", writeSymbol: " ", direction: "S"}
                ]

            }

        };
        const program = programs[programName];
        if (program) {
            this.tm.importConfiguration(program);
            
            // Обновляем UI
            document.getElementById('alphabet').value = program.alphabet.join(', ');
            document.getElementById('states').value = program.states.join(', ');
            document.getElementById('final-states').value = program.finalStates.join(', ');
            document.getElementById('tape-input').value = program.initialTape.join(' ');
            
            this.updateUI();
            this.simulator.reset();
            
            // Очищаем и перезаполняем таблицу переходов
            const tableBody = document.getElementById('transition-body');
            tableBody.innerHTML = '';
            
            program.transitions.forEach(transition => {
                this.addProgramTransitionRow(transition);
            });
            
            this.updateTransitionTable();
            
            alert(`Программа "${programSelect.options[programSelect.selectedIndex].text}" загружена! `);
        }
    }
    
    addProgramTransitionRow(transition) {
        const tableBody = document.getElementById('transition-body');
        const newRow = document.createElement('tr');
        
        newRow.innerHTML = `
            <td>
                <select class="transition-state">
                    ${this.tm.states.map(state => 
                        `<option value="${state}" ${state === transition.currentState ? 'selected' : ''}>${state}</option>`
                    ).join('')}
                </select>
            </td>
            <td><input type="text" class="transition-symbol" maxlength="1" value="${transition.readSymbol}"></td>
            <td>
                <select class="transition-new-state">
                    ${this.tm.states.map(state => 
                        `<option value="${state}" ${state === transition.newState ? 'selected' : ''}>${state}</option>`
                    ).join('')}
                </select>
            </td>
            <td><input type="text" class="transition-new-symbol" maxlength="1" value="${transition.writeSymbol}"></td>
            <td>
                <select class="transition-direction">
                    <option value="L" ${transition.direction === 'L' ? 'selected' : ''}>L</option>
                    <option value="R" ${transition.direction === 'R' ? 'selected' : ''}>R</option>
                    <option value="S" ${transition.direction === 'S' ? 'selected' : ''}>S</option>
                </select>
            </td>
            <td>
                <button class="btn-danger remove-transition">Удалить</button>
            </td>
        `;
        
        newRow.querySelector('.remove-transition').addEventListener('click', () => {
            tableBody.removeChild(newRow);
            this.updateTransitionTable();
        });
        
        const inputs = newRow.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateTransitionTable();
            });
        });
        
        tableBody.appendChild(newRow);
    }
    
    exportConfiguration() {
        this.updateTransitionTable(); // Сохраняем текущие переходы
        const config = this.tm.exportConfiguration();
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'turing_machine_config.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('file-name').textContent = file.name;
            document.getElementById('import-confirm').disabled = false;
        }
    }
    
    importConfiguration() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.tm.importConfiguration(config);
                this.updateUI();
                this.simulator.reset();
                
                // Обновляем UI формы
                document.getElementById('alphabet').value = config.alphabet.join(', ');
                document.getElementById('states').value = config.states.join(', ');
                document.getElementById('final-states').value = config.finalStates.join(', ');
                
                if (config.tape && config.tape.length > 0) {
                    const tapeSymbols = config.tape.map(([_, symbol]) => symbol);
                    document.getElementById('tape-input').value = tapeSymbols.join(' ');
                }
                
                // Обновляем таблицу переходов
                const tableBody = document.getElementById('transition-body');
                tableBody.innerHTML = '';
                
                config.transitions.forEach(transition => {
                    this.addProgramTransitionRow(transition);
                });
                
                this.updateTransitionTable();
                
                alert('Конфигурация успешно загружена!');
            } catch (error) {
                alert('Ошибка при загрузке конфигурации: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    updateUI() {
        this.updateTape();
        this.updateConfiguration();
        this.updateStatesDropdown();
        this.updateInfoPanel(null, 0);
        this.updateControlButtons('reset');
    }
}

