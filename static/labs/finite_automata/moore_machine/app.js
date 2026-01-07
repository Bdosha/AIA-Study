// Класс для представления состояния автомата
class State {
    /**
     * @param {number} x - X координата на canvas
     * @param {number} y - Y координата на canvas
     * @param {string} id - Уникальный идентификатор
     * @param {string} name - Имя состояния (q0, q1, и т.д.)
     * @param {string} output - Выходное значение
     * @param {boolean} isInitial - Является ли начальным состоянием
     */
    constructor(x, y, id, name, output, isInitial = false) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.name = name;
        this.output = output;
        this.isInitial = isInitial;
    }
}

// Класс для представления перехода между состояниями
class Transition {
    /**
     * @param {State} from - Исходное состояние
     * @param {State} to - Целевое состояние
     * @param {string} input - Входной символ
     * @param {string} id - Уникальный идентификатор
     */
    constructor(from, to, input, id) {
        this.from = from;
        this.to = to;
        this.input = input;
        this.id = id;
    }
}

// Класс для управления симуляцией автомата
class SimulationEngine {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentStep = 0;
        this.startTime = null;
        this.speed = 1;
        this.intervalId = null;
        this.simulationTimer = null;
        this.inputSequence = [];
        this.currentInputIndex = 0;
        this.currentState = null;
        this.currentAutomaton = null;
        this.trace = [];
    }

    startSimulation(automaton, input) {
        if (this.isRunning) return;

        this.reset();
        this.isRunning = true;
        this.currentAutomaton = automaton;
        this.startTime = Date.now();
        this.currentState = automaton.initialState;
        redrawCanvas();

        this.inputSequence = input.includes(',') ? input.split(',') : input.split('');
        this.currentInputIndex = 0;

        this.trace.push({
            step: 0,
            input: '-',
            state: this.currentState.name,
            output: this.currentState.output
        });

        this.updateSimulationDisplay();

        this.intervalId = setInterval(() => this.simulationStep(this.currentAutomaton), 1000 / this.speed);
        this.simulationTimer = setInterval(() => this.updateTimer(), 100);
    }

    pauseSimulation() {
        this.isPaused = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    resumeSimulation(automaton) {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.intervalId = setInterval(() => this.simulationStep(this.currentAutomaton), 1000 / this.speed);
    }

    /**
     * @param {Object} automaton - Автомат для симуляции
     */
    simulationStep(automaton) {
        if (this.currentInputIndex >= this.inputSequence.length) {
            this.stopSimulation();
            return;
        }

        const inputSymbol = this.inputSequence[this.currentInputIndex];
        const transition = automaton.transitions.find(t => 
            t.from === this.currentState && t.input === inputSymbol
        );

        if (!transition) {
            this.stopSimulation();
            updateStatus(`Нет перехода из состояния ${this.currentState.name} по входу ${inputSymbol}`, 'error');
            return;
        }

        this.currentState = transition.to;
        this.currentStep = ++this.currentInputIndex;

        this.trace.push({
            step: this.currentStep,
            input: inputSymbol,
            state: this.currentState.name,
            output: this.currentState.output
        });

        this.updateSimulationDisplay();
        redrawCanvas();
    }

    stopSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.simulationTimer) {
            clearInterval(this.simulationTimer);
        }
    }

    reset() {
        this.stopSimulation();
        this.currentStep = 0;
        this.startTime = null;
        this.inputSequence = [];
        this.currentInputIndex = 0;
        this.currentState = null;
        this.currentAutomaton = null;
        this.trace = [];
        this.updateSimulationDisplay();
    }

    /**
     * @param {number} newSpeed - Скорость симуляции (1-10)
     */
    setSpeed(newSpeed) {
        this.speed = newSpeed;
        if (this.isRunning && !this.isPaused) {
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => this.simulationStep(this.currentAutomaton), 1000 / this.speed);
        }
    }

    updateSimulationDisplay() {
        const stepCounter = document.getElementById('step-counter');
        if (stepCounter) {
            stepCounter.textContent = this.currentStep;
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timer = document.getElementById('sim-timer');
        if (timer) {
            timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Класс для управления темами
class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    /**
     * @param {string} theme - Тема ('light' или 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.checked = (theme === 'light');
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        redrawCanvas();
    }

    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('change', () => this.toggleTheme());
        }
    }
}

// Конфигурации примеров автоматов
const presetConfigurations = {
    '1': {
        basic: {
            states: [
                { name: 'q0', output: 'А', x: 150, y: 150, isInitial: true },
                { name: 'q1', output: 'Б', x: 300, y: 150 }
            ],
            transitions: [
                { from: 'q0', to: 'q1', input: '0' },
                { from: 'q0', to: 'q0', input: '1' },
                { from: 'q1', to: 'q0', input: '0' },
                { from: 'q1', to: 'q1', input: '1' }
            ]
        },
        extended: {
            states: [
                { name: 'q0', output: 'А', x: 150, y: 100, isInitial: true },
                { name: 'q1', output: 'Б', x: 350, y: 100 },
                { name: 'q2', output: 'В', x: 250, y: 250 }
            ],
            transitions: [
                { from: 'q0', to: 'q2', input: '0' },
                { from: 'q0', to: 'q1', input: '1' },
                { from: 'q1', to: 'q0', input: '0' },
                { from: 'q1', to: 'q2', input: '1' },
                { from: 'q2', to: 'q1', input: '0' },
                { from: 'q2', to: 'q0', input: '1' }
            ]
        }
    }
};

// Глобальные переменные
let automaton = {
    states: [],
    transitions: [],
    initialState: null,
    currentState: null
};

let canvas, ctx;
let selectedState = null;
let dragState = null;
let mode = 'select';
let startTime = null;
let timerInterval = null;
let themeManager = null;
let simulationEngine = null;

// Переменные для управления масштабом и панорамированием
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;

// Инициализация приложения
function initApp() {
    try {
        console.log('Initializing application...');
        themeManager = new ThemeManager();
        simulationEngine = new SimulationEngine();
        initializeEventListeners();
        showPage('main-page');
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

// Ожидание загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    console.log('Setting up event listeners...');
    try {
        setupMainPageListeners();
        setupTaskPageListeners();
        setupModalListeners();
        setupSimulationControls();
        setupPresetControls();
        setupZoomControls();
        document.addEventListener('keydown', handleKeyPress);
        console.log('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Настройка обработчиков главной страницы
function setupMainPageListeners() {
    const goToTheoryBtn = document.getElementById('go-to-theory');
    if (goToTheoryBtn) {
        goToTheoryBtn.addEventListener('click', () => showPage('task-page'));
    }
}

// Настройка обработчиков страницы задания
function setupTaskPageListeners() {
    const backToMainBtn = document.getElementById('back-to-main');
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => showPage('main-page'));
    }

    const goToDesignBtn = document.getElementById('go-to-design');
    if (goToDesignBtn) {
        goToDesignBtn.addEventListener('click', goToDesign);
    }

    const backToTaskBtn = document.getElementById('back-to-task');
    if (backToTaskBtn) {
        backToTaskBtn.addEventListener('click', () => showPage('task-page'));
    }
}

// Настройка модальных окон
function setupModalListeners() {
    const createStateBtn = document.getElementById('create-state');
    if (createStateBtn) {
        createStateBtn.addEventListener('click', createState);
    }

    const cancelStateBtn = document.getElementById('cancel-state');
    if (cancelStateBtn) {
        cancelStateBtn.addEventListener('click', () => hideModal('state-modal'));
    }

    const createTransitionBtn = document.getElementById('create-transition');
    if (createTransitionBtn) {
        createTransitionBtn.addEventListener('click', createTransition);
    }

    const cancelTransitionBtn = document.getElementById('cancel-transition');
    if (cancelTransitionBtn) {
        cancelTransitionBtn.addEventListener('click', () => hideModal('transition-modal'));
    }

    const closeCelebrationBtn = document.getElementById('close-celebration');
    if (closeCelebrationBtn) {
        closeCelebrationBtn.addEventListener('click', () => hideModal('fireworks-modal'));
    }
}

// Настройка элементов управления симуляцией
function setupSimulationControls() {
    const simStart = document.getElementById('sim-start');
    if (simStart) {
        simStart.addEventListener('click', startSimulation);
    }

    const simPause = document.getElementById('sim-pause');
    if (simPause) {
        simPause.addEventListener('click', pauseSimulation);
    }

    const simStep = document.getElementById('sim-step');
    if (simStep) {
        simStep.addEventListener('click', stepSimulation);
    }

    const simReset = document.getElementById('sim-reset');
    if (simReset) {
        simReset.addEventListener('click', resetSimulation);
    }

    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
        speedSlider.addEventListener('input', function() {
            const speed = parseFloat(this.value);
            simulationEngine.setSpeed(speed);
            const speedValue = document.getElementById('speed-value');
            if (speedValue) {
                speedValue.textContent = speed + 'x';
            }
        });
    }
}

// Настройка элементов управления примерами
function setupPresetControls() {
    const loadPresetBtn = document.getElementById('load-preset');
    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', loadPreset);
    }
}

// Настройка элементов управления масштабом
function setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');

    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (resetViewBtn) resetViewBtn.addEventListener('click', resetView);
}

function zoomIn() {
    scale = Math.min(MAX_SCALE, scale + SCALE_STEP);
    redrawCanvas();
    updateStatus(`Масштаб: ${Math.round(scale * 100)}%`, 'info');
}

function zoomOut() {
    scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
    redrawCanvas();
    updateStatus(`Масштаб: ${Math.round(scale * 100)}%`, 'info');
}

function resetView() {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    redrawCanvas();
    updateStatus('Вид сброшен', 'info');
}

// Функции симуляции
function startSimulation() {
    const input = document.getElementById('test-string').value.trim();
    if (!input) {
        alert('Введите входную последовательность');
        return;
    }

    if (!automaton.initialState) {
        alert('Установите начальное состояние');
        return;
    }

    simulationEngine.startSimulation(automaton, input);
    updateStatus('Симуляция запущена', 'success');
}

function pauseSimulation() {
    if (simulationEngine.isRunning) {
        if (simulationEngine.isPaused) {
            simulationEngine.resumeSimulation(automaton);
            updateStatus('Симуляция возобновлена', 'info');
        } else {
            simulationEngine.pauseSimulation();
            updateStatus('Симуляция приостановлена', 'warning');
        }
    }
}

function stepSimulation() {
    const input = document.getElementById('test-string').value.trim();
    if (!input) {
        alert('Введите входную последовательность');
        return;
    }

    if (!simulationEngine.isRunning) {
        simulationEngine.reset();
        simulationEngine.currentState = automaton.initialState;
        simulationEngine.inputSequence = input.includes(',') ? input.split(',') : input.split('');
        simulationEngine.currentInputIndex = 0;
        simulationEngine.trace.push({
            step: 0,
            input: '-',
            state: simulationEngine.currentState.name,
            output: simulationEngine.currentState.output
        });
    }

    simulationEngine.simulationStep(automaton);
    updateStatus(`Шаг: ${simulationEngine.currentStep}`, 'info');
}

function resetSimulation() {
    simulationEngine.reset();
    updateStatus('Симуляция сброшена', 'info');
    redrawCanvas();
}

// Загрузка примеров
function loadPreset() {
    const selector = document.getElementById('preset-selector');
    if (!selector || !selector.value) return;

    // Используем базовый пример вместо логики с вариантами
    const presetKey = '1';
    const presetType = selector.value;

    if (!presetConfigurations[presetKey] || !presetConfigurations[presetKey][presetType]) {
        alert('Выбранный пример недоступен');
        return;
    }

    const preset = presetConfigurations[presetKey][presetType];

    automaton = {
        states: [],
        transitions: [],
        initialState: null,
        currentState: null
    };

    preset.states.forEach((stateData, index) => {
        const state = new State(
            stateData.x,
            stateData.y,
            Date.now() + index,
            stateData.name,
            stateData.output,
            stateData.isInitial
        );
        automaton.states.push(state);
        if (state.isInitial) {
            automaton.initialState = state;
        }
    });

    preset.transitions.forEach((transData, index) => {
        const fromState = automaton.states.find(s => s.name === transData.from);
        const toState = automaton.states.find(s => s.name === transData.to);

        if (fromState && toState) {
            const transition = new Transition(
                fromState,
                toState,
                transData.input,
                Date.now() + index + 1000
            );
            automaton.transitions.push(transition);
        }
    });

    resetView();
    updateTransitionTable();
    redrawCanvas();
    updateStatus('Пример загружен', 'success');
}

function goToDesign() {
    try {
        showPage('design-page');
        startTimer();
    } catch (error) {
        console.error('Error in goToDesign:', error);
    }
}

// Настройка обработчиков страницы проектирования
function setupDesignPageListeners() {
    const addStateBtn = document.getElementById('add-state');
    if (addStateBtn && !addStateBtn.hasAttribute('data-listener-added')) {
        addStateBtn.addEventListener('click', () => setMode('addState'));
        addStateBtn.setAttribute('data-listener-added', 'true');
    }

    const addTransitionBtn = document.getElementById('add-transition');
    if (addTransitionBtn && !addTransitionBtn.hasAttribute('data-listener-added')) {
        addTransitionBtn.addEventListener('click', () => setMode('addTransition'));
        addTransitionBtn.setAttribute('data-listener-added', 'true');
    }

    const setInitialBtn = document.getElementById('set-initial');
    if (setInitialBtn && !setInitialBtn.hasAttribute('data-listener-added')) {
        setInitialBtn.addEventListener('click', setInitialState);
        setInitialBtn.setAttribute('data-listener-added', 'true');
    }

    const deleteElementBtn = document.getElementById('delete-element');
    if (deleteElementBtn && !deleteElementBtn.hasAttribute('data-listener-added')) {
        deleteElementBtn.addEventListener('click', () => setMode('delete'));
        deleteElementBtn.setAttribute('data-listener-added', 'true');
    }

    const clearAllBtn = document.getElementById('clear-all');
    if (clearAllBtn && !clearAllBtn.hasAttribute('data-listener-added')) {
        clearAllBtn.addEventListener('click', clearAutomaton);
        clearAllBtn.setAttribute('data-listener-added', 'true');
    }

    const simulateBtn = document.getElementById('simulate');
    if (simulateBtn && !simulateBtn.hasAttribute('data-listener-added')) {
        simulateBtn.addEventListener('click', simulateAutomaton);
        simulateBtn.setAttribute('data-listener-added', 'true');
    }

    const checkCorrectnessBtn = document.getElementById('check-correctness');
    if (checkCorrectnessBtn && !checkCorrectnessBtn.hasAttribute('data-listener-added')) {
        checkCorrectnessBtn.addEventListener('click', checkCorrectness);
        checkCorrectnessBtn.setAttribute('data-listener-added', 'true');
    }

    const saveAutomatonBtn = document.getElementById('save-automaton');
    if (saveAutomatonBtn && !saveAutomatonBtn.hasAttribute('data-listener-added')) {
        saveAutomatonBtn.addEventListener('click', saveAutomaton);
        saveAutomatonBtn.setAttribute('data-listener-added', 'true');
    }

    const exportPngBtn = document.getElementById('export-png');
    if (exportPngBtn && !exportPngBtn.hasAttribute('data-listener-added')) {
        exportPngBtn.addEventListener('click', exportToPNG);
        exportPngBtn.setAttribute('data-listener-added', 'true');
    }

    const resetAutomatonBtn = document.getElementById('reset-automaton');
    if (resetAutomatonBtn && !resetAutomatonBtn.hasAttribute('data-listener-added')) {
        resetAutomatonBtn.addEventListener('click', resetAutomaton);
        resetAutomatonBtn.setAttribute('data-listener-added', 'true');
    }

    initializeCanvas();
}

// Инициализация canvas
function initializeCanvas() {
    canvas = document.getElementById('automaton-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }

    ctx = canvas.getContext('2d');

    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 32;
    canvas.height = container.clientHeight - 32;

    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('dblclick', onCanvasDoubleClick);
    canvas.addEventListener('wheel', onCanvasWheel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    redrawCanvas();
}

// Переключение страниц
function showPage(pageId) {
    try {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.classList.add('hidden');
        });

        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('active');
        }

        if (pageId === 'design-page') {
            setTimeout(() => {
                initializeCanvas();
                setupDesignPageListeners();
            }, 100);
        }
    } catch (error) {
        console.error('Error showing page:', error);
    }
}

// Управление таймером
function startTimer() {
    startTime = new Date();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = new Date() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Установка режима работы
function setMode(newMode) {
    mode = newMode;
    if (canvas) {
        canvas.style.cursor = newMode === 'addState' ? 'crosshair' : 
                             newMode === 'delete' ? 'not-allowed' : 'default';
    }

    const statusMap = {
        'select': 'Режим выбора',
        'addState': 'Кликните на рабочую область, чтобы добавить состояние',
        'addTransition': 'Выберите два состояния для создания перехода',
        'delete': 'Кликните на элемент для удаления'
    };

    updateStatus(statusMap[mode] || '', 'info');
}

// Обновление статуса
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.innerHTML = `${message}`;
    }
}

// Обработчики событий Canvas
function onCanvasMouseDown(e) {
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / scale;
    const y = (e.clientY - rect.top - offsetY) / scale;

    if (e.button === 2) { // Правая кнопка мыши для панорамирования
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (e.button === 0) { // Левая кнопка мыши
        const clickedState = getStateAt(x, y);

        switch (mode) {
            case 'addState':
                if (!clickedState) {
                    showModal('state-modal', { x: x * scale + offsetX, y: y * scale + offsetY });
                }
                break;

            case 'addTransition':
                if (clickedState) {
                    if (!selectedState) {
                        selectedState = clickedState;
                        updateStatus('Выберите целевое состояние', 'info');
                        redrawCanvas();
                    } else if (selectedState !== clickedState) {
                        showTransitionModal(selectedState, clickedState);
                        selectedState = null;
                    } else {
                        showTransitionModal(selectedState, clickedState);
                        selectedState = null;
                    }
                }
                break;

            case 'delete':
                if (clickedState) {
                    deleteState(clickedState);
                }
                break;

            case 'select':
            default:
                if (clickedState) {
                    dragState = clickedState;
                    canvas.style.cursor = 'move';
                    selectedState = clickedState;
                } else {
                    selectedState = null;
                }
                redrawCanvas();
                break;
        }
    }
}

function onCanvasMouseMove(e) {
    if (isPanning) {
        const dx = e.clientX - lastPanX;
        const dy = e.clientY - lastPanY;
        offsetX += dx;
        offsetY += dy;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        redrawCanvas();
        return;
    }

    if (dragState && mode === 'select' && canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;

        dragState.x = Math.max(30, Math.min(canvas.width - 30, x));
        dragState.y = Math.max(30, Math.min(canvas.height - 30, y));

        redrawCanvas();
    }
}

function onCanvasMouseUp(e) {
    if (e.button === 2) { // Правая кнопка мыши
        isPanning = false;
        canvas.style.cursor = mode === 'addState' ? 'crosshair' : 
                             mode === 'delete' ? 'not-allowed' : 'default';
        return;
    }

    if (dragState) {
        dragState = null;
        if (canvas) {
            canvas.style.cursor = mode === 'addState' ? 'crosshair' : 
                                 mode === 'delete' ? 'not-allowed' : 'default';
        }
    }
}

function onCanvasDoubleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / scale;
    const y = (e.clientY - rect.top - offsetY) / scale;

    const clickedState = getStateAt(x, y);
    if (clickedState) {
        editStateProperties(clickedState);
    }
}

function onCanvasWheel(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const newScale = scale * (1 + wheel * zoomIntensity);

    if (newScale < MIN_SCALE || newScale > MAX_SCALE) return;

    const scaleFactor = newScale / scale;
    offsetX = mouseX - (mouseX - offsetX) * scaleFactor;
    offsetY = mouseY - (mouseY - offsetY) * scaleFactor;

    scale = newScale;
    redrawCanvas();
}

// Получение состояния по координатам
function getStateAt(x, y) {
    return automaton.states.find(state => {
        const dx = state.x - x;
        const dy = state.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= 30 / scale;
    });
}

// Управление модальными окнами
function showModal(modalId, data) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('hidden');

    if (modalId === 'state-modal') {
        modal.dataset.x = data.x;
        modal.dataset.y = data.y;
        
        const nameInput = document.getElementById('state-name');
        const outputInput = document.getElementById('state-output');
        
        if (nameInput) {
            nameInput.value = `q${automaton.states.length}`;
            nameInput.focus();
        }
        
        if (outputInput) {
            outputInput.value = 'А';
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Создание модального окна для переходов
function showTransitionModal(fromState, toState) {
    const modal = document.getElementById('transition-modal');
    if (!modal) return;

    const fromSelect = document.getElementById('from-state');
    const toSelect = document.getElementById('to-state');

    if (fromSelect && toSelect) {
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        automaton.states.forEach(state => {
            fromSelect.innerHTML += `<option value="${state.id}">${state.name}</option>`;
            toSelect.innerHTML += `<option value="${state.id}">${state.name}</option>`;
        });

        fromSelect.value = fromState.id;
        toSelect.value = toState.id;

        const inputSymbolElement = document.getElementById('input-symbol');
        if (inputSymbolElement) {
            inputSymbolElement.value = '';
            inputSymbolElement.focus();
        }
    }

    modal.classList.remove('hidden');
}

// Создание состояния
function createState() {
    const modal = document.getElementById('state-modal');
    const nameInput = document.getElementById('state-name');
    const outputInput = document.getElementById('state-output');

    if (!modal || !nameInput) return;

    const name = nameInput.value.trim();
    const output = outputInput ? outputInput.value.trim() : '';
    const x = parseFloat(modal.dataset.x) / scale - offsetX / scale;
    const y = parseFloat(modal.dataset.y) / scale - offsetY / scale;

    if (!name) {
        alert('Введите имя состояния');
        return;
    }

    if (automaton.states.find(s => s.name === name)) {
        alert('Состояние с таким именем уже существует');
        return;
    }

    const state = new State(x, y, Date.now(), name, output, automaton.states.length === 0);
    automaton.states.push(state);

    if (state.isInitial) {
        automaton.initialState = state;
    }

    hideModal('state-modal');
    setMode('select');
    updateTransitionTable();
    redrawCanvas();
    updateStatus(`Состояние ${name} создано`, 'success');
}

// Создание перехода
function createTransition() {
    const fromStateId = document.getElementById('from-state').value;
    const toStateId = document.getElementById('to-state').value;
    const inputSymbolElement = document.getElementById('input-symbol');

    if (!inputSymbolElement) return;

    const inputSymbol = inputSymbolElement.value.trim();

    if (!inputSymbol) {
        alert('Введите входной символ');
        return;
    }

    const fromState = automaton.states.find(s => s.id === parseInt(fromStateId));
    const toState = automaton.states.find(s => s.id === parseInt(toStateId));

    if (!fromState || !toState) {
        alert('Ошибка: состояния не найдены');
        return;
    }

    const existingTransition = automaton.transitions.find(t => 
        t.from === fromState && t.input === inputSymbol
    );

    if (existingTransition) {
        alert('Переход с таким входным символом уже существует');
        return;
    }

    const transition = new Transition(fromState, toState, inputSymbol, Date.now());
    automaton.transitions.push(transition);

    hideModal('transition-modal');
    setMode('select');
    updateTransitionTable();
    redrawCanvas();
    updateStatus(`Переход ${fromState.name} → ${toState.name} (${inputSymbol}) создан`, 'success');
}

// Отрисовка состояния
function drawState(state) {
    const radius = 30;

    ctx.beginPath();
    ctx.arc(state.x, state.y, radius, 0, 2 * Math.PI);

    if (state === selectedState) {
        ctx.fillStyle = '#FFC185';
        ctx.strokeStyle = '#D2BA4C';
        ctx.lineWidth = 3;
    } else if (state === simulationEngine.currentState) {
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
    } else if (state.isInitial) {
        ctx.fillStyle = '#1FB8CD';
        ctx.strokeStyle = '#13343B';
        ctx.lineWidth = 3;
    } else {
        ctx.fillStyle = '#1FB8CD';
        ctx.strokeStyle = '#134A5B';
        ctx.lineWidth = 2;
    }

    ctx.fill();
    ctx.stroke();

    // Имя состояния
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.name, state.x, state.y - 5);

    // Выходное значение
    if (state.output) {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDarkTheme ? '#FFFFFF' : '#134A5B';
        ctx.font = '12px Arial';
        ctx.fillText(state.output, state.x, state.y + 45);
    }

    // Стрелка начального состояния
    if (state.isInitial) {
        ctx.beginPath();
        ctx.moveTo(state.x - 50, state.y);
        ctx.lineTo(state.x - 35, state.y);
        ctx.strokeStyle = '#13343B';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(state.x - 35, state.y);
        ctx.lineTo(state.x - 42, state.y - 5);
        ctx.moveTo(state.x - 35, state.y);
        ctx.lineTo(state.x - 42, state.y + 5);
        ctx.stroke();
    }
}

// ⚠️ МОДИФИЦИРОВАННАЯ функция отрисовки переходов (с группировкой)
function drawTransitionGroup(group) {
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const from = group.from;
    const to = group.to;

    if (from === to) {
        drawSelfLoopGroup(group);
        return;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hasReverse = automaton.transitions.some(t => t.from === to && t.to === from);

    const radius = 30;
    const startX = from.x + (dx / distance) * radius;
    const startY = from.y + (dy / distance) * radius;
    const endX = to.x - (dx / distance) * radius;
    const endY = to.y - (dy / distance) * radius;

    ctx.beginPath();

    if (hasReverse) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const offsetX = -dy / distance * 20;
        const offsetY = dx / distance * 20;
        const controlX = midX + offsetX;
        const controlY = midY + offsetY;

        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    } else {
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
    }

    ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    const angle = Math.atan2(dy, dx);
    const arrowLength = 10;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - arrowLength * Math.cos(angle - Math.PI / 6),
        endY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - arrowLength * Math.cos(angle + Math.PI / 6),
        endY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    let labelX, labelY;
    if (hasReverse) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const offsetX = -dy / distance * 20;
        const offsetY = dx / distance * 20;
        labelX = midX + offsetX;
        labelY = midY + offsetY - 10;
    } else {
        labelX = (startX + endX) / 2;
        labelY = (startY + endY) / 2 - 10;
    }

    ctx.fillStyle = isDarkTheme ? '#ffffff' : '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    // ⚠️ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: объединяем входные символы через запятую
    const labelText = group.inputs.sort().join(', ');
    ctx.fillText(labelText, labelX, labelY);
}

function drawSelfLoopGroup(group) {
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const state = group.from;
    const stateRadius = 30;
    const loopRadius = 25;

    // Центр петли справа от состояния
    const centerX = state.x + stateRadius + loopRadius;
    const centerY = state.y;

    // Рисуем полный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, loopRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = isDarkTheme ? '#ffffff' : '#333333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ИСПРАВЛЕННАЯ СТРЕЛКА - на точке соединения с состоянием
    const connectionAngle = Math.PI; // 180 градусов - точка ближайшая к состоянию
    const arrowX = centerX + loopRadius * Math.cos(connectionAngle);
    const arrowY = centerY + loopRadius * Math.sin(connectionAngle);

    // Стрелка направлена по касательной к окружности (по часовой стрелке)
    const tangentAngle = connectionAngle + Math.PI / 2; // касательная
    const arrowSize = 8;
    
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX + arrowSize * Math.cos(tangentAngle - 0.3), 
               arrowY + arrowSize * Math.sin(tangentAngle - 0.3));
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX + arrowSize * Math.cos(tangentAngle + 0.3), 
               arrowY + arrowSize * Math.sin(tangentAngle + 0.3));
    ctx.stroke();

    // Подпись
    ctx.fillStyle = isDarkTheme ? '#ffffff' : '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const labelText = group.inputs.sort().join(', ');
    ctx.fillText(labelText, centerX, centerY - loopRadius - 10);
}


// ⚠️ МОДИФИЦИРОВАННАЯ функция перерисовки canvas (с группировкой)
function redrawCanvas() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // ⚠️ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: группируем переходы перед отрисовкой
    const transitionGroups = groupTransitions();
    transitionGroups.forEach(group => {
        if (group.from === group.to) {
            drawSelfLoopGroup(group);
        } else {
            drawTransitionGroup(group);
        }
    });

    automaton.states.forEach(state => {
        drawState(state);
    });

    ctx.restore();
}

// Функция симуляции
function runSimulation(input) {
    let currentState = automaton.initialState;
    let output = [];
    let trace = [];
    let success = true;
    let errorMessage = '';

    output.push(currentState.output);
    trace.push({
        step: 0,
        input: '-',
        state: currentState.name,
        output: currentState.output
    });

    const inputSymbols = input.includes(',') ? input.split(',') : input.split('');

    for (let i = 0; i < inputSymbols.length; i++) {
        const symbol = inputSymbols[i];
        const transition = automaton.transitions.find(t => 
            t.from === currentState && t.input === symbol
        );

        if (!transition) {
            success = false;
            errorMessage = `Нет перехода из состояния ${currentState.name} по входу ${symbol}`;
            break;
        }

        currentState = transition.to;
        output.push(currentState.output);

        trace.push({
            step: i + 1,
            input: symbol,
            state: currentState.name,
            output: currentState.output
        });
    }

    return {
        success,
        errorMessage,
        input,
        output: output.join(','),
        finalState: currentState.name,
        trace
    };
}

// Очистка автомата
function clearAutomaton() {
    if (automaton.states.length === 0) return;

    if (confirm('Очистить автомат?')) {
        automaton = {
            states: [],
            transitions: [],
            initialState: null,
            currentState: null
        };

        selectedState = null;
        simulationEngine.reset();
        updateTransitionTable();
        redrawCanvas();
        clearSimulationResults();
        updateStatus('Автомат очищен', 'info');
    }
}

// Сброс автомата
function resetAutomaton() {
    clearAutomaton();
    setMode('select');
    selectedState = null;
    simulationEngine.reset();

    const checkResults = document.getElementById('check-results');
    if (checkResults) {
        checkResults.classList.add('hidden');
    }
}

// Установка начального состояния
function setInitialState() {
    if (!selectedState) {
        alert('Выберите состояние для установки в качестве начального');
        return;
    }

    automaton.states.forEach(state => (state.isInitial = false));
    selectedState.isInitial = true;
    automaton.initialState = selectedState;

    updateTransitionTable();
    redrawCanvas();
    updateStatus(`${selectedState.name} установлено как начальное состояние`, 'success');
}

// Удаление состояния
function deleteState(state) {
    automaton.transitions = automaton.transitions.filter(t => t.from !== state && t.to !== state);
    automaton.states = automaton.states.filter(s => s !== state);

    if (automaton.initialState === state) {
        automaton.initialState = null;
    }

    selectedState = null;
    updateTransitionTable();
    redrawCanvas();
    updateStatus(`Состояние ${state.name} удалено`, 'success');
}

// Экспорт в PNG
function exportToPNG() {
    if (!canvas) {
        alert('Canvas не найден');
        return;
    }

    const link = document.createElement('a');
    link.download = `moore-automaton.png`;
    link.href = canvas.toDataURL();
    link.click();
    updateStatus('Схема сохранена как PNG', 'success');
}

// Обработка нажатий клавиш
function handleKeyPress(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'Delete':
        case 'Backspace':
            if (selectedState && mode === 'select') {
                deleteState(selectedState);
            }
            break;

        case 'Escape':
            setMode('select');
            selectedState = null;
            redrawCanvas();
            break;

        case 's':
            if (e.ctrlKey) {
                e.preventDefault();
                saveAutomaton();
            }
            break;
    }
}

// Редактирование свойств состояния
function editStateProperties(state) {
    const newName = prompt('Новое имя состояния:', state.name);
    if (newName && newName !== state.name) {
        if (automaton.states.find(s => s !== state && s.name === newName)) {
            alert('Состояние с таким именем уже существует');
            return;
        }
        state.name = newName;
    }

    const newOutput = prompt('Новое выходное значение:', state.output);
    if (newOutput !== null) {
        state.output = newOutput;
    }

    updateTransitionTable();
    redrawCanvas();
}

// Обновление таблицы переходов
function updateTransitionTable() {
    const container = document.getElementById('transition-table');
    if (!container) return;

    if (automaton.states.length === 0) {
        container.innerHTML = `
        <div class="info-message">
            <p>Добавьте состояния для просмотра таблицы переходов</p>
        </div>`;
        return;
    }

    const inputSymbols = [...new Set(automaton.transitions.map(t => t.input))].sort();
    
    if (inputSymbols.length === 0) {
        container.innerHTML = `
        <div class="info-message">
            <p>Добавьте переходы для просмотра таблицы</p>
        </div>`;
        return;
    }

    let html = `
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Состояние</th>
                    <th>Выход</th>`;
    
    inputSymbols.forEach(symbol => {
        html += `<th>${symbol}</th>`;
    });
    
    html += `</tr></thead><tbody>`;

    automaton.states.forEach(state => {
        html += `<tr>
            <td>${state.name}${state.isInitial ? ' (нач.)' : ''}</td>
            <td>${state.output || '-'}</td>`;
        
        inputSymbols.forEach(symbol => {
            const transition = automaton.transitions.find(t => t.from === state && t.input === symbol);
            html += `<td>${transition ? transition.to.name : '-'}</td>`;
        });
        
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    const traceElement = document.getElementById('trace-table');
    if (traceElement) {
        traceElement.innerHTML = `
        <div class="info-message">
            <p>Запустите симуляцию для просмотра результатов</p>
        </div>`;
    }

    const traceHistoryElement = document.getElementById('trace-history');
    if (traceHistoryElement) {
        traceHistoryElement.innerHTML = `
        <div class="info-message">
            <p>История переходов будет отображена здесь</p>
        </div>`;
    }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Отображение результатов проверки корректности
function displayCorrectnessResults(errors, warnings) {
    const resultsContainer = document.getElementById('check-results');
    if (!resultsContainer) {
        console.error('Элемент check-results не найден');
        // Создаем временное уведомление, если элемент не найден
        const tempMessage = errors.length > 0 || warnings.length > 0 ? 
            `Ошибки: ${errors.join(', ')}. Предупреждения: ${warnings.join(', ')}` : 
            'Автомат корректен';
        updateStatus(`Результат проверки: ${tempMessage}`, 
                    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success');
        return;
    }

    let html = '<div class="correctness-results">';

    if (errors.length === 0 && warnings.length === 0) {
        html += '<div class="success-message"><h3>✅ Автомат корректен</h3><p>Ошибок и предупреждений не найдено</p></div>';
    } else {
        if (errors.length > 0) {
            html += '<div class="error-message"><h3>❌ Ошибки:</h3><ul>';
            errors.forEach(error => {
                html += `<li>${error}</li>`;
            });
            html += '</ul></div>';
        }

        if (warnings.length > 0) {
            html += '<div class="warning-message"><h3>⚠️ Предупреждения:</h3><ul>';
            warnings.forEach(warning => {
                html += `<li>${warning}</li>`;
            });
            html += '</ul></div>';
        }
    }

    html += '</div>';
    resultsContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');
}

// Проверка корректности
function checkCorrectness() {
    const errors = [];
    const warnings = [];

    if (automaton.states.length === 0) {
        errors.push('Нет состояний');
    }

    if (!automaton.initialState) {
        errors.push('Не установлено начальное состояние');
    }

    if (automaton.transitions.length === 0) {
        warnings.push('Нет переходов');
    }

    const transitionMap = new Map();
    automaton.transitions.forEach(t => {
        const key = `${t.from.id}${t.input}`;
        if (transitionMap.has(key)) {
            errors.push(`Дублирующий переход из ${t.from.name} по входу ${t.input}`);
        }
        transitionMap.set(key, t);
    });

    const inputAlphabet = [...new Set(automaton.transitions.map(t => t.input))];
    automaton.states.forEach(state => {
        inputAlphabet.forEach(symbol => {
            const hasTransition = automaton.transitions.some(t => t.from === state && t.input === symbol);
            if (!hasTransition) {
                warnings.push(`Нет перехода из ${state.name} по входу ${symbol}`);
            }
        });
    });

    displayCorrectnessResults(errors, warnings);
}

// Симуляция автомата
function simulateAutomaton() {
    const inputElement = document.getElementById('test-string');
    if (!inputElement) return;

    const input = inputElement.value.trim();
    if (!input) {
        alert('Введите входную последовательность');
        return;
    }

    if (!automaton.initialState) {
        alert('Установите начальное состояние');
        return;
    }

    const result = runSimulation(input);
    displaySimulationResults(result);
}

// Отображение результатов симуляции
function displaySimulationResults(result) {
    const resultsContainer = document.getElementById('simulation-results');
    const traceContainer = document.getElementById('trace-log');

    if (!resultsContainer || !traceContainer) return;

    // Результаты симуляции (левая панель)
    let resultsHtml = '';
    if (result.success) {
        resultsHtml = `
            <div class="success-message">
                <h3>✓ Симуляция выполнена успешно</h3>
                <p><strong>Входная последовательность:</strong> ${result.input}</p>
                <p><strong>Выходная последовательность:</strong> ${result.output}</p>
                <p><strong>Финальное состояние:</strong> ${result.finalState}</p>
            </div>
        `;
    } else {
        resultsHtml = `
            <div class="error-message">
                <h3>✗ Ошибка симуляции</h3>
                <p><strong>Сообщение ошибки:</strong> ${result.errorMessage}</p>
            </div>
        `;
    }

    resultsContainer.innerHTML = resultsHtml;

    // Журнал выполнения (правая панель - trace-log)
    let traceHtml = '';
    if (result.trace && result.trace.length > 0) {
        result.trace.forEach(step => {
            traceHtml += `<div class="trace-step">Шаг ${step.step}: ${step.input} → ${step.state} (${step.output})</div>`;
        });
    }

    traceContainer.innerHTML = traceHtml;

    // Вывод в консоль браузера
    console.log('=== ЖУРНАЛ ВЫПОЛНЕНИЯ АВТОМАТА ===');
    console.log(`Успех: ${result.success}`);
    if (result.success) {
        console.log(`Входная последовательность: ${result.input}`);
        console.log(`Выходная последовательность: ${result.output}`);
        console.log(`Финальное состояние: ${result.finalState}`);
    } else {
        console.log(`Ошибка: ${result.errorMessage}`);
    }
    console.log('Шаги симуляции:');
    result.trace.forEach(step => {
        console.log(`Шаг ${step.step}: ${step.input} → ${step.state} (${step.output})`);
    });
    console.log('===================================');
}

// Очистка результатов симуляции
function clearSimulationResults() {
    const resultsContainer = document.getElementById('simulation-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
    }
}

// Сохранение автомата
function saveAutomaton() {
    try {
        const data = {
            states: automaton.states.map(s => ({
                x: s.x,
                y: s.y,
                id: s.id,
                name: s.name,
                output: s.output,
                isInitial: s.isInitial
            })),
            transitions: automaton.transitions.map(t => ({
                fromId: t.from.id,
                toId: t.to.id,
                input: t.input,
                id: t.id
            }))
        };

        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = 'moore-automaton.json';
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        updateStatus('Автомат сохранен', 'success');
    } catch (error) {
        console.error('Error saving automaton:', error);
        updateStatus('Ошибка сохранения', 'error');
    }
}

// ⚠️ ДОБАВЛЕННАЯ функция группировки переходов
function groupTransitions() {
    const groups = new Map();
    
    automaton.transitions.forEach(transition => {
        const key = `${transition.from.id}-${transition.to.id}`;
        
        if (!groups.has(key)) {
            groups.set(key, {
                from: transition.from,
                to: transition.to,
                inputs: [],
                transitions: []
            });
        }
        
        const group = groups.get(key);
        if (!group.inputs.includes(transition.input)) {
            group.inputs.push(transition.input);
        }
        group.transitions.push(transition);
    });
    
    return Array.from(groups.values());
}