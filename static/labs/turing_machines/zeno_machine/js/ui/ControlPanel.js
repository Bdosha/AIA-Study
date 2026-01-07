
// js/ui/ControlPanel.js
/**
 * Класс для управления элементами ввода и взаимодействием с пользователем
 * Расширенная версия с поддержкой стохастических правил и 3D режима
 */
class ControlPanel {
    /**
     * Конструктор класса панели управления
     * @param {Object} callbacks - Объект с callback функциями для взаимодействия с приложением
     */
    constructor(callbacks = {}) {
        // Callback функции для взаимодействия с основным приложением
        this.callbacks = {
            onSettingsApply: callbacks.onSettingsApply || (() => {}),
            onSimulationStart: callbacks.onSimulationStart || (() => {}),
            onSimulationStop: callbacks.onSimulationStop || (() => {}),
            onSimulationStep: callbacks.onSimulationStep || (() => {}),
            onSimulationReset: callbacks.onSimulationReset || (() => {}),
            onSpeedChange: callbacks.onSpeedChange || (() => {}),
            onPresetChange: callbacks.onPresetChange || (() => {}),
            onRenderModeChange: callbacks.onRenderModeChange || (() => {}),
            // Callback для стохастического режима
            onStochasticToggle: callbacks.onStochasticToggle || (() => {}),
            onRandomSeedChange: callbacks.onRandomSeedChange || (() => {}),
            on3DModeToggle: callbacks.on3DModeToggle || (() => {}),
            onRegenerateStochastic: callbacks.onRegenerateStochastic || (() => {}),
            onResetCamera: callbacks.onResetCamera || (() => {})
        };

        // Элементы DOM
        this.elements = {};
        
        // Состояние панели управления
        this.state = {
            currentPreset: 'koch',
            isSimulationRunning: false,
            currentIteration: 0,
            stringLength: 0,
            executionTime: 0,
            currentSpeed: 5,
            // Состояние для новых функций
            stochasticMode: false,
            randomSeed: 12345,
            is3DMode: false,
            commandsCount: 0,
            currentRenderMode: '2d'
        };

        // Предустановки L-систем
        this.presets = this.initializePresets();

        // Флаг инициализации
        this.initialized = false;

        // Привязка контекста для обработчиков событий
        this.handleSettingsApply = this.handleSettingsApply.bind(this);
        this.handlePresetChange = this.handlePresetChange.bind(this);
        this.handleSimulationControl = this.handleSimulationControl.bind(this);
        this.handleSpeedChange = this.handleSpeedChange.bind(this);
        this.handleRenderModeChange = this.handleRenderModeChange.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        // Привязка для новых обработчиков
        this.handleStochasticToggle = this.handleStochasticToggle.bind(this);
        this.handleRandomSeedChange = this.handleRandomSeedChange.bind(this);
        this.handle3DModeToggle = this.handle3DModeToggle.bind(this);
        this.handleRegenerateStochastic = this.handleRegenerateStochastic.bind(this);
        this.handleResetCamera = this.handleResetCamera.bind(this);
        this.handleRandomizeSeed = this.handleRandomizeSeed.bind(this);

        // Инициализация
        this.init();
    }

    /**
     * Инициализация панели управления
     */
    init() {
        this.findDOMElements();
        this.setupEventListeners();
        this.loadInitialPreset();
        this.updateUIState();
        
        this.initialized = true;
        console.log('✅ ControlPanel инициализирован с поддержкой стохастических правил и 3D');
    }

    /**
     * Поиск элементов DOM
     */
    findDOMElements() {
        // Основные элементы управления
        this.elements = {
            // Настройки системы
            axiomInput: document.getElementById('axiomInput'),
            rulesInput: document.getElementById('rulesInput'),
            angleInput: document.getElementById('angleInput'),
            iterationsInput: document.getElementById('iterationsInput'),
            
            // Предустановки
            presetSelect: document.getElementById('presetSelect'),
            
            // Стохастический режим
            stochasticToggle: document.getElementById('stochasticToggle'),
            randomSeedGroup: document.getElementById('randomSeedGroup'),
            randomSeedInput: document.getElementById('randomSeedInput'),
            randomizeSeedBtn: document.getElementById('randomizeSeedBtn'),
            regenerateStochasticBtn: document.getElementById('regenerateStochasticBtn'),
            
            // 3D режим
            threeDToggle: document.getElementById('threeDToggle'),
            resetCameraBtn: document.getElementById('resetCameraBtn'),
            
            // Управление анимацией
            speedSlider: document.getElementById('speedSlider'),
            stepCounter: document.getElementById('stepCounter'),
            timerDisplay: document.getElementById('timerDisplay'),
            
            // Новые дисплеи статистики
            modeDisplay: document.getElementById('modeDisplay'),
            stochasticDisplay: document.getElementById('stochasticDisplay'),
            stringLengthDisplay: document.getElementById('stringLengthDisplay'),
            commandsDisplay: document.getElementById('commandsDisplay'),
            
            // Кнопки управления
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            stepBtn: document.getElementById('stepBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // Визуализация
            visualizationTabs: document.querySelectorAll('.tab-button'),
            
            // Ошибки
            errorDisplay: document.getElementById('errorDisplay')
        };

        // Установка максимального значения итераций
        if (this.elements.iterationsInput) {
            this.elements.iterationsInput.max = 15;
        }

        this.validateDOMElements();
    }

    /**
     * Проверка наличия всех необходимых DOM элементов
     */
    validateDOMElements() {
        const missingElements = [];
        const requiredElements = [
            'axiomInput', 'rulesInput', 'angleInput', 'iterationsInput',
            'presetSelect', 'speedSlider', 'startBtn', 'stopBtn', 'stepBtn', 'resetBtn'
        ];
        
        requiredElements.forEach(key => {
            if (!this.elements[key]) {
                missingElements.push(key);
            }
        });

        // Новые элементы (не обязательные для базовой функциональности)
        const optionalElements = [
            'stochasticToggle', 'threeDToggle', 'randomSeedInput', 'randomizeSeedBtn',
            'regenerateStochasticBtn', 'resetCameraBtn', 'modeDisplay', 'stochasticDisplay',
            'stringLengthDisplay', 'commandsDisplay'
        ];

        optionalElements.forEach(key => {
            if (!this.elements[key]) {
                console.warn('Не найден опциональный элемент:', key);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn('Не найдены основные DOM элементы:', missingElements.join(', '));
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчики для вкладок визуализации
        if (this.elements.visualizationTabs) {
            this.elements.visualizationTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.handleRenderModeChange(tabName);
                });
            });
        }

        // Обработчики для предустановок
        if (this.elements.presetSelect) {
            this.elements.presetSelect.addEventListener('change', this.handlePresetChange);
        }

        // Обработчики для кнопок управления
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.handleSimulationControl('start'));
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.handleSimulationControl('stop'));
        }
        
        if (this.elements.stepBtn) {
            this.elements.stepBtn.addEventListener('click', () => this.handleSimulationControl('step'));
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.handleSimulationControl('reset'));
        }

        // Обработчик скорости
        if (this.elements.speedSlider) {
            this.elements.speedSlider.addEventListener('input', this.handleSpeedChange);
            this.elements.speedSlider.value = this.state.currentSpeed;
        }

        // Обработчики для стохастического режима
        if (this.elements.stochasticToggle) {
            this.elements.stochasticToggle.addEventListener('change', this.handleStochasticToggle);
        }

        if (this.elements.randomSeedInput) {
            this.elements.randomSeedInput.addEventListener('change', (e) => {
                this.handleRandomSeedChange(parseInt(e.target.value));
            });
            // Устанавливаем начальное значение
            this.elements.randomSeedInput.value = this.state.randomSeed;
        }

        if (this.elements.randomizeSeedBtn) {
            this.elements.randomizeSeedBtn.addEventListener('click', this.handleRandomizeSeed);
        }

        if (this.elements.regenerateStochasticBtn) {
            this.elements.regenerateStochasticBtn.addEventListener('click', this.handleRegenerateStochastic);
        }

        // Обработчики для 3D режима
        if (this.elements.threeDToggle) {
            this.elements.threeDToggle.addEventListener('change', this.handle3DModeToggle);
        }

        if (this.elements.resetCameraBtn) {
            this.elements.resetCameraBtn.addEventListener('click', this.handleResetCamera);
        }

        // Автоматическое применение изменений при вводе
        this.setupAutoApply();
    }

    /**
     * Настройка автоматического применения изменений
     */
    setupAutoApply() {
        const inputs = [
            this.elements.axiomInput,
            this.elements.rulesInput,
            this.elements.angleInput,
            this.elements.iterationsInput
        ];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', this.handleInputChange);
            }
        });
    }

    /**
     * Инициализация предустановленных L-систем
     * @returns {Object} Объект с предустановками
     */
    initializePresets() {
        return {
            custom: {
                name: 'Пользовательская',
                axiom: '',
                rules: '',
                angle: 25,
                iterations: 4,
                description: 'Пользовательская конфигурация'
            },
            koch: {
                name: '❄️ Снежинка Коха',
                axiom: 'F--F--F',
                rules: 'F->F+F--F+F',
                angle: 60,
                iterations: 4,
                description: 'Классическая снежинка Коха'
            },
            plant: {
                name: '🌿 Ветка растения',
                axiom: 'X',
                rules: 'X->F[+X]F[-X]+X\nF->FF',
                angle: 25,
                iterations: 5,
                description: 'Модель роста растения'
            },
            dragon: {
                name: '🐉 Дракон Хартера-Хейтуэя',
                axiom: 'FX',
                rules: 'X->X+YF+\nY->-FX-Y',
                angle: 90,
                iterations: 10,
                description: 'Фрактальная кривая дракона'
            },
            tree: {
                name: '🌳 Бинарное дерево',
                axiom: '0',
                rules: '1->11\n0->1[0]0',
                angle: 45,
                iterations: 6,
                description: 'Фрактальное бинарное дерево'
            },
            sierpinski: {
                name: '🔺 Треугольник Серпинского',
                axiom: 'F-G-G',
                rules: 'F->F-G+F+G-F\nG->GG',
                angle: 120,
                iterations: 5,
                description: 'Треугольник Серпинского'
            },
            bush: {
                name: '🌿 Куст',
                axiom: 'F',
                rules: 'F->FF+[+F-F-F]-[-F+F+F]',
                angle: 22.5,
                iterations: 4,
                description: 'Фрактальный куст'
            },
            fractalTree: {
                name: '🎄 Фрактальное дерево',
                axiom: 'F',
                rules: 'F->F[+FF][-FF]F[-F][+F]F',
                angle: 35,
                iterations: 4,
                description: 'Сложное фрактальное дерево'
            },
            weed: {
                name: '🌱 Сорняк',
                axiom: 'F',
                rules: 'F->FF-[-F+F+F]+[+F-F-F]',
                angle: 22.5,
                iterations: 4,
                description: 'Фрактальный сорняк'
            },
            // НОВЫЕ ПРЕДУСТАНОВКИ: 3D ДЕРЕВЬЯ
            tree3d: {
                name: '🌳 3D Дерево',
                axiom: 'A',
                rules: 'A->F[+A][-A][&A][^A]F[+A][-A]\nF->FF',
                angle: 22.5,
                iterations: 4,
                description: 'Объемное 3D дерево с ветвлением во всех направлениях'
            },
            tree3d_bush: {
                name: '🌿 3D Куст',
                axiom: 'A',
                rules: 'A->F[+A][-A][&A][^A]\nF->FF',
                angle: 25,
                iterations: 4,
                description: 'Объемный 3D куст'
            },
            tree3d_pine: {
                name: '🎄 3D Ель',
                axiom: 'A',
                rules: 'A->F[+A][-A][&A]FA\nF->FF',
                angle: 20,
                iterations: 5,
                description: 'Объемная 3D ель с вертикальным ростом'
            },
            // НОВЫЕ ПРЕДУСТАНОВКИ: СТОХАСТИЧЕСКИЕ СИСТЕМЫ
            stochastic_tree: {
                name: '🎲 Стохастическое дерево',
                axiom: 'A',
                rules: 'A->F[+A][-A][&A][^A]\nF->FF[70%]|F[+F]F[20%]|F[-F]F[10%]',
                angle: 25,
                iterations: 5,
                description: 'Дерево со случайными вариациями ветвления'
            },
            stochastic_bush: {
                name: '🎲 Стохастический куст',
                axiom: 'F',
                rules: 'F->FF+[+F-F-F][40%]|FF-[+F-F-F][30%]|FF[30%]',
                angle: 22.5,
                iterations: 4,
                description: 'Куст со случайными вариациями роста'
            },
            stochastic_weed: {
                name: '🎲 Стохастический сорняк',
                axiom: 'F',
                rules: 'F->FF-[-F+F+F][50%]|FF+[+F-F-F][30%]|F[20%]',
                angle: 25,
                iterations: 4,
                description: 'Сорняк со случайными вариациями формы'
            }
        };
    }

    /**
     * Загрузка начальной предустановки
     */
    loadInitialPreset() {
        this.loadPreset('koch');
    }

    /**
     * Обработчик применения настроек
     */
    handleSettingsApply() {
        const settings = this.getCurrentSettings();
        this.state.lastAppliedSettings = settings;
        this.callbacks.onSettingsApply(settings);
    }

    /**
     * Обработчик изменения предустановки
     * @param {Event} event - Событие изменения
     */
    handlePresetChange(event) {
        const presetName = event.target.value;
        this.loadPreset(presetName);
        this.callbacks.onPresetChange(presetName);
    }

    /**
     * Обработчик управления симуляцией
     * @param {string} action - Действие (start, stop, step, reset)
     */
    handleSimulationControl(action) {
        switch (action) {
            case 'start':
                this.state.isSimulationRunning = true;
                this.callbacks.onSimulationStart();
                break;
            case 'stop':
                this.state.isSimulationRunning = false;
                this.callbacks.onSimulationStop();
                break;
            case 'step':
                this.callbacks.onSimulationStep();
                break;
            case 'reset':
                this.state.isSimulationRunning = false;
                this.state.currentIteration = 0;
                this.callbacks.onSimulationReset();
                break;
        }
        
        this.updateUIState();
    }

    /**
     * Обработчик изменения скорости
     * @param {Event} event - Событие изменения
     */
    handleSpeedChange(event) {
        const speed = parseInt(event.target.value);
        this.state.currentSpeed = speed;
        this.callbacks.onSpeedChange(speed);
    }

    /**
     * Обработчик изменения режима рендеринга
     * @param {string} mode - Режим рендеринга ('2d' или '3d')
     */
    handleRenderModeChange(mode) {
        this.state.currentRenderMode = mode;
        this.updateModeDisplay();
        this.callbacks.onRenderModeChange(mode);
    }

    /**
     * Обработчик изменения ввода
     */
    handleInputChange() {
        this.updatePresetToCustom();
        // Мгновенное применение изменений
        this.handleSettingsApply();
    }

    /**
     * Обработчик переключения стохастического режима
     * @param {Event} event - Событие изменения
     */
    handleStochasticToggle(event) {
        this.state.stochasticMode = event.target.checked;
        
        // Показываем/скрываем группу random seed
        if (this.elements.randomSeedGroup) {
            this.elements.randomSeedGroup.style.display = this.state.stochasticMode ? 'block' : 'none';
        }
        
        this.updateStochasticDisplay();
        this.callbacks.onStochasticToggle(this.state.stochasticMode);
    }

    /**
     * Обработчик изменения random seed
     * @param {number} seed - Новое значение seed
     */
    handleRandomSeedChange(seed) {
        this.state.randomSeed = seed;
        if (this.elements.randomSeedInput) {
            this.elements.randomSeedInput.value = seed;
        }
        this.callbacks.onRandomSeedChange(seed);
    }

    /**
     * Обработчик случайного seed
     */
    handleRandomizeSeed() {
        const randomSeed = Math.floor(Math.random() * 100000);
        this.handleRandomSeedChange(randomSeed);
    }

    /**
     * Обработчик переключения 3D режима
     * @param {Event} event - Событие изменения
     */
    handle3DModeToggle(event) {
        this.state.is3DMode = event.target.checked;
        this.updateModeDisplay();
        this.callbacks.on3DModeToggle(this.state.is3DMode);
    }

    /**
     * Обработчик регенерации стохастической системы
     */
    handleRegenerateStochastic() {
        this.callbacks.onRegenerateStochastic();
    }

    /**
     * Обработчик сброса камеры
     */
    handleResetCamera() {
        this.callbacks.onResetCamera();
    }

    /**
     * Получение текущих настроек из формы
     * @returns {Object} Объект с настройками
     */
    getCurrentSettings() {
        return {
            axiom: this.elements.axiomInput ? this.elements.axiomInput.value.trim() : 'F',
            rules: this.elements.rulesInput ? this.elements.rulesInput.value.trim() : '',
            angle: this.elements.angleInput ? parseFloat(this.elements.angleInput.value) : 25,
            iterations: this.elements.iterationsInput ? parseInt(this.elements.iterationsInput.value) : 4,
            stochasticMode: this.state.stochasticMode,
            randomSeed: this.state.randomSeed,
            is3DMode: this.state.is3DMode
        };
    }

    /**
     * Загрузка предустановки в форму
     * @param {string} presetName - Название предустановки
     */
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.error('Предустановка не найдена:', presetName);
            return;
        }

        this.state.currentPreset = presetName;

        // Заполнение формы значениями предустановки
        if (this.elements.presetSelect) {
            this.elements.presetSelect.value = presetName;
        }
        
        if (this.elements.axiomInput) {
            this.elements.axiomInput.value = preset.axiom;
        }
        
        if (this.elements.rulesInput) {
            this.elements.rulesInput.value = preset.rules;
        }
        
        if (this.elements.angleInput) {
            this.elements.angleInput.value = preset.angle;
        }
        
        if (this.elements.iterationsInput) {
            this.elements.iterationsInput.value = preset.iterations;
        }

        // Автоматическое применение предустановки
        this.handleSettingsApply();
        
        console.log('Загружена предустановка:', preset.name);
    }

    /**
     * Обновление UI в соответствии с текущим состоянием
     */
    updateUIState() {
        // Обновление состояния кнопок симуляции
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = this.state.isSimulationRunning;
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.disabled = !this.state.isSimulationRunning;
        }
        
        if (this.elements.stepBtn) {
            this.elements.stepBtn.disabled = this.state.isSimulationRunning;
        }

        // Обновление информации
        if (this.elements.stepCounter) {
            this.elements.stepCounter.textContent = this.state.currentIteration;
        }
        
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = `${this.state.executionTime}мс`;
        }

        // Обновление дополнительных дисплеев
        this.updateModeDisplay();
        this.updateStochasticDisplay();
        this.updateStringLengthDisplay();
        this.updateCommandsDisplay();
    }

    /**
     * Обновление отображения режима
     */
    updateModeDisplay() {
        if (this.elements.modeDisplay) {
            let modeText = this.state.currentRenderMode.toUpperCase();
            if (this.state.is3DMode && this.state.currentRenderMode === '3d') {
                modeText += ' (3D парсинг)';
            }
            this.elements.modeDisplay.textContent = modeText;
        }
    }

    /**
     * Обновление отображения стохастического режима
     */
    updateStochasticDisplay() {
        if (this.elements.stochasticDisplay) {
            this.elements.stochasticDisplay.textContent = this.state.stochasticMode ? 'Да' : 'Нет';
            this.elements.stochasticDisplay.style.color = this.state.stochasticMode ? 
                'var(--accent-stochastic)' : 'var(--text-muted)';
        }
    }

    /**
     * Обновление отображения длины строки
     */
    updateStringLengthDisplay() {
        if (this.elements.stringLengthDisplay) {
            this.elements.stringLengthDisplay.textContent = this.state.stringLength.toLocaleString();
        }
    }

    /**
     * Обновление отображения количества команд
     */
    updateCommandsDisplay() {
        if (this.elements.commandsDisplay) {
            this.elements.commandsDisplay.textContent = this.state.commandsCount.toLocaleString();
        }
    }

    /**
     * Обновление статистики симуляции
     * @param {Object} stats - Объект со статистикой
     */
    updateSimulationStats(stats) {
        this.state.currentIteration = stats.currentIteration || 0;
        this.state.stringLength = stats.stringLength || 0;
        this.state.executionTime = stats.executionTime || 0;
        this.state.commandsCount = stats.commandsCount || 0;
        
        // Обновление расширенной статистики
        if (stats.used3DParsing !== undefined) {
            this.state.is3DMode = stats.used3DParsing;
            if (this.elements.threeDToggle) {
                this.elements.threeDToggle.checked = this.state.is3DMode;
            }
        }

        if (stats.stochasticMode !== undefined) {
            this.state.stochasticMode = stats.stochasticMode;
            if (this.elements.stochasticToggle) {
                this.elements.stochasticToggle.checked = this.state.stochasticMode;
            }
            if (this.elements.randomSeedGroup) {
                this.elements.randomSeedGroup.style.display = this.state.stochasticMode ? 'block' : 'none';
            }
        }
        
        this.updateUIState();
    }

    /**
     * Установка предустановки в "пользовательская"
     */
    updatePresetToCustom() {
        if (this.state.currentPreset !== 'custom') {
            this.state.currentPreset = 'custom';
            if (this.elements.presetSelect) {
                this.elements.presetSelect.value = 'custom';
            }
        }
    }

    /**
     * Получение состояния панели управления
     * @returns {Object} Объект с состоянием
     */
    getState() {
        return {
            initialized: this.initialized,
            currentPreset: this.state.currentPreset,
            isSimulationRunning: this.state.isSimulationRunning,
            currentSpeed: this.state.currentSpeed,
            stochasticMode: this.state.stochasticMode,
            is3DMode: this.state.is3DMode,
            currentRenderMode: this.state.currentRenderMode,
            simulationStats: {
                currentIteration: this.state.currentIteration,
                stringLength: this.state.stringLength,
                executionTime: this.state.executionTime,
                commandsCount: this.state.commandsCount
            },
            lastAppliedSettings: this.state.lastAppliedSettings
        };
    }

    /**
     * Уничтожение панели управления
     */
    destroy() {
        this.initialized = false;
        console.log('✅ ControlPanel уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ControlPanel;
} else {
    window.ControlPanel = ControlPanel;
}
