class QuantumTape {
    constructor(initialContent = "0") {
        this.cells = [initialContent]; // Начальная ячейка
        this.position = 0; // Текущая позиция головки
        this.initialContent = initialContent;
        console.log('🎯 Лента создана:', this.toString());
    }

    // Чтение текущей ячейки
    read() {
        // Если вышли за границы - добавляем новые ячейки
        this.ensurePosition();
        return this.cells[this.position];
    }

    // Запись в текущую ячейку
    write(symbol) {
        console.log('📝 Запись символа:', symbol, 'в позицию:', this.position);
        this.ensurePosition();
        this.cells[this.position] = symbol;
    }

    // Движение головки
    move(direction) {
        console.log('🎯 Движение ленты:', direction);
        console.log('📏 До движения - позиция:', this.position, 'ячейки:', this.cells);
        
        const oldPosition = this.position;
        
        switch(direction.toUpperCase()) {
            case 'L': // Влево
                this.position--;
                console.log('⬅️ Движение ВЛЕВО');
                break;
            case 'R': // Вправо
                this.position++;
                console.log('➡️ Движение ВПРАВО');
                break;
            case 'N': // Стоять на месте
            case 'S': // Стоять на месте
                console.log('⏸️ Стоим на месте - НЕТ ДВИЖЕНИЯ');
                return; // Выходим БЕЗ ensurePosition!
            default:
                console.warn('⚠️ Неизвестное направление:', direction, 'используем по умолчанию R');
                this.position++;
        }
        
        // Гарантируем, что позиция существует (кроме случая 'N')
        this.ensurePosition();
        console.log(`🔢 Позиция: ${oldPosition} → ${this.position}, символ: ${this.read()}`);
    }

    // 🔥 ВАЖНО: Обеспечиваем бесконечность ленты
    ensurePosition() {
        // Если позиция отрицательная - добавляем ячейки слева
        while (this.position < 0) {
            this.cells.unshift(this.initialContent);
            this.position++; // Сдвигаем позицию т.к. добавили ячейку слева
            console.log('⬅️ Добавлена ячейка слева, новая позиция:', this.position);
        }
        
        // Если позиция больше размера - добавляем ячейки справа
        while (this.position >= this.cells.length) {
            this.cells.push(this.initialContent);
            console.log('➡️ Добавлена ячейка справа, размер:', this.cells.length);
        }
        
        console.log('📏 Размер ленты:', this.cells.length, 'Позиция:', this.position);
    }

    // Сброс ленты
    reset() {
        console.log('🔄 Сброс ленты');
        this.cells = [this.initialContent];
        this.position = 0;
    }

    // Представление ленты в виде строки
    toString() {
        let result = '';
        for (let i = 0; i < this.cells.length; i++) {
            if (i === this.position) {
                result += `[${this.cells[i]}] `;
            } else {
                result += `${this.cells[i]} `;
            }
        }
        return result.trim();
    }

    // Получение состояния ленты для визуализатора
    // Если метода getTapeState нет, добавьте в класс QuantumTape:
    getTapeState() {
        return {
            cells: [...this.cells], // копия массива
            position: this.position,
            length: this.cells.length
        };
    }
}