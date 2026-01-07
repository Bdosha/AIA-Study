/**
 * @file State.js - Классы для работы с состояниями вероятностного автомата
 * @module core/state
 */

/**
 * Класс вектора состояний - представляет распределение вероятностей по состояниям автомата
 * @class StateVector
 */
class StateVector {
    /**
     * Создает вектор состояний
     * @param {Object} states - Объект с состояниями и их вероятностями {q0: 0.5, q1: 0.5}
     */
    constructor(states = {}) {
        this.states = { ...states };
        this.normalize();
        this.history = []; // История изменений для отладки
    }

    /**
     * ОБНОВЛЕНО: Применяет символ к вектору состояний используя матрицу переходов
     * @param {string} symbol - Входной символ
     * @param {TransitionMatrix} transitionMatrix - Матрица переходов для этого символа
     * @returns {StateVector} Новый вектор после применения символа
     */
    applySymbol(symbol, transitionMatrix) {
        const newStates = {};
        
        // Для каждого текущего состояния
        for (let currentState in this.states) {
            const currentProb = this.states[currentState];
            
            if (currentProb > 0) {
                // Получаем вероятности переходов из currentState по символу symbol
                const transitions = transitionMatrix.getTransitions(currentState, symbol);
                
                // Для каждого возможного следующего состояния
                for (let nextState in transitions) {
                    const transitionProb = transitions[nextState];
                    const probContribution = currentProb * transitionProb;
                    
                    newStates[nextState] = (newStates[nextState] || 0) + probContribution;
                }
            }
        }
        
        const newVector = new StateVector(newStates);
        newVector.history = [...this.history, `Applied symbol: ${symbol}`];
        return newVector;
    }

    /**
     * ОБНОВЛЕНО: Обрабатывает всю входную строку
     * @param {string} inputString - Входная строка (например, "aba")
     * @param {Object} transitionMatrices - Объект с матрицами для каждого символа {a: matrixA, b: matrixB}
     * @returns {StateVector} Финальный вектор после обработки всей строки
     */
    processInputString(inputString, transitionMatrices) {
        let currentVector = this.clone();
        
        for (let symbol of inputString) {
            const matrix = transitionMatrices[symbol];
            if (!matrix) {
                throw new Error(`Нет матрицы переходов для символа: ${symbol}`);
            }
            currentVector = currentVector.applySymbol(symbol, matrix);
        }
        
        return currentVector;
    }

    /**
     * ОБНОВЛЕНО: Проверяет, принимается ли строка автоматом
     * @param {string} inputString - Входная строка
     * @param {Object} transitionMatrices - Матрицы переходов
     * @param {string[]} finalStates - Массив конечных состояний
     * @param {number} acceptanceThreshold - Порог принятия (по умолчанию 0.5)
     * @returns {boolean} true если строка принимается
     */
    isStringAccepted(inputString, transitionMatrices, finalStates, acceptanceThreshold = 0.5) {
        const finalVector = this.processInputString(inputString, transitionMatrices);
        
        let totalFinalProbability = 0;
        for (let state of finalStates) {
            totalFinalProbability += finalVector.getProbability(state);
        }
        
        return totalFinalProbability >= acceptanceThreshold;
    }

    /**
     * Устанавливает вероятность для конкретного состояния
     * @param {string} state - Идентификатор состояния (например, 'q0')
     * @param {number} probability - Вероятность (от 0 до 1)
     */
    setProbability(state, probability) {
        if (probability < 0 || probability > 1) {
            throw new Error('Вероятность должна быть в диапазоне [0, 1]');
        }
        this.states[state] = probability;
        // this.normalize();
    }

    /**
     * Получает вероятность конкретного состояния
     * @param {string} state - Идентификатор состояния
     * @returns {number} Вероятность состояния
     */
    getProbability(state) {
        return this.states[state] || 0;
    }

    /**
     * Нормализует вектор (сумма вероятностей = 1)
     * @private
     */
    normalize() {
        const total = this.getTotalProbability();
        
        if (total === 0) {
            // Если все вероятности нулевые, устанавливаем равномерное распределение
            const stateCount = Object.keys(this.states).length;
            if (stateCount > 0) {
                const uniformProb = 1 / stateCount;
                for (let state in this.states) {
                    this.states[state] = uniformProb;
                }
            }
            return;
        }

        if (Math.abs(total - 1.0) > 1e-10) {
            for (let state in this.states) {
                this.states[state] /= total;
            }
        }
    }

    /**
     * Вычисляет общую сумму вероятностей
     * @returns {number} Сумма всех вероятностей
     */
    getTotalProbability() {
        return Object.values(this.states).reduce((sum, prob) => sum + prob, 0);
    }

    /**
     * Проверяет, является ли вектор валидным (сумма = 1 с учетом погрешности)
     * @returns {boolean} true если вектор валиден
     */
    isValid() {
        const total = this.getTotalProbability();
        return Math.abs(total - 1.0) < 1e-10;
    }

    /**
     * Возвращает состояние с максимальной вероятностью
     * @returns {string} Идентификатор состояния с максимальной вероятностью
     */
    getMostProbableState() {
        let maxProb = -1;
        let mostProbableState = null;

        for (let state in this.states) {
            if (this.states[state] > maxProb) {
                maxProb = this.states[state];
                mostProbableState = state;
            }
        }

        return mostProbableState;
    }

    /**
     * Умножает вектор на скаляр
     * @param {number} scalar - Скаляр для умножения
     * @returns {StateVector} Новый вектор
     */
    multiplyScalar(scalar) {
        const newStates = {};
        for (let state in this.states) {
            newStates[state] = this.states[state] * scalar;
        }
        return new StateVector(newStates);
    }

    /**
     * Складывает два вектора состояний
     * @param {StateVector} other - Другой вектор для сложения
     * @returns {StateVector} Новый вектор (сумма)
     */
    add(other) {
        const newStates = { ...this.states };
        
        for (let state in other.states) {
            newStates[state] = (newStates[state] || 0) + other.states[state];
        }
        
        return new StateVector(newStates);
    }

    /**
     * Создает глубокую копию вектора
     * @returns {StateVector} Клон вектора
     */
    clone() {
        const cloned = new StateVector({ ...this.states });
        cloned.history = [...this.history];
        return cloned;
    }

    /**
     * Возвращает все состояния вектора
     * @returns {string[]} Массив идентификаторов состояний
     */
    getStates() {
        return Object.keys(this.states);
    }

    /**
     * Преобразует вектор в строку для отладки
     * @returns {string} Строковое представление
     */
    toString() {
        return `StateVector(${JSON.stringify(this.states)})`;
    }

    /**
     * Создает вектор из массива состояний с равными вероятностями
     * @param {string[]} stateIds - Массив идентификаторов состояний
     * @returns {StateVector} Новый вектор
     */
    static fromStateArray(stateIds) {
        const states = {};
        const probability = 1 / stateIds.length;
        
        stateIds.forEach(stateId => {
            states[stateId] = probability;
        });
        
        return new StateVector(states);
    }

    /**
     * Создает начальный вектор с вероятностью 1 для указанного состояния
     * @param {string} initialState - Начальное состояние
     * @returns {StateVector} Вектор начального состояния
     */
    static createInitialVector(initialState) {
        return new StateVector({ [initialState]: 1.0 });
    }
}

/**
 * Класс отдельного состояния автомата
 * @class AutomataState
 */
class AutomataState {
    /**
     * Создает состояние автомата
     * @param {string} id - Уникальный идентификатор состояния
     * @param {boolean} isInitial - Является ли начальным состоянием
     * @param {boolean} isFinal - Является ли конечным состоянием
     */
    constructor(id, isInitial = false, isFinal = false) {
        this.id = id;
        this.isInitial = isInitial;
        this.isFinal = isFinal;
        this.position = { x: 0, y: 0 }; // Позиция для визуализации
        this.label = id; // Метка для отображения
    }

    /**
     * Устанавливает позицию состояния на графе
     * @param {number} x - X координата
     * @param {number} y - Y координата
     */
    setPosition(x, y) {
        this.position = { x, y };
    }

    /**
     * Получает позицию состояния
     * @returns {Object} Объект с x и y координатами
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Устанавливает метку для отображения
     * @param {string} label - Новая метка
     */
    setLabel(label) {
        this.label = label;
    }

    /**
     * Проверяет, является ли состояние начальным
     * @returns {boolean}
     */
    isInitialState() {
        return this.isInitial;
    }

    /**
     * Проверяет, является ли состояние конечным
     * @returns {boolean}
     */
    isFinalState() {
        return this.isFinal;
    }

    /**
     * Создает глубокую копию состояния
     * @returns {AutomataState} Клон состояния
     */
    clone() {
        const cloned = new AutomataState(this.id, this.isInitial, this.isFinal);
        cloned.position = { ...this.position };
        cloned.label = this.label;
        return cloned;
    }

    /**
     * Преобразует состояние в строку для отладки
     * @returns {string} Строковое представление
     */
    toString() {
        return `AutomataState(${this.id}, initial: ${this.isInitial}, final: ${this.isFinal})`;
    }
}

// Экспорт классов для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateVector, AutomataState };
} else {
    window.StateVector = StateVector;
    window.AutomataState = AutomataState;
}