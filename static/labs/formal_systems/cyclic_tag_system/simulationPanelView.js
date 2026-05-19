/**
 * @fileoverview Управляет панелью симуляции (правая колонка).
 * Отвечает за отображение статуса, текущей строки и истории.
 */
export default class SimulationPanelView {
    /**
     * @param {Object} domElements - Словарь с DOM-элементами панели симуляции.
     */
    constructor(domElements) {
        this.dom = domElements;
        this.historyPlaceholder = this.dom.history.innerHTML;
    }

    /**
     * Отрисовывает текущее состояние симуляции в интерфейсе.
     * @param {import('./model.js').default} model Модель тег-системы.
     * @param {number} time Прошедшее время симуляции.
     */
    renderState(model, time) {
        this.dom.stepCounter.textContent = model.stepCount.toString();
        this.dom.stringLength.textContent = model.currentString.length.toString();
        this.dom.timer.textContent = `${time.toFixed(2)} с`;

        if (model.isHalted) {
            this.setStatus('Остановлено', 'stopped');
        }

        if (model.lastAction) {
            this.renderCurrentWord(model.lastAction, model.currentString);
        } else {
             this.renderCurrentWord({deleted: '', rest: model.currentString, added: ''}, model.currentString)
        }
    }

    /**
     * Отрисовывает визуальное представление трансформации строки.
     * @param {{deleted: string, rest: string, added: string}} action Последнее выполненное действие.
     * @param {string} fullString Результирующая полная строка (для состояний без действия).
     */
    renderCurrentWord(action, fullString) {
        if (!action) {
            this.dom.currentString.textContent = fullString;
            return;
        }
        this.dom.currentString.innerHTML = '';
        const deletedSpan = document.createElement('span');
        deletedSpan.className = 'deleted';
        deletedSpan.textContent = action.deleted;
        
        const restSpan = document.createElement('span');
        restSpan.textContent = action.rest;

        const addedSpan = document.createElement('span');
        addedSpan.className = 'added';
        addedSpan.textContent = action.added;

        const plusSign = document.createTextNode(' + ');

        this.dom.currentString.append(deletedSpan, plusSign, restSpan, addedSpan);
    }
    
    /**
     * Добавляет запись в лог истории симуляции.
     * @param {number} step Номер шага.
     * @param {string} word Строка на данном шаге.
     */
    addHistoryEntry(step, word) {
        if (step === 0) {
            this.dom.history.innerHTML = '';
        }
        const entry = document.createElement('div');
        const stepSpan = document.createElement('span');
        stepSpan.textContent = `${step}`;
        const wordText = document.createTextNode(word);
        entry.append(stepSpan, wordText);
        this.dom.history.prepend(entry);
    }

    /**
     * Очищает лог истории и восстанавливает заглушку.
     */
    clearHistory() {
        this.dom.history.innerHTML = this.historyPlaceholder;
    }

    /**
     * Устанавливает отображаемый статус симуляции.
     * @param {string} text Текст статуса.
     * @param {'paused' | 'running' | 'stopped'} state Состояние для стилизации.
     */
    setStatus(text, state) {
        this.dom.status.textContent = text;
        this.dom.status.className = `status-value status-${state}`;
    }
}