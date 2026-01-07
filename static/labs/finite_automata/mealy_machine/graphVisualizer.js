/**
 * graphVisualizer.js
 * 
 * Визуализация автомата Мили с использованием Cytoscape.js
 * ✅ ИСПРАВЛЕНИЯ v4.1:
 *    - Подписи рёбер светлые в тёмной теме
 *    - Самопетли красивые и круглые
 *    - 2 клика на вершину → создание петли (ребро в саму себя)
 *    - 1 клик на вершину → начало создания ребра
 *    - 1 клик на другую вершину → завершение создания ребра
 *    - 3 клика на вершину → удаление вершины
 *    - Двойной клик на пусто → создание новой вершины
 */

(function(global) {
    'use strict';

    let cy = null;
    let selectedNode = null;

    const MINZOOM = 0.8;
    const MAXZOOM = 1.2;
    const LOOPCONTROLDISTANCE = 90;
    const LABELOFFSETFACTOR = 1.5;
    const NODESIZE = 64;
    const PARALLELEDGESPACING = 35;
    const DOUBLE_CLICK_DELAY = 300;
    const TRIPLE_CLICK_DELAY = 500;

    // Отслеживание кликов
    let tapTimes = {};
    let tapCounts = {};

    function getTapKey(element) {
        if (!element) return 'empty';
        if (element.isNode && element.isNode()) return 'node_' + element.id();
        if (element.isEdge && element.isEdge()) return 'edge_' + element.id();
        return 'empty';
    }

    function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container for graph not found:', containerId);
            return;
        }

        cy = cytoscape({
            container: container,
            elements: [],
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': 'data(color)',
                        'color': '#ffffff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': NODESIZE,
                        'height': NODESIZE,
                        'font-size': 13,
                        'font-weight': 600,
                        'text-wrap': 'wrap',
                        'text-max-width': 60,
                        'border-width': 0,
                        'z-index': 10
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'label': 'data(label)',
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-scale': 1.4,
                        'line-color': 'data(color)',
                        'target-arrow-color': 'data(color)',
                        'width': 2.5,
                        'opacity': 0.88,
                        'text-background-opacity': 1.0,
                        'text-background-color': 'data(textBg)',
                        'text-background-shape': 'roundrectangle',
                        'text-background-padding': '3px 6px',
                        'text-border-opacity': 0.0,
                        'font-size': 11,
                        'font-weight': 500,
                        'color': 'var(--edge-label-color)',
                        'text-margin-y': 'data(marginY)',
                        'text-margin-x': 'data(marginX)',
                        'edge-text-rotation': 'autorotate',
                        'z-index': 1
                    }
                },
                {
                    selector: 'edge[source = target]',
                    style: {
                        'curve-style': 'unbundled-bezier',
                        'control-point-distance': 90,
                        'control-point-weight': 0.25,
                        'edge-text-rotation': 'none'
                    }
                },
                {
                    selector: '.edge-active',
                    style: {
                        'line-color': 'var(--color-success)',
                        'target-arrow-color': 'var(--color-success)',
                        'width': 3.5,
                        'opacity': 1.0
                    }
                },
                {
                    selector: '.node-active',
                    style: {
                        'background-color': 'var(--color-success)',
                        'z-index': 11
                    }
                },
                {
                    selector: '.selected-node',
                    style: {
                        'border-width': 2,
                        'border-color': 'var(--color-primary)',
                        'z-index': 12
                    }
                }
            ],
            layout: {
                name: 'preset'
            },
            userZoomingEnabled: true,
            userPanningEnabled: true,
            wheelSensitivity: 0.1,
            pixelRatio: window.devicePixelRatio || 1
        });

        cy.ready(() => {
            cy.resize();
            cy.fit();
            cy.center();
        });

        cy.on('zoom', () => {
            const currentZoom = cy.zoom();
            if (currentZoom < MINZOOM) cy.zoom(MINZOOM);
            if (currentZoom > MAXZOOM) cy.zoom(MAXZOOM);
        });

        // ========== ОБРАБОТЧИК КЛИКОВ ==========
        cy.on('tap', (evt) => {
            const now = Date.now();
            const tapKey = getTapKey(evt.target);
            
            // Инициализация счётчиков если нужно
            if (!tapTimes[tapKey] || now - tapTimes[tapKey] > TRIPLE_CLICK_DELAY) {
                tapTimes[tapKey] = now;
                tapCounts[tapKey] = 1;
            } else {
                tapCounts[tapKey] = (tapCounts[tapKey] || 0) + 1;
            }

            const clickCount = tapCounts[tapKey];

            // ЛОГИКА МНОЖЕСТВЕННЫХ КЛИКОВ
            if (evt.target.isNode && evt.target.isNode()) {
                const node = evt.target;

                if (clickCount === 1) {
                    // ===== ПЕРВЫЙ КЛИК НА ВЕРШИНУ =====
                    handleNodeFirstClick(node);
                } else if (clickCount === 2) {
                    // ===== ВТОРОЙ КЛИК НА ТУ ЖЕ ВЕРШИНУ =====
                    handleNodeSecondClick(node);
                } else if (clickCount === 3) {
                    // ===== ТРЕТИЙ КЛИК НА ТУ ЖЕ ВЕРШИНУ - УДАЛИТЬ =====
                    handleNodeThirdClick(node);
                    delete tapTimes[tapKey];
                    delete tapCounts[tapKey];
                }
            } else if (evt.target.isEdge && evt.target.isEdge()) {
                // Клик на ребро - ничего не делаем
                // (можно добавить удаление по двойному клику если нужно)
            } else {
                // ===== КЛИК НА ПУСТО =====
                if (clickCount === 1) {
                    // Отменить выделение
                    if (selectedNode) {
                        selectedNode.removeClass('selected-node');
                        selectedNode = null;
                    }
                } else if (clickCount === 2) {
                    // Создать новую вершину
                    handleEmptyDoubleClick(evt.position);
                    delete tapTimes[tapKey];
                    delete tapCounts[tapKey];
                }
            }
        });

        cy.on('dragfree', 'node', () => {
            window.dispatchEvent(new CustomEvent('graphChanged'));
        });
    }

    function handleNodeFirstClick(node) {
        // Первый клик на вершину - начало создания ребра или выделение
        
        if (selectedNode && selectedNode.id() === node.id()) {
            // Повторный клик на одну вершину не меняет выделение
            return;
        }

        if (selectedNode && selectedNode.id() !== node.id()) {
            // Есть другая выбранная вершина - создаём ребро
            createEdgeBetweenNodes(selectedNode, node);
            selectedNode.removeClass('selected-node');
            selectedNode = null;
            console.log('Создано ребро между вершинами');
        } else {
            // Выделить вершину
            if (selectedNode) {
                selectedNode.removeClass('selected-node');
            }
            selectedNode = node;
            node.addClass('selected-node');
            console.log('Выделена вершина:', node.id());
        }
    }

    function handleNodeSecondClick(node) {
        // Второй клик на ТУ ЖЕ вершину - создать петлю (ребро в саму себя)
        console.log('Создание петли на вершину:', node.id());
        createEdgeBetweenNodes(node, node);
        
        if (selectedNode && selectedNode.id() === node.id()) {
            selectedNode.removeClass('selected-node');
            selectedNode = null;
        }
    }

    function handleNodeThirdClick(node) {
        // Третий клик на ТУ ЖЕ вершину - удалить вершину
        console.log('Удаление вершины:', node.id());
        node.remove();
        
        if (selectedNode && selectedNode.id() === node.id()) {
            selectedNode = null;
        }
        
        window.dispatchEvent(new CustomEvent('graphChanged'));
    }

    function handleEmptyDoubleClick(pos) {
        // Двойной клик на пусто - создать новую вершину
        const existingNodes = cy.nodes().length;
        const nodeId = 's' + existingNodes;

        console.log('Создание новой вершины:', nodeId);
        cy.add({
            group: 'nodes',
            data: {
                id: nodeId,
                label: nodeId,
                color: getComputedStyle(document.documentElement).getPropertyValue('--node-color') || '#208090'
            },
            position: pos
        });

        window.dispatchEvent(new CustomEvent('graphChanged'));
    }

    function createEdgeBetweenNodes(fromNode, toNode) {
        const fromNodeId = fromNode.id();
        const toNodeId = toNode.id();

        // Проверить, нет ли уже такого ребра
        const existingEdges = cy.edges().filter(
            edge => edge.source().id() === fromNodeId && edge.target().id() === toNodeId
        );

        const edgeIndex = existingEdges.length;
        const isLoop = fromNodeId === toNodeId;
        const controlDistance = isLoop ? LOOPCONTROLDISTANCE : 70 + edgeIndex * PARALLELEDGESPACING;

        const labelOffset = computeLabelOffset(
            fromNode.position(),
            toNode.position(),
            controlDistance,
            isLoop
        );

        const edgeId = 'e' + fromNodeId + toNodeId + Date.now();
        const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--edge') || '#b4b6b6';
        const textBgColor = getComputedStyle(document.documentElement).getPropertyValue('--edge-text-bg') || '#ffffff';

        cy.add({
            group: 'edges',
            data: {
                id: edgeId,
                source: fromNodeId,
                target: toNodeId,
                label: '?,?',
                input: '?',
                out: '?',
                color: edgeColor,
                textBg: textBgColor,
                marginX: labelOffset.x,
                marginY: labelOffset.y
            }
        });

        window.dispatchEvent(new CustomEvent('graphEdgeCreated', {
            detail: { from: fromNodeId, to: toNodeId, edgeId: edgeId }
        }));

        window.dispatchEvent(new CustomEvent('graphChanged'));
    }

    function computeLabelOffset(srcPos, tgtPos, ctrlDist, isLoop) {
        let dx, dy, offset;

        if (isLoop) {
            dx = 0;
            dy = -1;
            offset = 75;
        } else {
            dx = tgtPos.x - srcPos.x;
            dy = tgtPos.y - srcPos.y;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            dx = -dy / length;
            dy = dx / length;
            offset = Math.max(20, Math.min(80, ctrlDist * LABELOFFSETFACTOR));
        }

        return {
            x: Math.round(dx * offset),
            y: Math.round(dy * offset)
        };
    }

    function buildFromAutomaton(automaton) {
        if (!cy) return;

        cy.elements().remove();

        const states = automaton.states;
        if (states.length === 0) return;

        const posMap = computeGridPositions(states);

        const nodes = states.map(state => ({
            group: 'nodes',
            data: {
                id: state,
                label: state,
                color: getComputedStyle(document.documentElement).getPropertyValue('--node-color') || '#208090'
            },
            position: posMap[state]
        }));

        const parallelEdgeCount = {};
        const parallelEdgeIndex = {};

        Object.entries(automaton.transitions).forEach(([fromState, transitionMap]) => {
            Object.entries(transitionMap).forEach(([input, transitionData]) => {
                const toState = transitionData.to;
                const key = fromState + toState;
                parallelEdgeCount[key] = (parallelEdgeCount[key] || 0) + 1;
            });
        });

        const edges = [];
        Object.entries(automaton.transitions).forEach(([fromState, transitionMap]) => {
            Object.entries(transitionMap).forEach(([input, transitionData]) => {
                const toState = transitionData.to;
                const key = fromState + toState;
                const currentIndex = parallelEdgeIndex[key] || 0;
                parallelEdgeIndex[key] = currentIndex + 1;

                const isLoop = fromState === toState;
                const controlDist = isLoop ? LOOPCONTROLDISTANCE : 70 + currentIndex * PARALLELEDGESPACING;

                const labelOffset = computeLabelOffset(
                    posMap[fromState],
                    posMap[toState],
                    controlDist,
                    isLoop
                );

                const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--edge') || '#b4b6b6';
                const textBgColor = getComputedStyle(document.documentElement).getPropertyValue('--edge-text-bg') || '#ffffff';

                edges.push({
                    group: 'edges',
                    data: {
                        id: 'e' + fromState + input,
                        source: fromState,
                        target: toState,
                        label: input + ' / ' + transitionData.out,
                        input: input,
                        out: transitionData.out,
                        color: edgeColor,
                        textBg: textBgColor,
                        marginX: labelOffset.x,
                        marginY: labelOffset.y
                    }
                });
            });
        });

        cy.add(nodes.concat(edges));

        cy.layout({ name: 'preset', padding: 20 }).run();
        cy.fit();
        cy.center();
    }

    function computeGridPositions(states) {
        const numStates = states.length;
        const cols = Math.ceil(Math.sqrt(numStates));
        const spacingX = 180;
        const spacingY = 160;
        const startX = 100;
        const startY = 100;
        const positions = {};

        for (let i = 0; i < numStates; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            positions[states[i]] = {
                x: startX + col * spacingX,
                y: startY + row * spacingY
            };
        }

        return positions;
    }

    function resetView() {
        if (!cy) return;
        cy.fit();
        cy.center();
    }

    function updateEdgeLabel(edgeId, label, input, output) {
        if (!cy) return;

        const edge = cy.getElementById(edgeId);
        if (edge && edge.isEdge()) {
            edge.data('label', label);
            edge.data('input', input);
            edge.data('out', output);
            edge.data('textBg', getComputedStyle(document.documentElement).getPropertyValue('--edge-text-bg') || '#ffffff');
        }

        window.dispatchEvent(new CustomEvent('graphChanged'));
    }

    function exportRulesText() {
        if (!cy) return '';

        const lines = [];
        cy.edges().forEach(edge => {
            const data = edge.data();
            const input = data.input ? data.input : '?';
            const output = data.out ? data.out : '?';
            lines.push(`${data.source},${input} -> ${data.target},${output}`);
        });

        return lines.join('\n');
    }

    function highlightEdgeByData(fromState, toState, input) {
        if (!cy) return;

        cy.edges().removeClass('edge-active');

        if (!fromState || !toState || !input) return;

        const matchingEdges = cy.edges().filter(edge => {
            const data = edge.data();
            return data.source === fromState &&
                   data.target === toState &&
                   data.input === input &&
                   data.label.startsWith(input);
        });

        if (matchingEdges.length > 0) {
            matchingEdges.addClass('edge-active');
        }
    }

    function highlightNode(nodeId) {
        if (!cy) return;

        cy.nodes().removeClass('node-active');

        if (!nodeId) return;

        const node = cy.getElementById(nodeId);
        if (node && node.isNode()) {
            node.addClass('node-active');
        }
    }

    function refreshTheme() {
        if (!cy) return;

        const edgeColor = getComputedStyle(document.documentElement).getPropertyValue('--edge') || '#b4b6b6';
        const nodeColor = getComputedStyle(document.documentElement).getPropertyValue('--node-color') || '#208090';
        const textBgColor = getComputedStyle(document.documentElement).getPropertyValue('--edge-text-bg') || '#ffffff';

        cy.nodes().forEach(node => {
            node.data('color', nodeColor);
        });

        cy.edges().forEach(edge => {
            edge.data('color', edgeColor);
            edge.data('textBg', textBgColor);
        });

        cy.style().update();
    }

    window.addEventListener('theme:changed', refreshTheme);

    global.graphVisualizer = {
        init: init,
        buildFromAutomaton: buildFromAutomaton,
        resetView: resetView,
        updateEdgeLabel: updateEdgeLabel,
        exportRulesText: exportRulesText,
        highlightEdgeByData: highlightEdgeByData,
        highlightNode: highlightNode,
        refreshTheme: refreshTheme
    };

})(window);