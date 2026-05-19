/**
 * @fileoverview Модуль Model (Модель).
 * Содержит класс TagSystem, реализующий основную логику Циклической тег-системы (CTS).
 * Этот класс полностью отделён от DOM и не зависит от представления.
 */

/**
 * Реализует логику Циклической тег-системы согласно заданному алгоритму.
 */
export default class TagSystem {
    /**
     * @param {{initialString: string, productions: string[]}} config Конфигурация для инициализации.
     */
    constructor(config) {
        this.loadConfig(config);
        this.reset();
    }

    /**
     * Загружает новую конфигурацию и сбрасывает состояние системы.
     * @param {{initialString: string, productions: string[]}} config Новая конфигурация.
     */
    loadConfig(config) {
        this.initialString = config.initialString || '';
        // Правила теперь являются массивом (циклическим списком)
        this.productions = config.productions || [];
    }

    /**
     * Сбрасывает систему в её начальное состояние.
     */
    reset() {
        this.currentString = this.initialString;
        this.stepCount = 0;
        this.ruleIndex = 0; // Индекс 'k' для текущего правила
        this.isHalted = this.currentString.length < 1;
        this.lastAction = null;
    }

    /**
     * Выполняет один шаг симуляции по алгоритму "True CTS".
     */
    step() {
        // Остановка, если строка пуста или нет правил
        if (this.isHalted || this.productions.length === 0) {
            return;
        }

        // 1. Определяется первый символ s_head
        const s_head = this.currentString[0];
        
        // 2. Удаляется p = 1 символ
        const deletedPart = s_head;
        const remainingPart = this.currentString.substring(1);
        
        // 3. Берется текущее правило Pk
        const currentRule = this.productions[this.ruleIndex];
        let productionToAdd = '';
        
        // 4. Условие добавления: ЕСЛИ s_head = '1', α = Pk дописывается
        if (s_head === '1') {
            productionToAdd = currentRule;
        }
        // Если s_head = '0', productionToAdd остается пустой строкой
        
        this.currentString = remainingPart + productionToAdd;
        
        // 5. Индекс i (шаг) увеличивается на 1
        this.stepCount++;
        
        // 6. Индекс правила k циклически сдвигается
        this.ruleIndex = (this.ruleIndex + 1) % this.productions.length;
        
        // Проверка условия остановки для СЛЕДУЮЩЕГО шага
        this.isHalted = this.currentString.length < 1;
        
        this.lastAction = {
            deleted: deletedPart,
            added: productionToAdd,
            rest: remainingPart,
        };
    }
}