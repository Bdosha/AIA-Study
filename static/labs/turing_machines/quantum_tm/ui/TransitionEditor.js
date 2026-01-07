class TransitionEditor {
    constructor() {
        this.transitions = [];
        this.states = ['q0', 'q1', 'q2', 'q3', 'q4', 'q_acc', 'q_rej', 'm_z0', 'm_z1', 'm_x0', 'm_x1'];
        this.symbols = ['0', '1', '-'];
        this.moves = ['L', 'R', 'N'];
    }

    render() {
        return `
        <div class="transition-editor">
            <div class="editor-header">
                <button class="add-rule-btn" onclick="transitionEditor.addRule()">
                    ＋ Добавить правило
                </button>
            </div>

            <div class="transitions-list">
                ${this.renderTransitions()}
            </div>

            <div class="editor-help">
                <h4>Инструкция:</h4>
                <ul>
                    <li><strong>Из состояния:</strong> Текущее состояние</li>
                    <li><strong>Символ:</strong> Читаемый с ленты</li>
                    <li><strong>В состояние:</strong> Новое состояние</li>
                    <li><strong>Записать:</strong> Символ на ленту</li>
                    <li><strong>Движение:</strong> L-влево, R-вправо, N-на месте</li>
                    <li><strong>Амплитуда:</strong> Амплитуда перехода (-1 до 1)</li>
                </ul>
            </div>
        </div>
        `;
    }

    renderTransitions() {
        if (this.transitions.length === 0) {
            return `
            <div class="empty-state">
                <p>Нет правил переходов</p>
                <p>Добавьте первое правило</p>
            </div>
            `;
        }

        return `
        <div class="transitions-table">
            <div class="table-header">
                <div>Из состояния</div>
                <div>Символ</div>
                <div>В состояние</div>
                <div>Записать</div>
                <div>Движение</div>
                <div>Амплитуда</div>
                <div>Удалить</div>
            </div>
            ${this.transitions.map((transition, index) => this.renderTransition(transition, index)).join('')}
        </div>
        `;
    }

    renderTransition(transition, index) {
        return `
        <div class="transition-row">
            <select onchange="transitionEditor.updateTransition(${index}, 'from', this.value)">
                ${this.states.map(state => `
                    <option value="${state}" ${state === transition.from ? 'selected' : ''}>${state}</option>
                `).join('')}
            </select>
            
            <select onchange="transitionEditor.updateTransition(${index}, 'read', this.value)">
                ${this.symbols.map(symbol => `
                    <option value="${symbol}" ${symbol === transition.read ? 'selected' : ''}>${symbol}</option>
                `).join('')}
            </select>
            
            <select onchange="transitionEditor.updateTransition(${index}, 'to', this.value)">
                ${this.states.map(state => `
                    <option value="${state}" ${state === transition.to ? 'selected' : ''}>${state}</option>
                `).join('')}
            </select>
            
            <select onchange="transitionEditor.updateTransition(${index}, 'write', this.value)">
                ${this.symbols.map(symbol => `
                    <option value="${symbol}" ${symbol === transition.write ? 'selected' : ''}>${symbol}</option>
                `).join('')}
            </select>
            
            <select onchange="transitionEditor.updateTransition(${index}, 'move', this.value)">
                ${this.moves.map(move => `
                    <option value="${move}" ${move === transition.move ? 'selected' : ''}>${move}</option>
                `).join('')}
            </select>
            
            <!-- ОБНОВЛЯЕМ INPUT: разрешаем отрицательные значения -->
            <input type="number" 
                value="${transition.amplitude}" 
                step="0.01" 
                min="-1" 
                max="1"
                oninput="transitionEditor.validateAmplitude(this, ${index})"
                onchange="transitionEditor.updateTransition(${index}, 'amplitude', this.value)">
            
            <button class="delete-btn" onclick="transitionEditor.removeTransition(${index})">
                ×
            </button>
        </div>
        `;
    }

    validateAmplitude(inputElement, index) {
        let value = parseFloat(inputElement.value);
        
        // Проверяем на NaN
        if (isNaN(value)) {
            value = 0;
        }
        
        // ОБНОВЛЯЕМ: разрешаем отрицательные амплитуды от -1 до 1
        if (value < -1) {
            value = -1;
            inputElement.value = -1;
        } else if (value > 1) {
            value = 1;
            inputElement.value = 1;
        }
        
        // Обновляем значение с ограничением
        this.updateTransition(index, 'amplitude', value);
        
        // Визуальная обратная связь
        if (value > 1 || value < -1) {
            inputElement.style.borderColor = '#ef4444';
            inputElement.style.backgroundColor = '#fee2e2';
        } else {
            inputElement.style.borderColor = '';
            inputElement.style.backgroundColor = '';
        }
    }

    addRule() {
        const newTransition = {
            from: 'q0',
            read: '0',
            to: 'q0',
            write: '0',
            move: 'R',
            amplitude: 1.0  // Можно изменить на 0.707 или -0.707
        };
        
        this.transitions.push(newTransition);
        this.updateDisplay();
        
        if (typeof this.onTransitionsChange === 'function') {
            this.onTransitionsChange(this.getTransitionsForSimulator());
        }
    }

    removeTransition(index) {
        this.transitions.splice(index, 1);
        this.updateDisplay();
        
        if (window.app && window.app.onTransitionsChange) {
            window.app.onTransitionsChange(this.getTransitionsForSimulator());
        }
    }

    updateTransition(index, field, value) {
        if (this.transitions[index]) {
            let finalValue = value;
            
            if (field === 'amplitude') {
                // Преобразуем в число
                finalValue = parseFloat(value);
                
                // Проверяем на NaN
                if (isNaN(finalValue)) {
                    finalValue = 0;
                }
                
                // ОБНОВЛЯЕМ: разрешаем от -1 до 1
                if (finalValue < -1) {
                    finalValue = -1;
                } else if (finalValue > 1) {
                    finalValue = 1;
                }
                
                // Округляем до 3 знаков после запятой
                finalValue = Math.round(finalValue * 1000) / 1000;
            }
            
            this.transitions[index][field] = finalValue;
            
            // Обновляем отображение input'а
            if (field === 'amplitude') {
                const inputElement = document.querySelector(`.transition-row:nth-child(${index + 2}) input`);
                if (inputElement && inputElement.value != finalValue) {
                    inputElement.value = finalValue;
                }
            }
            
            if (window.app && window.app.onTransitionsChange) {
                window.app.onTransitionsChange(this.getTransitionsForSimulator());
            }
        }
    }

    updateDisplay() {
        const container = document.getElementById('transition-editor-container');
        if (container) {
            container.innerHTML = this.render();
        }
    }

    // getTransitionsForSimulator() {
    //     return this.transitions.map(transition => ({
    //         fromState: this.convertStateForSimulator(transition.from),
    //         readSymbol: transition.read,
    //         toState: this.convertStateForSimulator(transition.to),
    //         writeSymbol: transition.write,
    //         moveDirection: transition.move,
    //         amplitude: { re: transition.amplitude, im: 0 }
    //     }));
    // }

    // В класс TransitionEditor добавь:
    getTransitionsForSimulator() {
        return this.transitions.map(transition => ({
            fromState: transition.from,
            readSymbol: transition.read,
            toState: transition.to,
            writeSymbol: transition.write,
            action: transition.move,
            amplitude: parseFloat(transition.amplitude) || 1
        }));
    }

    setTransitions(newTransitions) {
        this.transitions = newTransitions.map(trans => ({
            from: trans.fromState,
            read: trans.readSymbol,
            to: trans.toState,
            write: trans.writeSymbol,
            move: trans.action,
            amplitude: trans.amplitude.toString()
        }));
        this.updateDisplay();
    }

    convertStateForSimulator(state) {
        const mapping = {
            'q₀': 'q0',
            'q₁': 'q1', 
            'q_acc': 'qacc',
            'q_rej': 'qrej'
        };
        return mapping[state] || state;
    }
}

// Создаем глобальный экземпляр
window.transitionEditor = new TransitionEditor();