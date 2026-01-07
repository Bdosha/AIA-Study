// Треугольная решётка — Итерация 3
/**
 * Треугольная решётка с чередованием ориентации («up»/«down»).
 * Содержит индексацию, нормализацию границ и кэш соседей для разных ядер.
 */
export class TriGrid {
  /**
   * @param {number} w - число столбцов (треугольников) в строке
   * @param {number} h - число строк (треугольников)
   * @param {{wrapMode?: 'toroidal'|'bounded'}} opts
   */
  constructor(w, h, { wrapMode = 'toroidal' } = {}) {
    this.w = w;
    this.h = h;
    this.wrapMode = wrapMode;
    this.size = w * h;
    this._nbrCache = { 'edge-3': new Array(this.size), 'moore-12': new Array(this.size) };
  }

  /** Возвращает линейный индекс по паре (row, col). */
  index(row, col) {
    return row * this.w + col;
  }

  /** Возвращает пару (row, col) и ориентацию треугольника по линейному индексу. */
  rc(index) {
    const row = Math.floor(index / this.w);
    const col = index % this.w;
    const orient = ((row + col) & 1) === 0 ? 'up' : 'down';
    return { row, col, orient };
  }

  /** Проверяет вхождение в границы поля. */
  inBounds(row, col) {
    return row >= 0 && row < this.h && col >= 0 && col < this.w;
  }

  /**
   * Нормализует координаты с учётом режима границ
   * @returns {[number, number] | null}
   */
  normalizeRC(row, col) {
    if (this.wrapMode === 'toroidal') {
      let r = row % this.h; if (r < 0) r += this.h;
      let c = col % this.w; if (c < 0) c += this.w;
      return [r, c];
    }
    // bounded
    return this.inBounds(row, col) ? [row, col] : null;
  }

  /** Возвращает соседей по ядру edge-3 | moore-12, кэшируя результат. */
  neighbors(index, kernel = 'edge-3') {
    const cache = this._nbrCache[kernel];
    if (!cache[index]) cache[index] = this._computeNeighbors(index, kernel);
    return cache[index];
  }

  _computeNeighbors(index, kernel) {
    const { row, col, orient } = this.rc(index);
    if (kernel === 'edge-3') {
      const offsets = orient === 'up'
        ? [ [0, -1], [0, +1], [+1, 0] ]
        : [ [0, -1], [0, +1], [-1, 0] ];
      const out = [];
      for (const [dr, dc] of offsets) {
        const norm = this.normalizeRC(row + dr, col + dc);
        if (norm) out.push(this.index(norm[0], norm[1]));
      }
      return Uint16Array.from(out);
    }
    
    // moore-12: заново определяем соседей на основе переданных скриншотов
    // Полностью фиксированные списки соседей для каждой ориентации
    const upNeighbors = [
      // По ребру (3)
      [0, -1], [0, 1], [1, 0],
      
      // По вершине (9) - исходя из скриншотов
      [-1, -1], [-1, 0], [-1, 1], 
      [1, -1], [1, 1], [1, -2], [1, 2],
      [0, -2], [0, 2],
    ];
    
    const downNeighbors = [
      // По ребру (3)
      [0, -1], [0, 1], [-1, 0],
      
      // По вершине (9) - исходя из симметрии
      [1, -1], [1, 1],
      [-1, -1], [-1, 1], [-1, -2], [-1, 2],
      [0, -2], [0, 2],
      [1, 0],
    ];
    
    // Выбираем нужный список соседей в зависимости от ориентации
    const offsets = orient === 'up' ? upNeighbors : downNeighbors;
    
    const out = [];
    for (const [dr, dc] of offsets) {
      const norm = this.normalizeRC(row + dr, col + dc);
      if (norm) out.push(this.index(norm[0], norm[1]));
    }
    
    return Uint16Array.from(out);
    
    return Uint16Array.from(candidates);
  }

  /** Добавляет нормализованную клетку в множество. */
  _tryAddByAnchor(set, row, col) {
    const norm = this.normalizeRC(row, col);
    if (!norm) return;
    set.add(this.index(norm[0], norm[1]));
  }

  /** 
   * Возвращает 3 вершины треугольника в нормализованных координатах 
   * Используем более точную геометрию треугольной решетки для определения вершин
   */
  static _triVerticesNormalized(row, col, orient) {
    // Используем удвоенные координаты для большей точности
    const x = col * 2, y = row * 2;
    
    if (orient === 'up') {
      return [
        [x, y],       // Левая нижняя вершина
        [x + 2, y],   // Правая нижняя вершина
        [x + 1, y - 1] // Верхняя вершина
      ];
    } else {
      return [
        [x, y],       // Левая верхняя вершина
        [x + 2, y],   // Правая верхняя вершина
        [x + 1, y + 1] // Нижняя вершина
      ];
    }
  }

  /** 
   * Возвращает true, если два треугольника имеют общую вершину.
   * Используем более точное сравнение координат.
   */
  static _shareAnyVertex(v1, v2) {
    // v1 и v2 — массивы из трёх пар [x,y]
    for (let i = 0; i < 3; i++) {
      const a = v1[i];
      for (let j = 0; j < 3; j++) {
        const b = v2[j];
        if (a[0] === b[0] && a[1] === b[1]) return true;
      }
    }
    return false;
  }
}
