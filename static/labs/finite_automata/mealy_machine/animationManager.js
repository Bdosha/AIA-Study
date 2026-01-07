/**
 * animationManager.js
 * 
 * Менеджер анимации и подсветки при симуляции.
 * 
 * Функциональность:
 * - Подсветка активного переходa на графе
 * - Подсветка текущего состояния
 * - Добавление строки шага в таблицу
 * - Управление длительностью подсветки
 */

(function(global) {
    'use strict';

    const HIGHLIGHT_DURATION = 700; // Длительность подсветки (миллисекунды)

    /**
     * Визуализация шага симуляции.
     * 
     * Процесс:
     * 1. Подсветка ребра переходa на графе
     * 2. Подсветка целевого состояния
     * 3. Добавление записи в таблицу
     * 4. Автоматический сброс подсветки через HIGHLIGHT_DURATION
     * 
     * @param {object} stepInfo - Информация о шаге
     */
    function highlightStep(stepInfo) {
        // Подсветка ребра
        if (window.graphVisualizer) {
            graphVisualizer.highlightEdgeByData(
                stepInfo.from,
                stepInfo.to,
                stepInfo.in
            );
        }

        // Подсветка целевого узла
        if (window.graphVisualizer) {
            graphVisualizer.highlightNode(stepInfo.to || stepInfo.from);
        }

        // Добавление строки в таблицу
        if (window.tableVisualizer) {
            tableVisualizer.appendStepRow(stepInfo);
        }

        // Автоматический сброс подсветки
        setTimeout(() => {
            if (window.graphVisualizer) {
                graphVisualizer.highlightEdgeByData('', '', '');
                graphVisualizer.highlightNode('');
            }
        }, HIGHLIGHT_DURATION);
    }

    // Экспорт функций в глобальный объект
    global.animationManager = {
        highlightStep: highlightStep
    };

})(window);