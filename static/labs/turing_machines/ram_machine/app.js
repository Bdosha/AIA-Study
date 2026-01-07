/**
 * Симулятор RAM-машины - ИТОГОВАЯ ВЕРСИЯ 4.0
 * ✅ 7 примеров программ
 * ✅ Исправленное переключение тем (светлая по умолчанию)
 * ✅ Экспорт результатов в CSV
 */

// ========== ОСНОВНОЙ КЛАСС RAM-МАШИНЫ ==========
class RAMCore {
    constructor() {
        this.reset();
    }

    reset() {
        this.registers = {};
        this.pc = 0;
        this.inputTape = [];
        this.inputPointer = 0;
        this.outputTape = [];
        this.program = [];
        this.labels = {};
        this.running = false;
        this.halted = false;
        this.stepCount = 0;
        this.startTime = null;
        this.executionLog = [];
    }

    loadProgram(program, labels) {
        this.program = program;
        this.labels = labels;
        this.pc = 0;
        this.halted = false;
        this.stepCount = 0;
        this.executionLog = [];
        return true;
    }

    setInputData(data) {
        this.inputTape = data;
        this.inputPointer = 0;
    }

    executeStep() {
        if (this.halted || this.pc >= this.program.length) {
            return false;
        }

        const instruction = this.program[this.pc];
        this.stepCount++;

        try {
            this.executeInstruction(instruction);
            if (!this.halted) {
                this.pc++;
            }
            return true;
        } catch (error) {
            throw new Error(`Ошибка выполнения: ${error.message}`);
        }
    }

    executeInstruction(instruction) {
        const { command, operand } = instruction;

        switch (command) {
            case 'HALT':
                this.halted = true;
                this.addToLog('HALT - программа завершена');
                break;

            case 'READ':
                if (this.inputPointer >= this.inputTape.length) {
                    throw new Error('Попытка чтения за пределами входной ленты');
                }
                this.registers[0] = this.inputTape[this.inputPointer++];
                this.addToLog(`read → r0 = ${this.registers[0]}`);
                break;

            case 'WRITE':
                const value = this.registers[0] || 0;
                this.outputTape.push(value);
                this.addToLog(`WRITE → output = ${value}`);
                break;

            case 'LOAD':
                const loadValue = this.resolveOperand(operand);
                this.registers[0] = loadValue;
                this.addToLog(`LOAD ${this.formatOperand(operand)} → r0 = ${loadValue}`);
                break;

            case 'STORE':
                const addr = this.getAddress(operand);
                const storeValue = this.registers[0] || 0;
                this.registers[addr] = storeValue;
                this.addToLog(`STORE ${this.formatOperand(operand)} → r${addr} = ${storeValue}`);
                break;

            case 'ADD':
                const addValue = this.resolveOperand(operand);
                const oldValue = this.registers[0] || 0;
                this.registers[0] = oldValue + addValue;
                this.addToLog(`ADD ${this.formatOperand(operand)} → r0 = ${oldValue} + ${addValue} = ${this.registers[0]}`);
                break;

            case 'SUB':
                const subValue = this.resolveOperand(operand);
                const oldSubValue = this.registers[0] || 0;
                const result = Math.max(0, oldSubValue - subValue);
                this.registers[0] = result;
                this.addToLog(`SUB ${this.formatOperand(operand)} → r0 = max(0, ${oldSubValue} - ${subValue}) = ${result}`);
                break;

            case 'MULT':
                const multValue = this.resolveOperand(operand);
                const oldMultValue = this.registers[0] || 0;
                this.registers[0] = oldMultValue * multValue;
                this.addToLog(`MULT ${this.formatOperand(operand)} → r0 = ${oldMultValue} * ${multValue} = ${this.registers[0]}`);
                break;

            case 'DIV':
                const divisor = this.resolveOperand(operand);
                if (divisor === 0) {
                    throw new Error('Деление на ноль');
                }
                const dividend = this.registers[0] || 0;
                this.registers[0] = Math.floor(dividend / divisor);
                this.addToLog(`DIV ${this.formatOperand(operand)} → r0 = ${dividend} / ${divisor} = ${this.registers[0]}`);
                break;

            case 'NEG':
                const negValue = -(this.registers[0] || 0);
                this.registers[0] = negValue;
                this.addToLog(`NEG → r0 = ${negValue}`);
                break;

            case 'JUMP':
                const jumpTarget = this.labels[operand.value];
                this.pc = jumpTarget - 1;
                this.addToLog(`JUMP ${operand.value} → PC = ${jumpTarget}`);
                break;

            case 'JZ':
                if ((this.registers[0] || 0) === 0) {
                    const jzTarget = this.labels[operand.value];
                    this.pc = jzTarget - 1;
                    this.addToLog(`JZ ${operand.value} → r0 = 0, переход к ${jzTarget}`);
                } else {
                    this.addToLog(`JZ ${operand.value} → r0 ≠ 0, переход не выполнен`);
                }
                break;

            case 'JG':
                if ((this.registers[0] || 0) > 0) {
                    const jgTarget = this.labels[operand.value];
                    this.pc = jgTarget - 1;
                    this.addToLog(`JG ${operand.value} → r0 > 0, переход к ${jgTarget}`);
                } else {
                    this.addToLog(`JG ${operand.value} → r0 ≤ 0, переход не выполнен`);
                }
                break;

            case 'JL':
                if ((this.registers[0] || 0) < 0) {
                    const jlTarget = this.labels[operand.value];
                    this.pc = jlTarget - 1;
                    this.addToLog(`JL ${operand.value} → r0 < 0, переход к ${jlTarget}`);
                } else {
                    this.addToLog(`JL ${operand.value} → r0 ≥ 0, переход не выполнен`);
                }
                break;

            default:
                throw new Error(`Неизвестная команда: ${command}`);
        }
    }

    addToLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.executionLog.push(`[${timestamp}] ${message}`);
        if (this.executionLog.length > 20) {
            this.executionLog.shift();
        }
    }

    resolveOperand(operand) {
        if (!operand) return 0;

        switch (operand.type) {
            case 'immediate': return operand.value;
            case 'direct': return this.registers[operand.value] || 0;
            case 'indirect':
                const addr = this.registers[operand.value] || 0;
                return this.registers[addr] || 0;
            case 'label': return this.labels[operand.value] || 0;
            default: return 0;
        }
    }

    getAddress(operand) {
        switch (operand.type) {
            case 'direct': return operand.value;
            case 'indirect': return this.registers[operand.value] || 0;
            default: throw new Error('Некорректный тип адресации для STORE');
        }
    }

    formatOperand(operand) {
        if (!operand) return '';
        switch (operand.type) {
            case 'immediate': return operand.value.toString();
            case 'direct': return `[${operand.value}]`;
            case 'indirect': return `[[${operand.value}]]`;
            case 'label': return operand.value;
            default: return '';
        }
    }
}

// ========== ПАРСЕР ПРОГРАММ ==========
class RAMParser {
    parseProgram(sourceCode) {
        const lines = sourceCode.split('\n');
        const program = [];
        const labels = {};

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            const commentIndex = line.indexOf(';');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }

            if (line === '') continue;

            if (line.endsWith(':')) {
                const labelName = line.slice(0, -1).trim();
                if (labels[labelName] !== undefined) {
                    throw new Error(`Дублирование метки: ${labelName} на строке ${i + 1}`);
                }
                labels[labelName] = program.length;
                continue;
            }

            const parts = line.split(/\s+/);
            const command = parts[0].toUpperCase();
            const operandStr = parts[1];

            let operand = null;
            if (operandStr) {
                operand = this.parseOperand(operandStr, i + 1);
            }

            program.push({
                command,
                operand,
                lineNumber: i + 1,
                originalLine: lines[i]
            });
        }

        // Проверяем все метки
        for (const instruction of program) {
            if (instruction.operand && instruction.operand.type === 'label') {
                if (!(instruction.operand.value in labels)) {
                    throw new Error(`Неопределённая метка: ${instruction.operand.value} на строке ${instruction.lineNumber}`);
                }
            }
        }

        return { program, labels };
    }

    parseOperand(operandStr, lineNumber) {
        if (operandStr.startsWith('[[') && operandStr.endsWith(']]')) {
            const valueStr = operandStr.slice(2, -2);
            const value = parseInt(valueStr);
            if (isNaN(value) || value < 0) {
                throw new Error(`Некорректная косвенная адресация: ${operandStr} на строке ${lineNumber}`);
            }
            return { type: 'indirect', value };
        } else if (operandStr.startsWith('[') && operandStr.endsWith(']')) {
            const valueStr = operandStr.slice(1, -1);
            const value = parseInt(valueStr);
            if (isNaN(value) || value < 0) {
                throw new Error(`Некорректная прямая адресация: ${operandStr} на строке ${lineNumber}`);
            }
            return { type: 'direct', value };
        } else if (!isNaN(operandStr)) {
            const value = parseInt(operandStr);
            return { type: 'immediate', value };
        } else {
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(operandStr)) {
                throw new Error(`Некорректное имя метки: ${operandStr} на строке ${lineNumber}`);
            }
            return { type: 'label', value: operandStr };
        }
    }
}

// ========== ПРИМЕРЫ ПРОГРАММ (7 ПРОГРАММ) ==========
class RAMExamples {
    static getExamples() {
        return [
            {
                name: "Сложение двух чисел (Базовый)",
                description: "Считывает два числа и выводит их сумму",
                code: `; Программа сложения двух чисел
READ        ; Читаем первое число в r0
STORE [1]   ; Сохраняем в r1
READ        ; Читаем второе число в r0
ADD [1]     ; Прибавляем первое число
WRITE       ; Выводим результат
HALT        ; Завершаем программу`,
                input: "5 3"
            },
            {
                name: "Умножение на константу (Базовый)",
                description: "Считывает число и умножает его на 5",
                code: `; Умножение числа на 5
READ        ; Читаем число
MULT 5      ; Умножаем на 5
WRITE       ; Выводим результат
HALT`,
                input: "7"
            },
            {
                name: "Копирование в регистр (Базовый)",
                description: "Демонстрация работы с регистрами памяти",
                code: `; Копирование значения между регистрами
READ        ; Читаем число в r0
STORE [1]   ; Копируем в r1
LOAD [1]    ; Загружаем обратно в r0
WRITE       ; Выводим результат
HALT`,
                input: "42"
            },
            {
                name: "Факториал числа (Средний)",
                description: "Вычисляет факториал введённого числа",
                code: `; Вычисление факториала
READ        ; Читаем число n
STORE [1]   ; Сохраняем n в r1
LOAD 1      ; r0 = 1 (результат)
STORE [2]   ; Сохраняем результат в r2

LOOP:
LOAD [1]    ; Загружаем счётчик
JZ END      ; Если 0, то конец
LOAD [2]    ; Загружаем текущий результат
MULT [1]    ; Умножаем на счётчик
STORE [2]   ; Сохраняем результат
LOAD [1]    ; Загружаем счётчик
SUB 1       ; Уменьшаем на 1
STORE [1]   ; Сохраняем счётчик
JUMP LOOP   ; Повторяем цикл

END:
LOAD [2]    ; Загружаем результат
WRITE       ; Выводим факториал
HALT`,
                input: "5"
            },
            {
                name: "Сумма N чисел (Средний)",
                description: "Считывает N, затем N чисел и выводит их сумму",
                code: `; Сумма N чисел
READ        ; Читаем количество чисел N
STORE [1]   ; Сохраняем N в r1
LOAD 0      ; r0 = 0 (сумма)
STORE [2]   ; Сохраняем сумму в r2

LOOP:
LOAD [1]    ; Загружаем счётчик
JZ END      ; Если 0, то конец
READ        ; Читаем следующее число
ADD [2]     ; Прибавляем к сумме
STORE [2]   ; Сохраняем новую сумму
LOAD [1]    ; Загружаем счётчик
SUB 1       ; Уменьшаем на 1
STORE [1]   ; Сохраняем счётчик
JUMP LOOP   ; Повторяем

END:
LOAD [2]    ; Загружаем итоговую сумму
WRITE       ; Выводим результат
HALT`,
                input: "4 10 20 30 40"
            },
            {
                name: "Поиск максимума (Продвинутый)",
                description: "Находит максимальное из N чисел",
                code: `; Поиск максимума среди N чисел
READ        ; Читаем количество чисел N
STORE [1]   ; Сохраняем N в r1
READ        ; Читаем первое число
STORE [2]   ; Сохраняем как текущий максимум
LOAD [1]    ; Загружаем N
SUB 1       ; N-1 (уже прочитали одно)
STORE [1]   ; Сохраняем обновлённый счётчик

LOOP:
LOAD [1]    ; Загружаем счётчик
JZ END      ; Если 0, то конец
READ        ; Читаем следующее число
STORE [3]   ; Сохраняем в r3
SUB [2]     ; Вычитаем текущий максимум
JG UPDATE   ; Если больше, обновляем максимум
JUMP NEXT   ; Иначе переходим к следующему

UPDATE:
LOAD [3]    ; Загружаем новое число
STORE [2]   ; Делаем его новым максимумом

NEXT:
LOAD [1]    ; Загружаем счётчик
SUB 1       ; Уменьшаем на 1
STORE [1]   ; Сохраняем
JUMP LOOP   ; Повторяем

END:
LOAD [2]    ; Загружаем максимум
WRITE       ; Выводим результат
HALT`,
                input: "5 3 17 8 25 12"
            },
            {
                name: "Возведение в степень (Продвинутый)",
                description: "Вычисляет a^b для заданных a и b",
                code: `; Возведение в степень a^b
READ        ; Читаем основание a
STORE [1]   ; Сохраняем в r1
READ        ; Читаем показатель b
STORE [2]   ; Сохраняем в r2
LOAD 1      ; r0 = 1 (результат)
STORE [3]   ; Сохраняем результат в r3

LOOP:
LOAD [2]    ; Загружаем показатель
JZ END      ; Если 0, то конец
LOAD [3]    ; Загружаем текущий результат
MULT [1]    ; Умножаем на основание
STORE [3]   ; Сохраняем результат
LOAD [2]    ; Загружаем показатель
SUB 1       ; Уменьшаем на 1
STORE [2]   ; Сохраняем показатель
JUMP LOOP   ; Повторяем цикл

END:
LOAD [3]    ; Загружаем результат
WRITE       ; Выводим результат
HALT`,
                input: "2 8"
            }
        ];
    }
}

// ========== ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС С CSV ЭКСПОРТОМ ==========
class RAMUI {
    constructor() {
        this.ramCore = new RAMCore();
        this.ramParser = new RAMParser();
        this.executionInterval = null;
        this.executionSpeed = 500;

        this.initializeElements();
        this.bindEvents();
        this.loadExamples();
        this.updateDisplay();
        this.initializeTheme();
    }

    initializeElements() {
        this.exampleSelect = document.getElementById('example-select');
        this.programEditor = document.getElementById('program-editor');
        this.inputData = document.getElementById('input-data');
        this.loadBtn = document.getElementById('load-btn');
        this.startBtn = document.getElementById('start-btn');
        this.stepBtn = document.getElementById('step-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.exportCsvBtn = document.getElementById('export-csv-btn');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedDisplay = document.getElementById('speed-display');

        this.programDisplay = document.getElementById('program-display');
        this.currentCommand = document.getElementById('current-command');
        this.executionStatus = document.getElementById('execution-status');
        this.executionLog = document.getElementById('execution-log');
        this.registersDisplay = document.getElementById('registers-display');
        this.programCounter = document.getElementById('program-counter');
        this.inputTape = document.getElementById('input-tape');
        this.outputTape = document.getElementById('output-tape');
        this.stepCount = document.getElementById('step-count');
        this.executionTime = document.getElementById('execution-time');

        // Элементы переключения темы
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeLabel = document.querySelector('.theme-label');
    }

    bindEvents() {
        this.loadBtn.addEventListener('click', () => this.loadProgram());
        this.startBtn.addEventListener('click', () => this.startExecution());
        this.stepBtn.addEventListener('click', () => this.stepExecution());
        this.stopBtn.addEventListener('click', () => this.stopExecution());
        this.resetBtn.addEventListener('click', () => this.resetSimulation());
        this.clearBtn.addEventListener('click', () => this.clearProgram());
        this.exportCsvBtn.addEventListener('click', () => this.exportToCsv());

        this.exampleSelect.addEventListener('change', (e) => this.loadExample(e.target.value));
        this.speedSlider.addEventListener('input', (e) => this.updateSpeed(e.target.value));

        // ИСПРАВЛЕНО: Правильная обработка переключения темы
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', (e) => {
                this.toggleTheme(e.target.checked);
            });
        }
    }

    // НОВОЕ: Инициализация темы при запуске
    initializeTheme() {
        // Устанавливаем светлую тему по умолчанию
        document.body.setAttribute('data-theme', 'light');
        this.themeToggle.checked = false;
        if (this.themeLabel) {
            this.themeLabel.textContent = 'Светлая тема';
        }
    }

    // ИСПРАВЛЕНО: Правильная логика переключения темы
    toggleTheme(isDarkMode) {
        if (isDarkMode) {
            // Переключаемся на тёмную тему
            document.body.setAttribute('data-theme', 'dark');
            if (this.themeLabel) {
                this.themeLabel.textContent = 'Тёмная тема';
            }
            this.showToast('Переключено на тёмную тему', 'success');
        } else {
            // Переключаемся на светлую тему
            document.body.setAttribute('data-theme', 'light');
            if (this.themeLabel) {
                this.themeLabel.textContent = 'Светлая тема';
            }
            this.showToast('Переключено на светлую тему', 'success');
        }
    }

    loadExamples() {
        const examples = RAMExamples.getExamples();
        this.exampleSelect.innerHTML = '<option value="">-- Выберите пример --</option>';

        examples.forEach((example, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = example.name;
            this.exampleSelect.appendChild(option);
        });
    }

    loadExample(index) {
        if (index === '') return;

        const examples = RAMExamples.getExamples();
        const example = examples[index];

        this.programEditor.value = example.code;
        this.inputData.value = example.input;
        this.showToast(`Загружен пример: ${example.name}`, 'success');
    }

    loadProgram() {
        try {
            const sourceCode = this.programEditor.value;
            if (!sourceCode.trim()) {
                throw new Error('Программа не может быть пустой');
            }

            const { program, labels } = this.ramParser.parseProgram(sourceCode);
            this.ramCore.reset();
            this.ramCore.loadProgram(program, labels);

            const inputStr = this.inputData.value.trim();
            if (inputStr) {
                const inputArray = inputStr.split(/\s+/).map(x => parseInt(x)).filter(x => !isNaN(x));
                this.ramCore.setInputData(inputArray);
            }

            this.enableControls(true);
            this.updateDisplay();
            this.showToast('Программа успешно загружена!', 'success');

        } catch (error) {
            this.showToast(`Ошибка загрузки: ${error.message}`, 'error');
        }
    }

    startExecution() {
        if (this.executionInterval) return;

        this.ramCore.running = true;
        this.ramCore.startTime = Date.now();
        this.updateExecutionStatus('running');

        this.executionInterval = setInterval(() => {
            try {
                if (!this.ramCore.executeStep() || this.ramCore.halted) {
                    this.stopExecution();
                    if (this.ramCore.halted) {
                        this.showToast('Программа завершена успешно!', 'success');
                    }
                }
                this.updateDisplay();
            } catch (error) {
                this.stopExecution();
                this.showToast(`Ошибка выполнения: ${error.message}`, 'error');
            }
        }, this.executionSpeed);

        this.enableControls(false);
        this.stopBtn.disabled = false;
    }

    stepExecution() {
        try {
            if (!this.ramCore.executeStep() || this.ramCore.halted) {
                if (this.ramCore.halted) {
                    this.showToast('Программа завершена!', 'success');
                }
            }
            this.updateDisplay();
        } catch (error) {
            this.showToast(`Ошибка выполнения: ${error.message}`, 'error');
        }
    }

    stopExecution() {
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
            this.executionInterval = null;
        }

        this.ramCore.running = false;
        this.updateExecutionStatus('stopped');
        this.enableControls(true);
    }

    resetSimulation() {
        this.stopExecution();
        this.ramCore.reset();
        this.updateDisplay();
        this.enableControls(false);
        this.loadBtn.disabled = false;
        this.exportCsvBtn.disabled = true;
    }

    clearProgram() {
        this.programEditor.value = '';
        this.inputData.value = '';
        this.exampleSelect.value = '';
        this.resetSimulation();
    }

    updateSpeed(value) {
        this.executionSpeed = parseInt(value);
        this.speedDisplay.textContent = `${value} мс`;
    }

    // ========== НОВОЕ: ЭКСПОРТ В CSV ==========
    exportToCsv() {
        if (this.ramCore.program.length === 0) {
            this.showToast('Нет данных для экспорта', 'error');
            return;
        }

        try {
            // Подготавливаем данные для CSV
            const csvData = [
                ['Параметр', 'Значение'],
                ['Программа', this.programEditor.value.split('\n').join(' | ')],
                ['Входные данные', this.inputData.value],
                ['Выходные данные', this.ramCore.outputTape.join(', ')],
                ['Количество шагов', this.ramCore.stepCount],
                ['Время выполнения (с)', this.getExecutionTime()],
                ['Финальное состояние r0', this.ramCore.registers[0] || 0],
                ['Использованные регистры', this.getUsedRegisters()],
                ['Статус', this.ramCore.halted ? 'Завершена' : 'Выполняется'],
                ['Счётчик команд (PC)', this.ramCore.pc]
            ];

            // Создаём CSV строку
            const csv = csvData.map(row => 
                row.map(field => `"${field}"`).join(',')
            ).join('\n');

            // Создаём и скачиваем файл
            const blob = new Blob(['﻿' + csv], { 
                type: 'text/csv;charset=utf-8;' 
            });
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
            link.download = `RAM_Machine_Results_${timestamp}.csv`;
            link.href = URL.createObjectURL(blob);
            link.click();

            this.showToast('Результаты экспортированы в CSV!', 'success');

        } catch (error) {
            this.showToast(`Ошибка экспорта: ${error.message}`, 'error');
        }
    }

    // Вспомогательные методы для экспорта
    getExecutionTime() {
        if (this.ramCore.startTime) {
            const elapsed = (Date.now() - this.ramCore.startTime) / 1000;
            return elapsed.toFixed(1);
        }
        return '0.0';
    }

    getUsedRegisters() {
        const used = Object.keys(this.ramCore.registers)
            .map(k => `r${k}: ${this.ramCore.registers[k]}`)
            .join(', ');
        return used || 'Нет';
    }

    updateDisplay() {
        this.updateProgramDisplay();
        this.updateRegistersDisplay();
        this.updateTapesDisplay();
        this.updateStatusDisplay();
        this.updateExecutionLog();
    }

    updateProgramDisplay() {
        if (this.ramCore.program.length === 0) {
            this.programDisplay.innerHTML = '<div class="no-program">Программа не загружена</div>';
            this.currentCommand.textContent = '-';
            return;
        }

        let html = '';
        this.ramCore.program.forEach((instruction, index) => {
            const isCurrent = index === this.ramCore.pc;
            const className = isCurrent ? 'program-line current' : 'program-line';
            html += `<div class="${className}">${index + 1}. ${instruction.originalLine || instruction.command}</div>`;
        });

        this.programDisplay.innerHTML = html;

        if (this.ramCore.pc < this.ramCore.program.length) {
            const current = this.ramCore.program[this.ramCore.pc];
            const operandText = current.operand ? this.ramCore.formatOperand(current.operand) : '';
            this.currentCommand.textContent = `${current.command} ${operandText}`.trim();
        } else {
            this.currentCommand.textContent = 'Конец программы';
        }
    }

    updateRegistersDisplay() {
        let html = `<div class="register accumulator">
            <span class="reg-name">r0 (аккумулятор)</span>
            <span class="reg-value">${this.ramCore.registers[0] || 0}</span>
        </div>`;

        const usedRegisters = Object.keys(this.ramCore.registers)
            .map(k => parseInt(k))
            .filter(k => k > 0)
            .sort((a, b) => a - b);

        usedRegisters.forEach(i => {
            html += `<div class="register">
                <span class="reg-name">r${i}</span>
                <span class="reg-value">${this.ramCore.registers[i]}</span>
            </div>`;
        });

        // Показываем пустые регистры r1-r5 для наглядности
        for (let i = 1; i <= 5; i++) {
            if (!usedRegisters.includes(i)) {
                html += `<div class="register empty">
                    <span class="reg-name">r${i}</span>
                    <span class="reg-value">-</span>
                </div>`;
            }
        }

        this.registersDisplay.innerHTML = html;
        this.programCounter.textContent = `PC: ${this.ramCore.pc}`;
    }

    updateTapesDisplay() {
        // Входная лента
        if (this.ramCore.inputTape.length === 0) {
            this.inputTape.innerHTML = '<div class="tape-empty">Нет данных</div>';
        } else {
            let html = '';
            this.ramCore.inputTape.forEach((value, index) => {
                if (index < this.ramCore.inputPointer) {
                    html += `<span class="tape-item read">${value}</span>`;
                } else if (index === this.ramCore.inputPointer) {
                    html += `<span class="tape-item current">→${value}</span>`;
                } else {
                    html += `<span class="tape-item">${value}</span>`;
                }
            });
            this.inputTape.innerHTML = html;
        }

        // Выходная лента
        if (this.ramCore.outputTape.length === 0) {
            this.outputTape.innerHTML = '<div class="tape-empty">Нет вывода</div>';
        } else {
            let html = '';
            this.ramCore.outputTape.forEach((value) => {
                html += `<span class="tape-item">${value}</span>`;
            });
            this.outputTape.innerHTML = html;
        }
    }

    updateExecutionLog() {
        if (this.ramCore.executionLog.length === 0) {
            this.executionLog.innerHTML = '<div class="log-empty">Лог пуст</div>';
        } else {
            let html = '';
            this.ramCore.executionLog.slice(-10).forEach(entry => {
                html += `<div class="log-entry">${entry}</div>`;
            });
            this.executionLog.innerHTML = html;
            this.executionLog.scrollTop = this.executionLog.scrollHeight;
        }
    }

    updateStatusDisplay() {
        this.stepCount.textContent = this.ramCore.stepCount;

        if (this.ramCore.startTime) {
            const elapsed = (Date.now() - this.ramCore.startTime) / 1000;
            this.executionTime.textContent = `${elapsed.toFixed(1)}с`;
        } else {
            this.executionTime.textContent = '0.0с';
        }
    }

    updateExecutionStatus(status) {
        const statusElement = this.executionStatus;
        statusElement.className = `execution-status status-${status}`;

        switch (status) {
            case 'running': statusElement.textContent = 'Выполняется'; break;
            case 'stopped': statusElement.textContent = 'Остановлена'; break;
            case 'finished': statusElement.textContent = 'Завершена'; break;
            case 'error': statusElement.textContent = 'Ошибка'; break;
            default: statusElement.textContent = 'Готова';
        }
    }

    enableControls(enabled) {
        this.startBtn.disabled = !enabled || this.ramCore.program.length === 0 || this.ramCore.halted;
        this.stepBtn.disabled = !enabled || this.ramCore.program.length === 0 || this.ramCore.halted;
        this.resetBtn.disabled = false;
        this.stopBtn.disabled = enabled;
        this.exportCsvBtn.disabled = this.ramCore.program.length === 0;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.ramSimulator = new RAMUI();
    console.log('RAM Simulator v4.0 with CSV Export initialized!');
});