/**
 * utils.js - Вспомогательные функции
 * 
 * Этот модуль содержит утилиты для:
 * - Вычисления расстояний между точками
 * - Форматирования чисел
 * - Интерполяции цветов
 * - Задержек выполнения
 */

/**
 * Вычисляет евклидово расстояние между двумя точками
 * @param {Object} pos1 - Первая точка {x, y}
 * @param {Object} pos2 - Вторая точка {x, y}
 * @returns {number} Расстояние между точками
 */
function getDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Форматирует число с заданным количеством десятичных знаков
 * @param {number} value - Число для форматирования
 * @param {number} decimals - Количество десятичных знаков
 * @returns {string} Отформатированная строка
 */
function formatNumber(value, decimals = 2) {
    return value.toFixed(decimals);
}

/**
 * Создает задержку на заданное количество миллисекунд
 * @param {number} ms - Время задержки в миллисекундах
 * @returns {Promise} Promise, который разрешается после задержки
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Получает значение CSS-переменной из корневого элемента
 * @param {string} varName - Имя CSS-переменной (например, '--color-primary')
 * @returns {string} Значение переменной
 */
function getCSSVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Интерполяция между двумя цветами
 * @param {string} color1 - Первый цвет в формате RGB
 * @param {string} color2 - Второй цвет в формате RGB
 * @param {number} t - Коэффициент интерполяции (0-1)
 * @returns {string} Интерполированный цвет
 */
function colorLerp(color1, color2, t) {
    // Простая линейная интерполяция для демонстрации
    return color1; // В данной реализации возвращаем первый цвет
}

/**
 * Алгоритм Флойда-Уоршелла для поиска кратчайших путей от источника до всех узлов
 * @param {Array<map>} edges - Ребра графа
 * @param {number} amount_of_nodes - Количество нод в графе
 * @param {number} src - Индекс начальной ноды, от которой ищем путь
 * @param {boolean} usePrimaryOnly - Использовать только основные каналы
 * @returns {Array<Array<number>>} - Массив путей от узла SOURCE_NODE до остальных
 */
function findPathsFromNode(edges, amount_of_nodes, src, usePrimaryOnly = false) {
    const n = amount_of_nodes;
    const source = src;
    
    const dist = Array(n).fill(null).map(() => Array(n).fill(Infinity));
    const next = Array(n).fill(null).map(() => Array(n).fill(null));
    
    for (let i = 0; i < n; i++) {
        dist[i][i] = 0;
        next[i][i] = i;
    }
    
    edges.forEach(edge => {
        if (!edge.active) return;
        if (usePrimaryOnly && edge.backup) return;
        
        dist[edge.from][edge.to] = edge.weight;
        dist[edge.to][edge.from] = edge.weight;
        next[edge.from][edge.to] = edge.to;
        next[edge.to][edge.from] = edge.from;
    });
    
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }
    
    const paths = [];
    
    for (let j = 0; j < n; j++) {
        if (next[source][j] === null) {
            paths[j] = [];
        } else {
            const path = [3];
            let current = source;
            while (current !== j) {
                current = next[current][j];
                path.push(current);
            }
            paths[j] = path;
        }
    }
    
    return paths;
}

/**
 * Проверка, есть ли все пути
 * @param {Array<Array<number>>} paths 
 * @returns {boolean}
 */
function allHasPaths(paths) {
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];

        if (path.length === 0 || path[path.length - 1] !== i) {
            return false;
        }
    }
    return true;
}