class StateVectorDisplay {
    constructor(simulator) {
        this.simulator = simulator;
        this.container = document.getElementById('state-vector-display');
    }

    render() {
        const superposition = this.simulator.stateVector.getCurrentStates();
        const probabilities = this.calculateProbabilities(superposition);
        
        this.container.innerHTML = `
            <div class="state-vector">
                <h3>Вектор состояния (суперпозиция)</h3>
                ${superposition.map(({state, amplitude}) => `
                    <div class="state-component" data-state="${state}" data-amplitude="${amplitude}">
                        <span class="amplitude">${this.formatAmplitude(amplitude)}</span>
                        |${state}⟩
                        <span class="probability">${(Math.abs(amplitude)**2 * 100).toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
            <div class="probability-bars">
                ${Object.entries(probabilities).map(([state, prob]) => `
                    <div class="prob-bar" style="width: ${prob * 100}%" title="${state}: ${(prob*100).toFixed(1)}%">
                        ${state}
                    </div>
                `).join('')}
            </div>
        `;
    }
}