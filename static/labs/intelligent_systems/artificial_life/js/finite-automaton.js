/**
 * Файл: finite-automaton.js
 * Описание: Реализация конечного автомата для управления поведением агентов
 * 
 * Конечный автомат (Finite State Machine, FSM) - это модель вычислений,
 * которая может находиться в одном из конечного числа состояний.
 * В каждый момент времени автомат находится ровно в одном состоянии,
 * и может переходить между состояниями на основе входных данных.
 * 
 * Применение в симуляции:
 * - Управляет поведением агентов (травоядных и хищников)
 * - Определяет приоритеты действий на основе окружения
 * - Создаёт естественное и предсказуемое поведение
 * - Визуализируется над агентами для наблюдения за эволюцией стратегий
 * 
 * Состояния автомата:
 * 1. WANDER - Блуждание (состояние по умолчанию)
 * 2. SEEK_FOOD - Поиск еды (только травоядные)
 * 3. AVOID_PREDATOR - Бегство от хищника (только травоядные)
 * 4. HUNT - Охота на добычу (только хищники)
 * 
 * Диаграмма переходов:
 * 
 *                    ТРАВОЯДНОЕ:
 *                    
 *        [Хищник рядом] ──────► AVOID_PREDATOR
 *               │                      │
 *               │                      │ [Хищник ушёл]
 *               │                      ▼
 *          WANDER ◄──────────────── [Еда рядом]
 *               │                      │
 *               │                      ▼
 *               └──────────────► SEEK_FOOD
 *                   [Еда съедена]
 * 
 *                    ХИЩНИК:
 *                    
 *        [Травоядное рядом] ──► HUNT
 *               │                  │
 *               │                  │ [Травоядное ушло/съедено]
 *               │                  │
 *               ◄──────────────────┘
 *            WANDER
 * 
 * Приоритеты (от высшего к низшему):
 * Травоядные: AVOID_PREDATOR > SEEK_FOOD > WANDER
 * Хищники: HUNT > WANDER
 * 
 * @author Ваше имя
 * @version 1.0
 */

/**
 * Класс конечного автомата для управления состояниями агентов
 * 
 * Реализует паттерн State Machine с явным отслеживанием переходов.
 * Каждый агент имеет свой экземпляр автомата для независимого поведения.
 * 
 * @class FiniteAutomaton
 * 
 * @example
 * // В конструкторе Agent:
 * this.automaton = new FiniteAutomaton();
 * 
 * @example
 * // Обновление состояния в методе behave():
 * const inputs = {
 *     nearestPredator: this.findNearest(predators),
 *     nearestFood: this.findNearest(food),
 *     agentType: this.type
 * };
 * this.automaton.update(inputs);
 * this.state = this.automaton.getCurrentState();
 */
export class FiniteAutomaton {
    /**
     * Создаёт новый конечный автомат
     * 
     * Инициализирует все возможные состояния и устанавливает
     * начальное состояние WANDER (блуждание).
     * 
     * @constructor
     */
    constructor() {
        /**
         * Словарь всех возможных состояний автомата
         * 
         * Использует объект вместо enum для удобства:
         * - Легко проверять: if (state === this.states.WANDER)
         * - Автодополнение в IDE
         * - Защита от опечаток
         * 
         * @type {Object.<string, string>}
         * @property {string} WANDER - Случайное блуждание (состояние по умолчанию)
         * @property {string} SEEK_FOOD - Активный поиск еды (травоядные)
         * @property {string} AVOID_PREDATOR - Бегство от опасности (травоядные)
         * @property {string} HUNT - Преследование добычи (хищники)
         */
        this.states = {
            WANDER: 'WANDER',                   // Блуждание без цели
            SEEK_FOOD: 'SEEK_FOOD',             // Движение к еде
            AVOID_PREDATOR: 'AVOID_PREDATOR',   // Бегство от хищника
            HUNT: 'HUNT'                        // Охота на травоядное
        };
        
        /**
         * Текущее состояние автомата
         * 
         * Определяет текущее поведение агента.
         * Изменяется через метод update() на основе входных данных.
         * 
         * @type {string}
         */
        this.currentState = this.states.WANDER;
        
        /**
         * Предыдущее состояние автомата
         * 
         * Сохраняется для отслеживания переходов между состояниями.
         * Используется методом hasStateChanged() для определения,
         * произошёл ли переход в новое состояние.
         * 
         * @type {string|null}
         */
        this.previousState = null;
    }
    
    /**
     * Обновляет состояние автомата на основе входных данных
     * 
     * Это основная функция переходов (transition function) автомата.
     * Анализирует текущее окружение агента и определяет наиболее
     * подходящее состояние согласно таблице переходов.
     * 
     * Логика переходов реализует приоритетную систему:
     * 
     * Для травоядных:
     * 1. Если рядом хищник → AVOID_PREDATOR (высший приоритет - выживание)
     * 2. Иначе, если есть еда → SEEK_FOOD (средний приоритет - поиск ресурсов)
     * 3. Иначе → WANDER (низший приоритет - исследование)
     * 
     * Для хищников:
     * 1. Если есть добыча → HUNT (охота при возможности)
     * 2. Иначе → WANDER (поиск добычи)
     * 
     * @param {Object} inputs - Входные данные для определения состояния
     * @param {Agent|null} inputs.nearestPredator - Ближайший хищник (для травоядных)
     * @param {Food|null} inputs.nearestFood - Ближайшая еда (для травоядных)
     * @param {Agent|null} inputs.nearestHerbivore - Ближайшее травоядное (для хищников)
     * @param {string} inputs.agentType - Тип агента ('herbivore' или 'predator')
     * @returns {string} - Новое текущее состояние
     * 
     * @example
     * // В методе behave() класса Herbivore:
     * const inputs = {
     *     nearestPredator: this.findNearest(predators, 80),
     *     nearestFood: this.findNearest(food, 70),
     *     nearestHerbivore: null,
     *     agentType: 'herbivore'
     * };
     * const newState = this.automaton.update(inputs);
     */
    update(inputs) {
        // Сохраняем текущее состояние как предыдущее
        // Это позволяет отследить переход
        this.previousState = this.currentState;
        
        /* === ТАБЛИЦА ПЕРЕХОДОВ === */
        
        // ПРИОРИТЕТ 1 (Высший): Избегание хищника (только травоядные)
        // Переход: * → AVOID_PREDATOR при наличии хищника рядом
        if (inputs.nearestPredator && inputs.agentType === 'herbivore') {
            this.currentState = this.states.AVOID_PREDATOR;
        } 
        // ПРИОРИТЕТ 2: Поиск еды (только травоядные)
        // Переход: WANDER → SEEK_FOOD при обнаружении еды
        else if (inputs.nearestFood && inputs.agentType === 'herbivore') {
            this.currentState = this.states.SEEK_FOOD;
        } 
        // ПРИОРИТЕТ 3: Охота (только хищники)
        // Переход: WANDER → HUNT при обнаружении добычи
        else if (inputs.nearestHerbivore && inputs.agentType === 'predator') {
            this.currentState = this.states.HUNT;
        } 
        // ПРИОРИТЕТ 4 (Низший): Блуждание по умолчанию
        // Переход: * → WANDER если нет активных стимулов
        else {
            this.currentState = this.states.WANDER;
        }
        
        // Возвращаем новое состояние для удобства
        return this.currentState;
    }
    
    /**
     * Возвращает текущее состояние автомата
     * 
     * Геттер для получения текущего состояния.
     * Используется для отображения состояния над агентом
     * и для логирования/отладки.
     * 
     * @returns {string} - Текущее состояние
     * 
     * @example
     * // В методе draw() класса Agent:
     * const state = this.automaton.getCurrentState();
     * ctx.fillText(state, this.position.x, this.position.y - 15);
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Проверяет, изменилось ли состояние после последнего update()
     * 
     * Полезно для:
     * - Отладки и логирования переходов
     * - Триггера событий при смене состояния
     * - Анализа поведения агентов
     * - Звуковых эффектов при переходах (в будущем)
     * 
     * @returns {boolean} - true, если состояние изменилось
     * 
     * @example
     * // После update():
     * this.automaton.update(inputs);
     * if (this.automaton.hasStateChanged()) {
     *     console.log(`Переход: ${this.automaton.previousState} → ${this.automaton.currentState}`);
     * }
     */
    hasStateChanged() {
        return this.currentState !== this.previousState;
    }
    
    /**
     * Принудительно устанавливает состояние автомата
     * 
     * Позволяет вручную изменить состояние, минуя логику переходов.
     * Используется редко, в основном для:
     * - Инициализации специфичных состояний
     * - Тестирования поведения
     * - Внешнего управления (например, пользовательский ввод)
     * 
     * Сохраняет предыдущее состояние для корректной работы hasStateChanged()
     * 
     * @param {string} state - Новое состояние (должно быть одним из this.states)
     * @returns {void}
     * 
     * @example
     * // Принудительный переход в состояние охоты:
     * this.automaton.setState(this.automaton.states.HUNT);
     * 
     * @example
     * // Сброс в начальное состояние:
     * this.automaton.setState(this.automaton.states.WANDER);
     */
    setState(state) {
        this.previousState = this.currentState;
        this.currentState = state;
    }
}
