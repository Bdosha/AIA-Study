/**
 * Класс управления графиками
 * Управляет визуализациями Chart.js для данных симуляции
 */
class ChartManager {
    /**
 * Создать новый менеджер графиков
 */
    constructor() {
        this.stocksChart = null;
        this.flowsChart = null;
        this.chartColors = {
            water: '#1FB8CD',
            oxygen: '#FFC185',
            waterInflow: '#B4413C',
            waterOutflow: '#ECEBD5',
            oxygenInflow: '#5D878F',
            oxygenOutflow: '#DB4545'
        };
        this.isDarkMode = true;
    }

    /**
 * Получить цвет текста графика на основе темы
 * @возвращает {string} Color for text
 */
    getTextColor() {
        return this.isDarkMode ? '#f5f5f5' : '#13343b';
    }

    /**
 * Получить цвет сетки графика на основе темы
 * @возвращает {string} Color for grid lines
 */
    getGridColor() {
        return this.isDarkMode ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
    }

    /**
 * Инициализировать график запасов (уровни воды и кислорода)
 * @param {string} canvasId - ID элемента Canvas
 */
    initStocksChart(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.stocksChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [0],
                datasets: [
                    {
                        label: 'Вода (л)',
                        data: [0],
                        borderColor: this.chartColors.water,
                        backgroundColor: this.chartColors.water + '20',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Кислород (кг)',
                        data: [0],
                        borderColor: this.chartColors.oxygen,
                        backgroundColor: this.chartColors.oxygen + '20',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: this.getTextColor(),
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: this.isDarkMode ? '#262828' : '#fffffd',
                        titleColor: this.getTextColor(),
                        bodyColor: this.getTextColor(),
                        borderColor: this.getGridColor(),
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'День',
                            color: this.getTextColor()
                        },
                        ticks: {
                            color: this.getTextColor()
                        },
                        grid: {
                            color: this.getGridColor()
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Количество',
                            color: this.getTextColor()
                        },
                        ticks: {
                            color: this.getTextColor()
                        },
                        grid: {
                            color: this.getGridColor()
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
 * Инициализировать график потоков (притоки и оттоки)
 * @param {string} canvasId - ID элемента Canvas
 */
    initFlowsChart(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.flowsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [0],
                datasets: [
                    {
                        label: 'Расход воды (л/день)',
                        data: [0],
                        borderColor: this.chartColors.waterOutflow,
                        backgroundColor: this.chartColors.waterOutflow + '20',
                        borderWidth: 2,
                        tension: 0.4,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Производство воды (л/день)',
                        data: [0],
                        borderColor: this.chartColors.waterInflow,
                        backgroundColor: this.chartColors.waterInflow + '20',
                        borderWidth: 2,
                        tension: 0.4
                    },
                    {
                        label: 'Расход O₂ (кг/день)',
                        data: [0],
                        borderColor: this.chartColors.oxygenOutflow,
                        backgroundColor: this.chartColors.oxygenOutflow + '20',
                        borderWidth: 2,
                        tension: 0.4,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Производство O₂ (кг/день)',
                        data: [0],
                        borderColor: this.chartColors.oxygenInflow,
                        backgroundColor: this.chartColors.oxygenInflow + '20',
                        borderWidth: 2,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: this.getTextColor(),
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: this.isDarkMode ? '#262828' : '#fffffd',
                        titleColor: this.getTextColor(),
                        bodyColor: this.getTextColor(),
                        borderColor: this.getGridColor(),
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'День',
                            color: this.getTextColor()
                        },
                        ticks: {
                            color: this.getTextColor()
                        },
                        grid: {
                            color: this.getGridColor()
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Поток (единицы/день)',
                            color: this.getTextColor()
                        },
                        ticks: {
                            color: this.getTextColor()
                        },
                        grid: {
                            color: this.getGridColor()
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
 * Обновить графики новыми данными симуляции
 * @param {Object} history - Данные истории симуляции
 */
    updateCharts(history) {
        if (this.stocksChart) {
            this.stocksChart.data.labels = history.days;
            this.stocksChart.data.datasets[0].data = history.water;
            this.stocksChart.data.datasets[1].data = history.oxygen;
            this.stocksChart.update('none');
        }

        if (this.flowsChart) {
            this.flowsChart.data.labels = history.days;
            this.flowsChart.data.datasets[0].data = history.waterOutflow;
            this.flowsChart.data.datasets[1].data = history.waterInflow;
            this.flowsChart.data.datasets[2].data = history.oxygenOutflow;
            this.flowsChart.data.datasets[3].data = history.oxygenInflow;
            this.flowsChart.update('none');
        }
    }

    /**
 * Сбросить графики в начальное состояние
 * @param {number} initialWater - Начальное значение воды
 * @param {number} initialOxygen - Начальное значение кислорода
 */
    resetCharts(initialWater, initialOxygen) {
        if (this.stocksChart) {
            this.stocksChart.data.labels = [0];
            this.stocksChart.data.datasets[0].data = [initialWater];
            this.stocksChart.data.datasets[1].data = [initialOxygen];
            this.stocksChart.update();
        }

        if (this.flowsChart) {
            this.flowsChart.data.labels = [0];
            this.flowsChart.data.datasets[0].data = [0];
            this.flowsChart.data.datasets[1].data = [0];
            this.flowsChart.data.datasets[2].data = [0];
            this.flowsChart.data.datasets[3].data = [0];
            this.flowsChart.update();
        }
    }

    /**
 * Обновить тему графика
 * @param {boolean} isDark - Активен ли темный режим
 */
    updateTheme(isDark) {
        this.isDarkMode = isDark;
        
        const textColor = this.getTextColor();
        const gridColor = this.getGridColor();
        const bgColor = isDark ? '#262828' : '#fffffd';

        // Обновить график запасов
        if (this.stocksChart) {
            this.stocksChart.options.plugins.legend.labels.color = textColor;
            this.stocksChart.options.plugins.tooltip.backgroundColor = bgColor;
            this.stocksChart.options.plugins.tooltip.titleColor = textColor;
            this.stocksChart.options.plugins.tooltip.bodyColor = textColor;
            this.stocksChart.options.plugins.tooltip.borderColor = gridColor;
            this.stocksChart.options.scales.x.title.color = textColor;
            this.stocksChart.options.scales.x.ticks.color = textColor;
            this.stocksChart.options.scales.x.grid.color = gridColor;
            this.stocksChart.options.scales.y.title.color = textColor;
            this.stocksChart.options.scales.y.ticks.color = textColor;
            this.stocksChart.options.scales.y.grid.color = gridColor;
            this.stocksChart.update();
        }

        // Обновить график потоков
        if (this.flowsChart) {
            this.flowsChart.options.plugins.legend.labels.color = textColor;
            this.flowsChart.options.plugins.tooltip.backgroundColor = bgColor;
            this.flowsChart.options.plugins.tooltip.titleColor = textColor;
            this.flowsChart.options.plugins.tooltip.bodyColor = textColor;
            this.flowsChart.options.plugins.tooltip.borderColor = gridColor;
            this.flowsChart.options.scales.x.title.color = textColor;
            this.flowsChart.options.scales.x.ticks.color = textColor;
            this.flowsChart.options.scales.x.grid.color = gridColor;
            this.flowsChart.options.scales.y.title.color = textColor;
            this.flowsChart.options.scales.y.ticks.color = textColor;
            this.flowsChart.options.scales.y.grid.color = gridColor;
            this.flowsChart.update();
        }
    }

    /**
 * Уничтожить все графики
 */
    destroy() {
        if (this.stocksChart) {
            this.stocksChart.destroy();
            this.stocksChart = null;
        }
        if (this.flowsChart) {
            this.flowsChart.destroy();
            this.flowsChart = null;
        }
    }
}