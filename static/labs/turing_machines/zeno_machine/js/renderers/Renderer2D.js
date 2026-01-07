// js/renderers/Renderer2D.js
/**
 * Класс для 2D визуализации L-систем на Canvas
 * Отрисовывает фракталы и модели роста растений в 2D пространстве
 * Улучшенная версия с поддержкой информации о режимах и 3D команд
 */
class Renderer2D {
    /**
     * Конструктор 2D рендерера
     * @param {HTMLCanvasElement} canvas - Canvas элемент для отрисовки
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Настройка размеров canvas
        this.setupCanvas();
        
        // Команды для отрисовки
        this.commands = [];
        this.currentStep = 0;
        
        // Состояние анимации
        this.isAnimating = false;
        this.animationSpeed = 50; // шагов в секунду
        this.animationInterval = null;
        
        // Параметры отрисовки
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Цветовая схема по глубине
        this.colorScheme = [
            '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
            '#9C27B0', '#3F51B5', '#00BCD4', '#FF5722'
        ];
        
        // Состояние черепашки для анимации
        this.turtleState = {
            x: 0,
            y: 0,
            angle: -90, // начальный угол (смотрит вверх)
            width: 2,
            color: '#4CAF50',
            depth: 0
        };
        
        // Стек состояний для команд [ и ]
        this.stateStack = [];
        
        // Информация о системе
        this.systemInfo = {
            is3D: false,
            stochasticMode: false,
            totalIterations: 0,
            currentIteration: 0,
            stringLength: 0
        };
        
        // Время отрисовки
        this.lastRenderTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this._lastFrameTime = 0;
        
        console.log('✅ Renderer2D инициализирован с улучшениями');
    }

    /**
     * Настройка размеров и обработки canvas
     */
    setupCanvas() {
        // Установка размеров canvas
        this.canvas.width = this.canvas.clientWidth || 800;
        this.canvas.height = this.canvas.clientHeight || 600;
        
        // Обработка изменения размеров окна
        const resizeHandler = () => {
            this.canvas.width = this.canvas.clientWidth || 800;
            this.canvas.height = this.canvas.clientHeight || 600;
            this.draw();
        };
        
        window.addEventListener('resize', resizeHandler);
        this.resizeHandler = resizeHandler;
        
        // Обработка событий мыши для масштабирования и панорамирования
        this.setupMouseControls();
    }

    /**
     * Настройка обработчиков мыши для масштабирования и панорамирования
     */
    setupMouseControls() {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            this.draw();
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
            this.canvas.style.cursor = 'crosshair';
        });

        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            this.canvas.style.cursor = 'crosshair';
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomIntensity = 0.1;
            const wheel = e.deltaY < 0 ? 1 : -1;
            const zoom = Math.exp(wheel * zoomIntensity);
            
            // Масштабирование относительно курсора
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldMouseX = (mouseX - this.offsetX) / this.scale;
            const worldMouseY = (mouseY - this.offsetY) / this.scale;
            
            this.scale *= zoom;
            this.offsetX = mouseX - worldMouseX * this.scale;
            this.offsetY = mouseY - worldMouseY * this.scale;
            
            this.draw();
        });
    }

    /**
     * Установка команд для отрисовки
     * @param {Array} commands - Массив команд от парсера
     */
    setCommands(commands) {
        this.commands = commands;
        this.currentStep = 0;
        this.calculateViewport();
        this.draw();
    }

    /**
     * Установка информации о системе
     * @param {Object} info - Информация о системе
     */
    setSystemInfo(info) {
        this.systemInfo = { ...this.systemInfo, ...info };
        // Принудительно перерисовываем для отображения новой информации
        this.draw();
    }

    /**
     * Расчет viewport для центровки рисунка
     */
    calculateViewport() {
        if (this.commands.length === 0) {
            // Устанавливаем значения по умолчанию если команд нет
            this.scale = 1;
            this.offsetX = this.canvas.width / 2;
            this.offsetY = this.canvas.height / 2;
            return;
        }

        // Находим границы всех команд рисования
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.commands.forEach(command => {
            if (command.type === 'draw' && command.from && command.to) {
                minX = Math.min(minX, command.from.x, command.to.x);
                maxX = Math.max(maxX, command.from.x, command.to.x);
                minY = Math.min(minY, command.from.y, command.to.y);
                maxY = Math.max(maxY, command.from.y, command.to.y);
            }
        });

        // Если все значения остались бесконечными, используем значения по умолчанию
        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
            this.scale = 1;
            this.offsetX = this.canvas.width / 2;
            this.offsetY = this.canvas.height / 2;
            return;
        }

        const width = maxX - minX;
        const height = maxY - minY;
        
        // Добавляем отступы
        const padding = Math.max(width, height) * 0.1;
        
        // Вычисляем масштаб для вписывания в canvas
        const scaleX = (this.canvas.width * 0.9) / (width + padding * 2);
        const scaleY = (this.canvas.height * 0.9) / (height + padding * 2);
        this.scale = Math.min(scaleX, scaleY, 10); // Ограничиваем максимальный масштаб
        
        // Центрируем
        this.offsetX = (this.canvas.width - (width + padding * 2) * this.scale) / 2 - (minX - padding) * this.scale;
        this.offsetY = (this.canvas.height - (height + padding * 2) * this.scale) / 2 - (minY - padding) * this.scale;
    }

    /**
     * Отрисовка всех или части команд
     * @param {boolean} fullDraw - Флаг полной перерисовки
     */
    draw(fullDraw = true) {
        const startTime = performance.now();
        
        // Очистка canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.commands.length === 0) {
            this.drawEmptyState();
            return;
        }

        // Устанавливаем количество шагов для отрисовки
        const stepsToDraw = fullDraw ? this.commands.length : this.currentStep;

        this.ctx.save();
        
        // Применяем трансформации
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Сбрасываем состояние черепашки для анимации
        this.turtleState = {
            x: 0,
            y: 0,
            angle: -90,
            width: 2,
            color: this.getColorByDepth(0),
            depth: 0
        };
        this.stateStack = [];

        // Отрисовываем команды
        for (let i = 0; i < stepsToDraw; i++) {
            try {
                this.drawCommand(this.commands[i]);
            } catch (error) {
                console.warn('Ошибка при отрисовке команды:', error);
            }
        }

        this.ctx.restore();

        // Отрисовка информации о системе
        this.drawSystemInfo();

        // Расчет FPS
        const endTime = performance.now();
        this.lastRenderTime = endTime - startTime;
        this.frameCount++;
        
        // Обновляем FPS каждые 60 кадров
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / (endTime - (this._lastFrameTime || endTime)));
            this._lastFrameTime = endTime;
        }
    }

    /**
     * Отрисовка состояния пустого canvas
     */
    drawEmptyState() {
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#2d2d2d';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#b0b0b0';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Нет данных для отображения', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Настройте параметры L-системы и нажмите "Старт"', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }

    /**
     * Отрисовка информации о системе
     */
    drawSystemInfo() {
	/*
        this.ctx.save();
        this.ctx.resetTransform(); // Сбрасываем трансформации для отрисовки поверх
        
        const info = [
            `Режим: 2D${this.systemInfo.is3D ? ' (3D парсинг)' : ''}`,
            `Итерация: ${this.systemInfo.currentIteration}/${this.systemInfo.totalIterations}`,
            `Символов: ${this.systemInfo.stringLength.toLocaleString()}`,
            `Команд: ${this.commands.length.toLocaleString()}`,
            this.systemInfo.stochasticMode ? '🎲 Стохастический режим' : '⚡ Детерминированный режим',
            `FPS: ${this.fps} | Время: ${this.lastRenderTime.toFixed(1)}мс`
        ];

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary') || '#4CAF50';
        this.ctx.lineWidth = 1;
        
        // Фон для информации
        this.ctx.fillRect(10, 10, 250, info.length * 20 + 20);
        this.ctx.strokeRect(10, 10, 250, info.length * 20 + 20);
        
        // Текст информации
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        info.forEach((text, index) => {
            this.ctx.fillText(text, 20, 30 + index * 20);
        });

        // Подсказки управления
        const controls = [
            'Управление:',
            '• ЛКМ + перемещение - Панорамирование',
            '• Колесико мыши - Масштабирование'
        ];

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary') || '#2196F3';
        
        const controlsHeight = controls.length * 20 + 20;
        this.ctx.fillRect(this.canvas.width - 260, 10, 250, controlsHeight);
        this.ctx.strokeRect(this.canvas.width - 260, 10, 250, controlsHeight);
        
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#ffffff';
        controls.forEach((text, index) => {
            this.ctx.fillText(text, this.canvas.width - 250, 30 + index * 20);
        });

        this.ctx.restore();
	*/
    }

    /**
     * Отрисовка отдельной команды с обновлением состояния черепашки
     * @param {Object} command - Команда для отрисовки
     */
    drawCommand(command) {
        switch (command.type) {
            case 'draw':
                this.drawLine(command);
                // Обновляем позицию черепашки
                this.turtleState.x = command.to.x;
                this.turtleState.y = command.to.y;
                this.turtleState.width = command.to.width;
                this.turtleState.color = command.to.color;
                this.turtleState.depth = command.to.depth;
                break;
                
            case 'move':
                // Просто перемещаем черепашку без отрисовки
                this.turtleState.x = command.to.x;
                this.turtleState.y = command.to.y;
                this.turtleState.width = command.to.width;
                this.turtleState.color = command.to.color;
                this.turtleState.depth = command.to.depth;
                break;
                
            case 'rotate':
            case 'rotate3D': // Добавляем поддержку 3D вращений в 2D
                this.handleRotation(command);
                break;
                
            case 'pushState':
            case 'pushState3D': // Добавляем поддержку 3D состояний
                // Сохраняем текущее состояние в стек
                this.stateStack.push({...this.turtleState});
                this.turtleState.depth++;
                this.turtleState.color = this.getColorByDepth(this.turtleState.depth);
                break;
                
            case 'popState':
            case 'popState3D': // Добавляем поддержку 3D состояний
                // Восстанавливаем состояние из стека
                if (this.stateStack.length > 0) {
                    this.turtleState = this.stateStack.pop();
                }
                break;
                
            case 'changeWidth':
                this.turtleState.width = command.newWidth;
                break;
                
            case 'noop':
                // Ничего не делать
                break;
                
            default:
                console.warn('Неизвестный тип команды:', command.type);
        }
    }

    /**
     * Отрисовка линии
     * @param {Object} command - Команда рисования линии
     */
    drawLine(command) {
        const { from, to } = command;
        
        if (!from || !to) return;

        // Устанавливаем стиль линии
        this.ctx.strokeStyle = from.color || this.getColorByDepth(from.depth || 0);
        this.ctx.lineWidth = from.width || 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Рисуем линию
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
    }

    /**
     * Обработка команд поворота
     * @param {Object} command - Команда поворота
     */
    handleRotation(command) {
        switch (command.rotationType) {
            case 'turnLeft':
            case 'yawLeft':
                this.turtleState.angle += command.angle;
                break;
            case 'turnRight':
            case 'yawRight':
                this.turtleState.angle -= command.angle;
                break;
            case 'turnAround':
                this.turtleState.angle += 180;
                break;
            case 'pitchUp':
            case 'pitchDown':
            case 'rollLeft':
            case 'rollRight':
                // Для 2D рендерера игнорируем pitch и roll, так как они 3D-специфичные
                console.log('3D rotation ignored in 2D renderer:', command.rotationType);
                break;
            default:
                console.warn('Неизвестный тип поворота:', command.rotationType);
        }
        
        // Нормализуем угол в диапазоне 0-360
        this.turtleState.angle = this.turtleState.angle % 360;
        if (this.turtleState.angle < 0) {
            this.turtleState.angle += 360;
        }
    }

    /**
     * Получение цвета по глубине ветвления
     * @param {number} depth - Глубина ветвления
     * @returns {string} HEX код цвета
     */
    getColorByDepth(depth) {
        return this.colorScheme[depth % this.colorScheme.length] || '#4CAF50';
    }

    /**
     * Запуск анимации
     */
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const stepInterval = Math.max(16, 1000 / this.animationSpeed); // Минимум 16мс (60fps)
        
        this.animationInterval = setInterval(() => {
            if (this.currentStep < this.commands.length) {
                this.currentStep = Math.min(this.currentStep + Math.ceil(this.commands.length / 100), this.commands.length);
                this.draw(false);
            } else {
                this.stopAnimation();
            }
        }, stepInterval);
        
        console.log('▶️ Анимация 2D запущена');
    }

    /**
     * Остановка анимации
     */
    stopAnimation() {
        if (!this.isAnimating) return;
        
        this.isAnimating = false;
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        console.log('⏹️ Анимация 2D остановлена');
    }

    /**
     * Пошаговое выполнение анимации
     * @returns {boolean} Есть ли еще шаги для выполнения
     */
    step() {
        if (this.currentStep < this.commands.length) {
            this.currentStep++;
            this.draw(false);
            return this.currentStep < this.commands.length;
        }
        return false;
    }

    /**
     * Сброс анимации и отрисовки
     */
    reset() {
        this.stopAnimation();
        this.currentStep = 0;
        this.systemInfo.currentIteration = 0;
        this.draw();
        console.log('🔄 2D рендерер сброшен');
    }

    /**
     * Установка скорости анимации
     * @param {number} speed - Скорость анимации (1-100)
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = Math.max(1, Math.min(100, speed));
        
        // Перезапускаем анимацию с новой скоростью
        if (this.isAnimating) {
            this.stopAnimation();
            this.startAnimation();
        }
    }

    /**
     * Экспорт изображения в PNG
     * @returns {string} Data URL изображения
     */
    exportToPNG() {
        // Создаем временный canvas для экспорта с высоким разрешением
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        // Устанавливаем размеры в 2 раза больше для лучшего качества
        exportCanvas.width = this.canvas.width * 2;
        exportCanvas.height = this.canvas.height * 2;
        
        // Отрисовываем на временном canvas
        exportCtx.scale(2, 2);
        
        // Сохраняем текущее состояние трансформаций
        this.ctx.save();
        this.ctx.resetTransform();
        
        // Копируем содержимое
        exportCtx.drawImage(this.canvas, 0, 0);
        
        // Восстанавливаем состояние
        this.ctx.restore();
        
        return exportCanvas.toDataURL('image/png');
    }

    /**
     * Сохранение изображения
     * @param {string} filename - Имя файла для сохранения
     */
    saveImage(filename = 'l-system-2d.png') {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = this.exportToPNG();
            link.click();
            console.log('✅ Изображение сохранено:', filename);
        } catch (error) {
            console.error('Ошибка при сохранении изображения:', error);
        }
    }

    /**
     * Получение состояния рендерера
     * @returns {Object} Объект с состоянием
     */
    getState() {
        return {
            commandsCount: this.commands.length,
            currentStep: this.currentStep,
            isAnimating: this.isAnimating,
            animationSpeed: this.animationSpeed,
            scale: this.scale,
            offset: {
                x: this.offsetX,
                y: this.offsetY
            },
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            systemInfo: this.systemInfo,
            performance: {
                fps: this.fps,
                lastRenderTime: this.lastRenderTime,
                frameCount: this.frameCount
            },
            progress: this.commands.length > 0 ? 
                     (this.currentStep / this.commands.length * 100).toFixed(1) + '%' : '0%'
        };
    }

    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopAnimation();
        this.commands = [];
        
        // Удаление обработчиков событий
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        console.log('✅ Renderer2D уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer2D;
} else {
    window.Renderer2D = Renderer2D;
}