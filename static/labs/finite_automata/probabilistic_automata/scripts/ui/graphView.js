/**
 * @file graphView.js - Визуализация графа вероятностного автомата
 * @module ui/graphView
 */

class GraphView {
    /**
     * Создает визуализатор графа автомата
     * @param {HTMLElement} container - Контейнер для отрисовки графа
     * @param {ProbabilisticAutomaton} automaton - Модель автомата
     */
    constructor(container, automaton = null) {
        this.container = container;
        
        // Используем переданный автомат или создаем новый
        this.automaton = automaton || this.createDefaultAutomaton();
        
        this.canvas = null;
        this.ctx = null;
        this.isDragging = false;
        this.draggedState = null;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedState = null;
        this.transitionFromState = null;
        this.isCreatingTransition = false;
        
        // Цвета для разных символов (генерируются динамически)
        this.symbolColors = {};
        
        // Контекстное меню
        this.contextMenu = null;
        
        this.init();
    }

    /**
     * Создает простой автомат по умолчанию
     */
    createDefaultAutomaton() {
        const automaton = new ProbabilisticAutomaton('Default Automaton');
        return automaton;
    }

    /**
     * Инициализирует canvas и обработчики событий
     */
    init() {
        // Очищаем контейнер
        this.container.innerHTML = '';
        
        // Создаем canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.canvas.style.cursor = 'default';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Создаем контекстное меню
        this.createContextMenu();

        // Обработчики событий
        this.setupEventHandlers();

        // Связываем кнопки управления
        this.setupControlButtons();

        // Первоначальная отрисовка
        this.render();
    }

    /**
     * Связывает кнопки управления с функционалом
     */
    setupControlButtons() {
        // Кнопка добавления состояния
        const addStateBtn = document.getElementById('add-state');
        if (addStateBtn) {
            addStateBtn.addEventListener('click', () => {
                this.addNewState();
            });
        }

        // Кнопка добавления символа
        const addSymbolBtn = document.getElementById('add-symbol');
        if (addSymbolBtn) {
            addSymbolBtn.addEventListener('click', () => {
                this.addNewSymbol();
            });
        }

        // Кнопка удаления состояния
        const removeStateBtn = document.getElementById('remove-state');
        if (!removeStateBtn) {
            // Если кнопки нет в HTML, создаем её
            this.createRemoveStateButton();
        } else {
            removeStateBtn.addEventListener('click', () => {
                if (this.selectedState) {
                    this.deleteState(this.selectedState);
                } else {
                    alert('Выберите состояние для удаления (кликните на состояние в графе)');
                }
            });
        }

        // Кнопка удаления символа
        const removeSymbolBtn = document.getElementById('remove-symbol');
        if (!removeSymbolBtn) {
            this.createRemoveSymbolButton();
        } else {
            removeSymbolBtn.addEventListener('click', () => {
                this.removeSymbol();
            });
        }

        // Кнопка проверки автомата
        const validateBtn = document.getElementById('validate');
        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.validateAutomata();
            });
        }

        // Кнопка упорядочивания состояний
        const arrangeBtn = document.getElementById('arrange-states');
        if (!arrangeBtn) {
            this.createArrangeButton();
        } else {
            arrangeBtn.addEventListener('click', () => {
                this.arrangeStates();
            });
        }
    }

    /**
     * Создает кнопку удаления состояния если её нет в HTML
     */
    createRemoveStateButton() {
        const controls = document.querySelector('.controls');
        if (controls) {
            const removeBtn = document.createElement('button');
            removeBtn.id = 'remove-state';
            removeBtn.textContent = '- Состояние';
            controls.appendChild(removeBtn);
            
            removeBtn.addEventListener('click', () => {
                if (this.selectedState) {
                    this.deleteState(this.selectedState);
                } else {
                    alert('Выберите состояние для удаления (кликните на состояние в графе)');
                }
            });
        }
    }

    /**
     * Создает кнопку удаления символа если её нет в HTML
     */
    createRemoveSymbolButton() {
        const controls = document.querySelector('.controls');
        if (controls) {
            const removeBtn = document.createElement('button');
            removeBtn.id = 'remove-symbol';
            removeBtn.textContent = '- Символ';
            controls.appendChild(removeBtn);
            
            removeBtn.addEventListener('click', () => {
                this.removeSymbol();
            });
        }
    }

    /**
     * Создает кнопку упорядочивания состояний
     */
    createArrangeButton() {
        const controls = document.querySelector('.controls');
        if (controls) {
            const arrangeBtn = document.createElement('button');
            arrangeBtn.id = 'arrange-states';
            arrangeBtn.textContent = '📐 Упорядочить';
            controls.appendChild(arrangeBtn);
            
            arrangeBtn.addEventListener('click', () => {
                this.arrangeStates();
            });
        }
    }

    /**
     * Добавляет новое состояние
     */
    addNewState() {
        const stateName = prompt('Введите имя нового состояния:');
        if (!stateName || stateName.trim() === '') {
            alert('Имя состояния не может быть пустым');
            return;
        }

        try {
            // Создаем состояние в автомате
            const newState = this.automaton.addState(stateName);
            
            // Устанавливаем позицию по умолчанию
            const states = this.automaton.getAllStates();
            const existingStates = states.filter(s => s.id !== stateName);
            
            if (existingStates.length > 0) {
                // Размещаем рядом с последним состоянием
                const lastState = existingStates[existingStates.length - 1];
                const position = lastState.getPosition();
                newState.setPosition(position.x + 100, position.y);
                
                // Если вышли за границы, размещаем в центре
                if (position.x + 100 > this.canvas.width - 50) {
                    newState.setPosition(this.canvas.width / 2, this.canvas.height / 2);
                }
            } else {
                // Первое состояние - в центре
                newState.setPosition(this.canvas.width / 2, this.canvas.height / 2);
            }
            
            this.selectedState = newState;
            this.render();
            
            // Создаем событие
            const event = new CustomEvent('stateAdded', {
                detail: { state: newState }
            });
            document.dispatchEvent(event);
            
            console.log('Состояние добавлено:', newState, ' в автомат ', this.automaton.name);
        } catch (error) {
            alert('Ошибка при добавлении состояния: ' + error.message);
        }
    }

    /**
     * Добавляет новый символ
     */
    addNewSymbol() {
        const symbol = prompt('Введите новый символ:');

        try {
            this.automaton.addSymbol(symbol);
            this.updateSymbolColors();
            this.render();
            
            // Создаем событие
            const event = new CustomEvent('symbolAdded', {
                detail: { symbol }
            });
            document.dispatchEvent(event);
            
            alert(`Символ "${symbol}" добавлен в алфавит`);
        } catch (error) {
            alert('Ошибка при добавлении символа: ' + error.message);
        }
    }

    /**
     * Удаляет символ
     */
    removeSymbol() {
        const symbols = this.automaton.getAlphabet();
        if (symbols.length === 0) {
            alert('Нет символов для удаления');
            return;
        }

        const symbolToRemove = prompt(`Введите символ для удаления. Доступные символы: ${symbols.join(', ')}`);
        if (!symbolToRemove) return;

        if (!symbols.includes(symbolToRemove)) {
            alert(`Символ "${symbolToRemove}" не найден`);
            return;
        }

        if (confirm(`Удалить символ "${symbolToRemove}"? Все переходы с этим символом будут удалены.`)) {
            try {
                this.automaton.removeSymbol(symbolToRemove);
                delete this.symbolColors[symbolToRemove];
                this.render();
                
                // Создаем событие
                const event = new CustomEvent('symbolRemoved', {
                    detail: { symbol: symbolToRemove }
                });
                document.dispatchEvent(event);
                
                alert(`Символ "${symbolToRemove}" удален`);
            } catch (error) {
                alert('Ошибка при удалении символа: ' + error.message);
            }
        }
    }

    /**
     * Проверяет корректность автомата
     */
    validateAutomata() {
        const states = this.automaton.getAllStates();
        const symbols = this.automaton.getAlphabet();
        
        if (states.length === 0) {
            alert('Автомат не содержит состояний');
            return;
        }

        if (symbols.length === 0) {
            alert('Автомат не содержит символов алфавита');
            return;
        }

        // Проверяем начальные состояния
        if (this.automaton.initialStates.size === 0) {
            alert('Предупреждение: нет начальных состояний');
        }

        this.generateTransitionProbabilities();

        // Используем встроенную валидацию автомата
        if (this.automaton.isValid && this.automaton.isValid()) {
            alert('Автомат корректен! Все проверки пройдены.');
            this.notifyProbabilityPanelUpdate();
        } else {
            // Собираем все ошибки из всех матриц
            let errorMessages = [];
            const stateIds = states.map(state => state.id);
            
            symbols.forEach(symbol => {
                const matrix = this.automaton.transitionMatrices.getMatrix(symbol);
                if (matrix && matrix.validationErrors) {
                    errorMessages.push(`Ошибки для символа '${symbol}':`);
                    errorMessages = errorMessages.concat(matrix.validationErrors);
                }
            });
            
            alert('Обнаружены ошибки в автомате:\n\n' + errorMessages.join('\n'));
        }
    }

    /**
     * Генерирует случайные вероятности для всех переходов используя randomizeMatrix
     */
    generateTransitionProbabilities() {
        const symbols = this.automaton.getAlphabet();
        
        // Используем probabilityPanel если он доступен
        if (window.probabilityPanel && window.probabilityPanel.randomizeMatrix) {
            symbols.forEach(symbol => {
                // Вызываем randomizeMatrix для каждого символа без обновления представления
                window.probabilityPanel.randomizeMatrix(symbol);
            });
        } else {
            console.log("generateTransitionProbabilities не работает")
        }
    }

    notifyProbabilityPanelUpdate() {
        console.log('Отправляю событие probabilityPanelUpdate');

        // ПРИНУДИТЕЛЬНО обновляем модель если нужно
        if (window.appModel && window.appModel.currentAutomaton !== this.automaton) {
            window.appModel.currentAutomaton = this.automaton;
            console.log('Модель обновлена');
        }

        document.dispatchEvent(new CustomEvent('probabilityPanelUpdate', {
            detail: {
                automaton: this.automaton,
                trigger: "stateRename"
            }
        }));
    }

    // Методы для работы с моделью автомата

    /**
     * Получает все состояния из автомата
     */
    getStates() {
        return this.automaton.getAllStates();
    }

    /**
     * Получает символы из автомата
     */
    getSymbols() {
        return this.automaton.getAlphabet();
    }

    /**
     * Устанавливает вероятность перехода
     */
    setTransitionProbability(fromState, toState, symbol, probability) {
        this.automaton.setTransition(fromState, toState, symbol, probability);
    }

    /**
     * Получает вероятность перехода
     */
    getTransitionProbability(fromState, toState, symbol) {
        const matrix = this.automaton.transitionMatrices.getMatrix(symbol);
        return matrix ? matrix.getTransition(fromState, toState) : 0;
    }

    /**
     * Проверяет, является ли состояние начальным
     */
    isInitialState(stateName) {
        return this.automaton.initialStates.has(stateName);
    }

    /**
     * Проверяет, является ли состояние конечным
     */
    isFinalState(stateName) {
        return this.automaton.finalStates.has(stateName);
    }

    /**
     * Добавляет начальное состояние
     */
    addInitialState(stateName) {
        const state = this.automaton.getState(stateName);
        if (state) {
            state.isInitial = true;
            this.automaton.initialStates.add(stateName);
            this.automaton.updateInitialDistribution();
        }
    }

    /**
     * Удаляет начальное состояние
     */
    removeInitialState(stateName) {
        const state = this.automaton.getState(stateName);
        if (state) {
            state.isInitial = false;
            this.automaton.initialStates.delete(stateName);
            this.automaton.updateInitialDistribution();
        }
    }

    /**
     * Добавляет конечное состояние
     */
    addFinalState(stateName) {
        const state = this.automaton.getState(stateName);
        if (state) {
            state.isFinal = true;
            this.automaton.finalStates.add(stateName);
        }
    }

    /**
     * Удаляет конечное состояние
     */
    removeFinalState(stateName) {
        const state = this.automaton.getState(stateName);
        if (state) {
            state.isFinal = false;
            this.automaton.finalStates.delete(stateName);
        }
    }

    /**
     * Переименовывает состояние
     */
    renameState(oldName, newName) {
        console.log("=== НАЧАЛО ПЕРЕИМЕНОВАНИЯ ===", { oldName, newName });

        if (!newName || newName.trim() === '' || newName === oldName) {
            console.log("Некорректное новое имя");
            return;
        }

        // Проверяем существование состояний
        if (!this.automaton.getState(oldName)) {
            throw new Error(`Состояние '${oldName}' не существует`);
        }
        
        if (this.automaton.getState(newName)) {
            throw new Error(`Состояние '${newName}' уже существует`);
        }

        // СОХРАНЯЕМ ВСЕ ДАННЫЕ ПЕРЕД ПЕРЕИМЕНОВАНИЕМ
        const state = this.automaton.getState(oldName);
        const position = state.getPosition();
        const isInitial = this.automaton.initialStates.has(oldName);
        const isFinal = this.automaton.finalStates.has(oldName);
        const initialProbability = this.automaton.initialDistribution.getProbability(oldName);
        
        // Сохраняем ВСЕ переходы для ВСЕХ символов
        const allTransitions = [];
        const symbols = this.automaton.getAlphabet();
        const allStates = this.automaton.getAllStates();
        
        symbols.forEach(symbol => {
            const matrix = this.automaton.transitionMatrices.getMatrix(symbol);
            if (matrix) {
                // Переходы ИЗ этого состояния
                const fromTransitions = matrix.getTransitions(oldName);
                if (fromTransitions) {
                    Object.keys(fromTransitions).forEach(toState => {
                        allTransitions.push({
                            type: 'FROM',
                            symbol: symbol,
                            fromState: oldName,
                            toState: toState,
                            probability: fromTransitions[toState]
                        });
                    });
                }
                
                // Переходы В это состояние
                allStates.forEach(fromState => {
                    const prob = matrix.getTransition(fromState.id, oldName);
                    if (prob > 0) {
                        allTransitions.push({
                            type: 'TO',
                            symbol: symbol,
                            fromState: fromState.id,
                            toState: oldName,
                            probability: prob
                        });
                    }
                });
            }
        });

        // УДАЛЯЕМ старое состояние (это очистит все связанные данные)
        this.automaton.removeState(oldName);
        
        // СОЗДАЕМ новое состояние
        const newState = this.automaton.addState(newName, isInitial, isFinal);
        newState.setPosition(position.x, position.y);
        
        // ВОССТАНАВЛИВАЕМ начальную вероятность
        if (initialProbability > 0) {
            this.automaton.initialDistribution.setProbability(newName, initialProbability);
        }
        
        // ВОССТАНАВЛИВАЕМ все переходы
        allTransitions.forEach(transition => {
            const fromState = transition.fromState === oldName ? newName : transition.fromState;
            const toState = transition.toState === oldName ? newName : transition.toState;
            this.automaton.setTransition(fromState, toState, transition.symbol, transition.probability);
        });

        // Обновляем selectedState
        this.selectedState = newState;
        
        // СИНХРОНИЗИРУЕМ с моделью приложения
        this.syncWithAppModel();
        
        // ОБНОВЛЯЕМ ВСЕ КОМПОНЕНТЫ
        this.updateAllComponents();
        
        console.log(`=== ПЕРЕИМЕНОВАНИЕ ЗАВЕРШЕНО: ${oldName} -> ${newName} ===`);
    }

    /**
     * Синхронизирует с моделью приложения
     */
    syncWithAppModel() {
        if (window.appModel) {
            window.appModel.currentAutomaton = this.automaton;
            console.log("Автомат синхронизирован с моделью приложения");
        }
    }

    /**
     * Обновляет все компоненты
     */
    updateAllComponents() {
        // Обновляем граф
        this.render();
        
        // Отправляем событие для probabilityPanel
        document.dispatchEvent(new CustomEvent('probabilityPanelUpdate'));
        
        // Отправляем событие для других компонентов
        document.dispatchEvent(new CustomEvent('automataUpdated'));
        
        console.log("Все компоненты обновлены");
    }

    /**
     * Удаляет состояние
     */
    removeState(stateName) {
        this.automaton.removeState(stateName);
    }

    // Остальные методы (рендеринг, обработчики событий) остаются без изменений
    // [Все методы рендеринга и обработки событий из предыдущей версии]

    /**
     * Создает контекстное меню для состояний
     */
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.cssText = `
            position: absolute;
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 5px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: none;
            z-index: 1000;
            min-width: 150px;
        `;

        const menuItems = [
            { text: '📝 Переименовать', action: () => this.handleRenameState(this.selectedState) },
            { text: '⭐ Сделать начальным', action: () => this.toggleInitialState(this.selectedState) },
            // { text: '🏁 Сделать конечным', action: () => this.toggleFinalState(this.selectedState) },
            // { separator: true },
            // { text: '🔄 Добавить переход', action: () => this.startCreatingTransition(this.selectedState) },
            { text: '🎯 Центрировать на состоянии', action: () => this.focusOnState(this.selectedState) },
            { separator: true },
            { text: '❌ Удалить состояние', action: () => this.deleteState(this.selectedState), className: 'danger' }
        ];

        menuItems.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = 'height: 1px; background: var(--border-color); margin: 5px 0;';
                this.contextMenu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.textContent = item.text;
                menuItem.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                if (item.className === 'danger') {
                    menuItem.style.color = 'var(--error-color)';
                }
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = 'var(--accent-color)';
                });
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'transparent';
                });
                menuItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    this.hideContextMenu();
                });
                this.contextMenu.appendChild(menuItem);
            }
        });

        document.body.appendChild(this.contextMenu);
    }

    /**
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        // Обработчики мыши
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // Обработчики клавиатуры
        this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.canvas.setAttribute('tabindex', '0');

        // Ресайз
        window.addEventListener('resize', this.handleResize.bind(this));

        // Клик вне контекстного меню
        document.addEventListener('click', this.hideContextMenu.bind(this));

        // Слушаем события от модели
        document.addEventListener('automataUpdated', () => {
            this.render();
        });

        document.addEventListener('stateAdded', (e) => {
            if (e.detail && e.detail.state) {
                // Автоматически упорядочиваем состояния при добавлении
                if (this.automaton.getAllStates().length > 3) {
                    this.arrangeStates();
                }
            }
            this.render();
        });

        document.addEventListener('stateRemoved', () => {
            this.selectedState = null;
            this.render();
        });

        document.addEventListener('symbolAdded', () => {
            this.updateSymbolColors();
            this.render();
        });

        document.addEventListener('transitionUpdated', () => {
            this.render();
        });
    }

    /**
     * Обработчик нажатия мыши
     */
    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Скрываем контекстное меню
        this.hideContextMenu();

        // Ищем состояние под курсором
        const state = this.findStateAt(x, y);
        if (state) {
            if (event.button === 0) { // Левая кнопка
                this.isDragging = true;
                this.draggedState = state;
                const position = state.getPosition();
                this.dragOffset.x = x - position.x;
                this.dragOffset.y = y - position.y;
                this.selectedState = state;
                this.canvas.style.cursor = 'grabbing';
            }
        } else {
            this.selectedState = null;
        }

        this.render();
    }

    /**
     * Обработчик перемещения мыши
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Обновляем курсор
        const state = this.findStateAt(x, y);
        if (state && !this.isDragging) {
            this.canvas.style.cursor = 'grab';
        } else if (this.isCreatingTransition) {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'default';
        }

        if (this.isDragging && this.draggedState) {
            // Обновляем позицию состояния
            this.draggedState.setPosition(x - this.dragOffset.x, y - this.dragOffset.y);
            this.render();
        }

        // Если создаем переход, рисуем временную линию
        // if (this.isCreatingTransition && this.transitionFromState) {
        //     this.renderTemporaryTransition(x, y);
        // }
    }

    /**
     * Обработчик отпускания мыши
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedState = null;
            this.canvas.style.cursor = 'default';
        }

        // Завершение создания перехода
        if (this.isCreatingTransition && event.button === 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.finishCreatingTransition(x, y);
        }
    }

    /**
     * Обработчик клика
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const state = this.findStateAt(x, y);
        if (state) {
            this.selectedState = state;
            this.render();
        }
    }

    /**
     * Обработчик контекстного меню
     */
    handleContextMenu(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const state = this.findStateAt(x, y);
        if (state) {
            this.selectedState = state;
            this.showContextMenu(event.clientX, event.clientY);
            this.render();
        }
    }

    /**
     * Обработчик клавиатуры
     */
    handleKeyDown(event) {
        if (!this.selectedState) return;

        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteState(this.selectedState);
                break;
            case 'Escape':
                this.cancelCreatingTransition();
                break;
            case 'r':
            case 'к': // Русская раскладка
                if (event.ctrlKey) {
                    this.handleRenameState(this.selectedState);
                }
                break;
        }
    }

    /**
     * Обработчик изменения размера окна
     */
    handleResize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.render();
    }

    /**
     * Показывает контекстное меню
     */
    showContextMenu(x, y) {
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.style.display = 'block';
    }

    /**
     * Скрывает контекстное меню
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    /**
     * Ищет состояние по координатам
     */
    findStateAt(x, y) {
        const states = this.automaton.getAllStates();
        for (let state of states) {
            const position = state.getPosition();
            const dx = x - position.x;
            const dy = y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= 35) { // Радиус состояния
                return state;
            }
        }
        return null;
    }

    /**
     * Начинает создание перехода
     */
    startCreatingTransition(fromState) {
        const symbols = this.automaton.getAlphabet();
        if (symbols.length === 0) {
            alert('Добавьте символы в алфавит перед созданием переходов');
            return;
        }

        this.isCreatingTransition = true;
        this.transitionFromState = fromState;
        this.canvas.style.cursor = 'crosshair';
        this.hideContextMenu();
    }

    finishCreatingTransition(x, y) {
        const toState = this.findStateAt(x, y);
        
        if (toState && this.transitionFromState && this.transitionFromState !== toState) {
            this.showTransitionDialog(this.transitionFromState, toState);
        } else if (!toState) {
            alert('Переход можно создать только между существующими состояниями');
        }
        
        this.cancelCreatingTransition();
    }

    /**
     * Показывает диалог для настройки перехода
     */
    showTransitionDialog(fromState, toState) {
        const symbols = this.automaton.getAlphabet();
        if (symbols.length === 0) {
            alert('Сначала добавьте символы в алфавит');
            return;
        }

        // Создаем модальное окно для выбора символа и вероятности
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--panel-bg);
            padding: 20px;
            border-radius: 8px;
            min-width: 300px;
            border: 1px solid var(--border-color);
        `;

        dialog.innerHTML = `
            <h3 style="margin-top: 0;">Создание перехода</h3>
            <p>Из: <strong>${fromState.id}</strong> → В: <strong>${toState.id}</strong></p>
            
            <div style="margin: 15px 0;">
                <label>Символ:</label>
                <select id="transitionSymbol" style="width: 100%; padding: 8px; margin-top: 5px;">
                    ${symbols.map(sym => `<option value="${sym}">${sym}</option>`).join('')}
                </select>
            </div>
            
            
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button id="cancelTransition" style="padding: 8px 16px;">Отмена</button>
                <button id="saveTransition" style="padding: 8px 16px;">Сохранить</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        // Обработчики кнопок
        document.getElementById('cancelTransition').onclick = () => {
            document.body.removeChild(modal);
        };

        document.getElementById('saveTransition').onclick = () => {
            const symbol = document.getElementById('transitionSymbol').value;
            // const probability = parseFloat(document.getElementById('transitionProbability').value);

            // if (isNaN(probability) || probability < 0 || probability > 1) {
            //     alert('Вероятность должна быть числом от 0 до 1');
            //     return;
            // }

            try {
                this.automaton.setTransition(fromState.id, toState.id, symbol, 0);
                document.body.removeChild(modal);
                this.render();
                
                // Создаем событие обновления
                const event = new CustomEvent('transitionUpdated', {
                    detail: { fromState: fromState.id, toState: toState.id, symbol, probability: 0 }
                });
                document.dispatchEvent(event);
                
            } catch (error) {
                alert('Ошибка при создании перехода: ' + error.message);
            }
        };

        // Закрытие по клику вне диалога
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Отменяет создание перехода
     */
    cancelCreatingTransition() {
        this.isCreatingTransition = false;
        this.transitionFromState = null;
        this.canvas.style.cursor = 'default';
        this.render();
    }

    /**
     * Переименовывает состояние
     */
    handleRenameState(state) {
        const newName = prompt('Введите новое имя состояния:', state.id);
        if (newName && newName !== state.id && newName.trim() !== '') {
            try {
                this.renameState(state.id, newName);
                this.notifyProbabilityPanelUpdate()
                this.render();
            } catch (error) {
                alert('Ошибка при переименовании: ' + error.message);
            }
        }
    }

    /**
     * Переключает начальное состояние
     */
    toggleInitialState(state) {
        try {
            if (this.isInitialState(state.id)) {
                this.removeInitialState(state.id);
            } else {
                this.addInitialState(state.id);
            }
            this.render();

            // ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ НАЧАЛЬНОГО РАСПРЕДЕЛЕНИЯ
            this.notifyProbabilityPanelUpdate();

        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    /**
     * Переключает конечное состояние
     */
    toggleFinalState(state) {
        try {
            if (this.isFinalState(state.id)) {
                this.removeFinalState(state.id);
            } else {
                this.addFinalState(state.id);
            }
            this.render();
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    /**
     * Удаляет состояние
     */
    deleteState(state) {
        if (confirm(`Удалить состояние "${state.id}"?`)) {
            try {
                this.removeState(state.id);
                this.selectedState = null;
                this.render();
            } catch (error) {
                alert('Ошибка при удалении состояния: ' + error.message);
            }
        }
    }

    /**
     * Фокусируется на состоянии
     */
    focusOnState(state) {
        // Центрируем вид на состоянии
        const containerRect = this.container.getBoundingClientRect();
        const position = state.getPosition();
        const scrollX = position.x - containerRect.width / 2;
        const scrollY = position.y - containerRect.height / 2;
        
        this.container.scrollTo({
            left: scrollX,
            top: scrollY,
            behavior: 'smooth'
        });
        
        this.selectedState = state;
        this.render();
    }

    /**
     * Рендерит граф автомата
     */
    render() {
        if (!this.ctx) return;

        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const states = this.automaton.getAllStates();
        const symbols = this.automaton.getAlphabet();
        
        if (states.length === 0) {
            this.renderEmptyMessage();
            return;
        }

        // Сначала рисуем переходы
        this.renderTransitions(states, symbols);
        
        // Затем состояния (чтобы они были поверх стрелок)
        this.renderStates(states);

        const event = new CustomEvent('automatonUpdated', {
            detail: {automaton: this.automaton }
        });

        document.dispatchEvent(event);
    }

    /**
     * Рендерит сообщение при пустом автомате
     */
    renderEmptyMessage() {
        this.ctx.fillStyle = 'var(--text-color)';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            'Добавьте состояния для визуализации автомата',
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText(
            'Используйте кнопку "+ Состояние" в левой панели',
            this.canvas.width / 2,
            this.canvas.height / 2 + 30
        );
    }

    // ... [Все остальные методы рендеринга из предыдущей версии остаются без изменений]
    // renderTransitions, renderTransitionArrow, renderLoopArrow, renderStraightArrow,
    // renderArrowHead, renderTransitionLabel, renderStates, renderStateNode,
    // getSymbolColor, updateSymbolColors, generateColor, arrangeStates, randomizePositions

    /**
     * Рендерит переходы между состояниями
     */
    renderTransitions(states, symbols) {
        // Обновляем цвета символов
        this.updateSymbolColors();

        // Для каждого символа рисуем переходы
        symbols.forEach(symbol => {
            const color = this.getSymbolColor(symbol);
            const matrix = this.automaton.transitionMatrices.getMatrix(symbol);
            
            if (!matrix) return;
            
            states.forEach(fromState => {
                states.forEach(toState => {
                    const probability = matrix.getTransition(fromState.id, toState.id);
                    
                    if (probability > 0) {
                        const fromPos = fromState.getPosition();
                        const toPos = toState.getPosition();
                        
                        this.renderTransitionArrow(
                            fromPos, 
                            toPos, 
                            probability, 
                            symbol, 
                            color,
                            fromState.id === toState.id // Петля
                        );
                    }
                });
            });
        });
    }

    /**
     * Рендерит стрелку перехода
     */
    renderTransitionArrow(fromPos, toPos, probability, symbol, color, isLoop = false) {
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;

        if (isLoop) {
            this.renderLoopArrow(fromPos, probability, symbol, color);
        } else {
            this.renderStraightArrow(fromPos, toPos, probability, symbol, color);
        }
    }

    /**
     * Рендерит петлю (переход в то же состояние)
     */
    renderLoopArrow(pos, probability, symbol, color) {
        const radius = 25;
        const angle = Math.PI / 4;
        
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y - 40, radius, angle, Math.PI - angle);
        this.ctx.stroke();

        // Стрелка
        const arrowAngle = Math.PI - angle - 0.2;
        const arrowX = pos.x + radius * Math.cos(arrowAngle);
        const arrowY = pos.y - 40 + radius * Math.sin(arrowAngle);
        this.renderArrowHead(arrowX, arrowY, arrowAngle);

        // Подпись
        this.renderTransitionLabel(
            pos.x, 
            pos.y - 65, 
            probability, 
            symbol, 
            color
        );
    }

    /**
     * Рендерит прямую стрелку между состояниями
     */
    renderStraightArrow(fromPos, toPos, probability, symbol, color) {
        // Вычисляем направление и расстояние
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / distance;
        const unitY = dy / distance;

        // Начало и конец линии (с учетом радиусов состояний)
        const startX = fromPos.x + unitX * 35;
        const startY = fromPos.y + unitY * 35;
        const endX = toPos.x - unitX * 35;
        const endY = toPos.y - unitY * 35;

        // Рисуем линию
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Рисуем стрелку
        const arrowAngle = Math.atan2(dy, dx);
        this.renderArrowHead(endX, endY, arrowAngle);

        // Подпись перехода (посередине)
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Смещаем подпись перпендикулярно линии
        const labelOffset = 15;
        const labelX = midX - unitY * labelOffset;
        const labelY = midY + unitX * labelOffset;

        this.renderTransitionLabel(labelX, labelY, probability, symbol, color);
    }

    /**
     * Рендерит головку стрелки
     */
    renderArrowHead(x, y, angle) {
        const headLength = 15;
        const headAngle = Math.PI / 6;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - headLength * Math.cos(angle - headAngle),
            y - headLength * Math.sin(angle - headAngle)
        );
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(
            x - headLength * Math.cos(angle + headAngle),
            y - headLength * Math.sin(angle + headAngle)
        );
        this.ctx.stroke();
    }

    /**
     * Рендерит подпись перехода
     */
    renderTransitionLabel(x, y, probability, symbol, color) {
        const label = `${symbol}: ${probability.toFixed(2)}`;
        
        // Фон подписи
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x - 25, y - 10, 50, 20);
        
        // Текст
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x, y);
    }

    /**
     * Рендерит состояния автомата
     */
    renderStates(states) {
        states.forEach(state => {
            const isInitial = this.isInitialState(state.id);
            const isFinal = this.isFinalState(state.id);
            const isSelected = state === this.selectedState;
            const position = state.getPosition();
            
            this.renderStateNode(position, state.id, isInitial, isFinal, isSelected);
        });
    }

    /**
     * Рендерит узел состояния
     */
    renderStateNode(position, stateId, isInitial, isFinal, isSelected) {
        const { x, y } = position;
        
        // Базовый цвет состояния
        let fillColor = '#68217a'; // Обычное состояние
        if (isInitial && isFinal) fillColor = '#ff9800'; // Начальное и конечное
        else if (isInitial) fillColor = '#4caf50'; // Начальное
        else if (isFinal) fillColor = '#f44336'; // Конечное
        
        // ПОДСВЕТКА ДЛЯ СИМУЛЯЦИИ
        if (this.highlightedState && this.highlightedState.stateId === stateId) {
            const highlightType = this.highlightedState.type;
            
            // Разные цвета для разных типов подсветки
            switch (highlightType) {
                case 'from':
                    fillColor = '#2196f3'; // Синий - откуда перешли
                    break;
                case 'to':
                    fillColor = '#00bcd4'; // Зеленый - куда перешли
                    break;
                case 'final':
                    fillColor = '#ff9800'; // Оранжевый - финальное состояние
                    break;
            }
            
            // Добавляем свечение для подсвеченного состояния
            this.ctx.shadowColor = fillColor;
            this.ctx.shadowBlur = 15;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        // Подсветка выбранного состояния (ручной выбор пользователем)
        if (isSelected) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 45, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
            this.ctx.fill();
        }

        // Рисуем основной круг
        this.ctx.beginPath();
        this.ctx.arc(x, y, 35, 0, Math.PI * 2);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        
        // Обводка
        this.ctx.strokeStyle = isSelected ? '#ffeb3b' : '#ffffff';
        this.ctx.lineWidth = isSelected ? 4 : 3;
        this.ctx.stroke();

        // Сбрасываем тень после отрисовки состояния
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';

        // Подпись состояния
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(stateId, x, y);

        // Иконки для специальных состояний
        if (isInitial) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText('▶', x - 25, y - 25);
        }

        if (isFinal) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 28, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    /**
     * Получает цвет для символа
     */
    getSymbolColor(symbol) {
        if (!this.symbolColors[symbol]) {
            this.symbolColors[symbol] = this.generateColor(symbol);
        }
        return this.symbolColors[symbol];
    }

    /**
     * Обновляет цвета символов
     */
    updateSymbolColors() {
        const symbols = this.automaton.getAlphabet();
        symbols.forEach(symbol => {
            if (!this.symbolColors[symbol]) {
                this.symbolColors[symbol] = this.generateColor(symbol);
            }
        });
    }

    /**
     * Генерирует цвет для символа на основе его хэша
     */
    generateColor(symbol) {
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) {
            hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Упорядочивает состояния по кругу
     */
    arrangeStates() {
        const states = this.automaton.getAllStates();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        states.forEach((state, index) => {
            const angle = (index / states.length) * Math.PI * 2;
            state.setPosition(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
        });

        this.render();
    }

    /**
     * Устанавливает случайные позиции для состояний
     */
    randomizePositions() {
        const states = this.automaton.getAllStates();
        const padding = 70;

        states.forEach(state => {
            state.setPosition(
                padding + Math.random() * (this.canvas.width - 2 * padding),
                padding + Math.random() * (this.canvas.height - 2 * padding)
            );
        });

        this.render();
    }

    /**
     * Обновляет визуализацию
     */
    update() {
        this.render();
    }


    /**
     * Очищает canvas
     */
    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Уничтожает визуализатор
     */
    destroy() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Удаляем обработчики событий
        window.removeEventListener('resize', this.handleResize.bind(this));
        document.removeEventListener('click', this.hideContextMenu.bind(this));
    }
}

// Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphView;
} else {
    window.GraphView = GraphView;
}