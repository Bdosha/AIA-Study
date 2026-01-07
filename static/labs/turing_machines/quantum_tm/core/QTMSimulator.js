class QTMSimulator {
    constructor() {
        this.quantumState = new QuantumState();
        this.quantumTape = new QuantumTape();
        this.transitionTable = new TransitionTable();
        this.unitaryVerifier = new UnitaryVerifier();
        this.currentStep = 0;
        this.isRunning = false;
    }

    // ОСНОВНОЙ МЕТОД: выполнение одного шага с воздействием на ленту
    executeStep() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        const currentSuperposition = this.quantumState.getSuperposition();
        const newSuperposition = [];
        const tapeOperations = [];

        // Для каждой ветви в суперпозиции
        currentSuperposition.forEach(branch => {
            const { state, amplitude, headPosition } = branch;
            const currentSymbol = this.quantumTape.readCell(headPosition);
            
            // Получаем ВСЕ подходящие переходы (квантовая суперпозиция переходов)
            const transitions = this.transitionTable.getTransitions(state, currentSymbol);
            
            transitions.forEach(transition => {
                const newAmplitude = amplitude * transition.amplitude;
                
                // НОВАЯ ветвь вычисления
                newSuperposition.push({
                    state: transition.newState,
                    amplitude: newAmplitude,
                    headPosition: this.calculateNewPosition(headPosition, transition.moveDirection)
                });
                
                // ЗАПИСЫВАЕМ операцию с лентой
                tapeOperations.push({
                    position: headPosition,
                    writeSymbol: transition.writeSymbol,
                    amplitude: newAmplitude,
                    state: transition.newState
                });
            });
        });

        // ПРИМЕНЯЕМ ИЗМЕНЕНИЯ К ЛЕНТЕ
        this.applyTapeOperations(tapeOperations);
        
        // Обновляем состояние
        this.quantumState.setSuperposition(newSuperposition);
        this.currentStep++;
        this.isRunning = false;
        
        return newSuperposition;
    }

    applyTapeOperations(operations) {
        // Группируем операции по позициям на ленте
        const operationsByPosition = {};
        
        operations.forEach(op => {
            const pos = op.position;
            if (!operationsByPosition[pos]) {
                operationsByPosition[pos] = [];
            }
            operationsByPosition[pos].push(op);
        });

        // Применяем операции к каждой позиции ленты
        Object.keys(operationsByPosition).forEach(position => {
            const pos = parseInt(position);
            const symbolAmplitudes = {};
            
            operationsByPosition[pos].forEach(op => {
                if (!symbolAmplitudes[op.writeSymbol]) {
                    symbolAmplitudes[op.writeSymbol] = 0;
                }
                symbolAmplitudes[op.writeSymbol] += op.amplitude;
            });
            
            // ОБНОВЛЯЕМ ЛЕНТУ
            this.quantumTape.writeSuperposition(pos, symbolAmplitudes);
        });
    }

    calculateNewPosition(currentPos, direction) {
        switch (direction) {
            case 'L': return currentPos - 1;
            case 'R': return currentPos + 1;
            case 'S': return currentPos;
            default: return currentPos;
        }
    }

    // Добавление правила с немедленным предпросмотром воздействия
    addTransitionRule(rule) {
        this.transitionTable.addRule(rule);
        this.previewRuleImpact(rule);
    }

    previewRuleImpact(rule) {
        const currentStates = this.quantumState.getSuperposition();
        const affectedCells = [];
        
        currentStates.forEach(branch => {
            const currentSymbol = this.quantumTape.readCell(branch.headPosition);
            if (rule.currentState === branch.state && rule.currentSymbol === currentSymbol) {
                affectedCells.push({
                    position: branch.headPosition,
                    fromSymbol: currentSymbol,
                    toSymbol: rule.writeSymbol,
                    probability: Math.abs(branch.amplitude) ** 2
                });
            }
        });
        
        // Визуализируем потенциальные изменения
        this.visualizeTapePreview(affectedCells);
    }
}


// class QTMSimulator {
//     constructor() {
//         this.quantumState = new QuantumState();
//         this.tape = new QuantumTape();
//         this.transitionTable = new TransitionTable();
//         this.isRunning = false;
//         this.currentStep = 0;
//         this.speed = 5;
//         this.measurementResults = [];
//     }

//     initialize() {
//         this.quantumState.initialize();
//         this.tape.initialize();
//         this.currentStep = 0;
//         this.isRunning = false;
//         this.measurementResults = [];
//     }

//     start() {
//         this.isRunning = true;
//         this.runSimulation();
//     }

//     stop() {
//         this.isRunning = false;
//     }

//     step() {
//         if (!this.isRunning) {
//             this.executeStep();
//             this.currentStep++;
//         }
//     }

//     executeStep() {
//         // Получаем текущее квантовое состояние
//         const probabilities = this.quantumState.getProbabilities();
        
//         // Для каждого состояния в суперпозиции выполняем переход
//         for (const prob of probabilities) {
//             if (prob.probability > 0.001) {
//                 const currentSymbol = this.tape.read();
//                 const transition = this.transitionTable.getTransition(prob.state, currentSymbol);
                
//                 if (transition) {
//                     // Применяем переход с учетом амплитуды
//                     console.log(`Переход: ${prob.state} -> ${transition.toState}`);
//                 }
//             }
//         }
        
//         console.log('Шаг выполнен:', this.currentStep);
//     }

//     reset() {
//         this.stop();
//         this.initialize();
//         this.updateDisplay();
//     }

//     // Базовое задание 2: Измерение с визуализацией
//     measure() {
//         const result = this.quantumState.measure();
//         this.measurementResults.push({
//             step: this.currentStep,
//             state: result,
//             tape: this.tape.getVisualization()
//         });
        
//         this.updateDisplay();
//         return result;
//     }

//     // Базовое задание 1: Создание суперпозиции
//     createSuperposition() {
//         const result = this.quantumState.createSuperposition();
//         this.updateDisplay();
//         return result;
//     }

//     // Базовое задание 3: Интерференция
//     applyInterference() {
//         this.quantumState.applyInterference();
//         this.updateDisplay();
//     }

//     // Базовое задание 4: Ветвление
//     applyQuantumBranching() {
//         this.quantumState.quantumBranching();
//         this.updateDisplay();
//     }

//     setSpeed(newSpeed) {
//         this.speed = parseInt(newSpeed);
//     }

//     updateDisplay() {
//         // Обновляем интерфейс
//         if (typeof app !== 'undefined' && app.updateDisplay) {
//             app.updateDisplay();
//         }
//     }

//     getCurrentState() {
//         return {
//             step: this.currentStep,
//             stateVector: this.quantumState.getStateVector(),
//             probabilities: this.quantumState.getProbabilities(),
//             tape: this.tape.getVisualization(),
//             headPosition: this.tape.headPosition
//         };
//     }

//     // Среднее задание 3: Проверка унитарности
//     verifyUnitarity() {
//         return this.transitionTable.verifyUnitarity();
//     }

//     // Загрузка preset-ов для лабораторных работ
//     loadPreset(presetName) {
//         const result = this.transitionTable.createPreset(presetName);
//         this.initialize();
//         this.updateDisplay();
//         return result;
//     }

//     getCurrentState() {
//         return {
//             step: this.currentStep,
//             stateVector: this.quantumState.getStateVector(),
//             probabilities: this.quantumState.getProbabilities(),
//             tape: this.tape.getVisualization(),
//             headPosition: this.tape.headPosition,
//             dominantState: this.getDominantState()
//         };
//     }

//     getDominantState() {
//         const probabilities = this.quantumState.getProbabilities();
//         if (probabilities.length === 0) return '|q₀⟩';
        
//         let maxProb = 0;
//         let dominantState = '|q₀⟩';
        
//         probabilities.forEach(prob => {
//             if (prob.probability > maxProb) {
//                 maxProb = prob.probability;
//                 dominantState = `|${prob.state.replace('q0', 'q₀').replace('q1', 'q₁')}⟩`;
//             }
//         });
        
//         return dominantState;
//     }

//     step() {
//         if (!this.isRunning) {
//             this.executeStep();
//             this.currentStep++;
//             return true;
//         }
//         return false;
//     }

//     executeStep() {
//         // Здесь будет логика выполнения шага с учетом квантовых переходов
//         console.log('Выполняется шаг симуляции');
        
//         // Временная реализация для демонстрации
//         const transitions = Array.from(this.transitionTable.transitions.values());
//         if (transitions.length > 0) {
//             this.quantumState.applyTransitions(transitions);
//         }
//     }

//     reset() {
//         this.stop();
//         this.quantumState.initialize();
//         this.tape.initialize();
//         this.currentStep = 0;
//     }
// }