/**
 * Visualizer.js
 * Модуль визуализации процесса выполнения алгоритма
 * 
 * Отрисовывает на Canvas визуальное представление применения правил
 * и изменения рабочей строки на каждом шаге.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

/**
 * Класс визуализации процесса выполнения НАМ
 */
export class Visualizer {
    /**
     * Создает новый экземпляр визуализатора
     * @param {string} canvasId - ID элемента canvas
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.clear();
    }

    /**
     * Очищает canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем начальное сообщение
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Визуализация появится после запуска алгоритма', 
                         this.canvas.width / 2, this.canvas.height / 2);
    }

    /**
     * Отрисовывает шаг выполнения
     * @param {ExecutionStep} step - Шаг выполнения для визуализации
     */
    drawStep(step) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Получаем цвета из CSS переменных
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
        const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-primary');
        const successColor = getComputedStyle(document.body).getPropertyValue('--success-color');

        const y = 40;
        const lineHeight = 50;

        // Заголовок
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = accentColor;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Шаг ${step.stepNumber}`, 10, y);

        // Строка до применения правила
        this.ctx.font = '16px Courier New';
        this.ctx.fillStyle = textColor;
        this.ctx.fillText('Было: ' + step.beforeString, 10, y + lineHeight);

        // Правило
        this.ctx.fillStyle = accentColor;
        this.ctx.fillText('Правило: ' + step.rule.toString(), 10, y + lineHeight * 2);

        // Строка после применения правила
        this.ctx.fillStyle = successColor;
        this.ctx.fillText('Стало: ' + step.afterString, 10, y + lineHeight * 3);

        // Подсветка позиции изменения
        if (step.position >= 0) {
            const x = 10 + this.ctx.measureText('Стало: ').width;
            const charWidth = this.ctx.measureText('M').width;
            const highlightX = x + (step.position * charWidth);
            const highlightY = y + lineHeight * 3 + 5;

            this.ctx.strokeStyle = accentColor;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(highlightX, highlightY);
            this.ctx.lineTo(highlightX + (step.rule.replacement.length * charWidth), highlightY);
            this.ctx.stroke();
        }
    }
}