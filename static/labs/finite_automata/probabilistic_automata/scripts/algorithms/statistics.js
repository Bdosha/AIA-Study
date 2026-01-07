/**
 * @file Statistics.js - Статистический анализ вероятностных автоматов
 * @module algorithms/statistics
 */

/**
 * Класс для статистического анализа автоматов
 * @class StatisticsAnalyzer
 */
class StatisticsAnalyzer {
    /**
     * Выполняет полный статистический анализ автомата
     * @param {ProbabilisticAutomaton} automaton - Автомат для анализа
     * @param {Object} options - Опции анализа
     * @returns {Object} Результаты статистического анализа
     */
    static analyze(automaton, options = {}) {
        if (!automaton || automaton.states.size === 0) {
            return this.getEmptyAnalysis();
        }

        const analysis = {
            basicStats: this.getBasicStatistics(automaton),
            stateStats: this.analyzeStates(automaton),
            transitionStats: this.analyzeTransitions(automaton),
            entropyStats: this.analyzeEntropy(automaton),
            performanceStats: this.analyzePerformance(automaton, options),
            distributionStats: this.analyzeDistributions(automaton),
            recommendations: []
        };

        // Генерация рекомендаций на основе анализа
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    /**
     * Получает базовую статистику автомата
     * @param {ProbabilisticAutomaton} automaton - Автомат для анализа
     * @returns {Object} Базовая статистика
     */
    static getBasicStatistics(automaton) {
        const states = Array.from(automaton.states.keys());
        const totalTransitions = this.countTotalTransitions(automaton);
        
        return {
            totalStates: states.length,
            initialStateCount: automaton.initialStates.size,
            finalStateCount: automaton.finalStates.size,
            alphabetSize: automaton.alphabet.size,
            totalTransitions: totalTransitions,
            averageTransitionsPerState: states.length > 0 ? totalTransitions / states.length : 0,
            density: this.calculateTransitionDensity(automaton)
        };
    }

    /**
     * Подсчитывает общее количество переходов
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {number} Общее количество переходов
     */
    static countTotalTransitions(automaton) {
        let total = 0;
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                total += Object.keys(transitions).length;
            }
        }
        
        return total;
    }

    /**
     * Вычисляет плотность переходов (отношение реальных переходов к возможным)
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {number} Плотность переходов (0-1)
     */
    static calculateTransitionDensity(automaton) {
        const totalTransitions = this.countTotalTransitions(automaton);
        const possibleTransitions = automaton.states.size * automaton.states.size * automaton.alphabet.size;
        
        return possibleTransitions > 0 ? totalTransitions / possibleTransitions : 0;
    }

    /**
     * Анализирует статистику состояний
     * @param {ProbabilisticAutomaton} automaton - Автомат для анализа
     * @returns {Object} Статистика состояний
     */
    static analyzeStates(automaton) {
        const states = Array.from(automaton.states.values());
        
        return {
            stateTypes: {
                initial: Array.from(automaton.initialStates),
                final: Array.from(automaton.finalStates),
                regular: states.filter(s => !s.isInitial && !s.isFinal).map(s => s.id)
            },
            degreeStats: this.calculateStateDegrees(automaton),
            centrality: this.calculateStateCentrality(automaton)
        };
    }

    /**
     * Вычисляет степени состояний (входные и выходные)
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Статистика степеней
     */
    static calculateStateDegrees(automaton) {
        const inDegree = {};
        const outDegree = {};
        
        // Инициализация
        for (let state of automaton.states.keys()) {
            inDegree[state] = 0;
            outDegree[state] = 0;
        }
        
        // Подсчет степеней
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                outDegree[fromState] += Object.keys(transitions).length;
                
                for (let toState in transitions) {
                    inDegree[toState] = (inDegree[toState] || 0) + 1;
                }
            }
        }
        
        // Статистика
        const inDegrees = Object.values(inDegree);
        const outDegrees = Object.values(outDegree);
        
        return {
            inDegree: inDegree,
            outDegree: outDegree,
            avgInDegree: inDegrees.length > 0 ? this.average(inDegrees) : 0,
            avgOutDegree: outDegrees.length > 0 ? this.average(outDegrees) : 0,
            maxInDegree: inDegrees.length > 0 ? Math.max(...inDegrees) : 0,
            maxOutDegree: outDegrees.length > 0 ? Math.max(...outDegrees) : 0,
            minInDegree: inDegrees.length > 0 ? Math.min(...inDegrees) : 0,
            minOutDegree: outDegrees.length > 0 ? Math.min(...outDegrees) : 0
        };
    }

    /**
     * Вычисляет центральность состояний
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Центральность состояний
     */
    static calculateStateCentrality(automaton) {
        const states = Array.from(automaton.states.keys());
        const centrality = {};
        
        if (states.length === 0) return centrality;
        
        // Упрощенный расчет центральности на основе степеней
        const degreeStats = this.calculateStateDegrees(automaton);
        
        for (let state of states) {
            const totalDegree = degreeStats.inDegree[state] + degreeStats.outDegree[state];
            const maxPossibleDegree = (states.length - 1) * 2; // Вход + выход
            centrality[state] = maxPossibleDegree > 0 ? totalDegree / maxPossibleDegree : 0;
        }
        
        return centrality;
    }

    /**
     * Анализирует статистику переходов
     * @param {ProbabilisticAutomaton} automaton - Автомат для анализа
     * @returns {Object} Статистика переходов
     */
    static analyzeTransitions(automaton) {
        return {
            bySymbol: this.analyzeTransitionsBySymbol(automaton),
            probabilityDistribution: this.analyzeTransitionProbabilities(automaton),
            determinismAnalysis: this.analyzeDeterminism(automaton)
        };
    }

    /**
     * Анализирует переходы по символам
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Статистика по символам
     */
    static analyzeTransitionsBySymbol(automaton) {
        const symbolStats = {};
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            symbolStats[symbol] = {
                fromStateCount: fromStates.length,
                totalTransitions: 0,
                deterministicTransitions: 0,
                probabilisticTransitions: 0,
                avgProbability: 0
            };
            
            let totalProb = 0;
            let transitionCount = 0;
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                const transitionCountFromState = Object.keys(transitions).length;
                symbolStats[symbol].totalTransitions += transitionCountFromState;
                transitionCount += transitionCountFromState;
                
                // Анализ детерминированности
                const probs = Object.values(transitions);
                const isDeterministic = probs.some(p => Math.abs(p - 1.0) < 0.0001);
                
                if (isDeterministic) {
                    symbolStats[symbol].deterministicTransitions++;
                } else {
                    symbolStats[symbol].probabilisticTransitions++;
                }
                
                // Сумма вероятностей для среднего
                totalProb += probs.reduce((sum, p) => sum + p, 0);
            }
            
            symbolStats[symbol].avgProbability = transitionCount > 0 ? totalProb / transitionCount : 0;
        }
        
        return symbolStats;
    }

    /**
     * Анализирует распределение вероятностей переходов
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Анализ распределения вероятностей
     */
    static analyzeTransitionProbabilities(automaton) {
        const allProbabilities = [];
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                const probs = Object.values(transitions);
                allProbabilities.push(...probs);
            }
        }
        
        if (allProbabilities.length === 0) {
            return {
                probabilities: [],
                mean: 0,
                median: 0,
                stdDev: 0,
                min: 0,
                max: 0,
                distribution: { type: "empty", bins: {} }
            };
        }
        
        return {
            probabilities: allProbabilities,
            mean: this.average(allProbabilities),
            median: this.median(allProbabilities),
            stdDev: this.standardDeviation(allProbabilities),
            min: Math.min(...allProbabilities),
            max: Math.max(...allProbabilities),
            distribution: this.analyzeProbabilityDistribution(allProbabilities)
        };
    }

    /**
     * Анализирует распределение вероятностей
     * @param {number[]} probabilities - Массив вероятностей
     * @returns {Object} Анализ распределения
     */
    static analyzeProbabilityDistribution(probabilities) {
        if (probabilities.length === 0) {
            return { type: "empty", bins: {} };
        }
        
        // Создаем бины для гистограммы
        const bins = {
            "0-0.1": 0, "0.1-0.2": 0, "0.2-0.3": 0, "0.3-0.4": 0, "0.4-0.5": 0,
            "0.5-0.6": 0, "0.6-0.7": 0, "0.7-0.8": 0, "0.8-0.9": 0, "0.9-1.0": 0
        };
        
        for (let prob of probabilities) {
            if (prob <= 0.1) bins["0-0.1"]++;
            else if (prob <= 0.2) bins["0.1-0.2"]++;
            else if (prob <= 0.3) bins["0.2-0.3"]++;
            else if (prob <= 0.4) bins["0.3-0.4"]++;
            else if (prob <= 0.5) bins["0.4-0.5"]++;
            else if (prob <= 0.6) bins["0.5-0.6"]++;
            else if (prob <= 0.7) bins["0.6-0.7"]++;
            else if (prob <= 0.8) bins["0.7-0.8"]++;
            else if (prob <= 0.9) bins["0.8-0.9"]++;
            else bins["0.9-1.0"]++;
        }
        
        // Определяем тип распределения
        const deterministicCount = probabilities.filter(p => Math.abs(p - 1.0) < 0.0001).length;
        const uniformCount = probabilities.filter(p => p > 0.4 && p < 0.6).length;
        
        let type = "mixed";
        if (deterministicCount / probabilities.length > 0.8) type = "deterministic";
        else if (uniformCount / probabilities.length > 0.6) type = "uniform";
        
        return { type, bins };
    }

    /**
     * Анализирует детерминированность автомата
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Анализ детерминированности
     */
    static analyzeDeterminism(automaton) {
        let totalStateSymbolPairs = 0;
        let deterministicPairs = 0;
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            totalStateSymbolPairs += fromStates.length;
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                const probs = Object.values(transitions);
                
                // Пара (состояние, символ) детерминированная если есть вероятность 1.0
                if (probs.some(p => Math.abs(p - 1.0) < 0.0001)) {
                    deterministicPairs++;
                }
            }
        }
        
        const determinismRatio = totalStateSymbolPairs > 0 ? deterministicPairs / totalStateSymbolPairs : 0;
        
        return {
            determinismRatio: determinismRatio,
            classification: determinismRatio > 0.8 ? "mostly_deterministic" :
                           determinismRatio < 0.2 ? "mostly_probabilistic" : "mixed",
            totalStateSymbolPairs: totalStateSymbolPairs,
            deterministicPairs: deterministicPairs
        };
    }

    /**
     * Анализирует энтропийные характеристики
     * @param {ProbabilisticAutomaton} automaton - Автомат для анализа
     * @returns {Object} Энтропийная статистика
     */
    static analyzeEntropy(automaton) {
        return {
            stateEntropy: this.calculateStateEntropy(automaton),
            transitionEntropy: this.calculateTransitionEntropy(automaton),
            predictability: this.analyzePredictability(automaton)
        };
    }

    /**
     * Вычисляет энтропию состояний
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Энтропия состояний
     */
    static calculateStateEntropy(automaton) {
        const states = Array.from(automaton.states.keys());
        
        // Энтропия начального распределения
        const initialProbs = Object.values(automaton.initialDistribution?.states || {});
        const initialEntropy = initialProbs.length > 0 ? ProbabilityMath.entropy(initialProbs) : 0;
        
        // Средняя энтропия переходов из состояний
        let totalTransitionEntropy = 0;
        let stateCount = 0;
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                const probs = Object.values(transitions);
                
                if (probs.length > 0) {
                    totalTransitionEntropy += ProbabilityMath.entropy(probs);
                    stateCount++;
                }
            }
        }
        
        const avgTransitionEntropy = stateCount > 0 ? totalTransitionEntropy / stateCount : 0;
        const maxPossibleEntropy = states.length > 0 ? Math.log2(states.length) : 0;
        
        return {
            initialEntropy: initialEntropy,
            averageTransitionEntropy: avgTransitionEntropy,
            maxPossibleEntropy: maxPossibleEntropy,
            entropyRatio: maxPossibleEntropy > 0 ? avgTransitionEntropy / maxPossibleEntropy : 0
        };
    }

    /**
     * Вычисляет энтропию переходов
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Энтропия переходов
     */
    static calculateTransitionEntropy(automaton) {
        const allProbabilities = [];
        
        for (let symbol of automaton.alphabet) {
            const matrix = automaton.transitionMatrices.getMatrix(symbol);
            if (!matrix) continue;
                
            const fromStates = matrix.getFromStates();
            
            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                const probs = Object.values(transitions);
                allProbabilities.push(...probs);
            }
        }
        
        if (allProbabilities.length === 0) {
            return {
                overallEntropy: 0,
                maxEntropy: 0,
                normalizedEntropy: 0
            };
        }
        
        const overallEntropy = ProbabilityMath.entropy(allProbabilities);
        const maxEntropy = Math.log2(allProbabilities.length);
        
        return {
            overallEntropy: overallEntropy,
            maxEntropy: maxEntropy,
            normalizedEntropy: maxEntropy > 0 ? overallEntropy / maxEntropy : 0
        };
    }

    /**
     * Анализирует предсказуемость автомата
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Анализ предсказуемости
     */
    static analyzePredictability(automaton) {
        const determinismAnalysis = this.analyzeDeterminism(automaton);
        const entropyAnalysis = this.calculateStateEntropy(automaton);
        
        const predictability = 1 - entropyAnalysis.entropyRatio;
        
        return {
            predictability: Math.max(0, Math.min(1, predictability)),
            confidence: determinismAnalysis.determinismRatio,
            classification: predictability > 0.7 ? "high" : predictability > 0.3 ? "medium" : "low"
        };
    }

    /**
     * Анализирует производительностные характеристики
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @param {Object} options - Опции анализа
     * @returns {Object} Производительностная статистика
     */
    static analyzePerformance(automaton, options = {}) {
        const testStrings = options.testStrings || ["a", "ab", "abc"];
        const results = [];
        
        // Сохраняем текущее состояние автомата
        const originalState = automaton.currentState ? automaton.currentState.clone() : null;
        
        for (let testString of testStrings) {
            const startTime = performance.now();
            
            try {
                // Сбрасываем автомат для чистого теста
                automaton.reset();
                const finalState = automaton.processString(testString);
                const endTime = performance.now();
                
                results.push({
                    inputLength: testString.length,
                    executionTime: endTime - startTime,
                    success: true,
                    finalState: finalState.toString()
                });
            } catch (error) {
                results.push({
                    inputLength: testString.length,
                    executionTime: 0,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Восстанавливаем исходное состояние
        if (originalState) {
            automaton.currentState = originalState;
        }
        
        const successfulTests = results.filter(r => r.success);
        const timesPerSymbol = successfulTests.map(r => r.executionTime / Math.max(1, r.inputLength));
        
        return {
            performanceTests: results,
            averageTimePerSymbol: timesPerSymbol.length > 0 ? this.average(timesPerSymbol) : 0,
            successRate: results.length > 0 ? successfulTests.length / results.length : 0,
            complexity: this.estimateComplexity(automaton)
        };
    }

    /**
     * Оценивает вычислительную сложность
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {string} Оценка сложности
     */
    static estimateComplexity(automaton) {
        const stateCount = automaton.states.size;
        
        if (stateCount === 0) return "O(1)";
        if (stateCount <= 5) return "O(n) [малый размер]";
        if (stateCount <= 20) return "O(n log n) [средний размер]";
        return "O(n²) [большой размер]";
    }

    /**
     * Анализирует распределения вероятностей
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Анализ распределений
     */
    static analyzeDistributions(automaton) {
        return {
            stationaryDistribution: this.estimateStationaryDistribution(automaton),
            initialDistribution: automaton.initialDistribution?.states || {},
            equilibriumAnalysis: this.analyzeEquilibrium(automaton)
        };
    }

    /**
     * Оценивает стационарное распределение
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Оценка стационарного распределения
     */
    static estimateStationaryDistribution(automaton) {
        // Упрощенная оценка стационарного распределения
        const states = Array.from(automaton.states.keys());
        const stationary = {};
        
        if (states.length === 0) {
            return {
                distribution: {},
                confidence: 0,
                method: "empty"
            };
        }
        
        // Равномерное распределение как базовая оценка
        const uniformProb = 1 / states.length;
        for (let state of states) {
            stationary[state] = uniformProb;
        }
        
        return {
            distribution: stationary,
            confidence: 0.5, // Низкая уверенность в упрощенной оценке
            method: "uniform_estimate"
        };
    }

    /**
     * Анализирует равновесные свойства
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {Object} Анализ равновесия
     */
    static analyzeEquilibrium(automaton) {
        const states = Array.from(automaton.states.keys());
        
        return {
            hasEquilibrium: states.length > 0,
            equilibriumType: this.determineEquilibriumType(automaton),
            convergenceTime: this.estimateConvergenceTime(automaton)
        };
    }

    /**
     * Определяет тип равновесия
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {string} Тип равновесия
     */
    static determineEquilibriumType(automaton) {
        const determinism = this.analyzeDeterminism(automaton);
        
        if (determinism.determinismRatio > 0.9) return "deterministic_equilibrium";
        if (determinism.determinismRatio < 0.1) return "probabilistic_equilibrium";
        return "mixed_equilibrium";
    }

    /**
     * Оценивает время сходимости к равновесию
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {number} Оценка времени сходимости
     */
    static estimateConvergenceTime(automaton) {
        const stateCount = automaton.states.size;
        const density = this.calculateTransitionDensity(automaton);
        
        // Эвристическая оценка
        return Math.ceil(stateCount * (1 + (1 - density) * 10));
    }

    /**
     * Генерирует рекомендации на основе анализа
     * @param {Object} analysis - Результаты анализа
     * @returns {string[]} Массив рекомендаций
     */
    static generateRecommendations(analysis) {
        const recommendations = [];

        // Рекомендации по состояниям
        if (analysis.basicStats.initialStateCount === 0) {
            recommendations.push("Добавьте начальные состояния для возможности запуска симуляций");
        }

        if (analysis.basicStats.finalStateCount === 0) {
            recommendations.push("Рассмотрите добавление конечных состояний для анализа принятия строк");
        }

        // Рекомендации по переходам
        if (analysis.basicStats.density < 0.1) {
            recommendations.push("Низкая плотность переходов. Рассмотрите добавление дополнительных переходов");
        }

        if (analysis.transitionStats.determinismAnalysis.determinismRatio < 0.2) {
            recommendations.push("Высокая неопределенность. Добавьте детерминированные переходы для предсказуемости");
        }

        // Рекомендации по производительности
        if (analysis.performanceStats.averageTimePerSymbol > 10) {
            recommendations.push("Высокое время выполнения. Оптимизируйте структуру автомата");
        }

        // Рекомендации по энтропии
        if (analysis.entropyStats.predictability.classification === "low") {
            recommendations.push("Низкая предсказуемость. Упростите структуру переходов");
        }

        return recommendations;
    }

    /**
     * Вычисляет среднее значение массива
     * @param {number[]} values - Массив значений
     * @returns {number} Среднее значение
     */
    static average(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Вычисляет медиану массива
     * @param {number[]} values - Массив значений
     * @returns {number} Медиана
     */
    static median(values) {
        if (!values || values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 ? 
            (sorted[mid - 1] + sorted[mid]) / 2 : 
            sorted[mid];
    }

    /**
     * Вычисляет стандартное отклонение
     * @param {number[]} values - Массив значений
     * @returns {number} Стандартное отклонение
     */
    static standardDeviation(values) {
        if (!values || values.length === 0) return 0;
        
        const avg = this.average(values);
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.average(squareDiffs);
        
        return Math.sqrt(avgSquareDiff);
    }

    /**
     * Создает отчет анализа в читаемом формате
     * @param {Object} analysis - Результаты анализа
     * @returns {string} Текстовый отчет
     */
    static generateReport(analysis) {
        let report = "=== СТАТИСТИЧЕСКИЙ АНАЛИЗ АВТОМАТА ===\n\n";
        
        report += "БАЗОВАЯ СТАТИСТИКА:\n";
        report += `- Состояний: ${analysis.basicStats.totalStates}\n`;
        report += `- Начальных состояний: ${analysis.basicStats.initialStateCount}\n`;
        report += `- Конечных состояний: ${analysis.basicStats.finalStateCount}\n`;
        report += `- Символов алфавита: ${analysis.basicStats.alphabetSize}\n`;
        report += `- Всего переходов: ${analysis.basicStats.totalTransitions}\n`;
        report += `- Плотность переходов: ${(analysis.basicStats.density * 100).toFixed(1)}%\n\n`;
        
        report += "СТАТИСТИКА ПЕРЕХОДОВ:\n";
        report += `- Детерминированность: ${(analysis.transitionStats.determinismAnalysis.determinismRatio * 100).toFixed(1)}%\n`;
        
        if (analysis.transitionStats.probabilityDistribution.probabilities.length > 0) {
            report += `- Средняя вероятность: ${(analysis.transitionStats.probabilityDistribution.mean * 100).toFixed(1)}%\n`;
            report += `- Тип распределения: ${analysis.transitionStats.probabilityDistribution.distribution.type}\n`;
        } else {
            report += `- Нет данных о вероятностях переходов\n`;
        }
        report += "\n";
        
        report += "ЭНТРОПИЙНЫЙ АНАЛИЗ:\n";
        report += `- Предсказуемость: ${(analysis.entropyStats.predictability.predictability * 100).toFixed(1)}%\n`;
        report += `- Уровень предсказуемости: ${analysis.entropyStats.predictability.classification}\n`;
        report += `- Энтропия начального состояния: ${analysis.entropyStats.stateEntropy.initialEntropy.toFixed(3)}\n\n`;
        
        report += "ПРОИЗВОДИТЕЛЬНОСТЬ:\n";
        report += `- Среднее время на символ: ${analysis.performanceStats.averageTimePerSymbol.toFixed(2)}мс\n`;
        report += `- Успешных тестов: ${(analysis.performanceStats.successRate * 100).toFixed(1)}%\n`;
        report += `- Вычислительная сложность: ${analysis.performanceStats.complexity}\n\n`;
        
        if (analysis.recommendations.length > 0) {
            report += "РЕКОМЕНДАЦИИ:\n";
            analysis.recommendations.forEach((rec, index) => {
                report += `${index + 1}. ${rec}\n`;
            });
        }
        
        return report;
    }

    /**
     * Возвращает пустой анализ для некорректного автомата
     * @returns {Object} Пустой анализ
     */
    static getEmptyAnalysis() {
        return {
            basicStats: {
                totalStates: 0,
                initialStateCount: 0,
                finalStateCount: 0,
                alphabetSize: 0,
                totalTransitions: 0,
                averageTransitionsPerState: 0,
                density: 0
            },
            stateStats: {
                stateTypes: { initial: [], final: [], regular: [] },
                degreeStats: {},
                centrality: {}
            },
            transitionStats: {
                bySymbol: {},
                probabilityDistribution: { probabilities: [], distribution: { type: "empty", bins: {} } },
                determinismAnalysis: { determinismRatio: 0, classification: "empty", totalStateSymbolPairs: 0, deterministicPairs: 0 }
            },
            entropyStats: {
                stateEntropy: { initialEntropy: 0, averageTransitionEntropy: 0, maxPossibleEntropy: 0, entropyRatio: 0 },
                transitionEntropy: { overallEntropy: 0, maxEntropy: 0, normalizedEntropy: 0 },
                predictability: { predictability: 0, confidence: 0, classification: "empty" }
            },
            performanceStats: {
                performanceTests: [],
                averageTimePerSymbol: 0,
                successRate: 0,
                complexity: "O(1)"
            },
            distributionStats: {
                stationaryDistribution: { distribution: {}, confidence: 0, method: "empty" },
                initialDistribution: {},
                equilibriumAnalysis: { hasEquilibrium: false, equilibriumType: "empty", convergenceTime: 0 }
            },
            recommendations: ["Автомат не существует или не имеет состояний"]
        };
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatisticsAnalyzer };
} else {
    window.StatisticsAnalyzer = StatisticsAnalyzer;
}
