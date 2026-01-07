class CellularAutomaton {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = this.createEmptyGrid();
        this.nextGrid = this.createEmptyGrid();
        this.birthRules = [3]; // По умолчанию Conway's Life
        this.survivalRules = [2, 3];
        this.generation = 0;
        this.isRunning = false;
        this.speed = 5;
        this.lastUpdate = 0;
    }

    createEmptyGrid() {
        return Array(this.height).fill().map(() => Array(this.width).fill(0));
    }

    setRules(birth, survival) {
        this.birthRules = birth;
        this.survivalRules = survival;
    }

    getNeighborCount(x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                // Тороидальные границы
                const nx = (x + dx + this.width) % this.width;
                const ny = (y + dy + this.height) % this.height;
                count += this.grid[ny][nx];
            }
        }
        return count;
    }

    step() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const neighbors = this.getNeighborCount(x, y);
                const isAlive = this.grid[y][x] === 1;

                if (isAlive) {
                    this.nextGrid[y][x] = this.survivalRules.includes(neighbors) ? 1 : 0;
                } else {
                    this.nextGrid[y][x] = this.birthRules.includes(neighbors) ? 1 : 0;
                }
            }
        }

        // Копируем nextGrid в grid
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = this.nextGrid[y][x];
            }
        }

        this.generation++;
    }

    setCell(x, y, state) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = state;
        }
    }

    getCell(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.grid[y][x];
        }
        return 0;
    }

    clear() {
        this.grid = this.createEmptyGrid();
        this.generation = 0;
    }

    randomFill(density) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = Math.random() < density ? 1 : 0;
            }
        }
        this.generation = 0;
    }

    getAliveCells() {
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                count += this.grid[y][x];
            }
        }
        return count;
    }

    resize(width, height) {
        const oldGrid = this.grid;
        this.width = width;
        this.height = height;
        this.grid = this.createEmptyGrid();
        this.nextGrid = this.createEmptyGrid();

        // Копируем старую сетку в новую (центрируем)
        const offsetX = Math.floor((width - oldGrid[0].length) / 2);
        const offsetY = Math.floor((height - oldGrid.length) / 2);

        for (let y = 0; y < oldGrid.length && y + offsetY < height; y++) {
            for (let x = 0; x < oldGrid[y].length && x + offsetX < width; x++) {
                if (y + offsetY >= 0 && x + offsetX >= 0) {
                    this.grid[y + offsetY][x + offsetX] = oldGrid[y][x];
                }
            }
        }
    }

    placePattern(pattern, startX, startY) {
        for (let y = 0; y < pattern.length; y++) {
            for (let x = 0; x < pattern[y].length; x++) {
                const targetX = startX + x;
                const targetY = startY + y;
                if (targetX >= 0 && targetX < this.width && targetY >= 0 && targetY < this.height) {
                    this.grid[targetY][targetX] = pattern[y][x];
                }
            }
        }
    }
}

class GameRenderer {
    constructor(canvas, automaton) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.automaton = automaton;
        this.updateCanvasSize();
    }

    updateCanvasSize() {
        // Устанавливаем размер canvas равным размеру сетки с фиксированным размером клетки
        this.cellSize = Math.max(4, Math.min(12, 600 / Math.max(this.automaton.width, this.automaton.height)));

        this.canvas.width = this.automaton.width * this.cellSize;
        this.canvas.height = this.automaton.height * this.cellSize;

        // Ограничиваем максимальный размер canvas
        const maxSize = 600;
        if (this.canvas.width > maxSize || this.canvas.height > maxSize) {
            const scale = maxSize / Math.max(this.canvas.width, this.canvas.height);
            this.canvas.width *= scale;
            this.canvas.height *= scale;
            this.cellSize *= scale;
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем фон
        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-surface').trim();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем сетку
        this.ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-border').trim();
        this.ctx.lineWidth = 0.5;

        // Вертикальные линии
        for (let x = 0; x <= this.automaton.width; x++) {
            const posX = x * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(posX, 0);
            this.ctx.lineTo(posX, this.automaton.height * this.cellSize);
            this.ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = 0; y <= this.automaton.height; y++) {
            const posY = y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, posY);
            this.ctx.lineTo(this.automaton.width * this.cellSize, posY);
            this.ctx.stroke();
        }

        // Рисуем живые клетки
        this.ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-primary').trim();

        for (let y = 0; y < this.automaton.height; y++) {
            for (let x = 0; x < this.automaton.width; x++) {
                if (this.automaton.getCell(x, y)) {
                    this.ctx.fillRect(
                        x * this.cellSize + 1,
                        y * this.cellSize + 1,
                        this.cellSize - 2,
                        this.cellSize - 2
                    );
                }
            }
        }
    }

    getGridPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Учитываем масштабирование canvas
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = Math.floor((canvasX * scaleX) / this.cellSize);
        const y = Math.floor((canvasY * scaleY) / this.cellSize);

        return { x, y };
    }
}

// Данные правил и паттернов
const RULES = [
    {"name": "Conway's Life", "rule": "B3/S23", "birth": [3], "survival": [2,3], "description": "Классическая игра жизни Конвея"},
    {"name": "Day and Night", "rule": "B3678/S34678", "birth": [3,6,7,8], "survival": [3,4,6,7,8], "description": "Симметричный автомат"},
    {"name": "HighLife", "rule": "B36/S23", "birth": [3,6], "survival": [2,3], "description": "Содержит репликаторы"},
    {"name": "Seeds", "rule": "B2/S", "birth": [2], "survival": [], "description": "Взрывные паттерны"},
    {"name": "Diamoeba", "rule": "B35678/S5678", "birth": [3,5,6,7,8], "survival": [5,6,7,8], "description": "Алмазные структуры"},
    {"name": "Maze", "rule": "B3/S12345", "birth": [3], "survival": [1,2,3,4,5], "description": "Лабиринты"},
    {"name": "2x2", "rule": "B36/S125", "birth": [3,6], "survival": [1,2,5], "description": "Блочная вселенная"},
    {"name": "Amoeba", "rule": "B357/S1358", "birth": [3,5,7], "survival": [1,3,5,8], "description": "Амебоподобные области"},
    {"name": "Assimilation", "rule": "B345/S4567", "birth": [3,4,5], "survival": [4,5,6,7], "description": "Стабильные структуры"},
    {"name": "Life without Death", "rule": "B3/S012345678", "birth": [3], "survival": [0,1,2,3,4,5,6,7,8], "description": "Только рождение"}
];

const PATTERNS = [
    {"name": "Glider", "pattern": [[0,1,0],[0,0,1],[1,1,1]], "description": "Диагональный космический корабль"},
    {"name": "Blinker", "pattern": [[1,1,1]], "description": "Осциллятор периода 2"},
    {"name": "Block", "pattern": [[1,1],[1,1]], "description": "Неподвижная структура"},
    {"name": "Toad", "pattern": [[0,1,1,1],[1,1,1,0]], "description": "Осциллятор периода 2"},
    {"name": "Beacon", "pattern": [[1,1,0,0],[1,1,0,0],[0,0,1,1],[0,0,1,1]], "description": "Осциллятор периода 2"},
    {"name": "Beehive", "pattern": [[0,1,1,0],[1,0,0,1],[0,1,1,0]], "description": "Стабильная структура"},
    {"name": "Loaf", "pattern": [[0,1,1,0],[1,0,0,1],[0,1,0,1],[0,0,1,0]], "description": "Стабильная структура"},
    {"name": "Pulsar", "pattern": [[0,0,1,1,1,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,1,1,1,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,1,1,1,0,0],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,1,1,1,0,0]], "description": "Осциллятор периода 3"}
];

// Основной класс приложения
class GameOfLifeApp {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.automaton = new CellularAutomaton(50, 50);
        this.renderer = new GameRenderer(this.canvas, this.automaton);
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.selectedPattern = null;
        this.animationId = null;
        this.lastDrawnCell = { x: -1, y: -1 };

        this.initializeUI();
        this.setupEventListeners();
        this.updateStats();
        this.renderer.render();
    }

    initializeUI() {
        // Заполняем селектор правил
        const ruleSelect = document.getElementById('ruleSelect');
        RULES.forEach((rule, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${rule.name} (${rule.rule})`;
            option.title = rule.description;
            ruleSelect.appendChild(option);
        });

        // Заполняем селектор паттернов
        const patternSelect = document.getElementById('patternSelect');
        PATTERNS.forEach((pattern, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = pattern.name;
            option.title = pattern.description;
            patternSelect.appendChild(option);
        });

        // Устанавливаем начальные значения
        document.getElementById('speedValue').textContent = '5';
        document.getElementById('densityValue').textContent = '30%';
        document.getElementById('gridSizeValue').textContent = '50x50';
        document.getElementById('birthRule').value = '3';
        document.getElementById('survivalRule').value = '23';
    }

    setupEventListeners() {
        // Кнопки управления
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stepBtn').addEventListener('click', () => this.step());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());

        // Слайдеры
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.automaton.speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value;
        });

        document.getElementById('densitySlider').addEventListener('input', (e) => {
            document.getElementById('densityValue').textContent = e.target.value + '%';
        });

        document.getElementById('gridSizeSlider').addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            document.getElementById('gridSizeValue').textContent = `${size}x${size}`;
            this.resizeGrid(size);
        });

        // Селекторы
        document.getElementById('ruleSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                const rule = RULES[parseInt(e.target.value)];
                this.applyRule(rule.birth, rule.survival);
                document.getElementById('birthRule').value = rule.birth.join('');
                document.getElementById('survivalRule').value = rule.survival.join('');
            }
        });

        document.getElementById('patternSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.selectedPattern = PATTERNS[parseInt(e.target.value)];
            }
        });

        // Кнопки действий
        document.getElementById('applyRulesBtn').addEventListener('click', () => this.applyCustomRules());
        document.getElementById('placePatternBtn').addEventListener('click', () => this.placeSelectedPattern());
        document.getElementById('randomFillBtn').addEventListener('click', () => this.randomFill());

        // Инструменты
        document.getElementById('pencilTool').addEventListener('click', () => this.selectTool('pencil'));
        document.getElementById('eraserTool').addEventListener('click', () => this.selectTool('eraser'));

        // Canvas события - исправленная версия
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleMouseDown(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            e.preventDefault();
            this.handleMouseMove(e);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.handleMouseUp();
        });

        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // Предотвращаем контекстное меню
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Touch события для мобильных устройств
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseDown(touch);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove(touch);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleMouseUp();
        });
    }

    play() {
        this.automaton.isRunning = true;
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        this.updateStatus('Симуляция запущена', 'success');
        this.gameLoop();
    }

    pause() {
        this.automaton.isRunning = false;
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        this.updateStatus('Пауза', 'warning');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    step() {
        this.automaton.step();
        this.updateStats();
        this.renderer.render();
    }

    reset() {
        this.pause();
        this.automaton.generation = 0;
        this.updateStats();
        this.renderer.render();
        this.updateStatus('Сброшено', 'info');
    }

    clear() {
        this.pause();
        this.automaton.clear();
        this.updateStats();
        this.renderer.render();
        this.updateStatus('Очищено', 'info');
    }

    gameLoop() {
        if (!this.automaton.isRunning) return;

        const now = Date.now();
        const interval = 1000 / this.automaton.speed;

        if (now - this.automaton.lastUpdate >= interval) {
            this.automaton.step();
            this.updateStats();
            this.renderer.render();
            this.automaton.lastUpdate = now;
        }

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    applyRule(birth, survival) {
        this.automaton.setRules(birth, survival);
        this.updateStatus('Правила применены', 'success');
    }

    applyCustomRules() {
        const birthInput = document.getElementById('birthRule').value;
        const survivalInput = document.getElementById('survivalRule').value;

        const birth = birthInput.split('').map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 8);
        const survival = survivalInput.split('').map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 8);

        this.applyRule(birth, survival);
    }

    resizeGrid(size) {
        this.automaton.resize(size, size);
        this.renderer.updateCanvasSize();
        this.renderer.render();
        this.updateStats();
    }

    placeSelectedPattern() {
        if (this.selectedPattern) {
            const centerX = Math.floor(this.automaton.width / 2) - Math.floor(this.selectedPattern.pattern[0].length / 2);
            const centerY = Math.floor(this.automaton.height / 2) - Math.floor(this.selectedPattern.pattern.length / 2);
            this.automaton.placePattern(this.selectedPattern.pattern, centerX, centerY);
            this.renderer.render();
            this.updateStats();
            this.updateStatus(`Паттерн "${this.selectedPattern.name}" размещен`, 'success');
        }
    }

    randomFill() {
        const density = parseInt(document.getElementById('densitySlider').value) / 100;
        this.automaton.randomFill(density);
        this.renderer.render();
        this.updateStats();
        this.updateStatus('Случайное заполнение выполнено', 'info');
    }

    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + 'Tool').classList.add('active');
    }

    handleMouseDown(e) {
        this.isDrawing = true;
        this.lastDrawnCell = { x: -1, y: -1 };
        this.handleDraw(e);
    }

    handleMouseMove(e) {
        if (this.isDrawing) {
            this.handleDraw(e);
        }
    }

    handleMouseUp() {
        this.isDrawing = false;
        this.lastDrawnCell = { x: -1, y: -1 };
    }

    handleDraw(e) {
        const pos = this.renderer.getGridPosition(e.clientX, e.clientY);

        // Проверяем, что мы находимся в пределах сетки
        if (pos.x < 0 || pos.x >= this.automaton.width || pos.y < 0 || pos.y >= this.automaton.height) {
            return;
        }

        // Избегаем повторного рисования в той же клетке
        if (pos.x === this.lastDrawnCell.x && pos.y === this.lastDrawnCell.y) {
            return;
        }

        const newState = this.currentTool === 'pencil' ? 1 : 0;
        this.automaton.setCell(pos.x, pos.y, newState);
        this.lastDrawnCell = { x: pos.x, y: pos.y };

        this.renderer.render();
        this.updateStats();
    }

    updateStats() {
        const aliveCells = this.automaton.getAliveCells();
        const totalCells = this.automaton.width * this.automaton.height;
        const density = ((aliveCells / totalCells) * 100).toFixed(1);

        document.getElementById('generation').textContent = this.automaton.generation;
        document.getElementById('aliveCells').textContent = aliveCells;
        document.getElementById('density').textContent = density + '%';
    }

    updateStatus(text, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = text;
        statusElement.className = `status status--${type}`;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new GameOfLifeApp();
});