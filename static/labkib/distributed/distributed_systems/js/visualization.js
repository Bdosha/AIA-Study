/**
 * visualization.js - Визуализация графа и анимация
 * 
 * Этот модуль отвечает за:
 * - Отрисовку графа на canvas
 * - Анимацию движения пакетов
 * - Подсветку узлов
 * - Управление темой оформления
 */

/**
 * Класс Visualizer управляет отрисовкой и анимацией графа
 */
class Visualizer {
    /**
     * Конструктор визуализатора
     * @param {HTMLCanvasElement} canvas - Элемент canvas для отрисовки
     * @param {Graph} graph - Граф для визуализации
     */
    constructor(canvas, graph) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.graph = graph;
        this.theme = 'dark'; // Тема по умолчанию - тёмная
        this.highlightedDestination = null; // Текущий подсвеченный узел назначения
        this.activePackets = []; // Активные пакеты для анимации
        
        // Настройка размера canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Изменяет размер canvas под контейнер
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 40;
        this.canvas.height = 500;
        this.draw();
    }

    /**
     * Получает цвета в зависимости от текущей темы
     * @returns {Object} Объект с цветами для текущей темы
     */
    getColors() {
        if (this.theme === 'dark') {
            return {
                nodeFill: '#555555',
                nodeStroke: 'rgba(255, 255, 255, 0.5)',
                nodeSource: 'rgba(119, 119, 119, 1)',
                nodeSourceStroke: 'rgba(255, 255, 255, 0.8)',
                nodeDestination: 'rgba(255, 136, 0, 1)', // Оранжевый для пункта назначения
                nodeDestinationStroke: 'rgba(255, 136, 0, 1)',
                edgePrimary: 'rgba(245, 245, 245, 0.8)',
                edgeBackup: 'rgba(167, 169, 169, 0.5)',
                text: '#ffffff',
                packetFlooding: '#ff6b6b',
                packetStatic: '#FFC185',
                packetAdaptive: '#B4413C',
                packetHybrid: '#ECEBD5'
            };
        } else {
            return {
                nodeFill: '#224160ff',
                nodeStroke: 'rgba(0, 0, 0, 0.6)',
                nodeSource: 'rgba(31, 85, 139, 1)',
                nodeSourceStroke: 'rgba(0, 0, 0, 0.6)',
                nodeDestination: 'rgba(255, 136, 0, 1)',
                nodeDestinationStroke: 'rgba(255, 136, 0, 1)',
                edgePrimary: 'rgba(19, 52, 59, 0.8)',
                edgeBackup: 'rgba(119, 124, 124, 0.5)',
                text: '#ffffff',
                packetFlooding: '#ff6b6b',
                packetStatic: '#FFC185',
                packetAdaptive: '#B4413C',
                packetHybrid: '#ECEBD5'
            };
        }
    }

    /**
     * Устанавливает тему оформления
     * @param {string} theme - 'dark' или 'light'
     */
    setTheme(theme) {
        this.theme = theme;
        this.draw();
    }

    /**
     * Устанавливает подсветку узла назначения (оранжевый цвет)
     * @param {number|null} nodeIdx - Индекс узла для подсветки или null для снятия
     */
    setDestinationHighlight(nodeIdx) {
        this.highlightedDestination = nodeIdx;
        this.draw();
    }

    /**
     * Отрисовывает весь граф
     * КРИТИЧЕСКИ ВАЖНО: рёбра рисуются ПЕРЕД узлами (слой фона)
     * Это гарантирует, что узлы будут полностью непрозрачными и скроют рёбра
     * @param {number|null} selectedNode - Выбранный узел в режиме восстановления
     */
    draw(selectedNode = null) {
        const colors = this.getColors();
        
        // Очистка canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Шаг 1: Отрисовка рёбер (СНАЧАЛА - слой фона)
        this.drawEdges(colors);
        
        // Шаг 2: Отрисовка узлов (ПОСЛЕ - слой переднего плана, НЕПРОЗРАЧНЫЕ)
        this.drawNodes(colors, selectedNode);
    }

    /**
     * Отрисовывает все рёбра графа
     * @param {Object} colors - Объект с цветами
     */
    drawEdges(colors) {
        this.graph.edges.forEach(edge => {
            // Пропускаем неактивные рёбра
            if (!edge.active) return;
            
            const fromNode = this.graph.nodes[edge.from];
            const toNode = this.graph.nodes[edge.to];
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            
            // Стиль линии зависит от типа ребра
            if (edge.backup) {
                // Резервные каналы - пунктирная линия
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeStyle = colors.edgeBackup;
            } else {
                // Основные каналы - сплошная линия
                this.ctx.setLineDash([]);
                this.ctx.strokeStyle = colors.edgePrimary;
            }
            
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }

    /**
     * Отрисовывает все узлы графа
     * КРИТИЧЕСКИ ВАЖНО: узлы рисуются с полной непрозрачностью (opacity 1.0)
     * Это скрывает рёбра, которые были нарисованы на слое фона
     * @param {Object} colors - Объект с цветами
     * @param {number|null} selectedNode - Выбранный узел
     */
    drawNodes(colors, selectedNode = null) {
        this.graph.nodes.forEach((node, idx) => {
            // Устанавливаем полную непрозрачность для узлов
            this.ctx.globalAlpha = 1.0;
            
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 50, 0, Math.PI * 2);
            
            // Определяем цвет заливки узла
            let fillColor = colors.nodeFill;
            let strokeColor = colors.nodeStroke;
            let lineWidth = 2;
            
            // Узел-источник (Мостик)
            if (idx === this.graph.SOURCE_NODE) {
                fillColor = colors.nodeSource;
                strokeColor = colors.nodeSourceStroke;
                lineWidth = 3;
            }
            
            // Узел назначения (подсветка оранжевым)
            if (idx === this.highlightedDestination) {
                fillColor = colors.nodeDestination;
                strokeColor = colors.nodeDestinationStroke;
                lineWidth = 3;
            }
            
            // Выбранный узел в режиме восстановления
            if (selectedNode === idx) {
                strokeColor = getCSSVariable('--color-primary');
                lineWidth = 3;
            }
            
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
            
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
            
            // Отрисовка текста (название узла)
            this.ctx.fillStyle = colors.text;
            this.ctx.font = 'bold 14px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Разбиваем название на части для переноса строки
            const words = node.name.split('-');
            if (words.length > 1) {
                this.ctx.fillText(words[0], node.x, node.y - 5);
                this.ctx.fillText(words[1], node.x, node.y + 8);
            } else {
                this.ctx.fillText(node.name, node.x, node.y);
            }
        });
        
        // Сбрасываем globalAlpha обратно в 1.0
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Отрисовывает пакет данных
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     * @param {string} color - Цвет пакета
     */
    drawPacket(x, y, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    /**
     * Анимирует движение пакета между двумя узлами
     * @param {number} fromIdx - Индекс начального узла
     * @param {number} toIdx - Индекс конечного узла
     * @param {string} color - Цвет пакета
     * @param {number} speed - Скорость анимации (множитель)
     * @returns {Promise} Promise, который разрешается по завершении анимации
     */
    animatePacket(fromIdx, toIdx, color, speed = 1.0) {
        return new Promise(resolve => {
            const from = this.graph.nodes[fromIdx];
            const to = this.graph.nodes[toIdx];
            const duration = 1000 / speed;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Вычисление текущей позиции пакета
                const x = from.x + (to.x - from.x) * progress;
                const y = from.y + (to.y - from.y) * progress;
                
                // Перерисовка графа и всех активных пакетов
                this.draw();
                
                // // Отрисовка всех активных пакетов
                // this.activePackets.forEach(pkt => {
                //     if (pkt.active) {
                //         this.drawPacket(pkt.x, pkt.y, pkt.color);
                //     }
                // });
                
                // Отрисовка текущего пакета
                this.drawPacket(x, y, color);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * Анимирует множественные пакеты одновременно (для flooding)
     * @param {Array} packets - Массив пакетов {fromIdx, toIdx, color}
     * @param {number} speed - Скорость анимации
     * @returns {Promise} Promise, который разрешается когда все пакеты доставлены
     */
    async animateMultiplePackets(packets, speed = 1.0) {
        if (!packets || packets.length === 0) return;

        // Удали: this.activePackets.push(...packets);

        const duration = 1000 / speed;
        const startTime = Date.now();
        
        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.draw();
                
                packets.forEach(pkt => {
                    const from = this.graph.nodes[pkt.fromIdx];
                    const to = this.graph.nodes[pkt.toIdx];
                    
                    const x = from.x + (to.x - from.x) * progress;
                    const y = from.y + (to.y - from.y) * progress;
                    
                    this.drawPacket(x, y, pkt.color);
                });
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }


}
