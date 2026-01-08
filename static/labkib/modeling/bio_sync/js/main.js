// ==============================================
// ФАЙЛ: main.js
// ==============================================

/**
 * main.js
 * Точка входа приложения
 * Инициализирует все модули и запускает основной цикл симуляции
 */

// Глобальная функция для закрытия модального окна
function closeModal() {
    document.getElementById('results-modal').style.display = 'none';
}

// Инициализация при загрузке DOM
window.addEventListener('DOMContentLoaded', () => {
    // Инициализация менеджера тем
    const themeManager = new ThemeManager();
    themeManager.init();

    // Инициализация симулятора
    const simulator = new KuramotoSimulator();
    simulator.initializeSystem();

    // Инициализация рендерера
    const oscillatorCanvas = document.getElementById('oscillator-canvas');
    const chartCanvas = document.getElementById('order-chart');
    const renderer = new ChartRenderer(oscillatorCanvas, chartCanvas);

    // Инициализация контроллера интерфейса
    const uiController = new UIController(simulator);
    uiController.init();

    /**
     * Основной цикл анимации
     * Выполняет шаги симуляции и обновляет визуализацию
     */
    function animate() {
        // Выполнение шага симуляции
        simulator.step();

        // Обновление визуализации
        renderer.drawOscillators(simulator.phases,
            simulator.orderHistory[simulator.orderHistory.length - 1] || 0,
            simulator.N);
        renderer.drawChart(simulator.orderHistory);

        // Обновление интерфейса
        if (simulator.orderHistory.length > 0) {
            uiController.updateUI(simulator.orderHistory[simulator.orderHistory.length - 1]);
        }

        // Запуск следующего кадра
        setTimeout(() => animate(), 100);  // 10 FPS
    }

    // Запуск цикла анимации
    animate();
});