/**
 * Класс управления сценариями
 * Управляет предопределенными аварийными сценариями для системы жизнеобеспечения
 */
class ScenarioManager {
    /**
 * Создать новый менеджер сценариев
 */
    constructor() {
        this.scenarios = {
            normal: {
                name: 'Нормальная работа',
                description: 'Все системы работают в штатном режиме',
                waterEfficiency: 80,
                oxygenEfficiency: 70
            },
            water_failure: {
                name: 'Поломка фильтрации воды',
                description: 'Система фильтрации воды работает с пониженной эффективностью',
                waterEfficiency: 20,
                oxygenEfficiency: 70
            },
            oxygen_failure: {
                name: 'Отказ системы кислорода',
                description: 'Система регенерации кислорода практически не работает',
                waterEfficiency: 80,
                oxygenEfficiency: 10
            },
            critical_failure: {
                name: 'Критическая авария',
                description: 'Обе системы жизнеобеспечения работают в аварийном режиме',
                waterEfficiency: 5,
                oxygenEfficiency: 5
            },
            custom: {
                name: 'Пользовательский сценарий',
                description: 'Настраиваемые параметры эффективности систем',
                waterEfficiency: null,
                oxygenEfficiency: null
            }
        };
        this.currentScenario = 'normal';
    }

    /**
 * Получить данные сценария по ID
 * @param {string} scenarioId - Идентификатор сценария
 * @возвращает {Object} Scenario data
 */
    getScenario(scenarioId) {
        return this.scenarios[scenarioId] || this.scenarios.normal;
    }

    /**
 * Получить все доступные сценарии
 * @возвращает {Object} All scenarios
 */
    getAllScenarios() {
        return this.scenarios;
    }

    /**
 * Установить текущий сценарий
 * @param {string} scenarioId - Идентификатор сценария
 */
    setCurrentScenario(scenarioId) {
        if (this.scenarios[scenarioId]) {
            this.currentScenario = scenarioId;
        }
    }

    /**
 * Получить текущий сценарий
 * @возвращает {Object} Current scenario data
 */
    getCurrentScenario() {
        return this.getScenario(this.currentScenario);
    }

    /**
 * Применить сценарий к параметрам симуляции
 * @param {Object} params - Текущие параметры
 * @param {string} scenarioId - Сценарий для применения
 * @возвращает {Object} Updated parameters
 */
    applyScenario(params, scenarioId) {
        const scenario = this.getScenario(scenarioId);
        const updatedParams = { ...params };

        // Обновлять только если у сценария есть определенные значения (не пользовательский)
        if (scenario.waterEfficiency !== null) {
            updatedParams.waterEfficiency = scenario.waterEfficiency;
        }
        if (scenario.oxygenEfficiency !== null) {
            updatedParams.oxygenEfficiency = scenario.oxygenEfficiency;
        }

        return updatedParams;
    }

    /**
 * Получить уровень серьезности сценария
 * @param {string} scenarioId - Идентификатор сценария
 * @возвращает {string} Severity: 'normal', 'warning', 'critical'
 */
    getScenarioSeverity(scenarioId) {
        const scenario = this.getScenario(scenarioId);
        if (!scenario.waterEfficiency || !scenario.oxygenEfficiency) {
            return 'custom';
        }

        const avgEfficiency = (scenario.waterEfficiency + scenario.oxygenEfficiency) / 2;
        if (avgEfficiency < 20) return 'critical';
        if (avgEfficiency < 50) return 'warning';
        return 'normal';
    }

    /**
 * Получить рекомендации по сценарию
 * @param {string} scenarioId - Идентификатор сценария
 * @возвращает {Array<string>} List of recommendations
 */
    getRecommendations(scenarioId) {
        const recommendations = {
            normal: [
                'Поддерживать регулярное техническое обслуживание',
                'Мониторить уровни ресурсов',
                'Проводить профилактические проверки систем'
            ],
            water_failure: [
                'Снизить потребление воды экипажем',
                'Активировать резервные системы фильтрации',
                'Подготовить аварийные запасы воды',
                'Начать ремонт системы фильтрации'
            ],
            oxygen_failure: [
                'Снизить физическую активность экипажа',
                'Активировать резервные баллоны с кислородом',
                'Изолировать неиспользуемые отсеки',
                'Начать экстренный ремонт системы регенерации'
            ],
            critical_failure: [
                'КРИТИЧЕСКАЯ СИТУАЦИЯ: Начать эвакуацию',
                'Активировать все аварийные системы',
                'Минимизировать потребление всех ресурсов',
                'Отправить сигнал бедствия',
                'Подготовить спасательные капсулы'
            ],
            custom: [
                'Оценить ситуацию на основе текущих параметров',
                'Следить за критическими уровнями ресурсов'
            ]
        };

        return recommendations[scenarioId] || [];
    }

    /**
 * Оценить продолжительность миссии для сценария
 * @param {Object} params - Параметры симуляции
 * @param {string} scenarioId - Идентификатор сценария
 * @возвращает {number} Estimated safe mission days
 */
    estimateMissionDuration(params, scenarioId) {
        const scenario = this.getScenario(scenarioId);
        const waterEfficiency = scenario.waterEfficiency || params.waterEfficiency;
        const oxygenEfficiency = scenario.oxygenEfficiency || params.oxygenEfficiency;

        const waterConsumption = params.crewSize * params.waterConsumption;
        const oxygenConsumption = params.crewSize * params.oxygenConsumption;

        const waterNetLoss = waterConsumption * (1 - waterEfficiency / 100);
        const oxygenNetLoss = oxygenConsumption * (1 - oxygenEfficiency / 100);

        const waterDays = waterNetLoss > 0 ? params.initialWater / waterNetLoss : Infinity;
        const oxygenDays = oxygenNetLoss > 0 ? params.initialOxygen / oxygenNetLoss : Infinity;

        return Math.min(waterDays, oxygenDays);
    }
}