// app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
class AutomataApp {
    constructor() {
        this.system = new MultiAgentSystem();
        this.currentStep = 0;
        this.simulationHistory = [];
        this.automatonCounter = 1;
        this.ui = new UIManager(this);
        
        this.initializeEventListeners();
        this.ui.updateInterface();
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 Автоматная система загружена!');
        });
    }

    resetSimulationState() {
        this.currentStep = 0;
        this.simulationHistory = [];
        this.system.resetSystem();
    }

    getSystem() {
        return this.system;
    }

    setSystem(newSystem) {
        this.system = newSystem;
        this.resetSimulationState();
        this.ui.updateInterface();
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.automataApp = new AutomataApp();
});