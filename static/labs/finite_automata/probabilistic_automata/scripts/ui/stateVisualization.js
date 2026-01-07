/**
 * @file stateVisualization.js - Визуализация распределения конечных состояний
 * @module ui/stateVisualization
 *
 * Этот модуль защищает визуализацию от отсутствия внешнего CSS,
 * поэтому задаёт базовые стили inline.
 */

class StateVisualization {
    /**
     * @param {HTMLElement|null} containerElement - элемент с настройками состояний (не обязателен)
     * @param {AutomataModel|null} appModel - ссылка на модель (не обязателен)
     */
    constructor(containerElement = null, appModel = null) {
        this.container = containerElement || document.getElementById('state-settings');
        this.appModel = appModel || window.appModel || null;
        this.histogramContainer = document.getElementById('histogram');
        this.labelElement = this.findLabelElement();

        // Если контейнер найден — установим базовые стили, чтобы график точно был видим
        if (this.histogramContainer) {
            this._applyBaseContainerStyles();
        } else {
            console.warn('StateVisualization: контейнер #histogram не найден при инициализации.');
        }
    }

    /**
     * Принудительно добавляет базовые стили к контейнеру гистограммы,
     * чтобы визуализация работала даже при отсутствии внешнего CSS.
     */
    _applyBaseContainerStyles() {
        const c = this.histogramContainer;
        c.style.display = 'flex';
        c.style.alignItems = 'flex-end';
        c.style.justifyContent = 'center';
        c.style.gap = '12px';
        c.style.height = '220px';          // ключевая высота области гистограммы
        c.style.minHeight = '160px';
        c.style.padding = '10px';
        c.style.borderRadius = '8px';
        c.style.backgroundColor = 'var(--panel-bg, #1f1f1f)';
        c.style.overflowX = 'auto';
        c.style.boxSizing = 'border-box';
        c.style.marginTop = '6px';
    }

    /**
     * Находит элемент с текстом "После ..." для замены N на реальное число прогонов.
     * Критерий: div, в котором текст начинается с "После" (без учёта пробелов).
     */
    findLabelElement() {
        // ищем внутри правой панели сначала (оптимально), затем повсеместно
        const rightPanel = document.querySelector('.right-panel');
        const searchRoots = rightPanel ? [rightPanel, document] : [document];

        for (const root of searchRoots) {
            const divs = root.querySelectorAll('div');
            for (const div of divs) {
                if (typeof div.textContent === 'string' && div.textContent.trim().startsWith('После')) {
                    return div;
                }
            }
        }
        return null;
    }

    /**
     * Обновляет надпись "После N прогонов"
     * @param {number} numRuns
     */
    updateLabel(numRuns) {
        if (!this.labelElement) {
            // Если не нашли элемент — создадим маленькую подпись над histogram
            if (!this._inlineLabel) {
                this._inlineLabel = document.createElement('div');
                this._inlineLabel.style.fontSize = '13px';
                this._inlineLabel.style.marginBottom = '6px';
                if (this.histogramContainer && this.histogramContainer.parentElement) {
                    // вставляем выше контейнера гистограммы
                    this.histogramContainer.parentElement.insertBefore(this._inlineLabel, this.histogramContainer);
                }
            }
            this._inlineLabel.textContent = `После ${numRuns} прогонов:`;
            return;
        }

        this.labelElement.textContent = `После ${numRuns} прогонов:`;
    }


    /**
     * Рисует гистограмму.
     * distribution: объект { stateId: count } (counts) или { stateId: probability } (если сумм ~= 1)
     * numRuns: если передано, используется для подписи и для преобразования вероятностей в counts
     */
    renderHistogram(distribution = {}, numRuns = null) {
        // Защита: контейнер
        if (!this.histogramContainer) {
            console.warn('StateVisualization.renderHistogram: контейнер #histogram не найден.');
            return;
        }

        // На случай, если внешний CSS отсутствует/перезаписан — обеспечим базовые стили контейнера
        const hc = this.histogramContainer;
        hc.style.display = hc.style.display || 'flex';
        hc.style.alignItems = hc.style.alignItems || 'flex-end';
        hc.style.justifyContent = hc.style.justifyContent || 'center';
        hc.style.gap = hc.style.gap || '12px';
        hc.style.height = hc.style.height || '170px';
        hc.style.padding = hc.style.padding || '8px';
        hc.style.boxSizing = 'border-box';
        hc.style.overflowX = hc.style.overflowX || 'auto';

        // Преобразуем distribution в числовые counts
        const rawEntries = Object.entries(distribution || {});
        if (rawEntries.length === 0) {
            // очищаем контейнер если нет данных
            hc.innerHTML = '';
            console.warn('StateVisualization: пустое распределение.');
            return;
        }

        // Если distribution передан как вероятности (сумма близка к 1) и numRuns задан — умножаем
        const values = rawEntries.map(([k, v]) => Number(v) || 0);
        const sumValues = values.reduce((s, x) => s + x, 0);
        const counts = {};
        if (Math.abs(sumValues - 1) < 1e-6 && numRuns) {
            rawEntries.forEach(([k, v]) => counts[k] = (Number(v) || 0) * numRuns);
        } else {
            rawEntries.forEach(([k, v]) => counts[k] = Number(v) || 0);
        }

        // Очищаем старое содержимое
        hc.innerHTML = '';

        // Обновляем подпись
        if (numRuns) this.updateLabel(numRuns);
        else {
            const totalRunsGuess = Object.values(counts).reduce((s, x) => s + x, 0);
            if (totalRunsGuess > 1) this.updateLabel(totalRunsGuess);
        }

        // Найдём максимум и сумму
        const countValues = Object.values(counts);
        const maxCount = countValues.length > 0 ? Math.max(...countValues) : 0;
        const totalCount = countValues.reduce((s, x) => s + x, 0) || 1;

        // Лог для отладки (можно убрать после теста)
        console.debug('StateVisualization: counts=', counts, 'maxCount=', maxCount, 'totalCount=', totalCount);

        // Если максимум очень мал (например все <1) — нормализуем в более удобный диапазон
        let effectiveCounts = { ...counts };
        if (maxCount > 0 && maxCount < 1) {
            // вероятности — умножаем на 100 (или на numRuns если известен)
            const factor = numRuns ? numRuns : 100;
            Object.keys(effectiveCounts).forEach(k => effectiveCounts[k] = effectiveCounts[k] * factor);
        }

        // Обновляем максимум после нормализации
        const effValues = Object.values(effectiveCounts);
        const effMax = effValues.length > 0 ? Math.max(...effValues) : 1;

        // Определяем максимально доступную высоту для бара (оставляем небольшой отступ)
        const containerHeightPx = parseInt(window.getComputedStyle(hc).height, 10) || 170;
        const maxBarPx = Math.max(60, containerHeightPx - 60); // резерв для текста/подписи

        // Создаём столбики
        for (const state of Object.keys(effectiveCounts)) {
            const count = effectiveCounts[state] || 0;
            const ratio = effMax > 0 ? (count / effMax) : 0;
            const barHeightPx = Math.max(4, Math.round(ratio * maxBarPx)); // минимум 4px, чтобы видно было

            // column wrapper (процент, бар, подпись)
            const column = document.createElement('div');
            column.style.display = 'flex';
            column.style.flexDirection = 'column';
            column.style.alignItems = 'flex-end';
            column.style.justifyContent = 'flex-end';
            column.style.width = '48px';
            column.style.boxSizing = 'border-box';
            column.style.flex = '0 0 48px';

            // процент сверху
            const percentText = document.createElement('div');
            percentText.style.fontSize = '12px';
            percentText.style.marginBottom = '6px';
            percentText.style.color = 'var(--text-color, #000)';
            percentText.textContent = `${((count / (totalCount || 1)) * 100).toFixed(1)}%`;

            // сам бар
            const bar = document.createElement('div');
            bar.className = 'histogram-bar';
            bar.style.flex = `0 0 ${barHeightPx}px`;
            bar.style.alignSelf = 'flex-end';
            // гарантия видимости: min-height, background, border
            bar.style.height = `${barHeightPx}px`;
            bar.style.minHeight = '4px';
            bar.style.width = '100%';
            bar.style.maxWidth = '48px';
            bar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#4e79a7';
            bar.style.border = '1px solid rgba(0,0,0,0.08)';
            bar.style.borderRadius = '6px 6px 2px 2px';
            bar.style.transition = 'height 0.35s ease';
            bar.style.boxSizing = 'border-box';
            bar.style.display = 'block';
            bar.title = `${state}: ${((count / (totalCount || 1)) * 100).toFixed(1)}% (${Math.round(count)})`;

            // подпись снизу
            const label = document.createElement('div');
            label.textContent = state;
            label.style.fontSize = '12px';
            label.style.marginTop = '8px';
            label.style.color = 'var(--text-color, #000)';
            label.style.textAlign = 'center';
            label.style.wordBreak = 'break-word';

            column.appendChild(percentText);
            column.appendChild(bar);
            column.appendChild(label);

            // hover эффект
            column.addEventListener('mouseenter', () => bar.style.transform = 'translateY(-6px) scale(1.02)');
            column.addEventListener('mouseleave', () => bar.style.transform = 'none');

            hc.appendChild(column);
        }
    }

}

// Экспорт / глобальная регистрация
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateVisualization };
} else {
    window.StateVisualization = StateVisualization;
}
