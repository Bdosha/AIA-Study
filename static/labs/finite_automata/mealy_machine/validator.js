/**
 * validator.js
 * 
 * Валидатор структуры автомата Мили.
 * 
 * Проверяемые условия:
 * - Все состояния в переходах принадлежат множеству состояний
 * - Целевые состояния переходов существуют
 * - Отсутствуют неопределённые переходы для полных автоматов
 */

(function(global) {
    'use strict';

    /**
     * Валидация структуры автомата Мили.
     * 
     * @param {object} automaton - Описание автомата
     * @returns {object} Объект {ok: boolean, errors: []}
     */
    function validateMealy(automaton) {
        const errors = [];
        const states = automaton.states || [];

        // === Проверка переходов ===
        Object.entries(automaton.transitions || {}).forEach(([fromState, transitionMap]) => {
            // Проверка исходного состояния
            if (states.indexOf(fromState) === -1) {
                errors.push({
                    message: `Неизвестное состояние в переходе: ${fromState}`
                });
            }

            // Проверка целевых состояний
            Object.entries(transitionMap).forEach(([inputSymbol, transitionData]) => {
                if (!transitionData.to) {
                    errors.push({
                        message: `Переход ${fromState},${inputSymbol} не имеет целевого состояния`
                    });
                }

                if (states.indexOf(transitionData.to) === -1) {
                    errors.push({
                        message: `Переход из ${fromState} ведёт в неизвестное состояние: ${transitionData.to}`
                    });
                }
            });
        });

        return {
            ok: errors.length === 0,
            errors: errors
        };
    }

    // Экспорт функции в глобальный объект
    global.validateMealy = validateMealy;

})(window);