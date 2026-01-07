class TaskManager {
    constructor(simulator) {
        this.simulator = simulator;
        this.currentTask = null;
        this.attempts = new Map(); // Храним попытки для каждого задания
        console.log('🎯 TaskManager создан с симулятором:', !!simulator);
        this.tasks = this.loadTasks();
    }

    loadTasks() {
        console.log('📚 Загрузка заданий...');
        try {
            const tasks = {
                'task1': new Task1Superposition(),
                'task2': new Task2Measurement(),
                'task3': new Task3Interference()
            };
            console.log('✅ Задания загружены:', Object.keys(tasks));
            return tasks;
        } catch (error) {
            console.error('❌ Ошибка загрузки заданий:', error);
            return {};
        }
    }

    startTask(taskId) {
        console.log('🎯 Запуск задания:', taskId);
        
        // Убедимся, что taskId корректен
        if (!taskId || typeof taskId !== 'string') {
            console.error('❌ Неверный taskId:', taskId);
            taskId = 'task1';
        }
        
        // Проверяем существование задания
        if (!this.tasks[taskId]) {
            console.error('❌ Задание не найдено в tasks:', taskId);
            console.log('📋 Доступные задания:', Object.keys(this.tasks));
            
            // Пробуем найти задание по номеру
            const taskNumber = taskId.replace('task', '');
            if (taskNumber && this.tasks[`task${taskNumber}`]) {
                taskId = `task${taskNumber}`;
                console.log('🔍 Исправляем taskId на:', taskId);
            } else {
                // Используем задание 1 как запасной вариант
                taskId = 'task1';
                console.log('🔄 Используем задание по умолчанию:', taskId);
            }
        }
        
        this.currentTask = this.tasks[taskId];
        
        if (!this.currentTask) {
            console.error('❌ Задание все еще не найдено после исправлений:', taskId);
            return null;
        }
        
        console.log('✅ Текущее задание установлено:', this.currentTask.id);

        // Инициализируем счетчик попыток для задания
        if (!this.attempts.has(taskId)) {
            this.attempts.set(taskId, 0);
            console.log('📊 Счетчик попыток инициализирован для:', taskId);
        }
        
        if (this.currentTask.setup) {
            try {
                this.currentTask.setup(this.simulator);
            } catch (error) {
                console.warn('⚠️ Ошибка в setup задания:', error.message);
            }
        }
        
        return this.currentTask;
    }

    loadTasks() {
        console.log('📚 Загрузка заданий...');
        try {
            const tasks = {
                'task1': new Task1Superposition(),
                'task2': new Task2Measurement(),
                'task3': new Task3Interference()
            };
            
            // Проверяем, что все задания созданы корректно
            Object.entries(tasks).forEach(([taskId, task]) => {
                if (!task || typeof task.getContent !== 'function') {
                    console.error(`❌ Задание ${taskId} создано некорректно:`, task);
                } else {
                    console.log(`✅ Задание ${taskId} загружено:`, task.title);
                }
            });
            
            console.log('✅ Все задания загружены:', Object.keys(tasks));
            return tasks;
        } catch (error) {
            console.error('❌ Ошибка загрузки заданий:', error);
            return {};
        }
    }

    checkTaskCompletion() {
        if (!this.currentTask) {
            console.warn('⚠️ Текущее задание не установлено, пытаемся определить автоматически...');
            this.determineCurrentTaskFromUI();
        }
        
        if (!this.currentTask) {
            console.error('❌ Не удалось определить текущее задание');
            return {
                isCompleted: false,
                message: '❌ Сначала перейдите на вкладку с заданием'
            };
        }
        
        console.log('✅ Проверка задания:', this.currentTask.id);
        
        // ⚠️ УБИРАЕМ увеличение счетчика попыток здесь!
        // Счетчик будет увеличиваться только при явной проверке
        
        try {
            const result = this.currentTask.check(this.simulator);
            
            // ОСОБАЯ ОБРАБОТКА ДЛЯ ЗАДАНИЯ 2
            if (this.currentTask.id === 'task2') {
                console.log('🔍 Результат проверки задания 2:', result);
                
                if (result.isCompleted) {
                    this.currentTask.completed = true;
                    console.log('🎉 Задание 2 выполнено!');
                }
            } else if (result.isCompleted) {
                this.currentTask.completed = true;
                console.log('🎉 Задание выполнено!');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Ошибка проверки задания:', error);
            return {
                isCompleted: false,
                message: '❌ Ошибка проверки задания. Попробуйте еще раз.'
            };
        }
    }

    // ДОБАВЛЯЕМ НОВЫЙ МЕТОД ДЛЯ ЯВНОЙ ПРОВЕРКИ С УВЕЛИЧЕНИЕМ ПОПЫТОК
    checkTaskWithAttempt() {
        if (!this.currentTask) {
            console.error('❌ Нет текущего задания для проверки');
            return { isCompleted: false, message: "Ошибка: задание не загружено" };
        }
        
        console.log('🎯 Проверка задания:', this.currentTask.id);
        console.log('Метод check существует:', typeof this.currentTask.check === 'function');
        
        try {
            const transitions = this.getCurrentTransitions();
            console.log('📋 Переходы для проверки:', transitions);
            
            if (!Array.isArray(transitions)) {
                return { isCompleted: false, message: "Ошибка: неверный формат переходов" };
            }
            
            // ВЫЗЫВАЕМ ПРОВЕРКУ ЗАДАНИЯ И ЛОГИРУЕМ РЕЗУЛЬТАТ
            const isCompleted = this.currentTask.check(this.simulator, transitions);
            console.log('🔍 Результат проверки задания:', isCompleted);
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ДЛЯ ОТЛАДКИ
            console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА ===');
            console.log('Текущее состояние симулятора:', this.simulator.currentState);
            console.log('Вектор состояния:', this.simulator.stateVector);
            
            // Увеличиваем счетчик попыток
            const attempts = this.attempts.get(this.currentTask.id) || 0;
            this.attempts.set(this.currentTask.id, attempts + 1);
            
            let message = '';
            if (isCompleted) {
                this.currentTask.completed = true;
                message = '🎉 Поздравляем! Задание выполнено правильно!';
                console.log('✅ ЗАДАНИЕ ВЫПОЛНЕНО!');
            } else {
                message = this.getHintBasedOnAttempts(attempts + 1);
                console.log('❌ ЗАДАНИЕ НЕ ВЫПОЛНЕНО');
            }
            
            return { isCompleted, message };
            
        } catch (error) {
            console.error('❌ Ошибка при проверке задания:', error);
            return { 
                isCompleted: false, 
                message: "Ошибка проверки: " + error.message 
            };
        }
    }

    // Добавьте этот метод для автоматического определения задания
    determineCurrentTaskFromUI() {
        // Ищем активную вкладку задания
        const activeTab = document.querySelector('.task-tab.active');
        if (activeTab) {
            const taskNumber = activeTab.textContent.match(/Задание (\d)/);
            if (taskNumber) {
                const taskId = `task${taskNumber[1]}`;
                console.log('🔍 Автоопределение задания из вкладки:', taskId);
                this.startTask(taskId);
            }
        }
        
        // Если не нашли по вкладке, пробуем по содержимому
        if (!this.currentTask) {
            const taskContent = document.getElementById('task-content');
            if (taskContent) {
                // Ищем заголовок задания в содержимом
                const taskHeader = taskContent.querySelector('h3');
                if (taskHeader) {
                    const title = taskHeader.textContent;
                    // Сопоставляем заголовок с заданиями
                    for (const [taskId, task] of Object.entries(this.tasks)) {
                        if (task.title === title) {
                            console.log('🔍 Автоопределение задания по заголовку:', taskId);
                            this.startTask(taskId);
                            break;
                        }
                    }
                }
            }
        }
    }

    getTaskContent(taskNumber) {
        const taskId = `task${taskNumber}`;
        console.log('📖 Получение контента для:', taskId);
        
        if (!this.tasks[taskId]) {
            console.error('❌ Задание не найдено в tasks:', taskId);
            return this.getFallbackContent(taskNumber, 'Задание не найдено');
        }
        
        const task = this.tasks[taskId];
        if (typeof task.getContent !== 'function') {
            console.error('❌ У задания нет метода getContent:', taskId);
            return this.getFallbackContent(taskNumber, 'Ошибка формата задания');
        }
        
        try {
            const content = task.getContent();
            console.log('✅ Контент задания получен:', taskId);
            return content;
        } catch (error) {
            console.error('❌ Ошибка в getContent задания:', taskId, error);
            return this.getFallbackContent(taskNumber, 'Ошибка генерации контента');
        }
    }

    // Добавьте этот метод в класс TaskManager
    getFallbackContent(taskNumber, message) {
        return `
            <div class="task-error">
                <h3>Задание ${taskNumber}</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button onclick="window.switchTask(1)">📚 Перейти к заданию 1</button>
                    <button onclick="location.reload()">🔄 Обновить страницу</button>
                </div>
            </div>
        `;
    }

    getCurrentTaskHint() {
        // Автоматически определяем задание если не установлено
        if (!this.currentTask) {
            this.determineCurrentTaskFromUI();
        }
        
        if (!this.currentTask) {
            return '❌ Сначала перейдите на вкладку с заданием';
        }
        
        const taskId = this.currentTask.id;
        const attempts = this.attempts.get(taskId) || 0;
        
        console.log(`💡 Запрос подсказки для ${taskId}, попыток: ${attempts}`);
        
        // ⚠️ Теперь счетчик правильный - учитываются только явные проверки
        if (attempts < 3) {
            const remaining = 3 - attempts;
            return `❌ Подсказка будет доступна после ${remaining} ${this.getAttemptWord(remaining)} самостоятельной работы. Продолжайте пробовать!`;
        }
        
        if (this.currentTask.getHint) {
            return this.currentTask.getHint();
        }
        
        return '❌ Подсказка недоступна для этого задания';
    }

    getCurrentTaskSolution() {
        // Автоматически определяем задание если не установлено
        if (!this.currentTask) {
            this.determineCurrentTaskFromUI();
        }
        
        if (!this.currentTask) {
            alert('❌ Сначала перейдите на вкладку с заданием');
            return null;
        }
        
        const taskId = this.currentTask.id;
        const attempts = this.attempts.get(taskId) || 0;
        
        console.log(`🎯 Запрос решения для ${taskId}, попыток: ${attempts}`);
        
        // ⚠️ Теперь счетчик правильный - учитываются только явные проверки
        if (attempts < 5) {
            const remaining = 5 - attempts;
            alert(`❌ Решение будет доступно после ${remaining} ${this.getAttemptWord(remaining)} самостоятельной работы. Не сдавайтесь!`);
            return null;
        }
        
        if (this.currentTask.getSolution) {
            return this.currentTask.getSolution();
        }
        
        alert('❌ Решение недоступно для этого задания');
        return null;
    }

    getAttemptWord(attempts) {
        if (attempts === 1) return 'попытки';
        return 'попыток';
    }

    getCurrentTransitions() {
        console.log('🔄 TaskManager.getCurrentTransitions() вызван');
        
        // Способ 1: Получаем переходы из редактора переходов
        if (window.transitionEditor && typeof window.transitionEditor.getTransitionsForSimulator === 'function') {
            const transitions = window.transitionEditor.getTransitionsForSimulator();
            console.log('📋 Переходы из редактора:', transitions);
            return transitions;
        }
        
        // Способ 2: Получаем переходы из симулятора через app
        if (window.app && window.app.simulator && window.app.simulator.currentTransitions) {
            console.log('📋 Переходы из симулятора:', window.app.simulator.currentTransitions);
            return window.app.simulator.currentTransitions;
        }
        
        // Способ 3: Запасной вариант
        console.warn('⚠️ Не удалось получить переходы, возвращаем пустой массив');
        return [];
    }


    // Для обратной совместимости с вашим main.js
    getCurrentTask() {
        return this.currentTask;
    }
}