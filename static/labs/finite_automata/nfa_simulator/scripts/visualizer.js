class AutomatonVisualizer {
    constructor(canvas, nfa) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nfa = nfa;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.statePositions = new Map();
        this.pendingEpsilonTransitions = []; // Очередь ε-переходов для подсветки
        this.calculateLayout();
    }

    calculateLayout() {
        const states = Array.from(this.nfa.states);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        states.forEach((state, index) => {
            const angle = (2 * Math.PI * index) / states.length;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            this.statePositions.set(state, { x, y });
        });
    }

    drawState(state, isActive = false, isStart = false, isAccept = false) {
        const pos = this.statePositions.get(state);
        if (!pos) return;

        const x = pos.x * this.scale + this.offsetX;
        const y = pos.y * this.scale + this.offsetY;
        const radius = 30;

        // Тень для состояния
        this.ctx.beginPath();
        this.ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fill();

        // Основная окружность состояния
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (isActive) {
            this.ctx.fillStyle = '#FFD700'; // Золотой цвет для активного состояния
            this.ctx.strokeStyle = '#FF6B00'; // Оранжевая обводка
            this.ctx.lineWidth = 4;
        } else {
            this.ctx.fillStyle = '#E3F2FD'; // Светло-голубой фон
            this.ctx.strokeStyle = '#1976D2'; // Синяя обводка
            this.ctx.lineWidth = 2.5;
        }

        this.ctx.fill();
        this.ctx.stroke();

        // Двойная окружность для принимающих состояний
        if (isAccept) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius - 6, 0, 2 * Math.PI);
            this.ctx.strokeStyle = isActive ? '#FF6B00' : '#1976D2';
            this.ctx.lineWidth = isActive ? 3 : 2;
            this.ctx.stroke();
        }

        // Стрелка для начального состояния
        if (isStart) {
            const arrowSize = 12;
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius - 25, y);
            this.ctx.lineTo(x - radius - 3, y);
            this.ctx.strokeStyle = '#2E7D32'; // Зеленый цвет для начального состояния
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Наконечник стрелки
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius - 3, y);
            this.ctx.lineTo(x - radius - 3 - arrowSize, y - 6);
            this.ctx.lineTo(x - radius - 3 - arrowSize, y + 6);
            this.ctx.closePath();
            this.ctx.fillStyle = '#2E7D32';
            this.ctx.fill();
        }

        // Подпись состояния
        this.ctx.fillStyle = isActive ? '#8B4513' : '#1A237E';
        this.ctx.font = 'bold 15px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(state, x, y);
    }

    drawTransition(fromState, toState, symbol, isEpsilon = false, isHighlighted = false) {
        const fromPos = this.statePositions.get(fromState);
        const toPos = this.statePositions.get(toState);
        if (!fromPos || !toPos) return;

        const fromX = fromPos.x * this.scale + this.offsetX;
        const fromY = fromPos.y * this.scale + this.offsetY;
        const toX = toPos.x * this.scale + this.offsetX;
        const toY = toPos.y * this.scale + this.offsetY;

        const radius = 30;

        // Петля в саму себя
        if (fromState === toState) {
            this.drawSelfLoop(fromX, fromY, symbol, radius, isEpsilon, isHighlighted);
            return;
        }

        // Обычная стрелка между разными состояниями
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const startX = fromX + radius * Math.cos(angle);
        const startY = fromY + radius * Math.sin(angle);
        const endX = toX - radius * Math.cos(angle);
        const endY = toY - radius * Math.sin(angle);

        // Стиль для переходов
        const isDashed = isEpsilon;
        let lineColor = isEpsilon ? '#7B1FA2' : '#424242';
        let lineWidth = isEpsilon ? 2 : 2.5;
        
        if (isHighlighted && isEpsilon) {
            lineColor = '#FF4081'; // Ярко-розовый для подсветки
            lineWidth = 4;
        }

        // Тень стрелки (только для обычных переходов)
        if (!isEpsilon) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX + 1, startY + 1);
            this.ctx.lineTo(endX + 1, endY + 1);
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Основная стрелка
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = lineWidth;
        
        if (isDashed) {
            this.ctx.setLineDash([5, 3]);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Сбрасываем пунктир

        // Наконечник стрелки
        const arrowLength = 14;
        const arrowAngle = Math.PI / 5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX - arrowLength * Math.cos(angle - arrowAngle),
            endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.ctx.lineTo(
            endX - arrowLength * Math.cos(angle + arrowAngle),
            endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = lineColor;
        this.ctx.fill();

        // Подпись перехода с фоном
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Фон для текста
        this.ctx.font = 'bold 13px Arial';
        const displaySymbol = isEpsilon ? 'ε' : symbol;
        const textMetrics = this.ctx.measureText(displaySymbol);
        const textWidth = textMetrics.width + 8;
        const textHeight = 20;
        
        // Цвет фона в зависимости от типа перехода и подсветки
        let backgroundColor = 'rgba(255, 255, 255, 0.9)';
        if (isEpsilon) {
            backgroundColor = isHighlighted ? 'rgba(255, 64, 129, 0.9)' : 'rgba(234, 221, 255, 0.9)';
        }
        
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(midX - textWidth/2, midY - textHeight/2, textWidth, textHeight);
        
        this.ctx.strokeStyle = isEpsilon ? '#7B1FA2' : '#666';
        if (isHighlighted && isEpsilon) {
            this.ctx.strokeStyle = '#FF4081';
        }
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(midX - textWidth/2, midY - textHeight/2, textWidth, textHeight);

        // Сам текст
        this.ctx.fillStyle = isEpsilon ? '#4A148C' : '#1A237E';
        if (isHighlighted && isEpsilon) {
            this.ctx.fillStyle = '#FFFFFF';
        }
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(displaySymbol, midX, midY);
    }

    drawSelfLoop(x, y, symbol, stateRadius, isEpsilon = false, isHighlighted = false) {
        const loopRadius = 25;
        const loopCenterX = x;
        const loopCenterY = y - stateRadius - loopRadius;

        // Стиль для петель
        const isDashed = isEpsilon;
        let lineColor = isEpsilon ? '#7B1FA2' : '#424242';
        let lineWidth = isEpsilon ? 2 : 2.5;
        
        if (isHighlighted && isEpsilon) {
            lineColor = '#FF4081';
            lineWidth = 4;
        }

        // Тень петли (только для обычных переходов)
        if (!isEpsilon) {
            this.ctx.beginPath();
            this.ctx.arc(loopCenterX + 1, loopCenterY + 1, loopRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Основная петля
        this.ctx.beginPath();
        this.ctx.arc(loopCenterX, loopCenterY, loopRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = lineWidth;
        
        if (isDashed) {
            this.ctx.setLineDash([5, 3]);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Наконечник стрелки для петли
        const arrowX = loopCenterX + loopRadius;
        const arrowY = loopCenterY;
        const arrowLength = 12;
        const arrowAngle = Math.PI / 5;

        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(arrowX - arrowLength * Math.cos(-arrowAngle), arrowY - arrowLength * Math.sin(-arrowAngle));
        this.ctx.lineTo(arrowX - arrowLength * Math.cos(arrowAngle), arrowY - arrowLength * Math.sin(arrowAngle));
        this.ctx.closePath();
        this.ctx.fillStyle = lineColor;
        this.ctx.fill();

        // Подпись символа с фоном
        const labelX = loopCenterX;
        const labelY = loopCenterY - loopRadius - 15;
        const displaySymbol = isEpsilon ? 'ε' : symbol;
        
        // Фон для текста петли
        this.ctx.font = 'bold 13px Arial';
        const textMetrics = this.ctx.measureText(displaySymbol);
        const textWidth = textMetrics.width + 8;
        const textHeight = 18;
        
        // Цвет фона в зависимости от типа перехода и подсветки
        let backgroundColor = 'rgba(255, 255, 255, 0.95)';
        if (isEpsilon) {
            backgroundColor = isHighlighted ? 'rgba(255, 64, 129, 0.95)' : 'rgba(234, 221, 255, 0.95)';
        }
        
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(labelX - textWidth/2, labelY - textHeight/2, textWidth, textHeight);
        
        this.ctx.strokeStyle = isEpsilon ? '#7B1FA2' : '#666';
        if (isHighlighted && isEpsilon) {
            this.ctx.strokeStyle = '#FF4081';
        }
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(labelX - textWidth/2, labelY - textHeight/2, textWidth, textHeight);

        // Текст символа
        this.ctx.fillStyle = isEpsilon ? '#4A148C' : '#1A237E';
        if (isHighlighted && isEpsilon) {
            this.ctx.fillStyle = '#FFFFFF';
        }
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(displaySymbol, labelX, labelY);
    }

    // Устанавливаем ε-переходы для подсветки в следующем шаге
    setPendingEpsilonTransitions(fromStates, toStates) {
        this.pendingEpsilonTransitions = [];
        for (const fromState of fromStates) {
            const epsilonTargets = this.nfa.epsilonTransitions.get(fromState) || new Set();
            for (const toState of epsilonTargets) {
                if (toStates.includes(toState)) {
                    this.pendingEpsilonTransitions.push({ fromState, toState });
                }
            }
        }
    }

    // Очищаем очередь ε-переходов
    clearPendingEpsilonTransitions() {
        this.pendingEpsilonTransitions = [];
    }

    render(activeStates = [], showPendingEpsilon = false) {
        // Преобразуем activeStates в Set для удобства проверки
        const activeStatesSet = new Set(activeStates);
        
        // Очистка canvas с градиентным фоном
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#F8F9FA');
        gradient.addColorStop(1, '#E9ECEF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Получаем все переходы из NFA
        const allTransitions = this.nfa.getAllTransitions();

        // Рисуем все переходы сначала (обычные и ε)
        for (const transition of allTransitions) {
            const isEpsilon = transition.symbol === 'ε';
            this.drawTransition(transition.fromState, transition.toState, transition.symbol, isEpsilon);
        }

        // Если нужно показать ожидающие ε-переходы - подсвечиваем их
        if (showPendingEpsilon && this.pendingEpsilonTransitions.length > 0) {
            for (const transition of this.pendingEpsilonTransitions) {
                this.drawTransition(transition.fromState, transition.toState, 'ε', true, true);
            }
        }

        // Затем рисуем состояния поверх стрелок
        for (let state of this.nfa.states) {
            const isActive = activeStatesSet.has(state);
            const isStart = state === this.nfa.startState;
            const isAccept = this.nfa.acceptStates.has(state);
            this.drawState(state, isActive, isStart, isAccept);
        }

        // Легенда для ε-переходов
        this.drawEpsilonLegend();
    }

    drawEpsilonLegend() {
        const legendX = 20;
        const legendY = this.canvas.height - 60;
        
        // Фон легенды
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = '#7B1FA2';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(legendX, legendY, 150, 40);
        this.ctx.strokeRect(legendX, legendY, 150, 40);

        // Пример ε-перехода
        this.ctx.beginPath();
        this.ctx.moveTo(legendX + 10, legendY + 20);
        this.ctx.lineTo(legendX + 40, legendY + 20);
        this.ctx.strokeStyle = '#7B1FA2';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Стрелка
        this.ctx.beginPath();
        this.ctx.moveTo(legendX + 40, legendY + 20);
        this.ctx.lineTo(legendX + 35, legendY + 17);
        this.ctx.lineTo(legendX + 35, legendY + 23);
        this.ctx.closePath();
        this.ctx.fillStyle = '#7B1FA2';
        this.ctx.fill();

        // Текст
        this.ctx.fillStyle = '#4A148C';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('ε-переход', legendX + 50, legendY + 22);
    }
}