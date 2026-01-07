// app.js - объединенный файл со всей логикой

// === БАЗИСНЫЕ ФУНКЦИИ ГЁДЕЛЯ ===
class GodelFunctions {
    static zero(...args) {
        return 0;
    }
    
    static successor(x) {
        return x + 1;
    }
    
    static projection(m, n, ...args) {
        if (m < 1 || m > n) throw new Error(`Неверный индекс проекции`);
        if (args.length !== n) throw new Error(`Неверное количество аргументов`);
        return args[m - 1];
    }
}

// === ОПЕРАТОРЫ ГЁДЕЛЯ ===
class GodelOperators {
    static superposition(f, ...gFunctions) {
        return (...args) => {
            const gResults = gFunctions.map(g => g(...args));
            return f(...gResults);
        };
    }
    
    static primitiveRecursion(f, g) {
        const recursiveFunc = (x, y, ...rest) => {
            if (y === 0) {
                return f(x, ...rest);
            } else {
                const prev = recursiveFunc(x, y - 1, ...rest);
                return g(x, y - 1, prev, ...rest);
            }
        };
        return recursiveFunc;
    }
    
    static minimization(f) {
        return (...args) => {
            let y = 0;
            while (f(...args, y) !== 0) {
                y++;
                if (y > 1000) throw new Error("Минимизация не завершилась");
            }
            return y;
        };
    }
}

// === ПАРСЕР ФУНКЦИЙ ===
class GodelFunctionParser {
    static parseDefinition(definition) {
        console.log("Парсим определение:", definition);
        
        const funcName = definition.split('=')[0].trim() || 'f';
        
        // Определяем тип функции по ключевым словам
        if (definition.includes('fibonacci') || definition.includes('fib')) {
            return this.createFibonacciFunction(funcName);
        }
        else if (definition.includes('factorial') || definition.includes('fact')) {
            return this.createFactorialFunction(funcName);
        }
        else if (definition.includes('add') || definition.includes('sum') || definition.includes('+')) {
            return this.createAdditionFunction(funcName);
        }
        else if (definition.includes('mult') || definition.includes('*')) {
            return this.createMultiplicationFunction(funcName);
        }
        else if (definition.includes('Ackermann') || definition.includes('ack')) {
            return this.createAckermannFunction(funcName);
        }
        else {
            // По умолчанию - ветвящаяся функция
            return this.createBranchingFunction(funcName);
        }
    }
    
    static createFibonacciFunction(name) {
        function fib(n) {
            if (n <= 1) return n;
            return fib(n - 1) + fib(n - 2);
        }
        Object.defineProperty(fib, 'name', { value: name });
        return fib;
    }
    
    static createFactorialFunction(name) {
        function fact(n) {
            if (n <= 1) return 1;
            return n * fact(n - 1);
        }
        Object.defineProperty(fact, 'name', { value: name });
        return fact;
    }
    
    static createAdditionFunction(name) {
        function add(x, y) {
            if (y === 0) return x;
            return add(x, y - 1) + 1;
        }
        Object.defineProperty(add, 'name', { value: name });
        return add;
    }
    
    static createMultiplicationFunction(name) {
        function mult(x, y) {
            if (y === 0) return 0;
            return mult(x, y - 1) + x;
        }
        Object.defineProperty(mult, 'name', { value: name });
        return mult;
    }
    
    static createAckermannFunction(name) {
        function ack(m, n) {
            if (m === 0) return n + 1;
            if (n === 0) return ack(m - 1, 1);
            return ack(m - 1, ack(m, n - 1));
        }
        Object.defineProperty(ack, 'name', { value: name });
        return ack;
    }
    
    static createBranchingFunction(name) {
        function branch(x, y) {
            if (x <= 0 || y <= 0) return 1;
            return branch(x - 1, y) + branch(x, y - 1);
        }
        Object.defineProperty(branch, 'name', { value: name });
        return branch;
    }
}

// === ВЫЧИСЛИТЕЛЬНОЕ ЯДРО ===
class RecursionEngine {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.stepCounter = 0;
        this.depthCounter = 0;
        this.maxDepth = 0;
        this.startTime = 0;
        this.isRunning = false;
        this.trace = [];
        this.callTree = { nodes: [], edges: [] };
        this.currentStep = 0;
        this.nodeCounter = 0;
    }
    
    compute(func, ...args) {
        this.reset();
        this.startTime = performance.now();
        this.isRunning = true;
        
        try {
            const rootId = this.addNode('root', `${func.name}(${args.join(', ')})`, 0);
            const result = this.executeWithTracing(func, args, 0, rootId);
            
            this.isRunning = false;
            return result;
        } catch (error) {
            this.isRunning = false;
            throw error;
        }
    }
    
    executeWithTracing(func, args, depth, parentId) {
        this.stepCounter++;
        this.depthCounter = depth;
        this.maxDepth = Math.max(this.maxDepth, depth);
        
        const nodeId = `node_${this.nodeCounter++}`;
        this.addNode(nodeId, `${func.name}(${args.join(', ')})`, depth);
        this.addEdge(parentId, nodeId);
        
        this.addTraceStep(`Вычисление ${func.name}(${args.join(', ')})`, depth);
        
        const savedStepCounter = this.stepCounter;
        const savedNodeCounter = this.nodeCounter;
        
        try {
            // Создаем трассируемую версию функции
            const tracedFunc = (...innerArgs) => {
                return this.executeWithTracing(func, innerArgs, depth + 1, nodeId);
            };
            
            // Вызываем оригинальную функцию с подменой рекурсивных вызовов
            const result = this.callWithTracing(func, args, tracedFunc);
            
            this.addTraceStep(`Результат: ${result}`, depth);
            return result;
            
        } catch (error) {
            this.stepCounter = savedStepCounter;
            this.nodeCounter = savedNodeCounter;
            throw error;
        }
    }
    
    callWithTracing(originalFunc, args, tracedFunc) {
        const funcName = originalFunc.name.toLowerCase();
        const x = args[0] || 0;
        const y = args[1] || 0;
        
        // РАЗНАЯ ЛОГИКА ДЛЯ РАЗНЫХ ФУНКЦИЙ
        if (funcName.includes('fib')) {
            if (x <= 1) return x;
            return tracedFunc(x - 1) + tracedFunc(x - 2);
        }
        else if (funcName.includes('fact')) {
            if (x <= 1) return 1;
            return x * tracedFunc(x - 1);
        }
        else if (funcName.includes('add') || funcName.includes('sum')) {
            if (y === 0) return x;
            return tracedFunc(x, y - 1) + 1;
        }
        else if (funcName.includes('mult')) {
            if (y === 0) return 0;
            return tracedFunc(x, y - 1) + x;
        }
        else if (funcName.includes('ack')) {
            if (x === 0) return y + 1;
            if (y === 0) return tracedFunc(x - 1, 1);
            const inner = tracedFunc(x, y - 1);
            return tracedFunc(x - 1, inner);
        }
        else {
            // По умолчанию - ветвящаяся функция
            if (x <= 0 || y <= 0) return 1;
            return tracedFunc(x - 1, y) + tracedFunc(x, y - 1);
        }
    }
    
    addNode(id, label, depth) {
        this.callTree.nodes.push({ id, label, depth });
        return id;
    }
    
    addEdge(fromId, toId) {
        this.callTree.edges.push({ from: fromId, to: toId });
    }
    
    addTraceStep(message, depth) {
        this.trace.push({
            step: this.stepCounter,
            message,
            depth,
            timestamp: performance.now() - this.startTime
        });
    }
    
    getExecutionTime() {
        return this.isRunning ? (performance.now() - this.startTime) / 1000 : 0;
    }
}

// === УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ===
class UIManager {
    constructor() {
        this.engine = new RecursionEngine();
        this.isSimulationRunning = false;
        this.currentTheme = 'dark';
        
        this.initializeEventListeners();
        this.updateUI();
    }
    
    initializeEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    }
    
    startSimulation() {
        if (this.isSimulationRunning) return;
        
        try {
            const functionCode = document.getElementById('functionCode').value;
            const arg1 = parseInt(document.getElementById('arg1').value) || 0;
            const arg2 = parseInt(document.getElementById('arg2').value) || 0;
            
            console.log("Запуск с функцией:", functionCode, "аргументы:", arg1, arg2);
            
            const func = GodelFunctionParser.parseDefinition(functionCode);
            const result = this.engine.compute(func, arg1, arg2);
            
            this.updateUI();
            this.renderCallTree();
            this.renderTrace();
            
            console.log(`Результат: ${result}`);
            
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
            console.error(error);
        }
    }
    
    resetSimulation() {
        this.engine.reset();
        this.isSimulationRunning = false;
        this.updateUI();
        this.clearVisualizations();
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.body.className = `${this.currentTheme}-theme`;
        document.getElementById('themeToggle').textContent = 
            this.currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    }
    
    updateUI() {
        document.getElementById('stepCounter').textContent = this.engine.stepCounter;
        document.getElementById('depthCounter').textContent = this.engine.maxDepth;
        document.getElementById('timeCounter').textContent = `${this.engine.getExecutionTime().toFixed(1)}с`;
        
        const startBtn = document.getElementById('startBtn');
        
        if (this.isSimulationRunning) {
            startBtn.disabled = true;
        } else {
            startBtn.disabled = false;
        }
    }
    
    renderCallTree() {
        const svg = document.getElementById('treeSvg');
        svg.innerHTML = '';
        
        const nodes = this.engine.callTree.nodes;
        const edges = this.engine.callTree.edges;
        
        if (nodes.length === 0) return;
        
        const nodeRadius = 25;
        const verticalSpacing = 80;
        const horizontalSpacing = 120;
        
        const depthGroups = {};
        nodes.forEach(node => {
            if (!depthGroups[node.depth]) depthGroups[node.depth] = [];
            depthGroups[node.depth].push(node);
        });
        
        nodes.forEach((node, index) => {
            const depth = node.depth;
            const levelNodes = depthGroups[depth];
            const nodeIndex = levelNodes.indexOf(node);
            
            const x = 100 + depth * horizontalSpacing;
            const y = 100 + nodeIndex * verticalSpacing;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', nodeRadius);
            circle.setAttribute('class', 'node');
            svg.appendChild(circle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y + 5);
            text.setAttribute('class', 'node-text');
            
            // Обрезаем длинные метки
            let label = node.label;
            if (label.length > 12) {
                label = label.substring(0, 12) + '...';
            }
            text.textContent = label;
            svg.appendChild(text);
        });
        
        edges.forEach(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            
            if (fromNode && toNode) {
                const fromLevel = depthGroups[fromNode.depth];
                const toLevel = depthGroups[toNode.depth];
                
                const fromIndex = fromLevel.indexOf(fromNode);
                const toIndex = toLevel.indexOf(toNode);
                
                const x1 = 100 + fromNode.depth * horizontalSpacing + nodeRadius;
                const y1 = 100 + fromIndex * verticalSpacing;
                const x2 = 100 + toNode.depth * horizontalSpacing - nodeRadius;
                const y2 = 100 + toIndex * verticalSpacing;
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('class', 'edge');
                svg.appendChild(line);
            }
        });
    }
    
    renderTrace() {
        const traceOutput = document.getElementById('traceOutput');
        traceOutput.innerHTML = '';
        
        this.engine.trace.forEach(step => {
            const stepElement = document.createElement('div');
            stepElement.className = 'trace-step';
            
            const indent = '  '.repeat(step.depth);
            stepElement.textContent = `${indent}Шаг ${step.step}: ${step.message}`;
            
            traceOutput.appendChild(stepElement);
        });
        
        traceOutput.scrollTop = traceOutput.scrollHeight;
    }
    
    clearVisualizations() {
        document.getElementById('treeSvg').innerHTML = '';
        document.getElementById('traceOutput').innerHTML = '';
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});