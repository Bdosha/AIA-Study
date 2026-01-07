/**
 * @file main.js - Главный файл приложения, инициализирующий все компоненты
 */

// Глобальные переменные приложения
let appModel = null;
let appSimulator = null;
let graphView = null;
let probabilityPanel = null;
let simulationControl = null;
let stateVisualization = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

function initializeApplication() {
    console.log('Начало инициализации приложения');
    
    // 1. Инициализация модели данных
    appModel = new AutomataModel();
    console.log('Модель создана:', appModel);
    
    // 2. Создание автомата по умолчанию
    const automatonId = appModel.createAutomaton('Мой автомат');
    console.log('Автомат создан, ID:', automatonId);
    console.log('Текущий автомат:', appModel.currentAutomaton);
    
    // 3. Инициализация симулятора
    appSimulator = new AutomataSimulator(appModel);
    console.log('Симулятор инициализирован');
    
    // 4. Инициализация UI компонентов
    initializeUIComponents();
    console.log('Компоненты инициализированы');
    
    // 5. Настройка обработчиков событий
    setupEventHandlers();
    console.log('Обработчики событий настроены');
    
    // 6. Первоначальная отрисовка
    updateUI();
    
    console.log('Приложение инициализировано полностью');
}

/**
 * Инициализирует все UI компоненты
 */
function initializeUIComponents() {
    // Граф автомата
    const graphContainer = document.getElementById('graph-view');
    graphView = new GraphView(graphContainer, appModel.currentAutomaton);
    window.graphView = graphView;
    
    // Панель вероятностей (нужно создать этот класс)
    probabilityPanel = new ProbabilityPanel(document.getElementById('probability-panel'), appModel, graphView);
    window.probabilityPanel = probabilityPanel;
    
    // Управление симуляцией - ПЕРЕДАЕМ ВСЕ НУЖНЫЕ ПАРАМЕТРЫ
    const simulationContainer = document.querySelector('.main-content .section .controls');
    if (simulationContainer) {
        simulationControl = new SimulationControl(simulationContainer, graphView, appSimulator, appModel);
        window.simulationControl = simulationControl; // Для отладки
    } else {
        console.error('Не найден контейнер для управления симуляцией');
    }
    
    // Визуализация состояний (нужно создать этот класс)
    stateVisualization = new StateVisualization(document.getElementById('state-settings'), appModel);
    window.stateVisualization = stateVisualization;
}

/**
 * Настраивает обработчики событий
 */
function setupEventHandlers() {
    // Переключение темы
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    document.addEventListener('automatonUpdated', () => {
        console.debug('MAIN: automatonUpdated event received');
        try {
            if (!appModel || !appModel.currentAutomaton) {
                console.warn('MAIN: appModel или currentAutomaton отсутствует', { appModel });
                return;
            }
            // лог перед анализом
            console.debug('MAIN: calling analyzeAutomatonProperties with automaton:', appModel.currentAutomaton);
            const analysis = analyzeAutomatonProperties(appModel.currentAutomaton);
            console.log('✅ Выполнен анализ автомата:', analysis);
            try {
                updatePropertiesPanel(analysis);
            } catch (e) {
                console.error('Ошибка при updatePropertiesPanel:', e);
            }
        } catch (err) {
            console.error('Ошибка в обработчике automatonUpdated:', err);
        }
    document.getElementById('import-json').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && simulationControl) {
            simulationControl.importAutomaton(file);
        }
    });
});

    
    // Кнопки управления автоматом
    // document.getElementById('add-state').addEventListener('click', graphView.addNewState);
    // document.getElementById('add-symbol').addEventListener('click', graphView.addNewSymbol);
    // document.getElementById('validate').addEventListener('click', graphView.validateAutomaton);
    // document.getElementById('matricesButton').addEventListener('click', showMatricesModal);
    
    // Проверка строки
    // document.getElementById('check-string').addEventListener('click', graphView.checkInputString);
    
    // Анализ свойств
    // document.getElementById('analyze-properties').addEventListener('click', graphView.analyzeProperties);
}

/**
 * Обновляет весь интерфейс
 */
function updateUI() {
    if (graphView) {
        graphView.render();
    }

    updateProbabilityPanel();

    // 🔍 После отрисовки анализируем автомат и обновляем свойства
    // if (appModel && appModel.currentAutomaton) {
    //     const analysis = analyzeAutomatonProperties(appModel.currentAutomaton);
    //     updatePropertiesPanel(analysis);
    //     console.log("✅ Выполнен анализ автомата:", analysis);
    // }
}

function analyzeAutomatonProperties(automaton) {
    // Предполагается, что MarkovAnalyzer и ErgodicityAnalyzer доступны глобально
    let markov = { isMarkov: false };
    let erg = { irreducible: false, aperiodicity: false, isErgodic: false };

    try {
        if (typeof MarkovAnalyzer !== 'undefined' && automaton && typeof automaton.getTransitionMatrix === 'function') {
            markov = MarkovAnalyzer.analyze(automaton);
        }
    } catch (e) {
        console.warn('Markov analysis failed:', e);
    }

    try {
        if (typeof ErgodicityAnalyzer !== 'undefined' && automaton && typeof automaton.getTransitionMatrix === 'function') {
            const matrix = automaton.getTransitionMatrix();
            const ergRes = (typeof ErgodicityAnalyzer.analyze === 'function') ? ErgodicityAnalyzer.analyze(matrix) : {};
            // нормализуем имена полей, чтобы дальше код был устойчив
            erg = {
                irreducible: ergRes.irreducible ?? ergRes.isIrreducible ?? false,
                aperiodicity: ergRes.aperiodicity ?? ergRes.isAperiodic ?? false,
                isErgodic: (ergRes.isErgodic ?? ( (ergRes.irreducible ?? ergRes.isIrreducible) && (ergRes.aperiodicity ?? ergRes.isAperiodic) ) ) ?? false
            };
        }
    } catch (e) {
        console.warn('Ergodicity analysis failed:', e);
    }

    return {
        isValid: true,
        properties: {
            markov,
            ergodicity: erg,
            irreducibility: { isIrreducible: erg.irreducible },
            aperiodicity: { isAperiodic: erg.aperiodicity }
        }
    };
}

function updateProbabilityPanel() {
    probabilityPanel.update();
}

/**
 * Обновляет индикаторы свойств на правой панели
 */
function updatePropertiesPanel(analysis) {
    const markers = {
        markov: document.getElementById('markov-property'),
        ergodicity: document.getElementById('ergodicity-property'),
        irreducibility: document.getElementById('irreducibility-property'),
        aperiodicity: document.getElementById('aperiodicity-property')
    };

    // если анализа нет или он невалиден — ставим "не выполняется"
    if (!analysis || !analysis.isValid) {
        for (const key in markers) {
            if (markers[key]) {
                markers[key].textContent = `${capitalize(key)}: не выполняется`;
                markers[key].className = 'property-indicator invalid';
            }
        }
        return;
    }

    const props = analysis.properties || {};
    // берём значения из унифицированного объекта
    const isMarkov = props.markov?.isMarkov ?? false;
    const isIrreducible = props.irreducibility?.isIrreducible ?? props.ergodicity?.irreducible ?? false;
    const isAperiodic = props.aperiodicity?.isAperiodic ?? props.ergodicity?.aperiodicity ?? false;

    const isErgodic = isIrreducible && isAperiodic; // эргодичность — только при выполнении обоих свойств

    // Марковость
    if (markers.markov) {
        markers.markov.textContent = `Марковость: ${isMarkov ? 'выполняется' : 'не выполняется'}`;
        markers.markov.className = `property-indicator ${isMarkov ? 'valid' : 'invalid'}`;
    }

    // Эргодичность
    if (markers.ergodicity) {
        markers.ergodicity.textContent = `Эргодичность: ${isErgodic ? 'выполняется' : 'не выполняется'}`;
        markers.ergodicity.className = `property-indicator ${isErgodic ? 'valid' : 'invalid'}`;
    }

    // Неприводимость
    if (markers.irreducibility) {
        markers.irreducibility.textContent = `Неприводимость: ${isIrreducible ? 'выполняется' : 'не выполняется'}`;
        markers.irreducibility.className = `property-indicator ${isIrreducible ? 'valid' : 'invalid'}`;
    }

    // Апериодичность
    if (markers.aperiodicity) {
        markers.aperiodicity.textContent = `Апериодичность: ${isAperiodic ? 'выполняется' : 'не выполняется'}`;
        markers.aperiodicity.className = `property-indicator ${isAperiodic ? 'valid' : 'invalid'}`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}


/**
 * Обновляет панель статистики
 */
function updateStatisticsPanel() {
    // Заглушка - нужно реализовать
}

/**
 * Обновляет график распределения
 */
function updateDistributionChart() {
    // Заглушка - нужно реализовать
}

/**
 * Переключает тему
 */
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    
    const button = document.getElementById('themeToggle');
    button.textContent = newTheme === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема';
}

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeApplication,
        addNewState,
        addNewSymbol,
        validateAutomaton
    };
}