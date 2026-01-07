/**
 * ExamplesLibrary.js
 * Модуль библиотеки готовых примеров алгоритмов
 * 
 * Содержит коллекцию типовых нормальных алгорифмов Маркова
 * для демонстрации и обучения.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

/**
 * Класс библиотеки примеров
 */
export class ExamplesLibrary {
    /**
     * Создает новый экземпляр библиотеки
     */
    constructor() {
        this.examples = this.initializeExamples();
    }

    /**
     * Инициализирует коллекцию примеров
     * @returns {Array} Массив примеров алгоритмов
     */
    initializeExamples() {
        return [
            {
                id: 'double',
                name: 'Удвоение строки',
                description: 'Удваивает входную строку символов',
                alphabet: 'a, b, c, |',
                rules: [
                    { pattern: 'a', replacement: 'aa', isFinal: false },
                    { pattern: 'b', replacement: 'bb', isFinal: false },
                    { pattern: 'c', replacement: 'cc', isFinal: false }
                ],
                inputString: 'abc'
            },
            {
                id: 'unary-add',
                name: 'Унарное сложение',
                description: 'Складывает два унарных числа',
                alphabet: '|, +',
                rules: [
                    { pattern: '|+', replacement: '+|', isFinal: false },
                    { pattern: '+', replacement: '', isFinal: true }
                ],
                inputString: '|||+||'
            },
            {
                id: 'reverse',
                name: 'Инверсия строки',
                description: 'Переворачивает строку символов',
                alphabet: 'a, b, c, (, )',
                rules: [
                    { pattern: '(', replacement: '', isFinal: false },
                    { pattern: 'a', replacement: '(a', isFinal: false },
                    { pattern: 'b', replacement: '(b', isFinal: false },
                    { pattern: 'c', replacement: '(c', isFinal: false },
                    { pattern: ')a', replacement: 'a)', isFinal: false },
                    { pattern: ')b', replacement: 'b)', isFinal: false },
                    { pattern: ')c', replacement: 'c)', isFinal: false },
                    { pattern: ')', replacement: '', isFinal: true }
                ],
                inputString: '(abc)'
            },
            {
                id: 'replace-ab',
                name: 'Замена a на b',
                description: 'Заменяет все символы a на b',
                alphabet: 'a, b',
                rules: [
                    { pattern: 'a', replacement: 'b', isFinal: false }
                ],
                inputString: 'aaabaa'
            },
            {
                id: 'increment',
                name: 'Инкремент унарного числа',
                description: 'Увеличивает унарное число на 1',
                alphabet: '|',
                rules: [
                    { pattern: '', replacement: '|', isFinal: true }
                ],
                inputString: '|||'
            }
        ];
    }

    /**
     * Возвращает все примеры
     * @returns {Array} Массив всех примеров
     */
    getAllExamples() {
        return this.examples;
    }

    /**
     * Возвращает пример по ID
     * @param {string} id - ID примера
     * @returns {Object|null} Объект примера или null
     */
    getExample(id) {
        return this.examples.find(ex => ex.id === id) || null;
    }

    /**
     * Добавляет новый пример в библиотеку
     * @param {Object} example - Объект примера
     */
    addExample(example) {
        this.examples.push(example);
    }
}