// ui.js - ПОЛНОСТЬЮ ПЕРЕРАБОТАННАЯ ВЕРСИЯ
class UIManager {
    constructor(app) {
        this.app = app;
        this.currentPage = 'constructor';
        this.network = null;
        this.networkData = null;
        this.initializeUI();
    }

    initializeUI() {
        this.createPageNavigation();
        this.createPresetButtons();
        this.createAutomatonForm();
        this.createConnectionForm();
        this.createSystemControls();
        this.createAlphabetControls();
        this.createVisualizationPage();
        this.showPage('constructor');
        this.updateInterface();
    }

    createPageNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
            });
        });
    }

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${pageName}-page`).classList.add('active');
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
        
        this.currentPage = pageName;
        
        if (pageName === 'visualization') {
            setTimeout(() => {
                this.updateGraphVisualization();
            }, 100);
        }
    }

    createPresetButtons() {
        const presetContainer = document.getElementById('preset-buttons');
        if (!presetContainer) return;

        presetContainer.innerHTML = `
            <button class="preset-btn" data-preset="sensor-lamp">🏠 Датчик-Лампа</button>
            <button class="preset-btn" data-preset="nfa">🎲 Пример NFA</button>
            <button class="preset-btn" data-preset="sequential">🔗 Последовательная</button>
        `;

        presetContainer.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.loadPreset(preset);
            });
        });
    }

    loadPreset(presetName) {
        let system;
        switch(presetName) {
            case 'sensor-lamp':
                system = createSensorLampSystem();
                break;
            case 'nfa':
                system = createNFAExample();
                break;
            case 'sequential':
                system = createSequentialSystem();
                break;
            default:
                return;
        }
        
        this.app.setSystem(system);
        this.updateInterface();
        
        if (this.currentPage === 'visualization') {
            this.updateGraphVisualization();
        }
    }

    createAutomatonForm() {
        const formContainer = document.getElementById('automaton-form');
        if (!formContainer) return;

        formContainer.innerHTML = `
            <h3>➕ Создать новый автомат</h3>
            <div class="form-group">
                <label>📝 Название автомата:</label>
                <input type="text" id="automaton-name" placeholder="Введите название" value="Автомат1">
            </div>
            <div class="form-group">
                <label>🔧 Тип автомата:</label>
                <select id="automaton-type">
                    <option value="${AutomatonType.ACTIVE}">🟢 Активный (реагирует на символы)</option>
                    <option value="${AutomatonType.PASSIVE}">🔵 Пассивный (реагирует только на связи)</option>
                </select>
            </div>
            
            <div class="form-section">
                <h4>🏷️ Состояния автомата</h4>
                <div class="form-group">
                    <label>Список состояний (через запятую):</label>
                    <input type="text" id="states-input" placeholder="q0, q1, q2" value="q0,q1,q2">
                </div>
                <div class="form-group">
                    <label>🚀 Начальное состояние:</label>
                    <select id="start-state">
                        <option value="q0">q0</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>🏁 Конечные состояния (через запятую):</label>
                    <input type="text" id="final-states" placeholder="q2" value="q2">
                </div>
            </div>

            <div class="form-section" id="transitions-section">
                <h4>📋 Переходы между состояниями</h4>
                <div class="transitions-editor">
                    <table>
                        <thead>
                            <tr>
                                <th>Из состояния</th>
                                <th>Символ</th>
                                <th>В состояние</th>
                                <th>Действие</th>
                            </tr>
                        </thead>
                        <tbody id="transitions-table">
                            <tr>
                                <td>
                                    <select class="transition-from">
                                        <option value="q0">q0</option>
                                    </select>
                                </td>
                                <td><input type="text" class="transition-symbol" placeholder="a" value="a"></td>
                                <td>
                                    <select class="transition-to">
                                        <option value="q1">q1</option>
                                    </select>
                                </td>
                                <td><button class="remove-transition btn-danger">❌</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <button id="add-transition" class="btn-secondary">➕ Добавить переход</button>
                </div>
            </div>

            <div class="form-actions">
                <button id="create-automaton-btn" class="btn-primary">✅ Создать автомат</button>
                <button id="clear-form" class="btn-secondary">🗑️ Очистить форму</button>
            </div>
        `;

        document.getElementById('states-input').addEventListener('input', () => {
            this.updateStateSelectors();
        });

        document.getElementById('add-transition').addEventListener('click', () => this.addTransitionRow());
        document.getElementById('create-automaton-btn').addEventListener('click', () => this.createAutomaton());
        document.getElementById('clear-form').addEventListener('click', () => this.clearAutomatonForm());

        this.updateStateSelectors();
    }

    updateStateSelectors() {
        const statesInput = document.getElementById('states-input').value;
        const stateNames = statesInput.split(',').map(s => s.trim()).filter(s => s);
        
        if (stateNames.length === 0) {
            stateNames.push('q0');
        }

        // Обновляем start-state select
        const startStateSelect = document.getElementById('start-state');
        startStateSelect.innerHTML = '';
        stateNames.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            startStateSelect.appendChild(option);
        });

        // Обновляем переходы в таблице
        const fromSelects = document.querySelectorAll('.transition-from');
        const toSelects = document.querySelectorAll('.transition-to');
        
        [fromSelects, toSelects].forEach(selects => {
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '';
                stateNames.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state;
                    option.textContent = state;
                    select.appendChild(option);
                });
                if (stateNames.includes(currentValue)) {
                    select.value = currentValue;
                }
            });
        });
    }

    addTransitionRow() {
        const table = document.getElementById('transitions-table');
        const row = document.createElement('tr');
        
        const statesInput = document.getElementById('states-input').value;
        const stateNames = statesInput.split(',').map(s => s.trim()).filter(s => s);
        if (stateNames.length === 0) stateNames.push('q0');
        
        const fromSelectHtml = stateNames.map(state => 
            `<option value="${state}">${state}</option>`
        ).join('');
        
        const toSelectHtml = stateNames.map(state => 
            `<option value="${state}">${state}</option>`
        ).join('');
        
        row.innerHTML = `
            <td>
                <select class="transition-from">
                    ${fromSelectHtml}
                </select>
            </td>
            <td><input type="text" class="transition-symbol" placeholder="a"></td>
            <td>
                <select class="transition-to">
                    ${toSelectHtml}
                </select>
            </td>
            <td><button class="remove-transition btn-danger">❌</button></td>
        `;
        table.appendChild(row);
        
        row.querySelector('.remove-transition').addEventListener('click', () => {
            table.removeChild(row);
        });
    }

    createAutomaton() {
        const name = document.getElementById('automaton-name').value.trim() || `Автомат${this.app.automatonCounter}`;
        const type = document.getElementById('automaton-type').value;
        const statesInput = document.getElementById('states-input').value;
        const startState = document.getElementById('start-state').value;
        const finalStatesInput = document.getElementById('final-states').value;

        if (!name) {
            alert('❌ Введите название автомата');
            return;
        }

        if (!statesInput.trim()) {
            alert('❌ Введите хотя бы одно состояние');
            return;
        }

        try {
            const stateNames = statesInput.split(',').map(s => s.trim()).filter(s => s);
            if (stateNames.length === 0) {
                alert('❌ Введите корректные состояния');
                return;
            }

            const states = stateNames.map(stateName => new State(stateName, name));
            
            const startStateObj = states.find(s => s.name === startState);
            if (!startStateObj) {
                alert('❌ Начальное состояние не найдено в списке состояний');
                return;
            }

            const finalStateNames = finalStatesInput.split(',').map(f => f.trim()).filter(f => f);
            const finalStates = states.filter(s => finalStateNames.includes(s.name));

            const transitions = new Set();
            if (type === AutomatonType.ACTIVE) {
                const transitionRows = document.querySelectorAll('#transitions-table tr');
                let hasValidTransition = false;

                transitionRows.forEach(row => {
                    const fromSelect = row.querySelector('.transition-from');
                    const symbolInput = row.querySelector('.transition-symbol');
                    const toSelect = row.querySelector('.transition-to');
                    
                    const fromState = fromSelect ? fromSelect.value.trim() : '';
                    const symbol = symbolInput ? symbolInput.value.trim() : '';
                    const toState = toSelect ? toSelect.value.trim() : '';
                    
                    if (fromState && symbol && toState) {
                        const fromStateObj = states.find(s => s.name === fromState);
                        const toStateObj = states.find(s => s.name === toState);
                        
                        if (fromStateObj && toStateObj) {
                            transitions.add(new Transition(fromStateObj, toStateObj, symbol));
                            hasValidTransition = true;
                        }
                    }
                });

                if (!hasValidTransition) {
                    alert('⚠️ Автомат создан без переходов. Добавьте переходы для активного автомата.');
                }
            }

            const automaton = new Automaton(
                name,
                new Set(states),
                transitions,
                startStateObj,
                new Set(finalStates),
                new Set([startStateObj]),
                type
            );

            this.app.system.addAutomaton(automaton);
            this.app.automatonCounter++;
            
            alert(`✅ Автомат "${name}" успешно создан!`);
            this.updateInterface();
            
        } catch (error) {
            alert(`❌ Ошибка создания автомата: ${error.message}`);
        }
    }

    clearAutomatonForm() {
        if (confirm('Очистить форму создания автомата?')) {
            document.getElementById('automaton-name').value = `Автомат${this.app.automatonCounter}`;
            document.getElementById('states-input').value = 'q0,q1,q2';
            document.getElementById('final-states').value = 'q2';
            
            const table = document.getElementById('transitions-table');
            table.innerHTML = '';
            this.addTransitionRow();
            
            this.updateStateSelectors();
        }
    }

    createConnectionForm() {
        this.updateConnectionForm();
        
        document.getElementById('create-connection-btn').addEventListener('click', () => this.createConnection());
        document.getElementById('clear-connections').addEventListener('click', () => this.clearAllConnections());
        
        document.getElementById('connection-from-automaton').addEventListener('change', (e) => {
            this.updateConnectionStates('from', e.target.value);
        });
        
        document.getElementById('connection-to-automaton').addEventListener('change', (e) => {
            this.updateConnectionStates('to', e.target.value);
        });
    }

    updateConnectionForm() {
        const fromSelect = document.getElementById('connection-from-automaton');
        const toSelect = document.getElementById('connection-to-automaton');
        
        if (!fromSelect || !toSelect) return;
        
        const currentFrom = fromSelect.value;
        const currentTo = toSelect.value;
        
        fromSelect.innerHTML = '<option value="">-- Выберите автомат --</option>';
        toSelect.innerHTML = '<option value="">-- Выберите автомат --</option>';
        
        this.app.system.automata.forEach((automaton, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${automaton.automatonType === AutomatonType.ACTIVE ? 'активный' : 'пассивный'})`;
            fromSelect.appendChild(option.cloneNode(true));
            toSelect.appendChild(option);
        });
        
        if (currentFrom && this.app.system.automata.has(currentFrom)) {
            fromSelect.value = currentFrom;
            this.updateConnectionStates('from', currentFrom);
        }
        
        if (currentTo && this.app.system.automata.has(currentTo)) {
            toSelect.value = currentTo;
            this.updateConnectionStates('to', currentTo);
        }
    }

    updateConnectionStates(direction, automatonName) {
        const stateSelect = document.getElementById(`connection-${direction}-state`);
        if (!stateSelect || !automatonName) return;
        
        const automaton = this.app.system.automata.get(automatonName);
        if (!automaton) return;
        
        const currentState = stateSelect.value;
        
        stateSelect.innerHTML = '<option value="">-- Выберите состояние --</option>';
        
        automaton.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.name;
            option.textContent = state.name;
            stateSelect.appendChild(option);
        });
        
        if (currentState && Array.from(automaton.states).some(s => s.name === currentState)) {
            stateSelect.value = currentState;
        }
    }

    createConnection() {
        const fromAutomaton = document.getElementById('connection-from-automaton').value;
        const fromState = document.getElementById('connection-from-state').value;
        const toAutomaton = document.getElementById('connection-to-automaton').value;
        const toState = document.getElementById('connection-to-state').value;
        const triggerSymbol = document.getElementById('connection-trigger').value.trim();

        if (!fromAutomaton || !fromState || !toAutomaton || !toState) {
            alert('❌ Заполните все обязательные поля');
            return;
        }

        if (fromAutomaton === toAutomaton) {
            alert('❌ Нельзя создать связь внутри одного автомата');
            return;
        }

        try {
            this.app.system.addConnection(fromAutomaton, fromState, toAutomaton, toState, triggerSymbol || null);
            this.updateInterface();
            
            alert(`✅ Связь создана: ${fromAutomaton}.${fromState} → ${toAutomaton}.${toState}`);
            
            document.getElementById('connection-trigger').value = '';
            
        } catch (error) {
            alert(`❌ Ошибка создания связи: ${error.message}`);
        }
    }

    clearAllConnections() {
        if (confirm('⚠️ Вы уверены, что хотите удалить все связи между автоматами?')) {
            this.app.system.connections.clear();
            this.updateInterface();
        }
    }

    createAlphabetControls() {
        const useCustomCheckbox = document.getElementById('use-custom-alphabet');
        const customAlphabetDiv = document.getElementById('custom-alphabet-input');
        const applyButton = document.getElementById('apply-custom-alphabet');

        if (!useCustomCheckbox || !customAlphabetDiv || !applyButton) return;

        useCustomCheckbox.checked = this.app.system.useCustomAlphabet;
        customAlphabetDiv.style.display = useCustomCheckbox.checked ? 'block' : 'none';

        if (this.app.system.customAlphabet.size > 0) {
            document.getElementById('custom-alphabet-text').value = 
                Array.from(this.app.system.customAlphabet).join(' ');
        }

        useCustomCheckbox.addEventListener('change', (e) => {
            customAlphabetDiv.style.display = e.target.checked ? 'block' : 'none';
            if (!e.target.checked) {
                this.app.system.setUseCustomAlphabet(false);
                this.updateAlphabetDisplay();
            }
        });

        applyButton.addEventListener('click', () => {
            const alphabetText = document.getElementById('custom-alphabet-text').value;
            const symbols = alphabetText.split(' ').map(s => s.trim()).filter(s => s);
            this.app.system.setCustomAlphabet(symbols);
            this.app.system.setUseCustomAlphabet(true);
            this.updateAlphabetDisplay();
            alert('✅ Пользовательский алфавит применен!');
        });
    }

    createSystemControls() {
        document.getElementById('save-system').addEventListener('click', () => this.saveSystem());
        document.getElementById('load-system').addEventListener('click', () => this.loadSystem());
        document.getElementById('system-file-input').addEventListener('change', (e) => this.handleFileLoad(e));
        document.getElementById('clear-system').addEventListener('click', () => this.clearSystem());
    }

    saveSystem() {
        try {
            const systemData = this.app.system.toDict();
            const dataStr = JSON.stringify(systemData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `automata-system-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert('✅ Система успешно сохранена!');
            
        } catch (error) {
            alert(`❌ Ошибка сохранения: ${error.message}`);
        }
    }

    loadSystem() {
        document.getElementById('system-file-input').click();
    }

    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const systemData = JSON.parse(e.target.result);
                const newSystem = MultiAgentSystem.fromDict(systemData);
                this.app.setSystem(newSystem);
                this.updateInterface();
                alert('✅ Система успешно загружена!');
                
            } catch (error) {
                alert(`❌ Ошибка загрузки файла: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    clearSystem() {
        if (confirm('⚠️ Вы уверены, что хотите полностью очистить систему? Все автоматы и связи будут удалены.')) {
            this.app.setSystem(new MultiAgentSystem());
            this.app.automatonCounter = 1;
            this.updateInterface();
        }
    }

    createVisualizationPage() {
        this.setupVisualizationControls();
        this.initNetwork();
    }


createNetworkData() {
    const nodes = [];
    const edges = [];
    let nodeId = 1;
    const automatonNodes = new Map();

    this.app.system.automata.forEach((automaton, automatonName) => {
        const automatonNodesList = [];
        
        automaton.states.forEach(state => {
            const isCurrent = Array.from(automaton.currentStates).some(s => s.equals(state));
            const isStart = state.equals(automaton.startState);
            const isFinal = Array.from(automaton.finalStates).some(s => s.equals(state));
            
            let nodeColor = '#ffffff'; // Белая заливка по умолчанию
            let borderColor = '#2B7CE9';
            let borderWidth = 2;
            
            // Только текущие состояния получают заливку
            if (isCurrent) {
                if (isStart && isFinal) {
                    nodeColor = '#FF6B6B';
                    borderColor = '#FF0000';
                } else if (isStart) {
                    nodeColor = '#FFA500';
                    borderColor = '#FF8C00';
                } else if (isFinal) {
                    nodeColor = '#FF6B6B';
                    borderColor = '#FF0000';
                } else {
                    nodeColor = '#FFA500';
                    borderColor = '#FF8C00';
                }
                borderWidth = 3;
            } else {
                // Не текущие состояния - только контур
                if (isStart && isFinal) {
                    borderColor = '#FF0000';
                } else if (isStart) {
                    borderColor = '#32CD32';
                } else if (isFinal) {
                    borderColor = '#FF69B4';
                } else {
                    borderColor = '#2B7CE9';
                }
            }

            const node = {
                id: nodeId,
                label: `${automatonName}\n${state.name}`, // Изменено: добавлено название автомата
                color: {
                    background: nodeColor,
                    border: borderColor,
                    highlight: {
                        background: nodeColor,
                        border: borderColor
                    }
                },
                borderWidth: borderWidth,
                shape: 'dot', // Все состояния круглые
                group: automatonName,
                title: `Автомат: ${automatonName}\nСостояние: ${state.name}\nТип: ${state.type}`
            };

            nodes.push(node);
            automatonNodesList.push({ id: nodeId, state: state });
            nodeId++;
        });

        automatonNodes.set(automatonName, automatonNodesList);

        automaton.transitions.forEach(transition => {
            const fromNode = automatonNodesList.find(n => n.state.equals(transition.fromState));
            const toNode = automatonNodesList.find(n => n.state.equals(transition.toState));
            
            if (fromNode && toNode) {
                const edge = {
                    from: fromNode.id,
                    to: toNode.id,
                    label: transition.symbol,
                    arrows: 'to',
                    color: { color: '#2B7CE9' },
                    font: { color: '#2B7CE9' },
                    title: `Переход: ${transition.symbol}`
                };
                edges.push(edge);
            }
        });
    });

    this.app.system.connections.forEach(connection => {
        const fromAutomatonNodes = automatonNodes.get(connection.fromAutomaton);
        const toAutomatonNodes = automatonNodes.get(connection.toAutomaton);
        
        if (fromAutomatonNodes && toAutomatonNodes) {
            const fromNode = fromAutomatonNodes.find(n => n.state.name === connection.fromState);
            const toNode = toAutomatonNodes.find(n => n.state.name === connection.toState);
            
            if (fromNode && toNode) {
                const edge = {
                    from: fromNode.id,
                    to: toNode.id,
                    label: connection.triggerSymbol ? `[${connection.triggerSymbol}]` : 'сигнал',
                    arrows: 'to',
                    color: { color: '#FF69B4' },
                    dashes: true,
                    font: { color: '#FF69B4' },
                    title: `Связь: ${connection.fromAutomaton}.${connection.fromState} → ${connection.toAutomaton}.${connection.toState}${connection.triggerSymbol ? ` (триггер: ${connection.triggerSymbol})` : ''}`
                };
                edges.push(edge);
            }
        }
    });

    return { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
}

initNetwork() {
    const container = document.getElementById('network');
    if (!container) return;

    container.innerHTML = '';

    this.networkData = this.createNetworkData();
    
    const options = {
        nodes: {
            shape: 'dot',
            size: 25,
            font: {
                size: 14,
                color: '#000000'
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            shadow: true,
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.8
                }
            },
            font: {
                size: 12,
                align: 'middle'
            },
            smooth: {
                enabled: true,
                type: 'continuous'
            }
        },
        physics: {
            enabled: true,
            stabilization: {
                iterations: 100
            }
        },
        interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true
        }
    };

    this.network = new vis.Network(container, this.networkData, options);
    
    // Сохраняем позиции после стабилизации и отключаем физику
    this.network.once('stabilizationIterationsDone', () => {
        this.network.setOptions({ physics: false });
    });
}


    setupVisualizationControls() {
        document.getElementById('vis-run-simulation').addEventListener('click', () => {
            const inputString = document.getElementById('vis-input-string').value;
            this.runSimulation(inputString);
        });

        document.getElementById('vis-reset-simulation').addEventListener('click', () => {
            this.resetSimulation();
        });

        document.getElementById('step-by-step').addEventListener('click', () => {
            this.stepByStepSimulation();
        });

        document.getElementById('export-graph').addEventListener('click', () => {
            this.exportGraph();
        });

        document.getElementById('first-step').addEventListener('click', () => {
            this.goToStep(0);
        });

        document.getElementById('prev-step').addEventListener('click', () => {
            this.goToStep(this.app.currentStep - 1);
        });

        document.getElementById('next-step').addEventListener('click', () => {
            this.goToStep(this.app.currentStep + 1);
        });

        document.getElementById('last-step').addEventListener('click', () => {
            this.goToStep(this.app.simulationHistory.length - 1);
        });

        document.getElementById('vis-input-string').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.runSimulation(e.target.value);
            }
        });
    }

    runSimulation(inputString) {
        try {
            if (!inputString.trim()) {
                alert('⚠️ Введите входную строку');
                return;
            }

            this.app.simulationHistory = this.app.system.processInput(inputString);
            this.app.currentStep = this.app.simulationHistory.length - 1;
            
            this.updateVisualizationInterface();
            this.showSimulationResult();
            
        } catch (error) {
            alert(`❌ Ошибка: ${error.message}`);
        }
    }

    resetSimulation() {
        this.app.system.resetSystem();
        this.app.currentStep = 0;
        this.app.simulationHistory = [];
        this.updateVisualizationInterface();
        this.clearSimulationResult();
    }

    stepByStepSimulation() {
        const inputString = document.getElementById('vis-input-string').value;
        const symbols = inputString.split(' ').map(s => s.trim()).filter(s => s);
        
        if (this.app.currentStep < symbols.length) {
            const currentSymbol = symbols[this.app.currentStep];
            this.runSimulation(currentSymbol);
        } else {
            alert('✅ Симуляция завершена!');
        }
    }

    exportGraph() {
        if (!this.network) return;
        
        this.network.storePositions();
        const dataUrl = this.network.toImage();
        const link = document.createElement('a');
        link.download = 'automata-graph.png';
        link.href = dataUrl;
        link.click();
    }

    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.app.simulationHistory.length) {
            this.app.currentStep = stepIndex;
            this.restoreSystemState(stepIndex);
            this.updateVisualizationInterface();
        }
    }

    restoreSystemState(stepIndex) {
        const step = this.app.simulationHistory[stepIndex];
        if (!step) return;

        this.app.system.automata.forEach((automaton, name) => {
            if (step.states[name]) {
                const stateInfo = step.states[name];
                automaton.currentStates.clear();
                
                stateInfo.new_states.forEach(stateName => {
                    const state = automaton.getStateByName(stateName);
                    if (state) {
                        automaton.currentStates.add(state);
                    }
                });
                
                automaton._updateStateTypes();
            }
        });
    }

    updateInterface() {
        this.updateAutomataList();
        this.updateConnectionsList();
        this.updateAlphabetDisplay();
        this.updateConnectionForm();
        
        if (this.currentPage === 'visualization') {
            this.updateGraphVisualization();
            this.updateVisualizationInterface();
        }
    }

    updateAutomataList() {
        const container = document.getElementById('automata-list');
        if (!container) return;

        container.innerHTML = '<h3>🤖 Автоматы в системе:</h3>';
        
        if (this.app.system.automata.size === 0) {
            container.innerHTML += '<p>🚫 Нет созданных автоматов</p>';
            return;
        }
        
        this.app.system.automata.forEach((automaton, name) => {
            const card = this.createAutomatonCard(automaton);
            container.appendChild(card);
        });
    }

    createAutomatonCard(automaton) {
        const card = document.createElement('div');
        card.className = 'automaton-card';
        card.innerHTML = `
            <div class="automaton-header">
                <h4>${automaton.name}</h4>
                <span class="automaton-type ${automaton.automatonType}">
                    ${automaton.automatonType === AutomatonType.ACTIVE ? '🟢 Активный' : '🔵 Пассивный'}
                </span>
            </div>
            <div class="current-states">
                🎯 Текущие состояния: ${Array.from(automaton.currentStates).map(s => 
                    `<span class="state-badge">${s.name}</span>`
                ).join(', ')}
            </div>
            <div class="states-list">
                📊 Состояния: ${Array.from(automaton.states).map(s => 
                    `<span class="state-item">${s.name}</span>`
                ).join(', ')}
            </div>
            ${automaton.automatonType === AutomatonType.ACTIVE ? `
                <div class="alphabet">
                    🔤 Алфавит: ${Array.from(automaton.getAlphabet()).map(s => 
                        `<code>${s}</code>`
                    ).join(', ')}
                </div>
            ` : ''}
            <div class="automaton-actions">
                <button class="delete-automaton btn-danger" data-name="${automaton.name}">🗑️ Удалить</button>
            </div>
        `;
        
        card.querySelector('.delete-automaton').addEventListener('click', (e) => {
            this.deleteAutomaton(e.target.dataset.name);
        });
        
        return card;
    }

    deleteAutomaton(automatonName) {
        if (confirm(`Удалить автомат "${automatonName}"?`)) {
            this.app.system.automata.delete(automatonName);
            this.updateInterface();
        }
    }

    updateConnectionsList() {
        const container = document.getElementById('connections-list');
        if (!container) return;

        if (this.app.system.connections.size === 0) {
            container.innerHTML = '<h3>🔗 Связи между автоматами:</h3><p>🚫 Нет созданных связей</p>';
            return;
        }

        container.innerHTML = '<h3>🔗 Связи между автоматами:</h3>';
        
        this.app.system.connections.forEach(connection => {
            const connectionEl = document.createElement('div');
            connectionEl.className = 'connection-item';
            connectionEl.innerHTML = `
                🔗 ${connection.fromAutomaton}.${connection.fromState} → 
                ${connection.toAutomaton} переходит в ${connection.toState}
                ${connection.triggerSymbol ? ` (по символу '${connection.triggerSymbol}')` : ''}
                <button class="delete-connection btn-danger" data-from="${connection.fromAutomaton}" data-from-state="${connection.fromState}" data-to="${connection.toAutomaton}" data-to-state="${connection.toState}">❌</button>
            `;
            
            connectionEl.querySelector('.delete-connection').addEventListener('click', (e) => {
                this.deleteConnection(
                    e.target.dataset.from,
                    e.target.dataset.fromState,
                    e.target.dataset.to,
                    e.target.dataset.toState
                );
            });
            
            container.appendChild(connectionEl);
        });
    }

    deleteConnection(fromAutomaton, fromState, toAutomaton, toState) {
        if (confirm(`Удалить связь ${fromAutomaton}.${fromState} → ${toAutomaton}.${toState}?`)) {
            this.app.system.removeConnection(fromAutomaton, fromState, toAutomaton, toState);
            this.updateInterface();
        }
    }

    updateAlphabetDisplay() {
        const container = document.getElementById('alphabet-display');
        if (!container) return;

        const alphabet = this.app.system.getSystemAlphabet();
        container.innerHTML = `
            <h3>🔤 Алфавит системы:</h3>
            <div class="alphabet-items">
                ${Array.from(alphabet).map(symbol => `<code>${symbol}</code>`).join(' ')}
            </div>
        `;
    }

    updateVisualizationInterface() {
        this.updateGraphVisualization();
        this.updateStepCounter();
        this.updateCurrentStatesDisplay();
        this.updateNavigationButtons();
    }

    updateGraphVisualization() {
    if (this.network) {
        // Сохраняем текущие позиции узлов
        const positions = this.network.getPositions();
        
        // Создаем новые данные
        const newData = this.createNetworkData();
        
        // Восстанавливаем позиции узлов
        if (positions) {
            newData.nodes.forEach(node => {
                if (positions[node.id]) {
                    node.x = positions[node.id].x;
                    node.y = positions[node.id].y;
                    node.fixed = true;
                }
            });
        }
        
        this.network.setData(newData);
    } else {
        this.initNetwork();
    }
}

    updateStepCounter() {
        const counter = document.getElementById('step-counter');
        if (counter) {
            const totalSteps = Math.max(0, this.app.simulationHistory.length - 1);
            const currentStep = this.app.currentStep;
            counter.textContent = `Шаг ${currentStep}/${totalSteps}`;
            
            if (this.app.simulationHistory[currentStep]) {
                const step = this.app.simulationHistory[currentStep];
                if (step.symbol !== 'START') {
                    counter.textContent += ` (символ: '${step.symbol}')`;
                }
            }
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const firstBtn = document.getElementById('first-step');
        const lastBtn = document.getElementById('last-step');

        if (prevBtn && nextBtn && firstBtn && lastBtn) {
            const totalSteps = this.app.simulationHistory.length - 1;
            const currentStep = this.app.currentStep;
            
            firstBtn.disabled = currentStep === 0;
            prevBtn.disabled = currentStep === 0;
            nextBtn.disabled = currentStep >= totalSteps;
            lastBtn.disabled = currentStep >= totalSteps;
        }
    }

    updateCurrentStatesDisplay() {
        const container = document.getElementById('current-states-display');
        if (!container) return;

        let html = '';
        this.app.system.automata.forEach((automaton, name) => {
            const currentStates = Array.from(automaton.currentStates);
            if (currentStates.length > 0) {
                html += `<div class="current-state-item">
                    <strong>${name}:</strong>
                    ${currentStates.map(state => {
                        let indicators = [];
                        let stateClass = '';
                        
                        if (state.equals(automaton.startState)) {
                            indicators.push('start');
                            stateClass += ' start-state';
                        }
                        if (Array.from(automaton.finalStates).some(s => s.equals(state))) {
                            indicators.push('final');
                            stateClass += ' final-state';
                        }
                        
                        let indicatorHtml = indicators.map(ind => 
                            `<span class="state-indicator ${ind}" title="${ind === 'start' ? 'Начальное состояние' : 'Конечное состояние'}"></span>`
                        ).join('');
                        
                        return `<span class="state-badge ${stateClass}">${state.name} ${indicatorHtml}</span>`;
                    }).join(', ')}
                </div>`;
            }
        });

        container.innerHTML = html || '<p>Нет активных состояний</p>';
    }

    showSimulationResult() {
        const container = document.getElementById('simulation-result');
        if (!container) return;

        const verdict = this.app.system.getFinalVerdict();
        
        let html = `
            <div class="verdict ${verdict.accepted ? 'accepted' : 'rejected'}">
                <h4>${verdict.accepted ? '✅ Строка принята!' : '❌ Строка отвергнута!'}</h4>
        `;

        html += '<div class="automata-results">';
        for (const [name, result] of Object.entries(verdict.automata_results)) {
            const automaton = this.app.system.automata.get(name);
            html += `
                <div class="automaton-result">
                    <strong>${name}</strong>:
                    ${result.has_final_states ? 
                        (result.is_final ? '✅ в конечном состоянии' : '❌ не в конечном состоянии') :
                        '🔶 нет конечных состояний'
                    }
                    (${result.current_states.join(', ')})
                </div>
            `;
        }
        html += '</div>';

        if (this.app.simulationHistory.length > 1) {
            html += '<div class="simulation-steps"><h5>Шаги симуляции:</h5>';
            this.app.simulationHistory.forEach((step, index) => {
                if (step.symbol === 'START') return;
                
                html += `
                    <div class="step-item ${index === this.app.currentStep ? 'current' : ''}">
                        <strong>Шаг ${step.step}:</strong> символ '${step.symbol}'
                        <button onclick="automataApp.ui.goToStep(${index})" class="btn-info">👁️ Показать</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    clearSimulationResult() {
        const container = document.getElementById('simulation-result');
        if (container) {
            container.innerHTML = '<p>Запустите симуляцию для просмотра результатов</p>';
        }
    }
}