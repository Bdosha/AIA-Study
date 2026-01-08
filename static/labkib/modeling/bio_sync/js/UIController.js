// ==============================================
// ФАЙЛ: UIController.js
// ==============================================

/**
 * UIController.js
 * Контроллер для управления пользовательским интерфейсом
 * Обрабатывает события, обновляет отображение параметров и статуса
 */

class UIController {
    /**
     * Конструктор класса UIController
     * @param {KuramotoSimulator} simulator - Экземпляр симулятора
     */
    constructor(simulator) {
        this.simulator = simulator;
        this.elements = {};
    }

    /**
     * Инициализация контроллера интерфейса
     * Получает ссылки на элементы DOM и устанавливает обработчики событий
     */
    init() {
        // Получение ссылок на элементы управления
        this.elements = {
            couplingStrength: document.getElementById('coupling-strength'),
            frequencySpread: document.getElementById('frequency-spread'),
            interactionRadius: document.getElementById('interaction-radius'),
            iterations: document.getElementById('iterations'),

            couplingDisplay: document.getElementById('coupling-display'),
            spreadDisplay: document.getElementById('spread-display'),
            radiusDisplay: document.getElementById('radius-display'),
            iterationsDisplay: document.getElementById('iterations-display'),

            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),

            syncLevel: document.getElementById('sync-level'),
            currentIteration: document.getElementById('current-iteration'),
            syncTime: document.getElementById('sync-time'),
            noiseLevel: document.getElementById('noise-level'),
            criticalK: document.getElementById('critical-k'),
            statusMessage: document.getElementById('status-message'),

            emergencyAlert: document.getElementById('emergency-alert'),
            successAlert: document.getElementById('success-alert')
        };

        // Установка обработчиков событий для ползунков
        this.elements.couplingStrength.addEventListener('input', (e) => {
            this.simulator.K = parseFloat(e.target.value);
            this.elements.couplingDisplay.textContent = this.simulator.K.toFixed(1);
        });

        this.elements.frequencySpread.addEventListener('input', (e) => {
            this.simulator.sigma = parseFloat(e.target.value);
            this.elements.spreadDisplay.textContent = this.simulator.sigma.toFixed(1);
            this.updateCriticalK();
        });

        this.elements.interactionRadius.addEventListener('input', (e) => {
            this.simulator.radius = parseInt(e.target.value);
            const displayText = this.simulator.radius >= 10 ?
                `${this.simulator.radius} (полная связь)` :
                `${this.simulator.radius} соседей`;
            this.elements.radiusDisplay.textContent = displayText;
        });

        this.elements.iterations.addEventListener('input', (e) => {
            this.simulator.maxIter = parseInt(e.target.value);
            this.elements.iterationsDisplay.textContent = this.simulator.maxIter + ' итераций';
        });

        // Обработчики кнопок
        this.elements.startBtn.addEventListener('click', () => {
            this.simulator.start();
        });

        this.elements.pauseBtn.addEventListener('click', () => {
            this.simulator.pause();
        });

        this.elements.resetBtn.addEventListener('click', () => {
            this.simulator.reset();
            this.updateUI(0);
            this.hideAlerts();
            this.elements.noiseLevel.textContent = this.simulator.noiseAmplitude.toFixed(3);
        });

        // Отображение начального значения шума
        this.elements.noiseLevel.textContent = this.simulator.noiseAmplitude.toFixed(3);
        this.updateCriticalK();
    }

    /**
     * Обновление критического значения K на основе σ
     */
    updateCriticalK() {
        const criticalK = 1.6 * this.simulator.sigma;
        this.elements.criticalK.textContent = `~${criticalK.toFixed(1)}`;
    }

    /**
     * Обновление отображения состояния системы
     * @param {number} orderParam - Текущий параметр порядка
     */
    updateUI(orderParam) {
        const syncPercent = Math.round(orderParam * 100);
        this.elements.syncLevel.textContent = syncPercent + '%';
        this.elements.currentIteration.textContent = this.simulator.iteration;
        this.elements.syncTime.textContent =
            this.simulator.syncTime !== null ? this.simulator.syncTime : '—';

        const statusElement = this.elements.statusMessage;
        if (syncPercent < 30) {
            statusElement.textContent = 'Хаотическое состояние';
            statusElement.className = 'status-message status-chaos';

            if (this.simulator.iteration > 50 && orderParam < 0.2) {
                this.showAlert('emergency', '⚠️ АВАРИЙНАЯ СИТУАЦИЯ: Система нестабильна!');
            }
        } else if (syncPercent < 80) {
            statusElement.textContent = 'Частичная синхронизация';
            statusElement.className = 'status-message status-partial';
        } else {
            statusElement.textContent = 'Полная синхронизация достигнута!';
            statusElement.className = 'status-message status-sync';
        }

        const canvas = document.getElementById('oscillator-canvas');
        if (syncPercent > 80) {
            canvas.classList.add('synced');
        } else {
            canvas.classList.remove('synced');
        }
    }

    /**
     * Показ алерта (уведомления)
     * @param {string} type - Тип алерта ('emergency' или 'success')
     * @param {string} message - Текст сообщения
     */
    showAlert(type, message) {
        this.hideAlerts();

        const alert = type === 'success' ? this.elements.successAlert : this.elements.emergencyAlert;
        alert.textContent = message;
        alert.style.display = 'block';

        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }

    /**
     * Скрытие всех алертов
     */
    hideAlerts() {
        this.elements.emergencyAlert.style.display = 'none';
        this.elements.successAlert.style.display = 'none';
    }
}

