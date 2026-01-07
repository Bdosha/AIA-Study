/**
 * Файл: agent.js
 * Описание: Классы агентов симуляции искусственной жизни
 * 
 * Содержит:
 * - Agent: базовый класс с физикой движения, энергией, размножением
 * - Herbivore: травоядное животное (ищет еду, избегает хищников и яда)
 * - Predator: хищник (охотится на травоядных, избегает яда)
 * - Food: источник энергии для травоядных
 * - Obstacle: препятствие на карте (эллиптическая форма)
 * - Poison: опасный объект, наносящий урон агентам
 * 
 * Особенности:
 * - Генетические параметры (скорость, размер, чувствительность к яду)
 * - Наследование признаков с мутациями
 * - Конечный автомат состояний (WANDER, SEEK_FOOD, AVOID_PREDATOR, HUNT)
 * - Эволюция цвета агентов на основе генов
 * - Умное избегание препятствий (движение по касательной)
 * 
 * @author Ваше имя
 * @version 1.0
 */

import { Vector2D } from './vector2d.js';
import { FiniteAutomaton } from './finite-automaton.js';
import { CONFIG } from './config.js';

/* ========================================
   БАЗОВЫЙ КЛАСС АГЕНТА
   ======================================== */

/**
 * Базовый класс агента симуляции
 * 
 * Реализует основную физику движения (steering behaviors), энергетический
 * метаболизм, размножение с мутациями и взаимодействие с окружающей средой.
 * Использует конечный автомат для управления состояниями поведения.
 * 
 * @class Agent
 */
export class Agent {
    /**
     * Создаёт новый экземпляр агента
     * 
     * Инициализирует:
     * - Позицию и скорость на canvas
     * - Генетические параметры (maxSpeed, size, poisonSensitivity)
     * - Энергетическую систему
     * - Конечный автомат для управления поведением
     * 
     * @constructor
     * @param {number} x - Начальная координата X на canvas
     * @param {number} y - Начальная координата Y на canvas
     * @param {string} type - Тип агента: 'herbivore' или 'predator'
     */
    constructor(x, y, type) {
        /* === Физические параметры === */
        
        /**
         * Позиция агента в 2D пространстве
         * @type {Vector2D}
         */
        this.position = new Vector2D(x, y);
        
        /**
         * Вектор скорости агента
         * Определяет направление и скорость движения
         * @type {Vector2D}
         */
        this.velocity = Vector2D.random().mult(Math.random() * 2);
        
        /**
         * Вектор ускорения агента
         * Накапливает силы (seek, flee, avoid) перед применением к скорости
         * @type {Vector2D}
         */
        this.acceleration = new Vector2D();
        
        /* === Базовые характеристики === */
        
        /**
         * Тип агента ('herbivore' или 'predator')
         * @type {string}
         */
        this.type = type;
        
        /**
         * Возраст агента в кадрах
         * @type {number}
         */
        this.age = 0;
        
        /**
         * Количество потомков, произведённых агентом
         * @type {number}
         */
        this.offspringCount = 0;
        
        /**
         * Время последнего случайного движения (для предотвращения застревания)
         * @type {number}
         */
        this.lastRandomMovement = 0;
        
        /* === Генетические параметры === */
        
        /**
         * Чувствительность к яду (генетический признак, наследуется)
         * Диапазон: 0.0 - 1.0
         * - 0.0: не видит яд, подходит близко
         * - 1.0: обнаруживает яд издалека и сильно избегает
         * Влияет на:
         * - Дальность обнаружения яда
         * - Силу избегания яда
         * - Цвет агента (визуализация эволюции)
         * @type {number}
         */
        this.poisonSensitivity = Math.random();
        
        /**
         * Номер поколения агента
         * Начинается с 1, увеличивается на 1 при размножении
         * @type {number}
         */
        this.generation = 1;
        
        /* === Конечный автомат === */
        
        /**
         * Конечный автомат для управления состояниями поведения
         * Содержит состояния: WANDER, SEEK_FOOD, AVOID_PREDATOR, HUNT
         * @type {FiniteAutomaton}
         */
        this.automaton = new FiniteAutomaton();
        
        /**
         * Текущее состояние агента
         * Возможные значения: 'WANDER', 'SEEK_FOOD', 'AVOID_PREDATOR', 'HUNT'
         * @type {string}
         */
        this.state = 'WANDER';
        
        /* === Инициализация параметров в зависимости от типа === */
        
        if (type === 'herbivore') {
            // ТРАВОЯДНОЕ
            
            /**
             * Максимальная скорость движения (генетический признак)
             * Добавляется случайное разнообразие: 1.8 - 2.2
             * @type {number}
             */
            this.maxSpeed = CONFIG.agents.herbivore.maxSpeed + (Math.random() - 0.5) * 0.4;
            
            /**
             * Максимальная сила рулевого управления
             * Ограничивает резкость поворотов
             * @type {number}
             */
            this.maxForce = CONFIG.agents.herbivore.maxForce;
            
            /**
             * Размер агента (радиус, генетический признак)
             * Случайное разнообразие: 8.5 - 11.5, минимум 6
             * @type {number}
             */
            this.size = CONFIG.agents.herbivore.size + (Math.random() - 0.5) * 3;
            this.size = Math.max(6, this.size);
            
            /**
             * Текущая энергия агента
             * Тратится на метаболизм и движение
             * Пополняется при поедании еды
             * @type {number}
             */
            this.energy = CONFIG.agents.herbivore.initialEnergy;
            
            /**
             * Максимальная энергия (ограничение)
             * @type {number}
             */
            this.maxEnergy = CONFIG.agents.herbivore.maxEnergy;
            
        } else {
            // ХИЩНИК
            
            this.maxSpeed = CONFIG.agents.predator.maxSpeed + (Math.random() - 0.5) * 0.4; // 2.0 - 2.4
            this.maxForce = CONFIG.agents.predator.maxForce;
            this.size = CONFIG.agents.predator.size + (Math.random() - 0.5) * 3; // 10.5 - 13.5
            this.size = Math.max(8, this.size);
            this.energy = CONFIG.agents.predator.initialEnergy;
            this.maxEnergy = CONFIG.agents.predator.maxEnergy;
        }
        
        // Установка цвета на основе генов
        this.updateColor();
    }
    
    /* ========================================
       МЕТОДЫ ОБНОВЛЕНИЯ СОСТОЯНИЯ
       ======================================== */
    
    /**
     * Обновляет состояние агента на каждом кадре симуляции
     * 
     * Выполняет:
     * 1. Добавление случайной силы для предотвращения застревания
     * 2. Применение накопленных сил к ускорению (с ограничением)
     * 3. Обновление скорости и позиции
     * 4. Обработку границ canvas (отскок от стен)
     * 5. Трату энергии на метаболизм и движение
     * 6. Ограничение максимальной энергии
     * 
     * @param {number} frameCount - Текущий номер кадра симуляции
     * @returns {void}
     */
    update(frameCount) {
        // Рандомизация движения для предотвращения зацикливания
        // Каждые N кадров (из CONFIG) добавляем случайную силу
        // Это помогает агентам выходить из тупиковых ситуаций
        if (frameCount - this.lastRandomMovement > CONFIG.environment.randomMovementInterval) {
            this.addRandomForce();
            this.lastRandomMovement = frameCount;
        }
        
        // Ограничение максимального ускорения для реалистичности
        // Без этого агенты могли бы мгновенно разгоняться
        this.acceleration.limit(this.maxForce);
        
        // Обновление физики (стандартная модель Эйлера)
        this.velocity.add(this.acceleration);         // v = v + a
        this.velocity.limit(this.maxSpeed);           // Ограничение скорости
        this.position.add(this.velocity);             // p = p + v
        
        // Сброс ускорения для следующего кадра
        // Ускорение накапливается заново каждый кадр через applyForce()
        this.acceleration.mult(0);
        
        // Обработка границ экрана (жёсткие границы с отскоком)
        this.enforceBoundaries();
        
        // Обновление возраста
        this.age++;
        
        // Трата энергии
        // Метаболизм: базовая стоимость жизни каждый кадр
        // Движение: дополнительная стоимость пропорциональная скорости
        const metabolism = this.type === 'herbivore' 
            ? CONFIG.agents.herbivore.metabolismCost 
            : CONFIG.agents.predator.metabolismCost;
        const movement = this.type === 'herbivore' 
            ? CONFIG.agents.herbivore.movementCost 
            : CONFIG.agents.predator.movementCost;
        
        this.energy -= metabolism + (movement * this.velocity.mag());
        
        // Ограничение максимальной энергии
        // Предотвращает бесконечное накопление энергии
        if (this.energy > this.maxEnergy) {
            this.energy = this.maxEnergy;
        }
    }
    
    /**
     * Добавляет случайную силу для предотвращения застревания
     * 
     * Применяется периодически (см. update()), чтобы агенты
     * не зацикливались в углах или на препятствиях.
     * 
     * @returns {void}
     */
    addRandomForce() {
        const randomForce = Vector2D.random().mult(0.1);
        this.acceleration.add(randomForce);
    }
    
    /**
     * Применяет силу к агенту
     * 
     * Добавляет вектор силы к накопленному ускорению.
     * Используется для реализации steering behaviors:
     * - seek() - движение к цели
     * - flee() - бегство от опасности
     * - avoid() - избегание препятствий
     * 
     * @param {Vector2D} force - Вектор силы для применения
     * @returns {void}
     */
    applyForce(force) {
        this.acceleration.add(force);
    }
    
    /* ========================================
       ОБРАБОТКА ГРАНИЦ И СТОЛКНОВЕНИЙ
       ======================================== */
    
    /**
     * Обрабатывает жёсткие границы canvas
     * 
     * Агенты НЕ МОГУТ выйти за пределы экрана.
     * При столкновении с границей:
     * - Позиция корректируется внутрь canvas
     * - Скорость отражается (отскок)
     * - Скорость уменьшается на 50% для реалистичности
     * 
     * @returns {void}
     */
    enforceBoundaries() {
        let bounced = false;
        
        // Проверка левой и правой границ
        if (this.position.x <= this.size) {
            this.position.x = this.size;
            this.velocity.x *= -1;  // Отражение по оси X
            bounced = true;
        } else if (this.position.x >= CONFIG.canvas.width - this.size) {
            this.position.x = CONFIG.canvas.width - this.size;
            this.velocity.x *= -1;
            bounced = true;
        }
        
        // Проверка верхней и нижней границ
        if (this.position.y <= this.size) {
            this.position.y = this.size;
            this.velocity.y *= -1;  // Отражение по оси Y
            bounced = true;
        } else if (this.position.y >= CONFIG.canvas.height - this.size) {
            this.position.y = CONFIG.canvas.height - this.size;
            this.velocity.y *= -1;
            bounced = true;
        }
        
        // При отскоке гасим скорость для реалистичности
        if (bounced) {
            this.velocity.mult(0.5);
        }
    }
    
    /**
     * Обновляет цвет агента на основе генетических параметров
     * 
     * Цвет визуализирует эволюцию:
     * - Травоядные: зелёные тона зависят от скорости и чувствительности к яду
     *   - Быстрые + чувствительные = яркий зелёный
     *   - Медленные + нечувствительные = тусклый голубой
     * - Хищники: красные тона зависят от скорости
     * 
     * Использует HSL для плавных переходов цвета
     * 
     * @returns {void}
     */
    updateColor() {
        if (this.type === 'herbivore') {
            // Нормализация скорости в диапазон 0-1
            const speedFactor = (this.maxSpeed - 1.5) / 1.0; // 1.5-2.5 -> 0-1
            
            // Оттенок (hue): от зелёного (120°) к голубому (180°)
            // Чем выше poisonSensitivity, тем более голубой
            const hue = 120 + (this.poisonSensitivity * 60);
            
            // Насыщенность (saturation): зависит от скорости
            const saturation = 50 + (speedFactor * 40); // 50-90%
            
            // Яркость (lightness): зависит от чувствительности
            const lightness = 40 + (this.poisonSensitivity * 20); // 40-60%
            
            this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
        } else {
            // Хищники: красные/оранжевые тона
            const speedFactor = (this.maxSpeed - 1.7) / 1.0;
            const hue = 0 + (speedFactor * 20) + (this.poisonSensitivity * 15);
            const saturation = 70 + (speedFactor * 20);
            const lightness = 45 + (this.poisonSensitivity * 15);
            
            this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
    }
    
    /**
     * Обрабатывает столкновения с препятствиями
     * 
     * При контакте с препятствием:
     * - Агент жёстко выталкивается наружу
     * - Скорость в направлении препятствия обнуляется
     * - Общая скорость гасится для реалистичности
     * 
     * @param {Obstacle[]} obstacles - Массив препятствий на карте
     * @returns {void}
     */
    handleObstacleCollisions(obstacles) {
        let nearObstacle = false;
        
        obstacles.forEach(obstacle => {
            const distance = Vector2D.dist(this.position, obstacle.position);
            const obstacleRadius = Math.max(obstacle.radiusX, obstacle.radiusY);
            
            // Критическая зона - агент касается препятствия
            if (distance < obstacleRadius + this.size + 2) {
                // Вычисляем направление от центра препятствия к агенту
                const pushDirection = this.position.sub(obstacle.position);
                const pushDist = pushDirection.mag();
                
                if (pushDist > 0) {
                    pushDirection.normalize();
                    
                    // ЖЁСТКО выталкиваем агента наружу
                    const minDist = obstacleRadius + this.size + 3;
                    const pushAmount = minDist - distance;
                    this.position.x += pushDirection.x * pushAmount;
                    this.position.y += pushDirection.y * pushAmount;
                    
                    // Обнуляем скорость в направлении препятствия
                    // (проекция скорости на направление к препятствию)
                    const velocityDot = this.velocity.x * pushDirection.x + 
                                       this.velocity.y * pushDirection.y;
                    if (velocityDot < 0) {
                        this.velocity.x -= pushDirection.x * velocityDot;
                        this.velocity.y -= pushDirection.y * velocityDot;
                    }
                    
                    // Сильно гасим скорость при контакте
                    this.velocity.mult(0.3);
                }
                
                nearObstacle = true;
            }
        });
        
        // Если рядом с препятствием - замедляемся глобально
        if (nearObstacle) {
            this.velocity.mult(0.7);
        }
    }
    
    /**
     * Умное избегание препятствия (движение по касательной)
     * 
     * Вместо простого отталкивания, агент движется вдоль препятствия,
     * как бы "обтекая" его. Это создаёт более естественное поведение.
     * 
     * Алгоритм:
     * 1. Вычисляется вектор к препятствию
     * 2. Создаётся тангенциальный вектор (перпендикуляр)
     * 3. Направление тангенса выбирается по текущей скорости
     * 4. Комбинируется отталкивание + скольжение вдоль
     * 
     * @param {Obstacle} obstacle - Препятствие для избегания
     * @returns {Vector2D} - Вектор силы избегания
     */
    avoidObstacleSmart(obstacle) {
        const toObstacle = obstacle.position.sub(this.position);
        const distance = toObstacle.mag();
        const obstacleRadius = Math.max(obstacle.radiusX, obstacle.radiusY);
        const safeDistance = obstacleRadius + 40;  // Зона безопасности
        
        if (distance < safeDistance) {
            toObstacle.normalize();
            
            // Сила зависит от близости (0.0 - 1.0)
            const strength = (safeDistance - distance) / safeDistance;
            
            // КЛЮЧЕВОЙ момент: тангенциальное направление
            // Поворачиваем вектор на 90° для получения касательной
            const tangent = new Vector2D(-toObstacle.y, toObstacle.x);
            
            // Определяем направление поворота на основе текущей скорости
            // Выбираем тангенс, совпадающий с направлением движения
            const velocityDot = this.velocity.x * tangent.x + 
                               this.velocity.y * tangent.y;
            if (velocityDot < 0) {
                tangent.mult(-1);  // Инвертируем, если направление неправильное
            }
            
            // Комбинируем две силы:
            // 1. Отталкивание от препятствия (радиальное)
            // 2. Скольжение вдоль препятствия (тангенциальное)
            const repel = toObstacle.mult(-1).mult(strength * 1.5);
            const slide = tangent.mult(strength * 0.8);
            
            return repel.add(slide);
        }
        
        return new Vector2D(0, 0);
    }
    
    /* ========================================
       STEERING BEHAVIORS
       ======================================== */
    
    /**
     * Steering behavior: Seek (преследование цели)
     * 
     * Вычисляет силу, необходимую для движения к целевой точке.
     * Используется для поиска еды (травоядные) и охоты (хищники).
     * 
     * Алгоритм:
     * 1. Вычисляется желаемая скорость (к цели, максимальная)
     * 2. Вычисляется steering force = desired - current
     * 3. Сила ограничивается maxForce
     * 
     * @param {Vector2D} target - Целевая позиция
     * @returns {Vector2D} - Вектор силы преследования
     */
    seek(target) {
        const desired = target.sub(this.position);
        desired.normalize().mult(this.maxSpeed);
        const steer = desired.sub(this.velocity);
        return steer.limit(this.maxForce);
    }
    
    /**
     * Steering behavior: Flee (бегство от опасности)
     * 
     * Вычисляет силу, необходимую для бегства от угрозы.
     * Используется для избегания хищников и яда.
     * 
     * Противоположен seek() - движение от цели, а не к ней.
     * 
     * @param {Vector2D} target - Позиция опасности
     * @returns {Vector2D} - Вектор силы бегства
     */
    flee(target) {
        const desired = this.position.sub(target);  // Инверсия направления
        desired.normalize().mult(this.maxSpeed);
        const steer = desired.sub(this.velocity);
        return steer.limit(this.maxForce);
    }
    
    /* ========================================
       ОТРИСОВКА
       ======================================== */
    
    /**
     * Отрисовывает агента на canvas
     * 
     * Рисует:
     * 1. Тело агента (эллипс для травоядных, треугольник для хищников)
     * 2. Индикатор энергии (цветная полоска над агентом)
     * 3. Текущее состояние конечного автомата (если включено)
     * 
     * Цвет зависит от генетических параметров (см. updateColor())
     * 
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas для рисования
     * @param {boolean} showStates - Показывать ли состояние над агентом
     * @returns {void}
     */
    draw(ctx, showStates = true) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Поворот в направлении движения
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);
        
        // Рисование тела агента
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        if (this.type === 'herbivore') {
            // Травоядное: эллипс (овальная форма)
            ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, 2 * Math.PI);
        } else {
            // Хищник: треугольник (агрессивная форма)
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size, -this.size / 2);
            ctx.lineTo(-this.size, this.size / 2);
            ctx.closePath();
        }
        
        ctx.fill();
        
        // Индикатор энергии над агентом
        ctx.restore();
        
        // Нормализация энергии (0.0 - 1.0)
        const maxEnergyForType = this.type === 'herbivore' ? 150 : 200;
        const energyBar = this.energy / maxEnergyForType;
        
        // Параметры полоски энергии
        const barWidth = this.size * 2;
        const barHeight = 3;
        
        // Фон полоски (серый)
        ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
        ctx.fillRect(
            this.position.x - barWidth/2, 
            this.position.y - this.size - 8, 
            barWidth, 
            barHeight
        );
        
        // Цветная часть (зелёный/оранжевый/красный в зависимости от уровня)
        ctx.fillStyle = energyBar > 0.6 ? '#4CAF50' :    // Высокая энергия: зелёный
                       energyBar > 0.3 ? '#FF9800' :     // Средняя: оранжевый
                       '#F44336';                        // Низкая: красный
        ctx.fillRect(
            this.position.x - barWidth/2, 
            this.position.y - this.size - 8, 
            barWidth * Math.max(0, energyBar), 
            barHeight
        );
        
        // Отображение состояния конечного автомата над агентом
        if (showStates) {
            ctx.font = '10px Arial';
            
            // Определяем цвет текста в зависимости от темы
            const isDarkTheme = document.body.getAttribute('data-color-scheme') === 'dark';
            
            // Обводка для лучшей читаемости
            ctx.strokeStyle = isDarkTheme ? '#1f2121' : '#f5f5f5';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.strokeText(this.state, this.position.x, this.position.y - this.size - 15);
            
            // Сам текст состояния
            ctx.fillStyle = isDarkTheme ? '#f5f5f5' : '#1f2121';
            ctx.fillText(this.state, this.position.x, this.position.y - this.size - 15);
        }
    }
    
    /* ========================================
       РАЗМНОЖЕНИЕ И ГЕНЕТИКА
       ======================================== */
    
    /**
     * Проверяет, может ли агент размножаться
     * 
     * Размножение возможно, если энергия превышает порог
     * (задаётся в CONFIG для каждого типа агента)
     * 
     * @returns {boolean} - true, если агент может размножаться
     */
    canReproduce() {
        const threshold = this.type === 'herbivore' 
            ? CONFIG.agents.herbivore.reproductionThreshold 
            : CONFIG.agents.predator.reproductionThreshold;
        return this.energy > threshold;
    }
    
    /**
     * Создаёт потомка с наследованием генов и мутациями
     * 
     * Процесс размножения:
     * 1. Проверка возможности (canReproduce())
     * 2. Трата энергии родителя (60% остаётся)
     * 3. Создание потомка рядом с родителем
     * 4. Наследование генов с мутациями:
     *    - maxSpeed (скорость)
     *    - size (размер)
     *    - poisonSensitivity (чувствительность к яду)
     * 5. Увеличение номера поколения на 1
     * 
     * Мутации контролируются CONFIG.simulation.mutationRate
     * 
     * @returns {Agent|null} - Новый агент (потомок) или null, если размножение невозможно
     */
    reproduce() {
        if (this.canReproduce()) {
            // Трата энергии на размножение
            this.energy *= 0.6;
            this.offspringCount++;
            
            // Создание потомка рядом с родителем
            const OffspringClass = this.type === 'herbivore' ? Herbivore : Predator;
            const offspring = new OffspringClass(
                this.position.x + Math.random() * 40 - 20,  // Случайное смещение
                this.position.y + Math.random() * 40 - 20
            );
            
            // Коэффициент мутации из конфигурации
            const mutationRate = CONFIG.simulation.mutationRate;
            
            // Наследование и мутация физических параметров
            
            // Скорость: наследуется с небольшой мутацией
            offspring.maxSpeed = this.maxSpeed + (Math.random() - 0.5) * 0.3 * mutationRate;
            
            // Размер: наследуется с мутацией, минимум 4
            offspring.size = Math.max(4, this.size + (Math.random() - 0.5) * 2 * mutationRate);
            
            // Чувствительность к яду: КЛЮЧЕВОЙ генетический признак
            // Наследуется с мутацией, ограничивается диапазоном 0-1
            offspring.poisonSensitivity = this.poisonSensitivity + 
                                         (Math.random() - 0.5) * 0.3 * mutationRate;
            offspring.poisonSensitivity = Math.max(0, Math.min(1, offspring.poisonSensitivity));
            
            // Обновление цвета на основе новых генов
            offspring.updateColor();
            
            // Увеличение поколения
            offspring.generation = this.generation + 1;
            
            return offspring;
        }
        
        return null;
    }
    
    /* ========================================
       ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
       ======================================== */
    
    /**
     * Проверяет, мёртв ли агент
     * 
     * Агент считается мёртвым, если энергия <= 0
     * 
     * @returns {boolean} - true, если агент мёртв
     */
    isDead() {
        return this.energy <= 0;
    }
    
    /**
     * Находит ближайший объект из массива целей
     * 
     * Используется для поиска:
     * - Ближайшей еды (травоядные)
     * - Ближайшего хищника (травоядные для избегания)
     * - Ближайшего травоядного (хищники для охоты)
     * 
     * @param {Array} targets - Массив объектов с полем position
     * @param {number} maxDistance - Максимальная дистанция поиска
     * @returns {Object|null} - Ближайший объект или null
     */
    findNearest(targets, maxDistance = Infinity) {
        let nearest = null;
        let minDistance = maxDistance;
        
        for (const target of targets) {
            const distance = Vector2D.dist(this.position, target.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = target;
            }
        }
        
        return nearest;
    }
}

/* ========================================
   КЛАСС ТРАВОЯДНОГО
   ======================================== */

/**
 * Класс травоядного агента
 * 
 * Наследует Agent и добавляет специфичное поведение:
 * - Поиск еды (SEEK_FOOD)
 * - Избегание хищников (AVOID_PREDATOR)
 * - Избегание яда (зависит от poisonSensitivity)
 * - Блуждание (WANDER)
 * 
 * @class Herbivore
 * @extends Agent
 */
export class Herbivore extends Agent {
    /**
     * Создаёт нового травоядного агента
     * 
     * @constructor
     * @param {number} x - Начальная координата X
     * @param {number} y - Начальная координата Y
     */
    constructor(x, y) {
        super(x, y, 'herbivore');
        this.state = 'WANDER';
    }
    
    /**
     * Основное поведение травоядного (вызывается каждый кадр)
     * 
     * Приоритет действий:
     * 1. Избегание препятствий (высший приоритет)
     * 2. Избегание яда (если чувствительность высокая)
     * 3. Бегство от хищника (если рядом)
     * 4. Поиск еды (если безопасно)
     * 5. Блуждание (по умолчанию)
     * 
     * @param {Food[]} food - Массив еды на карте
     * @param {Predator[]} predators - Массив хищников
     * @param {Obstacle[]} obstacles - Массив препятствий
     * @param {Poison[]} poison - Массив яда
     * @returns {void}
     */
    behave(food, predators, obstacles, poison) {
        // 1. УМНОЕ ИЗБЕГАНИЕ ПРЕПЯТСТВИЙ (высший приоритет)
        let totalObstacleForce = new Vector2D(0, 0);
        obstacles.forEach(obstacle => {
            const smartAvoid = this.avoidObstacleSmart(obstacle);
            totalObstacleForce.add(smartAvoid);
        });
        
        // Применяем суммарную силу избегания
        if (totalObstacleForce.mag() > 0) {
            this.applyForce(totalObstacleForce);
        }
        
        // 2. ИЗБЕГАНИЕ ЯДА (зависит от генетической чувствительности)
        poison.forEach(poisonItem => {
            const poisonDistance = Vector2D.dist(this.position, poisonItem.position);
            
            // Контактный урон (происходит всегда при касании)
            if (poisonDistance < (this.size + poisonItem.size)) {
                poisonItem.damageAgent(this);
            }
            
            // Избегание - сила зависит от poisonSensitivity
            // Низкая чувствительность (0.0) = агент не видит яд
            // Высокая чувствительность (1.0) = избегает издалека
            const detectionRange = 35 * this.poisonSensitivity; // 0-35 пикселей
            
            if (poisonDistance < detectionRange) {
                const strength = (detectionRange - poisonDistance) / detectionRange;
                const avoidStrength = 2.0 * this.poisonSensitivity; // Сила зависит от гена
                const avoidForce = this.flee(poisonItem.position).mult(avoidStrength * strength);
                this.applyForce(avoidForce);
            }
        });
        
        // 3. ПОИСК БЛИЖАЙШИХ ОБЪЕКТОВ
        const nearestPredator = this.findNearest(predators, 80);
        const nearestFood = this.findNearest(food, 70);
        
        // 4. ЛОГИКА ПРИОРИТЕТОВ (конечный автомат)
        
        if (nearestPredator) {
            // СОСТОЯНИЕ: AVOID_PREDATOR
            // Хищник рядом - убегаем (высший приоритет)
            this.state = 'AVOID_PREDATOR';
            const fleeForce = this.flee(nearestPredator.position)
                             .mult(CONFIG.agents.herbivore.forces.avoid);
            this.applyForce(fleeForce);
            
        } else if (nearestFood) {
            // Проверяем безопасность еды (не рядом ли с ядом или препятствием)
            let foodSafe = true;
            
            // Проверка близости к яду
            poison.forEach(poisonItem => {
                if (Vector2D.dist(nearestFood.position, poisonItem.position) < 30) {
                    foodSafe = false;
                }
            });
            
            // Проверка близости к препятствию
            obstacles.forEach(obstacle => {
                const distToObstacle = Vector2D.dist(nearestFood.position, obstacle.position);
                if (distToObstacle < Math.max(obstacle.radiusX, obstacle.radiusY) + 20) {
                    foodSafe = false;
                }
            });
            
            if (foodSafe) {
                // СОСТОЯНИЕ: SEEK_FOOD
                // Еда безопасна - идём к ней
                this.state = 'SEEK_FOOD';
                const seekForce = this.seek(nearestFood.position)
                                 .mult(CONFIG.agents.herbivore.forces.seek);
                this.applyForce(seekForce);
                
                // Поедание еды при контакте
                if (Vector2D.dist(this.position, nearestFood.position) < this.size + nearestFood.size) {
                    this.energy += nearestFood.energy;
                    const index = food.indexOf(nearestFood);
                    if (index > -1) food.splice(index, 1);
                }
            } else {
                // Еда опасна - блуждаем
                this.state = 'WANDER';
                const wanderForce = Vector2D.random()
                                   .mult(CONFIG.agents.herbivore.forces.wander);
                this.applyForce(wanderForce);
            }
            
        } else {
            // СОСТОЯНИЕ: WANDER
            // Нет целей - случайное блуждание
            this.state = 'WANDER';
            const wanderForce = Vector2D.random()
                               .mult(CONFIG.agents.herbivore.forces.wander);
            this.applyForce(wanderForce);
        }
    }
}

/* ========================================
   КЛАСС ХИЩНИКА
   ======================================== */

/**
 * Класс хищника
 * 
 * Наследует Agent и добавляет специфичное поведение:
 * - Охота на травоядных (HUNT)
 * - Избегание яда
 * - Блуждание (WANDER)
 * 
 * @class Predator
 * @extends Agent
 */
export class Predator extends Agent {
    /**
     * Создаёт нового хищника
     * 
     * @constructor
     * @param {number} x - Начальная координата X
     * @param {number} y - Начальная координата Y
     */
    constructor(x, y) {
        super(x, y, 'predator');
        this.state = 'WANDER';
    }
    
    /**
     * Основное поведение хищника (вызывается каждый кадр)
     * 
     * Приоритет действий:
     * 1. Избегание препятствий
     * 2. Избегание яда
     * 3. Охота на травоядных (если видны)
     * 4. Блуждание (по умолчанию)
     * 
     * @param {Herbivore[]} herbivores - Массив травоядных (добыча)
     * @param {Obstacle[]} obstacles - Массив препятствий
     * @param {Poison[]} poison - Массив яда
     * @returns {void}
     */
    behave(herbivores, obstacles, poison) {
        // 1. УМНОЕ ИЗБЕГАНИЕ ПРЕПЯТСТВИЙ
        let totalObstacleForce = new Vector2D(0, 0);
        obstacles.forEach(obstacle => {
            const smartAvoid = this.avoidObstacleSmart(obstacle);
            totalObstacleForce.add(smartAvoid);
        });
        
        if (totalObstacleForce.mag() > 0) {
            this.applyForce(totalObstacleForce);
        }
        
        // 2. ИЗБЕГАНИЕ ЯДА
        poison.forEach(poisonItem => {
            const poisonDistance = Vector2D.dist(this.position, poisonItem.position);
            
            // Контактный урон
            if (poisonDistance < (this.size + poisonItem.size)) {
                poisonItem.damageAgent(this);
            }
            
            // Избегание (хищники менее чувствительны, чем травоядные)
            const detectionRange = 30 * this.poisonSensitivity; // 0-30 пикселей
            
            if (poisonDistance < detectionRange) {
                const strength = (detectionRange - poisonDistance) / detectionRange;
                const avoidStrength = 1.5 * this.poisonSensitivity;
                const avoidForce = this.flee(poisonItem.position).mult(avoidStrength * strength);
                this.applyForce(avoidForce);
            }
        });
        
        // 3. ОХОТА
        const nearestHerbivore = this.findNearest(herbivores, 120); // Дальность зрения
        
        if (nearestHerbivore) {
            // СОСТОЯНИЕ: HUNT
            // Травоядное обнаружено - охотимся
            this.state = 'HUNT';
            const huntForce = this.seek(nearestHerbivore.position)
                             .mult(CONFIG.agents.predator.huntForce);
            this.applyForce(huntForce);
            
            // Атака при контакте
            if (Vector2D.dist(this.position, nearestHerbivore.position) < 
                this.size + nearestHerbivore.size) {
                // Получаем 60% энергии жертвы
                this.energy += nearestHerbivore.energy * 0.6;
                
                // Удаляем съеденное травоядное
                const index = herbivores.indexOf(nearestHerbivore);
                if (index > -1) herbivores.splice(index, 1);
            }
        } else {
            // СОСТОЯНИЕ: WANDER
            // Добычи нет - блуждаем
            this.state = 'WANDER';
            const wanderForce = Vector2D.random().mult(0.08);
            this.applyForce(wanderForce);
        }
    }
}

/* ========================================
   КЛАСС ЕДЫ
   ======================================== */

/**
 * Класс еды (источник энергии для травоядных)
 * 
 * @class Food
 */
export class Food {
    /**
     * Создаёт новую еду
     * 
     * @constructor
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     */
    constructor(x, y) {
        /**
         * Позиция еды
         * @type {Vector2D}
         */
        this.position = new Vector2D(x, y);
        
        /**
         * Размер (радиус)
         * @type {number}
         */
        this.size = CONFIG.food.size;
        
        /**
         * Количество энергии, даваемое при поедании
         * @type {number}
         */
        this.energy = CONFIG.food.energy;
        
        /**
         * Цвет (случайный в жёлто-зелёной гамме)
         * @type {string}
         */
        this.color = `hsl(${60 + Math.random() * 40}, 80%, 60%)`;
    }
    
    /**
     * Отрисовывает еду на canvas
     * 
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @returns {void}
     */
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
    }
}

/* ========================================
   КЛАСС ПРЕПЯТСТВИЯ
   ======================================== */

/**
 * Класс препятствия (непроходимый объект на карте)
 * 
 * Имеет эллиптическую форму для более естественного вида.
 * Агенты отталкиваются от препятствий и двигаются вдоль них.
 * 
 * @class Obstacle
 */
export class Obstacle {
    /**
     * Создаёт новое препятствие
     * 
     * @constructor
     * @param {number} x - Координата X центра
     * @param {number} y - Координата Y центра
     * @param {number} width - Ширина препятствия
     * @param {number} height - Высота препятствия
     */
    constructor(x, y, width, height) {
        /**
         * Позиция центра препятствия
         * @type {Vector2D}
         */
        this.position = new Vector2D(x, y);
        
        /**
         * Ширина препятствия
         * @type {number}
         */
        this.width = width;
        
        /**
         * Высота препятствия
         * @type {number}
         */
        this.height = height;
        
        /**
         * Радиус по оси X (половина ширины)
         * Используется для эллиптической формы
         * @type {number}
         */
        this.radiusX = width / 2;
        
        /**
         * Радиус по оси Y (половина высоты)
         * @type {number}
         */
        this.radiusY = height / 2;
        
        /**
         * Основной цвет препятствия
         * @type {string}
         */
        this.color = '#616161';
        
        /**
         * Цвет тени для объёма
         * @type {string}
         */
        this.shadowColor = '#424242';
    }
    
    /**
     * Отрисовывает препятствие на canvas
     * 
     * Рисует эллипс с тенью и бликами для создания объёма
     * 
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @returns {void}
     */
    draw(ctx) {
        ctx.save();
        
        // Тень для объёма (смещена вправо-вниз)
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(
            this.position.x + 2,
            this.position.y + 2,
            this.radiusX,
            this.radiusY,
            Math.PI / 6,  // Небольшой поворот для естественности
            0,
            2 * Math.PI
        );
        ctx.fill();
        
        // Основной камень
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(
            this.position.x,
            this.position.y,
            this.radiusX,
            this.radiusY,
            Math.PI / 6,
            0,
            2 * Math.PI
        );
        ctx.fill();
        
        // Блик для текстуры камня
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.ellipse(
            this.position.x - this.radiusX / 3,
            this.position.y - this.radiusY / 3,
            this.radiusX / 3,
            this.radiusY / 3,
            0,
            0,
            Math.PI  // Полукруг
        );
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Проверяет столкновение с агентом (эллиптическая форма)
     * 
     * Использует формулу эллипса для точной проверки
     * 
     * @param {Agent} agent - Агент для проверки
     * @returns {boolean} - true, если агент сталкивается с препятствием
     */
    checkCollision(agent) {
        const dx = agent.position.x - this.position.x;
        const dy = agent.position.y - this.position.y;
        
        // Формула эллипса: (dx/rx)^2 + (dy/ry)^2 < 1
        const distance = Math.sqrt(
            (dx * dx) / (this.radiusX * this.radiusX) +
            (dy * dy) / (this.radiusY * this.radiusY)
        );
        
        return distance < 1 + (agent.size / Math.min(this.radiusX, this.radiusY));
    }
    
    /**
     * Проверяет, находится ли точка внутри препятствия
     * 
     * @param {number} x - Координата X точки
     * @param {number} y - Координата Y точки
     * @returns {boolean} - true, если точка внутри
     */
    containsPoint(x, y) {
        const dx = x - this.position.x;
        const dy = y - this.position.y;
        const distance = Math.sqrt(
            (dx * dx) / (this.radiusX * this.radiusX) +
            (dy * dy) / (this.radiusY * this.radiusY)
        );
        return distance < 1;
    }
    
    /**
     * Получает силу отталкивания от препятствия
     * 
     * Устаревший метод, используется avoidObstacleSmart() вместо этого
     * 
     * @param {Agent} agent - Агент
     * @returns {Vector2D} - Вектор силы отталкивания
     */
    getRepelForce(agent) {
        const distance = Vector2D.dist(agent.position, this.position);
        const detectionRadius = Math.max(this.radiusX, this.radiusY) + 20;
        
        if (distance < detectionRadius) {
            const repel = agent.position.sub(this.position)
                         .normalize()
                         .mult(3.0 / (distance + 1));
            return repel;
        }
        
        return new Vector2D(0, 0);
    }
}

/* ========================================
   КЛАСС ЯДА
   ======================================== */

/**
 * Класс яда (опасный объект, наносящий урон)
 * 
 * Яд создаёт давление естественного отбора на poisonSensitivity:
 * - Агенты с высокой чувствительностью избегают яд
 * - Агенты с низкой чувствительностью часто погибают от яда
 * 
 * @class Poison
 */
export class Poison {
    /**
     * Создаёт новый яд
     * 
     * @constructor
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     */
    constructor(x, y) {
        /**
         * Позиция яда
         * @type {Vector2D}
         */
        this.position = new Vector2D(x, y);
        
        /**
         * Размер (радиус)
         * @type {number}
         */
        this.size = CONFIG.poison.size;
        
        /**
         * Урон, наносимый при контакте
         * @type {number}
         */
        this.damage = CONFIG.poison.damage;
        
        /**
         * Цвет яда (красный)
         * @type {string}
         */
        this.color = '#f44336';
    }
    
    /**
     * Отрисовывает яд на canvas
     * 
     * Рисует красный круг с символом черепа (☠)
     * 
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @returns {void}
     */
    draw(ctx) {
        // Круг яда
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // Символ яда (череп)
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('☠', this.position.x, this.position.y + 4);
    }
    
    /**
     * Проверяет контакт с агентом
     * 
     * @param {Agent} agent - Агент для проверки
     * @returns {boolean} - true, если агент касается яда
     */
    checkContact(agent) {
        return Vector2D.dist(this.position, agent.position) < (this.size + agent.size);
    }
    
    /**
     * Наносит урон агенту
     * 
     * Вызывается при контакте (checkContact())
     * 
     * @param {Agent} agent - Агент, получающий урон
     * @returns {void}
     */
    damageAgent(agent) {
        agent.energy -= this.damage;
    }
}
