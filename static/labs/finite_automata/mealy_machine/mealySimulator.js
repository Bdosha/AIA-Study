/**
 * mealySimulator.js
 * 
 * Ядро симулятора автомата Мили.
 * 
 * Функциональность:
 * - Инициализация автомата с начальным состоянием и входной последовательностью
 * - Пошаговое выполнение симуляции
 * - Отслеживание истории переходов
 * - Управление состоянием симулятора (запуск, пауза, сброс)
 * 
 * Возвращаемые данные шага:
 * {
 *   step: номер_шага,
 *   in: входной_символ,
 *   out: выходной_символ | null,
 *   from: исходное_состояние,
 *   to: целевое_состояние | null,
 *   error: описание_ошибки | undefined
 * }
 */

(function(global) {
    'use strict';

    class MealySimulator {
        /**
         * Конструктор симулятора.
         * 
         * @param {object} automaton - Описание автомата {states, inputs, outputs, transitions}
         */
        constructor(automaton) {
            this.loadAutomaton(automaton);
            this.reset();
        }

        /**
         * Загрузка конфигурации автомата.
         * 
         * @param {object} automaton - Описание автомата
         */
        loadAutomaton(automaton) {
            this.automaton = automaton || {
                states: [],
                inputs: [],
                outputs: [],
                transitions: {}
            };
        }

        /**
         * Инициализация симулятора перед началом работы.
         * 
         * @param {string} startState - Начальное состояние
         * @param {string} inputSeq - Входная последовательность (строка символов)
         */
        init(startState, inputSeq) {
            this.startState = startState;
            this.reset();
            this.currentState = startState;
            this.inputSeq = (inputSeq || '')
                .split('')
                .filter(sym => sym !== '');
        }

        /**
         * Сброс состояния симулятора.
         * 
         * Очищает счётчик шагов, историю и устанавливает текущее состояние в null.
         * Генерирует событие 'mealy:reset' для уведомления слушателей.
         */
        reset() {
            this.currentState = null;
            this.stepIndex = 0;
            this.history = [];
            this.running = false;
            window.dispatchEvent(new CustomEvent('mealy:reset'));
        }

        /**
         * Выполнение одного шага симуляции.
         * 
         * Алгоритм:
         * 1. Получение текущего входного символа
         * 2. Поиск соответствующего переходa в функции переходов
         * 3. Обновление текущего состояния
         * 4. Формирование информации о шаге
         * 5. Добавление в историю и генерация события
         * 
         * @returns {object|null} Информация о шаге или null если последовательность закончилась
         * @throws {Error} Если симулятор не инициализирован
         */
        step() {
            if (this.currentState === null) {
                throw new Error('Симулятор не инициализирован. Вызовите init() перед началом.');
            }

            // Проверка завершения входной последовательности
            if (this.stepIndex >= this.inputSeq.length) {
                return null;
            }

            const inputSymbol = this.inputSeq[this.stepIndex];
            const transitionMap = this.automaton.transitions[this.currentState] || {};
            const transition = transitionMap[inputSymbol];

            let stepInfo;

            if (!transition) {
                // Ошибка: неопределённый переход
                stepInfo = {
                    step: this.stepIndex,
                    in: inputSymbol,
                    out: null,
                    from: this.currentState,
                    to: null,
                    error: 'Неопределённый переход'
                };
            } else {
                // Успешный переход
                stepInfo = {
                    step: this.stepIndex,
                    in: inputSymbol,
                    out: transition.out,
                    from: this.currentState,
                    to: transition.to
                };
                this.currentState = transition.to;
            }

            this.history.push(stepInfo);
            this.stepIndex++;

            // Генерация события для слушателей
            window.dispatchEvent(new CustomEvent('mealy:step', {
                detail: stepInfo
            }));

            return stepInfo;
        }

        /**
         * Выполнение всех оставшихся шагов симуляции.
         * 
         * @param {function} onStep - Коллбэк, вызываемый для каждого шага
         * @returns {array} Массив информации о всех выполненных шагах
         */
        runAll(onStep) {
            this.running = true;
            const results = [];

            while (this.stepIndex < this.inputSeq.length && this.running) {
                const stepInfo = this.step();
                results.push(stepInfo);
                if (typeof onStep === 'function') {
                    onStep(stepInfo);
                }
            }

            this.running = false;
            return results;
        }

        /**
         * Остановка текущей симуляции.
         * Используется для прерывания runAll().
         */
        stop() {
            this.running = false;
        }
    }

    // Экспорт класса в глобальный объект
    global.MealySimulator = MealySimulator;

})(window);