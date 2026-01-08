/**
 * routing.js - Алгоритмы маршрутизации
 * 
 * Этот модуль реализует четыре метода маршрутизации:
 * 1. Flooding (Лавинная маршрутизация)
 * 2. Static (Статическая маршрутизация)
 * 3. Adaptive (Адаптивная маршрутизация)
 * 4. Hybrid (Гибридная маршрутизация)
 */

/**
 * Класс Router реализует различные алгоритмы маршрутизации
 */
class Router {
    /**
     * Конструктор маршрутизатора
     * @param {Graph} graph - Граф сети
     * @param {Visualizer} visualizer - Визуализатор для анимации
     */
    constructor(graph, visualizer) {
        this.graph = graph;
        this.visualizer = visualizer;
        this.speed = 1.0; // Скорость анимации
        
        // Предварительно вычисленные статические маршруты
        // Вычисляются ОДИН РАЗ и НИКОГДА не изменяются
        this.staticRoutes = findPathsFromNode(this.graph.edges, this.graph.nodes.length, this.graph.SOURCE_NODE, true);

        console.log(this.staticRoutes)
    }

    /**
     * Устанавливает скорость анимации
     * @param {number} speed - Множитель скорости (0.1 - 2.0)
     */
    setSpeed(speed) {
        this.speed = speed;
    }

    /**
     * FLOODING - Лавинная маршрутизация
     * 
     * @param {number} source - Индекс узла-источника
     */
    async flooding(source, dest) {
        this.visualizer.setDestinationHighlight(dest);

        const visited = new Set([source]);
        let currentWave = [source];
        this.graph.incrementLoad(source);
        
        while (currentWave.length > 0) {
            const nextWave = [];
            const packetsToAnimate = [];
            
            for (const currentNode of currentWave) {
                if (currentNode === dest) continue;
                const neighbors = this.graph.getNeighbors(currentNode, true);
                
                for (const neighbor of neighbors) {
                    if (neighbor === dest) {
                        packetsToAnimate.push({
                            fromIdx: currentNode,
                            toIdx: neighbor,
                            color: this.visualizer.getColors().packetFlooding
                        });
                        this.graph.incrementLoad(neighbor);
                        continue;
                    }
                    
                    if (visited.has(neighbor)) continue;

                    visited.add(neighbor);
                    nextWave.push(neighbor);
                    
                    packetsToAnimate.push({
                        fromIdx: currentNode,
                        toIdx: neighbor,
                        color: this.visualizer.getColors().packetFlooding
                    });
                    
                    this.graph.incrementLoad(neighbor);
                }
            }
            
            if (packetsToAnimate.length > 0) {
                await this.visualizer.animateMultiplePackets(packetsToAnimate, this.speed);
                await delay(100 / this.speed);
            }
            
            currentWave = nextWave;
        }

        this.visualizer.setDestinationHighlight(null);
    }



    /**
     * STATIC ROUTING - Статическая маршрутизация
     * Использует предвычисленные пути, которые не меняются
     * Если путь был разрушен микрометеоритным ударом - пакет не доставляется
     * 
     * @param {number} source - Индекс узла-источника
     * @param {number} dest - Индекс узла назначения
     * @param {string} [e="Статическая"] - Костыль, чтобы ошибка выводилась в зависимости от типа маршрутизации (т.к статическая используется в гибридной)
     */
    async staticRouting(source, dest, e = "Статическая") {
        // Подсвечиваем узел назначения оранжевым
        this.visualizer.setDestinationHighlight(dest);
    
        const path = this.staticRoutes[dest];
        
        // Получаем имена узлов для предупреждения
        const sourceName = this.graph.nodes[source].name;
        const destName = this.graph.nodes[dest].name;
        
        // Если путь не был найден при предварительном вычислении
        if (!path) {
            console.log(`Статическая маршрутизация: путь к узлу ${dest} не найден`);
            // Показываем предупреждение о неудавшейся доставке
            if (window.networkSimulator) {
                window.networkSimulator.addDeliveryWarning(sourceName, destName, e);
            }
            this.visualizer.setDestinationHighlight(null);
            return;
        }
        
        // Проверяем, доступен ли путь (все рёбра пути активны)
        // Если хотя бы одно ребро удалено - путь НЕ работает
        let pathValid = true;
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            
            // Ищем ребро между узлами
            const edge = this.graph.edges.find(e => 
                (e.from === from && e.to === to) || (e.from === to && e.to === from)
            );
            
            // Если ребро не активно - путь разрушен
            if (!edge || !edge.active) {
                pathValid = false;
                break;
            }
        }
        
        // Если путь разрушен - пакет НЕ доставляется
        if (!pathValid) {
            console.log(`Статическая маршрутизация: предвычисленный путь к узлу ${dest} разрушен`);
            // Показываем предупреждение о неудавшейся доставке
            if (window.networkSimulator) {
                window.networkSimulator.addDeliveryWarning(sourceName, destName, e);
            }
            this.visualizer.setDestinationHighlight(null);
            return;
        }
        
        // Путь доступен - анимируем прохождение пакета по ПРЕДВЫЧИСЛЕННОМУ пути
        for (let i = 0; i < path.length; i++) {
            // Увеличиваем нагрузку на текущий узел
            this.graph.incrementLoad(path[i]);
            
            // Анимируем переход к следующему узлу
            if (i < path.length - 1) {
                await this.visualizer.animatePacket(
                    path[i],
                    path[i + 1],
                    this.visualizer.getColors().packetStatic,
                    this.speed
                );
            }
        }
        
        // Снимаем подсветку
        this.visualizer.setDestinationHighlight(null);
    }

    /**
     * ADAPTIVE ROUTING - Адаптивная маршрутизация
     * Выбирает путь динамически, основываясь на текущей нагрузке узлов
     * Предпочитает узлы с меньшей нагрузкой
     * 
     * @param {number} source - Индекс узла начала
     * @param {number} dest - Индекс узла назначения
     */
    async adaptiveRouting(source, dest) {
        // Подсвечиваем узел назначения оранжевым
        this.visualizer.setDestinationHighlight(dest);

        // Высчитываем пути
        let paths = this.getPaths();

        let path = paths[dest];
        this.graph.incrementLoad(3);
        for (let i = 1; i < path.length; i++) {
            this.graph.incrementLoad(path[i]);

            await this.visualizer.animatePacket(
                path[i-1],
                path[i],
                this.visualizer.getColors().packetAdaptive,
                this.speed
            )
        }
        
        // Снимаем подсветку
        this.visualizer.setDestinationHighlight(null);
    }

    /**
     * Дэмн
     * @return {Array<Array<number>>}
     */
    getPaths() {
        let paths = findPathsFromNode(this.graph.edges, this.graph.nodes.length, this.graph.SOURCE_NODE, true);
        if (allHasPaths(paths)) {
            return paths
        }

        // Гарантируется где-то там чем-то там, что путь от 3 ноды до любой другой точно существует 
        // Пути, используя резервные каналы
        let p = findPathsFromNode(this.graph.edges, this.graph.nodes.length, this.graph.SOURCE_NODE, false);
        for (let i = 0; i < paths.length; i++) {
            // Если через путь, использующий резервные каналы, сильно выгоднее и быстрее, чем путь без резервных каналов, то всё равно выбираем первый
            if (paths[i].length === 0 || paths[i][paths[i].length - 1] !== i || p[i].length + 2 < paths[i].length) {
                paths[i] = p[i];
            } 
        }

        return paths
    }

    /**
     * HYBRID ROUTING - Гибридная маршрутизация
     * Для критических узлов использует статическую маршрутизацию
     * Для остальных - адаптивную
     * 
     * @param {number} source - Индекс узла-источника
     * @param {number} dest - Индекс узла назначения
     */
    async hybridRouting(source, dest) {
        // Критические узлы: Энергоблок (1), ИИ-ядро (2), Медпункт (5)
        const criticalNodes = [1, 2, 5];
        const isCritical = criticalNodes.includes(dest);
        
        if (isCritical) {
            // Для критических узлов используем статическую маршрутизацию
            await this.staticRouting(source, dest, "Гибридная");
        } else {
            // Для некритических узлов используем адаптивную маршрутизацию
            await this.adaptiveRouting(source, dest);
        }
    }
}
