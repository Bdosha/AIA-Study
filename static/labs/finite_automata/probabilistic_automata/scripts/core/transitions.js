/**
 * @file Transitions.js - Классы для работы с матрицами вероятностных переходов
 * @module core/transitions
 */

/**
 * Класс матрицы переходов для конкретного символа
 * @class TransitionMatrix
 */
class TransitionMatrix {
    /**
     * Создает матрицу переходов для символа
     * @param {string} symbol - Символ входного алфавита
     */
    constructor(symbol) {
        this.symbol = symbol;
        this.transitions = {}; // Структура: {fromState: {toState: probability}}
        this.validationErrors = [];
        this.autoNormalize = true; // Автоматически нормализовать при установке переходов
    }

    /**
     * Устанавливает вероятность перехода из одного состояния в другое
     * @param {string} fromState - Исходное состояние
     * @param {string} toState - Целевое состояние
     * @param {number} probability - Вероятность перехода (0-1)
     */
    setTransition(fromState, toState, probability) {
        // Валидация входных данных
        if (probability < 0 || probability > 1) {
            throw new Error(`Вероятность должна быть в диапазоне [0, 1], получено: ${probability}`);
        }

        if (!fromState || !toState) {
            throw new Error('Исходное и целевое состояния не могут быть пустыми');
        }

        // Инициализируем объект для fromState если его нет
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }

        // Устанавливаем вероятность перехода
        this.transitions[fromState][toState] = probability;

        // Автоматически нормализуем если включено
        if (this.autoNormalize) {
            this.normalizeState(fromState);
        }
    }

    /**
     * Включает или выключает автоматическую нормализацию
     * @param {boolean} enable - true для включения автоматической нормализации
     */
    setAutoNormalize(enable) {
        this.autoNormalize = enable;
    }

    /**
     * Получает вероятность перехода между состояниями
     * @param {string} fromState - Исходное состояние
     * @param {string} toState - Целевое состояние
     * @returns {number} Вероятность перехода (0 если перехода нет)
     */
    getTransition(fromState, toState) {
        if (!this.transitions[fromState]) {
            return 0;
        }
        return this.transitions[fromState][toState] || 0;
    }

    /**
     * Получает все возможные переходы из указанного состояния
     * @param {string} fromState - Исходное состояние
     * @returns {Object} Объект с переходами {toState: probability}
     */
    getTransitions(fromState) {
        return this.transitions[fromState] || {};
    }

    /**
     * Удаляет переход между состояниями
     * @param {string} fromState - Исходное состояние
     * @param {string} toState - Целевое состояние
     */
    removeTransition(fromState, toState) {
        if (this.transitions[fromState] && this.transitions[fromState][toState]) {
            delete this.transitions[fromState][toState];
            
            // Если больше нет переходов из этого состояния, удаляем его
            if (Object.keys(this.transitions[fromState]).length === 0) {
                delete this.transitions[fromState];
            } else if (this.autoNormalize) {
                // Если остались переходы и включена автонормализация - нормализуем
                this.normalizeState(fromState);
            }
        }
    }

    /**
     * Проверяет валидность матрицы для всех состояний
     * @param {string[]} allStates - Все состояния автомата
     * @returns {boolean} true если матрица валидна
     */
    isValid(allStates = []) {
        this.validationErrors = [];

        // Проверяем каждое состояние, для которого есть переходы
        const statesWithTransitions = Object.keys(this.transitions);
        
        for (let fromState of statesWithTransitions) {
            const transitions = this.transitions[fromState];
            const totalProbability = Object.values(transitions).reduce((sum, prob) => sum + prob, 0);
            
            // Проверяем сумму вероятностей (допускаем небольшую погрешность)
            if (Math.abs(totalProbability - 1.0) > 1e-10) {
                this.validationErrors.push(
                    `Сумма вероятностей из состояния ${fromState} = ${totalProbability.toFixed(4)} (должна быть 1.0)`
                );
            }

            // Проверяем отрицательные вероятности
            for (let toState in transitions) {
                if (transitions[toState] < 0) {
                    this.validationErrors.push(
                        `Отрицательная вероятность из ${fromState} в ${toState}: ${transitions[toState]}`
                    );
                }
            }
        }

        // Проверяем, что все состояния из allStates имеют переходы
        if (allStates.length > 0) {
            for (let state of allStates) {
                if (!this.transitions[state]) {
                    // Если для состояния нет переходов, создаем петлю с вероятностью 1
                    this.validationErrors.push(
                        `Нет переходов из состояния ${state} для символа ${this.symbol}`
                    );
                }
            }
        }

        return this.validationErrors.length === 0;
    }

    /**
     * Автоматически нормализует переходы из состояния (сумма = 1)
     * @param {string} fromState - Состояние для нормализации
     */
    normalizeState(fromState) {
        if (!this.transitions[fromState]) {
            return;
        }

        const transitions = this.transitions[fromState];
        const total = Object.values(transitions).reduce((sum, prob) => sum + prob, 0);

        // Если сумма уже равна 1 (с учетом погрешности), не делаем ничего
        if (Math.abs(total - 1.0) < 1e-10) {
            return;
        }

        if (total === 0) {
            // Если все вероятности нулевые, устанавливаем равномерное распределение
            const stateCount = Object.keys(transitions).length;
            if (stateCount > 0) {
                const uniformProb = 1 / stateCount;
                for (let toState in transitions) {
                    transitions[toState] = uniformProb;
                }
            }
        } else {
            // Нормализуем существующие вероятности
            for (let toState in transitions) {
                transitions[toState] /= total;
            }
        }
    }

    /**
     * Нормализует все состояния в матрице
     */
    normalizeAll() {
        for (let fromState in this.transitions) {
            this.normalizeState(fromState);
        }
    }

    /**
     * Получает все исходные состояния, для которых есть переходы
     * @returns {string[]} Массив состояний
     */
    getFromStates() {
        return Object.keys(this.transitions);
    }

    /**
     * Получает все целевые состояния для указанного исходного состояния
     * @param {string} fromState - Исходное состояние
     * @returns {string[]} Массив целевых состояний
     */
    getToStates(fromState) {
        if (!this.transitions[fromState]) {
            return [];
        }
        return Object.keys(this.transitions[fromState]);
    }

    /**
     * Получает все уникальные целевые состояния во всей матрице
     * @returns {string[]} Массив всех целевых состояний
     */
    getAllToStates() {
        const allToStates = new Set();
        
        for (let fromState in this.transitions) {
            for (let toState in this.transitions[fromState]) {
                allToStates.add(toState);
            }
        }
        
        return Array.from(allToStates);
    }

    /**
     * Создает глубокую копию матрицы
     * @returns {TransitionMatrix} Клон матрицы
     */
    clone() {
        const cloned = new TransitionMatrix(this.symbol);
        cloned.autoNormalize = this.autoNormalize;
        
        for (let fromState in this.transitions) {
            cloned.transitions[fromState] = { ...this.transitions[fromState] };
        }
        
        return cloned;
    }

    /**
     * Преобразует матрицу в формат для отображения в таблице
     * @param {string[]} allStates - Все состояния для отображения (порядок важен)
     * @returns {Object} Объект с данными для таблицы
     */
    toTableData(allStates = []) {
        const tableData = {};
        
        // Если не переданы все состояния, используем те, что есть в матрице
        const states = allStates.length > 0 ? allStates : this.getFromStates();
        
        for (let fromState of states) {
            tableData[fromState] = {};
            
            for (let toState of states) {
                tableData[fromState][toState] = this.getTransition(fromState, toState);
            }
        }
        
        return tableData;
    }

    /**
     * Загружает данные таблицы в матрицу
     * @param {Object} tableData - Данные таблицы {fromState: {toState: probability}}
     */
    fromTableData(tableData) {
        // Временно отключаем автонормализацию для массовой загрузки
        const wasAutoNormalize = this.autoNormalize;
        this.autoNormalize = false;
        
        this.transitions = {};
        
        for (let fromState in tableData) {
            for (let toState in tableData[fromState]) {
                const probability = tableData[fromState][toState];
                if (probability > 0) {
                    // Используем прямое присваивание чтобы избежать рекурсивной нормализации
                    if (!this.transitions[fromState]) {
                        this.transitions[fromState] = {};
                    }
                    this.transitions[fromState][toState] = probability;
                }
            }
        }
        
        // Включаем обратно и нормализуем все
        this.autoNormalize = wasAutoNormalize;
        if (this.autoNormalize) {
            this.normalizeAll();
        }
    }

    /**
     * Преобразует матрицу в строку для отладки
     * @returns {string} Строковое представление
     */
    toString() {
        return `TransitionMatrix('${this.symbol}', ${JSON.stringify(this.transitions)})`;
    }
}

/**
 * Класс для управления всеми матрицами переходов автомата
 * @class TransitionMatrixCollection
 */
class TransitionMatrixCollection {
    /**
     * Создает коллекцию матриц переходов
     */
    constructor() {
        this.matrices = {}; // {symbol: TransitionMatrix}
        this.alphabet = new Set(); // Все символы алфавита
    }

    /**
     * Добавляет матрицу для символа
     * @param {string} symbol - Символ
     * @param {TransitionMatrix} matrix - Матрица переходов
     */
    addMatrix(symbol, matrix) {
        if (matrix.symbol !== symbol) {
            throw new Error('Символ матрицы не совпадает с указанным символом');
        }
        
        this.matrices[symbol] = matrix;
        this.alphabet.add(symbol);
    }

    /**
     * Создает и добавляет новую матрицу для символа
     * @param {string} symbol - Символ
     * @returns {TransitionMatrix} Созданная матрица
     */
    createMatrix(symbol) {
        const matrix = new TransitionMatrix(symbol);
        this.addMatrix(symbol, matrix);
        return matrix;
    }

    /**
     * Получает матрицу для символа
     * @param {string} symbol - Символ
     * @returns {TransitionMatrix} Матрица переходов
     */
    getMatrix(symbol) {
        return this.matrices[symbol];
    }

    /**
     * Проверяет, есть ли матрица для символа
     * @param {string} symbol - Символ
     * @returns {boolean} true если матрица существует
     */
    hasMatrix(symbol) {
        return this.matrices.hasOwnProperty(symbol);
    }

    /**
     * Удаляет матрицу для символа
     * @param {string} symbol - Символ
     */
    removeMatrix(symbol) {
        if (this.matrices[symbol]) {
            delete this.matrices[symbol];
            this.alphabet.delete(symbol);
        }
    }

    /**
     * Получает все символы алфавита
     * @returns {string[]} Массив символов
     */
    getAlphabet() {
        return Array.from(this.alphabet);
    }

    /**
     * Проверяет валидность всех матриц
     * @param {string[]} allStates - Все состояния автомата
     * @returns {boolean} true если все матрицы валидны
     */
    isValid(allStates = []) {
        for (let symbol in this.matrices) {
            if (!this.matrices[symbol].isValid(allStates)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Нормализует все матрицы в коллекции
     */
    normalizeAll() {
        for (let symbol in this.matrices) {
            this.matrices[symbol].normalizeAll();
        }
    }

    /**
     * Создает глубокую копию коллекции
     * @returns {TransitionMatrixCollection} Клон коллекции
     */
    clone() {
        const cloned = new TransitionMatrixCollection();
        
        for (let symbol in this.matrices) {
            cloned.addMatrix(symbol, this.matrices[symbol].clone());
        }
        
        return cloned;
    }

    /**
     * Формирует матрицу достижимости (объединяя все символы)
     * Возвращает объект { from: { to: 1, ... } }
     */
    getReachabilityMatrix() {
        const result = {};
        for (const symbol in this.matrices) {
            const matrix = this.matrices[symbol];
            if (!matrix || !matrix.transitions) continue;

            for (const from in matrix.transitions) {
                if (!result[from]) result[from] = {};
                for (const to in matrix.transitions[from]) {
                    if (matrix.transitions[from][to] > 0) {
                        result[from][to] = 1;
                    }
                }
            }
        }
        return result;
    }


    /**
     * Преобразует коллекцию в объект для сериализации
     * @returns {Object} Объект для JSON
     */
    toJSON() {
        const json = {};
        
        for (let symbol in this.matrices) {
            json[symbol] = this.matrices[symbol].transitions;
        }
        
        return json;
    }

    /**
     * Загружает коллекцию из объекта
     * @param {Object} json - Объект с данными
     */
    fromJSON(json) {
        this.matrices = {};
        this.alphabet.clear();
        
        for (let symbol in json) {
            const matrix = new TransitionMatrix(symbol);
            matrix.transitions = json[symbol];
            this.addMatrix(symbol, matrix);
        }
    }

    /**
     * Преобразует коллекцию в строку для отладки
     * @returns {string} Строковое представление
     */
    toString() {
        return `TransitionMatrixCollection(${Object.keys(this.matrices).join(', ')})`;
    }
}

// Экспорт классов для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TransitionMatrix, TransitionMatrixCollection };
} else {
    window.TransitionMatrix = TransitionMatrix;
    window.TransitionMatrixCollection = TransitionMatrixCollection;
}