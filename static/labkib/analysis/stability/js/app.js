/**
 * Основной класс приложения
 * Файл: app.js
 * Назначение: Координация работы всех модулей и управление интерфейсом
 */

import { ThemeManager } from './ThemeManager.js';
import { StabilityTester } from './StabilityTester.js';
import { ResultsAnalyzer } from './ResultsAnalyzer.js';
import { animatePageTransition } from './utils.js';

// Главный класс приложения
class ShipStabilityApp {
    /**
     * Конструктор приложения
     */
    constructor() {
        this.themeManager = null;
        this.stabilityTester = null;
        this.resultsAnalyzer = null;

        this.currentPage = 'main';
        this.isInitialized = false;

        this.initializeApp();
    }

    /**
     * Инициализация приложения
     */
    async initializeApp() {
        try {
            // Инициализация менеджера тем
            this.themeManager = new ThemeManager();

            // Инициализация тестера устойчивости
            this.stabilityTester = new StabilityTester();

            // Инициализация анализатора результатов
            this.resultsAnalyzer = new ResultsAnalyzer();

            // Инициализация DOM элементов и обработчиков событий
            this.initializeDOM();
            this.initializeEventListeners();

            this.isInitialized = true;
            console.log('Приложение инициализировано успешно');

        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            this.showError('Ошибка инициализации приложения');
        }
    }

    /**
     * Инициализация DOM элементов
     */
    initializeDOM() {
        // Получение ссылок на основные элементы интерфейса
        this.elements = {
            // Основные страницы
            mainPage: document.getElementById('mainPage'),
            resultsPage: document.getElementById('resultsPage'),

            // Элементы управления
            moduleSelect: document.getElementById('moduleSelect'),
            noiseLevel: document.getElementById('noiseLevel'),
            noiseValue: document.getElementById('noiseValue'),
            sensorAccuracy: document.getElementById('sensorAccuracy'),
            systemPower: document.getElementById('systemPower'),
            startTest: document.getElementById('startTest'),
            resetTest: document.getElementById('resetTest'),
            finishAnalysis: document.getElementById('finishAnalysis'),
            newAnalysis: document.getElementById('newAnalysis'),

            // Элементы отображения результатов
            statusLight: document.getElementById('statusLight'),
            statusText: document.getElementById('statusText'),
            kpeValue: document.getElementById('kpeValue'),
            testCount: document.getElementById('testCount'),

            // Элементы истории
            historyBody: document.getElementById('historyBody'),
            finalHistoryBody: document.getElementById('finalHistoryBody'),

            // Элементы результатов анализа
            bestSystemResult: document.getElementById('bestSystemResult'),
            optimalParams: document.getElementById('optimalParams'),
            generalConclusion: document.getElementById('generalConclusion')
        };

        // Проверка что все элементы найдены
        this.validateDOMElements();
    }

    /**
     * Проверка наличия всех необходимых DOM элементов
     */
    validateDOMElements() {
        const missingElements = [];

        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                missingElements.push(key);
            }
        });

        if (missingElements.length > 0) {
            throw new Error(`Не найдены DOM элементы: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Инициализация обработчиков событий
     */
    initializeEventListeners() {
        // Обработчик изменения уровня шума
        this.elements.noiseLevel.addEventListener('input', (e) => {
            this.elements.noiseValue.textContent = e.target.value;
        });

        // Обработчик запуска теста
        this.elements.startTest.addEventListener('click', () => {
            this.runStabilityTest();
        });

        // Обработчик сброса теста
        this.elements.resetTest.addEventListener('click', () => {
            this.resetCurrentTest();
        });

        // Обработчик завершения анализа
        this.elements.finishAnalysis.addEventListener('click', () => {
            this.showResultsPage();
        });

        // Обработчик нового анализа
        this.elements.newAnalysis.addEventListener('click', () => {
            this.showMainPage();
        });

        // Обработчики клавиш для быстрого доступа
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentPage === 'main') {
                this.runStabilityTest();
            } else if (e.key === 'Escape') {
                this.resetCurrentTest();
            }
        });
    }

    /**
     * Запуск теста устойчивости
     */
    async runStabilityTest() {
        try {
            // Получение значений из формы
            const module = this.elements.moduleSelect.value;
            const accuracy = parseInt(this.elements.sensorAccuracy.value);
            const power = parseInt(this.elements.systemPower.value);
            const noise = parseFloat(this.elements.noiseLevel.value);

            // Валидация введенных данных
            if (isNaN(accuracy) || isNaN(power) || isNaN(noise)) {
                throw new Error('Пожалуйста, введите корректные числовые значения');
            }

            // Выполнение теста
            const testResult = this.stabilityTester.runTest(module, accuracy, power, noise);

            // Обновление интерфейса с результатами
            this.updateTestResultsUI(testResult);

            // Обновление счетчика тестов
            this.updateTestsCounter();

            // Проверка достижения лимита тестов
            if (this.stabilityTester.isMaxTestsReached()) {
                this.elements.finishAnalysis.style.display = 'block';
            }

        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * Обновление интерфейса с результатами теста
     * @param {Object} testResult - Результат тестирования
     */
    updateTestResultsUI(testResult) {
        const { efficiency, isStable } = testResult;

        // Обновление индикатора статуса
        this.elements.statusLight.className = 'status-light ' + (isStable ? 'stable' : 'unstable');
        this.elements.statusText.textContent = isStable ? 'СИСТЕМА УСТОЙЧИВА' : 'СИСТЕМА НЕУСТОЙЧИВА';
        this.elements.statusText.className = isStable ? 'stable-text' : 'unstable-text';

        // Обновление значения эффективности
        this.elements.kpeValue.textContent = efficiency + '%';
        this.elements.kpeValue.className = isStable ? 'stable-text' : 'unstable-text';

        // Добавление в историю тестов
        this.addTestToHistory(testResult);
    }

    /**
     * Добавление теста в таблицу истории
     * @param {Object} test - Объект теста
     */
    addTestToHistory(test) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${test.module}</td>
            <td>${test.accuracy}</td>
            <td>${test.power}</td>
            <td>${test.noise}</td>
            <td>${test.efficiency}%</td>
            <td>${test.isStable ? 'Устойчив' : 'Неустойчив'}</td>
        `;
        this.elements.historyBody.insertBefore(row, this.elements.historyBody.firstChild);

        // Ограничение истории 15 последними записями
        if (this.elements.historyBody.children.length > 15) {
            this.elements.historyBody.removeChild(this.elements.historyBody.lastChild);
        }
    }

    /**
     * Обновление счетчика проведенных тестов
     */
    updateTestsCounter() {
        const testsCount = this.stabilityTester.getTestsCount();
        this.elements.testCount.textContent = testsCount;
    }

    /**
     * Сброс текущего теста
     */
    resetCurrentTest() {
        this.stabilityTester.resetCurrentTest();

        // Сброс UI к исходному состоянию
        this.elements.statusLight.className = 'status-light';
        this.elements.statusText.textContent = 'Готов к тестированию';
        this.elements.statusText.className = '';
        this.elements.kpeValue.textContent = '-';
        this.elements.kpeValue.className = '';
    }

    /**
     * Показать страницу результатов
     */
    async showResultsPage() {
        try {
            // Обновление данных в анализаторе
            this.resultsAnalyzer.setTests(this.stabilityTester.tests);

            // Анализ результатов
            const analysis = this.resultsAnalyzer.analyzeResults();

            // Обновление UI страницы результатов
            this.updateResultsPageUI(analysis);

            // Анимация перехода
            await animatePageTransition(this.elements.mainPage, this.elements.resultsPage);

            this.currentPage = 'results';

        } catch (error) {
            this.showError('Ошибка при отображении результатов: ' + error.message);
        }
    }

    /**
     * Обновление интерфейса страницы результатов
     * @param {Object} analysis - Результаты анализа
     */
    updateResultsPageUI(analysis) {
        // Перенос истории тестов
        this.elements.finalHistoryBody.innerHTML = this.elements.historyBody.innerHTML;

        // Отображение лучшей системы
        this.elements.bestSystemResult.innerHTML = `
            <h3>НАИБОЛЕЕ УСТОЙЧИВАЯ СИСТЕМА: ${analysis.bestSystem.displayName}</h3>
            <p>Уровень устойчивости: ${analysis.bestSystem.stats.stabilityRate}%</p>
            <p>Средняя эффективность: ${analysis.bestSystem.stats.avgEfficiency}%</p>
            <p>Индекс надежности: ${analysis.bestSystem.reliability}%</p>
        `;

        // Отображение оптимальных параметров
        this.elements.optimalParams.innerHTML = `
            <div class="param-card">
                <h4>🧭 Навигация</h4>
                <p>Точность: ${analysis.statistics.navigation.bestParams?.accuracy || 'Н/Д'}</p>
                <p>Мощность: ${analysis.statistics.navigation.bestParams?.power || 'Н/Д'}</p>
                <p>Эффективность: ${analysis.statistics.navigation.bestParams?.efficiency || 'Н/Д'}%</p>
            </div>
            <div class="param-card">
                <h4>🛡️ Щиты</h4>
                <p>Точность: ${analysis.statistics.shields.bestParams?.accuracy || 'Н/Д'}</p>
                <p>Мощность: ${analysis.statistics.shields.bestParams?.power || 'Н/Д'}</p>
                <p>Эффективность: ${analysis.statistics.shields.bestParams?.efficiency || 'Н/Д'}%</p>
            </div>
            <div class="param-card">
                <h4>🔋 Реактор</h4>
                <p>Точность: ${analysis.statistics.reactor.bestParams?.accuracy || 'Н/Д'}</p>
                <p>Мощность: ${analysis.statistics.reactor.bestParams?.power || 'Н/Д'}</p>
                <p>Эффективность: ${analysis.statistics.reactor.bestParams?.efficiency || 'Н/Д'}%</p>
            </div>
        `;

        // Общий вывод
        this.elements.generalConclusion.innerHTML = `
            <h4>ОБЩИЙ ВЫВОД:</h4>
            <p>На основе ${analysis.summary.totalTests} проведенных тестов установлено, что все системы корабля демонстрируют разную степень устойчивости к космическим помехам. Общий уровень устойчивости систем составляет ${analysis.summary.overallStability}%. Для обеспечения максимальной надежности рекомендуется использовать указанные выше оптимальные параметры настройки.</p>
        `;
    }

    /**
     * Показать главную страницу
     */
    async showMainPage() {
        // Сброс данных для нового анализа
        this.stabilityTester.clearTests();
        this.elements.testCount.textContent = '0';
        this.elements.historyBody.innerHTML = '';
        this.elements.finishAnalysis.style.display = 'none';
        this.resetCurrentTest();

        // Анимация перехода
        await animatePageTransition(this.elements.resultsPage, this.elements.mainPage);

        this.currentPage = 'main';
    }

    /**
     * Показать сообщение об ошибке
     * @param {string} message - Текст ошибки
     */
    showError(message) {
        // Простая реализация показа ошибок
        alert('Ошибка: ' + message);
        console.error('Ошибка приложения:', message);
    }

    /**
     * Получение текущего состояния приложения
     * @returns {Object} Состояние приложения
     */
    getAppState() {
        return {
            currentPage: this.currentPage,
            testsCount: this.stabilityTester.getTestsCount(),
            currentTheme: this.themeManager.getCurrentTheme(),
            isInitialized: this.isInitialized
        };
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.shipStabilityApp = new ShipStabilityApp();
});

// Экспорт для использования в других модулях (если потребуется)
export { ShipStabilityApp };