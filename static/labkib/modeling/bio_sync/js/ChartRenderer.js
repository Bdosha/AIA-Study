// ==============================================
// ФАЙЛ: ChartRenderer.js
// ==============================================

/**
 * ChartRenderer.js
 * Класс для отрисовки графиков и визуализации осцилляторов
 */

class ChartRenderer {
    /**
     * Конструктор класса ChartRenderer
     * @param {HTMLCanvasElement} oscillatorCanvas - Канвас для визуализации осцилляторов
     * @param {HTMLCanvasElement} chartCanvas - Канвас для графика параметра порядка
     */
    constructor(oscillatorCanvas, chartCanvas) {
        this.oscillatorCanvas = oscillatorCanvas;
        this.ctx = oscillatorCanvas.getContext('2d');

        this.chartCanvas = chartCanvas;
        this.chartCtx = chartCanvas.getContext('2d');
    }

    /**
     * Отрисовка осцилляторов на круге
     * Визуализирует фазы, степень активности и вектор параметра порядка
     * @param {Array<number>} phases - Массив фаз осцилляторов
     * @param {number} orderParam - Текущее значение параметра порядка
     * @param {number} N - Количество осцилляторов
     */
    drawOscillators(phases, orderParam, N) {
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';

        // Очистка канваса
        if (theme === 'light') {
            this.ctx.fillStyle = '#f5f7fa';
        } else {
            this.ctx.fillStyle = '#0a0e27';
        }
        this.ctx.fillRect(0, 0, this.oscillatorCanvas.width, this.oscillatorCanvas.height);

        const centerX = this.oscillatorCanvas.width / 2;
        const centerY = this.oscillatorCanvas.height / 2;
        const radius = 160;

        // Отрисовка круга
        const circleColor = theme === 'light' ? 'rgba(230, 57, 128, 0.2)' : 'rgba(255, 107, 157, 0.2)';
        this.ctx.strokeStyle = circleColor;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Отрисовка каждого осциллятора
        for (let i = 0; i < N; i++) {
            const angle = (2 * Math.PI * i) / N;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            const phase = phases[i];
            const intensity = (Math.sin(phase) + 1) / 2;

            // Выбор цвета в зависимости от интенсивности
            let color, shadowColor;
            if (intensity < 0.33) {
                color = '#6c757d';
                shadowColor = 'rgba(108, 117, 125, 0.4)';
            } else if (intensity < 0.67) {
                color = '#00d4ff';
                shadowColor = 'rgba(0, 212, 255, 0.6)';
            } else {
                color = '#50fa7b';
                shadowColor = 'rgba(80, 250, 123, 0.8)';
            }

            const moduleSize = 9 + intensity * 7;

            // Отрисовка модуля с свечением
            this.ctx.save();
            this.ctx.shadowColor = shadowColor;
            this.ctx.shadowBlur = 18 * intensity;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, moduleSize, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.restore();

            // Номер модуля
            const textColor = theme === 'light' ? '#2c3e50' : '#0a0e27';
            this.ctx.fillStyle = textColor;
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(i + 1, x, y);

            // Вектор фазы
            const arrowLength = moduleSize + 10;
            const phaseX = x + arrowLength * Math.cos(phase);
            const phaseY = y + arrowLength * Math.sin(phase);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(phaseX, phaseY);
            this.ctx.stroke();

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(phaseX, phaseY, 2.5, 0, 2 * Math.PI);
            this.ctx.fill();
        }

        // Отрисовка вектора параметра порядка
        if (orderParam > 0.1) {
            let avgReal = 0, avgImag = 0;
            for (let i = 0; i < N; i++) {
                avgReal += Math.cos(phases[i]);
                avgImag += Math.sin(phases[i]);
            }
            const avgPhase = Math.atan2(avgImag, avgReal);

            const vectorLength = orderParam * 90;
            const vectorX = centerX + vectorLength * Math.cos(avgPhase);
            const vectorY = centerY + vectorLength * Math.sin(avgPhase);

            const vectorColor = theme === 'light' ? '#e63980' : '#ff6b9d';
            this.ctx.strokeStyle = vectorColor;
            this.ctx.lineWidth = 5;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(vectorX, vectorY);
            this.ctx.stroke();

            // Стрелка
            const arrowSize = 10;
            this.ctx.fillStyle = vectorColor;
            this.ctx.beginPath();
            this.ctx.moveTo(vectorX, vectorY);
            this.ctx.lineTo(vectorX - arrowSize * Math.cos(avgPhase - 0.5),
                vectorY - arrowSize * Math.sin(avgPhase - 0.5));
            this.ctx.lineTo(vectorX - arrowSize * Math.cos(avgPhase + 0.5),
                vectorY - arrowSize * Math.sin(avgPhase + 0.5));
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Отображение значения r
        const rTextColor = theme === 'light' ? '#2c3e50' : '#eebbc3';
        this.ctx.fillStyle = rTextColor;
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`r = ${orderParam.toFixed(3)}`, centerX, centerY + 60);
    }

    /**
     * Отрисовка графика параметра порядка r(t)
     * @param {Array<number>} orderHistory - История значений параметра порядка
     */
    drawChart(orderHistory) {
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';

        const width = this.chartCanvas.width - 40;
        const height = this.chartCanvas.height - 40;
        const startX = 20;
        const startY = 20;

        // Очистка канваса
        if (theme === 'light') {
            this.chartCtx.fillStyle = '#ffffff';
        } else {
            this.chartCtx.fillStyle = '#1a1f3a';
        }
        this.chartCtx.fillRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);

        if (orderHistory.length < 2) return;

        // Сетка
        const gridColor = theme === 'light' ? 'rgba(230, 57, 128, 0.15)' : 'rgba(255, 107, 157, 0.15)';
        this.chartCtx.strokeStyle = gridColor;
        this.chartCtx.lineWidth = 1;
        this.chartCtx.beginPath();
        for (let i = 0; i <= 5; i++) {
            const y = startY + (i / 5) * height;
            this.chartCtx.moveTo(startX, y);
            this.chartCtx.lineTo(startX + width, y);
        }
        this.chartCtx.stroke();

        // Оси
        const axisColor = theme === 'light' ? '#2c3e50' : '#eebbc3';
        this.chartCtx.strokeStyle = axisColor;
        this.chartCtx.lineWidth = 2;
        this.chartCtx.beginPath();
        this.chartCtx.moveTo(startX, startY + height);
        this.chartCtx.lineTo(startX + width, startY + height);
        this.chartCtx.moveTo(startX, startY);
        this.chartCtx.lineTo(startX, startY + height);
        this.chartCtx.stroke();

        // Подписи оси Y
        const labelColor = theme === 'light' ? '#5a6c7d' : '#b8c1ec';
        this.chartCtx.fillStyle = labelColor;
        this.chartCtx.font = '11px sans-serif';
        this.chartCtx.textAlign = 'right';
        this.chartCtx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = startY + height - (i / 5) * height;
            const value = (i / 5).toFixed(1);
            this.chartCtx.fillText(value, startX - 5, y);
        }

        // График
        const lineColor = theme === 'light' ? '#e63980' : '#ff6b9d';
        this.chartCtx.strokeStyle = lineColor;
        this.chartCtx.lineWidth = 3;
        this.chartCtx.beginPath();

        for (let i = 0; i < orderHistory.length; i++) {
            const x = startX + (i / Math.max(orderHistory.length - 1, 1)) * width;
            const y = startY + height - (orderHistory[i] * height);

            if (i === 0) {
                this.chartCtx.moveTo(x, y);
            } else {
                this.chartCtx.lineTo(x, y);
            }
        }
        this.chartCtx.stroke();

        // Отметка точки синхронизации
        const syncColor = theme === 'light' ? '#27ae60' : '#50fa7b';
        this.chartCtx.fillStyle = syncColor;
        for (let i = 1; i < orderHistory.length; i++) {
            const current = orderHistory[i];
            const previous = orderHistory[i-1];

            if (current > 0.8 && previous <= 0.8) {
                const x = startX + (i / Math.max(orderHistory.length - 1, 1)) * width;
                const y = startY + height - (current * height);

                this.chartCtx.beginPath();
                this.chartCtx.arc(x, y, 6, 0, 2 * Math.PI);
                this.chartCtx.fill();
            }
        }
    }
}

