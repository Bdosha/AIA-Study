// core/QuantumState.js
class QuantumState {
    constructor() {
        this.superposition = [{
            state: 'q0',
            amplitude: 1.0,
            headPosition: 0
        }];
        this.history = [];
    }

    // Получить текущую суперпозицию
    getSuperposition() {
        return this.superposition;
    }

    // Установить суперпозицию
    setSuperposition(newSuperposition) {
        // Нормализуем амплитуды
        const totalProbability = newSuperposition.reduce((sum, branch) => 
            sum + Math.abs(branch.amplitude) ** 2, 0
        );
        
        if (Math.abs(totalProbability - 1.0) > 0.01) {
            const scale = 1 / Math.sqrt(totalProbability);
            newSuperposition.forEach(branch => {
                branch.amplitude *= scale;
            });
        }
        
        this.history.push([...this.superposition]);
        this.superposition = newSuperposition;
    }

    // Создать суперпозицию (для задания 1)
    createSuperposition() {
        this.superposition = [
            { state: 'q0', amplitude: 0.707, headPosition: 0 },
            { state: 'q1', amplitude: 0.707, headPosition: 0 }
        ];
    }

    // Измерение - коллапс волновой функции
    measure() {
        if (this.superposition.length <= 1) {
            return this.superposition[0];
        }

        const probabilities = this.superposition.map(branch => 
            Math.abs(branch.amplitude) ** 2
        );
        
        let random = Math.random();
        let selectedIndex = 0;
        
        for (let i = 0; i < probabilities.length; i++) {
            random -= probabilities[i];
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }
        
        const result = this.superposition[selectedIndex];
        // Коллапс в одно состояние
        this.superposition = [{
            state: result.state,
            amplitude: 1.0,
            headPosition: result.headPosition
        }];
        
        return result;
    }

    // Получить вектор состояния для отображения
    getStateVector() {
        if (this.superposition.length === 1) {
            return `|ψ⟩ = 1.000|${this.superposition[0].state}⟩`;
        }
        
        let vector = '|ψ⟩ = ';
        this.superposition.forEach((branch, index) => {
            const amplitude = branch.amplitude.toFixed(3);
            if (index > 0) vector += ' + ';
            vector += `${amplitude}|${branch.state}⟩`;
        });
        
        return vector;
    }

    // Получить вероятности для отображения
    getProbabilities() {
        return this.superposition.map(branch => ({
            state: branch.state,
            percentage: (Math.abs(branch.amplitude) ** 2 * 100).toFixed(2)
        }));
    }

    // Сброс состояния
    reset() {
        this.superposition = [{
            state: 'q0',
            amplitude: 1.0,
            headPosition: 0
        }];
        this.history = [];
    }
}


