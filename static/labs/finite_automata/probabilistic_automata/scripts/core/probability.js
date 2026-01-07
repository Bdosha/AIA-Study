/**
 * @file Probability.js - Математические операции с вероятностями и статистические функции
 * @module core/probability
 */

/**
 * Класс для математических операций с вероятностями
 * @class ProbabilityMath
 */
class ProbabilityMath {
    /**
     * Проверяет, является ли число валидной вероятностью (0-1)
     * @param {number} prob - Проверяемое число
     * @param {number} tolerance - Допустимая погрешность
     * @returns {boolean} true если число в диапазоне [0, 1]
     */
    static isValidProbability(prob, tolerance = 1e-10) {
        return prob >= -tolerance && prob <= 1 + tolerance;
    }

    /**
     * Нормализует массив вероятностей (сумма = 1)
     * @param {number[]} probabilities - Массив вероятностей
     * @returns {number[]} Нормализованный массив
     */
    static normalize(probabilities) {
        if (!Array.isArray(probabilities) || probabilities.length === 0) {
            throw new Error('Массив вероятностей не может быть пустым');
        }

        const total = probabilities.reduce((sum, prob) => sum + prob, 0);
        
        if (total === 0) {
            // Если все вероятности нулевые, возвращаем равномерное распределение
            const uniformProb = 1 / probabilities.length;
            return probabilities.map(() => uniformProb);
        }

        return probabilities.map(prob => prob / total);
    }

    /**
     * Вычисляет энтропию распределения вероятностей
     * @param {number[]} probabilities - Массив вероятностей
     * @returns {number} Энтропия в битах
     */
    static entropy(probabilities) {
        const normalized = this.normalize(probabilities);
        let entropy = 0;

        for (let prob of normalized) {
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        }

        return entropy;
    }

    /**
     * Вычисляет дивергенцию Кульбака-Лейблера (расстояние между распределениями)
     * @param {number[]} p - Исходное распределение
     * @param {number[]} q - Целевое распределение
     * @returns {number} Дивергенция KL
     */
    static klDivergence(p, q) {
        if (p.length !== q.length) {
            throw new Error('Распределения должны иметь одинаковую длину');
        }

        const pNorm = this.normalize(p);
        const qNorm = this.normalize(q);
        let divergence = 0;

        for (let i = 0; i < pNorm.length; i++) {
            if (pNorm[i] > 0 && qNorm[i] > 0) {
                divergence += pNorm[i] * Math.log2(pNorm[i] / qNorm[i]);
            }
        }

        return divergence;
    }

    /**
     * Вычисляет расстояние (норму) между двумя распределениями
     * @param {number[]} p - Первое распределение
     * @param {number[]} q - Второе распределение
     * @param {string} normType - Тип нормы ('L1', 'L2', 'max')
     * @returns {number} Расстояние между распределениями
     */
    static distance(p, q, normType = 'L1') {
        if (p.length !== q.length) {
            throw new Error('Распределения должны иметь одинаковую длину');
        }

        const pNorm = this.normalize(p);
        const qNorm = this.normalize(q);

        switch (normType) {
            case 'L1':
                // Сумма абсолютных разностей
                return pNorm.reduce((sum, prob, i) => sum + Math.abs(prob - qNorm[i]), 0);
            
            case 'L2':
                // Евклидово расстояние
                return Math.sqrt(
                    pNorm.reduce((sum, prob, i) => sum + Math.pow(prob - qNorm[i], 2), 0)
                );
            
            case 'max':
                // Максимальная разность
                return Math.max(...pNorm.map((prob, i) => Math.abs(prob - qNorm[i])));
            
            default:
                throw new Error(`Неизвестный тип нормы: ${normType}`);
        }
    }

    /**
     * Вычисляет стационарное распределение марковской цепи
     * @param {number[][]} transitionMatrix - Матрица переходов (P[i][j] = P(j|i))
     * @param {number} tolerance - Точность вычислений
     * @param {number} maxIterations - Максимальное количество итераций
     * @returns {number[]} Стационарное распределение
     */
    static stationaryDistribution(transitionMatrix, tolerance = 1e-10, maxIterations = 1000) {
        const n = transitionMatrix.length;
        
        // Проверяем что матрица квадратная
        if (!transitionMatrix.every(row => row.length === n)) {
            throw new Error('Матрица переходов должна быть квадратной');
        }

        // Начальное распределение - равномерное
        let distribution = Array(n).fill(1 / n);
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Умножаем распределение на матрицу переходов
            const newDistribution = Array(n).fill(0);
            
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    newDistribution[j] += distribution[i] * transitionMatrix[i][j];
                }
            }

            // Проверяем сходимость
            const distance = this.distance(distribution, newDistribution, 'max');
            if (distance < tolerance) {
                return this.normalize(newDistribution);
            }

            distribution = newDistribution;
        }

        throw new Error('Не удалось найти стационарное распределение за максимальное число итераций');
    }

    /**
     * Вычисляет вероятность принятия строки автоматом
     * @param {number[]} initialState - Начальное распределение
     * @param {number[][][]} transitionMatrices - Матрицы переходов для каждого символа
     * @param {string} inputString - Входная строка
     * @param {number[]} finalStates - Индексы конечных состояний
     * @returns {number} Вероятность принятия строки
     */
    static acceptanceProbability(initialState, transitionMatrices, inputString, finalStates) {
        let currentState = [...initialState];

        // Обрабатываем каждый символ строки
        for (let symbol of inputString) {
            const symbolIndex = this.symbolToIndex(symbol);
            const transitionMatrix = transitionMatrices[symbolIndex];
            
            if (!transitionMatrix) {
                throw new Error(`Нет матрицы переходов для символа: ${symbol}`);
            }

            // Умножаем вектор состояния на матрицу переходов
            const newState = Array(transitionMatrix[0].length).fill(0);
            
            for (let i = 0; i < currentState.length; i++) {
                for (let j = 0; j < newState.length; j++) {
                    newState[j] += currentState[i] * transitionMatrix[i][j];
                }
            }

            currentState = newState;
        }

        // Суммируем вероятности конечных состояний
        return finalStates.reduce((sum, stateIndex) => sum + currentState[stateIndex], 0);
    }

    /**
     * Преобразует символ в индекс (a->0, b->1, ...)
     * @param {string} symbol - Символ
     * @returns {number} Индекс символа
     */
    static symbolToIndex(symbol) {
        return symbol.charCodeAt(0) - 'a'.charCodeAt(0);
    }

    /**
     * Генерирует случайное распределение заданной размерности
     * @param {number} size - Размерность распределения
     * @returns {number[]} Случайное распределение
     */
    static randomDistribution(size) {
        if (size <= 0) {
            throw new Error('Размерность должна быть положительной');
        }

        // Генерируем случайные числа
        const randomNumbers = Array.from({ length: size }, () => Math.random());
        
        // Нормализуем их
        return this.normalize(randomNumbers);
    }

    /**
     * Вычисляет математическое ожидание
     * @param {number[]} values - Значения случайной величины
     * @param {number[]} probabilities - Вероятности значений
     * @returns {number} Математическое ожидание
     */
    static expectedValue(values, probabilities) {
        if (values.length !== probabilities.length) {
            throw new Error('Количество значений и вероятностей должно совпадать');
        }

        const normalizedProbs = this.normalize(probabilities);
        return values.reduce((sum, value, i) => sum + value * normalizedProbs[i], 0);
    }

    /**
     * Вычисляет дисперсию
     * @param {number[]} values - Значения случайной величины
     * @param {number[]} probabilities - Вероятности значений
     * @returns {number} Дисперсия
     */
    static variance(values, probabilities) {
        const mean = this.expectedValue(values, probabilities);
        const normalizedProbs = this.normalize(probabilities);
        
        return values.reduce((sum, value, i) => {
            return sum + normalizedProbs[i] * Math.pow(value - mean, 2);
        }, 0);
    }

    /**
     * Проверяет сходимость последовательности распределений
     * @param {number[][]} sequence - Последовательность распределений
     * @param {number} tolerance - Точность сходимости
     * @returns {boolean} true если последовательность сошлась
     */
    static hasConverged(sequence, tolerance = 1e-6) {
        if (sequence.length < 2) return false;

        const last = sequence[sequence.length - 1];
        const previous = sequence[sequence.length - 2];

        return this.distance(last, previous, 'max') < tolerance;
    }

    /**
     * Вычисляет период состояния в марковской цепи
     * @param {number[][]} transitionMatrix - Матрица переходов
     * @param {number} state - Индекс состояния
     * @returns {number} Период состояния
     */
    static statePeriod(transitionMatrix, state) {
        const n = transitionMatrix.length;
        const visited = new Set();
        let step = 1;

        // Начинаем с состояния state
        let currentState = state;
        visited.add(currentState);

        while (true) {
            // Находим следующее состояние с ненулевой вероятностью
            let nextState = -1;
            for (let i = 0; i < n; i++) {
                if (transitionMatrix[currentState][i] > 0) {
                    nextState = i;
                    break;
                }
            }

            if (nextState === -1) {
                return 0; // Нет переходов - апериодическое
            }

            if (visited.has(nextState)) {
                // Нашли цикл
                return step;
            }

            visited.add(nextState);
            currentState = nextState;
            step++;

            if (step > n * n) {
                // Защита от бесконечного цикла
                return 0;
            }
        }
    }
}

/**
 * Класс для статистического анализа последовательностей состояний
 * @class StateStatistics
 */
class StateStatistics {
    /**
     * Создает анализатор статистики
     * @param {string[]} stateSequence - Последовательность состояний
     */
    constructor(stateSequence = []) {
        this.sequence = stateSequence;
    }

    /**
     * Добавляет состояние в последовательность
     * @param {string} state - Состояние
     */
    addState(state) {
        this.sequence.push(state);
    }

    /**
     * Вычисляет частоты состояний
     * @returns {Object} Объект с частотами {state: frequency}
     */
    getFrequencies() {
        const frequencies = {};
        const total = this.sequence.length;

        if (total === 0) return frequencies;

        for (let state of this.sequence) {
            frequencies[state] = (frequencies[state] || 0) + 1;
        }

        // Преобразуем в вероятности
        for (let state in frequencies) {
            frequencies[state] /= total;
        }

        return frequencies;
    }

    /**
     * Вычисляет эмпирическую энтропию последовательности
     * @returns {number} Энтропия в битах
     */
    getEntropy() {
        const frequencies = this.getFrequencies();
        const probs = Object.values(frequencies);
        return ProbabilityMath.entropy(probs);
    }

    /**
     * Вычисляет переходные вероятности между состояниями
     * @returns {Object} Матрица переходов {from: {to: probability}}
     */
    getTransitionProbabilities() {
        const transitions = {};
        const totalTransitions = {};

        // Инициализируем структуры
        for (let i = 0; i < this.sequence.length - 1; i++) {
            const from = this.sequence[i];
            const to = this.sequence[i + 1];

            if (!transitions[from]) {
                transitions[from] = {};
                totalTransitions[from] = 0;
            }

            transitions[from][to] = (transitions[from][to] || 0) + 1;
            totalTransitions[from]++;
        }

        // Нормализуем вероятности
        for (let from in transitions) {
            for (let to in transitions[from]) {
                transitions[from][to] /= totalTransitions[from];
            }
        }

        return transitions;
    }

    /**
     * Очищает последовательность состояний
     */
    clear() {
        this.sequence = [];
    }

    /**
     * Возвращает длину последовательности
     * @returns {number} Количество состояний
     */
    get length() {
        return this.sequence.length;
    }
}

// Экспорт классов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProbabilityMath, StateStatistics };
} else {
    window.ProbabilityMath = ProbabilityMath;
    window.StateStatistics = StateStatistics;
}