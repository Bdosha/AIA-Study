/**
 * app.js - Основной модуль приложения
 * 
 * Этот модуль объединяет все компоненты системы:
 * - Инициализация графа
 * - Создание визуализатора
 * - Настройка маршрутизатора
 * - Обработка пользовательского интерфейса
 * - Управление состоянием приложения
 */

/**
 * Класс NetworkSimulator управляет всем приложением
 * Координирует работу графа, визуализатора и маршрутизатора
 */
class NetworkSimulator {
    /**
     * Конструктор симулятора сети
     */
    constructor() {
        // Инициализация компонентов
        this.graph = new Graph();
        this.canvas = document.getElementById('graphCanvas');
        this.visualizer = new Visualizer(this.canvas, this.graph);
        this.router = new Router(this.graph, this.visualizer);
        
        // Параметры симуляции
        this.currentMethod = 'flooding'; // Текущий метод маршрутизации
        this.visualizationSpeed = 1.0;   // Скорость анимации
        this.isAnimating = false;        // Флаг выполнения анимации
        this.repairMode = false;         // Режим восстановления графа
        this.selectedNode = null;        // Выбранный узел в режиме восстановления
        
        // Инициализация интерфейса
        // this.initializeUI();
        this.initializeEventHandlers();
        this.updateMetricsTable();
        
        // Установка темной темы по умолчанию
        document.documentElement.setAttribute('data-color-scheme', 'dark');
        this.visualizer.setTheme('dark');
    }

    /**
     * Инициализация пользовательского интерфейса
     */
    // initializeUI() {
    //     // Заполнение заголовков таблицы метрик названиями узлов
    //     const headers = document.getElementById('nodeHeaders');
    //     headers.innerHTML = '<th class="row-label"></th>';
        
    //     this.graph.nodes.forEach(node => {
    //         const th = document.createElement('th');
    //         th.textContent = node.name;
    //         headers.appendChild(th);
    //     });
    // }

    /**
     * Инициализация обработчиков событий для элементов управления
     */
    initializeEventHandlers() {
        // Переключатель темы
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Выбор метода маршрутизации
        const methodSelect = document.getElementById('routingMethod');
        methodSelect.addEventListener('change', (e) => {
            this.currentMethod = e.target.value;
        });
        
        // Слайдер скорости
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            this.visualizationSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${this.visualizationSpeed.toFixed(1)}x`;
            this.router.setSpeed(this.visualizationSpeed);
        });
        
        // Кнопка визуализации
        const visualizeBtn = document.getElementById('visualizeBtn');
        visualizeBtn.addEventListener('click', () => this.executeVisualization());
        
        // Кнопка микрометеоритного удара
        const strikeBtn = document.getElementById('strikeBtn');
        strikeBtn.addEventListener('click', () => this.micrometeoriteStrike());
        
        // Обработчик кликов на canvas (для режима восстановления)
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    /**
     * Переключение темы оформления (светлая/темная)
     */
    toggleTheme() {
        const currentTheme = this.visualizer.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.visualizer.setTheme(newTheme);
        document.documentElement.setAttribute('data-color-scheme', newTheme);
    }

    /**
     * Выполнение визуализации выбранного метода маршрутизации
     * Отправляет пакеты от узла Мостик ко всем остальным узлам
     * 
     * ВАЖНО для понимания разницы между методами:
     * - Flooding: волна пакетов расходится от Мостика ко всем узлам одновременно
     * - Static: использует предвычисленные пути, не меняет их после микрометеоритного удара
     * - Adaptive: пересчитывает пути на основе текущего состояния сети и нагрузки
     * - Hybrid: статика для критичных узлов, адаптивная для остальных
     */
    async executeVisualization() {
        // Предотвращение запуска нескольких визуализаций одновременно
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Очистка предыдущих предупреждений
        this.clearWarnings();
        
        // Сброс нагрузок
        this.graph.resetLoads();
        this.updateMetricsTable();
        
        // Источник - узел Мостик
        const source = this.graph.SOURCE_NODE;
        
        // Получение списка всех узлов назначения (все кроме Мостика)
        const destinations = [];
        for (let i = 0; i < this.graph.nodes.length; i++) {
            if (i !== source) {
                destinations.push(i);
            }
        }
        
        // Маршрутизация от Мостика к каждому узлу назначения
        for (const dest of destinations) {
            // Выбор метода маршрутизации
            switch (this.currentMethod) {
                case 'flooding':
                    // Лавинная запуститься один раз
                    await this.router.flooding(source, dest);
                    this.updateMetricsTable();
                    this.isAnimating = false;
                    break;
                case 'static':
                    // Статическая: использует ПРЕДВЫЧИСЛЕННЫЕ пути, НЕ пересчитывает
                    await this.router.staticRouting(source, dest);
                    break;
                case 'adaptive':
                    // Адаптивная: пересчитывает пути на основе текущего состояния
                    await this.router.adaptiveRouting(source, dest);
                    break;
                case 'hybrid':
                    await this.router.hybridRouting(source, dest);
                    break;
            }
            
            // Обновление таблицы метрик после каждого маршрута
            this.updateMetricsTable();
            
            // Небольшая задержка между отправками к разным узлам
            await delay(200 / this.visualizationSpeed);
        }
        
        this.isAnimating = false;
    }

    /**
     * Обновление таблицы метрик (нагрузки и вероятности)
     */
    updateMetricsTable() {
        const loadsCell = document.getElementById('loads').getElementsByTagName('td');
        const probsCell = document.getElementById('probs').getElementsByTagName('td');
        
        // Вычисление общей нагрузки
        const totalLoad = this.graph.nodeLoads.reduce((sum, load) => sum + load, 0);
        
        // let i = 0;

        // loadsCell.getElementsByTagName("td").forEach(td => {
        //     if (td.textContent !== "Нагрузка") {
        //         td.textContent = this.graph.nodeLoads[i]
        //         i++;
        //     }
        // });

        // probsCell.getElementsByTagName("td").forEach(td => {
        //     if (td.textContent !== "Вероятность") {
        //         td.textContent = this.graph.nodeLoads[i]
        //         i++;
        //     }
        // });

        // Заполнение ячеек нагрузки
        this.graph.nodeLoads.forEach((load, index) => {
            loadsCell[index + 1].textContent = load;
        });
        
        // Заполнение ячеек вероятности
        this.graph.nodeLoads.forEach((load, index) => {
            const prob = totalLoad > 0 ? (load / totalLoad) : 0;
            probsCell[index + 1].textContent = prob.toFixed(2);
        });
    }

    /**
     * Микрометеоритный удар - удаляет случайные основные рёбра
     * Проверяет связность графа после удаления
     */
    micrometeoriteStrike() {
        // Предотвращение удара во время анимации
        if (this.isAnimating) return;
        
        // Получение списка активных основных (не резервных) рёбер
        const activePrimaryEdges = this.graph.getActivePrimaryEdges();
        
        // Удаление 2-4 случайных рёбер
        const numToRemove = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < numToRemove && activePrimaryEdges.length > 0; i++) {
            const idx = Math.floor(Math.random() * activePrimaryEdges.length);
            this.graph.deactivateEdge(activePrimaryEdges[idx]);
            activePrimaryEdges.splice(idx, 1);
        }
        
        // Перерисовка графа
        this.visualizer.draw();
        
        // Проверка связности графа от узла Мостик
        if (!this.graph.isConnected()) {
            // Граф не связан - включение режима восстановления
            this.repairMode = true;
            this.showStatus('Граф не связан от Мостика! Добавьте рёбра, кликая на узлы.', 'error');
        } else {
            // Граф остался связным
            this.showStatus('Некоторые рёбра удалены, но граф остался связанным от Мостика.', 'info');
        }
    }

    /**
     * Обработка кликов на canvas (для режима восстановления графа)
     * @param {MouseEvent} e - Событие клика мыши
     */
    handleCanvasClick(e) {
        // Режим восстановления активен только после микрометеоритного удара
        if (!this.repairMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Поиск узла, на который кликнули
        let clickedNode = null;
        this.graph.nodes.forEach((node, idx) => {
            const dist = getDistance({ x, y }, { x: node.x, y: node.y });
            if (dist < 35) {
                clickedNode = idx;
            }
        });
        
        // Если клик вне узлов, игнорируем
        if (clickedNode === null) return;
        
        if (this.selectedNode === null) {
            // Первый клик - выбираем узел
            this.selectedNode = clickedNode;
            this.visualizer.draw(this.selectedNode);
        } else {
            // Второй клик - добавляем ребро между узлами
            if (this.selectedNode !== clickedNode) {
                this.graph.addOrActivateEdge(this.selectedNode, clickedNode);
                
                // Проверяем, восстановлена ли связность
                if (this.graph.isConnected()) {
                    this.repairMode = false;
                    this.selectedNode = null;
                    this.showStatus('Граф восстановлен! Теперь он связан.', 'success');
                }
            }
            
            this.selectedNode = null;
            this.visualizer.draw();
        }
    }

    /**
     * Показ статусного сообщения пользователю
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип сообщения ('success', 'error', 'info')
     */
    showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        
        // Автоматическое скрытие сообщения об успехе через 5 секунд
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }

    /**
     * Добавляет предупреждение о неудавшейся доставке при статической маршрутизации
     * @param {string} sourceNodeName - Имя узла-источника
     * @param {string} destNodeName - Имя узла назначения
     * @param {string} e - Костыль для гибридной маршрутизации, здесь пишем маршрутизацию, e = ["Статическая", "Гибридная"]
     */
    addDeliveryWarning(sourceNodeName, destNodeName, e) {
        const warningArea = document.getElementById('warningArea');
        
        const warning = document.createElement('div');
        warning.className = 'warning-item';
        warning.innerHTML = `⚠️ ${e} маршрутизация не смогла доставить посылку от ${sourceNodeName} до ${destNodeName}`;
        
        warningArea.appendChild(warning);
        warningArea.style.display = 'flex';
    }

    /**
     * Очищает все предупреждения о доставке
     */
    clearWarnings() {
        const warningArea = document.getElementById('warningArea');
        warningArea.innerHTML = '';
        warningArea.style.display = 'none';
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Создание экземпляра симулятора сети
    const simulator = new NetworkSimulator();
    
    // Сохранение ссылки на симулятор в глобальной области (для отладки)
    window.networkSimulator = simulator;
});
