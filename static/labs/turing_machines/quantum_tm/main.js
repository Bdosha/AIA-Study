class QuantumTuringApp {
    constructor() {
        this.simulator = null;
        this.isRunning = false;
        this.currentTask = 1;
        this.animationInterval = null;
        this.taskManager = null;
        this.quantumState = {
            amplitudes: {},
            currentStates: []
        };

        
        this.initializeApp();
    }

    initializeApp() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===');
        
        this.initializeEventListeners();
        this.initializeSimulator();
        this.initializeTransitionEditor(); 
        //this.initializeAlgorithms();
        this.updateDisplay();

        setTimeout(() => {
            this.checkUnitarityAndUpdateIndicator();
        }, 500);
        
        console.log('✅ Приложение инициализировано');
    }

    // initializeAlgorithms() {
    //     console.log('=== ИНИЦИАЛИЗАЦИЯ АЛГОРИТМОВ ===');
        
    //     // Создаем контейнер для алгоритмов
    //     const algorithmsContainer = document.getElementById('algorithms-container') || this.createAlgorithmsContainer();
        
    //     // Инициализируем алгоритм Дойча-Йожи
    //     this.deutschJozsa = new DeutschJozsaAlgorithm(this.simulator);
    //     this.deutschJozsa.initializeInterface(algorithmsContainer);
        
    //     console.log('✅ Алгоритм Дойча-Йожи инициализирован');
    // }

    createAlgorithmsContainer() {
        const container = document.createElement('div');
        container.id = 'algorithms-container';
        // Добавляем в правую панель
        const rightPanel = document.querySelector('.info-panel') || document.querySelector('.tasks-panel');
        if (rightPanel) {
            rightPanel.appendChild(container);
        }
        return container;
    }

    initializeEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startSimulation();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopSimulation();
        });

        document.getElementById('step-btn').addEventListener('click', () => {
            this.stepSimulation();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSimulation();
        });
        
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            const speed = 1000 - (e.target.value * 9);
            this.simulator.speed = speed;
            
            // Обновляем интервал если симуляция запущена
            if (this.isRunning) {
                this.stopSimulation();
                this.startSimulation();
            }
            console.log(`🎚️ Скорость установлена: ${e.target.value} (${speed}ms)`);
        });

        const themeButton = document.getElementById('theme-toggle');
        if (themeButton) {
            themeButton.addEventListener('click', () => {
                this.toggleTheme();
            });
            console.log('✅ Обработчик темы добавлен');
        } else {
            console.error('❌ Кнопка темы не найдена');
        }

        document.getElementById('batch-run-btn')?.addEventListener('click', () => {
            this.runMultipleSimulations(100);
        });

    }
    

    initializeSimulator() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ СИМУЛЯТОРА ===');
    
        this.quantumTape = new QuantumTape();
        this.quantumState = new QuantumState(); // 🔥 ДОБАВЛЯЕМ QuantumState
        this.tapeVisualizer = new TapeVisualizer('tape-display');
        
        this.simulator = {
            currentStep: 0,
            speed: 500,
            availableStates: ['q0', 'q1', 'q2', 'q3', 'q4', 'q_acc', 'm_z0', 'm_z1', 'm_x0', 'm_x1'],
            finalState: 'q_acc',
            initialState: 'q0',
            quantumTape: this.quantumTape,
            quantumState: this.quantumState, // 🔥 ДОБАВЛЯЕМ
            stateVector: '|ψ⟩ = 1.000|q0⟩',
            probabilities: [{state: 'q0', percentage: '100.00'}],
            dominantState: '|q0⟩',
            currentState: 'q0',
            hasSuperpositionSetup: false,
            currentTransitions: [],

            convertToStandardFormat: function(state) {
                const mapping = {
                    'q₀': 'q0', 'q₁': 'q1', 'q₂': 'q2', 'q₃': 'q3',
                    'q0': 'q0', 'q1': 'q1', 'q2': 'q2', 'q3': 'q3',
                    'q_acc': 'q_acc'
                };
                return mapping[state] || state;
            },

            executeStep: function() {
                console.log('=== ВЫПОЛНЕНИЕ ШАГА ===');
                
                if (!this.quantumTape || !this.quantumState) {
                    console.error('❌ quantumTape или quantumState не определены');
                    return false;
                }

                // 🔥 ПРОВЕРЯЕМ: если в переходах есть суперпозиция (несколько переходов из одного состояния)
                const currentSuperposition = this.quantumState.getSuperposition();
                const hasSuperpositionInTransitions = this.checkForSuperpositionTransitions();
                
                if (currentSuperposition.length > 1 || hasSuperpositionInTransitions) {
                    console.log('🔮 Используем квантовую логику (суперпозиция)');
                    return this.executeQuantumStep();
                } else {
                    console.log('⚡ Используем классическую логику');
                    return this.executeClassicalStep();
                }
            },

            // 🔥 МЕТОД ДЛЯ ОПРЕДЕЛЕНИЯ СУПЕРПОЗИЦИИ В ПЕРЕХОДАХ
            checkForSuperpositionTransitions: function() {
                const transitions = this.currentTransitions || [];
                const currentSuperposition = this.quantumState.getSuperposition();
                
                // Проверяем, есть ли несколько переходов из текущего состояния
                for (const branch of currentSuperposition) {
                    const currentSymbol = this.quantumTape.read();
                    const transitionsFromState = transitions.filter(t => 
                        t.fromState === branch.state && t.readSymbol === currentSymbol
                    );
                    
                    // Если есть несколько переходов с ненулевыми амплитудами - это суперпозиция
                    const validTransitions = transitionsFromState.filter(t => 
                        Math.abs(parseFloat(t.amplitude)) > 0.1
                    );
                    
                    if (validTransitions.length > 1) {
                        console.log(`🎯 Обнаружена суперпозиция: ${validTransitions.length} переходов из ${branch.state}`);
                        return true;
                    }
                }
                
                return false;
            },

            // 🔥 КЛАССИЧЕСКАЯ ЛОГИКА (ВАША РАБОЧАЯ ВЕРСИЯ)
            executeClassicalStep: function() {
                const currentState = this.currentState;
                const currentSymbol = this.quantumTape.read();
                const transitions = this.currentTransitions || [];

                console.log('🔍 Поиск перехода для:', currentState, 'с символом:', currentSymbol);
                
                // Проверяем конечное состояние
                if (currentState === this.finalState || currentState === 'q_acc') {
                    console.log('🎉 Достигнуто конечное состояние:', currentState);
                    if (window.app && window.app.showCompletionMessage) {
                        window.app.showCompletionMessage(currentState, currentSymbol, true);
                    }
                    return false;  // Завершаем выполнение НЕМЕДЛЕННО
                }

                // // Проверяем конечное состояние
                // if (currentState === this.finalState) {
                //     console.log('🎉 Достигнуто конечное состояние');
                //     if (window.app && window.app.showCompletionMessage) {
                //         window.app.showCompletionMessage(currentState, currentSymbol, true);
                //     }
                //     return false;
                // }

                // Ищем переходы
                const applicableTransitions = transitions.filter(t => 
                    t.fromState === currentState && t.readSymbol === currentSymbol
                );

                console.log('✅ Найдено переходов:', applicableTransitions.length);

                if (applicableTransitions.length === 0) {
                    console.log(`🚫 ОШИБКА: нет перехода для ${currentState}, ${currentSymbol}`);
                    if (window.app && window.app.showExecutionError) {
                        window.app.showExecutionError(currentState, currentSymbol);
                    }
                    return false;
                }

                const selectedTransition = applicableTransitions[0];
                console.log('🎯 Выполняем переход:', selectedTransition);

                // Очищаем сообщения
                if (window.app && window.app.clearMessages) {
                    window.app.clearMessages();
                }
                
                // 🔥 ОБНОВЛЯЕМ КВАНТОВОЕ СОСТОЯНИЕ (для совместимости)
                this.quantumState.setSuperposition([{
                    state: selectedTransition.toState,
                    amplitude: 1.0,
                    headPosition: 0
                }]);

                // ВЫПОЛНЯЕМ ПЕРЕХОД
                this.currentState = selectedTransition.toState;
                this.stateVector = `|ψ⟩ = 1.000|${this.currentState}⟩`;
                this.probabilities = [{state: this.currentState, percentage: '100.00'}];
                this.dominantState = `|${this.currentState}⟩`;

                // 🔥 РАБОТА С ЛЕНТОЙ (ваша рабочая версия)
                if (selectedTransition.writeSymbol && selectedTransition.writeSymbol !== '') {
                    console.log('✏️ Запись на ленту:', selectedTransition.writeSymbol);
                    this.quantumTape.write(selectedTransition.writeSymbol);
                }
                
                if (selectedTransition.action === 'L') {
                    this.quantumTape.move('L');
                } else if (selectedTransition.action === 'R') {
                    this.quantumTape.move('R');
                }

                this.currentStep++;
                
                // Проверяем конечное состояние после перехода
                if (this.currentState === this.finalState) {
                    console.log('🎉 УСПЕШНОЕ ЗАВЕРШЕНИЕ');
                    if (window.app && window.app.showCompletionMessage) {
                        window.app.showCompletionMessage(this.currentState, this.quantumTape.read(), true);
                    }
                    return false;
                }
                
                console.log('✅ Шаг выполнен. Новое состояние:', this.currentState);
                return true;
            },

            // 🔥 КВАНТОВАЯ ЛОГИКА (только для суперпозиции)
            executeQuantumStep: function() {
                const transitions = this.currentTransitions || [];
                const currentSuperposition = this.quantumState.getSuperposition();
                
                console.log('🔮 Квантовая суперпозиция:', currentSuperposition);

                const hasFinalState = currentSuperposition.some(branch => 
                    branch.state === 'q_acc' || branch.state === this.finalState
                );
                
                if (hasFinalState) {
                    console.log('🎉 Обнаружено конечное состояние в суперпозиции');
                    return false;
                }

                // Собираем все возможные переходы
                const allNewBranches = [];
                let hasValidTransitions = false;

                currentSuperposition.forEach(branch => {
                    const currentSymbol = this.quantumTape.read();
                    const applicableTransitions = transitions.filter(t => 
                        t.fromState === branch.state && t.readSymbol === currentSymbol
                    );

                    console.log(`🔍 Из состояния ${branch.state} найдено переходов:`, applicableTransitions.length);

                    if (applicableTransitions.length > 0) {
                        hasValidTransitions = true;
                    }

                    applicableTransitions.forEach(transition => {
                        const newAmplitude = parseFloat(branch.amplitude) * parseFloat(transition.amplitude);
                        
                        // 🔥 ФИЛЬТРУЕМ переходы с нулевой амплитудой
                        if (Math.abs(newAmplitude) > 0.001) {
                            allNewBranches.push({
                                state: transition.toState,
                                amplitude: newAmplitude,
                                writeSymbol: transition.writeSymbol,
                                action: transition.action,
                                fromState: branch.state
                            });
                            
                            console.log(`📊 Переход: ${branch.state} → ${transition.toState}, Амплитуда: ${newAmplitude}`);
                        }
                    });
                });

                console.log('🎯 Всего новых веток после переходов:', allNewBranches.length);

                if (!hasValidTransitions) {
                    const currentStatesList = currentSuperposition.map(s => s.state).join(', ');
                    console.log(`🚫 ОШИБКА: нет переходов для состояний [${currentStatesList}]`);
                    if (window.app && window.app.showExecutionError) {
                        window.app.showExecutionError(currentStatesList, this.quantumTape.read());
                    }
                    return false;
                }

                // Очищаем сообщения
                if (window.app && window.app.clearMessages) {
                    window.app.clearMessages();
                }

                // 🔥 РАБОТА С ЛЕНТОЙ (только для первой ветки - упрощенно)
                const firstBranch = allNewBranches[0];
                if (firstBranch.writeSymbol && firstBranch.writeSymbol !== '') {
                    console.log('✏️ Запись на ленту (квантовая):', firstBranch.writeSymbol);
                    this.quantumTape.write(firstBranch.writeSymbol);
                }

                if (firstBranch.action === 'L') {
                    this.quantumTape.move('L');
                } else if (firstBranch.action === 'R') {
                    this.quantumTape.move('R');
                }

                // 🔥 ОБНОВЛЯЕМ СУПЕРПОЗИЦИЮ С НОВЫМИ ВЕТКАМИ
                const newSuperposition = allNewBranches.map(branch => ({
                    state: branch.state,
                    amplitude: branch.amplitude,
                    headPosition: 0
                }));

                console.log('🔄 Новая суперпозиция:', newSuperposition);
                this.quantumState.setSuperposition(newSuperposition);

                // 🔥 ПРОВЕРЯЕМ И ВЫПОЛНЯЕМ КОЛЛАПС ПРИ ИЗМЕРЕНИИ
                const isMeasurementTransition = allNewBranches.some(branch => 
                    branch.state.startsWith('m_z') || branch.state.startsWith('m_x')
                );

                if (isMeasurementTransition && newSuperposition.length > 1) {
                    console.log('🎯 ВЫПОЛНЕНИЕ КВАНТОВОГО ИЗМЕРЕНИЯ - КОЛЛАПС');
                    const measurementResult = this.quantumState.measure();
                    console.log('📏 Результат измерения:', measurementResult.state);

                    if (measurementResult && measurementResult.state) {
                        // 🔥 Создаем измеренное состояние q_m_0 или q_m_1
                        const measuredSymbol = this.quantumTape.read(); 
                        const measuredState = measuredSymbol === '1' ? 'q_m_1' : 'q_m_0';
                        
                        this.quantumState.setSuperposition([{
                            state: measuredState,
                            amplitude: 1.0,
                            headPosition: 0
                        }]);

                        this.stateVector = `|ψ⟩ = 1.000|${measuredState}⟩`;
                        this.probabilities = [{state: measuredState, percentage: '100.00'}];
                        this.currentState = measuredState;
                        this.dominantState = `|${measuredState}⟩`;

                        console.log(`📏 Измерение завершено: коллапс в состояние ${measuredState}`);
                    }

                    
                    // 🔥 ОБНОВЛЯЕМ ДАННЫЕ ПОСЛЕ КОЛЛАПСА
                    this.stateVector = this.quantumState.getStateVector();
                    this.probabilities = this.quantumState.getProbabilities();
                    this.dominantState = `|${measurementResult.state}⟩`;
                    this.currentState = measurementResult.state;
                } else {
                    // 🔥 ОБНОВЛЯЕМ ОТОБРАЖАЕМЫЕ ДАННЫЕ (если не было коллапса)
                    this.stateVector = this.quantumState.getStateVector();
                    this.probabilities = this.quantumState.getProbabilities();
                    
                    if (newSuperposition.length === 1) {
                        this.dominantState = `|${newSuperposition[0].state}⟩`;
                        this.currentState = newSuperposition[0].state;
                    } else {
                        this.dominantState = `Суперпозиция (${newSuperposition.length} состояний)`;
                        this.currentState = 'superposition';
                    }
                }

                this.currentStep++;

                // Проверяем завершение
                const allFinal = newSuperposition.every(branch => branch.state === this.finalState);
                if (allFinal && newSuperposition.length > 0) {
                    console.log('🎉 УСПЕШНОЕ ЗАВЕРШЕНИЕ (квантовое)');
                    if (window.app && window.app.showCompletionMessage) {
                        window.app.showCompletionMessage('q_acc (суперпозиция)', this.quantumTape.read(), true);
                    }
                    return false;
                }

                console.log('✅ Квантовый шаг выполнен');
                console.log('📊 Вектор состояния:', this.stateVector);
                console.log('🎲 Вероятности:', this.probabilities);
                return true;
            },

            // 🔥 ОБНОВЛЯЕМ МЕТОД getCurrentState ДЛЯ ИСПОЛЬЗОВАНИЯ QUANTUMSTATE
            getCurrentState: function() {
                if (!this.quantumTape || !this.quantumState) {
                    return {
                        stateVector: '|ψ⟩ = 1.000|q0⟩',
                        probabilities: [{state: 'q0', percentage: '100.00'}],
                        tape: '[0] 0 0 0',
                        dominantState: '|q0⟩',
                        step: this.currentStep || 0,
                        currentState: 'q0',
                        quantumTape: null
                    };
                }
                
                const superposition = this.quantumState.getSuperposition();
                const currentState = superposition.length === 1 ? superposition[0].state : 'superposition';
                
                return {
                    stateVector: this.quantumState.getStateVector(),
                    probabilities: this.quantumState.getProbabilities(),
                    tape: this.quantumTape.toString(),
                    dominantState: this.dominantState || '|q0⟩',
                    step: this.currentStep,
                    currentState: currentState,
                    quantumTape: this.quantumTape,
                    quantumState: this.quantumState
                };
            },

            // 🔥 ОБНОВЛЯЕМ МЕТОД reset
            reset: function() {
                console.log('simulator.reset() вызван');
                this.currentStep = 0;
                
                if (this.quantumState) {
                    this.quantumState.reset();
                }
                
                this.stateVector = this.quantumState.getStateVector();
                this.probabilities = this.quantumState.getProbabilities();
                this.dominantState = '|q0⟩';
                this.currentState = 'q0';
                this.hasSuperpositionSetup = false;
                
                if (this.quantumTape) {
                    this.quantumTape.reset();
                }
            },

            setSpeed: function(speed) {
                this.speed = 1000 - speed * 10;
            }
        };
        
        // Первоначальная отрисовка ленты
        this.tapeVisualizer.render(this.quantumTape);
        console.log('✅ Симулятор инициализирован с лентой:', this.quantumTape.toString());
    }

    initializeTransitionEditor() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ РЕДАКТОРА ПЕРЕХОДОВ ===');
        
        // Инициализируем редактор переходов
        if (typeof window.transitionEditor !== 'undefined') {
            const editorContainer = document.getElementById('transition-editor-container');
            if (editorContainer) {
                editorContainer.innerHTML = window.transitionEditor.render();
                
                // ОБНОВЛЯЕМ: добавляем обработчик изменений переходов
                window.transitionEditor.onTransitionsChange = (transitions) => {
                    this.onTransitionsChange(transitions);
                };
                
                console.log('✅ Редактор переходов инициализирован');
            } else {
                console.error('❌ Контейнер transition-editor-container не найден');
            }
        } else {
            console.error('❌ TransitionEditor не найден');
            this.createFallbackTransitionEditor();
        }
    }

    // СОЗДАЕМ ЗАГЛУШКУ ЕСЛИ TransitionEditor НЕ ЗАГРУЗИЛСЯ
    createFallbackTransitionEditor() {
        const editorContainer = document.getElementById('transition-editor-container');
        if (editorContainer) {
            editorContainer.innerHTML = `
                <div class="transition-editor">
                    <div class="editor-header">
                        <button class="add-rule-btn" onclick="app.addFallbackTransition()">
                            ＋ Добавить правило
                        </button>
                    </div>
                    <div class="empty-state">
                        <p>Редактор переходов не загружен</p>
                        <p>Обновите страницу</p>
                    </div>
                </div>
            `;
        }
    }

    addFallbackTransition() {
        alert('Редактор переходов не загружен. Обновите страницу.');
    }

    getCurrentTransitions() {
        if (window.transitionEditor && typeof window.transitionEditor.getTransitionsForSimulator === 'function') {
            return window.transitionEditor.getTransitionsForSimulator();
        }
        return this.simulator.currentTransitions || [];
    }

    // ================== УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ ================== //

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-theme');
        const themeButton = document.getElementById('theme-toggle');
        
        if (isDark) {
            body.classList.replace('dark-theme', 'light-theme');
            themeButton.textContent = '🌙 Тёмная тема';
        } else {
            body.classList.replace('light-theme', 'dark-theme');
            themeButton.textContent = '☀️ Светлая тема';
        }
    }

    startSimulation() {
        // 🔥 ПРОВЕРКА ТАБЛИЦЫ ПЕРЕХОДОВ ПЕРЕД ЗАПУСКОМ
        const errors = this.validateTransitionTable();
        if (errors.length > 0) {
            console.log('❌ Ошибки валидации, симуляция не запущена:', errors);
            this.showTransitionErrors(errors);
            return; // Не запускаем симуляцию
        }

        // Очищаем ошибки если все хорошо
        this.clearTransitionErrors();
        
        if (!this.isRunning) {
            this.clearExecutionError();
            this.isRunning = true;
            document.getElementById('start-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            document.getElementById('step-btn').disabled = true;

            console.log('▶ Запуск автоматического выполнения');
            
            this.animationInterval = setInterval(() => {
                if (this.isRunning) {
                    const shouldContinue = this.simulator.executeStep();
                    this.updateDisplay();
                    
                    if (!shouldContinue) {
                        this.stopSimulation();
                        console.log('🏁 Выполнение завершено');
                    }
                }
            }, this.simulator.speed);
        }
    }

    shouldStopSimulation() {
        const currentState = this.simulator.currentState;
        const currentSymbol = this.simulator.quantumTape.read();
        const transitions = this.simulator.currentTransitions || [];
        
        console.log(`🔍 Проверка остановки: состояние=${currentState}, символ=${currentSymbol}`);
        
        // Если достигли конечного состояния измерения
        if (currentState.startsWith('m_') || currentState.includes('m_z') || currentState.includes('m_x')) {
            console.log('🏁 Достигнуто конечное состояние измерения');
            return true;
        }
        
        // Если нет переходов для текущего состояния и символа
        const applicableTransitions = transitions.filter(t => {
            const fromStateMatch = t.fromState === currentState || 
                                this.simulator.convertState(t.fromState) === currentState;
            const readSymbolMatch = t.readSymbol === currentSymbol;
            return fromStateMatch && readSymbolMatch;
        });
        
        if (applicableTransitions.length === 0) {
            console.log('🏁 Нет подходящих переходов для текущего состояния');
            return true;
        }
        
        // Защита от бесконечного цикла
        if (this.simulator.currentStep > 50) {
            console.warn('⚠️ Превышено максимальное количество шагов (50)');
            return true;
        }
        
        return false;
    }

    stopSimulation() {
        this.isRunning = false;
        
        // 🔥 НАДЕЖНОЕ ОТКЛЮЧЕНИЕ КНОПОК
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const stepBtn = document.getElementById('step-btn');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (stepBtn) stepBtn.disabled = false;
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        console.log('⏹️ Выполнение остановлено');
    }

    stepSimulation() {
        if (!this.isRunning) {
            // Очищаем предыдущие ошибки
            this.clearExecutionError();
            
            console.log('↷ Выполнение одного шага');
            const shouldContinue = this.simulator.executeStep();
            this.updateDisplay();
            
            if (!shouldContinue) {
                console.log('✅ Шаг выполнен');
            }
        }
    }

    validateTransitionTable() {
        const transitions = this.simulator.currentTransitions || [];
        const errors = [];

        console.log('🔍 Валидация таблицы переходов:', transitions);

        // 1. Проверка на пустую таблицу
        if (transitions.length === 0) {
            errors.push('❌ Таблица переходов пуста');
            errors.push('Добавьте правила перехода через редактор');
            return errors;
        }

        // 2. Проверка начального состояния q0
        const hasQ0Start = transitions.some(t => 
            (t.fromState === 'q0' || t.fromState === 'q₀') && t.readSymbol === '0'
        );
        
        if (!hasQ0Start) {
            errors.push('❌ Таблица должна начинаться с перехода из q₀ с символом 0');
            errors.push('Пример: q₀ 0 → q₁ 1 R 1.0');
        }

        // 3. Проверка конечного состояния q_acc
        const hasFinalState = transitions.some(t => 
            t.toState === 'q_acc'
        );
        
        if (!hasFinalState) {
            errors.push('❌ Таблица должна содержать конечное состояние q_acc');
            errors.push('Пример: q₁ 0 → q_acc 0 N 1.0');
        }

        // 4. Проверка корректности отдельных правил
        transitions.forEach((transition, index) => {
            const ruleNum = index + 1;
            let ruleErrors = [];

            // Проверка амплитуды
            const amp = parseFloat(transition.amplitude);
            if (isNaN(amp) || amp < -1 || amp > 1) {
                ruleErrors.push(`амплитуда ${transition.amplitude} не в диапазоне [-1, 1]`);
            }

            // Проверка состояний
            const validStates = ['q0', 'q1', 'q2', 'q3', 'q4', 'q₀', 'q₁', 'q₂', 'q₃', 'm_z0', 'm_z1', 'm_x0', 'm_x1', 'q_acc'];
            if (!validStates.includes(transition.fromState)) {
                ruleErrors.push(`неверное исходное состояние: ${transition.fromState}`);
            }
            if (!validStates.includes(transition.toState)) {
                ruleErrors.push(`неверное целевое состояние: ${transition.toState}`);
            }

            // Проверка символов
            if (!['0', '1'].includes(transition.readSymbol)) {
                ruleErrors.push(`неверный читаемый символ: ${transition.readSymbol}`);
            }
            if (transition.writeSymbol && !['0', '1'].includes(transition.writeSymbol)) {
                ruleErrors.push(`неверный записываемый символ: ${transition.writeSymbol}`);
            }

            // Проверка действий
            if (transition.action && !['L', 'R', 'N'].includes(transition.action.toUpperCase())) {
                ruleErrors.push(`неверное действие: ${transition.action}`);
            }

            // Добавляем ошибки правила в общий список
            if (ruleErrors.length > 0) {
                errors.push(`Правило ${ruleNum} (${transition.fromState} ${transition.readSymbol} → ${transition.toState}): ${ruleErrors.join(', ')}`);
            }
        });

        // 5. Проверка достижимости конечного состояния
        if (hasFinalState) {
            const canReachFinal = this.canReachFinalState(transitions);
            if (!canReachFinal) {
                errors.push('⚠️ Конечное состояние q_acc недостижимо из начального состояния');
            }
        }

        // 6. Проверка унитарности (только если нет критических ошибок)
        if (errors.length === 0) {
            const unitarityErrors = this.checkUnitarity();
            if (unitarityErrors.length > 0) {
                errors.push('❌ Нарушение унитарности преобразований:');
                errors.push(...unitarityErrors);
            }
        }

        return errors;
    }

    canReachFinalState(transitions) {
        const visited = new Set();
        const stack = ['q0'];
        
        while (stack.length > 0) {
            const currentState = stack.pop();
            
            if (currentState === 'q_acc') {
                return true;
            }
            
            if (!visited.has(currentState)) {
                visited.add(currentState);
                
                // Находим все переходы из текущего состояния
                const outgoingTransitions = transitions.filter(t => 
                    t.fromState === currentState || this.simulator.convertToStandardFormat(t.fromState) === currentState
                );
                
                // Добавляем целевые состояния в стек
                outgoingTransitions.forEach(t => {
                    const nextState = this.simulator.convertToStandardFormat(t.toState);
                    if (!visited.has(nextState)) {
                        stack.push(nextState);
                    }
                });
            }
        }
        
        return false;
    }

    analyzeReachability() {
        const transitions = this.simulator.currentTransitions || [];
        const visited = new Set();
        const stack = ['q0'];
        const reachable = new Set(['q0']);

        while (stack.length > 0) {
            const state = stack.pop();
            const outgoing = transitions.filter(t => 
                t.fromState === state || this.simulator.convertToStandardFormat(t.fromState) === state
            );
            for (const t of outgoing) {
                const next = this.simulator.convertToStandardFormat(t.toState);
                if (!visited.has(next)) {
                    visited.add(next);
                    reachable.add(next);
                    stack.push(next);
                }
            }
        }

        const allStates = [...new Set(transitions.map(t => this.simulator.convertToStandardFormat(t.fromState)))];
        const unreachable = allStates.filter(s => !reachable.has(s));

        console.log('🌐 Достижимые состояния:', [...reachable]);
        console.log('🚫 Недостижимые состояния:', unreachable);

        return { reachable, unreachable };
    }


    enableControls() {
        try {
            const startBtn = document.getElementById('start-btn');
            const stepBtn = document.getElementById('step-btn');
            const stopBtn = document.getElementById('stop-btn');
            
            if (startBtn) startBtn.disabled = false;
            if (stepBtn) stepBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        } catch (error) {
            console.error('❌ Ошибка при включении контролов:', error);
        }
    }

    disableControls() {
        try {
            const startBtn = document.getElementById('start-btn');
            const stepBtn = document.getElementById('step-btn');
            const stopBtn = document.getElementById('stop-btn');
            
            if (startBtn) startBtn.disabled = true;
            if (stepBtn) stepBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } catch (error) {
            console.error('❌ Ошибка при отключении контролов:', error);
        }
    }

    runMultipleSimulations(n = 100) {
        const results = { q_m_0: 0, q_m_1: 0, q_acc: 0, other: 0 };

        for (let i = 0; i < n; i++) {
            this.simulator.reset();
            let ok = true;
            let steps = 0;
            let measuredState = null;

            while (ok && steps < 1000) {
                ok = this.simulator.executeStep();
                steps++;
                
                // Фиксируем состояние измерения, когда входим в m_z0 или m_z1
                if (this.simulator.currentState === 'q_m_0' || this.simulator.currentState === 'm_z0') {
                    measuredState = 'q_m_0';
                    // Не прерываем сразу - даем возможность выполнить переходы
                } else if (this.simulator.currentState === 'q_m_1' || this.simulator.currentState === 'm_z1') {
                    measuredState = 'q_m_1';
                    // Не прерываем сразу - даем возможность выполнить переходы
                }
                
                // Прерываем, когда достигли акцепторного состояния
                if (this.simulator.currentState === 'q_acc') {
                    break;
                }
            }

            // Используем зафиксированное состояние измерения или текущее состояние
            const final = measuredState || this.simulator.currentState;

            if (!final) results.other++;
            else if (final === 'q_m_0' || final === 'm_z0') results.q_m_0++;
            else if (final === 'q_m_1' || final === 'm_z1') results.q_m_1++;
            else if (final === 'q_acc') results.q_acc++;
            else results.other++;
        }

        // Вычисляем проценты
        const q0p = (results.q_m_0 / n * 100).toFixed(1);
        const q1p = (results.q_m_1 / n * 100).toFixed(1);
        const accp = (results.q_acc / n * 100).toFixed(1);
        const otherp = (results.other / n * 100).toFixed(1);

        console.log('📊 Итоги пакетного запуска:', { q0p, q1p, accp, otherp });

        // 🔥 Вместо alert — добавляем данные в центральную панель
        const centralPanel = document.getElementById('probabilities') || document.querySelector('.main-panel');

        if (centralPanel) {
            let resultContainer = document.getElementById('batch-results');
            if (!resultContainer) {
                resultContainer = document.createElement('div');
                resultContainer.id = 'batch-results';
                centralPanel.appendChild(resultContainer);
            }

            resultContainer.innerHTML = `
                <h4 style="margin-top: 12px;">📦 Результаты пакетного запуска (${n} прогонов):</h4>
                <div>Состояние m_z0: ${q0p}%</div>
                <div>Состояние m_z1: ${q1p}%</div>
                <div>Финальное q_acc: ${accp}%</div>
                <div>Прочие: ${otherp}%</div>
            `;
        } else {
            alert(
                `📊 Итоги ${n} прогонов:\n` +
                `m_z0: ${q0p}%\n` +
                `m_z1: ${q1p}%\n` +
                `q_acc: ${accp}%\n` +
                `Прочие: ${otherp}%`
            );
        }
    }



    showExecutionError(currentState, currentSymbol) {
        console.log(`🚫 Показ ошибки выполнения: нет перехода для ${currentState}, ${currentSymbol}`);
        
        // 🔥 ИЩЕМ ПРАВУЮ ПАНЕЛЬ ДЛЯ ОШИБОК ВЫПОЛНЕНИЯ
        const rightPanel = document.getElementById('tasks-panel') || 
                        document.getElementById('info-panel') ||
                        document.getElementById('right-panel') ||
                        document.querySelector('.tasks-panel') ||
                        document.querySelector('.info-panel') ||
                        document.querySelector('.right-panel');
        
        if (!rightPanel) {
            console.error('❌ Правая панель не найдена для показа ошибок выполнения');
            return;
        }

        console.log('✅ Найдена правая панель для ошибок выполнения:', rightPanel);

        // Создаем или обновляем контейнер ошибок выполнения
        let errorContainer = document.getElementById('execution-error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'execution-error-container';
            // Вставляем в начало правой панели
            rightPanel.insertBefore(errorContainer, rightPanel.firstChild);
        }

        errorContainer.innerHTML = `
            <div class="execution-error" style="
                background: #fef2f2;
                border: 2px solid #ef4444;
                border-radius: 8px;
                padding: 16px;
                margin: 10px 0;
                color: #dc2626;
            ">
                <div class="error-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 18px;">🚫</span>
                    <h4 style="margin: 0; color: #dc2626;">Ошибка выполнения</h4>
                </div>
                <div class="error-message" style="margin-bottom: 12px; font-size: 14px;">
                    Нет перехода для состояния <strong>${currentState}</strong> с символом <strong>${currentSymbol}</strong>
                </div>
                <div class="error-solution" style="font-size: 13px;">
                    <p style="margin: 0 0 8px 0; font-weight: bold;">Что делать:</p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Добавьте переход в таблицу для состояния ${currentState} и символа ${currentSymbol}</li>
                        <li>Или измените существующие переходы</li>
                        <li>Нажмите "Сброс" чтобы начать заново</li>
                    </ul>
                </div>
            </div>
        `;

        // Прокручиваем к ошибке
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('✅ Ошибка выполнения показана в интерфейсе');
    }

    showCompletionMessage(currentState, currentSymbol, isSuccess = false) {
        console.log(`🏁 Показ сообщения о завершении для ${currentState}, ${currentSymbol}`);
        
        const infoPanel = document.getElementById('info-panel') || 
                        document.getElementById('tasks-panel') ||
                        document.querySelector('.tasks-panel');
        
        if (!infoPanel) return;

        let messageContainer = document.getElementById('completion-message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'completion-message-container';
            infoPanel.insertBefore(messageContainer, infoPanel.firstChild);
        }
        
        if (isSuccess || currentState === 'q_acc') {
            messageContainer.innerHTML = `
                <div class="completion-message success" style="
                    background: #d1fae5;
                    border: 1px solid #10b981;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 10px 0;
                    color: #065f46;
                ">
                    <div class="message-content">
                        <h4 style="margin: 0 0 8px 0; color: #065f46; display: flex; align-items: center; gap: 8px;">
                            <span>🎉</span>
                            <span>Программа успешно выполнена!</span>
                        </h4>
                        <div class="message-text" style="margin-bottom: 12px;">
                            Машина Тьюринга корректно завершила работу в конечном состоянии <strong>${currentState}</strong>
                        </div>
                        <div class="message-help" style="font-size: 14px;">
                            <p style="margin: 0; font-weight: bold;">Все шаги выполнены успешно!</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            messageContainer.innerHTML = `
                <div class="completion-message info" style="
                    background: #dbeafe;
                    border: 1px solid #3b82f6;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 10px 0;
                    color: #1e40af;
                ">
                    <div class="message-content">
                        <h4 style="margin: 0 0 8px 0; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                            <span>🏁</span>
                            <span>Выполнение завершено</span>
                        </h4>
                        <div class="message-text" style="margin-bottom: 12px;">
                            Машина остановлена в состоянии <strong>${currentState}</strong>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    clearMessages() {
        // Очищаем все типы сообщений
        const errorContainer = document.getElementById('execution-error-container');
        if (errorContainer) errorContainer.innerHTML = '';
        
        const completionContainer = document.getElementById('completion-message-container');
        if (completionContainer) completionContainer.innerHTML = '';
    }

    showErrorInPanel(message) {
        // Пробуем разные возможные ID панели
        const infoPanel = document.getElementById('info-panel') || 
                        document.getElementById('tasks-panel') ||
                        document.getElementById('right-panel') ||
                        document.querySelector('.tasks-panel') ||
                        document.querySelector('.info-panel');
        
        if (!infoPanel) {
            console.error('❌ Информационная панель не найдена');
            // Создаем временный контейнер если не нашли панель
            let tempContainer = document.getElementById('execution-error-container');
            if (!tempContainer) {
                tempContainer = document.createElement('div');
                tempContainer.id = 'execution-error-container';
                document.body.appendChild(tempContainer);
            }
            infoPanel = tempContainer;
        }

        // Создаем или обновляем контейнер ошибок
        let errorContainer = document.getElementById('execution-error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'execution-error-container';
            // Вставляем в начало правой панели
            infoPanel.insertBefore(errorContainer, infoPanel.firstChild);
        }
        
        errorContainer.innerHTML = `
            <div class="execution-error">
                <div class="error-content">
                    <h4>🚫 Ошибка выполнения</h4>
                    <div class="error-message">${message}</div>
                    <div class="error-solution">
                        <p><strong>Что делать:</strong></p>
                        <ul>
                            <li>Добавьте недостающий переход в таблицу</li>
                            <li>Или измените существующие переходы</li>
                            <li>Нажмите "Сброс" чтобы начать заново</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    clearExecutionError() {
        const errorContainer = document.getElementById('execution-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = '';
        }
        
        // Также очищаем сообщения о завершении
        const completionContainer = document.getElementById('completion-message-container');
        if (completionContainer) {
            completionContainer.innerHTML = '';
        }
    }

    // Обновите метод showTransitionErrors для поддержки ошибок выполнения
    showTransitionErrors(errors) {
        console.log('🚫 Показ ошибок таблицы переходов:', errors);
        
        // 🔥 ИЩЕМ ПРАВУЮ ПАНЕЛЬ (третью панель)
        const rightPanel = document.getElementById('tasks-panel') || 
                        document.getElementById('info-panel') ||
                        document.getElementById('right-panel') ||
                        document.querySelector('.tasks-panel') ||
                        document.querySelector('.info-panel') ||
                        document.querySelector('.right-panel');
        
        if (!rightPanel) {
            console.error('❌ Правая панель не найдена для показа ошибок');
            // Покажем все возможные элементы для отладки
            const allElements = Array.from(document.querySelectorAll('*'));
            const panels = allElements.filter(el => 
                el.className && (
                    el.className.includes('panel') || 
                    el.className.includes('tasks') ||
                    el.className.includes('info')
                )
            );
            console.log('Найденные панели:', panels);
            return;
        }

        console.log('✅ Найдена правая панель для ошибок:', rightPanel);

        // Создаем или обновляем контейнер ошибок
        let errorContainer = document.getElementById('transition-errors-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'transition-errors-container';
            // Вставляем в начало правой панели
            rightPanel.insertBefore(errorContainer, rightPanel.firstChild);
        }

        if (errors.length > 0) {
            errorContainer.innerHTML = `
                <div class="validation-error" style="
                    background: #fffbeb;
                    border: 2px solid #f59e0b;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 10px 0;
                    color: #92400e;
                ">
                    <div class="error-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <span style="font-size: 18px;">⚠️</span>
                        <h4 style="margin: 0; color: #92400e;">Проверка таблицы переходов</h4>
                    </div>
                    <div class="error-list" style="max-height: 300px; overflow-y: auto;">
                        <ul style="margin: 0; padding-left: 20px;">
                            ${errors.map(error => `<li style="margin-bottom: 8px; font-size: 14px;">${error}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="error-help" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f59e0b; font-size: 13px;">
                        <p style="margin: 0; font-weight: bold; color: #92400e;">Исправьте ошибки перед запуском симуляции</p>
                    </div>
                </div>
            `;
            
            // Прокручиваем к ошибкам
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } else {
            errorContainer.innerHTML = '';
        }
    }

    // Добавьте этот метод для аварийного режима
    emergencyStep() {
        console.log('🆘 Аварийный режим шага активирован');
        
        // Создаем базовую структуру симулятора если её нет
        if (!this.simulator.getCurrentState) {
            this.simulator.getCurrentState = function() {
                return {
                    stateVector: '|ψ⟩ = 1.000|q0⟩',
                    probabilities: [{state: 'q0', percentage: '100.00'}],
                    tape: '[0] 0 0 0',
                    dominantState: '|q0⟩',
                    step: this.currentStep || 0
                };
            };
        }
        
        // Увеличиваем счетчик шагов
        if (!this.simulator.currentStep) this.simulator.currentStep = 0;
        this.simulator.currentStep = (this.simulator.currentStep || 0) + 1;
        
        // Простая демонстрация
        const transitions = this.getCurrentTransitions();
        const hasSuperpositionSetup = transitions.some(t => 
            (t.fromState === 'q0' || t.fromState === 'q₀') && 
            (t.toState === 'q0' || t.toState === 'q₀') &&
            parseFloat(t.amplitude) > 0
        ) && transitions.some(t => 
            (t.fromState === 'q0' || t.fromState === 'q₀') && 
            (t.toState === 'q1' || t.toState === 'q₁') &&
            parseFloat(t.amplitude) > 0
        );
        
        if (hasSuperpositionSetup && this.simulator.currentStep >= 1) {
            this.simulator.stateVector = '|ψ⟩ = 0.707|q₀⟩ + 0.707|q₁⟩';
            this.simulator.probabilities = [
                {state: 'q₀', percentage: '50.00'},
                {state: 'q₁', percentage: '50.00'}
            ];
            this.simulator.dominantState = '|q₀⟩ + |q₁⟩';
            this.simulator.tape = '[0] 0 0 0';
        }
        
        this.updateDisplay();
    }

    resetSimulation() {
        try {
            this.stopSimulation();
            this.simulator.reset();
            this.clearMessages();
            this.enableControls(); // Используем безопасный метод
            this.updateDisplay();
            console.log('↶ Симуляция сброшена');
        } catch (error) {
            console.error('❌ Ошибка при сбросе симуляции:', error);
        }
    }

    setSpeed(value) {
        // Преобразуем значение слайдера (1-100) в интервал (100ms - 1000ms)
        const speed = 1000 - (value * 9); 
        this.simulator.speed = speed;
        
        // Обновляем отображение скорости
        const speedValue = document.getElementById('speed-value');
        if (speedValue) {
            if (value < 33) {
                speedValue.textContent = 'Медленно';
            } else if (value < 66) {
                speedValue.textContent = 'Средне';
            } else {
                speedValue.textContent = 'Быстро';
            }
        }
        
        // Обновляем интервал если симуляция запущена
        if (this.isRunning) {
            this.stopSimulation();
            this.startSimulation();
        }
        
        console.log(`🎚️ Скорость установлена: ${value} (${speed}ms)`);
    }


    // ================== ОБРАБОТКА ПЕРЕХОДОВ ================== //

    onTransitionsChange(transitions) {
        console.log('🔄 Обновление переходов:', transitions);
        
        this.simulator.currentTransitions = transitions;
        
        // 🔥 ПРОВЕРЯЕМ ТАБЛИЦУ ПРИ КАЖДОМ ИЗМЕНЕНИИ
        const errors = this.validateTransitionTable();
        if (errors.length > 0) {
            console.log('❌ Ошибки валидации:', errors);
            this.showTransitionErrors(errors);
        } else {
            console.log('✅ Таблица переходов корректна');
            this.clearTransitionErrors();
        }
        
        // 🔥 ДОБАВЛЯЕМ ПРОВЕРКУ УНИТАРНОСТИ И ОБНОВЛЕНИЕ ИНДИКАТОРА
        this.checkUnitarityAndUpdateIndicator();
        
        this.updateDisplay();
    }

    // 🔥 ДОБАВЛЯЕМ НОВЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ИНДИКАТОРА УНИТАРНОСТИ
    checkUnitarityAndUpdateIndicator() {
        const unitarityErrors = this.checkUnitarity();
        const indicator = document.getElementById('unitarity-indicator');
        
        if (!indicator) {
            console.error('❌ Индикатор унитарности не найден');
            return;
        }
        
        if (unitarityErrors.length === 0) {
            indicator.innerHTML = '[U✓]';
            indicator.style.color = '#10b981'; // зеленый
            indicator.title = 'Унитарность соблюдена';
            console.log('✅ Унитарность соблюдена');
        } else {
            indicator.innerHTML = '[U✗]';
            indicator.style.color = '#ef4444'; // красный
            indicator.title = unitarityErrors.join(', ');
            console.log('❌ Нарушение унитарности:', unitarityErrors);
        }
    }

    clearTransitionErrors() {
        const errorContainer = document.getElementById('transition-errors-container');
        if (errorContainer) {
            errorContainer.innerHTML = '';
        }
    }

    // ДОБАВЬТЕ ЭТОТ МЕТОД ДЛЯ ПРОВЕРКИ ПРАВИЛ
    checkSuperpositionRules(transitions) {
        console.log('🔍 Проверка правил суперпозиции...');
        
        let rule1Found = false;
        let rule2Found = false;

        transitions.forEach((rule, index) => {
            console.log(`Правило ${index + 1}:`, {
                from: rule.fromState,
                to: rule.toState,
                amplitude: rule.amplitude
            });

            // Проверяем правило q₀ → q₀
            if ((rule.fromState === 'q0' || rule.fromState === 'q₀') && 
                (rule.toState === 'q0' || rule.toState === 'q₀') &&
                Math.abs(parseFloat(rule.amplitude) - 0.707) < 0.01) {
                rule1Found = true;
                console.log('✅ Найдено правило q₀ → q₀');
            }

            // Проверяем правило q₀ → q₁  
            if ((rule.fromState === 'q0' || rule.fromState === 'q₀') && 
                (rule.toState === 'q1' || rule.toState === 'q₁') &&
                Math.abs(parseFloat(rule.amplitude) - 0.707) < 0.01) {
                rule2Found = true;
                console.log('✅ Найдено правило q₀ → q₁');
            }
        });

        console.log('Итог проверки:', { rule1Found, rule2Found });
        return rule1Found && rule2Found;
    }

    
    // ДОБАВЬТЕ ЭТОТ МЕТОД
    checkAndApplySuperposition(transitions) {
        console.log('=== ПРОВЕРКА СУПЕРПОЗИЦИИ ===');
        
        // Ищем правила для суперпозиции из q₀
        const rulesFromQ0 = transitions.filter(t => 
            (t.fromState === 'q0' || t.fromState === 'q₀') &&
            t.readSymbol === '0'
        );
        
        console.log('Правила из q₀:', rulesFromQ0);
        
        // Проверяем наличие двух правил с амплитудами ~0.707
        const hasQ0toQ0 = rulesFromQ0.some(t => 
            (t.toState === 'q0' || t.toState === 'q₀') &&
            Math.abs(parseFloat(t.amplitude) - 0.707) < 0.01
        );
        
        const hasQ0toQ1 = rulesFromQ0.some(t => 
            (t.toState === 'q1' || t.toState === 'q₁') &&
            Math.abs(parseFloat(t.amplitude) - 0.707) < 0.01
        );
        
        console.log('hasQ0toQ0:', hasQ0toQ0, 'hasQ0toQ1:', hasQ0toQ1);
        
        if (hasQ0toQ0 && hasQ0toQ1) {
            console.log('✅ Обнаружена корректная суперпозиция!');
            this.simulator.stateVector = '|ψ⟩ = 0.707|q₀⟩ + 0.707|q₁⟩';
            this.simulator.probabilities = [
                {state: 'q₀', percentage: '50.00'},
                {state: 'q₁', percentage: '50.00'}
            ];
            this.simulator.dominantState = '|q₀⟩ + |q₁⟩';
            this.simulator.currentState = 'superposition';
            this.simulator.hasSuperpositionSetup = true;
        } else {
            console.log('❌ Суперпозиция не настроена правильно');
            // Возвращаем в базовое состояние
            this.simulator.stateVector = '|ψ⟩ = 1.000|q₀⟩';
            this.simulator.probabilities = [{state: 'q₀', percentage: '100.00'}];
            this.simulator.dominantState = '|q₀⟩';
            this.simulator.currentState = 'q₀';
            this.simulator.hasSuperpositionSetup = false;
        }
    }

    checkUnitarity() {
        const transitions = this.simulator.currentTransitions || [];
        const errors = [];
        
        // Группируем переходы по (состояние, символ)
        const transitionGroups = {};
        
        transitions.forEach(transition => {
            const key = `${transition.fromState}-${transition.readSymbol}`;
            if (!transitionGroups[key]) {
                transitionGroups[key] = [];
            }
            transitionGroups[key].push(transition);
        });

        // Проверяем сумму квадратов амплитуд для каждой группы
        Object.entries(transitionGroups).forEach(([key, group]) => {
            let sumSquares = 0;
            
            group.forEach(transition => {
                const amplitude = parseFloat(transition.amplitude) || 0;
                sumSquares += amplitude * amplitude;
            });

            // Допуск 0.01 для погрешности вычислений
            if (Math.abs(sumSquares - 1.0) > 0.01 && group.length > 0) {
                const [state, symbol] = key.split('-');
                errors.push(`Нарушение унитарности для состояния ${state} с символом ${symbol}: сумма квадратов амплитуд = ${sumSquares.toFixed(3)} (должна быть 1.000)`);
            }
        });

        return errors;
    }

    // ================== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ================== //

    updateDisplay() {
        console.log('=== ОБНОВЛЕНИЕ ДИСПЛЕЯ ===');
        
        try {
            const state = this.simulator.getCurrentState();
            console.log('📊 Состояние симулятора:', state);
            
            // Обновляем вектор состояния
            const stateVectorElement = document.getElementById('state-vector');
            if (stateVectorElement) {
                stateVectorElement.textContent = state.stateVector;
            }
            
            // 🔥 БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ЛЕНТЫ
            if (this.tapeVisualizer) {
                if (state.quantumTape) {
                    console.log('🎨 Обновление ленты с quantumTape');
                    this.tapeVisualizer.update(state.quantumTape);
                } else {
                    console.log('🎨 Обновление ленты с симулятором quantumTape');
                    this.tapeVisualizer.update(this.simulator.quantumTape);
                }
            }
            
            // Обновляем вероятности
            const probabilitiesDiv = document.getElementById('probabilities');
            if (probabilitiesDiv) {
                probabilitiesDiv.innerHTML = '<h4>Вероятности:</h4>';
                state.probabilities.forEach(prob => {
                    const probElement = document.createElement('div');
                    probElement.textContent = `${prob.state}: ${prob.percentage}%`;
                    probabilitiesDiv.appendChild(probElement);
                });
            }
            
            // Обновляем текущее состояние
            const currentStateElement = document.getElementById('current-state');
            if (currentStateElement) {
                currentStateElement.textContent = `Состояние: ${state.dominantState}`;
            }
            
            console.log('✅ Дисплей обновлен');
            
        } catch (error) {
            console.error('❌ Ошибка при обновлении дисплея:', error);
        }
    }
    

    updateStepCounter(step) {
        const stepCounter = document.getElementById('step-counter');
        if (stepCounter) {
            stepCounter.textContent = `Шаг: ${step || 0}`;
        }
    }
}

// В конце файла, после инициализации приложения
window.addEventListener('error', function(event) {
    console.error('🚫 Глобальная ошибка:', event.error);
});

// Обработка необработанных промисов
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚫 Необработанный промис:', event.reason);
});

// // Инициализация приложения
// document.addEventListener('DOMContentLoaded', () => {
//     window.app = new QuantumTuringApp();
//     console.log('✅ Приложение инициализировано, глобальные функции готовы');
// });

document.addEventListener("DOMContentLoaded", () => {
    window.app = new QuantumTuringApp();
});



