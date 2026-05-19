/**
 * @fileoverview Модуль Controller (Контроллер).
 * Содержит класс Controller, который связывает Model (TagSystem) и View (UI).
 * Он обрабатывает пользовательские события и управляет циклом симуляции.
 */

import presets from './presets.js';

/**
 * Связывает Model и View, управляя логикой приложения.
 */
export default class Controller {
    /**
     * @param {import('./model.js').default} model Экземпляр модели.
     * @param {import('./view.js').default} view Экземпляр представления.
     */
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.simulationInterval = null;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isRunning = false;
    }

    /**
     * Инициализирует контроллер, устанавливая все необходимые обработчики событий.
     */
    init() {
        // Установка обработчиков событий
        this.view.dom.themeToggle.addEventListener('click', () => this.view.toggleTheme());
        this.view.dom.startStopBtn.addEventListener('click', () => this.toggleSimulation());
        this.view.dom.stepBtn.addEventListener('click', () => this.doStep());
        this.view.dom.resetBtn.addEventListener('click', () => this.resetSimulation());
        this.view.dom.presets.addEventListener('change', (e) => this.loadPreset(e.target.value));
        this.view.dom.addRuleBtn.addEventListener('click', () => this.view.addProductionRuleRow());
        this.view.dom.delaySlider.addEventListener('input', (e) => this.updateDelayLabel(e.target.value));
        this.view.dom.exportBtn.addEventListener('click', () => this.exportConfig());
        this.view.dom.importBtn.addEventListener('click', () => this.view.dom.importFile.click());
        this.view.dom.importFile.addEventListener('change', (e) => this.importConfig(e));

        // Начальная настройка
        this.loadPreset('oscillator');
        this.resetSimulation();
        this.updateDelayLabel(this.view.dom.delaySlider.value);
    }

    /**
     * Переключает симуляцию между состояниями "запущено" и "пауза".
     */
    toggleSimulation() {
        this.isRunning = !this.isRunning;
        this.view.setSimulatingState(this.isRunning);

        if (this.isRunning) {
            this.model.loadConfig(this.view.getFormConfig());
            if (this.model.stepCount === 0) { // Добавляем начальное состояние в историю
                 this.view.addHistoryEntry(0, this.model.currentString);
            }
            this.startTime = performance.now();
            const delay = this.getDelay();
            if (this.simulationInterval) clearInterval(this.simulationInterval);
            this.simulationInterval = window.setInterval(() => this.doStep(), delay);
        } else {
            if (this.simulationInterval) clearInterval(this.simulationInterval);
            this.elapsedTime += (performance.now() - this.startTime) / 1000;
        }
    }
    
    /**
     * Выполняет один шаг симуляции и обновляет интерфейс.
     */
    doStep() {
        if (this.model.isHalted || this.model.stepCount >= parseInt(this.view.dom.maxSteps.value, 10)) {
            this.stopSimulation();
            return;
        }

        this.model.step();
        
        let currentTime = this.elapsedTime;
        if(this.isRunning) {
            currentTime += (performance.now() - this.startTime) / 1000;
        }
        
        this.view.renderState(this.model, currentTime);
        this.view.addHistoryEntry(this.model.stepCount, this.model.currentString);
    }

    /**
     * Полностью останавливает симуляцию.
     */
    stopSimulation() {
        if (!this.isRunning && !this.model.isHalted) return;
        this.isRunning = false;
        if (this.simulationInterval) clearInterval(this.simulationInterval);
        this.view.setSimulatingState(false);
        this.view.setStatus('Остановлено', 'stopped');
    }

    /**
     * Сбрасывает симуляцию в начальное состояние на основе данных из формы.
     */
    resetSimulation() {
        if (this.isRunning) this.stopSimulation();
        
        this.elapsedTime = 0;
        const config = this.view.getFormConfig();
        this.model.loadConfig(config);
        this.model.reset();
        
        this.view.renderState(this.model, 0);
        this.view.clearHistory();
        this.view.setStatus('Пауза', 'paused');
    }

    /**
     * Загружает предустановленную конфигурацию (пресет).
     * @param {string} presetName Ключ пресета в объекте `presets`.
     */
    loadPreset(presetName) {
        const preset = presets[presetName];
        if (preset) {
            this.view.applyConfigToForm(preset);
            this.view.updatePresetDescription(preset.description || '');
            this.resetSimulation();
        }
    }
    
    /**
     * Рассчитывает задержку в мс на основе значения слайдера.
     * @returns {number} Задержка в миллисекундах.
     */
    getDelay() {
        // Логарифмическая шкала для лучшего контроля на высоких скоростях
        const minOps = 1; // 1 операция/сек
        const maxOps = 100; // 100 операций/сек
        const value = parseInt(this.view.dom.delaySlider.value, 10) || 1; // 1-100
        // Преобразуем значение слайдера в операции/сек
        const ops = minOps + (maxOps - minOps) * (Math.pow(value / 100, 2));
        return 1000 / ops;
    }
    
    /**
     * Обновляет текстовую метку для слайдера задержки.
     * @param {string} value Текущее значение слайдера.
     */
    updateDelayLabel(value) {
        const ops = 1000 / this.getDelay();
        this.view.dom.delayLabel.textContent = `${ops.toFixed(1)}`;
    }

    /**
     * Экспортирует текущую конфигурацию в виде JSON файла.
     */
    exportConfig() {
        const config = this.view.getFormConfig();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "cts_config.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    /**
     * Импортирует конфигурацию из выбранного JSON файла.
     * @param {Event} event Событие изменения элемента input[type=file].
     */
    importConfig(event) {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error("Не удалось прочитать файл.");
                
                const importedConfig = JSON.parse(result);

                // --- Адаптация нового формата под старую логику CTS ---
                const internalConfig = {};

                // 1. Валидация и извлечение начальной строки
                if (typeof importedConfig.initialString !== 'string') {
                    throw new Error("В файле отсутствует или некорректно поле 'initialString'.");
                }
                internalConfig.initialString = importedConfig.initialString;

                // 2. Валидация и извлечение правил (productions)
                // Поддерживаем и старый формат ('productions') и новый ('rules')
                if (Array.isArray(importedConfig.productions)) {
                    internalConfig.productions = importedConfig.productions;
                } else if (Array.isArray(importedConfig.rules)) {
                    // Проверяем, что это массив объектов с ключом 'production'
                     if (!importedConfig.rules.every(r => typeof r === 'object' && typeof r.production === 'string')) {
                        throw new Error("Поле 'rules' должно быть массивом объектов с ключом 'production'.");
                    }
                    // Извлекаем только продукции, игнорируя 'symbol' и др.
                    internalConfig.productions = importedConfig.rules.map(rule => rule.production);
                } else {
                    throw new Error("В файле отсутствует или некорректно поле 'productions' или 'rules'.");
                }

                this.view.applyConfigToForm(internalConfig);

                // 3. (Опционально) Применяем лимиты
                if (importedConfig.limits && typeof importedConfig.limits.maxSteps === 'number') {
                    this.view.dom.maxSteps.value = importedConfig.limits.maxSteps;
                }

                // 4. (Опционально) Применяем тему UI
                if (importedConfig.ui && (importedConfig.ui.theme === 'light' || importedConfig.ui.theme === 'dark')) {
                    this.view.setTheme(importedConfig.ui.theme);
                }

                this.resetSimulation();

            } catch (error) {
                alert(`Ошибка: ${error.message}`);
                console.error("Ошибка обработки JSON:", error);
            }
        };
        reader.readAsText(file);
        input.value = ''; // Сбрасываем input, чтобы можно было загрузить тот же файл снова
    }
}