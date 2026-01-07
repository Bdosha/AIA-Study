class Simulator {
    constructor(turingMachine) {
        this.tm = turingMachine;
        this.isRunning = false;
        this.stepCount = 0;
        this.startTime = 0;
        this.intervalId = null;
        this.speed = 5; // 1-10
        this.maxSteps = 10000;
        
        this.onStep = null;
        this.onStateChange = null;
        this.onError = null;
    }
    
    setSpeed(speed) {
        this.speed = Math.max(1, Math.min(10, speed));
        if (this.isRunning) {
            this.restartInterval();
        }
    }
    
    setMaxSteps(maxSteps) {
        this.maxSteps = maxSteps;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.restartInterval();
        
        this.notifyStateChange('running');
    }
    
    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.notifyStateChange('paused');
    }
    
    stop() {
        this.pause();
        this.notifyStateChange('stopped');
    }
    
    step() {
        if (this.tm.isInFinalState()) {
            this.stop();
            return null;
        }
        
        if (this.stepCount >= this.maxSteps) {
            this.stop();
            if (this.onError) {
                this.onError(`Достигнут лимит шагов: ${this.maxSteps}`);
            }
            return null;
        }
        
        try {
            const result = this.tm.step();
            this.stepCount++;
            
            if (this.onStep) {
                this.onStep(result, this.stepCount);
            }
            
            if (this.tm.isInFinalState()) {
                this.stop();
            }
            
            return result;
        } catch (error) {
            this.stop();
            if (this.onError) {
                this.onError(error.message);
            }
            return null;
        }
    }
    
    reset() {
        this.stop();
        this.tm.reset();
        this.stepCount = 0;
        this.startTime = 0;
        
        this.notifyStateChange('reset');
    }
    
    restartInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Конвертируем скорость (1-10) в интервал (1000-100 мс)
        const interval = 1100 - (this.speed * 100);
        this.intervalId = setInterval(() => {
            this.step();
        }, interval);
    }
    
    notifyStateChange(state) {
        if (this.onStateChange) {
            this.onStateChange(state, {
                steps: this.stepCount,
                time: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
                isFinal: this.tm.isInFinalState()
            });
        }
    }
    
    getStats() {
        return {
            steps: this.stepCount,
            time: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
            isFinal: this.tm.isInFinalState(),
            isRunning: this.isRunning
        };
    }
}