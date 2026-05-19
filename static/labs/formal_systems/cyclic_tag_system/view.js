/**
 * @fileoverview Главный модуль View (Представление).
 * Координирует работу под-компонентов представления (ConfigPanelView и SimulationPanelView)
 * и предоставляет единый интерфейс для Controller.
 */

import ConfigPanelView from './configPanelView.js';
import SimulationPanelView from './simulationPanelView.js';

export default class UI {
    constructor() {
        // --- Кэширование всех DOM-элементов ---
        this.dom = {
            // Глобальные
            themeToggle: document.getElementById('theme-toggle'),
            // Панель Конфигурации
            presets: document.getElementById('presets'),
            presetDescription: document.getElementById('preset-description'),
            initialString: document.getElementById('initial-string'),
            productionRulesContainer: document.getElementById('production-rules'),
            addRuleBtn: document.getElementById('add-rule'),
            exportBtn: document.getElementById('export-json'),
            importBtn: document.getElementById('import-json'),
            importFile: document.getElementById('import-file'),
            // Панель Управления
            startStopBtn: document.getElementById('start-stop'),
            stepBtn: document.getElementById('step'),
            resetBtn: document.getElementById('reset'),
            delaySlider: document.getElementById('delay-slider'),
            delayLabel: document.getElementById('delay-label'),
            maxSteps: document.getElementById('max-steps'),
            // Панель Симуляции
            stepCounter: document.getElementById('step-counter'),
            stringLength: document.getElementById('string-length'),
            timer: document.getElementById('timer'),
            status: document.getElementById('status'),
            currentString: document.getElementById('current-string'),
            history: document.getElementById('history'),
        };

        // --- Создание экземпляров под-компонентов View ---
        this.configPanel = new ConfigPanelView({
            presets: this.dom.presets,
            presetDescription: this.dom.presetDescription,
            initialString: this.dom.initialString,
            productionRulesContainer: this.dom.productionRulesContainer,
            addRuleBtn: this.dom.addRuleBtn,
            exportBtn: this.dom.exportBtn,
            importBtn: this.dom.importBtn,
            importFile: this.dom.importFile,
        });

        this.simulationPanel = new SimulationPanelView({
            stepCounter: this.dom.stepCounter,
            stringLength: this.dom.stringLength,
            timer: this.dom.timer,
            status: this.dom.status,
            currentString: this.dom.currentString,
            history: this.dom.history,
        });
    }

    // --- Методы, делегирующие вызовы к под-компонентам ---

    renderState(model, time) {
        this.simulationPanel.renderState(model, time);
    }
    
    addHistoryEntry(step, word) {
        this.simulationPanel.addHistoryEntry(step, word);
    }

    clearHistory() {
        this.simulationPanel.clearHistory();
    }

    setStatus(text, state) {
        this.simulationPanel.setStatus(text, state);
    }

    getFormConfig() {
        return this.configPanel.getFormConfig();
    }
    
    applyConfigToForm(config) {
        this.configPanel.applyConfigToForm(config);
    }

    updatePresetDescription(text) {
        this.configPanel.updatePresetDescription(text);
    }

    addProductionRuleRow(output = '') {
        this.configPanel.addProductionRuleRow(output);
    }

    // --- Методы, управляющие общим состоянием View ---
    
    /**
     * Обновляет UI в зависимости от того, запущена симуляция или нет.
     * @param {boolean} isRunning `true`, если симуляция запущена.
     */
    setSimulatingState(isRunning) {
        // Управление основными кнопками
        this.dom.startStopBtn.textContent = isRunning ? 'Пауза' : 'Старт';
        this.dom.stepBtn.disabled = isRunning;
        this.dom.resetBtn.disabled = isRunning;

        // Блокировка/разблокировка панели конфигурации
        this.configPanel.setDisabledState(isRunning);

        // Установка статуса
        if (isRunning) {
            this.setStatus('Работает', 'running');
        } else {
            this.setStatus('Пауза', 'paused');
        }
    }
    
    /**
     * Переключает цветовую тему приложения по клику.
     */
    toggleTheme() {
        document.body.classList.toggle('light-theme');
        document.body.classList.toggle('dark-theme');
    }

    /**
     * Устанавливает конкретную цветовую тему приложения.
     * @param {'light' | 'dark'} themeName Название темы.
     */
    setTheme(themeName) {
        if (themeName === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        } else if (themeName === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        }
    }
}