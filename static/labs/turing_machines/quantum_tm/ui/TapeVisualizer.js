class TapeVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('❌ Контейнер для ленты не найден:', containerId);
            return;
        }
        console.log('✅ Визуализатор ленты создан для:', containerId);
    }

    render(quantumTape) {
        if (!this.container) return;
        
        console.log('🎨 Отрисовка ленты...');
        const tapeState = quantumTape.getTapeState();
        
        // Создаем ограниченное представление ленты
        const visibleCells = this.getVisibleCells(tapeState);
        
        let html = `
            <div class="tape-container">
                <div class="tape-header">
                    <span class="tape-title">Лента Квантовой Машины Тьюринга</span>
                    <span class="tape-stats">Позиция: ${tapeState.position} | Ячеек: ${tapeState.length}</span>
                </div>
                <div class="tape-cells">
        `;
        
        visibleCells.forEach(cell => {
            const isActive = cell.isCurrent;
            const cellClass = isActive ? 'tape-cell active' : 'tape-cell';
            
            html += `
                <div class="${cellClass}" data-position="${cell.actualPosition}">
                    <div class="cell-value">${cell.value}</div>
                    ${isActive ? '<div class="tape-head">⌄</div>' : ''}
                    <div class="cell-index">${cell.displayIndex}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="tape-footer">
                    <div class="movement-indicator">
                        <span class="movement-label">Текущее движение:</span>
                        <span class="movement-value" id="current-movement">—</span>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        console.log('✅ Лента отрисована');
    }

    update(quantumTape) {
        console.log('🔄 TapeVisualizer.update() вызван');
        console.log('📦 Полученный объект quantumTape:', quantumTape);
        
        if (!quantumTape) {
            console.error('❌ quantumTape не передан!');
            return;
        }
        
        // Проверяем наличие метода getTapeState
        if (typeof quantumTape.getTapeState !== 'function') {
            console.error('❌ quantumTape.getTapeState не является функцией!');
            console.log('🔧 Доступные методы:', Object.getOwnPropertyNames(quantumTape));
            return;
        }
        
        try {
            const tapeState = quantumTape.getTapeState();
            console.log('📏 Данные ленты для отрисовки:', tapeState);
            this.render(quantumTape);
        } catch (error) {
            console.error('❌ Ошибка при получении состояния ленты:', error);
        }
    }

    getVisibleCells(tapeState) {
        const visibleRange = 5; // Показываем по 5 ячеек слева и справа
        const start = Math.max(0, tapeState.position - visibleRange);
        const end = Math.min(tapeState.cells.length - 1, tapeState.position + visibleRange);
        
        const visibleCells = [];
        
        // Добавляем индикатор если есть ячейки слева за пределами видимости
        if (start > 0) {
            visibleCells.push({
                value: '⋯',
                isCurrent: false,
                actualPosition: -1,
                displayIndex: '⋯'
            });
        }
        
        // Добавляем видимые ячейки
        for (let i = start; i <= end; i++) {
            visibleCells.push({
                value: tapeState.cells[i],
                isCurrent: i === tapeState.position,
                actualPosition: i,
                displayIndex: i
            });
        }
        
        // Добавляем индикатор если есть ячейки справа за пределами видимости
        if (end < tapeState.cells.length - 1) {
            visibleCells.push({
                value: '⋯',
                isCurrent: false,
                actualPosition: -1,
                displayIndex: '⋯'
            });
        }
        
        return visibleCells;
    }
}
