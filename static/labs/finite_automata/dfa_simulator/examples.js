// examples.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
function createSensorLampSystem() {
    const system = new MultiAgentSystem();

    const sensorStates = [
        new State("no_person", "Датчик"),
        new State("person", "Датчик")
    ];

    const sensorTransitions = [
        new Transition(sensorStates[0], sensorStates[1], "detect"),
        new Transition(sensorStates[1], sensorStates[0], "leave")
    ];

    const sensor = new Automaton(
        "Датчик",
        new Set(sensorStates),
        new Set(sensorTransitions),
        sensorStates[0],
        new Set(),
        new Set([sensorStates[0]]),
        AutomatonType.ACTIVE
    );

    const lampStates = [
        new State("off", "Лампа"),
        new State("on", "Лампа")
    ];

    const lamp = new Automaton(
        "Лампа",
        new Set(lampStates),
        new Set(),
        lampStates[0],
        new Set(),
        new Set([lampStates[0]]),
        AutomatonType.PASSIVE
    );

    system.addAutomaton(sensor);
    system.addAutomaton(lamp);

    system.addConnection("Датчик", "person", "Лампа", "on");
    system.addConnection("Датчик", "no_person", "Лампа", "off");

    return system;
}

function createNFAExample() {
    const system = new MultiAgentSystem();

    const q0 = new State("q0", "NFA");
    const q1 = new State("q1", "NFA");
    const q2 = new State("q2", "NFA");
    const q3 = new State("q3", "NFA");

    const nfaStates = [q0, q1, q2, q3];
    const nfaTransitions = [
        new Transition(q0, q1, "a"),
        new Transition(q0, q2, "a"),
        new Transition(q1, q3, "b"),
        new Transition(q2, q3, "c")
    ];

    const nfa = new Automaton(
        "NFA",
        new Set(nfaStates),
        new Set(nfaTransitions),
        q0,
        new Set([q3]),
        new Set([q0]),
        AutomatonType.ACTIVE
    );

    system.addAutomaton(nfa);

    return system;
}