/**
 * @file Automata.js - Основной класс вероятностного конечного автомата (ВКА)
 * @module core/automata
 */

/**
 * Класс вероятностного конечного автомата
 * @class ProbabilisticAutomaton
 */
class ProbabilisticAutomaton {
    /**
     * Создает вероятностный автомат
     * @param {string} name - Название автомата
     */
    constructor(name = 'Unnamed Automaton') {
        this.name = name;
        this.states = new Map(); // Map<stateId, AutomataState>
        this.initialStates = new Set(); // Множество начальных состояний
        this.finalStates = new Set(); // Множество конечных состояний
        this.transitionMatrices = new TransitionMatrixCollection(); // Матрицы переходов
        this.initialDistribution = new StateVector(); // Начальное распределение
        this.alphabet = new Set(); // Алфавит входных символов
        this.currentState = new StateVector(); // Текущее распределение состояний
        this.history = []; // История состояний для анализа
    }

    /**
     * Добавляет состояние в автомат
     * @param {string} stateId - Идентификатор состояния
     * @param {boolean} isInitial - Является ли начальным
     * @param {boolean} isFinal - Является ли конечным
     * @param {number} x - X координата для визуализации
     * @param {number} y - Y координата для визуализации
     * @returns {AutomataState} Созданное состояние
     */
    addState(stateId, isInitial = false, isFinal = false, x = 0, y = 0) {
        if (this.states.has(stateId)) {
            throw new Error(`Состояние '${stateId}' уже существует`);
        }

        const state = new AutomataState(stateId, isInitial, isFinal);
        state.setPosition(x, y);
        
        this.states.set(stateId, state);

        if (isInitial) {
            this.initialStates.add(stateId);
            // Обновляем начальное распределение
            this.updateInitialDistribution();
        }

        if (isFinal) {
            this.finalStates.add(stateId);
        }

        return state;
    }

    /**
     * Удаляет состояние из автомата
     * @param {string} stateId - Идентификатор состояния
     */
    removeState(stateId) {
        if (!this.states.has(stateId)) {
            throw new Error(`Состояние '${stateId}' не существует`);
        }

        const state = this.states.get(stateId);
        
        // Удаляем из множеств
        this.initialStates.delete(stateId);
        this.finalStates.delete(stateId);
        
        // Удаляем из начального распределения
        this.initialDistribution.states[stateId] = 0;
        this.initialDistribution.normalize();
        
        // Удаляем из текущего состояния
        if (this.currentState.states[stateId]) {
            delete this.currentState.states[stateId];
            this.currentState.normalize();
        }
        
        // Удаляем все переходы, связанные с этим состоянием
        for (let symbol of this.alphabet) {
            const matrix = this.transitionMatrices.getMatrix(symbol);
            if (matrix) {
                // Удаляем переходы ИЗ этого состояния
                if (matrix.transitions[stateId]) {
                    delete matrix.transitions[stateId];
                }
                
                // Удаляем переходы В это состояние
                for (let fromState in matrix.transitions) {
                    if (matrix.transitions[fromState][stateId]) {
                        delete matrix.transitions[fromState][stateId];
                    }
                }
                
                // Нормализуем оставшиеся переходы
                matrix.normalizeAll();
            }
        }
        
        // Удаляем само состояние
        this.states.delete(stateId);
    }

    /**
     * Добавляет символ в алфавит
     * @param {string} symbol - Символ алфавита
     * @returns {TransitionMatrix} Матрица переходов для символа
     */
    addSymbol(symbol) {
        if (this.alphabet.has(symbol)) {
            return this.transitionMatrices.getMatrix(symbol);
        }

        this.alphabet.add(symbol);
        return this.transitionMatrices.createMatrix(symbol);
    }

    /**
     * Удаляет символ из алфавита
     * @param {string} symbol - Символ алфавита
     */
    removeSymbol(symbol) {
        this.alphabet.delete(symbol);
        this.transitionMatrices.removeMatrix(symbol);
    }

    /**
     * Устанавливает переход между состояниями
     * @param {string} fromState - Исходное состояние
     * @param {string} toState - Целевое состояние
     * @param {string} symbol - Символ алфавита
     * @param {number} probability - Вероятность перехода
     */
    setTransition(fromState, toState, symbol, probability) {
        // Проверяем существование состояний
        if (!this.states.has(fromState)) {
            throw new Error(`Исходное состояние '${fromState}' не существует`);
        }
        if (!this.states.has(toState)) {
            throw new Error(`Целевое состояние '${toState}' не существует`);
        }

        // Добавляем символ в алфавит если нужно
        if (!this.alphabet.has(symbol)) {
            this.addSymbol(symbol);
        }

        const matrix = this.transitionMatrices.getMatrix(symbol);
        matrix.setTransition(fromState, toState, probability);
    }

    /**
     * Обновляет начальное распределение на основе начальных состояний
     */
    updateInitialDistribution() {
        const initialStatesArray = Array.from(this.initialStates);
        
        if (initialStatesArray.length === 0) {
            this.initialDistribution = new StateVector();
        } else {
            // Равномерное распределение по начальным состояниям
            const probability = 1 / initialStatesArray.length;
            const states = {};
            
            for (let stateId of initialStatesArray) {
                states[stateId] = probability;
            }
            
            this.initialDistribution = new StateVector(states);
        }
        
        // Сбрасываем текущее состояние к начальному
        this.reset();
    }

    /**
     * Сбрасывает автомат в начальное состояние
     */
    reset() {
        this.currentState = this.initialDistribution.clone();
        this.history = [this.currentState.clone()];
    }

    /**
     * Обрабатывает входной символ
     * @param {string} symbol - Входной символ
     * @returns {StateVector} Новое распределение состояний
     */
    processSymbol(symbol) {
        if (!this.alphabet.has(symbol)) {
            throw new Error(`Символ '${symbol}' не в алфавите автомата`);
        }

        const matrix = this.transitionMatrices.getMatrix(symbol);
        const nextState = this.selectNextState(symbol, matrix);

        // Создаем новое распределение с вероятностью 1 для выбранного состояния
        const newStateVector = new StateVector();
        newStateVector.setProbability(nextState, 1.0);
        
        this.currentState = newStateVector;
        this.history.push(this.currentState.clone());
        
        return this.currentState;
    }

    /**
     * Выбирает следующее состояние случайно на основе вероятностей переходов
     * @param {string} symbol - Текущий символ
     * @param {TransitionMatrix} matrix - Матрица переходов
     * @returns {string} ID выбранного состояния
     */
    selectNextState(symbol, matrix) {
        // Получаем текущее состояние (должно быть только одно с вероятностью 1)
        const currentStateId = this.currentState.getMostProbableState();
        const currentProb = this.currentState.getProbability(currentStateId);
        
        if (currentProb !== 1.0) {
            console.warn('Текущее состояние не детерминировано, выбираем наиболее вероятное');
        }
        
        // Получаем все возможные переходы из текущего состояния
        const transitions = matrix.getTransitions(currentStateId);
        
        if (!transitions || Object.keys(transitions).length === 0) {
            throw new Error(`Нет переходов из состояния '${currentStateId}' по символу '${symbol}'`);
        }
        
        // Генерируем случайное число для выбора перехода
        const randomValue = Math.random();
        let cumulativeProbability = 0;
        
        // Проходим по всем возможным переходам и выбираем случайно
        for (const [nextStateId, probability] of Object.entries(transitions)) {
            cumulativeProbability += probability;
            
            if (randomValue <= cumulativeProbability) {
                return nextStateId;
            }
        }
        
        // Если из-за ошибок округления не выбрали, возвращаем последнее состояние
        const lastState = Object.keys(transitions).pop();
        console.warn(`Ошибка выбора состояния, возвращаем последнее: ${lastState}`);
        return lastState;
    }

    /**
     * Обрабатывает входную строку
     * @param {string} inputString - Входная строка
     * @returns {StateVector} Финальное распределение состояний
     */
    processString(inputString) {
        this.reset();
        
        for (let symbol of inputString) {
            this.processSymbol(symbol);
        }
        
        return this.currentState;
    }

    /**
     * Проверяет, принимается ли строка автоматом
     * @param {string} inputString - Входная строка
     * @param {number} threshold - Порог принятия (по умолчанию 0.5)
     * @returns {boolean} true если строка принимается
     */
    isStringAccepted(inputString, threshold = 0.5) {
        const finalVector = this.processString(inputString);
        const finalStatesArray = Array.from(this.finalStates);
        
        let totalFinalProbability = 0;
        for (let stateId of finalStatesArray) {
            totalFinalProbability += finalVector.getProbability(stateId);
        }
        
        return totalFinalProbability >= threshold;
    }

    /**
     * Возвращает вероятность принятия строки
     * @param {string} inputString - Входная строка
     * @returns {number} Вероятность принятия (0-1)
     */
    getAcceptanceProbability(inputString) {
        const finalVector = this.processString(inputString);
        const finalStatesArray = Array.from(this.finalStates);
        
        let totalFinalProbability = 0;
        for (let stateId of finalStatesArray) {
            totalFinalProbability += finalVector.getProbability(stateId);
        }
        
        return totalFinalProbability;
    }

    /**
     * Выполняет несколько прогонов автомата для статистики
     * @param {string} inputString - Входная строка
     * @param {number} numRuns - Количество прогонов
     * @returns {Object} Статистика прогонов
     */
    multipleRuns(inputString, numRuns = 100) {
        const results = {
            accepted: 0,
            rejected: 0,
            finalStates: {},
            acceptanceProbability: 0
        };

        for (let i = 0; i < numRuns; i++) {
            this.processString(inputString);
            const finalState = this.currentState.getMostProbableState();
            
            results.finalStates[finalState] = (results.finalStates[finalState] || 0) + 1;
            
            if (this.finalStates.has(finalState)) {
                results.accepted++;
            } else {
                results.rejected++;
            }
        }

        // Преобразуем счетчики в вероятности
        for (let state in results.finalStates) {
            results.finalStates[state] /= numRuns;
        }

        results.acceptanceProbability = results.accepted / numRuns;
        return results;
    }

    /**
     * Проверяет валидность автомата
     * @returns {boolean} true если автомат валиден
     */
    isValid() {
        // Проверяем что есть хотя бы одно состояние
        if (this.states.size === 0) {
            return false;
        }

        // Проверяем что есть начальное состояние
        if (this.initialStates.size === 0) {
            return false;
        }

        // Проверяем валидность всех матриц переходов
        const allStates = Array.from(this.states.keys());
        if (!this.transitionMatrices.isValid(allStates)) {
            return false;
        }

        // Проверяем что начальное распределение валидно
        if (!this.initialDistribution.isValid()) {
            return false;
        }

        return true;
    }

    /**
     * Получает все состояния автомата
     * @returns {AutomataState[]} Массив состояний
     */
    getAllStates() {
        return Array.from(this.states.values());
    }

    /**
     * Получает со/стояние по идентификатору
     * @param {string} stateId - Идентификатор состояния
     * @returns {AutomataState} Состояние
     */
    getState(stateId) {
        return this.states.get(stateId);
    }

    /**
     * Получает алфавит автомата
     * @returns {string[]} Массив символов алфавита
     */
    getAlphabet() {
        return Array.from(this.alphabet);
    }

    /**
     * Получает историю состояний
     * @returns {StateVector[]} Массив векторов состояний
     */
    getHistory() {
        return this.history.map(vector => vector.clone());
    }

    /**
     * Возвращает общую матрицу достижимости автомата (для анализа свойств)
     * Объединяет все матрицы переходов по символам.
     * @returns {Object} - объект вида { stateA: { stateB: prob > 0 ? 1 : 0, ... } }
     */
    getTransitionMatrix() {
        if (!this.transitionMatrices || typeof this.transitionMatrices.getReachabilityMatrix !== 'function') {
            console.warn("⚠️ Автомат не имеет матриц переходов для анализа");
            return {};
        }

        const reachMatrix = this.transitionMatrices.getReachabilityMatrix();
        if (!reachMatrix || Object.keys(reachMatrix).length === 0) {
            console.warn("⚠️ Матрица достижимости пуста");
        }

        return reachMatrix;
    }



    /**
     * Экспортирует автомат в JSON
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        const statesArray = this.getAllStates().map(state => ({
            id: state.id,
            isInitial: state.isInitial,
            isFinal: state.isFinal,
            position: state.getPosition(),
            label: state.label
        }));

        return {
            name: this.name,
            states: statesArray,
            alphabet: Array.from(this.alphabet),
            transitionMatrices: this.transitionMatrices.toJSON(),
            initialDistribution: this.initialDistribution.states
        };
    }

    /**
     * Импортирует автомат из JSON
     * @param {Object} json - Объект с данными автомата
     */
    fromJSON(json) {
        this.name = json.name || 'Imported Automaton';
        this.states.clear();
        this.initialStates.clear();
        this.finalStates.clear();
        this.alphabet.clear();
        this.transitionMatrices = new TransitionMatrixCollection();

        // Восстанавливаем состояния
        for (let stateData of json.states) {
            const state = this.addState(
                stateData.id, 
                stateData.isInitial, 
                stateData.isFinal,
                stateData.position?.x || 0,
                stateData.position?.y || 0
            );
            state.setLabel(stateData.label || stateData.id);
        }

        // Восстанавливаем алфавит
        for (let symbol of json.alphabet) {
            this.alphabet.add(symbol);
        }

        // Восстанавливаем матрицы переходов - ИСПРАВЛЕННАЯ ЧАСТЬ
        if (json.transitionMatrices) {
            for (let symbol in json.transitionMatrices) {
                const matrix = new TransitionMatrix(symbol);
                
                // Восстанавливаем переходы для каждого символа
                for (let fromState in json.transitionMatrices[symbol]) {
                    for (let toState in json.transitionMatrices[symbol][fromState]) {
                        const probability = json.transitionMatrices[symbol][fromState][toState];
                        // Используем прямое присваивание чтобы избежать автонормализации
                        if (!matrix.transitions[fromState]) {
                            matrix.transitions[fromState] = {};
                        }
                        matrix.transitions[fromState][toState] = probability;
                    }
                }
                
                // Нормализуем матрицу после загрузки
                matrix.normalizeAll();
                this.transitionMatrices.addMatrix(symbol, matrix);
            }
        }

        // Восстанавливаем начальное распределение
        this.initialDistribution = new StateVector(json.initialDistribution || {});

        // Сбрасываем автомат
        this.reset();
    }

    /**
     * Создает глубокую копию автомата
     * @returns {ProbabilisticAutomaton} Клон автомата
     */
    clone() {
        const cloned = new ProbabilisticAutomaton(this.name + ' (Copy)');
        cloned.fromJSON(this.toJSON());
        return cloned;
    }

    /**
     * Преобразует автомат в строку для отладки
     * @returns {string} Строковое представление
     */
    toString() {
        return `ProbabilisticAutomaton('${this.name}', states: ${this.states.size}, alphabet: ${this.alphabet.size})`;
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProbabilisticAutomaton };
} else {
    window.ProbabilisticAutomaton = ProbabilisticAutomaton;
}