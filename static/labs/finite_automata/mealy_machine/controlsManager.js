/**
 * controlsManager.js
 * 
 * Менеджер управления интерфейсом симулятора Мили.
 * Все обработчики событий находятся ВНУТРИ initControls() с правильным закрытием.
 */

(function(global) {
    'use strict';

    let automaton = { states: [], inputs: [], outputs: [], transitions: {} };
    let simulator = null;
    let runInterval = null;
    let timerInterval = null;
    let timerStart = null;

    const STEP_DELAY = 700;

    /**
     * Главная функция инициализации элементов управления.
     */
    function initControls() {
        // === ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ DOM ===
        const rulesInput = document.getElementById('rulesInput');
        const applyBtn = document.getElementById('applyRules');
        const startBtn = document.getElementById('startSim');
        const stepBtn = document.getElementById('stepSim');
        const stopBtn = document.getElementById('stopSim');
        const resetBtn = document.getElementById('resetSim');
        const importBtn = document.getElementById('importRules');
        const importFile = document.getElementById('importFile');
        const exportBtn = document.getElementById('exportRules');
        const startStateInput = document.getElementById('startState');
        const inputSeq = document.getElementById('inputSeq');
        const parseErrors = document.getElementById('parseErrors');
        const outputArea = document.getElementById('outputArea');
        const currentState = document.getElementById('currentState');
        const currentStep = document.getElementById('currentStep');
        const simTime = document.getElementById('simTime');
        const presetBtns = document.querySelectorAll('.preset-btn');
        const resetView = document.getElementById('resetView');
        const infoBtn = document.getElementById('infoBtn');
        const infoModal = document.getElementById('infoModal');
        const modalClose = document.querySelector('.modal-close');
        const themeBtn = document.getElementById('themeToggle');

        // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

        function updateStatus() {
            if (currentState) {
                currentState.textContent = 'Состояние: ' + 
                    (simulator && simulator.currentState ? simulator.currentState : '—');
            }
            if (currentStep) {
                currentStep.textContent = 'Шаг: ' + (simulator ? simulator.stepIndex : 0);
            }
        }

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerStart = Date.now();
            timerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - timerStart) / 1000);
                const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const seconds = String(elapsed % 60).padStart(2, '0');
                if (simTime) {
                    simTime.textContent = 'Время: ' + minutes + ':' + seconds;
                }
            }, 250);
        }

        function stopTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = null;
        }

        function resetTimer() {
            stopTimer();
            if (simTime) simTime.textContent = 'Время: 00:00';
            timerStart = null;
        }

        /**
         * Применение правил: парсинг и визуализация автомата.
         */
        function applyRules() {
            if (parseErrors) parseErrors.textContent = '';

            const parsed = parseMealyAutomaton(rulesInput.value);

            if (!parsed.ok) {
                const errorMessages = parsed.errors
                    .map(err => `строка ${err.line}: ${err.message}`)
                    .join('\n');
                if (parseErrors) parseErrors.textContent = errorMessages;
                return;
            }

            parsed.states.sort();
            parsed.inputs.sort();

            automaton = parsed;

            const validation = validateMealy ? validateMealy(automaton) : { ok: true, errors: [] };
            if (!validation.ok) {
                const validationMessages = validation.errors
                    .map(err => err.message)
                    .join('\n');
                if (parseErrors) parseErrors.textContent = validationMessages;
            }

            if (window.graphVisualizer) graphVisualizer.buildFromAutomaton(automaton);
            if (window.tableVisualizer) tableVisualizer.renderTable(automaton);

            simulator = new MealySimulator(automaton);
            updateStatus();
        }

        // === РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ ===

        /**
         * Кнопка: Применить
         */
        if (applyBtn) {
            applyBtn.addEventListener('click', applyRules);
        }

        /**
         * Событие: создание ребра через графический интерфейс
         */
        window.addEventListener('graphEdgeCreated', (evt) => {
            const fromState = evt.detail.from;
            const toState = evt.detail.to;
            const edgeId = evt.detail.edgeId;

            const inputSymbol = prompt(`Укажите входной символ для перехода ${fromState} -> ${toState}`, '0');
            if (inputSymbol === null) return;

            const outputSymbol = prompt(`Укажите выходной символ для перехода ${fromState} -> ${toState}`, '1');
            if (outputSymbol === null) return;

            if (window.graphVisualizer) {
                graphVisualizer.updateEdgeLabel(edgeId, inputSymbol + ' / ' + outputSymbol, inputSymbol, outputSymbol);
            }

            if (window.graphVisualizer) {
                rulesInput.value = graphVisualizer.exportRulesText();
            }

            applyRules();
        });

        /**
         * Кнопка: Старт
         */
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!simulator) {
                    alert('Нажмите «Применить» для загрузки автомата');
                    return;
                }

                const startStateValue = startStateInput.value || automaton.states[0];
                const inputSequence = inputSeq.value || '';

                simulator.init(startStateValue, inputSequence);
                if (outputArea) outputArea.textContent = '';
                updateStatus();

                startBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = false;
                startTimer();

                function executionLoop() {
                    const stepInfo = simulator.step();

                    if (!stepInfo) {
                        if (runInterval) clearInterval(runInterval);
                        runInterval = null;
                        startBtn.disabled = false;
                        if (stopBtn) stopBtn.disabled = true;
                        stopTimer();
                        updateStatus();
                        return;
                    }

                    const outputSymbol = stepInfo.out === null ? '-' : stepInfo.out;
                    if (outputArea) outputArea.textContent += outputSymbol;

                    if (window.animationManager) {
                        animationManager.highlightStep(stepInfo);
                    }

                    updateStatus();

                    if (simulator.stepIndex >= simulator.inputSeq.length) {
                        if (runInterval) clearInterval(runInterval);
                        runInterval = null;
                        startBtn.disabled = false;
                        if (stopBtn) stopBtn.disabled = true;
                        stopTimer();
                        updateStatus();
                    }
                }

                executionLoop();
                runInterval = setInterval(executionLoop, STEP_DELAY);
            });
        }

        /**
         * Кнопка: Шаг
         */
        if (stepBtn) {
            stepBtn.addEventListener('click', () => {
                if (!simulator) {
                    alert('Нажмите «Применить» для загрузки автомата');
                    return;
                }

                if (simulator.currentState === null) {
                    const startStateValue = startStateInput.value || automaton.states[0];
                    const inputSequence = inputSeq.value || '';
                    simulator.init(startStateValue, inputSequence);
                    startTimer();
                }

                const stepInfo = simulator.step();

                if (stepInfo) {
                    const outputSymbol = stepInfo.out === null ? '-' : stepInfo.out;
                    if (outputArea) outputArea.textContent += outputSymbol;

                    if (window.animationManager) {
                        animationManager.highlightStep(stepInfo);
                    }

                    updateStatus();
                }
            });
        }

        /**
         * Кнопка: Стоп
         */
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                if (runInterval) clearInterval(runInterval);
                if (simulator) simulator.stop();
                startBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
                stopTimer();
            });
        }

        /**
         * Кнопка: Сброс
         */
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (runInterval) clearInterval(runInterval);
                if (simulator) simulator.reset();
                if (outputArea) outputArea.textContent = '';
                applyRules();
                startBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
                resetTimer();
            });
        }

        /**
         * Кнопка: Импорт
         */
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });
        }

        if (importFile) {
            importFile.addEventListener('change', (evt) => {
                const file = evt.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    rulesInput.value = reader.result;
                    applyRules();
                };
                reader.readAsText(file);
            });
        }

        /**
         * Кнопка: Экспорт
         */
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const content = rulesInput.value;
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'mealy_rules.txt';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }

        /**
         * Кнопка: Сброс вида графа
         */
        if (resetView) {
            resetView.addEventListener('click', () => {
                if (window.graphVisualizer) graphVisualizer.resetView();
            });
        }

        /**
         * Пресеты (примеры)
         */
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetKey = btn.dataset.preset;

                if (presetKey === 'det01') {
                    rulesInput.value = 's0,0 -> s0,0\ns0,1 -> s1,0\ns1,0 -> s0,1\ns1,1 -> s1,0';
                } else if (presetKey === 'det101') {
                    rulesInput.value = 's0,0 -> s0,0\ns0,1 -> s1,0\ns1,0 -> s2,0\ns1,1 -> s1,0\ns2,0 -> s0,0\ns2,1 -> s1,1';
                }

                applyRules();
            });
        });

        /**
         * Кнопка: Информация
         */
        if (infoBtn) {
            infoBtn.addEventListener('click', () => {
                if (infoModal) {
                    infoModal.style.display = 'flex';
                    infoModal.setAttribute('aria-hidden', 'false');
                }
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                if (infoModal) {
                    infoModal.style.display = 'none';
                    infoModal.setAttribute('aria-hidden', 'true');
                }
            });
        }

        /**
         * Кнопка: Переключение темы (ГЛАВНОЕ ИСПРАВЛЕНИЕ!)
         */
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                console.log('Кнопка темы нажата');
                if (window.themeSwitcher) {
                    window.themeSwitcher.toggleTheme();
                }
                if (window.graphVisualizer && window.graphVisualizer.refreshTheme) {
                    window.graphVisualizer.refreshTheme();
                }
            });
        }

        // Экспорт функции применения правил
        window._appApplyRules = applyRules;

    } // ← ЗАКРЫВАЮЩАЯ СКОБКА initControls()

    /**
     * Инициализация при загрузке DOM
     */
    document.addEventListener('DOMContentLoaded', () => {
        initControls();
    });

})(window); // ← ЗАКРЫТИЕ IIFE