/**
 * Класс симуляции системной динамики
 * Реализует метод Рунге-Кутты 4-го порядка для численного интегрирования
 * дифференциальных уравнений моделирования потоков и запасов ресурсов
 */
class SystemSimulation {
    /**
 * Создать новую системную симуляцию
 * @param {Object} params - Начальные параметры симуляции
 */
    constructor(params) {
        this.params = params;
        this.state = {
            water: params.initialWater,
            oxygen: params.initialOxygen,
            day: 0
        };
        this.history = {
            days: [0],
            water: [params.initialWater],
            oxygen: [params.initialOxygen],
            waterInflow: [0],
            waterOutflow: [0],
            oxygenInflow: [0],
            oxygenOutflow: [0]
        };
        this.isRunning = false;
        this.isPaused = false;
        this.dt = 1.0; // Временной шаг в днях
    }

    /**
 * Рассчитать приток воды (производство/фильтрация)
 * @param {number} water - Текущий запас воды
 * @возвращает {number} Water inflow rate (L/day)
 */
    calculateWaterInflow(water) {
        // Фильтрация воды регенерирует часть использованной воды
        const consumption = this.params.crewSize * this.params.waterConsumption;
        const efficiency = this.params.waterEfficiency / 100;
        return consumption * efficiency;
    }

    /**
 * Рассчитать отток воды (потребление)
 * @возвращает {number} Water outflow rate (L/day)
 */
    calculateWaterOutflow() {
        return this.params.crewSize * this.params.waterConsumption;
    }

    /**
 * Рассчитать приток кислорода (регенерация)
 * @param {number} oxygen - Текущий запас кислорода
 * @возвращает {number} Oxygen inflow rate (kg/day)
 */
    calculateOxygenInflow(oxygen) {
        // Регенерация кислорода производит часть потребленного кислорода
        const consumption = this.params.crewSize * this.params.oxygenConsumption;
        const efficiency = this.params.oxygenEfficiency / 100;
        return consumption * efficiency;
    }

    /**
 * Рассчитать отток кислорода (потребление)
 * @возвращает {number} Oxygen outflow rate (kg/day)
 */
    calculateOxygenOutflow() {
        return this.params.crewSize * this.params.oxygenConsumption;
    }

    /**
 * Дифференциальные уравнения для системы
 * dW/dt = Fin_w - Fout_w
 * dO/dt = Fin_o - Fout_o
 * @param {Object} state - Текущее состояние {вода, кислород, день}
 * @возвращает {Object} Derivatives {dWater, dOxygen}
 */
    derivatives(state) {
        const waterInflow = this.calculateWaterInflow(state.water);
        const waterOutflow = this.calculateWaterOutflow();
        const oxygenInflow = this.calculateOxygenInflow(state.oxygen);
        const oxygenOutflow = this.calculateOxygenOutflow();

        return {
            dWater: waterInflow - waterOutflow,
            dOxygen: oxygenInflow - oxygenOutflow,
            waterInflow,
            waterOutflow,
            oxygenInflow,
            oxygenOutflow
        };
    }

    /**
 * Шаг интегрирования методом Рунге-Кутты 4-го порядка
 * @возвращает {Object} New state after one time step
 */
    rungeKuttaStep() {
        const state = this.state;
        const dt = this.dt;

        // k1 = f(t, y)
        const k1 = this.derivatives(state);

        // k2 = f(t + dt/2, y + k1*dt/2)
        const state2 = {
            water: state.water + k1.dWater * dt / 2,
            oxygen: state.oxygen + k1.dOxygen * dt / 2,
            day: state.day + dt / 2
        };
        const k2 = this.derivatives(state2);

        // k3 = f(t + dt/2, y + k2*dt/2)
        const state3 = {
            water: state.water + k2.dWater * dt / 2,
            oxygen: state.oxygen + k2.dOxygen * dt / 2,
            day: state.day + dt / 2
        };
        const k3 = this.derivatives(state3);

        // k4 = f(t + dt, y + k3*dt)
        const state4 = {
            water: state.water + k3.dWater * dt,
            oxygen: state.oxygen + k3.dOxygen * dt,
            day: state.day + dt
        };
        const k4 = this.derivatives(state4);

        // y(t+dt) = y(t) + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        const newWater = state.water + dt / 6 * (k1.dWater + 2 * k2.dWater + 2 * k3.dWater + k4.dWater);
        const newOxygen = state.oxygen + dt / 6 * (k1.dOxygen + 2 * k2.dOxygen + 2 * k3.dOxygen + k4.dOxygen);
        const newDay = state.day + dt;

        // Использовать конечные производные для истории потоков
        const finalDerivs = this.derivatives({
            water: newWater,
            oxygen: newOxygen,
            day: newDay
        });

        return {
            water: Math.max(0, newWater),
            oxygen: Math.max(0, newOxygen),
            day: newDay,
            flows: finalDerivs
        };
    }

    /**
 * Выполнить один шаг симуляции
 * @возвращает {Object} Current state and flows
 */
    step() {
        if (this.state.day >= this.params.duration) {
            this.isRunning = false;
            return null;
        }

        const result = this.rungeKuttaStep();
        this.state = {
            water: result.water,
            oxygen: result.oxygen,
            day: result.day
        };

        // Записать историю
        this.history.days.push(result.day);
        this.history.water.push(result.water);
        this.history.oxygen.push(result.oxygen);
        this.history.waterInflow.push(result.flows.waterInflow);
        this.history.waterOutflow.push(result.flows.waterOutflow);
        this.history.oxygenInflow.push(result.flows.oxygenInflow);
        this.history.oxygenOutflow.push(result.flows.oxygenOutflow);

        return {
            ...this.state,
            flows: result.flows
        };
    }

    /**
 * Обновить параметры симуляции
 * @param {Object} newParams - Новые значения параметров
 */
    updateParameters(newParams) {
        this.params = { ...this.params, ...newParams };
    }

    /**
 * Сбросить симуляцию в начальное состояние
 */
    reset() {
        this.state = {
            water: this.params.initialWater,
            oxygen: this.params.initialOxygen,
            day: 0
        };
        this.history = {
            days: [0],
            water: [this.params.initialWater],
            oxygen: [this.params.initialOxygen],
            waterInflow: [0],
            waterOutflow: [0],
            oxygenInflow: [0],
            oxygenOutflow: [0]
        };
        this.isRunning = false;
        this.isPaused = false;
    }

    /**
 * Запустить симуляцию
 */
    start() {
        this.isRunning = true;
        this.isPaused = false;
    }

    /**
 * Остановить симуляцию
 */
    stop() {
        this.isRunning = false;
        this.isPaused = true;
    }

    /**
 * Получить текущий статус системы
 * @возвращает {string} Status: 'normal', 'warning', or 'critical'
 */
    getStatus() {
        const waterPercent = (this.state.water / this.params.initialWater) * 100;
        const oxygenPercent = (this.state.oxygen / this.params.initialOxygen) * 100;
        const minPercent = Math.min(waterPercent, oxygenPercent);

        if (minPercent < 10) return 'critical';
        if (minPercent < 30) return 'warning';
        return 'normal';
    }

    /**
 * Оценить дни до истощения ресурсов
 * @возвращает {Object} Days until water and oxygen depletion
 */
    estimateDepletion() {
        const waterRate = this.calculateWaterOutflow() - this.calculateWaterInflow(this.state.water);
        const oxygenRate = this.calculateOxygenOutflow() - this.calculateOxygenInflow(this.state.oxygen);

        const waterDays = waterRate > 0 ? this.state.water / waterRate : Infinity;
        const oxygenDays = oxygenRate > 0 ? this.state.oxygen / oxygenRate : Infinity;

        return {
            water: waterDays,
            oxygen: oxygenDays,
            critical: Math.min(waterDays, oxygenDays)
        };
    }

    /**
 * Экспортировать данные симуляции в формат CSV
 * @возвращает {string} CSV formatted data
 */
    exportToCSV() {
        let csv = 'День,Вода (л),Кислород (кг),Приток воды (л/день),Расход воды (л/день),Приток кислорода (кг/день),Расход кислорода (кг/день)\n';
        
        for (let i = 0; i < this.history.days.length; i++) {
            csv += `${this.history.days[i].toFixed(1)},`;
            csv += `${this.history.water[i].toFixed(2)},`;
            csv += `${this.history.oxygen[i].toFixed(2)},`;
            csv += `${this.history.waterInflow[i].toFixed(2)},`;
            csv += `${this.history.waterOutflow[i].toFixed(2)},`;
            csv += `${this.history.oxygenInflow[i].toFixed(2)},`;
            csv += `${this.history.oxygenOutflow[i].toFixed(2)}\n`;
        }
        
        return csv;
    }
}