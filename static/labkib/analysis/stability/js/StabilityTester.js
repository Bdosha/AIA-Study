/**
 * Класс для тестирования устойчивости систем корабля
 * Файл: StabilityTester.js
 * Назначение: Управление процессом тестирования и расчетами эффективности
 */

import { validateParameters, generateTestId } from './utils.js';

export class StabilityTester {
    /**
     * Конструктор класса StabilityTester
     */
    constructor() {
        this.tests = [];
        this.currentTest = null;
        this.maxTests = 15;
        this.systemCharacteristics = {
            navigation: { baseStability: 0.6, noiseSensitivity: 0.8 },
            shields: { baseStability: 0.8, noiseSensitivity: 0.6 },
            reactor: { baseStability: 0.7, noiseSensitivity: 0.9 }
        };

        this.initEventListeners();
    }

    /**
     * Инициализация обработчиков событий DOM
     */
    initEventListeners() {
        // Обработчики будут добавлены в основном app.js
        console.log('StabilityTester: Обработчики событий будут инициализированы в основном приложении');
    }

    /**
     * Запуск теста устойчивости системы
     * @param {string} module - Идентификатор модуля системы
     * @param {number} accuracy - Точность датчиков (1-10)
     * @param {number} power - Мощность системы (1-10)
     * @param {number} noise - Уровень помех (0-5)
     * @returns {Object} Результат тестирования
     */
    runTest(module, accuracy, power, noise) {
        try {
            // Валидация входных параметров
            validateParameters(accuracy, power, noise);

            // Расчет эффективности системы
            const efficiency = this.calculateEfficiency(module, accuracy, power, noise);
            const isStable = efficiency >= 50;

            // Создание объекта результата теста
            this.currentTest = {
                id: generateTestId(),
                module: this.getModuleDisplayName(module),
                moduleValue: module,
                accuracy: accuracy,
                power: power,
                noise: noise,
                efficiency: efficiency,
                isStable: isStable,
                timestamp: new Date().toISOString()
            };

            // Сохранение теста в историю
            this.tests.push(this.currentTest);

            return this.currentTest;

        } catch (error) {
            console.error('Ошибка при выполнении теста:', error);
            throw error;
        }
    }

    /**
     * Расчет эффективности системы на основе параметров
     * @param {string} module - Идентификатор модуля
     * @param {number} accuracy - Точность датчиков
     * @param {number} power - Мощность системы
     * @param {number} noise - Уровень помех
     * @returns {number} Эффективность в процентах (0-100)
     */
    calculateEfficiency(module, accuracy, power, noise) {
        const system = this.systemCharacteristics[module];

        if (!system) {
            throw new Error(`Неизвестный модуль системы: ${module}`);
        }

        // Базовая эффективность от 40% до 100%
        let baseEfficiency = 40 + (accuracy * 3) + (power * 3);

        // Влияние характеристик системы
        const systemMultiplier = system.baseStability * 1.2;
        baseEfficiency *= systemMultiplier;

        // Влияние шума с учетом чувствительности системы
        const noiseImpact = noise * 4 * system.noiseSensitivity;
        let finalEfficiency = Math.max(0, baseEfficiency - noiseImpact);

        // Добавление случайного фактора (±5%) для реалистичности
        const randomVariation = (Math.random() * 10) - 5;
        finalEfficiency += randomVariation;

        // Ограничение диапазона 0-100%
        return Math.min(100, Math.max(0, Math.round(finalEfficiency)));
    }

    /**
     * Получение отображаемого имени модуля системы
     * @param {string} moduleValue - Идентификатор модуля
     * @returns {string} Человеко-читаемое имя модуля
     */
    getModuleDisplayName(moduleValue) {
        const moduleNames = {
            navigation: '🧭 Навигация',
            shields: '🛡️ Щиты',
            reactor: '🔋 Реактор'
        };

        return moduleNames[moduleValue] || moduleValue;
    }

    /**
     * Сброс текущего теста
     */
    resetCurrentTest() {
        this.currentTest = null;
    }

    /**
     * Получение количества выполненных тестов
     * @returns {number} Количество тестов
     */
    getTestsCount() {
        return this.tests.length;
    }

    /**
     * Проверка достижения максимального количества тестов
     * @returns {boolean} true если достигнут лимит тестов
     */
    isMaxTestsReached() {
        return this.tests.length >= this.maxTests;
    }

    /**
     * Получение истории всех тестов
     * @returns {Array} Массив объектов тестов
     */
    getTestsHistory() {
        return [...this.tests].reverse(); // Возвращаем в обратном порядке (новые первыми)
    }

    /**
     * Получение текущего активного теста
     * @returns {Object|null} Текущий тест или null
     */
    getCurrentTest() {
        return this.currentTest;
    }

    /**
     * Очистка истории тестов
     */
    clearTests() {
        this.tests = [];
        this.currentTest = null;
    }

    /**
     * Получение статистики по модулям системы
     * @returns {Object} Статистика по каждому модулю
     */
    getSystemStatistics() {
        const stats = {
            navigation: { tests: 0, stable: 0, totalEfficiency: 0, bestEfficiency: 0 },
            shields: { tests: 0, stable: 0, totalEfficiency: 0, bestEfficiency: 0 },
            reactor: { tests: 0, stable: 0, totalEfficiency: 0, bestEfficiency: 0 }
        };

        this.tests.forEach(test => {
            const moduleStats = stats[test.moduleValue];
            if (moduleStats) {
                moduleStats.tests++;
                if (test.isStable) moduleStats.stable++;
                moduleStats.totalEfficiency += test.efficiency;
                if (test.efficiency > moduleStats.bestEfficiency) {
                    moduleStats.bestEfficiency = test.efficiency;
                }
            }
        });

        // Расчет средних значений
        Object.keys(stats).forEach(module => {
            if (stats[module].tests > 0) {
                stats[module].avgEfficiency = Math.round(stats[module].totalEfficiency / stats[module].tests);
                stats[module].stabilityRate = (stats[module].stable / stats[module].tests) * 100;
            } else {
                stats[module].avgEfficiency = 0;
                stats[module].stabilityRate = 0;
            }
        });

        return stats;
    }
}