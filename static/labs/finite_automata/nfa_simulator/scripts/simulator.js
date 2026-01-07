class SimulationController {
    constructor(nfa, visualizer) {
        this.nfa = nfa;
        this.visualizer = visualizer;
        this.isRunning = false;
        this.speed = 1000;
        this.inputString = '';
        this.intervalId = null;
        this.initControls();
    }

    initControls() {
        const inputField = document.getElementById('input-string');
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stepBtn = document.getElementById('step-btn');
        const resetBtn = document.getElementById('reset-btn');
        const speedSlider = document.getElementById('speed-slider');

        // Проверяем существование элементов
        if (playBtn) playBtn.addEventListener('click', () => this.play());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
        if (stepBtn) stepBtn.addEventListener('click', () => this.step());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
        
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.speed = 2000 - parseInt(e.target.value);
            });
        }

        if (inputField) {
            inputField.addEventListener('input', (e) => {
                this.inputString = e.target.value;
                this.highlightCurrentSymbol();
            });
        }
    }

    play() {
        if (this.isRunning) return;
    
        // Сбросить автомат перед новой симуляцией
        this.nfa.reset();
    
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            const result = this.step();
            if (result.finished || result.error) {
                this.pause();
            }
        }, this.speed);
        this.updateButtonStates();
        
        console.log('Play button clicked - NFA simulation started');
    }

    pause() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.updateButtonStates();
    }

step() {
    const result = this.nfa.step(this.inputString);
    
    if (result && result.isEpsilonStep) {
        // Для ε-шага показываем подсветку ожидающих переходов
        this.visualizer.setPendingEpsilonTransitions(
            result.fromStates || Array.from(this.nfa.currentStates),
            result.currentStates || []
        );
        this.visualizer.render(this.nfa.currentStates, true); // showPendingEpsilon = true
    } else {
        // Для обычных шагов очищаем подсветку
        this.visualizer.clearPendingEpsilonTransitions();
        this.visualizer.render(this.nfa.currentStates);
    }
    
    this.highlightCurrentSymbol();
    this.updateStatus(result);
    
    if (result && result.finished) {
        this.showResult(result.accepted);
    }
    
    return result;
}

    reset() {
        this.pause();
        this.nfa.reset();
        this.visualizer.render([this.nfa.startState]);
        this.highlightCurrentSymbol();
        this.clearStatus();
    }

    highlightCurrentSymbol() {
        const inputDisplay = document.getElementById('input-display');
        if (!inputDisplay) return;
        
        const chars = this.inputString.split('');
        const highlightedChars = chars.map((char, index) => {
            if (index === this.nfa.currentPosition) {
                return `<span class="current-symbol">${char}</span>`;
            } else if (index < this.nfa.currentPosition) {
                return `<span class="processed-symbol">${char}</span>`;
            } else {
                return `<span class="pending-symbol">${char}</span>`;
            }
        });
        inputDisplay.innerHTML = highlightedChars.join('');
    }

updateStatus(result) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    if (result && result.error) {
        statusDiv.innerHTML = `<div class="error">Ошибка: ${result.error}</div>`;
    } else if (result && result.allPathsTerminated) {
        statusDiv.innerHTML = `
            <div class="warning">
                <div>Все пути завершились!</div>
                <div>Нет переходов по текущему символу</div>
                <div>Активных состояний: 0</div>
            </div>
        `;
    } else if (result && result.isEpsilonStep) {
        const currentStates = result.currentStates || [];
        const statesText = currentStates.length > 0 ? currentStates.join(', ') : 'нет активных';
        statusDiv.innerHTML = `
            <div class="epsilon-step">
                <div>🔁 <strong>Выполнение ε-перехода</strong></div>
                <div>Текущие состояния: <strong>[${statesText}]</strong></div>
                <div>Позиция в строке: ${result.position}/${this.inputString.length} (не изменилась)</div>
                <div>Активных состояний: ${currentStates.length}</div>
            </div>
        `;
    } else if (result && result.success) {
        const currentStates = result.currentStates || [];
        const statesText = currentStates.length > 0 ? currentStates.join(', ') : 'нет активных';
        statusDiv.innerHTML = `
            <div class="info">
                <div>Текущие состояния: <strong>[${statesText}]</strong></div>
                <div>Позиция в строке: ${result.position}/${this.inputString.length}</div>
                <div>Активных состояний: ${currentStates.length}</div>
            </div>
        `;
    } else if (result && result.finished) {
        const currentStates = result.currentStates || [];
        const statesText = currentStates.length > 0 ? currentStates.join(', ') : 'нет активных';
        statusDiv.innerHTML = `
            <div class="info">
                <div>Финальные состояния: <strong>[${statesText}]</strong></div>
                <div>Принимающие состояния: [${Array.from(this.nfa.acceptStates).join(', ')}]</div>
            </div>
        `;
    }
}

showResult(accepted) {
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    
    const currentStates = Array.from(this.nfa.currentStates);
    const acceptStates = Array.from(this.nfa.acceptStates);
    
    if (currentStates.length === 0) {
        resultDiv.innerHTML = `
            <div class="error">
                <strong>Все пути завершились!</strong>
                <div style="font-size: 0.9em; margin-top: 5px;">
                    Нет активных состояний для продолжения
                </div>
            </div>
        `;
    } else if (accepted) {
        const intersection = currentStates.filter(state => acceptStates.includes(state));
        resultDiv.innerHTML = `
            <div class="success">
                <strong>Строка принята автоматом!</strong>
                <div style="font-size: 0.9em; margin-top: 5px;">
                    Принимающие состояния в текущем множестве: [${intersection.join(', ')}]
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="error">
                <strong>Строка отклонена автоматом!</strong>
                <div style="font-size: 0.9em; margin-top: 5px;">
                    Нет принимающих состояний в текущем множестве [${currentStates.join(', ')}]
                </div>
            </div>
        `;
    }
}

    clearStatus() {
        const statusDiv = document.getElementById('status');
        const resultDiv = document.getElementById('result');
        if (statusDiv) statusDiv.innerHTML = '';
        if (resultDiv) resultDiv.innerHTML = '';
    }

    updateButtonStates() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn) playBtn.disabled = this.isRunning;
        if (pauseBtn) pauseBtn.disabled = !this.isRunning;
    }
}