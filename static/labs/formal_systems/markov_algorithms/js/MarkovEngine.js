/**
 * MarkovEngine.js
 * Модуль интерпретатора нормальных алгорифмов Маркова
 * 
 * Реализует классический алгоритм выполнения НАМ согласно
 * определению А.А. Маркова с поддержкой обычных и заключительных правил.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

/**
 * Класс правила подстановки нормального алгоритма Маркова
 */
class MarkovRule {
    /**
     * Создает новое правило подстановки
     * @param {string} pattern - Образец для замены (левая часть правила)
     * @param {string} replacement - Заменяющая строка (правая часть правила)
     * @param {boolean} isFinal - Является ли правило заключительным
     */
    constructor(pattern, replacement, isFinal = false) {
        this.pattern = pattern;
        this.replacement = replacement;
        this.isFinal = isFinal;
    }

    /**
     * Возвращает строковое представление правила
     * @returns {string} Строка вида "pattern → replacement" или "pattern →. replacement"
     */
    toString() {
        const arrow = this.isFinal ? '→.' : '→';
        return `${this.pattern} ${arrow} ${this.replacement}`;
    }
}

/**
 * Класс шага выполнения алгоритма (для истории)
 */
class ExecutionStep {
    /**
     * Создает запись о шаге выполнения
     * @param {number} stepNumber - Номер шага
     * @param {string} beforeString - Строка до применения правила
     * @param {string} afterString - Строка после применения правила
     * @param {MarkovRule} rule - Примененное правило
     * @param {number} position - Позиция вхождения образца в строке
     */
    constructor(stepNumber, beforeString, afterString, rule, position) {
        this.stepNumber = stepNumber;
        this.beforeString = beforeString;
        this.afterString = afterString;
        this.rule = rule;
        this.position = position;
        this.timestamp = Date.now();
    }
}

/**
 * Основной класс интерпретатора нормальных алгорифмов Маркова
 */
export class MarkovEngine {
    /**
     * Создает новый экземпляр интерпретатора
     */
    constructor() {
        this.alphabet = [];
        this.rules = [];
        this.currentString = '';
        this.history = [];
        this.isRunning = false;
        this.maxSteps = 1000; // Ограничение на количество шагов
        this.currentStep = 0;
        this.startTime = 0;
    }

    /**
     * Устанавливает алфавит символов
     * @param {string} alphabetString - Строка с символами алфавита
     * @throws {Error} Если алфавит пустой
     */
    setAlphabet(alphabetString) {
        // Разбираем строку на отдельные символы
        this.alphabet = alphabetString
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (this.alphabet.length === 0) {
            throw new Error('Алфавит не может быть пустым');
        }
    }

    /**
     * Добавляет правило подстановки
     * @param {string} pattern - Образец для замены
     * @param {string} replacement - Заменяющая строка
     * @param {boolean} isFinal - Является ли правило заключительным
     * @throws {Error} Если образец пустой
     */
    addRule(pattern, replacement, isFinal = false) {
        if (pattern === '') {
            throw new Error('Образец правила не может быть пустым');
        }

        if (this.rules.length >= 50) {
            throw new Error('Превышено максимальное количество правил (50)');
        }

        this.rules.push(new MarkovRule(pattern, replacement, isFinal));
    }

    /**
     * Очищает все правила
     */
    clearRules() {
        this.rules = [];
    }

    /**
     * Устанавливает входную строку
     * @param {string} inputString - Входная строка для обработки
     * @throws {Error} Если строка превышает максимальную длину
     */
    setInputString(inputString) {
        if (inputString.length > 1000) {
            throw new Error('Входная строка превышает максимальную длину (1000 символов)');
        }
        this.currentString = inputString;
    }

    /**
     * Валидирует корректность входных данных
     * @returns {Object} Объект с полем valid и массивом errors
     */
    validate() {
        const errors = [];

        if (this.alphabet.length === 0) {
            errors.push('Алфавит не задан');
        }

        if (this.rules.length === 0) {
            errors.push('Не задано ни одного правила');
        }

        if (this.currentString === '') {
            errors.push('Входная строка пуста');
        }

        // Проверяем, что все символы входной строки принадлежат алфавиту
        // (для упрощения не будем строго проверять это условие)

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Находит самое левое вхождение образца в строке
     * @param {string} str - Строка для поиска
     * @param {string} pattern - Образец для поиска
     * @returns {number} Позиция вхождения или -1, если не найдено
     */
    findLeftmostOccurrence(str, pattern) {
        return str.indexOf(pattern);
    }

    /**
     * Применяет правило подстановки к строке
     * @param {string} str - Исходная строка
     * @param {MarkovRule} rule - Правило для применения
     * @returns {Object} Объект с полями: applied (boolean), newString, position
     */
    applyRule(str, rule) {
        const position = this.findLeftmostOccurrence(str, rule.pattern);

        if (position === -1) {
            return { applied: false, newString: str, position: -1 };
        }

        // Выполняем подстановку
        const before = str.substring(0, position);
        const after = str.substring(position + rule.pattern.length);
        const newString = before + rule.replacement + after;

        return {
            applied: true,
            newString: newString,
            position: position
        };
    }

    /**
     * Выполняет один шаг алгоритма
     * @returns {Object} Результат выполнения шага
     */
    executeStep() {
        if (!this.isRunning) {
            return { 
                success: false, 
                message: 'Алгоритм не запущен',
                finished: false 
            };
        }

        // Проверяем ограничение на количество шагов
        if (this.currentStep >= this.maxSteps) {
            this.isRunning = false;
            return {
                success: false,
                message: `Превышено максимальное количество шагов (${this.maxSteps})`,
                finished: true
            };
        }

        // Пробуем применить правила по порядку
        for (let i = 0; i < this.rules.length; i++) {
            const rule = this.rules[i];
            const result = this.applyRule(this.currentString, rule);

            if (result.applied) {
                // Правило применено успешно
                this.currentStep++;

                const step = new ExecutionStep(
                    this.currentStep,
                    this.currentString,
                    result.newString,
                    rule,
                    result.position
                );

                this.history.push(step);
                this.currentString = result.newString;

                // Если правило заключительное, завершаем выполнение
                if (rule.isFinal) {
                    this.isRunning = false;
                    return {
                        success: true,
                        message: 'Применено заключительное правило',
                        step: step,
                        finished: true
                    };
                }

                return {
                    success: true,
                    message: 'Правило применено',
                    step: step,
                    finished: false
                };
            }
        }

        // Ни одно правило не применимо
        this.isRunning = false;
        return {
            success: false,
            message: 'Ни одно правило не применимо',
            finished: true
        };
    }

    /**
     * Запускает выполнение алгоритма
     * @returns {Object} Результат инициализации
     */
    start() {
        const validation = this.validate();
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        this.isRunning = true;
        this.currentStep = 0;
        this.history = [];
        this.startTime = Date.now();

        return {
            success: true,
            message: 'Алгоритм запущен'
        };
    }

    /**
     * Останавливает выполнение алгоритма
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Сбрасывает состояние алгоритма к начальному
     * @param {string} originalString - Исходная входная строка
     */
    reset(originalString) {
        this.currentString = originalString;
        this.currentStep = 0;
        this.history = [];
        this.isRunning = false;
        this.startTime = 0;
    }

    /**
     * Возвращает текущее состояние алгоритма
     * @returns {Object} Объект с информацией о состоянии
     */
    getState() {
        return {
            currentString: this.currentString,
            currentStep: this.currentStep,
            isRunning: this.isRunning,
            historyLength: this.history.length,
            elapsedTime: this.startTime > 0 ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Возвращает историю выполнения
     * @returns {ExecutionStep[]} Массив шагов выполнения
     */
    getHistory() {
        return this.history;
    }

    /**
     * Экспортирует конфигурацию алгоритма в JSON
     * @returns {string} JSON-строка с конфигурацией
     */
    exportToJSON() {
        const config = {
            alphabet: this.alphabet.join(', '),
            rules: this.rules.map(rule => ({
                pattern: rule.pattern,
                replacement: rule.replacement,
                isFinal: rule.isFinal
            })),
            inputString: this.currentString
        };
        return JSON.stringify(config, null, 2);
    }

    /**
     * Импортирует конфигурацию алгоритма из JSON
     * @param {string} jsonString - JSON-строка с конфигурацией
     * @throws {Error} Если JSON некорректен
     */
    importFromJSON(jsonString) {
        try {
            const config = JSON.parse(jsonString);

            this.setAlphabet(config.alphabet);
            this.clearRules();

            for (const rule of config.rules) {
                this.addRule(rule.pattern, rule.replacement, rule.isFinal);
            }

            this.setInputString(config.inputString);

            this.reset(config.inputString);
        } catch (error) {
            throw new Error('Ошибка импорта: ' + error.message);
        }
    }
}