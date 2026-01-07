class DFA {
    constructor() {
        this.states = new Set(); // множество состояний
        this.alphabet = new Set(); // алфавит символов
        this.transitions = new Map(); // функция переходов
        this.startState = null; // начальное состояние
        this.acceptStates = new Set(); // множество принимающих состояний
        this.currentState = null; // текущее состояние при выполнении
        this.currentPosition = 0; // позиция в входной строке
        this.executionHistory = []; // история выполнения
    }

    // Добавление состояния
    addState(state, isStart = false, isAccept = false) {
        this.states.add(state);
        if (isStart) this.startState = state;
        if (isAccept) this.acceptStates.add(state);
    }

    // Добавление символа в алфавит
    addSymbol(symbol) {
        this.alphabet.add(symbol);
    }

    // Добавление перехода
    addTransition(fromState, symbol, toState) {
        const key = `${fromState},${symbol}`;
        this.transitions.set(key, toState);
    }

    // Получение следующего состояния
    getNextState(currentState, symbol) {
        const key = `${currentState},${symbol}`;
        return this.transitions.get(key) || null;
    }

    // Валидация автомата
    validate() {
        const errors = [];
        
        if (!this.startState) {
            errors.push("Не указано начальное состояние");
        }
        
        if (this.acceptStates.size === 0) {
            errors.push("Не указаны принимающие состояния");
        }
        
        // Проверка полноты функции переходов
        for (let state of this.states) {
            for (let symbol of this.alphabet) {
                if (!this.getNextState(state, symbol)) {
                    errors.push(`Не определен переход из состояния ${state} по символу ${symbol}`);
                }
            }
        }
        
        return errors;
    }

    // Пошаговое выполнение
    step(inputString) {
    if (this.currentState == null) {
        this.currentState = this.startState;
    }
    if (this.currentPosition >= inputString.length) {
        return { finished: true, accepted: this.acceptStates.has(this.currentState) };
    }

        const symbol = inputString[this.currentPosition];
        const nextState = this.getNextState(this.currentState, symbol);
        
        if (!nextState) {
            return { error: `Нет перехода из ${this.currentState} по символу ${symbol}` };
        }

        // Сохранение в историю
        this.executionHistory.push({
            fromState: this.currentState,
            symbol: symbol,
            toState: nextState,
            position: this.currentPosition
        });

        this.currentState = nextState;
        this.currentPosition++;

        return { 
            success: true, 
            currentState: this.currentState,
            position: this.currentPosition 
        };
    }

    // Сброс к начальному состоянию
    reset() {
        this.currentState = this.startState;
        this.currentPosition = 0;
        this.executionHistory = [];
    }

    // Полное выполнение
    run(inputString) {
        this.reset();
        
        for (let i = 0; i < inputString.length; i++) {
            const result = this.step(inputString);
            if (result.error) return result;
        }
        
        return { 
            accepted: this.acceptStates.has(this.currentState),
            finalState: this.currentState 
        };
    }
}