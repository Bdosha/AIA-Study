class SimulationController {
    constructor(dfa, visualizer) {
        this.dfa = dfa;
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
    
        // КРИТИЧНО: сбросить автомат перед новой симуляцией
        this.dfa.reset();
    
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            const result = this.step();
            if (result.finished || result.error) {
                this.pause();
            }
        }, this.speed);
        this.updateButtonStates();
        
        console.log('Play button clicked'); // Для отладки
        
        if (this.isRunning) return;

        // Инициализируем DFA перед запуском
        this.dfa.reset();
        this.isRunning = true;
        
        this.intervalId = setInterval(() => {
            const result = this.step();
            if (result && (result.finished || result.error)) {
                this.pause();
            }
        }, this.speed);
        
        this.updateButtonStates();
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
        const result = this.dfa.step(this.inputString);
        this.visualizer.render(this.dfa.currentState);
        this.highlightCurrentSymbol();
        this.updateStatus(result);
        
        if (result && result.finished) {
            this.showResult(result.accepted);
        }
        
        return result;
    }

    reset() {
        this.pause();
        this.dfa.reset();
        this.visualizer.render(this.dfa.startState);
        this.highlightCurrentSymbol();
        this.clearStatus();
    }

    highlightCurrentSymbol() {
        const inputDisplay = document.getElementById('input-display');
        if (!inputDisplay) return;
        
        const chars = this.inputString.split('');
        const highlightedChars = chars.map((char, index) => {
            if (index === this.dfa.currentPosition) {
                return `<span class="current-symbol">${char}</span>`;
            } else if (index < this.dfa.currentPosition) {
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
        } else if (result && result.success) {
            statusDiv.innerHTML = `<div class="info">Текущее состояние: ${result.currentState}</div>`;
        }
    }

    showResult(accepted) {
        const resultDiv = document.getElementById('result');
        if (!resultDiv) return;
        
        if (accepted) {
            resultDiv.innerHTML = '<div class="success">Строка принята автоматом!</div>';
        } else {
            resultDiv.innerHTML = '<div class="error">Строка отклонена автоматом!</div>';
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