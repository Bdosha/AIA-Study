// js/core/Parser.js
/**
 * Класс для преобразования строк L-систем в команды Turtle Graphics
 * Оптимизированная версия с улучшенной поддержкой 3D
 */
class Parser {
    /**
     * Конструктор парсера
     * @param {number} angle - Угол поворота в градусах
     * @param {number} stepLength - Длина шага
     * @param {number} lineWidth - Толщина линии
     */
    constructor(angle = 60, stepLength = 10, lineWidth = 2) {
        this.angle = angle;
        this.stepLength = stepLength;
        this.lineWidth = lineWidth;
        this.commands = [];
        
        // Цветовая схема по глубине
        this.colorScheme = [
            '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
            '#9C27B0', '#3F51B5', '#00BCD4', '#FF5722'
        ];
        
        console.log('✅ Parser инициализирован с улучшенной поддержкой 3D');
    }

    /**
     * Установка параметров парсера
     * @param {number} angle - Угол поворота
     * @param {number} stepLength - Длина шага
     * @param {number} lineWidth - Толщина линии
     */
    setParameters(angle, stepLength, lineWidth) {
        this.angle = angle;
        this.stepLength = stepLength;
        this.lineWidth = lineWidth;
    }

    /**
     * Парсинг строки L-системы в команды Turtle Graphics
     * @param {string} lString - Строка L-системы
     * @param {boolean} is3D - Флаг для 3D режима
     * @returns {Array} Массив команд для отрисовки
     */
    parse(lString, is3D = false) {
        this.commands = [];
        
        if (!lString || typeof lString !== 'string') {
            console.warn('Пустая строка для парсинга');
            return this.commands;
        }

        try {
            if (is3D) {
                return this.parse3D(lString);
            } else {
                return this.parse2D(lString);
            }
        } catch (error) {
            console.error('Ошибка парсинга, используем 2D режим:', error);
            return this.parse2D(lString);
        }
    }

    /**
     * Парсинг для 2D режима
     * @param {string} lString - Строка L-системы
     * @returns {Array} Массив команд для отрисовки
     */
    parse2D(lString) {
        // Начальное состояние черепашки
        let state = {
            x: 0,
            y: 0,
            z: 0,
            angle: -90, // Начальный угол (смотрит вверх)
            width: this.lineWidth,
            depth: 0
        };

        const stack = [];
        let stepCount = 0;

        try {
            for (let i = 0; i < lString.length; i++) {
                const char = lString[i];
                
                switch (char) {
                    case 'F': // Движение вперед с рисованием
                    case 'G': // Движение вперед с рисованием (альтернатива)
                    case 'A': // Движение вперед (для аксиом)
                    case '0': // Часто используется в деревьях
                    case '1': // Часто используется в деревьях
                        this.handleForward2D(state);
                        stepCount++;
                        break;
                        
                    case 'f': // Движение вперед без рисования
                        this.handleMove2D(state);
                        break;
                        
                    case '+': // Поворот налево
                        state.angle += this.angle;
                        this.commands.push({
                            type: 'rotate',
                            rotationType: 'turnLeft',
                            angle: this.angle,
                            currentAngle: state.angle
                        });
                        break;
                        
                    case '-': // Поворот направо
                        state.angle -= this.angle;
                        this.commands.push({
                            type: 'rotate',
                            rotationType: 'turnRight',
                            angle: this.angle,
                            currentAngle: state.angle
                        });
                        break;
                        
                    case '|': // Разворот на 180 градусов
                        state.angle += 180;
                        this.commands.push({
                            type: 'rotate', 
                            rotationType: 'turnAround',
                            angle: 180,
                            currentAngle: state.angle
                        });
                        break;
                        
                    case '[': // Сохранить состояние
                        stack.push({
                            x: state.x,
                            y: state.y, 
                            z: state.z,
                            angle: state.angle,
                            width: state.width,
                            depth: state.depth
                        });
                        this.commands.push({
                            type: 'pushState',
                            state: {...state},
                            depth: state.depth
                        });
                        state.depth++;
                        break;
                        
                    case ']': // Восстановить состояние
                        if (stack.length > 0) {
                            const savedState = stack.pop();
                            state.x = savedState.x;
                            state.y = savedState.y;
                            state.z = savedState.z;
                            state.angle = savedState.angle;
                            state.width = savedState.width;
                            state.depth = savedState.depth;
                            
                            this.commands.push({
                                type: 'popState',
                                state: {...state},
                                depth: state.depth
                            });
                        }
                        break;
                        
                    default:
                        // Игнорируем неизвестные символы
                        break;
                }
                
                // Нормализация угла
                state.angle = state.angle % 360;
                if (state.angle < 0) state.angle += 360;
            }
            
            console.log(`✅ 2D парсинг завершен: ${stepCount} шагов, ${this.commands.length} команд`);
            
        } catch (error) {
            console.error('❌ Ошибка 2D парсинга:', error);
        }
        
        return this.commands;
    }

    /**
     * Парсинг для 3D режима с упрощенными поворотами
     * @param {string} lString - Строка L-системы
     * @returns {Array} Массив команд для отрисовки
     */
    parse3D(lString) {
        // Начальное состояние черепашки в 3D
        let state = {
            x: 0,
            y: 0,
            z: 0,
            angleX: 0,    // Угол вокруг оси X (pitch)
            angleY: -90,  // Угол вокруг оси Y (yaw) - смотрит вперед
            angleZ: 0,    // Угол вокруг оси Z (roll)
            width: this.lineWidth,
            depth: 0
        };

        const stack = [];
        let stepCount = 0;

        try {
            for (let i = 0; i < lString.length; i++) {
                const char = lString[i];
                
                switch (char) {
                    case 'F': // Движение вперед с рисованием
                    case 'G': // Движение вперед с рисованием
                    case 'A': // Движение вперед (для аксиом)
                    case '0': // Часто используется в деревьях
                    case '1': // Часто используется в деревьях
                        this.handleForward3D(state);
                        stepCount++;
                        break;
                        
                    case 'f': // Движение вперед без рисования
                        this.handleMove3D(state);
                        break;
                        
                    case '+': // Yaw влево (поворот вокруг оси Y)
                        state.angleY += this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'yawLeft',
                            angle: this.angle,
                            axis: 'Y',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '-': // Yaw вправо (поворот вокруг оси Y)
                        state.angleY -= this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'yawRight',
                            angle: this.angle,
                            axis: 'Y',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '&': // Pitch down (наклон вниз вокруг оси X)
                        state.angleX -= this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'pitchDown',
                            angle: this.angle,
                            axis: 'X',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '^': // Pitch up (наклон вверх вокруг оси X)
                        state.angleX += this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'pitchUp',
                            angle: this.angle,
                            axis: 'X',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '\\': // Roll left (крен влево вокруг оси Z)
                        state.angleZ += this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'rollLeft',
                            angle: this.angle,
                            axis: 'Z',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '/': // Roll right (крен вправо вокруг оси Z)
                        state.angleZ -= this.angle;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'rollRight',
                            angle: this.angle,
                            axis: 'Z',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '|': // Разворот на 180 градусов вокруг Y
                        state.angleY += 180;
                        this.commands.push({
                            type: 'rotate3D',
                            rotationType: 'turnAround',
                            angle: 180,
                            axis: 'Y',
                            currentAngles: { ...state }
                        });
                        break;
                        
                    case '[': // Сохранить состояние в 3D
                        stack.push({ ...state });
                        this.commands.push({
                            type: 'pushState3D',
                            state: { ...state },
                            depth: state.depth
                        });
                        state.depth++;
                        break;
                        
                    case ']': // Восстановить состояние в 3D
                        if (stack.length > 0) {
                            const savedState = stack.pop();
                            state = { ...savedState };
                            
                            this.commands.push({
                                type: 'popState3D',
                                state: { ...state },
                                depth: state.depth
                            });
                        }
                        break;
                        
                    default:
                        // Игнорируем неизвестные символы
                        break;
                }
                
                // Нормализация углов
                state.angleX = this.normalizeAngle(state.angleX);
                state.angleY = this.normalizeAngle(state.angleY);
                state.angleZ = this.normalizeAngle(state.angleZ);
            }
            
            console.log(`✅ 3D парсинг завершен: ${stepCount} шагов, ${this.commands.length} команд`);
            
        } catch (error) {
            console.error('❌ Ошибка 3D парсинга:', error);
        }
        
        return this.commands;
    }

    /**
     * Нормализация угла в диапазон 0-360
     */
    normalizeAngle(angle) {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        return angle;
    }

    /**
     * Вычисление направления движения на основе углов Эйлера
     */
    calculateDirection(angleX, angleY, angleZ) {
        // Преобразуем углы в радианы
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;
        const radZ = angleZ * Math.PI / 180;
        
        // Вычисляем направление вектора
        const x = Math.sin(radY) * Math.cos(radX);
        const y = Math.sin(radX);
        const z = Math.cos(radY) * Math.cos(radX);
        
        return { x, y, z };
    }

    /**
     * Обработка движения вперед с рисованием в 2D
     * @param {Object} state - Текущее состояние черепашки
     */
    handleForward2D(state) {
        const angleRad = state.angle * Math.PI / 180;
        
        const newX = state.x + this.stepLength * Math.cos(angleRad);
        const newY = state.y + this.stepLength * Math.sin(angleRad);

        const drawCommand = {
            type: 'draw',
            from: {
                x: state.x,
                y: state.y,
                z: 0,
                width: Math.max(1, this.lineWidth - state.depth * 0.5),
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            to: {
                x: newX,
                y: newY,
                z: 0,
                width: Math.max(1, this.lineWidth - state.depth * 0.5),
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            length: this.stepLength,
            is3D: false
        };

        this.commands.push(drawCommand);

        state.x = newX;
        state.y = newY;
    }

    /**
     * Обработка движения вперед без рисования в 2D
     * @param {Object} state - Текущее состояние черепашки
     */
    handleMove2D(state) {
        const angleRad = state.angle * Math.PI / 180;
        state.x += this.stepLength * Math.cos(angleRad);
        state.y += this.stepLength * Math.sin(angleRad);
        
        this.commands.push({
            type: 'move',
            to: {
                x: state.x,
                y: state.y, 
                z: 0,
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            depth: state.depth,
            is3D: false
        });
    }

    /**
     * Обработка движения вперед с рисованием в 3D
     * @param {Object} state - Текущее состояние черепашки
     */
    handleForward3D(state) {
        const direction = this.calculateDirection(state.angleX, state.angleY, state.angleZ);
        
        const newX = state.x + this.stepLength * direction.x;
        const newY = state.y + this.stepLength * direction.y;
        const newZ = state.z + this.stepLength * direction.z;

        const drawCommand = {
            type: 'draw',
            from: {
                x: state.x,
                y: state.y,
                z: state.z,
                width: Math.max(0.5, this.lineWidth - state.depth * 0.3),
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            to: {
                x: newX,
                y: newY,
                z: newZ,
                width: Math.max(0.3, this.lineWidth - state.depth * 0.3),
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            length: this.stepLength,
            orientation: {
                angleX: state.angleX,
                angleY: state.angleY,
                angleZ: state.angleZ
            },
            is3D: true
        };

        this.commands.push(drawCommand);

        state.x = newX;
        state.y = newY;
        state.z = newZ;
    }

    /**
     * Обработка движения вперед без рисования в 3D
     * @param {Object} state - Текущее состояние черепашки
     */
    handleMove3D(state) {
        const direction = this.calculateDirection(state.angleX, state.angleY, state.angleZ);
        
        state.x += this.stepLength * direction.x;
        state.y += this.stepLength * direction.y;
        state.z += this.stepLength * direction.z;
        
        this.commands.push({
            type: 'move',
            to: {
                x: state.x,
                y: state.y,
                z: state.z,
                color: this.getColorByDepth(state.depth),
                depth: state.depth
            },
            depth: state.depth,
            is3D: true
        });
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
     * Сброс парсера
     */
    reset() {
        this.commands = [];
    }

    /**
     * Получение статистики парсинга
     * @returns {Object} Объект со статистикой
     */
    getStats() {
        const drawCommands = this.commands.filter(cmd => 
            cmd.type === 'draw'
        ).length;
        const moveCommands = this.commands.filter(cmd => 
            cmd.type === 'move'
        ).length;
        const rotateCommands = this.commands.filter(cmd => 
            cmd.type.includes('rotate')
        ).length;
        const pushCommands = this.commands.filter(cmd => 
            cmd.type.includes('pushState')
        ).length;
        const popCommands = this.commands.filter(cmd => 
            cmd.type.includes('popState')
        ).length;
        const is3D = this.commands.some(cmd => cmd.is3D);
        
        return {
            totalCommands: this.commands.length,
            drawCommands,
            moveCommands,
            rotateCommands,
            pushCommands,
            popCommands,
            is3D,
            maxDepth: this.commands.length > 0 ? 
                Math.max(...this.commands.map(cmd => cmd.depth || 0)) : 0
        };
    }

    /**
     * Создание тестовой 3D L-системы для демонстрации
     * @returns {Object} Пример 3D L-системы
     */
    static create3DDemoSystem() {
        return {
            axiom: 'A',
            rules: {
                'A': 'F[+A][-A][&A][^A]F[+A][-A]',
                'F': 'FF'
            },
            angle: 22.5,
            iterations: 4,
            description: '3D дерево с ветвлением во всех направлениях'
        };
    }

    /**
     * Создание спиральной 3D L-системы
     * @returns {Object} Пример спиральной 3D L-системы
     */
    static create3DSpiralSystem() {
        return {
            axiom: 'F',
            rules: {
                'F': 'F[+F][&F][\\F]'
            },
            angle: 30,
            iterations: 5,
            description: '3D спираль с вращениями вокруг всех осей'
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
} else {
    window.Parser = Parser;
}