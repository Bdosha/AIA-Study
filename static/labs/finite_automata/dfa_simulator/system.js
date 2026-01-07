// system.js - ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ ВЕРСИЯ
class SystemConnection {
    constructor(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol = null) {
        this.fromAutomaton = fromAutomaton;
        this.fromState = fromState;
        this.toAutomaton = toAutomaton;
        this.toState = toState;
        this.triggerSymbol = triggerSymbol;
    }

    equals(other) {
        return other instanceof SystemConnection &&
               this.fromAutomaton === other.fromAutomaton &&
               this.fromState === other.fromState &&
               this.toAutomaton === other.toAutomaton &&
               this.toState === other.toState &&
               this.triggerSymbol === other.triggerSymbol;
    }

    hashCode() {
        return `${this.fromAutomaton}-${this.fromState}-${this.toAutomaton}-${this.toState}-${this.triggerSymbol}`;
    }
}

class MultiAgentSystem {
    constructor() {
        this.automata = new Map();
        this.connections = new Set();
        this.history = [];
        this.systemAlphabet = new Set();
        this.customAlphabet = new Set();
        this.useCustomAlphabet = false;
    }

    addAutomaton(automaton) {
        let originalName = automaton.name;
        let counter = 1;
        while (this.automata.has(automaton.name)) {
            automaton.name = `${originalName}_${counter}`;
            counter++;
        }
        this.automata.set(automaton.name, automaton);
        this._updateSystemAlphabet();
    }

    addConnection(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol = null) {
        if (!this.automata.has(fromAutomaton)) {
            throw new Error(`Automaton '${fromAutomaton}' not found`);
        }
        if (!this.automata.has(toAutomaton)) {
            throw new Error(`Automaton '${toAutomaton}' not found`);
        }

        const fromAuto = this.automata.get(fromAutomaton);
        const toAuto = this.automata.get(toAutomaton);

        if (!Array.from(fromAuto.states).some(state => state.name === fromState)) {
            throw new Error(`State '${fromState}' not found in automaton '${fromAutomaton}'`);
        }
        if (!Array.from(toAuto.states).some(state => state.name === toState)) {
            throw new Error(`State '${toState}' not found in automaton '${toAutomaton}'`);
        }

        const connection = new SystemConnection(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol);
        this.connections.add(connection);
    }

    removeConnection(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol = null) {
        const connection = new SystemConnection(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol);
        this.connections.forEach(conn => {
            if (conn.equals(connection)) {
                this.connections.delete(conn);
            }
        });
    }

    _updateSystemAlphabet() {
        this.systemAlphabet.clear();
        this.automata.forEach(automaton => {
            if (automaton.automatonType === AutomatonType.ACTIVE) {
                const alphabet = automaton.getAlphabet();
                alphabet.forEach(symbol => this.systemAlphabet.add(symbol));
            }
        });
    }

    getSystemAlphabet() {
        if (this.useCustomAlphabet && this.customAlphabet.size > 0) {
            return this.customAlphabet;
        }
        return this.systemAlphabet;
    }

    setCustomAlphabet(alphabet) {
        this.customAlphabet = new Set(alphabet);
    }

    setUseCustomAlphabet(useCustom) {
        this.useCustomAlphabet = useCustom;
    }

    getActiveAutomata() {
        return Array.from(this.automata.values()).filter(auto => 
            auto.automatonType === AutomatonType.ACTIVE
        );
    }

    getPassiveAutomata() {
        return Array.from(this.automata.values()).filter(auto => 
            auto.automatonType === AutomatonType.PASSIVE
        );
    }

    resetSystem() {
        this.automata.forEach(automaton => automaton.reset());
        this.history = [];
    }

    processInput(inputString) {
        this.resetSystem();
        const symbols = inputString.split(' ').map(s => s.trim()).filter(s => s);

        // Проверка алфавита
        const systemAlphabet = this.getSystemAlphabet();
        const invalidSymbols = symbols.filter(s => !systemAlphabet.has(s));
        if (invalidSymbols.length > 0) {
            throw new Error(`Symbols ${invalidSymbols.join(', ')} not in system alphabet. Available: ${Array.from(systemAlphabet).join(', ')}`);
        }

        // Начальное состояние
        const initialState = {
            symbol: "START",
            states: {},
            step: 0,
            connections: []
        };

        this.automata.forEach((automaton, name) => {
            initialState.states[name] = {
                old_states: Array.from(automaton.currentStates).map(state => state.name),
                new_states: Array.from(automaton.currentStates).map(state => state.name),
                transition: false,
                automaton_type: automaton.automatonType
            };
        });

        this.history.push(initialState);

        // Обработка символов
        for (let step = 0; step < symbols.length; step++) {
            const symbol = symbols[step];
            const stepResult = {
                symbol: symbol,
                states: {},
                step: step + 1,
                connections: []
            };

            const processedStates = {};
            let atLeastOneTransition = false;

            // Обрабатываем символы в активных автоматах
            const activeAutomata = this.getActiveAutomata();
            
            activeAutomata.forEach(automaton => {
                const oldStates = Array.from(automaton.currentStates).map(state => state.name);
                const success = automaton.processSymbol(symbol);
                const newStates = Array.from(automaton.currentStates).map(state => state.name);

                processedStates[automaton.name] = {
                    old_states: oldStates,
                    new_states: newStates,
                    transition: success,
                    automaton_type: automaton.automatonType
                };

                if (success) atLeastOneTransition = true;
            });

            // Если ни один активный автомат не выполнил переход - строка отвергается
            if (!atLeastOneTransition) {
                stepResult.states = processedStates;
                this.history.push(stepResult);
                return this.history;
            }

            // Добавляем пассивные автоматы без изменений
            this.getPassiveAutomata().forEach(automaton => {
                processedStates[automaton.name] = {
                    old_states: Array.from(automaton.currentStates).map(state => state.name),
                    new_states: Array.from(automaton.currentStates).map(state => state.name),
                    transition: false,
                    automaton_type: automaton.automatonType
                };
            });

            // Применяем мгновенные переходы через связи
            let changed = true;
            let maxIterations = 10;
            let iteration = 0;

            while (changed && iteration < maxIterations) {
                changed = false;
                const connectionsActivated = [];

                this.connections.forEach(connection => {
                    if (!this.automata.has(connection.fromAutomaton) || 
                        !this.automata.has(connection.toAutomaton)) {
                        return;
                    }

                    const fromAutomaton = this.automata.get(connection.fromAutomaton);
                    const toAutomaton = this.automata.get(connection.toAutomaton);

                    let shouldActivate = false;

                    // Проверяем условия активации связи
                    if (fromAutomaton.automatonType === AutomatonType.ACTIVE) {
                        const currentStateNames = Array.from(fromAutomaton.currentStates).map(state => state.name);
                        if (currentStateNames.includes(connection.fromState)) {
                            shouldActivate = true;
                        }
                    }

                    if (connection.triggerSymbol && connection.triggerSymbol !== symbol) {
                        shouldActivate = false;
                    }

                    if (shouldActivate) {
                        const oldStates = Array.from(toAutomaton.currentStates).map(state => state.name);
                        const success = toAutomaton.processInstantTransition(connection.toState);
                        const newStates = Array.from(toAutomaton.currentStates).map(state => state.name);

                        if (success) {
                            processedStates[toAutomaton.name] = {
                                old_states: oldStates,
                                new_states: newStates,
                                transition: true,
                                automaton_type: toAutomaton.automatonType
                            };

                            connectionsActivated.push({
                                from_automaton: connection.fromAutomaton,
                                from_state: connection.fromState,
                                to_automaton: connection.toAutomaton,
                                to_state: connection.toState,
                                old_states: oldStates,
                                new_states: newStates,
                                trigger_symbol: connection.triggerSymbol
                            });
                            changed = true;
                        }
                    }
                });

                if (connectionsActivated.length > 0) {
                    stepResult.connections.push(...connectionsActivated);
                }
                iteration++;
            }

            stepResult.states = processedStates;
            this.history.push(stepResult);
        }

        return this.history;
    }

    getFinalVerdict() {
        const verdict = {
            accepted: true,
            automata_results: {},
            all_in_final: true
        };

        // Проверяем, что на каждом шаге был хотя бы один переход
        for (let i = 1; i < this.history.length; i++) {
            const step = this.history[i];
            let stepHasTransition = false;
            
            for (const [name, stateInfo] of Object.entries(step.states)) {
                const automaton = this.automata.get(name);
                if ((automaton.automatonType === AutomatonType.ACTIVE && stateInfo.transition) ||
                    (automaton.automatonType === AutomatonType.PASSIVE && stateInfo.transition)) {
                    stepHasTransition = true;
                    break;
                }
            }

            if (!stepHasTransition) {
                verdict.accepted = false;
                verdict.all_in_final = false;
                break;
            }
        }

        if (verdict.accepted) {
            let atLeastOneInFinal = false;
            let allAutomataInFinal = true;

            this.automata.forEach((automaton, name) => {
                const isFinal = automaton.isInFinalState();
                const hasFinalStates = automaton.finalStates.size > 0;

                verdict.automata_results[name] = {
                    is_final: isFinal,
                    current_states: Array.from(automaton.currentStates).map(state => state.name),
                    has_final_states: hasFinalStates,
                    automaton_type: automaton.automatonType
                };

                if (hasFinalStates && isFinal) {
                    atLeastOneInFinal = true;
                }

                if (hasFinalStates && !isFinal) {
                    allAutomataInFinal = false;
                }
            });

            verdict.accepted = atLeastOneInFinal;
            verdict.all_in_final = allAutomataInFinal;
        }

        return verdict;
    }

    toDict() {
        return {
            automata: Array.from(this.automata.values()).map(auto => auto.toDict()),
            connections: Array.from(this.connections).map(conn => ({
                from_automaton: conn.fromAutomaton,
                from_state: conn.fromState,
                to_automaton: conn.toAutomaton,
                to_state: conn.toState,
                trigger_symbol: conn.triggerSymbol
            })),
            custom_alphabet: Array.from(this.customAlphabet),
            use_custom_alphabet: this.useCustomAlphabet
        };
    }

    static fromDict(data) {
        const system = new MultiAgentSystem();
        
        // Загружаем автоматы
        const automataList = data.automata || [];
        automataList.forEach(autoData => {
            try {
                const automaton = Automaton.fromDict(autoData);
                system.automata.set(automaton.name, automaton);
            } catch (error) {
                console.error('Error loading automaton:', error);
            }
        });

        // Загружаем связи
        const connectionsList = data.connections || [];
        connectionsList.forEach(connData => {
            try {
                const connection = new SystemConnection(
                    connData.from_automaton,
                    connData.from_state,
                    connData.to_automaton,
                    connData.to_state,
                    connData.trigger_symbol
                );
                system.connections.add(connection);
            } catch (error) {
                console.error('Error loading connection:', error);
            }
        });

        // Загружаем настройки алфавита
        system.customAlphabet = new Set(data.custom_alphabet || []);
        system.useCustomAlphabet = data.use_custom_alphabet || false;
        
        system._updateSystemAlphabet();
        
        return system;
    }
}