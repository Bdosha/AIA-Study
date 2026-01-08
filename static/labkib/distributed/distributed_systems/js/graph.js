/**
 * graph.js - Структура данных графа
 * 
 * Этот модуль определяет:
 * - Класс Graph для представления сетевой топологии
 * - Узлы (nodes) и рёбра (edges)
 * - Методы для работы с графом (поиск соседей, проверка связности и т.д.)
 */

/**
 * Класс Graph представляет сетевую топологию
 * Содержит узлы (модули космической станции) и рёбра (каналы связи)
 */
class Graph {
    /**
     * Конструктор графа
     * Инициализирует топологию сети космической станции с 8 модулями
     */
    constructor() {
        // Узлы графа - модули космической станции
        // Мостик (индекс 3) является источником всех сигналов
        this.nodes = [
            { id: 0, name: 'Антенна', x: 150, y: 100 },
            { id: 1, name: 'Энергоблок', x: 550, y: 100 },
            { id: 2, name: 'ИИ-ядро', x: 350, y: 120 },
            { id: 3, name: 'Мостик', x: 100, y: 250, isSource: true },
            { id: 4, name: 'Двигатель', x: 650, y: 250 },
            { id: 5, name: 'Медпункт', x: 350, y: 280 },
            { id: 6, name: 'Лаборатория', x: 180, y: 400 },
            { id: 7, name: 'Щиты', x: 520, y: 400 }
        ];

        // Индекс узла-источника (Мостик)
        this.SOURCE_NODE = 3;

        // Ребра графа
        this.edges = [];
        this.generateGraph();

        // Массив нагрузок на узлы (количество пакетов, прошедших через узел)
        this.nodeLoads = new Array(this.nodes.length).fill(0);
    }

    /**
     * Получает список соседей для заданного узла
     * @param {number} nodeIdx - Индекс узла
     * @param {boolean} usePrimaryOnly - Использовать только основные каналы
     * @returns {Array<number>} Массив индексов соседних узлов
     */
    getNeighbors(nodeIdx, usePrimaryOnly = false) {
        const neighbors = [];
        
        // Перебираем все рёбра
        this.edges.forEach(edge => {
            // Пропускаем неактивные рёбра
            if (!edge.active) return;
            
            // Пропускаем резервные каналы, если требуются только основные
            if (usePrimaryOnly && edge.backup) return;
            
            // Добавляем соседа, если ребро связано с данным узлом
            if (edge.from === nodeIdx) neighbors.push(edge.to);
            if (edge.to === nodeIdx) neighbors.push(edge.from);
        });
        
        return neighbors;
    }

    /**
     * Проверяет связность графа от узла-источника (Мостик)
     * Использует поиск в ширину (BFS)
     * @returns {boolean} true, если все узлы достижимы от источника
     */
    isConnected() {
        const visited = new Array(this.nodes.length).fill(false);
        const queue = [this.SOURCE_NODE];
        visited[this.SOURCE_NODE] = true;
        
        // BFS от узла-источника
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current, false); // Используем все рёбра
            
            neighbors.forEach(neighbor => {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            });
        }
        
        // Проверяем, что все узлы посещены
        return visited.every(v => v);
    }

    /**
     * Проверяет наличие пути между двумя узлами
     * @param {number} from - Индекс начального узла
     * @param {number} to - Индекс конечного узла
     * @param {boolean} usePrimaryOnly - Использовать только основные каналы
     * @returns {boolean} true, если путь существует
     */
    hasPath(from, to, usePrimaryOnly = false) {
        if (from === to) return true;
        
        const visited = new Set([from]);
        const queue = [from];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current, usePrimaryOnly);
            
            for (const neighbor of neighbors) {
                if (neighbor === to) return true;
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        return false;
    }

    /**
     * Сбрасывает нагрузки всех узлов до нуля
     */
    resetLoads() {
        this.nodeLoads = new Array(this.nodes.length).fill(0);
    }

    /**
     * Увеличивает нагрузку на узел
     * @param {number} nodeIdx - Индекс узла
     * @param {number} amount - Величина увеличения (по умолчанию 1)
     */
    incrementLoad(nodeIdx, amount = 1) {
        this.nodeLoads[nodeIdx] += amount;
    }

    /**
     * Получает активные основные (не резервные) рёбра
     * @returns {Array} Массив активных основных рёбер
     */
    getActivePrimaryEdges() {
        return this.edges.filter(e => e.active && !e.backup);
    }

    /**
     * Деактивирует ребро
     * @param {Object} edge - Ребро для деактивации
     */
    deactivateEdge(edge) {
        edge.active = false;
    }

    /**
     * Добавляет новое ребро или активирует существующее
     * @param {number} from - Индекс первого узла
     * @param {number} to - Индекс второго узла
     */
    addOrActivateEdge(from, to) {
        // Проверяем, существует ли уже такое ребро
        const existingEdge = this.edges.find(e => 
            (e.from === from && e.to === to) ||
            (e.from === to && e.to === from)
        );
        
        if (existingEdge) {
            // Активируем существующее ребро
            existingEdge.active = true;
        } else {
            // Добавляем новое ребро как основной канал
            this.edges.push({
                from: from,
                to: to,
                backup: false,
                weight: 1,
                active: true
            });
        }
    }

    generateGraph() {
        // Все возможные ребра, которые можно красиво отобразить
        // backup: false - основной канал (белая линия)
        // backup: true - резервный канал (пунктирная линия)
        const allEdges = [
            { from: 0, to: 2, backup: false, weight: 1, active: true },    // Антенна - ИИ-ядро
            { from: 0, to: 3, backup: true, weight: 1, active: true },     // Антенна - Мостик (резерв)
            { from: 1, to: 2, backup: false, weight: 1, active: true },    // Энергоблок - ИИ-ядро
            { from: 1, to: 4, backup: false, weight: 1, active: true },    // Энергоблок - Двигатель
            { from: 2, to: 3, backup: false, weight: 1, active: true },    // ИИ-ядро - Мостик
            { from: 2, to: 4, backup: true, weight: 1, active: true },     // ИИ-ядро - Двигатель (резерв)
            { from: 2, to: 5, backup: false, weight: 1, active: true },    // ИИ-ядро - Медпункт
            { from: 3, to: 5, backup: false, weight: 1, active: true },    // Мостик - Медпункт
            { from: 3, to: 6, backup: false, weight: 1, active: true },    // Мостик - Лаборатория
            { from: 4, to: 5, backup: false, weight: 1, active: true },    // Двигатель - Медпункт
            { from: 5, to: 6, backup: true, weight: 1, active: true },     // Медпункт - Лаборатория (резерв)
            { from: 5, to: 7, backup: false, weight: 1, active: true },    // Медпункт - Щиты
            { from: 6, to: 7, backup: false, weight: 1, active: true },    // Лаборатория - Щиты
            { from: 4, to: 7, backup: true, weight: 1, active: true },     // Двигатель - Щиты (резерв)
            { from: 1, to: 7, backup: false, weight: 1, active: true },    // Энергоблок - Щиты
            { from: 0, to: 6, backup: false, weight: 1, active: true },    // Антенна - Лаборатория
            { from: 0, to: 5, backup: false, weight: 1, active: true },    // Антенна - Медпункт
            { from: 1, to: 5, backup: false, weight: 1, active: true },    // Энергоблок - Медпункт
            { from: 2, to: 6, backup: false, weight: 1, active: true },    // ИИ-ядро - Лаборатория
            { from: 2, to: 7, backup: false, weight: 1, active: true }     // ИИ-ядро - Щиты
        ];
        
        const backupEdges = allEdges.filter(e => e.backup);

        while (!allHasPaths(findPathsFromNode(this.edges, this.nodes.length, this.SOURCE_NODE, true))) {
            const primaryEdges = allEdges
                .filter(e => !e.backup && Math.random() < 0.2);

            this.edges = [...backupEdges, ...primaryEdges];
        }
    }
}
