// ui.js - управление пользовательским интерфейсом

class PostMachineUI {
    constructor() {
        this.machine = new PostMachine();
        this.viewStart = -7;
        this.viewEnd = 7;
        this.initializeUI();
        this.setupEventListeners();
        this.setupThemeToggle();  // ← ДОБАВЬ ЭТУ СТРОКУ!
        this.updateDisplay();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            
            if (document.body.classList.contains('light-theme')) {
                themeToggle.textContent = '🌙 Темная тема';
            } else {
                themeToggle.textContent = '🌞 Светлая тема';
            }
        }); // ← ДОБАВЬ ЭТУ ЗАКРЫВАЮЩУЮ СКОБКУ!
    }


    initializeUI() {
        // Initialize tape
        const tapeContainer = document.querySelector('.tape-container');
        const tapeNumbers = document.getElementById('tapeNumbers');

        // Clear existing content
        const existingCells = tapeContainer.querySelectorAll('.tape-cell');
        existingCells.forEach(cell => cell.remove());
        tapeNumbers.innerHTML = '';

        // Create tape cells
        // for (let i = 0; i < this.machine.tape.length; i++) {
        for (let i = this.viewStart; i <= this.viewEnd; i++) {
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            cell.dataset.index = i;
            tapeContainer.appendChild(cell);

            const number = document.createElement('div');
            number.className = 'tape-number';
            // number.textContent = i - 7; // Center at 0
            number.textContent = i;
            tapeNumbers.appendChild(number);
        }

        // Initialize examples dropdown
        const exampleSelect = document.getElementById('exampleSelect');
        exampleSelect.innerHTML = '';

        EXAMPLES.forEach((example, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = example.name;
            exampleSelect.appendChild(option);
        });

        this.updateLineNumbers();
        
        // В САМОМ КОНЦЕ добавь:
        // const tapeContainer = document.querySelector('.tape-container');
        const caret = document.createElement('div');
        caret.id = 'caret';
        tapeContainer.appendChild(caret);
    
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('runBtn').addEventListener('click', () => this.run());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('stepBtn').addEventListener('click', () => this.step());

        // Reset buttons
        document.getElementById('clearTapeBtn').addEventListener('click', () => this.clearTape());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Example selector
        document.getElementById('exampleSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.loadExample(parseInt(e.target.value));
            }
        });

        // Code editor
        const codeEditor = document.getElementById('codeEditor');
        codeEditor.addEventListener('input', () => {
            this.updateLineNumbers();
            this.machine.clearError();
        });

        codeEditor.addEventListener('scroll', () => {
            const lineNumbers = document.getElementById('lineNumbers');
            lineNumbers.scrollTop = codeEditor.scrollTop;
        });
    }

    updateLineNumbers() {
        const codeEditor = document.getElementById('codeEditor');
        const lineNumbers = document.getElementById('lineNumbers');
        const lines = codeEditor.value.split('\n');

        let numbersText = '';
        for (let i = 1; i <= Math.max(lines.length, 10); i++) {
            numbersText += i + '\n';
        }
        lineNumbers.textContent = numbersText;
    }

    loadExample(index) {
        if (index >= 0 && index < EXAMPLES.length) {
            const example = EXAMPLES[index];
            document.getElementById('codeEditor').value = example.code;
            this.updateLineNumbers();
            this.reset();
        }
    }

    run() {
        if (this.machine.status === 'paused') {
            this.machine.status = 'running';
            this.continuousExecution();
            this.updateControlButtons();
            return;
        }

        const code = document.getElementById('codeEditor').value;
        const parseResult = this.machine.parseProgram(code);

        if (parseResult.errors.length > 0) {
            this.machine.showError(parseResult.errors.join('\n'));
            return;
        }

        this.machine.program = parseResult.program;
        this.machine.currentLine = 1;
        this.machine.status = 'running';
        this.updateControlButtons();
        this.continuousExecution();
    }

    continuousExecution() {
        if (this.machine.status !== 'running') return;

        this.machine.executionInterval = setInterval(() => {
            if (this.machine.status === 'running') {
                const result = this.machine.executeStep();
                this.updateDisplay();
                if (!result) {
                    this.stop();
                }
            }
        }, 500); // 500ms between steps
    }

    pause() {
        this.machine.status = 'paused';
        if (this.machine.executionInterval) {
            clearInterval(this.machine.executionInterval);
            this.machine.executionInterval = null;
        }
        this.updateControlButtons();
        this.updateDisplay();
    }

    stop() {
        this.machine.status = 'stopped';
        if (this.machine.executionInterval) {
            clearInterval(this.machine.executionInterval);
            this.machine.executionInterval = null;
        }
        this.updateControlButtons();
        this.updateDisplay();
    }

    step() {
        if (this.machine.status === 'ready' || this.machine.status === 'stopped') {
            const code = document.getElementById('codeEditor').value;
            const parseResult = this.machine.parseProgram(code);

            if (parseResult.errors.length > 0) {
                this.machine.showError(parseResult.errors.join('\n'));
                return;
            }

            this.machine.program = parseResult.program;
            this.machine.currentLine = 1;
            this.machine.status = 'paused';
        }

        if (this.machine.status === 'paused' || this.machine.status === 'running') {
            this.machine.executeStep();
            this.updateControlButtons();
        }
        this.updateDisplay();
    }

    clearTape() {
        this.machine.clearTape();
        this.updateDisplay();
    }

    reset() {
        this.machine.reset();
        this.updateDisplay();
        this.updateControlButtons();
    }

    updateDisplay() {
        // === Динамический сдвиг окна ленты ===
        let needRebuild = false;
        
        if (this.machine.position < this.viewStart + 2) {
            this.viewStart = this.machine.position - 7;
            this.viewEnd = this.machine.position + 7;
            needRebuild = true;
        }
        
        if (this.machine.position > this.viewEnd - 2) {
            this.viewEnd = this.machine.position + 7;
            this.viewStart = this.machine.position - 7;
            needRebuild = true;
        }
        
        // Пересоздать ячейки если окно сдвинулось
        if (needRebuild) {
            this.rebuildTape();
        }

        // Update tape
        const cells = document.querySelectorAll('.tape-cell');
        cells.forEach((cell, index) => {
            const tapePosition = this.viewStart + index;
            cell.classList.toggle('marked', !!this.machine.tape[tapePosition]);
        });

        // Update caret position (ТОЛЬКО ОДИН РАЗ!)
        const caret = document.getElementById('caret');
        if (caret) {
            const cellWidth = 54;
            const visualPosition = this.machine.position - this.viewStart;
            caret.style.left = `${visualPosition * cellWidth + 25}px`;
            caret.classList.toggle('active', this.machine.status === 'running');
        }

        // УБЕРИ ВСЁ ЭТО:
        // const cellWidth = 54;
        // const visualPosition = this.machine.position - this.viewStart;
        // caret.style.left = `${visualPosition * cellWidth + 25}px`;
        // caret.classList.toggle('active', this.machine.status === 'running');

        // Update status
        const currentCommand = this.machine.program[this.machine.currentLine] || '-';
        document.getElementById('currentCommand').textContent = `Текущая команда: ${currentCommand}`;
        document.getElementById('caretPosition').textContent = `Позиция каретки: ${this.machine.position}`;
        document.getElementById('stepCounter').textContent = `Шагов выполнено: ${this.machine.steps}`;

        const statusElement = document.getElementById('executionStatus');
        const statusTexts = {
            ready: 'Готов к запуску',
            running: 'Выполняется',
            paused: 'Пауза',
            stopped: 'Остановлено',
            finished: 'Завершено',
            error: 'Ошибка'
        };

        statusElement.textContent = `Статус: ${statusTexts[this.machine.status]}`;
        statusElement.className = `status-line status-state ${this.machine.status}`;
    }


    rebuildTape() {
        const tapeContainer = document.querySelector('.tape-container');
        const tapeNumbers = document.getElementById('tapeNumbers');
        
        // СНАЧАЛА сохрани каретку:
        const existingCaret = document.getElementById('caret');
        
        // Удалить старые ячейки
        tapeContainer.innerHTML = '';
        tapeNumbers.innerHTML = '';
        
        // Создать ячейки:
        for (let i = this.viewStart; i <= this.viewEnd; i++) {
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            tapeContainer.appendChild(cell);
            
            const number = document.createElement('div');
            number.className = 'tape-number';
            number.textContent = i;
            tapeNumbers.appendChild(number);
        }
        
        // ПОТОМ создать каретку (или восстановить сохранённую):
        if (existingCaret) {
            tapeContainer.appendChild(existingCaret);  // ← Верни существующую
        } else {
            const caret = document.createElement('div');
            caret.id = 'caret';
            tapeContainer.appendChild(caret);
        }
    }




    updateControlButtons() {
        const runBtn = document.getElementById('runBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const stepBtn = document.getElementById('stepBtn');

        runBtn.disabled = this.machine.status === 'running';
        pauseBtn.disabled = this.machine.status !== 'running';
        stopBtn.disabled = this.machine.status === 'ready' || this.machine.status === 'stopped';
        stepBtn.disabled = this.machine.status === 'running' || this.machine.status === 'error';
    }
}

// Initialize the Post Machine when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.postMachineUI = new PostMachineUI();
});