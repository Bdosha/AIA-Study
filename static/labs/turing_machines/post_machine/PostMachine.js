// PostMachine.js - реализация логики машины Поста

class PostMachine {
    constructor() {
        // this.tape = new Array(15).fill(false); // false = empty, true = marked
        this.tape = {}; // теперь "объект" — для бесконечной ленты
        // this.position = 7; // center position
        this.position = 0;
        this.program = [];
        this.currentLine = 0;
        this.steps = 0;
        this.status = 'ready'; // ready, running, paused, stopped, finished, error
        this.executionInterval = null;
        this.maxSteps = 1000;
    }

    parseProgram(code) {
        const lines = code.trim().split('\n');
        const program = {};
        const errors = [];
        // Теперь порядок в файле = номер строки (с 1)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (this.validateCommand(line)) {
                program[i + 1] = line; // Номер строки теперь просто позиция + 1
            } else {
                errors.push(`Строка ${i + 1}: Неверная команда "${line}"`);
            }
        }
        return { program, errors };
    }


    validateCommand(command) {
        const patterns = [
            /^V\s+\d+$/, // V n
            /^X\s+\d+$/, // X n
            /^<\s+\d+$/, // < n
            /^>\s+\d+$/, // > n
            /^\?\s+\d+;\s*\d+$/, // ? n1; n2
            /^!$/ // !
        ];

        return patterns.some(pattern => pattern.test(command));
    }

    executeStep() {
        if (this.steps >= this.maxSteps) {
            this.showError(`Превышено максимальное количество шагов (${this.maxSteps}). Возможно, программа зациклена.`);
            this.status = 'error';
            return false;
        }

        if (!(this.currentLine in this.program)) {
            this.showError(`Строка ${this.currentLine} не найдена в программе`);
            this.status = 'error';
            return false;
        }

        const command = this.program[this.currentLine];
        const result = this.executeCommand(command);

        if (!result.success) {
            this.showError(result.error);
            this.status = 'error';
            return false;
        }

        this.steps++;

        if (result.halt) {
            this.status = 'finished';
            return false;
        }

        this.currentLine = result.nextLine;
        return true;
    }

    executeCommand(command) {
        // V n - поставить метку
        if (command.match(/^V\s+\d+$/)) {
            const nextLine = parseInt(command.split(' ')[1]);
            // if (this.position >= 0 && this.position < this.tape.length) {
            //     this.tape[this.position] = true;
            // }
            this.tape[this.position] = true;
            return { success: true, nextLine: nextLine };
        }

        // X n - стереть метку
        if (command.match(/^X\s+\d+$/)) {
            const nextLine = parseInt(command.split(' ')[1]);
            // if (this.position >= 0 && this.position < this.tape.length) {
            //     this.tape[this.position] = false;
            // }
            delete this.tape[this.position];
            return { success: true, nextLine: nextLine };
        }

        // < n - сдвиг влево
        if (command.match(/^<\s+\d+$/)) {
            const nextLine = parseInt(command.split(' ')[1]);
            // this.position = Math.max(0, this.position - 1);
            this.position--;
            return { success: true, nextLine: nextLine };
        }

        // > n - сдвиг вправо
        if (command.match(/^>\s+\d+$/)) {
            const nextLine = parseInt(command.split(' ')[1]);
            // this.position = Math.min(this.tape.length - 1, this.position + 1);
            this.position++;

            return { success: true, nextLine: nextLine };
        }

        // ? n1; n2 - условный переход
        if (command.match(/^\?\s+\d+;\s*\d+$/)) {
            const parts = command.substring(1).split(';');
            const n1 = parseInt(parts[0].trim());
            const n2 = parseInt(parts[1].trim());
            // const isEmpty = this.position >= 0 && this.position < this.tape.length && !this.tape[this.position];
            const isEmpty = !this.tape[this.position];
            const nextLine = isEmpty ? n1 : n2;
            return { success: true, nextLine: nextLine };
        }

        // ! - остановка
        if (command === '!') {
            return { success: true, halt: true };
        }

        return { success: false, error: `Неизвестная команда: ${command}` };
    }

    clearTape() {
        // this.tape.fill(false);
        this.tape = {};
    }

    stop() {
        this.status = 'stopped';
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
            this.executionInterval = null;
        }
    }

    reset() {
        this.stop();
        // this.position = 7;
        this.position = 0;
        this.currentLine = 0;
        this.steps = 0;
        this.status = 'ready';
        this.clearTape();
        this.clearError();
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.innerHTML = `<div class="error-message-content">${message}</div>`;
        }
    }

    clearError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.innerHTML = '';
        }
    }
}