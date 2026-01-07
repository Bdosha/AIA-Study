/**
 * Инициализация рендера Canvas для треугольной решётки.
 * Управляет подбором масштаба, центрированием, слоем сетки (offscreen) и частичным ререндером.
 * @param {HTMLCanvasElement} canvasEl
 * @returns {{
 *   ctx: CanvasRenderingContext2D,
 *   resizeToContainer(grid: import('./grid-tri').TriGrid): void,
 *   drawGrid(grid: import('./grid-tri').TriGrid): void,
 *   drawCells(grid: import('./grid-tri').TriGrid, buffer: Uint8Array, dirtyIndices?: number[]): void,
 *   pickIndex(grid: import('./grid-tri').TriGrid, x: number, y: number): number
 * }}
 */
export function initCanvas(canvasEl) {
  const ctx = canvasEl.getContext('2d');
  const state = {
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    s: 16, // сторона треугольника (px)
    stepX: 8, // s/2
    stepY: 13.856, // s*sqrt(3)/2 (высота треугольника)
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    drawnW: 0,
    drawnH: 0,
    gridCanvas: null,
    gridCtx: null,
    gridVisible: true,
    overlayCanvas: null,
    overlayCtx: null
  };

  const SQ3 = Math.sqrt(3);

  function setSide(s) {
    state.s = s;
    state.stepX = s / 2;
    state.stepY = (s * SQ3) / 2;
  }

  function resizeToContainer(grid) {
    const dpr = state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvasEl.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    const pixW = Math.floor(cssW * dpr);
    const pixH = Math.floor(cssH * dpr);
    if (canvasEl.width !== pixW) canvasEl.width = pixW;
    if (canvasEl.height !== pixH) canvasEl.height = pixH;
    state.width = pixW; state.height = pixH;
    // подобрать размер треугольника под контейнер
    // Горизонтальная протяжённость ~ (w+1) * (s/2); вертикальная ~ h * (s*sqrt3/2)
    const sByW = (2 * pixW) / (grid.w + 1);
    const sByH = (2 * pixH) / (SQ3 * grid.h);
    const s = Math.max(4, Math.floor(0.98 * Math.min(sByW, sByH)));
    setSide(s);
    // вычислить фактические размеры отрисовки и центрировать
    state.drawnW = state.stepX * (grid.w + 1);
    state.drawnH = state.stepY * grid.h;
    state.offsetX = Math.max(0, Math.floor((state.width - state.drawnW) / 2));
    state.offsetY = Math.max(0, Math.floor((state.height - state.drawnH) / 2));
    rebuildGridLayer(grid);
  }

  function clear() {
    ctx.clearRect(0, 0, state.width, state.height);
  }

  function rebuildGridLayer(grid) {
    // Создать/пересоздать слой с сеткой
    if (!state.gridCanvas) {
      state.gridCanvas = document.createElement('canvas');
    }
    const gcv = state.gridCanvas;
    gcv.width = state.width; gcv.height = state.height;
    state.gridCtx = gcv.getContext('2d');
    const gctx = state.gridCtx;
    gctx.clearRect(0, 0, state.width, state.height);
    gctx.save();
    gctx.lineWidth = 1;
    gctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-stroke').trim() || 'rgba(255,255,255,0.12)';
    for (let r = 0; r < grid.h; r++) {
      for (let c = 0; c < grid.w; c++) {
        const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
        gctx.beginPath();
        // используем ту же геометрию, но на контексте слоя
        const prev = ctx;
        // временно переназначим ctx для triPath вызова
        // (альтернатива: вынести общую функцию построения пути, но это изменение минимальное)
        // Временная подмена небезопасна в многопоточном окружении, но здесь синхронно и локально
        // поэтому допустимо.
        const _ctx = ctx;
        // переопределим ссылку на ctx через замыкание
        // eslint отключён, т.к. линтера нет; полагаемся на локальную замену ниже
        // Простой способ — реализовать локальный triPath для слоя
        (function triPathLayer(row, col, orientL) {
          const cx = state.offsetX + state.stepX * (col + 1);
          const cy = state.offsetY + state.stepY * row;
          if (orientL === 'up') {
            gctx.moveTo(cx - state.stepX, cy + state.stepY);
            gctx.lineTo(cx, cy);
            gctx.lineTo(cx + state.stepX, cy + state.stepY);
            gctx.closePath();
          } else {
            gctx.moveTo(cx - state.stepX, cy);
            gctx.lineTo(cx + state.stepX, cy);
            gctx.lineTo(cx, cy + state.stepY);
            gctx.closePath();
          }
        })(r, c, orient);
        gctx.stroke();
      }
    }
    gctx.restore();
  }

  function ensureOverlay() {
    if (!state.overlayCanvas) {
      state.overlayCanvas = document.createElement('canvas');
      state.overlayCtx = state.overlayCanvas.getContext('2d');
      // вставим поверх основного канваса
      state.overlayCanvas.style.position = 'absolute';
      // координаты и размер будем синхронизировать с основным canvas
      state.overlayCanvas.style.pointerEvents = 'none';
      // родитель должен быть position:relative; обеспечим на контейнере
      const parent = canvasEl.parentElement || canvasEl;
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(state.overlayCanvas);
    }
    // синхронизация позиции и размеров (CSS + пиксели под DPR)
    const rect = canvasEl.getBoundingClientRect();
    const parentRect = (canvasEl.parentElement || canvasEl).getBoundingClientRect();
    const left = Math.round(rect.left - parentRect.left);
    const top = Math.round(rect.top - parentRect.top);
    state.overlayCanvas.style.left = left + 'px';
    state.overlayCanvas.style.top = top + 'px';
    state.overlayCanvas.style.width = Math.max(1, rect.width) + 'px';
    state.overlayCanvas.style.height = Math.max(1, rect.height) + 'px';
    state.overlayCanvas.width = state.width;
    state.overlayCanvas.height = state.height;
  }

  function triPath(row, col, orient) {
    // Центр по X — между двумя опорными вертикалями; по Y — начало строки
    const cx = state.offsetX + state.stepX * (col + 1);
    const cy = state.offsetY + state.stepY * row;
    if (orient === 'up') {
      ctx.moveTo(cx - state.stepX, cy + state.stepY); // левое основание
      ctx.lineTo(cx, cy);                              // верхняя вершина
      ctx.lineTo(cx + state.stepX, cy + state.stepY); // правое основание
      ctx.closePath();
    } else {
      ctx.moveTo(cx - state.stepX, cy);               // левое основание
      ctx.lineTo(cx + state.stepX, cy);               // правое основание
      ctx.lineTo(cx, cy + state.stepY);               // нижняя вершина
      ctx.closePath();
    }
  }

  function drawGrid(grid) {
    // перестроить слой сетки на случай смены темы
    rebuildGridLayer(grid);
    clear();
    // наложить слой сетки
    if (state.gridVisible && state.gridCanvas) ctx.drawImage(state.gridCanvas, 0, 0);
    ensureOverlay();
  }

  function drawCells(grid, buffer, dirtyIndices) {
    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue('--bg').trim() || '#0f1115';
    const alive = cs.getPropertyValue('--alive-fill').trim() || '#4ea1ff';
    if (dirtyIndices && dirtyIndices.length) {
      // Сгруппированный частичный ререндер: один clip для всех dirty, один drawImage
      const clipPath = new Path2D();
      const alivePath = new Path2D();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < dirtyIndices.length; i++) {
        const idx = dirtyIndices[i];
        const r = (idx / grid.w) | 0;
        const c = idx % grid.w;
        const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
        const verts = triVertices(r, c, orient);
        clipPath.moveTo(verts[0][0], verts[0][1]);
        clipPath.lineTo(verts[1][0], verts[1][1]);
        clipPath.lineTo(verts[2][0], verts[2][1]);
        clipPath.closePath();
        if (buffer[idx]) {
          alivePath.moveTo(verts[0][0], verts[0][1]);
          alivePath.lineTo(verts[1][0], verts[1][1]);
          alivePath.lineTo(verts[2][0], verts[2][1]);
          alivePath.closePath();
        }
        // bbox
        for (let k = 0; k < 3; k++) {
          const x = verts[k][0], y = verts[k][1];
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
      }
      ctx.save();
      ctx.clip(clipPath);
      // Очистим область чуть с запасом
      const pad = 1;
      ctx.clearRect(minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
      if (state.gridVisible && state.gridCanvas) ctx.drawImage(state.gridCanvas, 0, 0);
      if (alivePath) {
        ctx.fillStyle = alive;
        ctx.fill(alivePath);
      }
      ctx.restore();
      return;
    }
    // Полный ререндер заливок
  ctx.save();
  ctx.fillStyle = alive;
    for (let idx = 0; idx < buffer.length; idx++) {
      if (!buffer[idx]) continue;
      const r = (idx / grid.w) | 0;
      const c = idx % grid.w;
      const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
      ctx.beginPath();
      triPath(r, c, orient);
      ctx.fill();
    }
    ctx.restore();
  }

  // Вершины треугольника как в triPath
  function triVertices(row, col, orient) {
    const cx = state.offsetX + state.stepX * (col + 1);
    const cy = state.offsetY + state.stepY * row;
    if (orient === 'up') {
      return [
        [cx - state.stepX, cy + state.stepY],
        [cx, cy],
        [cx + state.stepX, cy + state.stepY]
      ];
    } else {
      return [
        [cx - state.stepX, cy],
        [cx + state.stepX, cy],
        [cx, cy + state.stepY]
      ];
    }
  }

  function pointInTri(px, py, a, b, c) {
    const s1 = (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]);
    const s2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]);
    const s3 = (a[0] - c[0]) * (py - c[1]) - (px - c[0]) * (a[1] - c[1]);
    const u = s2 / s1;
    const v = s3 / s1;
    const w = 1 - u - v;
    // допускаем небольшую погрешность по краям
    const eps = -1e-6;
    return u >= eps && v >= eps && w >= eps;
  }

  /** Возвращает индекс клетки под координатами канваса (учитывая offset). */
  function pickIndex(grid, x, y) {
    // Грубая оценка ближайшей строки/колонки к центру треугольника
    const xi = x - state.offsetX;
    const yi = y - state.offsetY;
    const r0 = Math.floor(yi / state.stepY);
    const c0 = Math.floor(xi / state.stepX) - 1; // из-за cx = stepX*(c+1)
    const candidates = [
      [r0, c0], [r0 - 1, c0], [r0, c0 - 1], [r0 - 1, c0 - 1],
      [r0 + 1, c0], [r0, c0 + 1], [r0 + 1, c0 + 1], [r0 - 1, c0 + 1]
    ];
    for (const [r, c] of candidates) {
      if (r < 0 || c < 0 || r >= grid.h || c >= grid.w) continue;
      const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
      const [a, b, cpt] = triVertices(r, c, orient);
      if (pointInTri(x, y, a, b, cpt)) return r * grid.w + c;
    }
    return -1;
  }

  function setGridVisible(flag) { state.gridVisible = !!flag; }

  function clearOverlay() {
    if (!state.overlayCtx) return;
    state.overlayCtx.clearRect(0, 0, state.width, state.height);
  }

  function drawOverlay(grid, hoveredIdx, neighbors, aliveCount, buffer) {
    ensureOverlay();
    const octx = state.overlayCtx;
    octx.clearRect(0, 0, state.width, state.height);
    const cs = getComputedStyle(document.documentElement);
    const colorHover = cs.getPropertyValue('--alive-fill').trim() || '#4ea1ff';
    const colorNbr = cs.getPropertyValue('--control-border').trim() || 'rgba(255,255,255,0.4)';
    octx.save();
    // обводка соседей
    octx.lineWidth = 2;
    octx.strokeStyle = colorNbr;
    for (const idx of neighbors) {
      const r = (idx / grid.w) | 0;
      const c = idx % grid.w;
      const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
      const path = new Path2D();
      const cx = state.offsetX + state.stepX * (c + 1);
      const cy = state.offsetY + state.stepY * r;
      if (orient === 'up') {
        path.moveTo(cx - state.stepX, cy + state.stepY);
        path.lineTo(cx, cy);
        path.lineTo(cx + state.stepX, cy + state.stepY);
      } else {
        path.moveTo(cx - state.stepX, cy);
        path.lineTo(cx + state.stepX, cy);
        path.lineTo(cx, cy + state.stepY);
      }
      path.closePath();
      octx.stroke(path);
      if (buffer && buffer[idx]) {
        octx.globalAlpha = 0.08;
        octx.fillStyle = colorNbr;
        octx.fill(path);
        octx.globalAlpha = 1;
      }
    }
    // выделение наведённой
    if (hoveredIdx >= 0) {
      const r = (hoveredIdx / grid.w) | 0;
      const c = hoveredIdx % grid.w;
      const orient = ((r + c) & 1) === 0 ? 'up' : 'down';
      const path = new Path2D();
      const cx = state.offsetX + state.stepX * (c + 1);
      const cy = state.offsetY + state.stepY * r;
      if (orient === 'up') {
        path.moveTo(cx - state.stepX, cy + state.stepY);
        path.lineTo(cx, cy);
        path.lineTo(cx + state.stepX, cy + state.stepY);
      } else {
        path.moveTo(cx - state.stepX, cy);
        path.lineTo(cx + state.stepX, cy);
        path.lineTo(cx, cy + state.stepY);
      }
      path.closePath();
      octx.lineWidth = 3;
      octx.strokeStyle = colorHover;
      octx.stroke(path);
    }
    // бейдж количества
    const label = `живых соседей: ${aliveCount}`;
    octx.font = `${12 * state.dpr}px system-ui, sans-serif`;
    octx.fillStyle = 'rgba(0,0,0,0.7)';
    const pad = 6 * state.dpr;
    const textW = octx.measureText(label).width;
    const bx = state.offsetX + 8 * state.dpr;
    const by = state.offsetY + 8 * state.dpr + 16 * state.dpr;
    octx.fillRect(bx - pad, by - 14 * state.dpr, textW + pad * 2, 18 * state.dpr);
    octx.fillStyle = '#fff';
    octx.fillText(label, bx, by);
    octx.restore();
  }

  return { ctx, resizeToContainer, drawGrid, drawCells, pickIndex, setGridVisible, drawOverlay, clearOverlay };
}
