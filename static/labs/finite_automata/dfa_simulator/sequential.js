// sequential.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
function createSequentialSystem() {
    const system = new MultiAgentSystem();

    const q0 = new State("q0", "Автомат1");
    const q1 = new State("q1", "Автомат1");
    const q2 = new State("q2", "Автомат1");

    const automaton1States = [q0, q1, q2];
    const automaton1Transitions = [
        new Transition(q0, q1, "a"),
        new Transition(q1, q2, "b")
    ];

    const automaton1 = new Automaton(
        "Автомат1",
        new Set(automaton1States),
        new Set(automaton1Transitions),
        q0,
        new Set([q2]),
        new Set([q0]),
        AutomatonType.ACTIVE
    );

    const p0 = new State("p0", "Автомат2");
    const p1 = new State("p1", "Автомат2");
    const p2 = new State("p2", "Автомат2");

    const automaton2States = [p0, p1, p2];
    const automaton2Transitions = [
        new Transition(p0, p1, "b"),
        new Transition(p1, p2, "c")
    ];

    const automaton2 = new Automaton(
        "Автомат2",
        new Set(automaton2States),
        new Set(automaton2Transitions),
        p0,
        new Set([p2]),
        new Set([p0]),
        AutomatonType.ACTIVE
    );

    system.addAutomaton(automaton1);
    system.addAutomaton(automaton2);
    system.addConnection("Автомат1", "q2", "Автомат2", "p1");

    return system;
}