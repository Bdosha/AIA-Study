class TuringMachine {
    constructor() {
        this.alphabet = ['0', '1', ' '];
        this.states = ['q0', 'q1', 'q2', 'qf'];
        this.initialState = 'q0';
        this.currentState = 'q0';
        this.finalStates = ['qf'];
        this.blankSymbol = ' ';
        
        // Лента реализована как Map для эффективности
        this.tape = new Map();
        this.headPosition = 0;
        
        // Таблица переходов: (state, symbol) -> [newState, newSymbol, direction]
        this.transitionTable = new Map();
        
        this.initializeTape(['1', '0', '1']);
        this.initializeDefaultTransitions();
    }
    
    initializeTape(initialSymbols = []) {
        this.tape.clear();
        this.headPosition = 0;
        
        if (initialSymbols.length === 0) {
            this.tape.set(0, this.blankSymbol);
            return;
        }
        
        initialSymbols.forEach((symbol, index) => {
            // Заменяем пустые строки на пробел (пустой символ)
            const actualSymbol = symbol === '' ? this.blankSymbol : symbol;
            this.tape.set(index, actualSymbol);
        });
    }
    
    initializeDefaultTransitions() {
        // Простая программа для демонстрации
        this.addTransition('q0', '1', 'q0', '1', 'R');
        this.addTransition('q0', '0', 'q1', '0', 'R');
        this.addTransition('q1', '1', 'q1', '1', 'R');
        this.addTransition('q1', ' ', 'q2', ' ', 'L');
        this.addTransition('q2', '1', 'qf', '0', 'S');
    }
    
    addTransition(currentState, readSymbol, newState, writeSymbol, direction) {
        const key = `${currentState},${readSymbol}`;
        this.transitionTable.set(key, [newState, writeSymbol, direction]);
    }
    
    removeTransition(currentState, readSymbol) {
        const key = `${currentState},${readSymbol}`;
        return this.transitionTable.delete(key);
    }
    
    getTransition(currentState, readSymbol) {
        const key = `${currentState},${readSymbol}`;
        return this.transitionTable.get(key);
    }
    
    getAllTransitions() {
        const transitions = [];
        for (let [key, value] of this.transitionTable) {
            const [currentState, readSymbol] = key.split(',');
            const [newState, writeSymbol, direction] = value;
            transitions.push({
                currentState,
                readSymbol,
                newState,
                writeSymbol,
                direction
            });
        }
        return transitions;
    }
    
    read() {
        return this.tape.get(this.headPosition) || this.blankSymbol;
    }
    
    write(symbol) {
        this.tape.set(this.headPosition, symbol);
    }
    
    move(direction) {
        switch (direction) {
            case 'L': this.headPosition--; break;
            case 'R': this.headPosition++; break;
            case 'S': break; // Остаться на месте
            default:
                console.warn(`Неизвестное направление: ${direction}`);
        }
        
        // Гарантируем, что ячейка существует
        if (!this.tape.has(this.headPosition)) {
            this.tape.set(this.headPosition, this.blankSymbol);
        }
    }
    
    step() {
        const currentSymbol = this.read();
        const transition = this.getTransition(this.currentState, currentSymbol);
        
        if (!transition) {
            throw new Error(`Неопределённый переход: состояние ${this.currentState}, символ ${currentSymbol}`);
        }
        
        const [newState, newSymbol, direction] = transition;
        
        // Выполняем переход
        this.write(newSymbol);
        this.currentState = newState;
        this.move(direction);
        
        return {
            currentState: this.currentState,
            currentSymbol,
            newState,
            newSymbol,
            direction,
            headPosition: this.headPosition,
            isFinal: this.finalStates.includes(newState)
        };
    }
    
    reset() {
        this.currentState = this.initialState;
        this.headPosition = 0;
        
        // Восстанавливаем начальное содержимое ленты
        const initialSymbols = Array.from(this.tape.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, symbol]) => symbol);
        this.initializeTape(initialSymbols);
    }
    
    isInFinalState() {
        return this.finalStates.includes(this.currentState);
    }
    
    getTapeState() {
        // Получаем минимальную и максимальную позиции на ленте
        const positions = Array.from(this.tape.keys());
        if (positions.length === 0) return { cells: [], minPos: 0, maxPos: 0 };
        
        const minPos = Math.min(...positions);
        const maxPos = Math.max(...positions);
        
        // Создаем массив ячеек для отображения
        const cells = [];
        for (let i = minPos - 2; i <= maxPos + 2; i++) {
            cells.push({
                position: i,
                symbol: this.tape.get(i) || this.blankSymbol,
                isActive: i === this.headPosition
            });
        }
        
        return { cells, minPos, maxPos };
    }
    
    setAlphabet(alphabet) {
        this.alphabet = [...alphabet];
        if (!this.alphabet.includes(this.blankSymbol)) {
            this.alphabet.push(this.blankSymbol);
        }
    }
    
    setStates(states) {
        this.states = [...states];
    }
    
    setInitialState(state) {
        if (this.states.includes(state)) {
            this.initialState = state;
            this.currentState = state;
        }
    }
    
    setFinalStates(states) {
        this.finalStates = states.filter(state => this.states.includes(state));
    }
    
    setTransitionFunction(transitionTable) {
        this.transitionTable = transitionTable;
    }
    
    exportConfiguration() {
        return {
            alphabet: this.alphabet,
            states: this.states,
            initialState: this.initialState,
            finalStates: this.finalStates,
            transitions: this.getAllTransitions(),
            tape: Array.from(this.tape.entries()).sort(([a], [b]) => a - b)
        };
    }
    
    importConfiguration(config) {
        this.setAlphabet(config.alphabet);
        this.setStates(config.states);
        this.setInitialState(config.initialState);
        this.setFinalStates(config.finalStates);
        
        this.transitionTable.clear();
        config.transitions.forEach(transition => {
            this.addTransition(
                transition.currentState,
                transition.readSymbol,
                transition.newState,
                transition.writeSymbol,
                transition.direction
            );
        });
        
        // Восстанавливаем ленту
        const tapeSymbols = config.tape ? config.tape.map(([_, symbol]) => symbol) : config.initialTape || [' '];
        this.initializeTape(tapeSymbols);
    }
}