// === GLOBAL DATA (FOR NEW FEATURES) ===
const MISSION_GOAL = 80;
const MISSION_STATUS = {
    success: {
        threshold: 80,
        label: "МИССИЯ ВЫПОЛНЕНА ✓",
        color: "#00ff41",
        bg: "rgba(0,255,65,0.13)",
        cssClass: "mission-success"
    },
    partial: {
        threshold: 70,
        label: "МИССИЯ НЕ ВЫПОЛНЕНА",
        color: "#ffaa00",
        bg: "rgba(255,170,0,0.12)",
        cssClass: "mission-partial"
    },
    failed: {
        threshold: 0,
        label: "МИССИЯ ПРОВАЛЕНА ✗",
        color: "#ff3333",
        bg: "rgba(255,51,51,0.13)",
        cssClass: "mission-failed"
    }
};

// ==== END GLOBAL DATA ====
// ========================================
// CONFIGURATION DATA
// ========================================
const CONFIGS = {
    small: { levels: 2, nodesPerLevel: [1, 3] },
    medium: { levels: 3, nodesPerLevel: [1, 2, 5] },
    large: { levels: 4, nodesPerLevel: [1, 2, 4, 8] }
};

// FIX #5: Named elements - descriptive names for controllers
const CONTROLLER_NAMES = {
    small: [
        'Главный компьютер',
        'Энергетическая система',
        'Система связи',
        'Навигация'
    ],
    medium: [
        'Главный компьютер',
        'Энергетическая система',
        'Система связи',
        'Подсистема питания А',
        'Подсистема питания Б',
        'Радиомодуль',
        'Сенсоры',
        'Навигационный модуль'
    ],
    large: [
        'Главный компьютер',
        'Энергетическая система',
        'Система связи',
        'Подсистема питания А',
        'Подсистема питания Б',
        'Радиомодуль',
        'Сенсоры',
        'Навигационный модуль',
        'Трансмиттер',
        'Аккумулятор 1',
        'Аккумулятор 2',
        'Реле 1',
        'Реле 2',
        'Антенна А',
        'Антенна Б',
        'Ресивер 1',
        'Ресивер 2'
    ]
};

const COLORS = {
    idle: '#666',
    executing: '#00ff41',
    conflict: '#ff3333',
    waiting: '#ffaa00',
    line: '#2a2e3a'
};

const STATES = {
    IDLE: 'IDLE',
    EXECUTING: 'EXECUTING',
    CONFLICT: 'CONFLICT',
    WAITING: 'WAITING'
};

const ALGORITHMS = {
    priority: 'ПРИОРИТЕТ',
    timestamp: 'ОЧЕРЕДЬ',
    token: 'СПРАВЕДЛИВОЕ',
    voting: 'ГОЛОСОВАНИЕ'
};

// ========================================
// NODE CLASS
// ========================================
class Node {
    constructor(id, level, x, y, displayName = '') {
        this.id = id;
        this.level = level;
        this.x = x;
        this.y = y;
        this.displayName = displayName; // FIX #5: Full descriptive name
        this.state = STATES.IDLE;
        this.parent = null;
        this.children = [];
        
        // FIX #4: Real statistics
        this.conflictsParticipated = 0;
        this.successfulResolutions = 0;
        this.operationsCompleted = 0;
    }

    setState(state) {
        this.state = state;
    }

    getColor() {
        return COLORS[this.state.toLowerCase()] || COLORS.idle;
    }
}

// ========================================
// SIMULATOR CLASS WITH ALL FIXES + DYNAMIC EFFICIENCY
// ========================================
class Simulator {
    constructor(config) {
        this.config = config;
        this.nodes = [];
        this.running = false;
        this.startTime = 0;
        this.currentTime = 0;
        
        // FIX #1: Pause/Resume tracking
        this.paused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        
        // FIX #2: Unified conflict history
        this.conflictHistory = [];
        
        // FIX #3: Scheduled conflicts
        this.scheduledConflicts = [];
        this.nextConflictIndex = 0;
        
        // Statistics
        this.totalOperations = 0;
        this.totalSuccessfulResolutions = 0;
        
        // NEW: Dynamic Efficiency System
        this.currentEfficiency = 70; // Start at 70%
        this.goodDecisionStreak = 0;
        this.badDecisionStreak = 0;
        this.decisionHistory = []; // Track decision quality
        
        this.initializeNodes();
    }

    initializeNodes() {
        const config = CONFIGS[this.config.size];
        const names = CONTROLLER_NAMES[this.config.size] || [];
        let nodeId = 0;
        let allNodes = [];

        for (let level = 0; level < config.levels; level++) {
            const nodesInLevel = config.nodesPerLevel[level];
            const levelNodes = [];

            for (let i = 0; i < nodesInLevel; i++) {
                // FIX #5: Assign display name
                const displayName = names[nodeId] || `Контроллер-${nodeId}`;
                const node = new Node(
                    nodeId++,
                    level,
                    0, // Will be calculated in layout
                    0,
                    displayName
                );
                levelNodes.push(node);
                this.nodes.push(node);
            }

            // Connect to parent level
            if (level > 0) {
                const parentLevel = allNodes[level - 1];
                levelNodes.forEach((node, idx) => {
                    const parentIdx = Math.floor(idx * parentLevel.length / nodesInLevel);
                    const parent = parentLevel[parentIdx];
                    node.parent = parent;
                    parent.children.push(node);
                });
            }

            allNodes.push(levelNodes);
        }
    }

    // FIX #3: Schedule conflicts at start, distributed evenly
    scheduleConflicts() {
        this.scheduledConflicts = [];
        const probability = this.config.probability / 100;
        const duration = this.config.duration;
        
        // Calculate expected number of conflicts
        const expectedConflicts = Math.floor(this.nodes.length * probability * (duration / 10));
        
        if (expectedConflicts === 0) return;
        
        // Distribute conflicts evenly across simulation time
        const timeInterval = duration / expectedConflicts;
        
        for (let i = 0; i < expectedConflicts; i++) {
            // Schedule at evenly distributed times
            const scheduledTime = timeInterval * (i + Math.random() * 0.5);
            
            // Pick 2 random nodes
            const node1 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            let node2 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            
            // Ensure different nodes
            while (node2.id === node1.id) {
                node2 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            }
            
            this.scheduledConflicts.push({
                time: scheduledTime,
                nodes: [node1, node2],
                resource: `Resource-${Math.floor(Math.random() * 5) + 1}`
            });
        }
        
        // Sort by time
        this.scheduledConflicts.sort((a, b) => a.time - b.time);
    }

    start() {
        this.running = true;
        this.startTime = Date.now();
        this.currentTime = 0;
        this.paused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        this.conflictHistory = [];
        this.nextConflictIndex = 0;
        this.totalOperations = 0;
        this.totalSuccessfulResolutions = 0;
        
        // NEW: Reset dynamic efficiency
        this.currentEfficiency = 70;
        this.goodDecisionStreak = 0;
        this.badDecisionStreak = 0;
        this.decisionHistory = [];
        
        // Reset all nodes
        this.nodes.forEach(node => {
            node.state = STATES.IDLE;
            node.conflictsParticipated = 0;
            node.successfulResolutions = 0;
            node.operationsCompleted = 0;
        });
        
        // FIX #3: Schedule conflicts at start
        this.scheduleConflicts();
        
        this.update();
    }

    stop() {
        this.running = false;
        showFinalReport();
    }

    // FIX #1: Pause method - stops time
    pause() {
        if (!this.paused && this.running) {
            this.paused = true;
            this.pauseStartTime = Date.now();
            document.getElementById('pausedIndicator').classList.add('active');
        }
    }

    // FIX #1: Resume method - continues time
    resume() {
        if (this.paused && this.running) {
            this.paused = false;
            this.totalPausedTime += (Date.now() - this.pauseStartTime);
            this.pauseStartTime = 0;
            document.getElementById('pausedIndicator').classList.remove('active');
        }
    }

    getElapsedTime() {
        if (!this.running) return 0;
        
        // FIX #1: Calculate elapsed time excluding paused periods
        let elapsed = Date.now() - this.startTime - this.totalPausedTime;
        
        if (this.paused) {
            elapsed -= (Date.now() - this.pauseStartTime);
        }
        
        return elapsed / 1000; // Convert to seconds
    }

    update() {
        if (!this.running) return;

        // Update current time
        this.currentTime = this.getElapsedTime();

        // Check if simulation should end
        if (this.currentTime >= this.config.duration) {
            this.stop();
            return;
        }

        // FIX #3: Check for scheduled conflicts (only when not paused)
        if (!this.paused && this.nextConflictIndex < this.scheduledConflicts.length) {
            const nextConflict = this.scheduledConflicts[this.nextConflictIndex];
            if (this.currentTime >= nextConflict.time) {
                this.triggerConflict(nextConflict);
                this.nextConflictIndex++;
            }
        }

        // Simulate random state changes (only when not paused)
        if (!this.paused && Math.random() < 0.1) {
            this.nodes.forEach(node => {
                if (node.state === STATES.IDLE && Math.random() < 0.3) {
                    node.setState(STATES.EXECUTING);
                    node.operationsCompleted++;
                    this.totalOperations++;
                } else if (node.state === STATES.EXECUTING && Math.random() < 0.2) {
                    node.setState(STATES.IDLE);
                }
            });
        }

        // Update UI
        updateReport();
        
        // Continue animation
        requestAnimationFrame(() => this.update());
    }

    triggerConflict(conflictData) {
        const { nodes, resource } = conflictData;
        
        // Set nodes to conflict state
        nodes.forEach(node => {
            node.setState(STATES.CONFLICT);
            node.conflictsParticipated++;
        });

        // FIX #1: Pause the simulation
        this.pause();

        // Show conflict modal
        showConflictModal({
            nodes: nodes,
            resource: resource,
            time: this.currentTime
        });
    }

    // Resolve conflict with dynamic efficiency tracking
    resolveConflict(nodes, algorithm) {
        // Determine if decision was good or poor (simple heuristic)
        const isGoodDecision = this.evaluateDecision(nodes, algorithm);
        
        // FIX #2: Add to conflict history with full data
        this.conflictHistory.push({
            time: this.currentTime,
            nodes: nodes.map(n => n.displayName).join(' и '),
            resource: currentConflict.resource,
            algorithm: ALGORITHMS[algorithm],
            timestamp: new Date().toLocaleTimeString('ru-RU'),
            quality: isGoodDecision ? 'good' : 'poor'
        });

        // Update node statistics
        nodes.forEach(node => {
            node.setState(STATES.IDLE);
            node.successfulResolutions++;
        });
        this.totalSuccessfulResolutions++;
        
        // NEW: Update dynamic efficiency
        this.updateEfficiency(isGoodDecision);
        
        // Show feedback message
        showFeedbackMessage(isGoodDecision, this.currentEfficiency);

        // FIX #1: Resume the simulation
        this.resume();
    }
    
    // NEW: Evaluate decision quality
    evaluateDecision(nodes, algorithm) {
        // Simple heuristic: certain algorithms work better for certain scenarios
        // Priority algorithm: good for hierarchical systems (70% good)
        // Timestamp: good for distributed systems (60% good)
        // Token: good for sequential access (50% good)
        // Voting: good for consensus (65% good)
        
        const rand = Math.random();
        
        if (algorithm === 'priority') {
            return rand < 0.7;
        } else if (algorithm === 'timestamp') {
            return rand < 0.6;
        } else if (algorithm === 'voting') {
            return rand < 0.65;
        } else if (algorithm === 'token') {
            return rand < 0.5;
        }
        
        return rand < 0.5;
    }
    
    // NEW: Update efficiency based on decision quality
    updateEfficiency(isGood) {
        this.decisionHistory.push(isGood);
        
        if (isGood) {
            // Good decision: +2.5%
            this.currentEfficiency += 2.5;
            this.goodDecisionStreak++;
            this.badDecisionStreak = 0;
            
            // Streak bonus: +1% every 3 good decisions
            if (this.goodDecisionStreak >= 3 && this.goodDecisionStreak % 3 === 0) {
                this.currentEfficiency += 1;
            }
        } else {
            // Poor decision: -3.5%
            this.currentEfficiency -= 3.5;
            this.badDecisionStreak++;
            this.goodDecisionStreak = 0;
        }
        
        // Cap efficiency at 70-95%
        this.currentEfficiency = Math.max(70, Math.min(95, this.currentEfficiency));
    }

    // NEW: Return current dynamic efficiency
    calculateEfficiency() {
        return this.currentEfficiency;
    }
}

// ========================================
// CANVAS VISUALIZATION
// ========================================
class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        if (simulator && simulator.nodes.length > 0) {
            this.calculateLayout();
            this.draw();
        }
    }

    calculateLayout() {
        if (!simulator) return;

        const config = CONFIGS[simulator.config.size];
        const width = this.canvas.width;
        const height = this.canvas.height;
        const levels = config.levels;
        
        const verticalSpacing = height / (levels + 1);

        let nodeIndex = 0;
        for (let level = 0; level < levels; level++) {
            const nodesInLevel = config.nodesPerLevel[level];
            const horizontalSpacing = width / (nodesInLevel + 1);

            for (let i = 0; i < nodesInLevel; i++) {
                const node = simulator.nodes[nodeIndex++];
                node.x = horizontalSpacing * (i + 1);
                node.y = verticalSpacing * (level + 1);
            }
        }
    }

    draw() {
        if (!simulator) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        simulator.nodes.forEach(node => {
            if (node.parent) {
                ctx.strokeStyle = COLORS.line;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(node.parent.x, node.parent.y);
                ctx.lineTo(node.x, node.y);
                ctx.stroke();
            }
        });

        // Draw nodes
        simulator.nodes.forEach(node => {
            const radius = 25;
            
            // Outer glow for active states
            if (node.state !== STATES.IDLE) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = node.getColor();
            } else {
                ctx.shadowBlur = 0;
            }

            // Draw circle
            ctx.fillStyle = node.getColor();
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Reset shadow
            ctx.shadowBlur = 0;

            // Draw label (N1, N2, N3...)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`N${node.id+1}`, node.x, node.y);
        });
        
        // FIX #5: Store node positions for tooltip handling
        this.nodePositions = simulator.nodes.map(node => ({
            x: node.x,
            y: node.y,
            radius: 25,
            node: node
        }));
    }
    
    // FIX #5: Get node at mouse position for tooltip
    getNodeAtPosition(x, y) {
        if (!this.nodePositions) return null;
        
        for (let pos of this.nodePositions) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= pos.radius) {
                return pos.node;
            }
        }
        return null;
    }
}

// ========================================
// UI MANAGEMENT
// ========================================
let simulator = null;
let visualizer = null;
let currentConflict = null;

function initUI() {
    const canvas = document.getElementById('canvas');
    visualizer = new Visualizer(canvas);
    
    // FIX #5: Add tooltip for controller names
    setupTooltip(canvas);

    // Size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Sliders
    const probabilitySlider = document.getElementById('probabilitySlider');
    const probabilityValue = document.getElementById('probabilityValue');
    probabilitySlider.addEventListener('input', (e) => {
        probabilityValue.textContent = e.target.value + '%';
    });

    const durationSlider = document.getElementById('durationSlider');
    const durationValue = document.getElementById('durationValue');
    durationSlider.addEventListener('input', (e) => {
        durationValue.textContent = e.target.value + 'с';
    });

    // Start button
    document.getElementById('startBtn').addEventListener('click', startSimulation);

    // Stop button
    document.getElementById('stopBtn').addEventListener('click', () => {
        if (simulator) {
            simulator.stop();
        }
    });

    // Algorithm buttons
    document.querySelectorAll('.algo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const algorithm = btn.getAttribute('data-algo');
            handleConflictResolution(algorithm);
        });
    });

    // Close final report modal button
    document.getElementById('closeFinalModal').addEventListener('click', () => {
        document.getElementById('finalModal').classList.remove('active');
    });

    // Start animation loop
    animate();
}

function startSimulation() {
    const size = document.querySelector('.size-btn.active').getAttribute('data-size');
    const probability = parseInt(document.getElementById('probabilitySlider').value);
    const duration = parseInt(document.getElementById('durationSlider').value);

    const config = {
        size: size,
        probability: probability,
        duration: duration
    };

    simulator = new Simulator(config);
    visualizer.calculateLayout();
    simulator.start();

    // Update button states
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    // Clear conflict log
    document.getElementById('conflictLog').innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Ожидание конфликтов...</div>';
}

function showConflictModal(conflict) {
    currentConflict = conflict;
    
    // FIX #5: Show display names in conflict modal
    // NEW FEATURE #3: Show as 'N#: Имя'
    document.getElementById('conflictNodes').textContent = 
        conflict.nodes.map(n => n.displayName).join(', ');
    document.getElementById('conflictResource').textContent = conflict.resource;
    
    document.getElementById('conflictModal').classList.add('active');
}

function handleConflictResolution(algorithm) {
    if (!simulator || !currentConflict) return;

    // Hide modal
    document.getElementById('conflictModal').classList.remove('active');

    // Resolve conflict
    simulator.resolveConflict(currentConflict.nodes, algorithm);
    
    currentConflict = null;
}

function updateReport() {
    if (!simulator || !simulator.running) return;

    // Update elapsed time
    document.getElementById('elapsedTime').textContent = 
        simulator.currentTime.toFixed(1) + 'с';

    // FIX #2: Use conflictHistory for conflicts processed
    document.getElementById('conflictsProcessed').textContent = 
        simulator.conflictHistory.length;

    // Show successful resolutions
    document.getElementById('successfulResolutions').textContent = 
        simulator.totalSuccessfulResolutions;

    // FIX #4: Use real operations count
    document.getElementById('operationsCompleted').textContent = 
        simulator.totalOperations;

    // NEW: Show dynamic efficiency
    const efficiency = simulator.calculateEfficiency();
    document.getElementById('efficiency').textContent = efficiency.toFixed(1) + '%';
    
    // NEW: Update decision streak
    document.getElementById('streakValue').textContent = simulator.goodDecisionStreak;
    document.getElementById('streakLabel').textContent = 
        simulator.goodDecisionStreak > 0 
            ? 'Подряд хороших решений' 
            : (simulator.badDecisionStreak > 0 ? 'Подряд плохих решений' : 'Решений пока нет');

    // FIX #2: Update conflict log from conflictHistory
    updateConflictLog();
}

function updateConflictLog() {
    if (!simulator) return;
    
    const log = document.getElementById('conflictLog');
    
    if (simulator.conflictHistory.length === 0) {
        log.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">Конфликтов пока нет</div>';
        return;
    }

    // Show last 10 conflicts
    const recentConflicts = simulator.conflictHistory.slice(-10).reverse();
    
    log.innerHTML = recentConflicts.map(conflict => `
        <div style="background: rgba(255, 51, 51, 0.1); padding: 8px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid var(--accent-red);">
            <div style="color: var(--accent-orange); font-weight: bold;">${conflict.nodes}</div>
            <div style="color: var(--text); font-size: 11px; margin-top: 3px;">
                📦 ${conflict.resource} | ⏱ ${conflict.time.toFixed(1)}s
            </div>
            <div style="color: var(--accent-green); font-size: 11px; margin-top: 3px;">
                ✓ ${conflict.algorithm}
            </div>
        </div>
    `).join('');
}

function showFinalReport() {
    if (!simulator) return;

    // Update button states
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;

    // FIX #2: Use conflictHistory for final report
    document.getElementById('finalDuration').textContent = 
        simulator.currentTime.toFixed(1) + 'с';
    
    document.getElementById('finalConflicts').textContent = 
        simulator.conflictHistory.length;
    
    document.getElementById('finalResolutions').textContent = 
        simulator.totalSuccessfulResolutions;
    
    document.getElementById('finalOperations').textContent = 
        simulator.totalOperations;

    // NEW: Show final dynamic efficiency
    const efficiency = simulator.calculateEfficiency();
    document.getElementById('finalEfficiency').textContent = efficiency.toFixed(1) + '%';
    
    // Show efficiency change indicator
    const efficiencyChange = efficiency - 70;
    const changeText = efficiencyChange > 0 ? `+${efficiencyChange.toFixed(1)}%` : `${efficiencyChange.toFixed(1)}%`;
    const changeColor = efficiencyChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    document.getElementById('finalEfficiency').innerHTML = `
        ${efficiency.toFixed(1)}% 
        <span style="font-size: 14px; color: ${changeColor};">(${changeText})</span>
    `;

    // FIX #4 & FIX #5: Show real controller statistics with display names
    const statsContainer = document.getElementById('controllerStats');
    statsContainer.innerHTML = simulator.nodes.map(node => `
        <div class="controller-card">
            <div class="controller-name">${node.displayName} (Уровень ${node.level})</div>
            <div class="controller-stat">
                <span>Участие в конфликтах:</span>
                <span style="color: var(--accent-red);">${node.conflictsParticipated}</span>
            </div>
            <div class="controller-stat">
                <span>Успешных разрешений:</span>
                <span style="color: var(--accent-green);">${node.successfulResolutions}</span>
            </div>
            <div class="controller-stat">
                <span>Операций выполнено:</span>
                <span style="color: var(--accent-blue);">${node.operationsCompleted}</span>
            </div>
        </div>
    `).join('');

    // Show modal
    document.getElementById('finalModal').classList.add('active');
}

function animate() {
    if (visualizer) {
        visualizer.draw();
    }
    requestAnimationFrame(animate);
}

// FIX #5: Tooltip functionality for showing controller names
function setupTooltip(canvas) {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
    tooltip.style.color = '#00ff41';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '13px';
    tooltip.style.fontWeight = 'bold';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.border = '2px solid #00aaff';
    tooltip.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.5)';
    document.body.appendChild(tooltip);
    
    canvas.addEventListener('mousemove', (e) => {
        if (!simulator || !visualizer) {
            tooltip.style.display = 'none';
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const node = visualizer.getNodeAtPosition(x, y);
        
        if (node) {
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            tooltip.innerHTML = `
                <div style="margin-bottom: 4px;"><b>${node.displayName}</b></div>
                <div style="font-size: 11px; color: #00aaff;">ID: N${node.id+1} | Уровень: ${node.level}</div>
                <div style="font-size: 11px; color: #ffaa00; margin-top: 4px;">Состояние: ${node.state}</div>
            `;
        } else {
            tooltip.style.display = 'none';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

// NEW: Theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Set default theme to dark
    body.setAttribute('data-theme', 'dark');
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        
        if (newTheme === 'light') {
            themeToggle.textContent = '🌙 Темная тема';
        } else {
            themeToggle.textContent = '☀️ Светлая тема';
        }
        
        // Redraw canvas with new theme
        if (visualizer) {
            visualizer.draw();
        }
    });
}

// NEW: Show feedback message for decisions
function showFeedbackMessage(isGood, newEfficiency) {
    const feedbackEl = document.getElementById('feedbackMessage');
    
    if (isGood) {
        feedbackEl.className = 'feedback-message good active';
        feedbackEl.textContent = '✓ Хороший выбор! +2.5%';
    } else {
        feedbackEl.className = 'feedback-message poor active';
        feedbackEl.textContent = '✗ Плохой выбор -3.5%';
    }
    
    // Hide after 2 seconds
    setTimeout(() => {
        feedbackEl.classList.remove('active');
    }, 2000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    initThemeToggle();
    initAlgorithmHelp();
    initProgressBar();
});

// ==== NEW FEATURES ====

// 1. Algorithm Explanation Modal
function initAlgorithmHelp() {
    const btn = document.getElementById('algoHelpBtn');
    const modal = document.getElementById('algoExpModal');
    const closeBtn = document.getElementById('algoExpModalClose');
    btn.addEventListener('click', () => { modal.style.display = 'flex'; });
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    // ESC to close
    document.addEventListener('keydown', e => {
        if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc'))
            modal.style.display = 'none';
    });
}

// 2. Progress Bar toward 80% goal
function initProgressBar() {
    const bar = document.getElementById('effProgressBar');
    const label = document.getElementById('effProgressLabel');

    function updateBar() {
        if (!simulator) {
            bar.style.width = '10%';
            label.textContent = '70.0%';
            return;
        }
        let eff = (typeof simulator.calculateEfficiency === 'function') ? simulator.calculateEfficiency() : 70;
        eff = Math.max(0, Math.min(eff, 100));
        bar.style.width = eff + '%';
        label.textContent = eff.toFixed(1) + '%';
        // Paint green below 80%, blue above, red if dropped
        if (eff >= 80) {
            bar.style.background = '#00ff41';
        } else if (eff >= 70) {
            bar.style.background = '#ffaa00';
        } else {
            bar.style.background = '#ff3333';
        }
    }
    setInterval(updateBar, 300);
}

// 3. Update MISSION STATUS in final report
function showFinalReport() {
    if (!simulator) return;

    // Update button states
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;

    // FIX #2: Use conflictHistory for final report
    document.getElementById('finalDuration').textContent = 
        simulator.currentTime.toFixed(1) + 'с';
    
    document.getElementById('finalConflicts').textContent = 
        simulator.conflictHistory.length;
    
    document.getElementById('finalResolutions').textContent = 
        simulator.totalSuccessfulResolutions;
    
    document.getElementById('finalOperations').textContent = 
        simulator.totalOperations;

    // NEW: Show final dynamic efficiency
    const efficiency = simulator.calculateEfficiency();
    document.getElementById('finalEfficiency').textContent = efficiency.toFixed(1) + '%';
    
    // Show efficiency change indicator
    const efficiencyChange = efficiency - 70;
    const changeText = efficiencyChange > 0 ? `+${efficiencyChange.toFixed(1)}%` : `${efficiencyChange.toFixed(1)}%`;
    const changeColor = efficiencyChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    document.getElementById('finalEfficiency').innerHTML = `
        ${efficiency.toFixed(1)}% 
        <span style="font-size: 14px; color: ${changeColor};">(${changeText})</span>
    `;

    // NEW: Final status
    const missionStatus = document.getElementById('missionStatusBanner');
    if (efficiency >= MISSION_STATUS.success.threshold) {
        missionStatus.textContent = MISSION_STATUS.success.label;
        missionStatus.className = `mission-status ${MISSION_STATUS.success.cssClass}`;
        missionStatus.style.display = 'block';
    } else if (efficiency >= MISSION_STATUS.partial.threshold) {
        missionStatus.textContent = MISSION_STATUS.partial.label;
        missionStatus.className = `mission-status ${MISSION_STATUS.partial.cssClass}`;
        missionStatus.style.display = 'block';
    } else {
        missionStatus.textContent = MISSION_STATUS.failed.label;
        missionStatus.className = `mission-status ${MISSION_STATUS.failed.cssClass}`;
        missionStatus.style.display = 'block';
    }

    // Controllers stats
    const statsContainer = document.getElementById('controllerStats');
    statsContainer.innerHTML = simulator.nodes.map(node => `
        <div class="controller-card">
            <div class="controller-name">${node.displayName} (Уровень ${node.level})</div>
            <div class="controller-stat">
                <span>Участие в конфликтах:</span>
                <span style="color: var(--accent-red);">${node.conflictsParticipated}</span>
            </div>
            <div class="controller-stat">
                <span>Успешных разрешений:</span>
                <span style="color: var(--accent-green);">${node.successfulResolutions}</span>
            </div>
            <div class="controller-stat">
                <span>Операций выполнено:</span>
                <span style="color: var(--accent-blue);">${node.operationsCompleted}</span>
            </div>
        </div>
    `).join('');
    // Show modal
    document.getElementById('finalModal').classList.add('active');
}
// ==== END NEW FEATURES ====