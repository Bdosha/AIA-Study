/**
 * UIController.js
 * Модуль управления пользовательским интерфейсом
 * 
 * Координирует взаимодействие между всеми компонентами системы,
 * обрабатывает пользовательский ввод и обновляет отображение.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

import { MarkovEngine } from './MarkovEngine.js';
import { Visualizer } from './Visualizer.js';
import { AnimationEngine } from './AnimationEngine.js';
import { ExamplesLibrary } from './ExamplesLibrary.js';
import { DataManager } from './DataManager.js';

/**
 * Главный класс контроллера пользовательского интерфейса
 */
export class UIController {
    /**
     * Создает новый экземпляр контроллера
     */
    constructor() {
        // Инициализация модулей
        this.engine = new MarkovEngine();
        this.visualizer = new Visualizer('visualCanvas');
        this.animator = new AnimationEngine();
        this.examplesLibrary = new ExamplesLibrary();
        this.dataManager = new DataManager();

        // Состояние симуляции
        this.isAutoRunning = false;
        this.autoRunInterval = null;
        this.speed = 500; // миллисекунды между шагами
        this.originalInputString = '';

        // Получение ссылок на DOM элементы
        this.initializeElements();

        // Привязка обработчиков событий
        this.bindEvents();

        // Инициализация библиотеки примеров
        this.loadExamples();

        // Добавление первого правила по умолчанию
        this.addRuleUI();
    }

    /**
     * Инициализирует ссылки на DOM элементы
     */
    initializeElements() {
        // Редактор
        this.alphabetInput = document.getElementById('alphabet');
        this.inputStringField = document.getElementById('inputString');
        this.rulesContainer = document.getElementById('rulesContainer');
        this.addRuleBtn = document.getElementById('addRuleBtn');
        this.exampleSelect = document.getElementById('exampleSelect');

        // Управление
        this.startBtn = document.getElementById('startBtn');
        this.stepBtn = document.getElementById('stepBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Скорость
        this.speedRange = document.getElementById('speedRange');
        this.speedValue = document.getElementById('speedValue');

        // Статус
        this.statusText = document.getElementById('statusText');
        this.stepCounter = document.getElementById('stepCounter');
        this.timeCounter = document.getElementById('timeCounter');

        // Текущее состояние
        this.currentString = document.getElementById('currentString');
        this.currentRule = document.getElementById('currentRule');

        // История и лог
        this.historyContainer = document.getElementById('historyContainer');
        this.logContainer = document.getElementById('logContainer');

        // Импорт/Экспорт
        this.exportBtn = document.getElementById('exportBtn');
        this.importBtn = document.getElementById('importBtn');
        this.importFile = document.getElementById('importFile');

        // Тема
        this.themeToggle = document.getElementById('themeToggle');
    }

    /**
     * Привязывает обработчики событий к элементам интерфейса
     */
    bindEvents() {
        // Кнопки управления
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.stepBtn.addEventListener('click', () => this.handleStep());
        this.stopBtn.addEventListener('click', () => this.handleStop());
        this.resetBtn.addEventListener('click', () => this.handleReset());

        // Добавление правила
        this.addRuleBtn.addEventListener('click', () => this.addRuleUI());

        // Скорость симуляции
        this.speedRange.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            this.speedValue.textContent = this.speed;
        });

        // Примеры
        this.exampleSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadExample(e.target.value);
            }
        });

        // Импорт/Экспорт
        this.exportBtn.addEventListener('click', () => this.handleExport());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImport(e));

        // Переключение темы
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    /**
     * Добавляет новое правило в интерфейс редактора
     */
    addRuleUI() {
        const ruleItem = document.createElement('div');
        ruleItem.className = 'rule-item';

        ruleItem.innerHTML = `
            <input type="text" class="rule-pattern" placeholder="Образец">
            <span class="rule-arrow">→</span>
            <input type="text" class="rule-replacement" placeholder="Замена">
            <label class="checkbox-label">
                <input type="checkbox" class="rule-final">
                <span>Закл.</span>
            </label>
            <button class="btn-delete">×</button>
        `;

        // Обработчик удаления правила
        const deleteBtn = ruleItem.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            ruleItem.remove();
        });

        // Обработчик изменения типа правила (обычное/заключительное)
        const finalCheckbox = ruleItem.querySelector('.rule-final');
        const arrow = ruleItem.querySelector('.rule-arrow');
        finalCheckbox.addEventListener('change', (e) => {
            arrow.textContent = e.target.checked ? '→.' : '→';
        });

        this.rulesContainer.appendChild(ruleItem);
    }

    /**
     * Считывает правила из интерфейса и загружает их в движок
     */
    loadRulesFromUI() {
        this.engine.clearRules();

        const ruleItems = this.rulesContainer.querySelectorAll('.rule-item');
        ruleItems.forEach(item => {
            const pattern = item.querySelector('.rule-pattern').value.trim();
            const replacement = item.querySelector('.rule-replacement').value.trim();
            const isFinal = item.querySelector('.rule-final').checked;

            if (pattern) {
                try {
                    this.engine.addRule(pattern, replacement, isFinal);
                } catch (error) {
                    this.addLog(error.message, 'error');
                }
            }
        });
    }

    /**
     * Обработчик запуска автоматической симуляции
     */
    handleStart() {
        try {
            // Загружаем данные из интерфейса
            this.engine.setAlphabet(this.alphabetInput.value);
            this.loadRulesFromUI();
            this.originalInputString = this.inputStringField.value;
            this.engine.setInputString(this.originalInputString);

            // Запускаем движок
            const result = this.engine.start();

            if (!result.success) {
                this.addLog('Ошибки валидации:', 'error');
                result.errors.forEach(err => this.addLog('- ' + err, 'error'));
                return;
            }

            this.addLog('Симуляция запущена', 'success');
            this.updateStatus('Выполняется');

            // Включаем автоматическое выполнение
            this.isAutoRunning = true;
            this.updateButtons();

            this.autoRunInterval = setInterval(() => {
                const stepResult = this.engine.executeStep();

                if (stepResult.success && stepResult.step) {
                    this.updateAfterStep(stepResult.step);
                }

                if (stepResult.finished || !this.isAutoRunning) {
                    this.handleStop();

                    if (stepResult.finished) {
                        this.addLog(stepResult.message, stepResult.success ? 'success' : 'warning');
                        this.updateStatus('Завершено');
                    }
                }
            }, this.speed);

        } catch (error) {
            this.addLog('Ошибка: ' + error.message, 'error');
        }
    }

    /**
     * Обработчик выполнения одного шага
     */
    handleStep() {
        try {
            // Если симуляция еще не запущена, инициализируем
            if (!this.engine.isRunning) {
                this.engine.setAlphabet(this.alphabetInput.value);
                this.loadRulesFromUI();
                this.originalInputString = this.inputStringField.value;
                this.engine.setInputString(this.originalInputString);

                const result = this.engine.start();

                if (!result.success) {
                    this.addLog('Ошибки валидации:', 'error');
                    result.errors.forEach(err => this.addLog('- ' + err, 'error'));
                    return;
                }

                this.addLog('Пошаговое выполнение начато', 'success');
                this.updateStatus('Пошаговый режим');
            }

            // Выполняем один шаг
            const stepResult = this.engine.executeStep();

            if (stepResult.success && stepResult.step) {
                this.updateAfterStep(stepResult.step);
                this.addLog(`Шаг ${stepResult.step.stepNumber}: применено правило "${stepResult.step.rule.toString()}"`, 'success');
            }

            if (stepResult.finished) {
                this.addLog(stepResult.message, stepResult.success ? 'success' : 'warning');
                this.updateStatus('Завершено');
                this.updateButtons();
            }

        } catch (error) {
            this.addLog('Ошибка: ' + error.message, 'error');
        }
    }

    /**
     * Обработчик остановки симуляции
     */
    handleStop() {
        this.isAutoRunning = false;

        if (this.autoRunInterval) {
            clearInterval(this.autoRunInterval);
            this.autoRunInterval = null;
        }

        this.engine.stop();
        this.updateStatus('Остановлено');
        this.updateButtons();
        this.addLog('Симуляция остановлена', 'warning');
    }

    /**
     * Обработчик сброса симуляции
     */
    handleReset() {
        this.handleStop();

        this.engine.reset(this.originalInputString);

        // Очищаем интерфейс
        this.historyContainer.innerHTML = '<div class="empty-state">История пуста. Запустите алгоритм.</div>';
        this.logContainer.innerHTML = '<div class="log-entry">Ожидание запуска...</div>';

        this.currentString.textContent = '—';
        this.currentRule.textContent = '—';

        this.stepCounter.textContent = '0';
        this.timeCounter.textContent = '0 мс';

        this.updateStatus('Готов к выполнению');
        this.updateButtons();

        this.visualizer.clear();

        this.addLog('Состояние сброшено', 'success');
    }

    /**
     * Обновляет интерфейс после выполнения шага
     * @param {ExecutionStep} step - Информация о выполненном шаге
     */
    updateAfterStep(step) {
        // Обновляем текущее состояние
        this.currentString.textContent = step.afterString;
        this.currentRule.textContent = step.rule.toString();

        // Обновляем счетчики
        const state = this.engine.getState();
        this.stepCounter.textContent = state.currentStep;
        this.timeCounter.textContent = state.elapsedTime + ' мс';

        // Добавляем в историю
        this.addHistoryItem(step);

        // Визуализация
        this.visualizer.drawStep(step);
    }

    /**
     * Добавляет запись в историю выполнения
     * @param {ExecutionStep} step - Шаг выполнения
     */
    addHistoryItem(step) {
        if (this.historyContainer.querySelector('.empty-state')) {
            this.historyContainer.innerHTML = '';
        }

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="step-number">Шаг ${step.stepNumber}:</span>
            "${step.beforeString}" → "${step.afterString}"
            <br><small>Правило: ${step.rule.toString()}, позиция: ${step.position}</small>
        `;

        this.historyContainer.appendChild(historyItem);
        this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
    }

    /**
     * Добавляет запись в лог выполнения
     * @param {string} message - Сообщение для лога
     * @param {string} type - Тип сообщения: 'success', 'error', 'warning', или пустая строка
     */
    addLog(message, type = '') {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry' + (type ? ' ' + type : '');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    /**
     * Обновляет текст статуса
     * @param {string} status - Новый статус
     */
    updateStatus(status) {
        this.statusText.textContent = status;
    }

    /**
     * Обновляет состояние кнопок управления
     */
    updateButtons() {
        const isRunning = this.isAutoRunning;
        const engineRunning = this.engine.isRunning;

        this.startBtn.disabled = isRunning || engineRunning;
        this.stepBtn.disabled = isRunning;
        this.stopBtn.disabled = !isRunning;
        this.resetBtn.disabled = isRunning;
    }

    /**
     * Загружает список примеров в выпадающий список
     */
    loadExamples() {
        const examples = this.examplesLibrary.getAllExamples();

        examples.forEach(example => {
            const option = document.createElement('option');
            option.value = example.id;
            option.textContent = example.name;
            this.exampleSelect.appendChild(option);
        });
    }

    /**
     * Загружает пример по ID
     * @param {string} exampleId - ID примера
     */
    loadExample(exampleId) {
        const example = this.examplesLibrary.getExample(exampleId);

        if (!example) {
            this.addLog('Пример не найден', 'error');
            return;
        }

        // Загружаем алфавит
        this.alphabetInput.value = example.alphabet;

        // Очищаем текущие правила
        this.rulesContainer.innerHTML = '';

        // Добавляем правила из примера
        example.rules.forEach(rule => {
            this.addRuleUI();
            const lastRule = this.rulesContainer.lastElementChild;
            lastRule.querySelector('.rule-pattern').value = rule.pattern;
            lastRule.querySelector('.rule-replacement').value = rule.replacement;
            lastRule.querySelector('.rule-final').checked = rule.isFinal;
            lastRule.querySelector('.rule-arrow').textContent = rule.isFinal ? '→.' : '→';
        });

        // Загружаем входную строку
        this.inputStringField.value = example.inputString;

        this.addLog(`Загружен пример: ${example.name}`, 'success');
    }

    /**
     * Обработчик экспорта конфигурации
     */
    handleExport() {
        try {
            this.engine.setAlphabet(this.alphabetInput.value);
            this.loadRulesFromUI();
            this.engine.setInputString(this.inputStringField.value);

            const json = this.engine.exportToJSON();
            this.dataManager.exportToFile(json, 'markov-algorithm.json');

            this.addLog('Алгоритм экспортирован', 'success');
        } catch (error) {
            this.addLog('Ошибка экспорта: ' + error.message, 'error');
        }
    }

    /**
     * Обработчик импорта конфигурации
     * @param {Event} event - Событие изменения файла
     */
    handleImport(event) {
        const file = event.target.files[0];

        if (!file) return;

        this.dataManager.importFromFile(file, (jsonString) => {
            try {
                this.engine.importFromJSON(jsonString);

                // Обновляем интерфейс
                this.alphabetInput.value = this.engine.alphabet.join(', ');

                this.rulesContainer.innerHTML = '';
                this.engine.rules.forEach(rule => {
                    this.addRuleUI();
                    const lastRule = this.rulesContainer.lastElementChild;
                    lastRule.querySelector('.rule-pattern').value = rule.pattern;
                    lastRule.querySelector('.rule-replacement').value = rule.replacement;
                    lastRule.querySelector('.rule-final').checked = rule.isFinal;
                    lastRule.querySelector('.rule-arrow').textContent = rule.isFinal ? '→.' : '→';
                });

                this.inputStringField.value = this.engine.currentString;

                this.addLog('Алгоритм импортирован', 'success');
            } catch (error) {
                this.addLog('Ошибка импорта: ' + error.message, 'error');
            }
        });

        // Сбрасываем input для возможности повторного импорта того же файла
        event.target.value = '';
    }

    /**
     * Переключает тему интерфейса (светлая/темная)
     */
    toggleTheme() {
        document.body.classList.toggle('light-theme');

        const isLight = document.body.classList.contains('light-theme');
        const icon = this.themeToggle.querySelector('.theme-icon');
        icon.textContent = isLight ? '☀️' : '🌙';

        this.addLog(`Тема изменена на ${isLight ? 'светлую' : 'темную'}`, 'success');
    }
}