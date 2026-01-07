class NFA {
    constructor() {
        this.states = new Set(); // множество состояний
        this.alphabet = new Set(); // алфавит символов
        this.transitions = new Map(); // функция переходов: Map<"state,symbol", Set<states>>
        this.epsilonTransitions = new Map(); // ε-переходы: Map<state, Set<states>>
        this.startState = null; // начальное состояние
        this.acceptStates = new Set(); // множество принимающих состояний
        this.currentStates = new Set(); // текущие состояния при выполнении
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
        if (symbol !== 'ε') { // ε обрабатывается отдельно
            this.alphabet.add(symbol);
        }
    }

    // Добавление перехода по символу
    addTransition(fromState, symbol, toState) {
        const key = `${fromState},${symbol}`;
        if (!this.transitions.has(key)) {
            this.transitions.set(key, new Set());
        }
        this.transitions.get(key).add(toState);
    }

    // Добавление ε-перехода
    addEpsilonTransition(fromState, toState) {
        if (!this.epsilonTransitions.has(fromState)) {
            this.epsilonTransitions.set(fromState, new Set());
        }
        this.epsilonTransitions.get(fromState).add(toState);
    }

    // Получение следующих состояний по символу
    getNextStates(currentState, symbol) {
        const key = `${currentState},${symbol}`;
        return this.transitions.get(key) || new Set();
    }

    // Вычисление ε-замыкания для множества состояний
    epsilonClosure(states) {
        const closure = new Set(states);
        const stack = Array.from(states);
        
        while (stack.length > 0) {
            const state = stack.pop();
            const epsilonTargets = this.epsilonTransitions.get(state) || new Set();
            
            for (const target of epsilonTargets) {
                if (!closure.has(target)) {
                    closure.add(target);
                    stack.push(target);
                }
            }
        }
        
        return closure;
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
        
        // Для НКА не проверяем полноту переходов - это нормально
        
        return errors;
    }

    // Пошаговое выполнение
step(inputString) {
    // Инициализация при первом шаге ИЛИ после сброса
    if (this.currentPosition === 0 && this.currentStates.size === 0) {
        this.currentStates = this.epsilonClosure([this.startState]);
        
        // Если это чистый старт (не после reset), возвращаем начальное состояние
        if (this.executionHistory.length === 0) {
            return {
                success: true,
                currentStates: Array.from(this.currentStates),
                position: this.currentPosition,
                initialized: true
            };
        }
    }

    // Конец строки - проверяем принимающие состояния
    if (this.currentPosition >= inputString.length) {
        const hasAcceptState = Array.from(this.currentStates).some(state => 
            this.acceptStates.has(state)
        );
        return { 
            finished: true, 
            accepted: hasAcceptState,
            currentStates: Array.from(this.currentStates)
        };
    }

    const symbol = inputString[this.currentPosition];
    
    // Вычисляем следующие состояния для всех текущих состояний
    const nextStates = new Set();
    let hasValidTransition = false;

    for (const state of this.currentStates) {
        const targets = this.getNextStates(state, symbol);
        if (targets.size > 0) {
            hasValidTransition = true;
            for (const target of targets) {
                nextStates.add(target);
            }
        }
    }

    // Если есть хоть один валидный переход - продолжаем
    if (hasValidTransition) {
        const newCurrentStates = this.epsilonClosure(nextStates);
        
        this.executionHistory.push({
            fromStates: Array.from(this.currentStates),
            symbol: symbol,
            toStates: Array.from(newCurrentStates),
            position: this.currentPosition
        });

        this.currentStates = newCurrentStates;
        this.currentPosition++;

        return { 
            success: true, 
            currentStates: Array.from(this.currentStates),
            position: this.currentPosition 
        };
    } else {
        // Все пути тупиковые - "умираем"
        this.executionHistory.push({
            fromStates: Array.from(this.currentStates),
            symbol: symbol,
            toStates: [],
            position: this.currentPosition,
            terminated: true
        });

        this.currentStates = new Set();
        this.currentPosition++;

        return { 
            success: true, 
            currentStates: [],
            position: this.currentPosition,
            allPathsTerminated: true
        };
    }
}

    // Сброс к начальному состоянию
    reset() {
        this.currentStates = new Set();
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
        
        const hasAcceptState = Array.from(this.currentStates).some(state => 
            this.acceptStates.has(state)
        );
        
        return { 
            accepted: hasAcceptState,
            finalStates: Array.from(this.currentStates)
        };
    }

    // Получение всех переходов для состояния (для визуализации)
    getAllTransitions() {
        const allTransitions = [];
        
        // Обычные переходы
        for (let [key, toStates] of this.transitions) {
            const [fromState, symbol] = key.split(',');
            for (const toState of toStates) {
                allTransitions.push({ fromState, symbol, toState });
            }
        }
        
        // ε-переходы
        for (let [fromState, toStates] of this.epsilonTransitions) {
            for (const toState of toStates) {
                allTransitions.push({ fromState, symbol: 'ε', toState });
            }
        }
        
        return allTransitions;
    }
}