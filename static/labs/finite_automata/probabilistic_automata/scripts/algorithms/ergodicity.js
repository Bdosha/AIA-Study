/**
 * @file ergodicity.js — анализ эргодичности, неприводимости и апериодичности
 * @module algorithms/ergodicity
 */

class ErgodicityAnalyzer {
    /**
     * Анализирует свойства автомата по матрице переходов
     * @param {Object} matrix - объект {from: {to: prob, ...}}
     * @returns {{ irreducible: boolean, aperiodicity: boolean, isErgodic: boolean }}
     */
    static analyze(matrix) {
        console.log("🔍 [ErgodicityAnalyzer] анализируем матрицу:", matrix);

        if (!matrix || Object.keys(matrix).length === 0) {
            return { irreducible: false, aperiodicity: false, isErgodic: false };
        }

        const states = Object.keys(matrix);
        const n = states.length;

        // --- Строим матрицу достижимости (0/1) ---
        const reach = {};
        for (const i of states) {
            reach[i] = {};
            for (const j of states) {
                reach[i][j] = matrix[i]?.[j] > 0 ? 1 : 0;
            }
        }

        // --- Проверяем неприводимость (сильную связность) ---
        const irreducible = this.#isStronglyConnected(reach, states);

        // --- Проверяем апериодичность ---
        const aperiodicity = this.#isAperiodic(reach, states);

        // --- Эргодичность ---
        const isErgodic = irreducible && aperiodicity;

        console.log(`✅ [ErgodicityAnalyzer] неприводимость=${irreducible}, апериодичность=${aperiodicity}, эргодичность=${isErgodic}`);
        return { irreducible, aperiodicity, isErgodic };
    }

    /**
     * Проверка сильной связности графа (неприводимость)
     */
    static #isStronglyConnected(reach, states) {
        const visited = new Set();

        function dfs(state) {
            visited.add(state);
            for (const next in reach[state]) {
                if (reach[state][next] && !visited.has(next)) {
                    dfs(next);
                }
            }
        }

        dfs(states[0]);
        if (visited.size !== states.length) return false;

        // Проверим обратную достижимость (граф транспонирован)
        const transposed = {};
        for (const i of states) {
            transposed[i] = {};
            for (const j of states) {
                transposed[i][j] = reach[j]?.[i] ?? 0;
            }
        }

        const visitedBack = new Set();
        function dfsBack(state) {
            visitedBack.add(state);
            for (const next in transposed[state]) {
                if (transposed[state][next] && !visitedBack.has(next)) {
                    dfsBack(next);
                }
            }
        }

        dfsBack(states[0]);
        return visitedBack.size === states.length;
    }

    /**
     * Проверка апериодичности (наибольший общий делитель длин циклов == 1)
     */
    static #isAperiodic(reach, states) {
        // Простая эвристика: если есть самопетля, то апериодичность выполняется
        for (const s of states) {
            if (reach[s][s]) return true;
        }

        // BFS — находим минимальные циклы и вычисляем НОД
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        let period = 0;

        for (const start of states) {
            const queue = [{ state: start, dist: 0 }];
            const visited = new Set([start]);

            while (queue.length > 0) {
                const { state, dist } = queue.shift();
                for (const next in reach[state]) {
                    if (!reach[state][next]) continue;
                    if (next === start && dist + 1 > 0) {
                        period = gcd(period, dist + 1);
                    } else if (!visited.has(next)) {
                        visited.add(next);
                        queue.push({ state: next, dist: dist + 1 });
                    }
                }
            }
        }

        return period === 1 || period === 0;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErgodicityAnalyzer };
} else {
    window.ErgodicityAnalyzer = ErgodicityAnalyzer;
}
