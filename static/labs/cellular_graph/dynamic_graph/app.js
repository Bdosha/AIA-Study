class GraphAutomataSimulator {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.draggedNode = null;
        this.isSimulationRunning = false;
        this.simulationSpeed = 5;
        this.currentAlgorithm = 'DFS';
        this.simulationHistory = [];
        this.currentStep = 0;
        this.isDirected = true;
        this.enableWeights = true;
        this.minWeight = 1;
        this.maxWeight = 10;
        this.nodeCounter = 0;
        this.isEditing = true;
        this.isDarkMode = false;
        
        // Algorithm state
        this.visited = new Set();
        this.queue = [];
        this.stack = [];
        this.distances = {};
        this.parents = {};
        this.currentNode = null;
        this.pathEdges = new Set();
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateDisplay();
        this.resizeCanvas();
        
        // Handle canvas resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupCanvas() {
        this.resizeCanvas();
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }
    
    setupEventListeners() {
        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSimulation());
        document.getElementById('stepForwardBtn').addEventListener('click', () => this.stepForward());
        document.getElementById('stepBackwardBtn').addEventListener('click', () => this.stepBackward());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSimulation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearGraph());
        
        // Settings
        document.getElementById('algorithmSelect').addEventListener('change', (e) => {
            this.currentAlgorithm = e.target.value;
            document.getElementById('currentAlgorithm').textContent = e.target.value;
            this.updateAlgorithmInfo();
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.simulationSpeed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value;
        });
        
        // Graph settings
        document.querySelectorAll('input[name="graphType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.isDirected = e.target.value === 'directed';
                this.draw();
            });
        });
        
        document.getElementById('enableWeights').addEventListener('change', (e) => {
            this.enableWeights = e.target.checked;
            this.draw();
        });
        
        document.getElementById('minWeight').addEventListener('change', (e) => {
            this.minWeight = parseInt(e.target.value);
        });
        
        document.getElementById('maxWeight').addEventListener('change', (e) => {
            this.maxWeight = parseInt(e.target.value);
        });
        
        // Import/Export
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJson());
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.importJson(e));
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportCsv());
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Edge modal
        document.getElementById('saveEdgeBtn').addEventListener('click', () => this.saveEdgeLabel());
        document.getElementById('cancelEdgeBtn').addEventListener('click', () => this.cancelEdgeEdit());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleMouseDown(e) {
        if (!this.isEditing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicking on a node
        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            if (e.shiftKey) {
                // Toggle accepting state
                clickedNode.isAccept = !clickedNode.isAccept;
                this.draw();
                return;
            }
            
            if (this.selectedNode && this.selectedNode !== clickedNode) {
                // Create edge between selected node and clicked node
                this.createEdge(this.selectedNode, clickedNode);
                this.selectedNode = null;
            } else {
                this.selectedNode = clickedNode;
                this.draggedNode = clickedNode;
            }
            this.draw();
            return;
        }
        
        // Check if clicking on an edge
        const clickedEdge = this.getEdgeAt(x, y);
        if (clickedEdge) {
            this.selectedEdge = clickedEdge;
            this.showEdgeModal();
            return;
        }
        
        // Create new node
        if (this.selectedNode) {
            this.selectedNode = null;
            this.draw();
            return;
        }
        
        this.createNode(x, y);
    }
    
    handleMouseMove(e) {
        if (!this.draggedNode || !this.isEditing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.draggedNode.x = x;
        this.draggedNode.y = y;
        this.draw();
    }
    
    handleMouseUp(e) {
        this.draggedNode = null;
    }
    
    handleRightClick(e) {
        e.preventDefault();
        if (!this.isEditing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if right-clicking on a node
        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.deleteNode(clickedNode);
            return;
        }
        
        // Check if right-clicking on an edge
        const clickedEdge = this.getEdgeAt(x, y);
        if (clickedEdge) {
            this.deleteEdge(clickedEdge);
            return;
        }
    }
    
    handleDoubleClick(e) {
        if (!this.isEditing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            // Set as start node
            this.nodes.forEach(node => node.isStart = false);
            clickedNode.isStart = true;
            this.draw();
        }
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            if (this.isSimulationRunning) {
                this.stopSimulation();
            } else {
                this.startSimulation();
            }
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            this.stepForward();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            this.stepBackward();
        } else if (e.code === 'KeyR') {
            e.preventDefault();
            this.resetSimulation();
        }
    }
    
    getNodeAt(x, y) {
        return this.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= 20;
        });
    }
    
    getEdgeAt(x, y) {
        return this.edges.find(edge => {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return false;
            
            // Check if point is near the edge line
            const distance = this.pointToLineDistance(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y);
            return distance <= 5;
        });
    }
    
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    createNode(x, y) {
        const id = String.fromCharCode(65 + this.nodeCounter);
        const node = {
            id: id,
            x: x,
            y: y,
            isStart: this.nodes.length === 0,
            isAccept: false
        };
        
        this.nodes.push(node);
        this.nodeCounter++;
        this.updateDisplay();
        this.draw();
    }
    
    createEdge(fromNode, toNode) {
        // Check if edge already exists
        const existingEdge = this.edges.find(edge => 
            edge.from === fromNode.id && edge.to === toNode.id
        );
        
        if (existingEdge) return;
        
        const weight = Math.floor(Math.random() * (this.maxWeight - this.minWeight + 1)) + this.minWeight;
        const edge = {
            from: fromNode.id,
            to: toNode.id,
            label: '',
            weight: weight
        };
        
        this.edges.push(edge);
        this.updateDisplay();
        this.draw();
    }
    
    deleteNode(node) {
        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.edges = this.edges.filter(e => e.from !== node.id && e.to !== node.id);
        this.updateDisplay();
        this.draw();
    }
    
    deleteEdge(edge) {
        this.edges = this.edges.filter(e => e !== edge);
        this.updateDisplay();
        this.draw();
    }
    
    showEdgeModal() {
        const modal = document.getElementById('edgeLabelModal');
        const labelInput = document.getElementById('edgeLabel');
        const weightInput = document.getElementById('edgeWeight');
        
        labelInput.value = this.selectedEdge.label || '';
        weightInput.value = this.selectedEdge.weight || 1;
        
        modal.style.display = 'block';
        labelInput.focus();
    }
    
    saveEdgeLabel() {
        const labelInput = document.getElementById('edgeLabel');
        const weightInput = document.getElementById('edgeWeight');
        
        this.selectedEdge.label = labelInput.value;
        this.selectedEdge.weight = parseInt(weightInput.value) || 1;
        
        document.getElementById('edgeLabelModal').style.display = 'none';
        this.selectedEdge = null;
        this.draw();
    }
    
    cancelEdgeEdit() {
        document.getElementById('edgeLabelModal').style.display = 'none';
        this.selectedEdge = null;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw edges first
        this.edges.forEach(edge => this.drawEdge(edge));
        
        // Then draw nodes
        this.nodes.forEach(node => this.drawNode(node));
    }
    
    drawNode(node) {
        const radius = 20;
        const x = node.x;
        const y = node.y;
        
        // Determine node color
        let fillColor = this.getComputedStyleValue('--graph-vertex');
        let borderColor = this.getComputedStyleValue('--graph-vertex-border');
        
        if (node.id === this.currentNode) {
            fillColor = this.getComputedStyleValue('--graph-active-vertex');
        } else if (this.visited.has(node.id)) {
            fillColor = this.getComputedStyleValue('--graph-visited-vertex');
        } else if (node.isStart) {
            borderColor = this.getComputedStyleValue('--graph-start-vertex');
        }
        
        // Draw node circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        
        // Draw border
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = node === this.selectedNode ? 3 : 2;
        this.ctx.stroke();
        
        // Draw accepting state (double circle)
        if (node.isAccept) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius - 5, 0, 2 * Math.PI);
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Draw node label
        this.ctx.fillStyle = this.getComputedStyleValue('--color-text');
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.id, x, y);
    }
    
    drawEdge(edge) {
        const fromNode = this.nodes.find(n => n.id === edge.from);
        const toNode = this.nodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) return;
        
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate edge positions (offset by node radius)
        const nodeRadius = 20;
        const startX = fromNode.x + (dx / distance) * nodeRadius;
        const startY = fromNode.y + (dy / distance) * nodeRadius;
        const endX = toNode.x - (dx / distance) * nodeRadius;
        const endY = toNode.y - (dy / distance) * nodeRadius;
        
        // Determine edge color
        let strokeColor = this.getComputedStyleValue('--graph-edge');
        let lineWidth = 2;
        
        const edgeKey = `${edge.from}-${edge.to}`;
        if (this.pathEdges.has(edgeKey)) {
            strokeColor = this.getComputedStyleValue('--graph-path-edge');
            lineWidth = 3;
        }
        
        // Draw edge line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();
        
        // Draw arrow for directed graphs
        if (this.isDirected) {
            this.drawArrow(endX, endY, Math.atan2(dy, dx), strokeColor);
        }
        
        // Draw edge label and weight
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        this.ctx.fillStyle = this.getComputedStyleValue('--color-text');
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let labelText = '';
        if (edge.label) {
            labelText = edge.label;
        }
        if (this.enableWeights && edge.weight) {
            labelText += (labelText ? '/' : '') + edge.weight;
        }
        
        if (labelText) {
            // Draw background for label
            const textMetrics = this.ctx.measureText(labelText);
            const padding = 4;
            const bgWidth = textMetrics.width + padding * 2;
            const bgHeight = 16;
            
            this.ctx.fillStyle = this.getComputedStyleValue('--graph-canvas-bg');
            this.ctx.fillRect(midX - bgWidth/2, midY - bgHeight/2, bgWidth, bgHeight);
            
            this.ctx.fillStyle = this.getComputedStyleValue('--color-text');
            this.ctx.fillText(labelText, midX, midY);
        }
    }
    
    drawArrow(x, y, angle, color) {
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - arrowLength * Math.cos(angle - arrowAngle),
            y - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - arrowLength * Math.cos(angle + arrowAngle),
            y - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    getComputedStyleValue(cssVar) {
        return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    }
    
    startSimulation() {
        if (this.nodes.length === 0) {
            alert('Граф пуст! Добавьте вершины для симуляции.');
            return;
        }
        
        const startNode = this.nodes.find(node => node.isStart);
        if (!startNode) {
            alert('Не выбрана начальная вершина! Дважды кликните на вершину для выбора.');
            return;
        }
        
        this.isSimulationRunning = true;
        this.isEditing = false;
        this.canvas.style.cursor = 'default';
        
        // Initialize algorithm
        this.initializeAlgorithm();
        
        // Update UI
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        
        // Start automatic execution
        this.simulationInterval = setInterval(() => {
            if (!this.stepForward()) {
                this.stopSimulation();
            }
        }, 1100 - this.simulationSpeed * 100);
    }
    
    stopSimulation() {
        this.isSimulationRunning = false;
        clearInterval(this.simulationInterval);
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
    }
    
    resetSimulation() {
        this.stopSimulation();
        this.visited.clear();
        this.queue = [];
        this.stack = [];
        this.distances = {};
        this.parents = {};
        this.currentNode = null;
        this.pathEdges.clear();
        this.simulationHistory = [];
        this.currentStep = 0;
        this.isEditing = true;
        this.canvas.style.cursor = 'crosshair';
        
        this.updateDisplay();
        this.draw();
    }
    
    clearGraph() {
        this.resetSimulation();
        this.nodes = [];
        this.edges = [];
        this.nodeCounter = 0;
        this.selectedNode = null;
        this.selectedEdge = null;
        
        this.updateDisplay();
        this.draw();
    }
    
    initializeAlgorithm() {
        const startNode = this.nodes.find(node => node.isStart);
        if (!startNode) return;
        
        this.visited.clear();
        this.queue = [];
        this.stack = [];
        this.distances = {};
        this.parents = {};
        this.pathEdges.clear();
        this.simulationHistory = [{
            visited: new Set(),
            queue: [],
            stack: [],
            currentNode: null,
            distances: {},
            pathEdges: new Set()
        }];
        this.currentStep = 0;
        
        switch (this.currentAlgorithm) {
            case 'DFS':
                this.stack.push(startNode.id);
                break;
            case 'BFS':
                this.queue.push(startNode.id);
                break;
            case 'Dijkstra':
            case 'AStar':
                this.nodes.forEach(node => {
                    this.distances[node.id] = node.id === startNode.id ? 0 : Infinity;
                });
                this.queue.push({id: startNode.id, distance: 0});
                break;
        }
        
        this.updateDisplay();
    }
    
    stepForward() {
        if (this.currentStep >= this.simulationHistory.length - 1) {
            const hasNext = this.executeAlgorithmStep();
            if (!hasNext) return false;
        } else {
            this.currentStep++;
            this.restoreState(this.simulationHistory[this.currentStep]);
        }
        
        this.updateDisplay();
        this.draw();
        return true;
    }
    
    stepBackward() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.restoreState(this.simulationHistory[this.currentStep]);
            this.updateDisplay();
            this.draw();
        }
    }
    
    executeAlgorithmStep() {
        switch (this.currentAlgorithm) {
            case 'DFS':
                return this.executeDFSStep();
            case 'BFS':
                return this.executeBFSStep();
            case 'Dijkstra':
                return this.executeDijkstraStep();
            case 'AStar':
                return this.executeAStarStep();
            default:
                return false;
        }
    }
    
    executeDFSStep() {
        if (this.stack.length === 0) return false;
        
        const nodeId = this.stack.pop();
        if (this.visited.has(nodeId)) {
            return this.stack.length > 0;
        }
        
        this.visited.add(nodeId);
        this.currentNode = nodeId;
        
        // Add neighbors to stack (in reverse order for correct traversal)
        const neighbors = this.getNeighbors(nodeId).reverse();
        neighbors.forEach(neighborId => {
            if (!this.visited.has(neighborId)) {
                this.stack.push(neighborId);
                this.pathEdges.add(`${nodeId}-${neighborId}`);
            }
        });
        
        this.saveCurrentState();
        return this.stack.length > 0 || neighbors.length > 0;
    }
    
    executeBFSStep() {
        if (this.queue.length === 0) return false;
        
        const nodeId = this.queue.shift();
        if (this.visited.has(nodeId)) {
            return this.queue.length > 0;
        }
        
        this.visited.add(nodeId);
        this.currentNode = nodeId;
        
        // Add neighbors to queue
        const neighbors = this.getNeighbors(nodeId);
        neighbors.forEach(neighborId => {
            if (!this.visited.has(neighborId) && !this.queue.includes(neighborId)) {
                this.queue.push(neighborId);
                this.pathEdges.add(`${nodeId}-${neighborId}`);
            }
        });
        
        this.saveCurrentState();
        return this.queue.length > 0;
    }
    
    executeDijkstraStep() {
        if (this.queue.length === 0) return false;
        
        // Sort queue by distance
        this.queue.sort((a, b) => a.distance - b.distance);
        const current = this.queue.shift();
        
        if (this.visited.has(current.id)) {
            return this.queue.length > 0;
        }
        
        this.visited.add(current.id);
        this.currentNode = current.id;
        
        // Update distances to neighbors
        const neighbors = this.getNeighborsWithWeights(current.id);
        neighbors.forEach(({id: neighborId, weight}) => {
            if (!this.visited.has(neighborId)) {
                const newDistance = current.distance + weight;
                if (newDistance < this.distances[neighborId]) {
                    this.distances[neighborId] = newDistance;
                    this.parents[neighborId] = current.id;
                    this.pathEdges.add(`${current.id}-${neighborId}`);
                    
                    // Update or add to queue
                    const existingIndex = this.queue.findIndex(item => item.id === neighborId);
                    if (existingIndex >= 0) {
                        this.queue[existingIndex].distance = newDistance;
                    } else {
                        this.queue.push({id: neighborId, distance: newDistance});
                    }
                }
            }
        });
        
        this.saveCurrentState();
        return this.queue.length > 0;
    }
    
    executeAStarStep() {
        if (this.queue.length === 0) return false;
        
        // Sort queue by f(n) = g(n) + h(n)
        const targetNode = this.nodes.find(n => n.isAccept);
        if (!targetNode) {
            // If no target, behave like Dijkstra
            return this.executeDijkstraStep();
        }
        
        this.queue.sort((a, b) => {
            const aHeuristic = this.calculateHeuristic(a.id, targetNode.id);
            const bHeuristic = this.calculateHeuristic(b.id, targetNode.id);
            return (a.distance + aHeuristic) - (b.distance + bHeuristic);
        });
        
        const current = this.queue.shift();
        
        if (this.visited.has(current.id)) {
            return this.queue.length > 0;
        }
        
        this.visited.add(current.id);
        this.currentNode = current.id;
        
        // Check if we reached the target
        if (current.id === targetNode.id) {
            this.reconstructPath(current.id);
            this.saveCurrentState();
            return false; // Goal reached
        }
        
        // Update distances to neighbors
        const neighbors = this.getNeighborsWithWeights(current.id);
        neighbors.forEach(({id: neighborId, weight}) => {
            if (!this.visited.has(neighborId)) {
                const newDistance = current.distance + weight;
                if (newDistance < (this.distances[neighborId] || Infinity)) {
                    this.distances[neighborId] = newDistance;
                    this.parents[neighborId] = current.id;
                    this.pathEdges.add(`${current.id}-${neighborId}`);
                    
                    // Update or add to queue
                    const existingIndex = this.queue.findIndex(item => item.id === neighborId);
                    if (existingIndex >= 0) {
                        this.queue[existingIndex].distance = newDistance;
                    } else {
                        this.queue.push({id: neighborId, distance: newDistance});
                    }
                }
            }
        });
        
        this.saveCurrentState();
        return this.queue.length > 0;
    }
    
    calculateHeuristic(fromId, toId) {
        const fromNode = this.nodes.find(n => n.id === fromId);
        const toNode = this.nodes.find(n => n.id === toId);
        
        if (!fromNode || !toNode) return 0;
        
        // Euclidean distance
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        return Math.sqrt(dx * dx + dy * dy) / 100; // Scale down for better balance
    }
    
    reconstructPath(targetId) {
        this.pathEdges.clear();
        let current = targetId;
        
        while (this.parents[current]) {
            const parent = this.parents[current];
            this.pathEdges.add(`${parent}-${current}`);
            current = parent;
        }
    }
    
    getNeighbors(nodeId) {
        const neighbors = [];
        
        this.edges.forEach(edge => {
            if (edge.from === nodeId) {
                neighbors.push(edge.to);
            } else if (!this.isDirected && edge.to === nodeId) {
                neighbors.push(edge.from);
            }
        });
        
        return neighbors;
    }
    
    getNeighborsWithWeights(nodeId) {
        const neighbors = [];
        
        this.edges.forEach(edge => {
            if (edge.from === nodeId) {
                neighbors.push({id: edge.to, weight: edge.weight || 1});
            } else if (!this.isDirected && edge.to === nodeId) {
                neighbors.push({id: edge.from, weight: edge.weight || 1});
            }
        });
        
        return neighbors;
    }
    
    saveCurrentState() {
        this.simulationHistory = this.simulationHistory.slice(0, this.currentStep + 1);
        this.simulationHistory.push({
            visited: new Set(this.visited),
            queue: [...this.queue],
            stack: [...this.stack],
            currentNode: this.currentNode,
            distances: {...this.distances},
            pathEdges: new Set(this.pathEdges)
        });
        this.currentStep++;
    }
    
    restoreState(state) {
        this.visited = new Set(state.visited);
        this.queue = [...state.queue];
        this.stack = [...state.stack];
        this.currentNode = state.currentNode;
        this.distances = {...state.distances};
        this.pathEdges = new Set(state.pathEdges);
    }
    
    updateDisplay() {
        document.getElementById('vertexCount').textContent = this.nodes.length;
        document.getElementById('edgeCount').textContent = this.edges.length;
        document.getElementById('currentStep').textContent = this.currentStep;
        
        // Update visited vertices list
        const visitedList = document.getElementById('visitedVertices');
        visitedList.innerHTML = '';
        
        this.visited.forEach(nodeId => {
            const span = document.createElement('span');
            span.className = 'visited-vertex';
            span.textContent = nodeId;
            visitedList.appendChild(span);
        });
        
        // Update algorithm structure
        this.updateAlgorithmInfo();
        
        // Update distances table
        this.updateDistanceTable();
        
        // Update path length
        if (this.currentAlgorithm === 'Dijkstra' || this.currentAlgorithm === 'AStar') {
            const targetNode = this.nodes.find(n => n.isAccept);
            const pathLength = targetNode && this.distances[targetNode.id] !== Infinity 
                ? this.distances[targetNode.id] : 0;
            document.getElementById('pathLength').textContent = pathLength;
        } else {
            document.getElementById('pathLength').textContent = this.visited.size;
        }
    }
    
    updateAlgorithmInfo() {
        const algorithmInfo = document.getElementById('algorithmStructure');
        const structureContent = document.getElementById('structureContent');
        
        switch (this.currentAlgorithm) {
            case 'DFS':
                algorithmInfo.innerHTML = '<strong>Стек (DFS):</strong>';
                structureContent.textContent = JSON.stringify(this.stack);
                break;
            case 'BFS':
                algorithmInfo.innerHTML = '<strong>Очередь (BFS):</strong>';
                structureContent.textContent = JSON.stringify(this.queue);
                break;
            case 'Dijkstra':
                algorithmInfo.innerHTML = '<strong>Приоритетная очередь (Dijkstra):</strong>';
                structureContent.textContent = JSON.stringify(this.queue.map(item => 
                    `${item.id}(${item.distance})`
                ));
                break;
            case 'AStar':
                algorithmInfo.innerHTML = '<strong>Приоритетная очередь (A*):</strong>';
                const targetNode = this.nodes.find(n => n.isAccept);
                structureContent.textContent = JSON.stringify(this.queue.map(item => {
                    const h = targetNode ? this.calculateHeuristic(item.id, targetNode.id) : 0;
                    const f = item.distance + h;
                    return `${item.id}(f:${f.toFixed(1)})`;
                }));
                break;
        }
    }
    
    updateDistanceTable() {
        const distanceTable = document.getElementById('distanceTable');
        distanceTable.innerHTML = '';
        
        if (this.currentAlgorithm === 'Dijkstra' || this.currentAlgorithm === 'AStar') {
            Object.entries(this.distances).forEach(([nodeId, distance]) => {
                if (distance !== Infinity) {
                    const item = document.createElement('div');
                    item.className = 'distance-item';
                    item.innerHTML = `<span>${nodeId}:</span><span>${distance}</span>`;
                    distanceTable.appendChild(item);
                }
            });
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        const themeButton = document.getElementById('themeToggle');
        
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-color-scheme', 'dark');
            themeButton.textContent = '☀️ Светлая';
        } else {
            document.documentElement.setAttribute('data-color-scheme', 'light');
            themeButton.textContent = '🌙 Тёмная';
        }
        
        // Redraw canvas with new colors
        this.draw();
    }
    
    exportJson() {
        const data = {
            nodes: this.nodes,
            edges: this.edges,
            algorithm: this.currentAlgorithm,
            directed: this.isDirected,
            enableWeights: this.enableWeights,
            minWeight: this.minWeight,
            maxWeight: this.maxWeight
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_automaton.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    importJson(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                this.resetSimulation();
                this.nodes = data.nodes || [];
                this.edges = data.edges || [];
                this.currentAlgorithm = data.algorithm || 'DFS';
                this.isDirected = data.directed !== undefined ? data.directed : true;
                this.enableWeights = data.enableWeights !== undefined ? data.enableWeights : true;
                this.minWeight = data.minWeight || 1;
                this.maxWeight = data.maxWeight || 10;
                
                // Update node counter
                this.nodeCounter = this.nodes.length;
                
                // Update UI
                document.getElementById('algorithmSelect').value = this.currentAlgorithm;
                document.querySelectorAll('input[name="graphType"]').forEach(radio => {
                    radio.checked = radio.value === (this.isDirected ? 'directed' : 'undirected');
                });
                document.getElementById('enableWeights').checked = this.enableWeights;
                document.getElementById('minWeight').value = this.minWeight;
                document.getElementById('maxWeight').value = this.maxWeight;
                
                this.updateDisplay();
                this.draw();
                
                alert('Граф успешно импортирован!');
            } catch (error) {
                alert('Ошибка при импорте файла: ' + error.message);
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }
    
    exportCsv() {
        let csvContent = '';
        
        if (this.enableWeights) {
            // Export weighted adjacency matrix
            csvContent = 'From,To,Weight\n';
            this.edges.forEach(edge => {
                csvContent += `${edge.from},${edge.to},${edge.weight}\n`;
            });
        } else {
            // Export adjacency matrix
            const nodeIds = this.nodes.map(n => n.id).sort();
            csvContent = ',' + nodeIds.join(',') + '\n';
            
            nodeIds.forEach(fromId => {
                const row = [fromId];
                nodeIds.forEach(toId => {
                    const hasEdge = this.edges.some(edge => 
                        edge.from === fromId && edge.to === toId
                    );
                    row.push(hasEdge ? '1' : '0');
                });
                csvContent += row.join(',') + '\n';
            });
        }
        
        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
const simulator = new GraphAutomataSimulator();

// Handle theme detection
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    simulator.toggleTheme();
}

// Listen for theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (e.matches !== simulator.isDarkMode) {
        simulator.toggleTheme();
    }
});