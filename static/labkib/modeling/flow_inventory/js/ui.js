/**
 * Класс контроллера UI
 * Управляет взаимодействиями пользовательского интерфейса и состоянием приложения
 */
class UIController {
    /**
 * Создать новый контроллер UI
 */
    constructor() {
        this.simulation = null;
        this.scenarioManager = new ScenarioManager();
        this.chartManager = new ChartManager();
        this.animationFrame = null;
        this.isAnimating = false;
        this.isDarkMode = true;
        
        // Хранить настройки в памяти (НЕ в localStorage)
        this.savedSettings = this.getDefaultSettings();
        
        this.init();
    }

    /**
 * Получить настройки симуляции по умолчанию
 * @возвращает {Object} Default settings
 */
    getDefaultSettings() {
        return {
            initialWater: 1000,
            initialOxygen: 200,
            crewSize: 4,
            duration: 30,
            waterConsumption: 8,
            oxygenConsumption: 0.84,
            waterEfficiency: 80,
            oxygenEfficiency: 70
        };
    }

    /**
 * Инициализировать контроллер UI
 */
    init() {
        this.setupEventListeners();
        this.initializeSimulation();
        this.chartManager.initStocksChart('stocksChart');
        this.chartManager.initFlowsChart('flowsChart');
        this.updateUI();
        this.logEvent('Система инициализирована', 'success');
    }

    /**
 * Настроить все обработчики событий
 */
    setupEventListeners() {
        // Переключатель темы
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Выбор сценария
        document.getElementById('scenario').addEventListener('change', (e) => this.handleScenarioChange(e.target.value));

        // Диапазонные ползунки с отображением значения в реальном времени
        const rangeInputs = [
            { id: 'initialWater', display: 'waterValue', suffix: '' },
            { id: 'initialOxygen', display: 'oxygenValue', suffix: '' },
            { id: 'crewSize', display: 'crewValue', suffix: '' },
            { id: 'duration', display: 'durationValue', suffix: '' },
            { id: 'waterConsumption', display: 'waterConsValue', suffix: '' },
            { id: 'oxygenConsumption', display: 'oxygenConsValue', suffix: '' },
            { id: 'waterEfficiency', display: 'waterEffValue', suffix: '' },
            { id: 'oxygenEfficiency', display: 'oxygenEffValue', suffix: '' }
        ];

        rangeInputs.forEach(input => {
            const element = document.getElementById(input.id);
            element.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                document.getElementById(input.display).textContent = value.toFixed(input.id.includes('Consumption') ? 2 : 0);
                this.handleParameterChange();
            });
        });

        // Кнопки управления
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    }

    /**
 * Инициализировать симуляцию с текущими параметрами
 */
    initializeSimulation() {
        const params = this.getParametersFromUI();
        this.simulation = new SystemSimulation(params);
        this.savedSettings = params;
    }

    /**
 * Получить текущие параметры из UI
 * @возвращает {Object} Current parameter values
 */
    getParametersFromUI() {
        return {
            initialWater: parseFloat(document.getElementById('initialWater').value),
            initialOxygen: parseFloat(document.getElementById('initialOxygen').value),
            crewSize: parseInt(document.getElementById('crewSize').value),
            duration: parseInt(document.getElementById('duration').value),
            waterConsumption: parseFloat(document.getElementById('waterConsumption').value),
            oxygenConsumption: parseFloat(document.getElementById('oxygenConsumption').value),
            waterEfficiency: parseFloat(document.getElementById('waterEfficiency').value),
            oxygenEfficiency: parseFloat(document.getElementById('oxygenEfficiency').value)
        };
    }

    /**
 * Обработать изменение выбора сценария
 * @param {string} scenarioId - ID выбранного сценария
 */
    handleScenarioChange(scenarioId) {
        const scenario = this.scenarioManager.getScenario(scenarioId);
        document.getElementById('scenarioDescription').textContent = scenario.description;

        if (scenarioId !== 'custom') {
            // Применить параметры сценария
            if (scenario.waterEfficiency !== null) {
                document.getElementById('waterEfficiency').value = scenario.waterEfficiency;
                document.getElementById('waterEffValue').textContent = scenario.waterEfficiency;
            }
            if (scenario.oxygenEfficiency !== null) {
                document.getElementById('oxygenEfficiency').value = scenario.oxygenEfficiency;
                document.getElementById('oxygenEffValue').textContent = scenario.oxygenEfficiency;
            }
            this.handleParameterChange();
            this.logEvent(`Сценарий "${scenario.name}" активирован`, 'info');
        }
    }

    /**
 * Обработать изменение параметра
 */
    handleParameterChange() {
        if (this.simulation && !this.simulation.isRunning) {
            const params = this.getParametersFromUI();
            this.simulation.updateParameters(params);
            this.savedSettings = params;
        }
    }

    /**
 * Запустить симуляцию
 */
    startSimulation() {
        if (this.simulation.isRunning) return;

        // Если симуляция была завершена, сбросить её
        if (this.simulation.state.day >= this.simulation.params.duration) {
            this.resetSimulation();
        }

        this.simulation.start();
        this.isAnimating = true;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('exportBtn').disabled = true;

        this.logEvent('Симуляция запущена', 'success');
        this.animate();
    }

    /**
 * Остановить симуляцию
 */
    stopSimulation() {
        this.simulation.stop();
        this.isAnimating = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('exportBtn').disabled = false;

        this.logEvent('Симуляция остановлена', 'warning');
    }

    /**
 * Сбросить симуляцию
 */
    resetSimulation() {
        this.stopSimulation();
        this.initializeSimulation();
        this.chartManager.resetCharts(
            this.simulation.params.initialWater,
            this.simulation.params.initialOxygen
        );
        this.updateUI();
        
        document.getElementById('exportBtn').disabled = true;
        this.logEvent('Симуляция сброшена', 'info');
    }

    /**
 * Цикл анимации для симуляции в реальном времени
 */
    animate() {
        if (!this.isAnimating || !this.simulation.isRunning) return;

        const result = this.simulation.step();
        
        if (result) {
            this.updateUI();
            this.chartManager.updateCharts(this.simulation.history);
            
            // Check for critical events
            this.checkCriticalEvents(result);
            
            // Продолжить анимацию с задержкой для видимости
            setTimeout(() => {
                this.animationFrame = requestAnimationFrame(() => this.animate());
            }, 100);
        } else {
            // Симуляция завершена
            this.stopSimulation();
            this.logEvent('Симуляция завершена', 'success');
        }
    }

    /**
 * Проверить критические события и записать предупреждения
 * @param {Object} result - Текущее состояние симуляции
 */
    checkCriticalEvents(result) {
        const waterPercent = (result.water / this.simulation.params.initialWater) * 100;
        const oxygenPercent = (result.oxygen / this.simulation.params.initialOxygen) * 100;

        if (waterPercent < 10 && waterPercent > 0) {
            this.logEvent('КРИТИЧЕСКИЙ уровень воды!', 'error');
        } else if (waterPercent < 30) {
            this.logEvent('Предупреждение: низкий уровень воды', 'warning');
        }

        if (oxygenPercent < 10 && oxygenPercent > 0) {
            this.logEvent('КРИТИЧЕСКИЙ уровень кислорода!', 'error');
        } else if (oxygenPercent < 30) {
            this.logEvent('Предупреждение: низкий уровень кислорода', 'warning');
        }

        if (result.water <= 0) {
            this.logEvent('Запасы воды ИСТОЩЕНЫ!', 'error');
            this.stopSimulation();
        }

        if (result.oxygen <= 0) {
            this.logEvent('Запасы кислорода ИСТОЩЕНЫ!', 'error');
            this.stopSimulation();
        }
    }

    /**
 * Обновить элементы UI текущим состоянием
 */
    updateUI() {
        const state = this.simulation.state;
        const status = this.simulation.getStatus();
        const depletion = this.simulation.estimateDepletion();

        // Обновить отображение статуса
        document.getElementById('currentDay').textContent = state.day.toFixed(1);
        document.getElementById('currentWater').textContent = state.water.toFixed(1) + ' л';
        document.getElementById('currentOxygen').textContent = state.oxygen.toFixed(2) + ' кг';

        // Обновить значок статуса
        const statusElement = document.getElementById('systemStatus');
        statusElement.className = 'status';
        
        switch(status) {
            case 'critical':
                statusElement.classList.add('status--error');
                statusElement.textContent = 'Критично';
                break;
            case 'warning':
                statusElement.classList.add('status--warning');
                statusElement.textContent = 'Предупреждение';
                break;
            default:
                statusElement.classList.add('status--success');
                statusElement.textContent = 'Норма';
        }
    }

    /**
 * Экспортировать данные симуляции в CSV
 */
    exportData() {
        const csv = this.simulation.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `simulation_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.logEvent('Данные экспортированы в CSV', 'success');
    }

    /**
 * Переключить тему между светлой и темной
 */
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        const theme = this.isDarkMode ? 'dark' : 'light';
        document.body.setAttribute('data-color-scheme', theme);
        this.chartManager.updateTheme(this.isDarkMode);
        this.logEvent(`Тема изменена на ${this.isDarkMode ? 'темную' : 'светлую'}`, 'info');
    }

    /**
 * Записать событие в журнал событий
 * @param {string} message - Сообщение журнала
 * @param {string} type - Тип сообщения: 'info', 'warning', 'error', 'success'
 */
    logEvent(message, type = 'info') {
        const logContainer = document.getElementById('eventLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString('ru-RU');
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = `[${time}]`;
        
        const messageSpan = document.createElement('span');
        messageSpan.className = `log-message ${type}`;
        messageSpan.textContent = ` ${message}`;
        
        entry.appendChild(timeSpan);
        entry.appendChild(messageSpan);
        logContainer.appendChild(entry);
        
        // Автопрокрутка вниз
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Сохранять только последние 50 записей
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }
}

// Инициализировать приложение когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new UIController();
    });
} else {
    window.app = new UIController();
}