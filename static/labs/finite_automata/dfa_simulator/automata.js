// automata.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
class StateType {
    static NORMAL = "normal";
    static START = "start";
    static FINAL = "final";
    static CURRENT = "current";
    static START_FINAL = "start_final";
    static CURRENT_START = "current_start";
    static CURRENT_FINAL = "current_final";
}

class AutomatonType {
    static ACTIVE = "active";
    static PASSIVE = "passive";
}

class State {
    constructor(name, automatonName, type = StateType.NORMAL) {
        this.name = name;
        this.automatonName = automatonName;
        this.type = type;
    }

    getFullName() {
        return `${this.automatonName}.${this.name}`;
    }

    equals(other) {
        return other instanceof State && 
               this.name === other.name && 
               this.automatonName === other.automatonName;
    }

    hashCode() {
        return `${this.name}-${this.automatonName}`;
    }
}

class Transition {
    constructor(fromState, toState, symbol) {
        this.fromState = fromState;
        this.toState = toState;
        this.symbol = symbol;
    }

    equals(other) {
        return other instanceof Transition &&
               this.fromState.equals(other.fromState) &&
               this.toState.equals(other.toState) &&
               this.symbol === other.symbol;
    }

    hashCode() {
        return `${this.fromState.hashCode()}-${this.toState.hashCode()}-${this.symbol}`;
    }
}

class Automaton {
    constructor(name, states, transitions, startState, finalStates, currentStates, automatonType = AutomatonType.ACTIVE) {
        this.name = name;
        this.states = new Set(states);
        this.transitions = new Set(transitions);
        this.startState = startState;
        this.finalStates = new Set(finalStates);
        this.currentStates = new Set(currentStates);
        this.automatonType = automatonType;

        if (this.currentStates.size === 0) {
            this.currentStates.add(this.startState);
        }

        this._updateStateTypes();
    }

    reset() {
        this.currentStates = new Set([this.startState]);
        this._updateStateTypes();
    }

    processSymbol(symbol) {
        if (this.automatonType === AutomatonType.PASSIVE) {
            return false;
        }

        const newStates = new Set();
        let transitionMade = false;

        this.currentStates.forEach(currentState => {
            this.transitions.forEach(transition => {
                if (transition.fromState.equals(currentState) && 
                    transition.symbol === symbol) {
                    newStates.add(transition.toState);
                    transitionMade = true;
                }
            });
        });

        this.currentStates = newStates;
        this._updateStateTypes();
        
        return transitionMade;
    }

    processInstantTransition(targetStateName) {
        const targetState = this.getStateByName(targetStateName);
        if (targetState && !this.currentStates.has(targetState)) {
            this.currentStates = new Set([targetState]);
            this._updateStateTypes();
            return true;
        }
        return false;
    }

    isInFinalState() {
        return Array.from(this.currentStates).some(state => 
            Array.from(this.finalStates).some(finalState => finalState.equals(state))
        );
    }

    _updateStateTypes() {
        this.states.forEach(state => {
            const isCurrent = Array.from(this.currentStates).some(s => s.equals(state));
            const isStart = state.equals(this.startState);
            const isFinal = Array.from(this.finalStates).some(s => s.equals(state));

            if (isCurrent && isStart && isFinal) {
                state.type = StateType.CURRENT_START;
            } else if (isCurrent && isStart) {
                state.type = StateType.CURRENT_START;
            } else if (isCurrent && isFinal) {
                state.type = StateType.CURRENT_FINAL;
            } else if (isCurrent) {
                state.type = StateType.CURRENT;
            } else if (isStart && isFinal) {
                state.type = StateType.START_FINAL;
            } else if (isStart) {
                state.type = StateType.START;
            } else if (isFinal) {
                state.type = StateType.FINAL;
            } else {
                state.type = StateType.NORMAL;
            }
        });
    }

    getStateByName(stateName) {
        return Array.from(this.states).find(state => state.name === stateName);
    }

    getAlphabet() {
        const alphabet = new Set();
        this.transitions.forEach(transition => {
            alphabet.add(transition.symbol);
        });
        return alphabet;
    }

    toDict() {
        return {
            name: this.name,
            states: Array.from(this.states).map(state => state.name),
            transitions: Array.from(this.transitions).map(trans => ({
                from_state: trans.fromState.name,
                to_state: trans.toState.name,
                symbol: trans.symbol
            })),
            start_state: this.startState.name,
            final_states: Array.from(this.finalStates).map(state => state.name),
            current_states: Array.from(this.currentStates).map(state => state.name),
            automaton_type: this.automatonType
        };
    }

    static fromDict(data) {
        try {
            const name = data.name || 'Unnamed';
            const statesList = data.states || [];
            const transitionsList = data.transitions || [];
            const startStateName = data.start_state || '';
            const finalStatesList = data.final_states || [];
            const automatonType = data.automaton_type || AutomatonType.ACTIVE;
            const currentStatesList = data.current_states || [data.start_state || ''];

            const statesDict = {};
            statesList.forEach(stateName => {
                const stateNameStr = String(stateName);
                statesDict[stateNameStr] = new State(stateNameStr, name);
            });

            if (Object.keys(statesDict).length === 0) {
                statesDict['q0'] = new State('q0', name);
            }

            let startStateNameStr = startStateName ? String(startStateName) : 'q0';
            if (!statesDict[startStateNameStr]) {
                startStateNameStr = Object.keys(statesDict)[0];
            }

            const transitions = new Set();
            transitionsList.forEach(transData => {
                const fromName = String(transData.from_state);
                const toName = String(transData.to_state);
                const symbol = String(transData.symbol);

                if (!fromName || !toName || !symbol) return;

                if (!statesDict[fromName]) {
                    statesDict[fromName] = new State(fromName, name);
                }
                if (!statesDict[toName]) {
                    statesDict[toName] = new State(toName, name);
                }

                const transition = new Transition(
                    statesDict[fromName],
                    statesDict[toName],
                    symbol
                );
                transitions.add(transition);
            });

            const finalStates = new Set();
            finalStatesList.forEach(stateName => {
                const stateNameStr = String(stateName);
                if (statesDict[stateNameStr]) {
                    finalStates.add(statesDict[stateNameStr]);
                }
            });

            const currentStates = new Set();
            currentStatesList.forEach(stateName => {
                const stateNameStr = String(stateName);
                if (statesDict[stateNameStr]) {
                    currentStates.add(statesDict[stateNameStr]);
                }
            });

            if (currentStates.size === 0) {
                currentStates.add(statesDict[startStateNameStr]);
            }

            return new Automaton(
                name,
                new Set(Object.values(statesDict)),
                transitions,
                statesDict[startStateNameStr],
                finalStates,
                currentStates,
                automatonType
            );
        } catch (error) {
            console.error('Error creating automaton from dict:', error);
            const fallbackState = new State('q0', 'Fallback');
            return new Automaton(
                'Fallback',
                new Set([fallbackState]),
                new Set(),
                fallbackState,
                new Set(),
                new Set([fallbackState]),
                AutomatonType.ACTIVE
            );
        }
    }
}