/**
 * Файл: simulation.js
 * Описание: Главный контроллер симуляции - управляет UI, графиками и циклом симуляции
 * 
 * Содержит:
 * - ChartManager: управление графиками Chart.js (популяция и энергия)
 * - Simulation: главный класс приложения с полным функционалом
 * 
 * Ответственность:
 * - Инициализация всех компонентов (Environment, Canvas, Charts)
 * - Обработка событий UI (кнопки, слайдеры, чекбоксы)
 * - Управление темами (светлая/тёмная)
 * - Главный игровой цикл (update → render → animate)
 * - Обновление статистики в реальном времени
 * - Построение и обновление графиков
 * - Обработка вымирания популяции
 * 
 * Архитектура:
 * 
 *     index.html (UI)
 *          ↓
 *     Simulation (контроллер)
 *          ↓
 *   ┌──────┴──────┐
 *   ↓             ↓
 * Environment  ChartManager
 *   ↓             ↓
 * Agents     Chart.js
 * 
 * @author Ваше имя
 * @version 1.0
 */

import { Environment } from './environment.js';
import { CONFIG } from './config.js';

/* ========================================
   МЕНЕДЖЕР ГРАФИКОВ
   ======================================== */

/**
 * Класс для управления графиками Chart.js
 * 
 * Создаёт и обновляет два графика:
 * 1. График популяции (травоядные и хищники)
 * 2. График средней энергии (для обоих типов агентов)
 * 
 * Графики обновляются каждые 2 секунды симуляции для производительности.
 * Хранят максимум 100 точек данных (скользящее окно).
 * 
 * @class ChartManager
 */
class ChartManager {
    /**
     * Создаёт менеджер графиков
     * 
     * Инициализирует два графика на canvas элементах из HTML.
     * Если графики не найдены, выводит предупреждение в консоль.
     * 
     * @constructor
     */
    constructor() {
        /**
         * Массив данных популяции (не используется напрямую, хранится в Chart.js)
         * @type {Array}
         */
        this.populationData = [];
        
        /**
         * Массив данных энергии (не используется напрямую, хранится в Chart.js)
         * @type {Array}
         */
        this.energyData = [];
        
        /**
         * Максимальное количество точек на графике
         * При превышении старые данные удаляются (FIFO)
         * @type {number}
         */
        this.maxDataPoints = 100;
        
        /**
         * Время последнего обновления графиков (в секундах)
         * Используется для ограничения частоты обновления
         * @type {number}
         */
        this.lastUpdateTime = 0;
        
        // Инициализация графиков при создании менеджера
        this.initializeCharts();
    }
    
    /**
     * Инициализирует графики Chart.js
     * 
     * Создаёт два линейных графика с настройками:
     * - Адаптивность (responsive)
     * - Фиксированная высота (maintainAspectRatio: false)
     * - Отключена анимация (для производительности)
     * - Настроенные оси с метками
     * - Легенды и подсказки
     * 
     * График популяции:
     * - Зелёная линия: травоядные
     * - Красная линия: хищники
     * - Y-ось: 0-40 агентов
     * 
     * График энергии:
     * - Синяя линия: средняя энергия травоядных
     * - Оранжевая линия: средняя энергия хищников
     * - Y-ось: 0-500 энергии
     * 
     * @returns {void}
     */
    initializeCharts() {
        try {
            /* === ГРАФИК ПОПУЛЯЦИИ === */
            
            const populationCanvas = document.getElementById('populationChart');
            if (!populationCanvas) {
                console.warn('График популяции не найден');
                return;
            }
            
            const populationCtx = populationCanvas.getContext('2d');
            
            /**
             * График популяции (Chart.js instance)
             * @type {Chart}
             */
            this.populationChart = new Chart(populationCtx, {
                type: 'line',
                data: {
                    labels: [],  // Временные метки (секунды)
                    datasets: [
                        {
                            label: 'Травоядные',
                            data: [],
                            borderColor: '#4CAF50',              // Зелёный цвет линии
                            backgroundColor: 'rgba(76, 175, 80, 0.2)',  // Заливка под линией
                            borderWidth: 2,
                            tension: 0.3,                        // Сглаживание линии (кривая Безье)
                            fill: true,                          // Заливка области под линией
                            pointRadius: 4,                      // Размер точек данных
                            pointHoverRadius: 4                  // Размер при наведении
                        },
                        {
                            label: 'Хищники',
                            data: [],
                            borderColor: '#F44336',              // Красный цвет линии
                            backgroundColor: 'rgba(244, 67, 54, 0.2)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,                    // Адаптивность к размеру контейнера
                    maintainAspectRatio: false,          // Не сохранять соотношение сторон
                    interaction: {
                        mode: 'index',                   // Показывать данные для всех линий при наведении
                        intersect: false                 // Не требовать точного попадания на линию
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,     // Использовать кружки вместо линий в легенде
                                padding: 15,
                                font: { size: 12 }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Динамика популяции',
                            font: { size: 14, weight: 'bold' }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            padding: 10,
                            titleFont: { size: 13 },
                            bodyFont: { size: 12 }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Время (сек)',
                                font: { size: 12, weight: 'bold' }
                            },
                            ticks: {
                                maxRotation: 45,         // Максимальный угол поворота меток
                                minRotation: 0,
                                autoSkip: true,          // Автоматический пропуск меток при нехватке места
                                maxTicksLimit: 10        // Максимум 10 меток на оси X
                            },
                            grid: {
                                display: true,
                                color: 'rgba(128, 128, 128, 0.1)'  // Светло-серая сетка
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Количество агентов',
                                font: { size: 12, weight: 'bold' }
                            },
                            min: 0,
                            max: 40,                     // Фиксированный максимум (соответствует ограничениям популяции)
                            ticks: {
                                stepSize: 2,             // Шаг между метками (каждые 2 агента)
                                precision: 0             // Целые числа (не дробные)
                            },
                            grid: {
                                display: true,
                                color: 'rgba(128, 128, 128, 0.1)'
                            }
                        }
                    },
                    animation: false  // КРИТИЧНО: отключаем анимацию для производительности
                }
            });
            
            /* === ГРАФИК ЭНЕРГИИ === */
            
            const energyCanvas = document.getElementById('energyChart');
            if (!energyCanvas) {
                console.warn('График энергии не найден');
                return;
            }
            
            const energyCtx = energyCanvas.getContext('2d');
            
            /**
             * График средней энергии (Chart.js instance)
             * @type {Chart}
             */
            this.energyChart = new Chart(energyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Средняя энергия травоядных',
                            data: [],
                            borderColor: '#2196F3',              // Синий цвет
                            backgroundColor: 'rgba(33, 150, 243, 0.2)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 4
                        },
                        {
                            label: 'Средняя энергия хищников',
                            data: [],
                            borderColor: '#FF9800',              // Оранжевый цвет
                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: { size: 12 }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Средняя энергия популяции',
                            font: { size: 14, weight: 'bold' }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            padding: 10,
                            titleFont: { size: 13 },
                            bodyFont: { size: 12 },
                            callbacks: {
                                // Округляем значения энергии в подсказке
                                label: function(context) {
                                    return context.dataset.label + ': ' + Math.round(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Время (сек)',
                                font: { size: 12, weight: 'bold' }
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 10
                            },
                            grid: {
                                display: true,
                                color: 'rgba(128, 128, 128, 0.1)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Энергия',
                                font: { size: 12, weight: 'bold' }
                            },
                            min: 0,
                            max: 500,  // Фиксированный максимум (соответствует maxEnergy в CONFIG)
                            ticks: {
                                stepSize: 25,  // Шаг между метками (каждые 25 единиц энергии)
                                precision: 0
                            },
                            grid: {
                                display: true,
                                color: 'rgba(128, 128, 128, 0.1)'
                            }
                        }
                    },
                    animation: false
                }
            });
            
        } catch (error) {
            console.error('Ошибка инициализации графиков:', error);
            // Создаём пустые заглушки чтобы не было ошибок при вызове методов
            this.populationChart = { 
                update: () => {}, 
                data: { labels: [], datasets: [{ data: [] }, { data: [] }] } 
            };
            this.energyChart = { 
                update: () => {}, 
                data: { labels: [], datasets: [{ data: [] }, { data: [] }] } 
            };
        }
    }
    
    /**
     * Обновляет графики новыми данными из статистики
     * 
     * Добавляет новые точки данных на графики, но НЕ чаще чем раз в 2 секунды.
     * Это оптимизация производительности - графики тяжёлые для рендеринга.
     * 
     * При превышении maxDataPoints (100) удаляет самые старые данные (FIFO).
     * 
     * @param {Object} stats - Статистика из environment.getStats()
     * @param {number} stats.time - Время симуляции в секундах
     * @param {number} stats.herbivores - Количество травоядных
     * @param {number} stats.predators - Количество хищников
     * @param {Object} stats.avgEnergy - Средняя энергия агентов
     * @param {number} stats.avgEnergy.herbivores - Средняя энергия травоядных
     * @param {number} stats.avgEnergy.predators - Средняя энергия хищников
     * @returns {void}
     */
    updateCharts(stats) {
        // Проверка наличия графиков (могли не инициализироваться)
        if (!this.populationChart || !this.energyChart) {
            return;
        }
        
        // ОГРАНИЧЕНИЕ ЧАСТОТЫ: обновляем только каждые 2 секунды
        // Это критично для производительности при больших популяциях
        if (stats.time - this.lastUpdateTime < 2) {
            return;
        }
        
        this.lastUpdateTime = stats.time;
        const timeLabel = `${stats.time}`;
        
        // Добавление новых данных популяции
        this.populationChart.data.labels.push(timeLabel);
        this.populationChart.data.datasets[0].data.push(stats.herbivores);
        this.populationChart.data.datasets[1].data.push(stats.predators);
        
        // Добавление новых данных энергии
        this.energyChart.data.labels.push(timeLabel);
        this.energyChart.data.datasets[0].data.push(stats.avgEnergy.herbivores);
        this.energyChart.data.datasets[1].data.push(stats.avgEnergy.predators);
        
        // Ограничение количества точек данных (скользящее окно)
        // Удаляем старейшую точку, если превышен лимит
        if (this.populationChart.data.labels.length > this.maxDataPoints) {
            this.populationChart.data.labels.shift();
            this.populationChart.data.datasets.forEach(dataset => dataset.data.shift());
            this.energyChart.data.labels.shift();
            this.energyChart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        
        // Обновление графиков с режимом 'none' (без анимации)
        try {
            this.populationChart.update('none');
            this.energyChart.update('none');
        } catch (error) {
            console.warn('Ошибка обновления графиков:', error);
        }
    }
    
    /**
     * Сбрасывает графики к начальному состоянию
     * 
     * Очищает все данные и обнуляет счётчик времени.
     * Вызывается при нажатии кнопки "Сброс".
     * 
     * @returns {void}
     */
    reset() {
        this.lastUpdateTime = 0;
        
        // Очистка данных графика популяции
        this.populationChart.data.labels = [];
        this.populationChart.data.datasets.forEach(dataset => dataset.data = []);
        
        // Очистка данных графика энергии
        this.energyChart.data.labels = [];
        this.energyChart.data.datasets.forEach(dataset => dataset.data = []);
        
        // Обновление графиков для отображения пустого состояния
        this.populationChart.update();
        this.energyChart.update();
    }
}

/* ========================================
   ГЛАВНЫЙ КЛАСС СИМУЛЯЦИИ
   ======================================== */

/**
 * Главный класс симуляции
 * 
 * Управляет всем приложением:
 * - Инициализация canvas и контекста
 * - Создание окружения (Environment)
 * - Управление графиками (ChartManager)
 * - Обработка всех событий UI
 * - Управление темами
 * - Главный игровой цикл (animate → update → render)
 * - Обновление статистики в реальном времени
 * 
 * @class Simulation
 * @exports Simulation
 */
export class Simulation {
    /**
     * Создаёт экземпляр симуляции и инициализирует все компоненты
     * 
     * Инициализация включает:
     * 1. Получение canvas и контекста
     * 2. Создание Environment
     * 3. Создание ChartManager
     * 4. Настройка темы (тёмная по умолчанию)
     * 5. Привязка обработчиков событий
     * 6. Настройка размеров canvas
     * 7. Первичное обновление UI
     * 
     * @constructor
     */
    constructor() {
        try {
            /* === Получение и проверка canvas === */
            
            /**
             * Элемент canvas для отрисовки симуляции
             * @type {HTMLCanvasElement}
             */
            this.canvas = document.getElementById('simulationCanvas');
            if (!this.canvas) {
                throw new Error('Холст симуляции не найден!');
            }
            
            /**
             * Контекст 2D для рисования на canvas
             * @type {CanvasRenderingContext2D}
             */
            this.ctx = this.canvas.getContext('2d');
            
            /* === Создание основных компонентов === */
            
            /**
             * Окружение симуляции (агенты, еда, препятствия)
             * @type {Environment}
             */
            this.environment = new Environment();
            
            /**
             * Менеджер графиков Chart.js
             * @type {ChartManager}
             */
            this.chartManager = new ChartManager();
            
            /* === Состояние симуляции === */
            
            /**
             * Флаг работы симуляции (играет/на паузе)
             * @type {boolean}
             */
            this.isRunning = false;
            
            /**
             * Флаг того, что анимация была запущена хотя бы раз
             * Используется для предотвращения множественных запусков animate()
             * @type {boolean}
             */
            this.animationStarted = false;
            
            /**
             * ID текущего кадра анимации (от requestAnimationFrame)
             * Используется для отмены анимации при сбросе
             * @type {number|null}
             */
            this.animationId = null;
            
            /**
             * Показывать ли состояния конечного автомата над агентами
             * Управляется чекбоксом "Показать состояния"
             * @type {boolean}
             */
            this.showStates = false;
            
            /* === Инициализация компонентов === */
            
            this.initializeTheme();      // Установка тёмной темы по умолчанию
            this.setupEventListeners();  // Привязка обработчиков событий UI
            this.updateCanvasSize();     // Настройка размеров canvas
            this.updateUI();             // Первичное обновление статистики
            
        } catch (error) {
            console.error('Ошибка инициализации симулятора:', error);
            this.showErrorMessage(error.message);
        }
    }
    
    /* ========================================
       ОБРАБОТКА ОШИБОК
       ======================================== */
    
    /**
     * Показывает сообщение об ошибке на canvas
     * 
     * Используется при критических ошибках инициализации,
     * когда нормальная работа приложения невозможна.
     * 
     * @param {string} message - Текст ошибки для отображения
     * @returns {void}
     */
    showErrorMessage(message) {
        const canvas = document.getElementById('simulationCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f44336';
            ctx.font = '16px Arial';
            ctx.fillText('Ошибка: ' + message, 10, 30);
            ctx.fillText('Проверьте консоль для подробностей', 10, 60);
        }
    }
    
    /* ========================================
       УПРАВЛЕНИЕ ТЕМАМИ
       ======================================== */
    
    /**
     * Инициализирует тему приложения
     * 
     * Устанавливает тёмную тему по умолчанию.
     * Обновляет текст кнопки переключения темы.
     * 
     * @returns {void}
     */
    initializeTheme() {
        const currentTheme = 'dark';  // Тёмная тема по умолчанию
        document.body.setAttribute('data-color-scheme', currentTheme);
        this.updateThemeButton(currentTheme);
    }
    
    /**
     * Обновляет текст кнопки переключения темы
     * 
     * Изменяет иконку и текст кнопки в зависимости от текущей темы:
     * - Тёмная тема: показывает "☀️ Светлая тема" (предложение переключиться)
     * - Светлая тема: показывает "🌙 Тёмная тема"
     * 
     * @param {string} theme - Текущая тема ('dark' или 'light')
     * @returns {void}
     */
    updateThemeButton(theme) {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            if (theme === 'dark') {
                themeBtn.textContent = '☀️ Светлая тема';
            } else {
                themeBtn.textContent = '🌙 Тёмная тема';
            }
        }
    }
    
    /**
     * Переключает тему приложения
     * 
     * Меняет тему между светлой и тёмной:
     * - Обновляет атрибут data-color-scheme на body
     * - Перерисовывает canvas с новым цветом фона
     * - Обновляет текст кнопки
     * 
     * CSS автоматически применяет новые цвета благодаря переменным.
     * 
     * @returns {void}
     */
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-color-scheme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-color-scheme', newTheme);
        this.updateThemeButton(newTheme);
        
        // Перерисовываем ТОЛЬКО если симуляция уже запущена или был сброс
        if (this.animationStarted || this.environment.herbivores.length > 0) {
            this.render();
        }
    }
    
    /* ========================================
       НАСТРОЙКА CANVAS
       ======================================== */
    
    /**
     * Обновляет размер canvas согласно CONFIG
     * 
     * Устанавливает ширину и высоту canvas из конфигурации.
     * Делает canvas адаптивным через CSS (max-width: 100%).
     * 
     * @returns {void}
     */
    updateCanvasSize() {
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
    }
    
    /* ========================================
       ОБРАБОТЧИКИ СОБЫТИЙ UI
       ======================================== */
    
    /**
     * Настраивает все обработчики событий для элементов UI
     * 
     * Привязывает события к:
     * - Кнопкам (Запуск/Пауза, Сброс, Применить популяцию)
     * - Слайдерам (скорость, мутация, еда, размер агентов)
     * - Чекбоксам (препятствия, яд, показ состояний)
     * 
     * Все обработчики безопасны - проверяют наличие элемента перед привязкой.
     * 
     * @returns {void}
     */
    setupEventListeners() {
        /* === Кнопка переключения темы === */
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        /* === Кнопки управления симуляцией === */
        
        // Кнопка Запуск/Пауза
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }
        
        // Кнопка Сброс
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }
        
        /* === Управление популяциями === */
        
        // Кнопка применения настроек популяции
        const applyPopulation = document.getElementById('applyPopulation');
        if (applyPopulation) {
            applyPopulation.addEventListener('click', () => {
                this.applyPopulationSettings();
            });
        }
        
        /* === Компоненты среды === */
        
        // Чекбокс препятствий
        const obstaclesToggle = document.getElementById('obstaclesToggle');
        if (obstaclesToggle) {
            obstaclesToggle.addEventListener('change', (e) => {
                this.environment.toggleObstacles(e.target.checked);
            });
        }
        
        // Чекбокс яда
        const poisonToggle = document.getElementById('poisonToggle');
        if (poisonToggle) {
            poisonToggle.addEventListener('change', (e) => {
                this.environment.togglePoison(e.target.checked);
            });
        }
        
        /* === Слайдеры параметров симуляции === */
        
        // Слайдер скорости симуляции
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                CONFIG.simulation.speed = parseFloat(e.target.value);
                speedValue.textContent = e.target.value + 'x';
            });
        }
        
        // Слайдер силы мутаций
        const mutationSlider = document.getElementById('mutationSlider');
        const mutationValue = document.getElementById('mutationValue');
        if (mutationSlider && mutationValue) {
            mutationSlider.addEventListener('input', (e) => {
                CONFIG.simulation.mutationRate = parseFloat(e.target.value);
                mutationValue.textContent = e.target.value;
            });
        }
        
        /* === Слайдеры параметров еды === */
        
        // Количество еды
        const foodCount = document.getElementById('foodCount');
        const foodCountValue = document.getElementById('foodCountValue');
        if (foodCount && foodCountValue) {
            foodCount.addEventListener('input', (e) => {
                CONFIG.food.maxCount = parseInt(e.target.value);
                CONFIG.food.spawnThreshold = Math.floor(CONFIG.food.maxCount * 0.75);
                foodCountValue.textContent = e.target.value;
            });
        }
        
        // Энергия еды
        const foodEnergy = document.getElementById('foodEnergy');
        const foodEnergyValue = document.getElementById('foodEnergyValue');
        if (foodEnergy && foodEnergyValue) {
            foodEnergy.addEventListener('input', (e) => {
                CONFIG.food.energy = parseInt(e.target.value);
                // Обновляем существующую еду
                this.environment.food.forEach(food => {
                    food.energy = CONFIG.food.energy;
                });
                foodEnergyValue.textContent = e.target.value;
            });
        }
        
        // Урон яда
        const poisonDamage = document.getElementById('poisonDamage');
        const poisonDamageValue = document.getElementById('poisonDamageValue');
        if (poisonDamage && poisonDamageValue) {
            poisonDamage.addEventListener('input', (e) => {
                CONFIG.poison.damage = parseInt(e.target.value);
                poisonDamageValue.textContent = e.target.value;
            });
        }
        
        /* === Слайдеры параметров агентов === */
        
        // Размер агентов
        const agentSize = document.getElementById('agentSize');
        const agentSizeValue = document.getElementById('agentSizeValue');
        if (agentSize && agentSizeValue) {
            agentSize.addEventListener('input', (e) => {
                const newSize = parseInt(e.target.value);
                CONFIG.agents.herbivore.size = newSize;
                CONFIG.agents.predator.size = newSize + 2;  // Хищники чуть больше
                agentSizeValue.textContent = e.target.value;
            });
        }
        
        // Чекбокс показа состояний конечного автомата
        const showStates = document.getElementById('showStates');
        if (showStates) {
            showStates.addEventListener('change', (e) => {
                this.showStates = e.target.checked;
            });
        }
    }
    
    /* ========================================
       ПРИМЕНЕНИЕ НАСТРОЕК
       ======================================== */
    
    /**
     * Применяет настройки популяции из полей ввода
     * 
     * Считывает значения из полей "Травоядные" и "Хищники"
     * и устанавливает соответствующие популяции через environment.setPopulation().
     * 
     * Если это первое создание агентов, также создаёт еду.
     * Перерисовывает canvas для показа новых агентов.
     * 
     * @returns {void}
     */
    applyPopulationSettings() {
        const herbivoreInput = document.getElementById('herbivoreCount');
        const predatorInput = document.getElementById('predatorCount');
        
        if (herbivoreInput && predatorInput) {
            const herbivoreCount = parseInt(herbivoreInput.value);
            const predatorCount = parseInt(predatorInput.value);
            
            this.environment.setPopulation('herbivore', herbivoreCount);
            this.environment.setPopulation('predator', predatorCount);
            
            // Если это первое создание агентов, также создаем еду
            if (!this.animationStarted && this.environment.food.length === 0) {
                this.environment.spawnFood();
            }
            
            // Перерисовываем, чтобы показать новые агенты
            this.render();
        }
    }
    
    /* ========================================
       УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ
       ======================================== */
    
    /**
     * Переключает состояние симуляции (запуск/пауза)
     * 
     * При запуске:
     * - Меняет текст кнопки на "Пауза"
     * - Если агентов нет, создаёт начальные популяции и еду
     * - Запускает главный игровой цикл через animate()
     * 
     * При паузе:
     * - Меняет текст кнопки на "Запуск"
     * - Прекращает вызов animate() (через isRunning flag)
     * 
     * @returns {void}
     */
    togglePlayPause() {
        this.isRunning = !this.isRunning;
    
        const btn = document.getElementById('playPauseBtn');
        if (btn) {
            btn.textContent = this.isRunning ? 'Пауза' : 'Запуск';
        }
        
        if (this.isRunning) {
            // Если это ПЕРВЫЙ запуск И нет агентов, создаем их
            if (!this.animationStarted && 
                this.environment.herbivores.length === 0 && 
                this.environment.predators.length === 0) {
                this.environment.initializePopulations();
                this.environment.spawnFood();
            }
            
            // Запускаем анимацию (первый раз или продолжаем после паузы)
            this.animationStarted = true;
            this.animate();
        }
    }
    
    /**
     * Сбрасывает симуляцию к начальному состоянию
     * 
     * Выполняет полный сброс:
     * 1. Останавливает анимацию (отменяет requestAnimationFrame)
     * 2. Сбрасывает флаги (isRunning, animationStarted)
     * 3. Сбрасывает окружение (environment.reset())
     * 4. Очищает графики (chartManager.reset())
     * 5. Восстанавливает значения полей ввода
     * 6. Перерисовывает canvas
     * 7. Обновляет UI (статистику)
     * 
     * @returns {void}
     */
    reset() {
        // Отмена текущей анимации
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Останавливаем симуляцию
        this.isRunning = false;
        this.animationStarted = false;
        
        // Сбрасываем окружение и графики
        this.environment.reset();
        this.chartManager.reset();
        
        // Обновляем кнопку на "Запуск"
        const btn = document.getElementById('playPauseBtn');
        if (btn) {
            btn.textContent = 'Запуск';
        }
        
        // Восстанавливаем значения полей ввода
        const herbivoreInput = document.getElementById('herbivoreCount');
        const predatorInput = document.getElementById('predatorCount');
        if (herbivoreInput) {
            herbivoreInput.value = CONFIG.agents.herbivore.initialCount;
        }
        if (predatorInput) {
            predatorInput.value = CONFIG.agents.predator.initialCount;
        }
        
        // Рисуем начальное состояние
        this.render();
        
        // Обновляем UI
        this.updateUI();
    }
    
    /* ========================================
       ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
       ======================================== */
    
    /**
     * Обновляет статистику в UI и графики
     * 
     * Получает актуальную статистику из environment.getStats()
     * и обновляет:
     * - Панель статистики (поколение, количества, время)
     * - Графики Chart.js (через chartManager.updateCharts())
     * 
     * Вызывается на каждом кадре в render().
     * 
     * @returns {void}
     */
    updateUI() {
        const stats = this.environment.getStats();
        
        // Обновление статистики с проверкой элементов
        this.updateStat('generationStat', stats.generation);
        this.updateStat('herbivoreStat', stats.herbivores);
        this.updateStat('predatorStat', stats.predators);
        this.updateStat('foodStat', stats.food);
        this.updateStat('obstacleStat', stats.obstacles);
        this.updateStat('poisonStat', stats.poison);
        this.updateStat('timeStat', stats.time + 's');
        
        // Обновление графиков
        if (this.chartManager) {
            this.chartManager.updateCharts(stats);
        }
    }
    
    /**
     * Вспомогательная функция для безопасного обновления статистики
     * 
     * Обновляет текст элемента только если элемент существует в DOM.
     * Предотвращает ошибки при отсутствии элементов.
     * 
     * @param {string} elementId - ID элемента в HTML
     * @param {string|number} value - Новое значение для отображения
     * @returns {void}
     */
    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    /* ========================================
       ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ
       ======================================== */
    
    /**
     * Обновляет логику симуляции на один кадр
     * 
     * Выполняет:
     * 1. Проверку на вымирание (останавливает симуляцию, показывает сообщение)
     * 2. Обновление environment.update() с учётом скорости симуляции
     * 
     * Для скорости >= 1.0: вызывает update() несколько раз за кадр
     * Для скорости < 1.0: использует вероятностный подход (пропускает кадры)
     * 
     * Вызывается из animate() на каждом кадре.
     * 
     * @returns {void}
     */
    update() {
        if (this.isRunning) {
            // Проверяем вымирание
            if (this.environment.isExtinct) {
                this.isRunning = false;
                const btn = document.getElementById('playPauseBtn');
                if (btn) {
                    btn.textContent = 'Запуск';
                }
                this.showExtinctionMessage();
                return;
            }
            
            // Обычное обновление с правильной скоростью
            const speed = CONFIG.simulation.speed;
            
            // Для скоростей >= 1.0 обновляем целое количество раз за кадр
            for (let i = 0; i < Math.floor(speed); i++) {
                this.environment.update();
            }
            
            // Для дробной части используем вероятность
            const fractionalPart = speed % 1;
            if (fractionalPart > 0 && Math.random() < fractionalPart) {
                this.environment.update();
            }
        }
    }
    
    /**
     * Показывает сообщение о вымирании популяции
     * 
     * Рисует полупрозрачный оверлей поверх симуляции и отображает:
     * - Иконку черепа (💀) и текст "ПОПУЛЯЦИЯ ВЫМЕРЛА"
     * - Номер последнего поколения
     * - Подсказку о кнопке "Сброс"
     * 
     * Цвета адаптируются к текущей теме (светлая/тёмная).
     * 
     * @returns {void}
     */
    showExtinctionMessage() {
        const ctx = this.ctx;
        const isDark = document.body.getAttribute('data-color-scheme') === 'dark';
        
        // Полупрозрачный оверлей
        ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        
        // Текст
        ctx.fillStyle = isDark ? '#fff' : '#000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀 ПОПУЛЯЦИЯ ВЫМЕРЛА', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 40);
        
        ctx.font = '24px Arial';
        ctx.fillText(`Дожило до поколения: ${this.environment.generation}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 20);
        ctx.fillText('Нажмите "Сброс" для новой симуляции', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 60);
    }
    
    /**
     * Отрисовывает текущее состояние симуляции
     * 
     * Выполняет:
     * 1. Проверку видимости canvas (оптимизация - не рисует если не видно)
     * 2. Отрисовку всех компонентов через environment.draw()
     * 3. Показ сообщения о вымирании (если isExtinct = true)
     * 4. Обновление UI (статистика и графики)
     * 
     * Оптимизация: если canvas не виден на экране (прокрутили вниз к графикам),
     * рисование пропускается для экономии ресурсов.
     * 
     * @returns {void}
     */
    render() {
        // Проверяем, виден ли canvas на экране
        const rect = this.canvas.getBoundingClientRect();
        const isVisible = (
            rect.top < window.innerHeight && 
            rect.bottom > 0
        );
        
        // Рисуем только если canvas виден
        if (isVisible) {
            this.environment.draw(this.ctx, this.showStates);
            if (this.environment.isExtinct) {
                this.showExtinctionMessage();
            }
        }
        
        // Обновляем UI независимо от видимости
        this.updateUI();
    }
    
    /**
     * Главный цикл анимации (игровой цикл)
     * 
     * Выполняется на каждом кадре (~60 FPS):
     * 1. update() - обновление логики симуляции
     * 2. render() - отрисовка на canvas
     * 3. requestAnimationFrame() - запрос следующего кадра
     * 
     * Цикл продолжается, пока isRunning = true.
     * Останавливается при:
     * - Нажатии кнопки "Пауза"
     * - Вымирании популяции
     * - Сбросе симуляции
     * 
     * @returns {void}
     */
    animate() {
        this.update();
        this.render();
        
        // Используем более независимый от браузера метод
        if (this.isRunning) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }
}

/* ========================================
   ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
   ======================================== */

/**
 * Запуск приложения при загрузке DOM
 * 
 * Ждёт полной загрузки DOM (DOMContentLoaded),
 * затем создаёт экземпляр Simulation.
 * 
 * Обработка ошибок:
 * - Проверяет наличие canvas перед созданием симуляции
 * - Перехватывает и логирует все ошибки
 * - Показывает ошибку на canvas, если что-то пошло не так
 * 
 * Экспортирует simulation в window.simulation для доступа из консоли (отладка).
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Проверка наличия основных элементов
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) {
            console.error('Canvas не найден!');
            return;
        }
        
        // Запуск приложения с обработкой ошибок
        const simulation = new Simulation();
        console.log('Симулятор эволюции запущен успешно');
        
        // Экспорт для глобального доступа (для отладки в консоли)
        window.simulation = simulation;
        
    } catch (error) {
        console.error('Ошибка при запуске симулятора:', error);
        
        // Показать ошибку пользователю
        const canvas = document.getElementById('simulationCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.font = '16px Arial';
            ctx.fillText('Ошибка загрузки: ' + error.message, 10, 30);
        }
    }
});
