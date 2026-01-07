/**
 * automatonParser.js
 * 
 * Парсер правил автомата Мили из текстового формата.
 * 
 * Формат входных данных:
 * state,input -> nextState,output
 * 
 * Пример:
 * q0,0 -> q0,0
 * q0,1 -> q1,0
 * q1,0 -> q0,1
 * q1,1 -> q1,0
 * 
 * Возвращаемый объект:
 * {
 *   ok: boolean,
 *   errors: [ { line, message } ],
 *   states: [ state_names ],
 *   inputs: [ input_symbols ],
 *   outputs: [ output_symbols ],
 *   transitions: { state: { input: { to, out } } }
 * }
 */

(function(global) {
    'use strict';

    /**
     * Парсинг и валидация правил автомата Мили.
     * 
     * Процесс:
     * 1. Разбиение текста на строки
     * 2. Парсинг каждой строки в формат: state,input -> nextState,output
     * 3. Проверка синтаксиса и полноты данных
     * 4. Сбор состояний, символов и переходов
     * 
     * @param {string} text - Текстовое представление правил
     * @returns {object} Объект с результатами парсинга
     */
    function parseMealyAutomaton(text) {
        const lines = text.split(/\r?\n/);
        const states = new Set();
        const inputs = new Set();
        const outputs = new Set();
        const transitions = {};
        const errors = [];

        lines.forEach((rawLine, lineIndex) => {
            const line = rawLine.trim();
            const lineNumber = lineIndex + 1;

            // Пропуск пустых строк
            if (!line) return;

            // Разбиение по стрелке
            const parts = line.split('->').map(s => s.trim());
            if (parts.length !== 2) {
                errors.push({
                    line: lineNumber,
                    message: 'Ошибка синтаксиса: отсутствует стрелка "->"'
                });
                return;
            }

            // Разбиение левой и правой части по запятой
            const leftParts = parts[0].split(',').map(s => s.trim());
            const rightParts = parts[1].split(',').map(s => s.trim());

            if (leftParts.length !== 2 || rightParts.length !== 2) {
                errors.push({
                    line: lineNumber,
                    message: 'Ошибка формата: ожидается "state,input -> nextState,output"'
                });
                return;
            }

            const [currentState, inputSymbol] = leftParts;
            const [nextState, outputSymbol] = rightParts;

            // Проверка на пустые значения
            if (!currentState || !inputSymbol || !nextState || !outputSymbol) {
                errors.push({
                    line: lineNumber,
                    message: 'Ошибка: некоторые элементы правила пусты'
                });
                return;
            }

            // Добавление элементов в наборы
            states.add(currentState);
            states.add(nextState);
            inputs.add(inputSymbol);
            outputs.add(outputSymbol);

            // Инициализация словаря переходов для состояния
            if (!transitions[currentState]) {
                transitions[currentState] = {};
            }

            // Проверка на дублирование переходов
            if (transitions[currentState][inputSymbol]) {
                errors.push({
                    line: lineNumber,
                    message: `Ошибка: переход ${currentState},${inputSymbol} уже определён`
                });
                return;
            }

            // Добавление переходa
            transitions[currentState][inputSymbol] = {
                to: nextState,
                out: outputSymbol,
                raw: line
            };
        });

        return {
            ok: errors.length === 0,
            errors: errors,
            states: Array.from(states),
            inputs: Array.from(inputs),
            outputs: Array.from(outputs),
            transitions: transitions
        };
    }

    // Экспорт функции в глобальный объект
    global.parseMealyAutomaton = parseMealyAutomaton;

})(window);