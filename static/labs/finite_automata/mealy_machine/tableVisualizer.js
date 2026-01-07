/**
 * tableVisualizer.js
 * 
 * Модуль отображения табличного представления автомата Мили.
 * 
 * Функциональность:
 * - Построение таблицы переходов с состояниями и входными символами
 * - Динамическое добавление строк шагов симуляции
 * - Подсветка активных переходов во время выполнения
 * - Отображение результатов каждого этапа симуляции
 */

(function(global) {
    'use strict';

    /**
     * Построение таблицы переходов и выходов автомата.
     * 
     * Структура таблицы:
     * - Заголовок: входные символы (столбцы), состояния (строки)
     * - Ячейки: следующее состояние и выходной символ
     * - Формат ячейки: "nextState / output"
     * 
     * @param {object} automaton - Описание автомата {states, inputs, outputs, transitions}
     */
    function renderTable(automaton) {
        const table = document.getElementById('automatonTable');
        if (!table) return;

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        if (!thead || !tbody) return;

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const inputs = (automaton.inputs || []).slice().sort();
        const states = (automaton.states || []).slice().sort();

        // === ПОСТРОЕНИЕ ЗАГОЛОВКА ===
        const headerRow = document.createElement('tr');
        const cornerCell = document.createElement('th');
        cornerCell.textContent = 'Состояние';
        cornerCell.style.fontWeight = '600';
        headerRow.appendChild(cornerCell);

        inputs.forEach(input => {
            const headerCell = document.createElement('th');
            headerCell.textContent = input;
            headerCell.style.fontWeight = '600';
            headerRow.appendChild(headerCell);
        });

        thead.appendChild(headerRow);

        // === ПОСТРОЕНИЕ СТРОК ТАБЛИЦЫ ===
        states.forEach(state => {
            const row = document.createElement('tr');
            const stateCell = document.createElement('td');
            stateCell.textContent = state;
            stateCell.style.fontWeight = '600';
            row.appendChild(stateCell);

            inputs.forEach(input => {
                const cell = document.createElement('td');
                const transition = (automaton.transitions[state] || {})[input];

                if (transition) {
                    cell.textContent = `${transition.to} / ${transition.out}`;
                } else {
                    cell.textContent = '—';
                    cell.style.color = 'var(--muted)';
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }

    /**
     * Добавление строки шага симуляции в таблицу.
     * 
     * Каждый вызов добавляет новую строку внизу таблицы с информацией о:
     * - Номере шага
     * - Входном символе
     * - Выходном символе
     * - Переходе (откуда и куда)
     * 
     * @param {object} stepInfo - Информация о шаге {step, in, out, from, to, error}
     */
    function appendStepRow(stepInfo) {
        const table = document.getElementById('automatonTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'step-row';

        // Номер шага
        const stepCell = document.createElement('td');
        stepCell.textContent = stepInfo.step || '—';
        stepCell.style.textAlign = 'center';
        stepCell.style.fontFamily = 'monospace';
        row.appendChild(stepCell);

        // Входной символ
        const inputCell = document.createElement('td');
        inputCell.textContent = stepInfo.in || '—';
        inputCell.style.textAlign = 'center';
        inputCell.style.fontFamily = 'monospace';
        inputCell.style.fontWeight = '500';
        row.appendChild(inputCell);

        // Выходной символ
        const outputCell = document.createElement('td');
        outputCell.textContent = stepInfo.out !== null ? stepInfo.out : '—';
        outputCell.style.textAlign = 'center';
        outputCell.style.fontFamily = 'monospace';
        outputCell.style.fontWeight = '500';
        row.appendChild(outputCell);

        // Переход
        const transitionCell = document.createElement('td');
        if (stepInfo.error) {
            transitionCell.textContent = '✗ ' + stepInfo.error;
            transitionCell.style.color = 'var(--danger)';
        } else {
            transitionCell.textContent = `${stepInfo.from} → ${stepInfo.to}`;
        }
        transitionCell.style.textAlign = 'center';
        transitionCell.style.fontFamily = 'monospace';
        row.appendChild(transitionCell);

        tbody.appendChild(row);
    }

    /**
     * Подсветка ячейки переходa в таблице.
     * 
     * @param {string} fromState - Исходное состояние
     * @param {string} toState - Целевое состояние
     * @param {string} input - Входной символ
     */
    function highlightCell(fromState, toState, input) {
        const table = document.getElementById('automatonTable');
        if (!table) return;

        const cells = table.querySelectorAll('td');
        cells.forEach(cell => cell.classList.remove('highlighted'));

        // Логика: найти ячейку, где строка соответствует fromState,
        // а столбец соответствует input
        // (Реализация может варьироваться в зависимости от структуры таблицы)
    }

    // Экспорт функций в глобальный объект
    global.tableVisualizer = {
        renderTable: renderTable,
        appendStepRow: appendStepRow,
        highlightCell: highlightCell
    };

})(window);