/**
 * @file simulationControl.js - Управление визуальной симуляцией автомата
 * @module ui/simulationControl
 */

class SimulationControl {
    /**
     * Создает контроллер симуляции
     * @param {HTMLElement} container - Контейнер для элементов управления
     * @param {GraphView} graphView - Визуализатор графа
     * @param {AutomataSimulator} simulator - Симулятор автомата
     * @param {AutomataModel} model - Модель данных
     */
    constructor(container, graphView, simulator, model) {
        this.container = container;
        this.graphView = graphView;
        this.simulator = simulator;
        this.model = model;

        // Проверяем что graphView доступен
        if (!this.graphView) {
            console.error('GraphView не передан в SimulationControl');
        }
        
        // Состояние симуляции
        this.isSimulationActive = false;
        this.currentStepIndex = 0;
        this.simulationSteps = [];
        
        // НОВОЕ: тип симуляции
        this.simulationMode = 'idle'; // 'idle', 'auto', 'step'

        // Визуальные элементы
        this.highlightedState = null;
        this.highlightedTransition = null;
        
        this.init();
        this.setupEventListeners();
    }

    /**
     * Инициализирует элементы управления
     */
    init() {
        this.renderControls();
        this.setupSimulatorCallbacks();
    }

    /**
     * Рендерит элементы управления симуляцией
     */
    renderControls() {
        //<button id="pause" class="control-btn" title="Пауза" disabled>⏸ Пауза</button>
        this.container.innerHTML = `
            <div class="simulation-controls">
                <div class="control-group">
                    <button id="start" class="control-btn" title="Запуск симуляции">▶ Запуск</button>

                    <button id="step" class="control-btn" title="Следующий шаг">⏭ Шаг</button>
                    <button id="reset" class="control-btn" title="Сброс симуляции">⏹ Сброс</button>
                    <button id="save" class="control-btn" title="Сохранить результаты">💾 Сохранить</button>
                    <button id="import" class="control-btn" title="Импортировать автомат">📂 Импорт</button>
                    <input type="file" id="import-json" accept=".json" style="display:none">
                </div>
                
                <div class="control-group">
                    <label for="speed" class="control-label">Скорость:</label>
                    <input type="range" id="speed" min="1" max="10" value="5" class="control-slider">
                    <span id="speed-value" class="control-value">5x</span>
                </div>
                
                <div class="control-group">
                    <label for="runs" class="control-label">Прогонов:</label>
                    <input type="number" id="runs" value="1" min="1" max="1000" class="control-input">
                </div>
                
                <div class="input-group">
                    <input type="text" id="input-string" placeholder="Введите строку (напр., aab)" class="control-input">
                    <div id="input-validation" class="validation-message"></div>
                </div>
            </div>
        `;

        this.simulationMode = 'idle';
        this.updateControls();
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventListeners() {
        // Кнопки управления
        this.container.addEventListener('click', (e) => {
            switch (e.target.id) {
                case 'start':
                    this.startSimulation();
                    break;
                case 'pause':
                    this.pauseSimulation();
                    break;
                case 'step':
                    this.nextStep();
                    break;
                case 'reset':
                    this.resetSimulation();
                    break;
                case 'save':
                    this.saveAutomaton();
                    break;
                case 'import':
                    this.importAutomaton();
                    break;
            }
        });

        // Слайдер скорости
        const speedSlider = this.container.querySelector('#speed');
        const speedValue = this.container.querySelector('#speed-value');
        
        speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            speedValue.textContent = speed + 'x';
            this.simulator.setSpeed(speed);
        });

        // Ввод строки
        const inputString = this.container.querySelector('#input-string');
        inputString.addEventListener('input', (e) => {
            this.validateInputString(e.target.value);
        });

        // Валидация при потере фокуса
        inputString.addEventListener('blur', (e) => {
            this.validateInputString(e.target.value, true);
        });
    }

    /**
     * Настраивает callback'и симулятора
     */
    setupSimulatorCallbacks() {
        console.log("Настройка callbackов симулятора...")
        console.log('simulator:', this.simulator);
        console.log('simulator.onStep:', this.simulator.onStep);
        console.log('typeof simulator.onStep:', typeof this.simulator.onStep);

        // Очищаем предыдущие callback'и
        this.simulator.clearCallbacks();

        // При завершении шага
        this.simulator.onStep((stepInfo) => {
            this.handleStep(stepInfo);
        });

        // При завершении симуляции
        this.simulator.onComplete((results) => {
            this.handleSimulationComplete(results);
        });

        // При ошибке
        this.simulator.onError((error) => {
            console.error('Ошибка симуляции:', error);
            this.handleSimulationError(error);
        });

        console.log("Callback'и настроены успешно");
    }

    /**
     * Запускает автоматическую симуляцию (с текущего состояния если есть)
     */
    async startSimulation() {
        const inputString = this.container.querySelector('#input-string').value.trim();
        
        if (!this.validateInputString(inputString, true)) {
            return;
        }

        const numRuns = parseInt(this.container.querySelector('#runs').value, 10) || 1;

        // ---- FAST PATH: статистический множественный прогон (без анимации) ----
        if (numRuns > 1) {
            try {
                // Используем модель, чтобы быстро получить статистику (model.simulate вызывает automaton.multipleRuns)
                const results = this.model.simulate(inputString, numRuns);

                // automaton.multipleRuns в automata.js возвращает finalStates как доли (probabilities),
                // поэтому для наглядности можно получить counts = prob * numRuns
                const distributionProb = results.results.finalStates || {};
                const distributionCounts = {};
                for (const [state, prob] of Object.entries(distributionProb)) {
                    distributionCounts[state] = prob * numRuns;
                }

                // Обновляем визуализацию (если доступна)
                if (window.stateVisualization) {
                    // передаём counts (renderHistogram умеет принимать counts)
                    window.stateVisualization.renderHistogram(distributionCounts, numRuns);
                }

                // Создаём событие для других модулей
                document.dispatchEvent(new CustomEvent('simulationComplete', { detail: results }));

                // Обновляем UI/контролы
                this.simulationMode = 'completed';
                this.setSimulationState('completed');
                this.updateControls();

                alert(`Множественная симуляция завершена: ${numRuns} прогонов. Гистограмма обновлена в правой панели.`);
                return;
            } catch (err) {
                this.handleSimulationError(err);
                return;
            }
        }

        if (!this.simulator.canSimulate()) {
            alert('Невозможно запустить симуляцию. Проверьте что автомат имеет состояния, начальные состояния и символы алфавита.');
            return;
        }

        try {
            const status = this.simulator.getStatus();
            
            // Если симуляция уже идет (на паузе или пошаговый режим), продолжаем как автоматическую
            if (status.isRunning) {
                console.log('=== ПРОДОЛЖЕНИЕ СИМУЛЯЦИИ В АВТОМАТИЧЕСКОМ РЕЖИМЕ ===');
                this.simulationMode = 'auto';
                
                // Если была на паузе - снимаем с паузы
                if (status.isPaused) {
                    this.simulator.resume();
                }
                
                this.setSimulationState('running');
                this.updateControls();
                
                // Продолжаем выполнение оставшейся части строки
                const remainingString = inputString.substring(status.currentSymbolIndex);
                if (remainingString) {
                    await this.simulator.simulateString(remainingString, {
                        speed: parseInt(this.container.querySelector('#speed').value)
                    });
                }
            } else {
                // Новая автоматическая симуляция
                console.log('=== НОВАЯ АВТОМАТИЧЕСКАЯ СИМУЛЯЦИЯ ===');
                this.simulator.reset();
                this.simulationMode = 'auto';
                this.setSimulationState('running');
                
                // ВРЕМЕННО: принудительно обновляем контролы с задержкой
                this.updateControls();
                
                // Даем время на обновление UI перед запуском симуляции
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await this.simulator.simulateString(inputString, {
                    speed: parseInt(this.container.querySelector('#speed').value)
                });
            }
            
        } catch (error) {
            this.handleSimulationError(error);
        }
    }

    /**
     * Запускает симуляцию в пошаговом режиме
     */
    // startStepByStep() {
    //     const inputString = this.container.querySelector('#input-string').value.trim();
        
    //     if (!this.validateInputString(inputString, true)) {
    //         return;
    //     }

    //     if (!this.simulator.canSimulate()) {
    //         alert('Невозможно запустить симуляцию. Проверьте что автомат имеет состояния, начальные состояния и символы алфавита.');
    //         return;
    //     }

    //     try {
    //         // Инициализируем симуляцию для пошагового режима
    //         this.simulator.reset();
    //         this.simulator.inputString = inputString;
    //         this.simulator.isRunning = true;
    //         this.simulator.isPaused = true; // Сразу на паузе
            
    //         this.setSimulationState('paused');
    //         this.simulationMode = 'auto_paused';
    //         this.updateControls(); // На паузе, можно делать шаги
            
    //         console.log('Симуляция готова для пошагового выполнения');
            
    //     } catch (error) {
    //         this.handleSimulationError(error);
    //     }
    // }

    /**
     * Ставит симуляцию на паузу или продолжает её (только для автоматической симуляции)
     */
    pauseSimulation() {
        const status = this.simulator.getStatus();
        console.log('=== PAUSE/RESUME ===', status);
        
        // Пауза работает ТОЛЬКО когда есть активная автоматическая симуляция
        if (this.simulationMode !== 'auto') {
            console.log('Пауза недоступна - нет активной автоматической симуляции');
            return;
        }

        if (status.isRunning && !status.isPaused) {
            // Ставим на паузу
            this.simulator.pause();
            this.simulationMode = 'auto_paused';
            this.setSimulationState('paused');
            this.updateControls();
            console.log('Автоматическая симуляция поставлена на паузу');
        } else if (status.isRunning && status.isPaused && this.simulationMode === 'auto_paused') {
            // Продолжаем с паузы
            this.simulator.resume();
            this.simulationMode = 'auto';
            this.setSimulationState('running');
            this.updateControls();
            console.log('Автоматическая симуляция продолжена');
        }
    }

    /**
     * Продолжает симуляцию после паузы
     */
    resumeSimulation() {
        if (this.simulator.getStatus().isRunning && this.simulator.getStatus().isPaused) {
            this.simulator.resume();
            this.simulationMode = 'auto';
            this.setSimulationState('running');
            this.updateControls();
        }
    }

    /**
     * Выполняет следующий шаг в ручном режиме
     */
    nextStep() {
        try {
            const status = this.simulator.getStatus();
            
            // Если симуляция не запущена, запускаем её в пошаговом режиме
            if (!status.isRunning) {
                const inputString = this.container.querySelector('#input-string').value.trim();
                
                if (!this.validateInputString(inputString, true)) {
                    return;
                }

                if (!this.simulator.canSimulate()) {
                    alert('Невозможно запустить симуляцию. Проверьте что автомат имеет состояния, начальные состояния и символы алфавита.');
                    return;
                }

                // Запускаем симуляцию в пошаговом режиме
                this.simulator.reset();
                this.simulator.inputString = inputString;
                this.simulator.isRunning = true;
                this.simulator.isPaused = true; // Сразу ставим на паузу для пошагового режима
                
                // Явно инициализируем currentSimulation
                this.simulator.currentSimulation = {
                    inputString: inputString,
                    startTime: Date.now(),
                    steps: [],
                    results: null
                };
                
                this.simulationMode = 'step';
                this.setSimulationState('paused');
                this.updateControls();
            }

            // Выполняем один шаг
            const stepInfo = this.simulator.step();
            if (stepInfo) {
                this.handleStep(stepInfo);
                
                // Проверяем не завершилась ли симуляция после шага
                const newStatus = this.simulator.getStatus();
                if (!newStatus.isRunning) {
                    this.setSimulationState('completed');
                    this.simulationMode = 'completed';
                    this.updateControls();
                } // else {
                //     this.updateControls(true, true, true);
                // }
            } else {
                console.log("Шаг не выполнен - симуляция завершена");
                this.simulationMode = 'completed';
                this.setSimulationState('completed');
                this.updateControls();
            }
        } catch (error) {
            this.handleSimulationError(error);
        }
    }



    /**
     * Сбрасывает симуляцию
     */
    resetSimulation() {
        this.simulator.reset();
        this.clearVisualization();
        this.simulationMode = 'idle';
        this.setSimulationState('reset');
        this.updateControls();
        
    }

    /**
     * Обрабатывает выполнение шага
     */
    handleStep(stepInfo) {
        console.log('Шаг симуляции:', stepInfo);
        
        // Безопасно визуализируем переход
        try {
            this.visualizeStep(stepInfo);
        } catch (error) {
            console.error('Ошибка визуализации шага:', error);
        }
        
        // Обновляем текущее состояние безопасно
        let currentState = '-';
        if (stepInfo.stateAfter && typeof stepInfo.stateAfter.getMostProbableState === 'function') {
            currentState = stepInfo.stateAfter.getMostProbableState();
            console.log('Текущее состояние после шага:', currentState);
        }

        // Обновляем счетчик шагов если есть элемент
        const stepCounter = this.container.querySelector('#step-counter');
        if (stepCounter) {
            stepCounter.textContent = stepInfo.step + 1;
        }
    }

    /**
     * Визуализирует шаг симуляции на графе
     */
    visualizeStep(stepInfo) {
        console.log('Визуализация шага:', stepInfo);
        
        // Снимаем предыдущее выделение
        this.clearVisualization();
        
        // Безопасно получаем информацию о состояниях
        let fromState = null;
        let toState = null;
        
        if (stepInfo.stateBefore && typeof stepInfo.stateBefore.getMostProbableState === 'function') {
            fromState = stepInfo.stateBefore.getMostProbableState();
        }
        
        if (stepInfo.stateAfter && typeof stepInfo.stateAfter.getMostProbableState === 'function') {
            toState = stepInfo.stateAfter.getMostProbableState();
        }
        
        console.log(`Визуализация перехода: ${fromState} --> ${toState}`);
        
        // Подсвечиваем только ЦЕЛЕВОЕ состояние (куда перешли)
        if (toState) {
            this.highlightState(toState, 'to');
            
            // Перерисовываем граф
            if (this.graphView) {
                this.graphView.render();
            }
        } else {
            console.warn('Не удалось определить целевое состояние для визуализации');
        }
    }

    /**
     * Подсвечивает состояние
     */
    highlightState(stateId, type) {
        if (!stateId) {
            console.warn('Попытка подсветки состояния без ID');
            return;
        }
        
        if (this.graphView) {
            // Просто сохраняем ID состояния и тип подсветки
            this.graphView.highlightedState = {
                stateId: stateId,
                type: type // 'from', 'to', 'final'
            };
            console.log(`Подсветка состояния: ${stateId} (тип: ${type})`);
        } else {
            console.warn('GraphView не доступен для подсветки');
        }
    }
    /**
     * Подсвечивает переход
     */
    highlightTransition(fromState, toState, symbol) {
        // Сохраняем информацию о подсвечиваемом переходе
        this.highlightedTransition = { fromState, toState, symbol };
    }

    /**
     * Очищает визуализацию
     */
    clearVisualization() {
        if (this.graphView) {
            this.graphView.highlightedState = null;
            this.graphView.render();
            console.log('Визуализация очищена');
        }
    }

    /**
     * Обрабатывает завершение симуляции
     */
    handleSimulationComplete(results) {
        console.log('Симуляция завершена:', results);
        
        this.simulationMode = 'completed';
        this.setSimulationState('completed');
        this.updateControls();
        
        // Безопасно обрабатываем разные типы результатов
        let finalStateId = '-';
        let isAccepted = false;
        let acceptanceProbability = 0;
        
        if (results.type === 'stopped') {
            // Обработка остановки симуляции
            finalStateId = 'Остановлено';
            isAccepted = false;
            acceptanceProbability = 0;
        } else {
            // Обработка нормального завершения
            if (results.finalState && typeof results.finalState.getMostProbableState === 'function') {
                finalStateId = results.finalState.getMostProbableState();
            } else if (results.mostProbableState) {
                finalStateId = results.mostProbableState;
            }
            
            isAccepted = results.isAccepted || false;
            acceptanceProbability = results.acceptanceProbability || 0;
        }
        
        // Подсвечиваем финальное состояние если оно известно и не является остановкой
        if (finalStateId && finalStateId !== '-' && finalStateId !== 'Остановлено' && this.graphView) {
            this.highlightState(finalStateId, 'final');
            this.graphView.render();
        }
    }

    /**
     * Обрабатывает ошибку симуляции
     */
    handleSimulationError(error) {
        console.error('Ошибка симуляции:', error);
        
        this.setSimulationState('error');
        this.simulationMode = 'completed';
        this.updateControls();
        
        alert('Ошибка симуляции: ' + error.message);
    }

    /**
     * Валидирует входную строку
     */
    validateInputString(inputString, showErrors = false) {
        const validationElement = this.container.querySelector('#input-validation');
        
        if (!inputString) {
            if (showErrors) {
                validationElement.textContent = 'Введите строку для симуляции';
                validationElement.className = 'validation-message error';
            }
            return false;
        }

        if (!this.model.currentAutomaton) {
            if (showErrors) {
                validationElement.textContent = 'Нет активного автомата';
                validationElement.className = 'validation-message error';
            }
            return false;
        }

        const alphabet = Array.from(this.model.currentAutomaton.alphabet);
        const invalidSymbols = [];
        
        for (let char of inputString) {
            if (!alphabet.includes(char)) {
                invalidSymbols.push(char);
            }
        }

        if (invalidSymbols.length > 0) {
            if (showErrors) {
                validationElement.textContent = `Неизвестные символы: ${invalidSymbols.join(', ')}. Доступные: ${alphabet.join(', ')}`;
                validationElement.className = 'validation-message error';
            }
            return false;
        }

        // Строка валидна
        validationElement.textContent = '✓ Строка валидна';
        validationElement.className = 'validation-message valid';
        return true;
    }


    /**
     * Обновляет состояние кнопок управления
     */
    updateControls() {
        const status = this.simulator.getStatus();
        console.log('🎛️ updateControls', { 
            mode: this.simulationMode,
            isRunning: status.isRunning,
            isPaused: status.isPaused
        });
        
        const startBtn = this.container.querySelector('#start');
        const pauseBtn = this.container.querySelector('#pause');
        const stepBtn = this.container.querySelector('#step');
        const resetBtn = this.container.querySelector('#reset');

        if (!startBtn || !pauseBtn || !stepBtn || !resetBtn) return;

        // УПРОЩЕННАЯ ЛОГИКА: если симуляция запущена и не на паузе - пауза доступна
        if (status.isRunning && !status.isPaused) {
            console.log('✅ Пауза должна быть доступна!');
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stepBtn.disabled = true;
        } 
        // Если симуляция запущена и на паузе
        else if (status.isRunning && status.isPaused) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            pauseBtn.textContent = '▶ Продолжить';
            stepBtn.disabled = false;
        }
        // Во всех остальных случаях
        else {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stepBtn.disabled = (this.simulationMode === 'completed');
            pauseBtn.textContent = '⏸ Пауза';
        }
    }

    /**
     * Устанавливает статус симуляции
     */
    setSimulationState(state) {
        // const statusElement = this.container.querySelector('#simulation-status');
        const states = {
            'running': { text: 'Выполняется', className: 'status-running' },
            'paused': { text: 'На паузе', className: 'status-paused' },
            'completed': { text: 'Завершено', className: 'status-completed' },
            'error': { text: 'Ошибка', className: 'status-error' },
            'reset': { text: 'Не запущено', className: 'status-idle' }
        };
    }

    /**
     * Сохраняет текущий автомат в JSON
     */
    saveResults() {
        try {
            const automaton = this.model.currentAutomaton;
            if (!automaton) {
                alert('Нет автомата для сохранения');
                return;
            }

            // Экспортируем автомат в JSON
            const automatonData = automaton.toJSON();
            const jsonText = JSON.stringify(automatonData, null, 2);

            // Сохраняем как файл
            this.downloadTextFile(jsonText, `automaton_${Date.now()}.json`);

            alert('Автомат успешно сохранён в JSON');
        } catch (error) {
            console.error('Ошибка при сохранении автомата:', error);
            alert('Ошибка при сохранении автомата. Подробности в консоли.');
        }
    }

    /**
     * Сохраняет текущую модель (все автоматы) в JSON
     */
    saveAutomaton() {
        if (!this.model) {
            alert('❌ Модель не найдена.');
            return;
        }

        const json = this.model.toJSON ? this.model.toJSON() : null;
        if (!json) {
            alert('❌ Ошибка: модель не может быть экспортирована.');
            return;
        }

        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `automaton_model_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        alert('✅ Модель сохранена в JSON!');
    }


    /**
     * Импорт автомата из JSON-файла
     */
    importAutomaton() {
        const fileInput = document.getElementById('import-json');
        if (!fileInput) return;

        // обработчик выбора файла
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (this.model && typeof this.model.fromJSON === 'function') {
                        this.model.fromJSON(data);
                        if (this.graphView) {
                            this.graphView.automaton = this.model.currentAutomaton;
                            this.graphView.render();
                        }

                        // 🔁 Обновляем панель вероятностей
                        if (window.probabilityPanel && typeof window.probabilityPanel.update === 'function') {
                            window.probabilityPanel.update();
                        }

                        // 🔁 Обновляем панель визуализации состояний
                        if (window.stateVisualization && typeof window.stateVisualization.renderHistogram === 'function') {
                            window.stateVisualization.renderHistogram({});
                        }

                        // 🔁 Выполняем анализ автомата (марковость, эргодичность и т.д.)
                        if (typeof analyzeAutomatonProperties === 'function') {
                            const analysis = analyzeAutomatonProperties(this.model.currentAutomaton);
                            updatePropertiesPanel(analysis);
                        }
                        
                        alert('✅ Автомат успешно импортирован!');
                    } else {
                        alert('❌ Ошибка: модель не поддерживает импорт JSON.');
                    }
                } catch (err) {
                    console.error('Ошибка при импорте автомата:', err);
                    alert('Ошибка при импорте: неверный формат JSON');
                }
            };
            reader.readAsText(file);
        };

        // открываем диалог выбора файла
        fileInput.click();
    }


    /**
     * Генерирует текстовый отчет
     */
    generateReport(results) {
        return `
Результаты симуляции вероятностного автомата
=============================================

Автомат: ${results.automatonName}
Входная строка: "${results.inputString}"
Время выполнения: ${results.executionTime} мс
Количество шагов: ${results.totalSteps}

Финальное распределение:
${Object.keys(results.finalState.states)
    .map(state => `  ${state}: ${(results.finalState.states[state] * 100).toFixed(2)}%`)
    .join('\n')}

Пошаговая история:
${results.steps.map(step => `
Шаг ${step.step + 1}: Символ '${step.symbol}'
  Состояние до: ${step.stateBefore.getMostProbableState()}
  Состояние после: ${step.stateAfter.getMostProbableState()}
`).join('')}
        `.trim();
    }

    /**
     * Скачивает текстовый файл
     */
    downloadTextFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Обновляет контроллер (вызывается при изменении автомата)
     */
    update() {
        this.resetSimulation();
        this.validateInputString(this.container.querySelector('#input-string').value);
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SimulationControl };
} else {
    window.SimulationControl = SimulationControl;
}