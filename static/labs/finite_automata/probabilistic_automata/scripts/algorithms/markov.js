/**
 * markov.js — анализ марковости (устойчив к входам)
 *
 * Поддерживает вход:
 *  - automaton (объект, содержащий transitionMatrices / transitions / getTransitionMatrix / transitionMatrices.getMatrix)
 *  - TransitionMatrixCollection (имеет .matrices или .getMatrix(symbol))
 *  - single probability matrix: plain object {from: {to: prob}} или array of arrays
 *
 * Логика:
 *  - Если передан automaton / collection: проверяем стохастичность каждой матрицы по символам.
 *  - Если передан plain probability matrix: проверяем строковую нормировку.
 */
class MarkovAnalyzer {
    static analyze(input) {
        console.log('🔍 [MarkovAnalyzer] analyze called with:', input);

        // 1) Если это "автомат" или коллекция матриц — попробуем получить per-symbol матрицы
        const perSymbolMatrices = MarkovAnalyzer._extractPerSymbolMatrices(input);

        if (perSymbolMatrices && Object.keys(perSymbolMatrices).length > 0) {
            // проверяем каждую матрицу по символу
            for (const symbol of Object.keys(perSymbolMatrices)) {
                const mat = perSymbolMatrices[symbol];
                const ok = MarkovAnalyzer._isMatrixStochastic(mat);
                console.log(`🔎 [MarkovAnalyzer] symbol='${symbol}' stochastic=${ok}`);
                if (!ok) {
                    return { isMarkov: false, detail: { reason: 'symbol_matrix_not_stochastic', symbol } };
                }
            }
            // все матрицы по символам — стохастические
            return { isMarkov: true };
        }

        // 2) Если не удалось извлечь per-symbol matrices, попробуем анализировать input как single probability matrix
        if (MarkovAnalyzer._isPlainMatrixLike(input)) {
            const ok = MarkovAnalyzer._isMatrixStochastic(input);
            return { isMarkov: !!ok };
        }

        // ничего подходящего не найдено — не марковская (или данные отсутствуют)
        return { isMarkov: false, detail: { reason: 'no_matrix' } };
    }

    // Попытка извлечь набор матриц по символам
    static _extractPerSymbolMatrices(input) {
        if (!input) return null;

        // Если автомата предоставляет transitionMatrices / transitionCollection
        // чаще всего в твоём проекте это input.transitionMatrices или input.transitions или input.transitionCollection
        // Попробуем несколько вариантов безопасно.

        // Если это коллекция матриц с полем matrices (object of symbol->matrix)
        if (input.matrices && typeof input.matrices === 'object') {
            // матрица может хранить transitions внутри .transitions
            const out = {};
            for (const symbol of Object.keys(input.matrices)) {
                const m = input.matrices[symbol];
                out[symbol] = m && (m.transitions || m) ;
            }
            return out;
        }

        // Если input имеет свойство transitionMatrices (как в твоём автомате)
        if (input.transitionMatrices && typeof input.transitionMatrices === 'object') {
            const col = input.transitionMatrices;
            if (col.matrices && typeof col.matrices === 'object') {
                const out = {};
                for (const symbol of Object.keys(col.matrices)) {
                    const m = col.matrices[symbol];
                    out[symbol] = m && (m.transitions || m);
                }
                return out;
            }
            // если коллекция предоставляет getMatrix
            if (typeof col.getMatrix === 'function') {
                // возьмём все символы (если есть)
                if (col.symbols && Array.isArray(col.symbols)) {
                    const out = {};
                    for (const s of col.symbols) {
                        const m = col.getMatrix(s);
                        out[s] = m && (m.transitions || m);
                    }
                    return out;
                }
                // как fallback: попробуем перечислить Object.keys(col)
                const out = {};
                for (const k of Object.keys(col)) {
                    if (k === 'getMatrix' || k === 'matrices' || k === 'symbols') continue;
                    // возможно тут лежат матрицы по ключам
                    const m = col[k];
                    if (m && typeof m === 'object') out[k] = m.transitions || m;
                }
                if (Object.keys(out).length) return out;
            }
        }

        // Если input — сам автомат и хранит transitions (Map/obj)
        if (input.transitions) {
            // transitions может быть Map или plain object
            const transitions = input.transitions;
            // если это plain object где ключ — symbol -> matrix, или from->to mapping — не трогаем
            // попробуем detect: если transitions has 'matrices'
            if (transitions.matrices && typeof transitions.matrices === 'object') {
                const out = {};
                for (const s of Object.keys(transitions.matrices)) {
                    const m = transitions.matrices[s];
                    out[s] = m && (m.transitions || m);
                }
                return out;
            }
        }

        // Ничего не найдено — null
        return null;
    }

    // проверяем, похож ли input на plain matrix object {from:{to:prob}}
    static _isPlainMatrixLike(obj) {
        if (!obj || typeof obj !== 'object') return false;
        // массив массивов
        if (Array.isArray(obj)) {
            return Array.isArray(obj[0]) || obj.length > 0;
        }
        // проверим, есть ли внутри объект-первый уровень -> объект
        for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object') return true;
        }
        return false;
    }

    // Проверка, что матрица стохастическая (для plain object или array)
    static _isMatrixStochastic(matrix) {
        if (!matrix) return false;

        // если array of arrays
        if (Array.isArray(matrix)) {
            for (let i = 0; i < matrix.length; i++) {
                const row = matrix[i];
                if (!Array.isArray(row)) return false;
                const sum = row.reduce((s, v) => s + (Number(v) || 0), 0);
                if (Math.abs(sum - 1) > 1e-6) return false;
            }
            return true;
        }

        // plain object {from: {to: prob}}
        if (typeof matrix === 'object') {
            for (const from of Object.keys(matrix)) {
                const row = matrix[from] || {};
                const sum = Object.values(row).reduce((s, v) => s + (Number(v) || 0), 0);
                if (Math.abs(sum - 1) > 1e-6) return false;
            }
            return true;
        }

        return false;
    }
}

// экспорт в глобальную область
if (typeof window !== 'undefined') window.MarkovAnalyzer = MarkovAnalyzer;
if (typeof module !== 'undefined' && module.exports) module.exports = { MarkovAnalyzer };
