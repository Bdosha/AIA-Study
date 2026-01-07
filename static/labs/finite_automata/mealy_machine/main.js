/**
 * main.js
 * 
 * Главный файл инициализации приложения.
 * Использует единообразные названия вершин: s0, s1, s2...
 */

(function() {
    'use strict';

    /**
     * Инициализация темы до создания визуальных элементов
     */
    if (window.themeSwitcher) {
        themeSwitcher.init();
    }

    /**
     * Основная инициализация при готовности DOM
     */
    document.addEventListener('DOMContentLoaded', function() {
        // Инициализация графического визуализатора
        if (window.graphVisualizer) {
            graphVisualizer.init('graphContainer');
        }

        // Получение элемента поля ввода правил
        const rulesInput = document.getElementById('rulesInput');

        // Загрузка демонстрационного примера если поле пусто
        // НОВОЕ: используем s0, s1 вместо A, B
        if (rulesInput && (!rulesInput.value || !rulesInput.value.trim())) {
            rulesInput.value = 's0,0 -> s0,0\ns0,1 -> s1,0\ns1,0 -> s0,1\ns1,1 -> s1,0';
            document.getElementById('startState').value = 's0';
            document.getElementById('inputSeq').value = '110101';
        }

        /**
         * Применение правил с отсроченным вызовом
         */
        let attempts = 0;
        const maxAttempts = 20;
        const delayMs = 200;

        function tryApplyRules() {
            attempts++;

            if (window._appApplyRules) {
                window._appApplyRules();

                if (window.graphVisualizer && graphVisualizer.refreshTheme) {
                    graphVisualizer.refreshTheme();
                }
            } else if (attempts < maxAttempts) {
                setTimeout(tryApplyRules, delayMs);
            } else {
                console.warn('Не удалось инициализировать контроллер');
            }
        }

        tryApplyRules();
    });

})();