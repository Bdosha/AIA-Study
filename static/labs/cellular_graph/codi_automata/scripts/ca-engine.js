// scripts/ca-engine.js

// --- Seedable RNG (Mulberry32) --------------------------------------------
function makeRNG(seed = Date.now()) {
    let t = seed >>> 0;
    return function rand() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export class CellularAutomata {
    /**
     * @param {number} width
     * @param {number} height
     * @param {number} states                - число состояний (для SCA обычно 2)
     * @param {'majority'|'vote'|'game-of-life'|'custom'|'ising'} ruleType
     * @param {number} noiseProbability      - η / p / β-нормированное
     * @param {number} [seed]                - необязательно: зерно ПСЧ
     */
    constructor(width, height, states, ruleType, noiseProbability, seed = Date.now()) {
        this.width = width;
        this.height = height;
        this.states = Math.max(2, states | 0);
        this.ruleType = ruleType;
        this.noiseProbability = Number(noiseProbability) || 0;

        this.rand = makeRNG(seed);

        // по умолчанию — окрестность Мура, радиус 1, тор
        this.neighborhood = 'moore';   // 'moore' | 'vonNeumann'
        this.radius = 1;
        this.torus = true;

        this.grid = this.createGrid();
        this.previousGrid = this.createGrid();

        // для отладки
        // console.log(`KA ${width}x${height} states=${this.states} rule=${ruleType} param=${this.noiseProbability} seed=${seed}`);
    }

    // --- Сетка -------------------------------------------------------------
    createGrid() {
        const a = new Array(this.height);
        for (let y = 0; y < this.height; y++) a[y] = new Array(this.width).fill(0);
        return a;
    }

    copyGrid(source, target) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) target[y][x] = source[y][x];
        }
    }

    // --- Инициализации ------------------------------------------------------
    /**
     * @param {'random'|'center'|'checkerboard'|'custom'} type
     * @param {number} density - для 'random': вероятность 1 (в бинарном случае)
     */
    initialize(type = 'random', density = 0.5) {
        switch (type) {
            case 'random':       this.initializeRandom(density); break;
            case 'center':       this.initializeCenter(); break;
            case 'checkerboard': this.initializeCheckerboard(); break;
            case 'custom':       /* оставляем как есть */ break;
            default:             this.initializeRandom(0.5);
        }
        this.copyGrid(this.grid, this.previousGrid);
    }

    // Бинарный случай: Бернулли(p=density). Мульти: 0 преобладает, остальные равновероятно.
    initializeRandom(density = 0.5) {
        const bin = (this.states === 2);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (bin) {
                    this.grid[y][x] = (this.rand() < density) ? 1 : 0;
                } else {
                    if (this.rand() < density) {
                        this.grid[y][x] = 1 + Math.floor(this.rand() * (this.states - 1));
                    } else {
                        this.grid[y][x] = 0;
                    }
                }
            }
        }
    }

    initializeCenter() {
        const cx = (this.width / 2) | 0, cy = (this.height / 2) | 0;
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) this.grid[y][x] = 0;
        this.grid[cy][cx] = (this.states === 2) ? 1 : 1;
    }

    initializeCheckerboard() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = ((x + y) & 1) ? 1 : 0;
            }
        }
    }

    // --- Шаг симуляции ------------------------------------------------------
    step() {
        this.copyGrid(this.grid, this.previousGrid);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) this.applyRule(x, y);
        }
    }

    applyRule(x, y) {
        const current = this.previousGrid[y][x];
        let next = current;

        switch (this.ruleType) {
            case 'majority':
                next = this.majorityRule(x, y);
                break;

            case 'vote':
                next = this.voteRule(x, y);
                break;

            case 'game-of-life':
                next = this.gameOfLifeRule(x, y);
                break;

            case 'ising':
                // работает для бинарного случая (0/1)
                next = this.isingLikeRule(x, y);
                break;

            case 'custom':
                next = this.customRule(x, y);
                break;

            default:
                next = current;
        }

        this.grid[y][x] = next;
    }

    // --- Правила ------------------------------------------------------------

    // Majority + Noise (η): берём наиболее частое состояние у соседей; при ничьей — оставляем текущее.
    // Стохастика встроена: с вероятностью η инвертируем (бинарный случай) либо выбираем случайное «не maj» (мульти).
    majorityRule(x, y) {
        const neigh = this.getNeighborhood(x, y);
        const counts = new Array(this.states).fill(0);
        for (const [nx, ny] of neigh) counts[this.previousGrid[ny][nx]]++;

        // найти максимум
        let max = -1, maj = this.previousGrid[y][x];
        for (let s = 0; s < this.states; s++) {
            if (counts[s] > max) { max = counts[s]; maj = s; }
        }

        const z = neigh.length;
        let next = maj;
        if (this.states === 2) {
            // для бинарного — явное большинство, иначе оставляем текущее
            if (!(max > z / 2)) next = this.previousGrid[y][x];
            const eta = this.noiseProbability;
            if (eta > 0 && this.rand() < eta) next = 1 - next;
        } else {
            // мульти: берём maj; с η — случайное не maj
            const eta = this.noiseProbability;
            if (eta > 0 && this.rand() < eta) {
                let r;
                do { r = Math.floor(this.rand() * this.states); } while (r === maj);
                next = r;
            } else {
                next = maj;
            }
        }
        return next;
    }

    // Voter (p): копируем случайного соседа; в бинарном случае — с вероятностью p инвертируем полученное.
    voteRule(x, y) {
        const neigh = this.getNeighborhood(x, y);
        const k = (this.rand() * neigh.length) | 0;
        const [nx, ny] = neigh[k];
        let s = this.previousGrid[ny][nx];

        if (this.states === 2) {
            const p = this.noiseProbability;
            if (p > 0 && this.rand() < p) s = 1 - s;
        }
        return s;
    }

    // Game of Life + Noise: классическое правило, затем с вероятностью noiseProbability инвертируем результат.
    gameOfLifeRule(x, y) {
        // трактуем все >0 как "живые"
        const alive = (v) => (v > 0 ? 1 : 0);
        const neigh = this.getNeighborhood(x, y);
        let sum = 0;
        for (const [nx, ny] of neigh) sum += alive(this.previousGrid[ny][nx]);

        const cur = alive(this.previousGrid[y][x]);
        let next = cur;

        if (cur === 1) {
            next = (sum === 2 || sum === 3) ? 1 : 0;
        } else {
            next = (sum === 3) ? 1 : 0;
        }

        // шум как шанс инверсии результата
        const q = this.noiseProbability;
        if (q > 0 && this.rand() < q) next = 1 - next;

        return next;
    }

    // Ising-подобное (β): p(1) = σ(β * h), h = (2*sum1 - z)/z
    isingLikeRule(x, y) {
        const neigh = this.getNeighborhood(x, y);
        const z = neigh.length;
        let sum1 = 0;
        for (const [nx, ny] of neigh) sum1 += (this.previousGrid[ny][nx] > 0 ? 1 : 0);

        const h = (2 * sum1 - z) / z;
        const betaMax = 8.0;                         // масштаб слайдера β: 0..1 → 0..8
        const beta = (this.noiseProbability || 0) * betaMax;
        const p1 = 1 / (1 + Math.exp(-beta * h));
        return (this.rand() < p1) ? 1 : 0;
    }

    // Пользовательское правило — по умолчанию «ничего не делаем»
    // Пользовательское правило: с вероятностью p = noiseProbability
    // переходим в (s+1) mod states, иначе оставляем как есть.
    customRule(x, y) {
        const s = this.previousGrid[y][x];
        const p = this.noiseProbability || 0;
        if (p > 0 && this.rand() < p) {
            return (s + 1) % this.states;
        }
        return s;
    }


    // --- Окрестности --------------------------------------------------------
    getNeighborhood(x, y) {
        return (this.neighborhood === 'vonNeumann')
            ? this.getVonNeumannNeighborhood(x, y, this.radius)
            : this.getMooreNeighborhood(x, y, this.radius);
    }

    getMooreNeighborhood(x, y, radius = 1) {
        const neigh = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = x + dx, ny = y + dy;
                if (this.torus) {
                    if (nx < 0) nx += this.width;
                    if (ny < 0) ny += this.height;
                    if (nx >= this.width) nx -= this.width;
                    if (ny >= this.height) ny -= this.height;
                    neigh.push([nx, ny]);
                } else {
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) neigh.push([nx, ny]);
                }
            }
        }
        return neigh;
    }

    getVonNeumannNeighborhood(x, y, radius = 1) {
        const neigh = [];
        for (let r = 1; r <= radius; r++) {
            const dirs = [[0,-r],[r,0],[0,r],[-r,0]];
            for (const [dx, dy] of dirs) {
                let nx = x + dx, ny = y + dy;
                if (this.torus) {
                    if (nx < 0) nx += this.width;
                    if (ny < 0) ny += this.height;
                    if (nx >= this.width) nx -= this.width;
                    if (ny >= this.height) ny -= this.height;
                    neigh.push([nx, ny]);
                } else if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    neigh.push([nx, ny]);
                }
            }
        }
        return neigh;
    }

    // --- Статистика/утилиты -------------------------------------------------
    getGridStatistics() {
        const stateCount = new Array(this.states).fill(0);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) stateCount[this.grid[y][x]]++;
        }
        return { stateCount, totalCells: this.width * this.height };
    }

    setCell(x, y, state) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = Math.max(0, Math.min(this.states - 1, state | 0));
        }
    }

    getCell(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) return this.grid[y][x];
        return -1;
    }
}
