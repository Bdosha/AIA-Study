// ==============================================
// ФАЙЛ: KuramotoSimulator.js
// ==============================================

/**
 * KuramotoSimulator.js
 * Класс для моделирования синхронизации осцилляторов по модели Куромото
 * Реализует математическую модель с поддержкой радиуса взаимодействия и стохастического шума
 */

class KuramotoSimulator {
    /**
     * Конструктор класса KuramotoSimulator
     * Инициализирует систему с заданными параметрами
     */
    constructor() {
        // Количество осцилляторов (экобиомодулей)
        this.N = 20;

        // Массивы состояния системы
        this.phases = Array(this.N).fill(0);           // Фазы осцилляторов θᵢ
        this.frequencies = Array(this.N).fill(0);      // Собственные частоты ωᵢ
        this.orderHistory = [];                        // История параметра порядка r(t)

        // Управляемые параметры
        this.K = 0.5;              // Сила связи
        this.sigma = 0.3;          // Разброс частот
        this.radius = 10;          // Радиус взаимодействия
        this.maxIter = 300;        // Максимальное число итераций

        // Случайный параметр шума (генерируется при инициализации)
        this.noiseAmplitude = Math.random() * 0.15 + 0.05; // ξ ∈ [0.05, 0.2]

        // Состояние симуляции
        this.isRunning = false;
        this.iteration = 0;
        this.syncTime = null;      // Время достижения синхронизации

        // Данные эксперимента
        this.experimentData = {
            startTime: null,
            endTime: null,
            finalSync: 0
        };
    }

    /**
     * Инициализация системы осцилляторов
     * Генерирует случайные начальные фазы и частоты
     */
    initializeSystem() {
        // Генерация случайных начальных фаз θᵢ(0) ∈ [0, 2π]
        for (let i = 0; i < this.N; i++) {
            this.phases[i] = Math.random() * 2 * Math.PI;
        }

        // Генерация собственных частот с нормальным распределением
        // ωᵢ = ω₀ + σ·η, где η ~ N(0,1)
        const omega0 = 0.1;  // Базовая частота
        for (let i = 0; i < this.N; i++) {
            this.frequencies[i] = omega0 + this.sigma * this.gaussianRandom();
        }

        // Сброс истории и счетчиков
        this.orderHistory = [];
        this.iteration = 0;
        this.syncTime = null;
        this.experimentData.startTime = new Date();
    }

    /**
     * Генерация случайного числа с нормальным распределением N(0,1)
     * Использует метод Бокса-Мюллера
     * @returns {number} Случайное число из N(0,1)
     */
    gaussianRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Получение списка соседей для осциллятора i в радиусе R
     * Использует кольцевую топологию с циклическим расстоянием
     * @param {number} i - Индекс осциллятора
     * @returns {Array<number>} Массив индексов соседей
     */
    getNeighbors(i) {
        const neighbors = [];
        for (let j = 0; j < this.N; j++) {
            if (i === j) continue;

            // Вычисление циклического расстояния на кольце
            const dist = Math.min(
                Math.abs(i - j),
                this.N - Math.abs(i - j)
            );

            // Добавление в соседи, если расстояние не превышает радиус
            if (dist <= this.radius) {
                neighbors.push(j);
            }
        }
        return neighbors;
    }

    /**
     * Вычисление параметра порядка r(t)
     * r(t) = |1/N Σⱼ exp(iθⱼ(t))|
     * @returns {number} Значение параметра порядка r ∈ [0, 1]
     */
    calculateOrderParameter() {
        let real = 0, imag = 0;

        // Вычисление комплексного среднего exp(iθⱼ)
        for (let i = 0; i < this.N; i++) {
            real += Math.cos(this.phases[i]);
            imag += Math.sin(this.phases[i]);
        }

        // Модуль комплексного среднего
        return Math.sqrt(real * real + imag * imag) / this.N;
    }

    /**
     * Обновление фаз всех осцилляторов на один временной шаг
     * Реализует дискретное уравнение Куромото с шумом:
     * θᵢ(t+1) = θᵢ(t) + ωᵢ + (K/N_eff)Σⱼ sin(θⱼ - θᵢ) + ξ·η(t)
     */
    updatePhases() {
        const newPhases = [...this.phases];

        for (let i = 0; i < this.N; i++) {
            // Вычисление взаимодействия с соседями
            let coupling = 0;
            const neighbors = this.getNeighbors(i);

            for (let j of neighbors) {
                coupling += Math.sin(this.phases[j] - this.phases[i]);
            }

            // Эффективное количество соседей
            const effectiveN = neighbors.length;

            // Генерация случайного шума
            const noise = this.noiseAmplitude * this.gaussianRandom();

            // Обновление фазы по формуле Куромото
            newPhases[i] = this.phases[i] + this.frequencies[i] +
                (effectiveN > 0 ? (this.K / effectiveN) * coupling : 0) +
                noise;

            // Нормализация фазы в диапазон [0, 2π]
            newPhases[i] = newPhases[i] % (2 * Math.PI);
            if (newPhases[i] < 0) newPhases[i] += 2 * Math.PI;
        }

        this.phases = newPhases;
    }

    /**
     * Выполнение одного шага симуляции
     * Обновляет фазы, вычисляет параметр порядка, проверяет условия завершения
     */
    step() {
        if (!this.isRunning || this.iteration >= this.maxIter) {
            if (this.iteration >= this.maxIter && this.isRunning) {
                this.isRunning = false;
                this.showResults();
            }
            return;
        }

        // Обновление фаз
        this.updatePhases();

        // Вычисление параметра порядка
        const orderParam = this.calculateOrderParameter();
        this.orderHistory.push(orderParam);

        // Проверка достижения синхронизации (r > 0.8)
        if (orderParam > 0.8 && this.syncTime === null) {
            this.syncTime = this.iteration;
        }

        this.iteration++;
    }

    /**
     * Показ результатов эксперимента в модальном окне
     * Формирует таблицу параметров и отображает использованные формулы
     */
    showResults() {
        this.experimentData.endTime = new Date();
        this.experimentData.finalSync = this.orderHistory[this.orderHistory.length - 1];

        const tbody = document.getElementById('params-table-body');
        tbody.innerHTML = `
            <tr>
                <td>Сила связи (K)</td>
                <td>${this.K.toFixed(2)}</td>
                <td>Управляемый параметр</td>
            </tr>
            <tr>
                <td>Разброс частот (σ)</td>
                <td>${this.sigma.toFixed(2)}</td>
                <td>Управляемый параметр</td>
            </tr>
            <tr>
                <td>Радиус взаимодействия (R)</td>
                <td>${this.radius}</td>
                <td>Управляемый параметр</td>
            </tr>
            <tr>
                <td>Амплитуда шума (ξ)</td>
                <td>${this.noiseAmplitude.toFixed(3)}</td>
                <td><strong>Случайный параметр</strong></td>
            </tr>
            <tr>
                <td>Количество модулей (N)</td>
                <td>${this.N}</td>
                <td>Константа системы</td>
            </tr>
            <tr>
                <td>Итераций выполнено</td>
                <td>${this.iteration}</td>
                <td>Время моделирования</td>
            </tr>
            <tr>
                <td>Финальная синхронизация</td>
                <td>${(this.experimentData.finalSync * 100).toFixed(1)}%</td>
                <td>Результат эксперимента</td>
            </tr>
            <tr>
                <td>Время синхронизации</td>
                <td>${this.syncTime !== null ? this.syncTime : 'Не достигнута'}</td>
                <td>Скорость синхронизации</td>
            </tr>
        `;

        // Открытие модального окна
        document.getElementById('results-modal').style.display = 'block';
    }

    /**
     * Установка параметров системы
     * @param {Object} params - Объект с параметрами {K, sigma, radius, maxIter}
     */
    setParameters(params) {
        if (params.K !== undefined) this.K = params.K;
        if (params.sigma !== undefined) this.sigma = params.sigma;
        if (params.radius !== undefined) this.radius = params.radius;
        if (params.maxIter !== undefined) this.maxIter = params.maxIter;
    }

    /**
     * Запуск симуляции
     */
    start() {
        this.isRunning = true;
    }

    /**
     * Пауза симуляции
     */
    pause() {
        this.isRunning = false;
    }

    /**
     * Сброс системы с генерацией нового шума
     */
    reset() {
        this.isRunning = false;
        this.noiseAmplitude = Math.random() * 0.15 + 0.05;
        this.initializeSystem();
    }
}

