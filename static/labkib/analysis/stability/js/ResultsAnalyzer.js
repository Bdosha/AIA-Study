/**
 * Класс для анализа результатов тестирования
 * Файл: ResultsAnalyzer.js
 * Назначение: Анализ данных тестов и генерация выводов
 */

import { formatNumber } from './utils.js';

export class ResultsAnalyzer {
    /**
     * Конструктор класса ResultsAnalyzer
     * @param {Array} tests - Массив объектов тестов
     */
    constructor(tests = []) {
        this.tests = tests;
        this.analysisResults = null;
    }

    /**
     * Установка данных тестов для анализа
     * @param {Array} tests - Массив объектов тестов
     */
    setTests(tests) {
        this.tests = tests;
        this.analysisResults = null; // Сбрасываем кэш результатов
    }

    /**
     * Проведение комплексного анализа результатов
     * @returns {Object} Результаты анализа
     */
    analyzeResults() {
        if (this.analysisResults) {
            return this.analysisResults;
        }

        const stats = this.calculateSystemStatistics();
        const bestSystem = this.findBestSystem(stats);
        const optimalParams = this.findOptimalParameters();
        const recommendations = this.generateRecommendations(stats, bestSystem);

        this.analysisResults = {
            statistics: stats,
            bestSystem: bestSystem,
            optimalParameters: optimalParams,
            recommendations: recommendations,
            summary: this.generateSummary(stats, bestSystem)
        };

        return this.analysisResults;
    }

    /**
     * Расчет статистики по системам
     * @returns {Object} Статистика по каждому модулю
     */
    calculateSystemStatistics() {
        const systemStats = {
            navigation: {
                tests: 0,
                stable: 0,
                totalEfficiency: 0,
                bestEfficiency: 0,
                bestParams: null
            },
            shields: {
                tests: 0,
                stable: 0,
                totalEfficiency: 0,
                bestEfficiency: 0,
                bestParams: null
            },
            reactor: {
                tests: 0,
                stable: 0,
                totalEfficiency: 0,
                bestEfficiency: 0,
                bestParams: null
            }
        };

        // Сбор статистики по всем тестам
        this.tests.forEach(test => {
            const stats = systemStats[test.moduleValue];
            if (stats) {
                stats.tests++;
                if (test.isStable) stats.stable++;
                stats.totalEfficiency += test.efficiency;

                // Обновление лучших параметров
                if (!stats.bestParams || test.efficiency > stats.bestParams.efficiency) {
                    stats.bestParams = {
                        accuracy: test.accuracy,
                        power: test.power,
                        efficiency: test.efficiency,
                        noise: test.noise
                    };
                }

                // Обновление лучшей эффективности
                if (test.efficiency > stats.bestEfficiency) {
                    stats.bestEfficiency = test.efficiency;
                }
            }
        });

        // Расчет производных показателей
        Object.keys(systemStats).forEach(system => {
            const stats = systemStats[system];
            if (stats.tests > 0) {
                stats.avgEfficiency = Math.round(stats.totalEfficiency / stats.tests);
                stats.stabilityRate = Math.round((stats.stable / stats.tests) * 100);
                stats.reliabilityIndex = this.calculateReliabilityIndex(stats);
            } else {
                stats.avgEfficiency = 0;
                stats.stabilityRate = 0;
                stats.reliabilityIndex = 0;
            }
        });

        return systemStats;
    }

    /**
     * Расчет индекса надежности системы
     * @param {Object} stats - Статистика системы
     * @returns {number} Индекс надежности (0-100)
     */
    calculateReliabilityIndex(stats) {
        if (stats.tests === 0) return 0;

        // Весовые коэффициенты для разных показателей
        const stabilityWeight = 0.4;
        const efficiencyWeight = 0.4;
        const consistencyWeight = 0.2;

        const stabilityScore = stats.stabilityRate;
        const efficiencyScore = stats.avgEfficiency;
        const consistencyScore = Math.min(100, (stats.bestEfficiency - stats.avgEfficiency) * 2);

        return Math.round(
            (stabilityScore * stabilityWeight) +
            (efficiencyScore * efficiencyWeight) +
            (consistencyScore * consistencyWeight)
        );
    }

    /**
     * Поиск наиболее устойчивой системы
     * @param {Object} stats - Статистика систем
     * @returns {Object} Данные лучшей системы
     */
    findBestSystem(stats) {
        let bestSystem = null;
        let bestReliability = -1;

        Object.keys(stats).forEach(system => {
            const reliability = stats[system].reliabilityIndex;
            if (reliability > bestReliability) {
                bestReliability = reliability;
                bestSystem = {
                    name: system,
                    displayName: this.getSystemDisplayName(system),
                    reliability: reliability,
                    stats: stats[system]
                };
            }
        });

        return bestSystem;
    }

    /**
     * Поиск оптимальных параметров для каждой системы
     * @returns {Object} Оптимальные параметры по системам
     */
    findOptimalParameters() {
        const optimalParams = {};
        const systemTests = this.groupTestsBySystem();

        Object.keys(systemTests).forEach(system => {
            const tests = systemTests[system];
            if (tests.length > 0) {
                // Находим тест с максимальной эффективностью
                const bestTest = tests.reduce((best, current) =>
                    current.efficiency > best.efficiency ? current : best
                );

                optimalParams[system] = {
                    accuracy: bestTest.accuracy,
                    power: bestTest.power,
                    efficiency: bestTest.efficiency,
                    noise: bestTest.noise
                };
            }
        });

        return optimalParams;
    }

    /**
     * Группировка тестов по системам
     * @returns {Object} Тесты сгруппированные по системам
     */
    groupTestsBySystem() {
        const grouped = {
            navigation: [],
            shields: [],
            reactor: []
        };

        this.tests.forEach(test => {
            if (grouped[test.moduleValue]) {
                grouped[test.moduleValue].push(test);
            }
        });

        return grouped;
    }

    /**
     * Генерация рекомендаций по настройке систем
     * @param {Object} stats - Статистика систем
     * @param {Object} bestSystem - Данные лучшей системы
     * @returns {Array} Массив рекомендаций
     */
    generateRecommendations(stats, bestSystem) {
        const recommendations = [];

        // Рекомендация по лучшей системе
        recommendations.push({
            type: 'best_system',
            title: 'Приоритетная система',
            message: `Система ${bestSystem.displayName} показала наилучшую устойчивость с индексом надежности ${bestSystem.reliability}%`
        });

        // Рекомендации по параметрам для каждой системы
        Object.keys(stats).forEach(system => {
            const systemStats = stats[system];
            if (systemStats.bestParams) {
                recommendations.push({
                    type: 'optimal_params',
                    system: system,
                    title: `Оптимальные параметры для ${this.getSystemDisplayName(system)}`,
                    message: `Точность: ${systemStats.bestParams.accuracy}, Мощность: ${systemStats.bestParams.power}, Эффективность: ${systemStats.bestParams.efficiency}%`
                });
            }
        });

        // Общие рекомендации
        const totalStabilityRate = this.calculateOverallStabilityRate(stats);
        if (totalStabilityRate < 60) {
            recommendations.push({
                type: 'warning',
                title: 'Низкая общая устойчивость',
                message: 'Рекомендуется увеличить мощность систем и снизить уровень внешних помех'
            });
        }

        return recommendations;
    }

    /**
     * Расчет общей стабильности всех систем
     * @param {Object} stats - Статистика систем
     * @returns {number} Общий процент стабильности
     */
    calculateOverallStabilityRate(stats) {
        let totalTests = 0;
        let totalStable = 0;

        Object.keys(stats).forEach(system => {
            totalTests += stats[system].tests;
            totalStable += stats[system].stable;
        });

        return totalTests > 0 ? Math.round((totalStable / totalTests) * 100) : 0;
    }

    /**
     * Генерация общего резюме анализа
     * @param {Object} stats - Статистика систем
     * @param {Object} bestSystem - Данные лучшей системы
     * @returns {Object} Общее резюме
     */
    generateSummary(stats, bestSystem) {
        const totalTests = this.tests.length;
        const overallStability = this.calculateOverallStabilityRate(stats);

        return {
            totalTests: totalTests,
            overallStability: overallStability,
            bestSystem: bestSystem.displayName,
            bestReliability: bestSystem.reliability,
            analysisDate: new Date().toLocaleString('ru-RU')
        };
    }

    /**
     * Получение отображаемого имени системы
     * @param {string} system - Идентификатор системы
     * @returns {string} Человеко-читаемое имя
     */
    getSystemDisplayName(system) {
        const systemNames = {
            navigation: '🧭 Навигационная система',
            shields: '🛡️ Система энергощитов',
            reactor: '🔋 Реактор корабля'
        };

        return systemNames[system] || system;
    }

    /**
     * Генерация отчета в текстовом формате
     * @returns {string} Текстовый отчет
     */
    generateTextReport() {
        const analysis = this.analyzeResults();

        let report = `ОТЧЕТ ПО АНАЛИЗУ УСТОЙЧИВОСТИ СИСТЕМ КОРАБЛЯ\n`;
        report += `Дата генерации: ${analysis.summary.analysisDate}\n`;
        report += `Всего проведено тестов: ${analysis.summary.totalTests}\n`;
        report += `Общая устойчивость: ${analysis.summary.overallStability}%\n\n`;

        report += `НАИБОЛЕЕ УСТОЙЧИВАЯ СИСТЕМА:\n`;
        report += `${analysis.bestSystem.displayName} - индекс надежности ${analysis.bestSystem.reliability}%\n\n`;

        report += `СТАТИСТИКА ПО СИСТЕМАМ:\n`;
        Object.keys(analysis.statistics).forEach(system => {
            const stats = analysis.statistics[system];
            report += `${this.getSystemDisplayName(system)}:\n`;
            report += `  Тестов: ${stats.tests}, Устойчивость: ${stats.stabilityRate}%\n`;
            report += `  Средняя эффективность: ${stats.avgEfficiency}%\n`;
            report += `  Лучшая эффективность: ${stats.bestEfficiency}%\n\n`;
        });

        return report;
    }
}