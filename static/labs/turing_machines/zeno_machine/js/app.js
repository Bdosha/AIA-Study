// js/app.js
/**
 * Главный класс приложения L-систем с поддержкой стохастических правил и 3D
 */
class LSystemsApp {
    constructor() {
        this.lSystem = null;
        this.parser = null;
        this.renderer2D = null;
        this.renderer3D = null;
        this.themeManager = null;
        this.controlPanel = null;
        
        this.state = {
            currentRenderMode: '2d',
            isSimulationRunning: false,
            currentSpeed: 5,
            currentSettings: null,
            isInitialized: false,
            currentPreset: 'koch',
            currentStep: 0,
            useStepByStep: false,
            animationProgress: 0,
            stochasticMode: false,
            randomSeed: 12345,
            is3DMode: false,
            lastGeneratedString: '',
            commands: []
        };
        
        this.animationFrameId = null;
        this.lastRenderTime = 0;
        this.startTime = 0;
        
        // Привязка контекста
        this.handleSettingsApply = this.handleSettingsApply.bind(this);
        this.handleSimulationStart = this.handleSimulationStart.bind(this);
        this.handleSimulationStop = this.handleSimulationStop.bind(this);
        this.handleSimulationStep = this.handleSimulationStep.bind(this);
        this.handleSimulationReset = this.handleSimulationReset.bind(this);
        this.handleSpeedChange = this.handleSpeedChange.bind(this);
        this.handlePresetChange = this.handlePresetChange.bind(this);
        this.handleRenderModeChange = this.handleRenderModeChange.bind(this);
        this.handleStochasticToggle = this.handleStochasticToggle.bind(this);
        this.handleRandomSeedChange = this.handleRandomSeedChange.bind(this);
        this.handle3DModeToggle = this.handle3DModeToggle.bind(this);
        this.handleRegenerateStochastic = this.handleRegenerateStochastic.bind(this);
        this.handleResetCamera = this.handleResetCamera.bind(this);

        this.init();
    }

    async init() {
        try {
            console.log('🚀 Инициализация приложения L-систем...');
            
            this.initThemeManager();
            this.initCoreModules();
            this.initRenderers();
            this.initControlPanel();
            this.loadInitialPreset();
            
            this.state.isInitialized = true;
            console.log('✅ Приложение успешно инициализировано');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка инициализации', error.message);
        }
    }

    initCoreModules() {
        try {
            if (typeof LSystem !== 'undefined') {
                this.lSystem = new LSystem();
                console.log('✅ LSystem загружен');
            } else {
                throw new Error('LSystem класс не найден');
            }

            if (typeof Parser !== 'undefined') {
                this.parser = new Parser();
                console.log('✅ Parser загружен');
            } else {
                throw new Error('Parser класс не найден');
            }
        } catch (error) {
            console.error('Ошибка загрузки модулей:', error);
            this.createBasicModules();
        }
    }

    createBasicModules() {
        if (!this.lSystem) {
            class BasicLSystem {
                constructor(axiom = 'F', rules = {}, angle = 25, iterations = 4) {
                    this.axiom = axiom;
                    this.rules = this.parseRules(rules);
                    this.angle = angle;
                    this.iterations = Math.min(Math.max(1, iterations), 15);
                    this.currentIteration = 0;
                    this.generatedString = axiom;
                }
                
                setParameters(axiom, rules, angle, iterations) {
                    this.axiom = axiom;
                    this.rules = this.parseRules(rules);
                    this.angle = angle;
                    this.iterations = iterations;
                    this.reset();
                }
                
                parseRules(rules) {
                    if (typeof rules === 'string') {
                        const result = {};
                        const lines = rules.split('\n');
                        for (const line of lines) {
                            if (line.includes('->')) {
                                const [key, value] = line.split('->');
                                if (key && value) {
                                    result[key.trim()] = value.trim();
                                }
                            }
                        }
                        return result;
                    }
                    return rules;
                }
                
                generateAll() { 
                    this.reset();
                    for (let i = 0; i < this.iterations; i++) {
                        this.iterate();
                    }
                    return this.generatedString; 
                }
                
                iterate() {
                    if (this.currentIteration >= this.iterations) return this.generatedString;
                    
                    let result = '';
                    for (let i = 0; i < this.generatedString.length; i++) {
                        const char = this.generatedString[i];
                        result += this.rules[char] || char;
                    }
                    this.generatedString = result;
                    this.currentIteration++;
                    return this.generatedString;
                }
                
                reset() {
                    this.currentIteration = 0;
                    this.generatedString = this.axiom;
                }
                
                getStats() { 
                    return { 
                        currentIteration: this.currentIteration, 
                        stringLength: this.generatedString.length
                    }; 
                }
            }
            this.lSystem = new BasicLSystem();
        }

        if (!this.parser) {
            class BasicParser {
                constructor(angle = 25, stepLength = 10, width = 2) {
                    this.angle = angle;
                    this.stepLength = stepLength;
                    this.width = width;
                    this.commands = [];
                }
                
                setParameters(angle, length, width) {
                    this.angle = angle;
                    this.stepLength = length;
                    this.width = width;
                }
                
                parse(lString, is3D = false) {
                    this.commands = [];
                    return this.parse2D(lString);
                }
                
                parse2D(lString) {
                    let x = 0, y = 0, angle = -90;
                    const stack = [];
                    let depth = 0;
                    
                    for (let i = 0; i < lString.length; i++) {
                        const char = lString[i];
                        if (char === 'F' || char === 'G' || char === 'A') {
                            const newX = x + this.stepLength * Math.cos(angle * Math.PI / 180);
                            const newY = y + this.stepLength * Math.sin(angle * Math.PI / 180);
                            
                            this.commands.push({
                                type: 'draw',
                                from: { x, y, z: 0, width: this.width, depth },
                                to: { x: newX, y: newY, z: 0, width: this.width, depth },
                                is3D: false
                            });
                            x = newX;
                            y = newY;
                        } else if (char === '+') {
                            angle += this.angle;
                        } else if (char === '-') {
                            angle -= this.angle;
                        } else if (char === '[') {
                            stack.push({ x, y, angle, depth });
                            depth++;
                        } else if (char === ']') {
                            const state = stack.pop();
                            if (state) {
                                x = state.x;
                                y = state.y;
                                angle = state.angle;
                                depth = state.depth;
                            }
                        }
                    }
                    return this.commands;
                }
            }
            this.parser = new BasicParser();
        }
    }

    initThemeManager() {
        if (typeof ThemeManager !== 'undefined') {
            this.themeManager = new ThemeManager();
        }
    }

    initRenderers() {
        try {
            // 2D рендерер
            const canvas2d = document.getElementById('canvas2d');
            if (canvas2d && typeof Renderer2D !== 'undefined') {
                this.renderer2D = new Renderer2D(canvas2d);
            }

            // 3D рендерер
            if (typeof Renderer3D !== 'undefined') {
                this.renderer3D = new Renderer3D('container3d');
            }
        } catch (error) {
            console.error('Ошибка инициализации рендереров:', error);
        }
    }

    initControlPanel() {
        if (typeof ControlPanel !== 'undefined') {
            this.controlPanel = new ControlPanel({
                onSettingsApply: this.handleSettingsApply,
                onSimulationStart: this.handleSimulationStart,
                onSimulationStop: this.handleSimulationStop,
                onSimulationStep: this.handleSimulationStep,
                onSimulationReset: this.handleSimulationReset,
                onSpeedChange: this.handleSpeedChange,
                onPresetChange: this.handlePresetChange,
                onRenderModeChange: this.handleRenderModeChange,
                onStochasticToggle: this.handleStochasticToggle,
                onRandomSeedChange: this.handleRandomSeedChange,
                on3DModeToggle: this.handle3DModeToggle,
                onRegenerateStochastic: this.handleRegenerateStochastic,
                onResetCamera: this.handleResetCamera
            });
        }
    }

    // Обработчики событий
    handleSettingsApply(settings) {
        try {
            this.lSystem.setParameters(
                settings.axiom,
                settings.rules,
                settings.angle,
                settings.iterations
            );
            
            this.parser.setParameters(
                settings.angle,
                settings.length || 10,
                settings.width || 2
            );
            
            this.state.lastGeneratedString = '';
            this.generateAndRender();
            this.state.currentSettings = settings;
            
        } catch (error) {
            console.error('Ошибка применения настроек:', error);
        }
    }

    handleSimulationStart() {
        this.state.isSimulationRunning = true;
        this.startAnimationLoop();
    }

    handleSimulationStop() {
        this.state.isSimulationRunning = false;
        this.stopAnimationLoop();
    }

    handleSimulationStep() {
        if (this.lSystem.currentIteration < this.lSystem.iterations) {
            this.lSystem.iterate();
            this.renderCurrentState();
        }
    }

    handleSimulationReset() {
        this.state.isSimulationRunning = false;
        this.stopAnimationLoop();
        this.lSystem.reset();
        this.state.animationProgress = 0;
        this.renderCurrentState();
    }

    handleSpeedChange(speed) {
        this.state.currentSpeed = speed;
    }

    handlePresetChange(presetId) {
        this.state.currentPreset = presetId;
        const preset = LSystem.createPreset(presetId);
        if (preset) {
            this.applyPreset(preset);
        }
    }

    handleRenderModeChange(mode) {
        this.activateRenderMode(mode);
    }

    handleStochasticToggle(enabled) {
        this.state.stochasticMode = enabled;
        if (enabled && this.state.randomSeed) {
            this.lSystem.setRandomSeed(this.state.randomSeed);
        }
        if (this.state.lastGeneratedString) {
            this.renderCurrentState();
        }
    }

    handleRandomSeedChange(seed) {
        this.state.randomSeed = seed;
        if (this.state.stochasticMode) {
            this.lSystem.setRandomSeed(seed);
            this.regenerateStochastic();
        }
    }

    handle3DModeToggle(enabled) {
        this.state.is3DMode = enabled;
        if (this.state.lastGeneratedString) {
            this.renderCurrentState();
        }
    }

    handleRegenerateStochastic() {
        this.regenerateStochastic();
    }

    handleResetCamera() {
        if (this.renderer3D) {
            this.renderer3D.resetCamera();
        }
    }

    // Основные методы
    generateAndRender() {
        try {
            const lString = this.lSystem.generateAll();
            this.state.lastGeneratedString = lString;
            
            const use3DParsing = this.state.is3DMode;
            this.state.commands = this.parser.parse(lString, use3DParsing);
            
            this.renderCommands();
            
            const stats = {
                ...this.lSystem.getStats(),
                commandsCount: this.state.commands.length,
                used3DParsing: use3DParsing,
                stochasticMode: this.state.stochasticMode
            };
            
            if (this.controlPanel) {
                this.controlPanel.updateSimulationStats(stats);
            }
            
        } catch (error) {
            console.error('Ошибка генерации и отрисовки:', error);
        }
    }

    renderCurrentState() {
        try {
            const lString = this.lSystem.generatedString;
            this.state.lastGeneratedString = lString;
            
            const use3DParsing = this.state.is3DMode;
            this.state.commands = this.parser.parse(lString, use3DParsing);
            
            this.renderCommands();
            
        } catch (error) {
            console.error('Ошибка отрисовки:', error);
        }
    }

    renderCommands() {
        if (this.state.currentRenderMode === '2d' && this.renderer2D) {
            this.renderer2D.setCommands(this.state.commands);
        } else if (this.state.currentRenderMode === '3d' && this.renderer3D) {
            this.renderer3D.render(this.state.commands);
        }
    }

    regenerateStochastic() {
        if (!this.state.stochasticMode) return;
        this.state.lastGeneratedString = '';
        this.generateAndRender();
    }

    activateRenderMode(mode) {
        // Обновляем вкладки
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === mode) {
                tab.classList.add('active');
            }
        });

        // Переключаем видимость
        const canvas2d = document.getElementById('canvas2d');
        const container3d = document.getElementById('container3d');
        
        if (mode === '2d') {
            if (canvas2d) canvas2d.style.display = 'block';
            if (container3d) container3d.style.display = 'none';
        } else {
            if (canvas2d) canvas2d.style.display = 'none';
            if (container3d) container3d.style.display = 'block';
        }

        this.state.currentRenderMode = mode;
        
        // Перерисовываем текущее состояние
        if (this.state.commands.length > 0) {
            this.renderCommands();
        }
    }

    loadInitialPreset() {
        this.applyPreset(LSystem.createPreset('koch'));
    }

    applyPreset(preset) {
        if (!preset) return;
        
        this.lSystem.setParameters(
            preset.axiom,
            preset.rules,
            preset.angle,
            preset.iterations
        );
        
        this.parser.setParameters(
            preset.angle,
            10,
            2
        );
        
        this.generateAndRender();
    }

    startAnimationLoop() {
        if (this.animationFrameId) return;
        
        this.startTime = performance.now();
        this.lastRenderTime = this.startTime;
        
        const animate = (currentTime) => {
            if (!this.state.isSimulationRunning) return;
            
            const deltaTime = currentTime - this.lastRenderTime;
            const speedFactor = this.state.currentSpeed / 5;
            
            if (deltaTime > (1000 / 60)) {
                this.state.animationProgress = Math.min(1.0, this.state.animationProgress + 0.01 * speedFactor);
                
                if (this.state.animationProgress >= 1.0) {
                    this.state.animationProgress = 0;
                    if (this.lSystem.currentIteration < this.lSystem.iterations) {
                        this.lSystem.iterate();
                        this.renderCurrentState();
                    } else {
                        this.handleSimulationStop();
                    }
                }
                
                this.lastRenderTime = currentTime;
            }
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    showError(title, message) {
        console.error(`${title}: ${message}`);
    }
}

// Инициализация приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lSystemsApp = new LSystemsApp();
    });
} else {
    window.lSystemsApp = new LSystemsApp();
}

window.LSystemsApp = LSystemsApp;