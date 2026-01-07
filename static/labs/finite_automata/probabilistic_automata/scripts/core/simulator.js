/**
 * @file Simulator.js - Управление симуляцией вероятностных автоматов в реальном времени
 * @module core/simulator
 */

/**
 * Класс симулятора для управления процессом симуляции
 * @class AutomataSimulator
 */
class AutomataSimulator {
    /**
     * Создает симулятор
     * @param {AutomataModel} model - Модель данных
     */
    constructor(model) {
        this.model = model;
        this.isRunning = false;
        this.isPaused = false;
        this.currentStep = 0;
        this.simulationSpeed = 1; // Множитель скорости (1 = нормальная скорость)
        this.maxSteps = 1000; // Максимальное количество шагов для защиты от бесконечного цикла
        
        // Текущая симуляция
        this.currentSimulation = null;
        this.inputString = '';
        this.currentSymbolIndex = 0;
        
        // Callbacks для обновления UI
        // this.onStepCallback = [];
        // this.onCompleteCallback = [];
        // this.onErrorCallback = [];

        this.stepCallbacks = [];
        this.completeCallbacks = [];
        this.errorCallbacks = [];
        
        // Таймер для анимации
        this.animationTimer = null;
        this.stepInterval = 500; // Интервал между шагами в мс
    }

    /**
     * Запускает симуляцию входной строки
     * @param {string} inputString - Входная строка для симуляции
     * @param {Object} options - Опции симуляции
     * @returns {Promise} Промис завершения симуляции
     */
    async simulateString(inputString, options = {}) {
        if (this.isRunning) {
            throw new Error('Симуляция уже запущена');
        }

        if (!this.model.currentAutomaton) {
            throw new Error('Нет активного автомата для симуляции');
        }

        // Сбрасываем состояние симулятора
        this.reset();
        
        this.inputString = inputString;
        this.currentSymbolIndex = 0;
        this.isRunning = true;
        this.isPaused = false;
        
        // Настройки
        this.simulationSpeed = options.speed || 1;
        this.stepInterval = Math.max(100, 500 / this.simulationSpeed); // Минимальный интервал 100мс
        
        this.currentSimulation = {
            inputString,
            startTime: Date.now(),
            steps: [],
            results: null
        };

        try {
            // Сбрасываем автомат в начальное состояние
            this.model.currentAutomaton.reset();
            
            // Запускаем пошаговую симуляцию
            await this.executeStepByStep();
            
            return this.currentSimulation.results;
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    /**
    * Запускает симуляцию входной строки
    */
    async simulateString(inputString, options = {}) {
        console.log('🎬 simulateString started', { inputString, isRunning: this.isRunning });
        
        if (this.isRunning) {
            throw new Error('Симуляция уже запущена');
        }

        if (!this.model.currentAutomaton) {
            throw new Error('Нет активного автомата для симуляции');
        }

        // Сбрасываем состояние симулятора
        this.reset();
        
        this.inputString = inputString;
        this.currentSymbolIndex = 0;
        this.isRunning = true;
        this.isPaused = false;
        
        // Настройки
        this.simulationSpeed = options.speed || 1;
        this.stepInterval = Math.max(100, 500 / this.simulationSpeed);
        
        this.currentSimulation = {
            inputString,
            startTime: Date.now(),
            steps: [],
            results: null
        };

        console.log('🔄 Симулятор инициализирован:', {
            isRunning: this.isRunning,
            isPaused: this.isPaused
        });

        try {
            // Сбрасываем автомат в начальное состояние
            this.model.currentAutomaton.reset();
            
            // ВЫЗЫВАЕМ STEP CALLBACK ДЛЯ ОБНОВЛЕНИЯ UI СРАЗУ ЖЕ
            this.stepCallbacks.forEach(callback => {
                try {
                    callback({
                        step: 0,
                        symbolIndex: 0,
                        symbol: '',
                        stateBefore: this.model.currentAutomaton.currentState.clone(),
                        stateAfter: this.model.currentAutomaton.currentState.clone(),
                        timestamp: Date.now(),
                        isFinalStep: false
                    });
                } catch (error) {
                    console.error('Ошибка в начальном step callback:', error);
                }
            });
            
            // Запускаем пошаговую симуляцию
            await this.executeStepByStep();
            
            return this.currentSimulation.results;
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Выполняет симуляцию пошагово
     * @private
     */
    async executeStepByStep() {
        while (this.currentSymbolIndex < this.inputString.length && 
               this.isRunning && !this.isPaused && 
               this.currentStep < this.maxSteps) {
            
            await this.executeSingleStep();
            
            // Задержка для анимации
            if (this.stepInterval > 0) {
                await this.delay(this.stepInterval);
            }
        }
        
        // Завершаем симуляцию если не на паузе
        if (this.isRunning && !this.isPaused) {
            this.completeSimulation();
        }
    }

    /**
     * Выполняет один шаг симуляции
     * @private
     */
    async executeSingleStep() {
        if (this.currentSymbolIndex >= this.inputString.length) {
            return;
        }

        // Гарантируем что currentSimulation существует
        if (!this.currentSimulation) {
            console.warn('currentSimulation не инициализирован, создаем...');
            this.currentSimulation = {
                inputString: this.inputString,
                startTime: Date.now(),
                steps: [],
                results: null
            };
        }

        const symbol = this.inputString[this.currentSymbolIndex];
        const automaton = this.model.currentAutomaton;
        
        // Сохраняем состояние до шага
        const stateBefore = automaton.currentState.clone();
        
        try {
            // Выполняем шаг
            const newState = automaton.processSymbol(symbol);
            
            // Сохраняем информацию о шаге
            const stepInfo = {
                step: this.currentStep,
                symbolIndex: this.currentSymbolIndex,
                symbol: symbol,
                stateBefore: stateBefore,
                stateAfter: newState.clone(),
                timestamp: Date.now(),
                isFinalStep: this.currentSymbolIndex === this.inputString.length - 1
            };
            
            // Гарантируем что steps массив существует
            if (!this.currentSimulation.steps) {
                this.currentSimulation.steps = [];
            }
            
            this.currentSimulation.steps.push(stepInfo);
            
            // Вызываем ВСЕ callback'и для обновления UI
            this.stepCallbacks.forEach(callback => {
                try {
                    callback(stepInfo);
                } catch (error) {
                    console.error('Ошибка в step callback:', error);
                }
            });
            
            this.currentSymbolIndex++;
            this.currentStep++;
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Завершает симуляцию и вычисляет результаты
     * @private
     */
    completeSimulation() {
        if (!this.currentSimulation) {
            console.error('Нельзя завершить симуляцию - currentSimulation is null');
            return;
        }
        const automaton = this.model.currentAutomaton;
        const finalState = automaton.currentState;
        
        // Вычисляем результаты
        this.currentSimulation.results = {
            type: 'step-by-step',
            inputString: this.inputString,
            finalState: finalState.clone(),
            isAccepted: automaton.isStringAccepted(this.inputString),
            acceptanceProbability: automaton.getAcceptanceProbability(this.inputString),
            totalSteps: this.currentStep,
            executionTime: Date.now() - this.currentSimulation.startTime,
            steps: [...this.currentSimulation.steps],
            automatonId: this.model.getAutomatonId(automaton),
            automatonName: automaton.name
        };

        // Сохраняем в историю модели
        this.model.addToHistory(this.currentSimulation.results);

        // Вызываем ВСЕ callback'и завершения
        this.completeCallbacks.forEach(callback => {
            try {
                callback(this.currentSimulation.results);
            } catch (error) {
                console.error('Ошибка в complete callback:', error);
            }
        });

        this.isRunning = false;
        console.log('Симуляция завершена:', this.currentSimulation.results);
    }

    /**
     * Паузирует симуляцию
     */
    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            console.log('Симуляция на паузе');
        }
    }

    /**
     * Продолжает симуляцию после паузы
     */
    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            console.log('Симуляция продолжена');
            this.executeStepByStep(); // Продолжаем выполнение
        }
    }

    /**
     * Останавливает симуляцию
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        
        console.log('Симуляция остановлена');
        
        // Вызываем callback остановки
        if (this.completeCallbacks && this.completeCallbacks.length > 0) {
            const stopResult = {
                type: 'stopped',
                inputString: this.inputString || "",
                stepsCompleted: this.currentStep,
                reason: 'stopped_by_user',
                // Добавляем информацию о текущем состоянии для совместимости
                finalState: this.currentSimulation?.results?.finalState || this.getCurrentStateInfo()?.stateVector,
                isAccepted: false, // При остановке считаем строку отклоненной
                acceptanceProbability: 0
            };
            
            this.completeCallbacks.forEach(callback => {
                try {
                    callback(stopResult);
                } catch (error) {
                    console.error('Ошибка в complete callback при остановке:', error);
                }
            });
        }
    }

    /**
     * Выполняет один шаг в ручном режиме
     * @returns {Object} Информация о выполненном шаге
     */
    step() {
        if (!this.isRunning) {
            throw new Error('Симуляция не запущена');
        }

        // Проверяем что currentSimulation существует
        if (!this.currentSimulation) {
            console.error('currentSimulation is null, initializing...');
            this.currentSimulation = {
                inputString: this.inputString || '',
                startTime: Date.now(),
                steps: [],
                results: null
            };
        }

        // Проверяем не завершена ли симуляция
        if (this.currentSymbolIndex >= this.inputString.length) {
            this.completeSimulation();
            return null;
        }

        // Выполняем шаг
        this.executeSingleStep();
        
        // Если это последний шаг, завершаем симуляцию
        if (this.currentSymbolIndex >= this.inputString.length) {
            this.completeSimulation();
            return null;
        }

        // Возвращаем последний выполненный шаг
        return this.currentSimulation.steps[this.currentSimulation.steps.length - 1];
    }

    /**
     * Сбрасывает симулятор в начальное состояние
     */
    reset() {
        this.stop();
        
        this.isRunning = false;
        this.isPaused = false;
        this.currentStep = 0;
        this.currentSymbolIndex = 0;
        this.inputString = '';
        this.currentSimulation = null;
        
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        
        // Сбрасываем автомат
        if (this.model.currentAutomaton) {
            this.model.currentAutomaton.reset();
        }
    }

    /**
     * Устанавливает скорость симуляции
     * @param {number} speed - Множитель скорости (0.1 - 10)
     */
    setSpeed(speed) {
        this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
        this.stepInterval = Math.max(100, 1000 / this.simulationSpeed); // Минимальный интервал 100мс
    }

    /**
     * Задержка выполнения
     * @param {number} ms - Время задержки в миллисекундах
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => {
            this.animationTimer = setTimeout(resolve, ms);
        });
    }

    /**
     * Обрабатывает ошибки симуляции
     * @param {Error} error - Ошибка
     * @private
     */
    handleError(error) {
        console.error('Ошибка симуляции:', error);
        
        this.isRunning = false;
        this.isPaused = false;
        
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error('Ошибка в error callback:', callbackError);
            }
        });
    }

    /**
     * Устанавливает callback для обновления шага
     * @param {Function} callback - Функция callback
     */
    onStep(callback) {
        if (typeof callback === 'function') {
            this.stepCallbacks.push(callback);
        }
    }

    /**
     * Устанавливает callback для завершения симуляции
     * @param {Function} callback - Функция callback
     */
    onComplete(callback) {
        if (typeof callback === 'function') {
            this.completeCallbacks.push(callback);
        }
    }

    /**
     * Устанавливает callback для ошибок
     * @param {Function} callback - Функция callback
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
        }
    }

    /**
     * Удаляет все callback'и (для очистки)
     */
    clearCallbacks() {
        this.stepCallbacks = [];
        this.completeCallbacks = [];
        this.errorCallbacks = [];
    }

    /**
     * Получает текущий статус симуляции
     * @returns {Object} Объект статуса
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            currentStep: this.currentStep,
            totalSymbols: this.inputString.length,
            currentSymbolIndex: this.currentSymbolIndex,
            currentSymbol: this.currentSymbolIndex < this.inputString.length ? 
                         this.inputString[this.currentSymbolIndex] : null,
            progress: this.inputString.length > 0 ? 
                     (this.currentSymbolIndex / this.inputString.length) * 100 : 0,
            simulationSpeed: this.simulationSpeed
        };
    }

    /**
     * Получает историю текущей симуляции
     * @returns {Array} Массив шагов симуляции
     */
    getSimulationHistory() {
        return this.currentSimulation ? this.currentSimulation.steps : [];
    }

    /**
     * Быстрая симуляция без анимации (для отладки)
     * @param {string} inputString - Входная строка
     * @returns {Object} Результаты симуляции
     */
    quickSimulate(inputString) {
        this.reset();
        
        if (!this.model.currentAutomaton) {
            throw new Error('Нет активного автомата');
        }

        // Используем модель для быстрой симуляции
        return this.model.simulate(inputString);
    }

    /**
     * Проверяет возможность симуляции
     * @returns {boolean} true если симуляция возможна
     */
    canSimulate() {
        if (!this.model.currentAutomaton) {
            return false;
        }
        
        if (this.isRunning) {
            return false;
        }
        
        // Проверяем что автомат имеет состояния и начальное распределение
        const automaton = this.model.currentAutomaton;
        const hasStates = automaton.states.size > 0;
        const hasInitialStates = automaton.initialStates.size > 0;
        const hasAlphabet = automaton.alphabet.size > 0;
        
        return hasStates && hasInitialStates && hasAlphabet;
    }

    /**
     * Получает информацию о текущем состоянии автомата
     * @returns {Object} Информация о состоянии
     */
    getCurrentStateInfo() {
        if (!this.model.currentAutomaton) {
            return null;
        }

        try {
            const automaton = this.model.currentAutomaton;
            const currentState = automaton.currentState;
            
            return {
                stateVector: currentState.clone(),
                mostProbableState: currentState.getMostProbableState(),
                isValid: currentState.isValid(),
                states: currentState.getStates().map(stateId => ({
                    id: stateId,
                    probability: currentState.getProbability(stateId),
                    isFinal: automaton.finalStates.has(stateId)
                }))
            };
        } catch (error) {
            console.error('Ошибка получения информации о состоянии:', error);
            return null;
        }
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutomataSimulator };
} else {
    window.AutomataSimulator = AutomataSimulator;
}