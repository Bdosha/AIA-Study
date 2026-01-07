/**
 * @file Model.js - Центральная модель данных приложения
 * @module core/model
 */

/**
 * Класс основной модели приложения
 * @class AutomataModel
 */
class AutomataModel {
    /**
     * Создает модель приложения
     */
    constructor() {
        this.automata = new Map(); // Map<automatonId, ProbabilisticAutomaton>
        this.currentAutomaton = null; // Текущий активный автомат
        this.simulationHistory = []; // История всех симуляций
        this.settings = {
            acceptanceThreshold: 0.5,
            maxHistorySize: 1000,
            autoNormalize: true,
            theme: 'dark'
        };
        
        // НЕ создаем автомат по умолчанию в конструкторе
        // Пользователь должен явно создать автомат через createAutomaton()
    }

    /**
     * Создает новый автомат
     * @param {string} name - Название автомата
     * @returns {string} ID созданного автомата
     */
    createAutomaton(name = 'New Automaton') {
        const automaton = new ProbabilisticAutomaton(name);
        const id = this.generateId();
        
        this.automata.set(id, automaton);
        this.currentAutomaton = automaton;
        
        console.log("Автомат ", name, "создан (", this.currentAutomaton.name, ")")
        return id;
    }

    /**
     * Удаляет автомат
     * @param {string} automatonId - ID автомата
     */
    removeAutomaton(automatonId) {
        if (!this.automata.has(automatonId)) {
            throw new Error(`Автомат с ID ${automatonId} не существует`);
        }

        // Если удаляем текущий автомат, нужно обновить currentAutomaton
        if (this.currentAutomaton && this.getAutomatonId(this.currentAutomaton) === automatonId) {
            this.automata.delete(automatonId);
            // Выбираем другой автомат или null если больше нет
            this.currentAutomaton = this.automata.size > 0 ? 
                this.automata.values().next().value : null;
        } else {
            this.automata.delete(automatonId);
        }
    }

    /**
     * Получает автомат по ID
     * @param {string} automatonId - ID автомата
     * @returns {ProbabilisticAutomaton} Автомат
     */
    getAutomaton(automatonId) {
        const automaton = this.automata.get(automatonId);
        if (!automaton) {
            throw new Error(`Автомат с ID ${automatonId} не существует`);
        }
        return automaton;
    }

    /**
     * Устанавливает текущий активный автомат
     * @param {string} automatonId - ID автомата
     */
    setCurrentAutomaton(automatonId) {
        this.currentAutomaton = this.getAutomaton(automatonId);
    }

    /**
     * Получает ID автомата
     * @param {ProbabilisticAutomaton} automaton - Автомат
     * @returns {string} ID автомата
     */
    getAutomatonId(automaton) {
        for (let [id, auto] of this.automata) {
            if (auto === automaton) {
                return id;
            }
        }
        return null;
    }

    /**
     * Получает все автоматы
     * @returns {Array} Массив объектов {id, automaton, name}
     */
    getAllAutomata() {
        return Array.from(this.automata.entries()).map(([id, automaton]) => ({
            id,
            automaton,
            name: automaton.name
        }));
    }

    /**
     * Выполняет симуляцию на текущем автомате
     * @param {string} inputString - Входная строка
     * @param {number} numRuns - Количество прогонов (для статистики)
     * @returns {Object} Результаты симуляции
     */
    // simulate(inputString, numRuns = 1) {
    //     if (!this.currentAutomaton) {
    //         throw new Error('Нет активного автомата для симуляции');
    //     }

    //     // Сбрасываем автомат перед симуляцией
    //     this.currentAutomaton.reset();

    //     const startTime = performance.now();
    //     let results;
    //     let multipleResults = null;

    //     if (numRuns === 1) {
    //         // Одиночная симуляция
    //         const finalState = this.currentAutomaton.processString(inputString);
    //         const isAccepted = this.currentAutomaton.isStringAccepted(inputString, this.settings.acceptanceThreshold);
            
    //         results = {
    //             type: 'single',
    //             inputString,
    //             finalState: finalState.clone(),
    //             isAccepted,
    //             acceptanceProbability: this.currentAutomaton.getAcceptanceProbability(inputString),
    //             history: this.currentAutomaton.getHistory(),
    //             automatonId: this.getAutomatonId(this.currentAutomaton),
    //             automatonName: this.currentAutomaton.name
    //         };
    //     } else {
    //         // Множественная симуляция для статистики
    //         const multipleResults = this.currentAutomaton.multipleRuns(inputString, numRuns);
            
    //         results = {
    //             type: 'multiple',
    //             inputString,
    //             numRuns,
    //             results: multipleResults,
    //             automatonId: this.getAutomatonId(this.currentAutomaton),
    //             automatonName: this.currentAutomaton.name
    //         };
    //     }

    //     // Генерация распределения по конечным состояниям
    //     const distribution = {};
    //     for (const run of multipleResults) {
    //         const finalState = run.finalState?.getMostProbableState?.();
    //         if (finalState) {
    //             distribution[finalState] = (distribution[finalState] || 0) + 1;
    //         }
    //     }
    //     results.results.distribution = distribution;

    //     // Событие для UI
    //     document.dispatchEvent(new CustomEvent('simulationComplete', { detail: results }));


    //     const endTime = performance.now();
    //     results.executionTime = endTime - startTime;
    //     results.timestamp = new Date().toISOString();

    //     // Сохраняем в историю
    //     this.addToHistory(results);

    //     return results;
    // }

    /**
     * Выполняет симуляцию строки на текущем автомате
     * @param {string} inputString - входная строка
     * @param {number} numRuns - количество прогонов
     * @returns {Object} результаты симуляции
     */
    simulate(inputString, numRuns = 1) {
        const automaton = this.currentAutomaton;
        if (!automaton) {
            throw new Error('Нет активного автомата для симуляции');
        }

        let results = null;
        let multipleResults = null; // ✅ исправление: объявляем заранее

        // --- МНОЖЕСТВЕННАЯ СИМУЛЯЦИЯ ---
        if (numRuns > 1) {
            // multipleRuns уже реализован в automata.js
            multipleResults = automaton.multipleRuns(inputString, numRuns);

            results = {
                type: 'multiple',
                runs: numRuns,
                results: multipleResults
            };

            // --- вычисляем распределение конечных состояний ---
            const distribution = {};
            if (multipleResults && Array.isArray(multipleResults)) {
                for (const run of multipleResults) {
                    const finalState = run.finalState?.getMostProbableState?.();
                    if (finalState) {
                        distribution[finalState] = (distribution[finalState] || 0) + 1;
                    }
                }
            }
            results.distribution = distribution;

            // --- уведомляем UI (для визуализации) ---
            document.dispatchEvent(new CustomEvent('simulationComplete', { detail: results }));

            return results;
        }

        // --- ОДИНОЧНАЯ СИМУЛЯЦИЯ ---
        const singleResult = automaton.simulate(inputString);

        results = {
            type: 'single',
            finalState: singleResult.finalState,
            isAccepted: singleResult.isAccepted,
            acceptanceProbability: singleResult.acceptanceProbability,
            results: singleResult
        };

        // уведомляем UI
        document.dispatchEvent(new CustomEvent('simulationComplete', { detail: results }));

        return results;
    }


    /**
     * Анализирует свойства текущего автомата
     * @returns {Object} Результаты анализа
     */
    // analyzeAutomaton() {
    //     if (!this.currentAutomaton) {
    //         // Возвращаем анализ для пустого автомата вместо ошибки
    //         return {
    //             isValid: false,
    //             statesCount: 0,
    //             alphabetSize: 0,
    //             initialStates: [],
    //             finalStates: [],
    //             properties: {
    //                 markov: { 
    //                     isMarkov: false, 
    //                     memoryless: false,
    //                     stationary: false,
    //                     description: "Нет автомата для анализа" 
    //                 },
    //                 ergodicity: { 
    //                     isErgodic: false, 
    //                     isIrreducible: false,
    //                     isAperiodic: false,
    //                     statesCount: 0,
    //                     description: "Нет автомата для анализа" 
    //                 },
    //                 transitionStats: { 
    //                     totalTransitions: 0, 
    //                     symbolStats: {}, 
    //                     stateStats: {} 
    //                 }
    //             }
    //         };
    //     }

    //     // Проверяем валидность автомата
    //     const isValid = this.currentAutomaton.states.size > 0 && 
    //                 this.currentAutomaton.initialStates.size > 0;

    //     const analysis = {
    //         isValid: isValid,
    //         statesCount: this.currentAutomaton.states.size,
    //         alphabetSize: this.currentAutomaton.alphabet.size,
    //         initialStates: Array.from(this.currentAutomaton.initialStates),
    //         finalStates: Array.from(this.currentAutomaton.finalStates),
    //         properties: {}
    //     };

    //     // Анализ марковских свойств
    //     analysis.properties.markov = this.analyzeMarkovProperties();
        
    //     // Анализ эргодичности
    //     analysis.properties.ergodicity = this.analyzeErgodicity();
        
    //     // Статистика переходов
    //     analysis.properties.transitionStats = this.analyzeTransitionStats();

    //     return analysis;
    // }

    /**
     * Анализирует марковские свойства автомата
     * @returns {Object} Результаты анализа марковских свойств
     */
    // analyzeMarkovProperties() {
    //     if (!this.currentAutomaton || this.currentAutomaton.states.size === 0) {
    //         return {
    //             isMarkov: false,
    //             memoryless: false,
    //             stationary: false,
    //             description: "Нет состояний для анализа"
    //         };
    //     }

    //     return {
    //         isMarkov: true,
    //         memoryless: true,
    //         stationary: this.currentAutomaton.alphabet.size > 0,
    //         description: "Вероятностный автомат обладает свойством Маркова по определению"
    //     };
    // }

    /**
     * Анализирует эргодичность автомата
     * @returns {Object} Результаты анализа эргодичности
     */
    // analyzeErgodicity() {
    //     if (!this.currentAutomaton || this.currentAutomaton.states.size === 0) {
    //         return {
    //             isErgodic: false,
    //             isIrreducible: false,
    //             isAperiodic: false,
    //             statesCount: 0,
    //             description: "Нет состояний для анализа"
    //         };
    //     }

    //     const states = Array.from(this.currentAutomaton.states.keys());
        
    //     return {
    //         isErgodic: this.checkErgodicity(),
    //         isIrreducible: this.checkIrreducibility(),
    //         isAperiodic: this.checkAperiodicity(),
    //         statesCount: states.length,
    //         description: "Базовый анализ эргодичности"
    //     };
    // }

    /**
     * Анализирует статистику переходов
     * @returns {Object} Статистика переходов
     */
    analyzeTransitionStats() {
        const stats = {
            totalTransitions: 0,
            symbolStats: {},
            stateStats: {}
        };

        if (!this.currentAutomaton) {
            return stats;
        }

        for (let symbol of this.currentAutomaton.alphabet) {
            const matrix = this.currentAutomaton.transitionMatrices.getMatrix(symbol);
            const fromStates = matrix.getFromStates();
            
            stats.symbolStats[symbol] = {
                valid: matrix.isValid(Array.from(this.currentAutomaton.states.keys())),
                fromStatesCount: fromStates.length,
                transitionsCount: 0
            };

            for (let fromState of fromStates) {
                const transitions = matrix.getTransitions(fromState);
                stats.symbolStats[symbol].transitionsCount += Object.keys(transitions).length;
                stats.totalTransitions += Object.keys(transitions).length;
            }
        }

        return stats;
    }

    /**
     * Проверяет стационарность автомата
     * @returns {boolean} true если автомат стационарен
     */
    checkStationarity() {
        return this.currentAutomaton && this.currentAutomaton.alphabet.size > 0;
    }

    /**
     * Проверяет эргодичность автомата
     * @returns {boolean} true если автомат эргодичен
     */
    // checkErgodicity() {
    //     if (!this.currentAutomaton || this.currentAutomaton.states.size === 0) {
    //         return false;
    //     }
    //     return this.checkIrreducibility() && this.checkAperiodicity();
    // }

    /**
     * Проверяет неприводимость автомата
     * @returns {boolean} true если автомат неприводим
     */
    // checkIrreducibility() {
    //     if (!this.currentAutomaton || this.currentAutomaton.states.size === 0) {
    //         return false;
    //     }
        
        // Упрощенная проверка: считаем неприводимым если есть хотя бы один символ с переходами
    //     for (let symbol of this.currentAutomaton.alphabet) {
    //         const matrix = this.currentAutomaton.transitionMatrices.getMatrix(symbol);
    //         if (matrix.getFromStates().length > 0) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    /**
     * Проверяет апериодичность автомата
     * @returns {boolean} true если автомат апериодичен
     */
    // checkAperiodicity() {
    //     // Упрощенная проверка - для учебных целей считаем апериодичным
    //     return this.currentAutomaton && this.currentAutomaton.states.size > 0;
    // }

    /**
     * Добавляет результат симуляции в историю
     * @param {Object} result - Результат симуляции
     */
    addToHistory(result) {
        this.simulationHistory.unshift(result);
        
        // Ограничиваем размер истории
        if (this.simulationHistory.length > this.settings.maxHistorySize) {
            this.simulationHistory = this.simulationHistory.slice(0, this.settings.maxHistorySize);
        }
    }

    /**
     * Очищает историю симуляций
     */
    clearHistory() {
        this.simulationHistory = [];
    }

    /**
     * Экспортирует модель в JSON
     * @returns {Object} Объект для сериализации
     */
    toJSON() {
        const automataData = {};
        
        for (let [id, automaton] of this.automata) {
            automataData[id] = automaton.toJSON();
        }

        return {
            automata: automataData,
            currentAutomatonId: this.currentAutomaton ? this.getAutomatonId(this.currentAutomaton) : null,
            settings: this.settings,
            simulationHistory: this.simulationHistory.slice(0, 10) // Сохраняем только последние 10
        };
    }

    /**
     * Импортирует модель из JSON
     * @param {Object} json - Объект с данными модели
     */
    fromJSON(json) {
        this.automata.clear();
        this.simulationHistory = json.simulationHistory || [];

        // Восстанавливаем автоматы
        if (json.automata) {
            for (let id in json.automata) {
                const automatonData = json.automata[id];
                const automaton = new ProbabilisticAutomaton();
                automaton.fromJSON(automatonData);
                this.automata.set(id, automaton);
            }
        }

        // Восстанавливаем текущий автомат
        if (json.currentAutomatonId && this.automata.has(json.currentAutomatonId)) {
            this.currentAutomaton = this.automata.get(json.currentAutomatonId);
        } else if (this.automata.size > 0) {
            // Если текущий не указан, берем первый
            this.currentAutomaton = this.automata.values().next().value;
        } else {
            this.currentAutomaton = null;
        }

        // Восстанавливаем настройки
        if (json.settings) {
            this.settings = { ...this.settings, ...json.settings };
        }
    }

    /**
     * Генерирует уникальный ID
     * @returns {string} Уникальный ID
     */
    generateId() {
        return 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Сбрасывает модель к начальному состоянию
     */
    reset() {
        this.automata.clear();
        this.currentAutomaton = null;
        this.simulationHistory = [];
        // Создаем пустой автомат по умолчанию для удобства
        this.createAutomaton('Default Automaton');
    }

    /**
     * Получает статистику по модели
     * @returns {Object} Статистика модели
     */
    getStats() {
        return {
            totalAutomata: this.automata.size,
            totalSimulations: this.simulationHistory.length,
            currentAutomaton: this.currentAutomaton ? this.currentAutomaton.name : 'None',
            settings: this.settings
        };
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutomataModel };
} else {
    window.AutomataModel = AutomataModel;
}