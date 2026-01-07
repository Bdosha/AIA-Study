class TransitionTable {
    constructor() {
        this.rules = [];
        this.states = new Set();
        this.symbols = new Set();
    }

    addRule(rule) {
        // Проверка корректности правила
        if (this.validateRule(rule)) {
            this.rules.push(rule);
            this.states.add(rule.currentState);
            this.states.add(rule.newState);
            this.symbols.add(rule.currentSymbol);
            this.symbols.add(rule.writeSymbol);
            return true;
        }
        return false;
    }

    // Получить ВСЕ подходящие переходы (квантовая суперпозиция)
    getTransitions(state, symbol) {
        return this.rules.filter(rule => 
            rule.currentState === state && 
            rule.currentSymbol === symbol
        );
    }

    validateRule(rule) {
        return rule.currentState && rule.newState && 
               rule.currentSymbol && rule.writeSymbol &&
               rule.moveDirection && 
               typeof rule.amplitude === 'number' &&
               Math.abs(rule.amplitude) <= 1;
    }

    // Проверка унитарности (для UnitaryVerifier)
    getMatrixForSymbol(symbol) {
        const matrix = {};
        
        this.states.forEach(state => {
            matrix[state] = {};
            this.states.forEach(targetState => {
                matrix[state][targetState] = 0;
            });
        });
        
        this.rules.forEach(rule => {
            if (rule.currentSymbol === symbol) {
                matrix[rule.currentState][rule.newState] = rule.amplitude;
            }
        });
        
        return matrix;
    }
}

