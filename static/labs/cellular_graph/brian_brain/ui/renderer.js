// ui/renderer.js
;(() => {
  const BB = (window.BB = window.BB || {});
  const { CELL_STATES, COLORS, theme } = BB;

  class Renderer {
    constructor(canvas, briansBrain) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      if (!this.ctx) throw new Error('2D context not available');
      this.briansBrain = briansBrain;

      this.theme = (theme && theme.getCurrentTheme && theme.getCurrentTheme()) || 'dark';
      this.showHeatmap = false;

      // геометрия
      this.cellSize = 0;
      this.offsetX = 0;
      this.offsetY = 0;

      // рисование мышью
      this.isDrawing = false;
      this.currentBrushState = CELL_STATES.ON;
      this.brushSize = 1;

      this.calculateCellSize();
      this.setupMouseHandlers();
      theme && theme.applyCanvasCursor && theme.applyCanvasCursor(this.canvas, this.theme);
    }

    // ---------- геометрия ----------
    calculateCellSize() {
      const cw = Math.floor(this.canvas.width  / this.briansBrain.width);
      const ch = Math.floor(this.canvas.height / this.briansBrain.height);
      this.cellSize = Math.max(1, Math.min(cw, ch));

      const gridWidth  = this.briansBrain.width  * this.cellSize;
      const gridHeight = this.briansBrain.height * this.cellSize;
      this.offsetX = Math.floor((this.canvas.width  - gridWidth)  / 2);
      this.offsetY = Math.floor((this.canvas.height - gridHeight) / 2);
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const targetW = Math.max(1, Math.round(rect.width  * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width  = targetW;
        this.canvas.height = targetH;
      }
      this.calculateCellSize();
    }

    // ---------- ввод мышью ----------
    setupMouseHandlers() {
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDrawing = true;
        this.drawAtPosition(e);
      });
      this.canvas.addEventListener('mousemove', (e) => {
        if (this.isDrawing) this.drawAtPosition(e);
      });
      this.canvas.addEventListener('mouseup',   () => { this.isDrawing = false; });
      this.canvas.addEventListener('mouseleave',() => { this.isDrawing = false; });
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    drawAtPosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const mouseX = (event.clientX - rect.left) * scaleX;
      const mouseY = (event.clientY - rect.top)  * scaleY;

      const gridX = Math.floor((mouseX - this.offsetX) / this.cellSize);
      const gridY = Math.floor((mouseY - this.offsetY) / this.cellSize);

      const half = Math.floor(this.brushSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const x = gridX + dx, y = gridY + dy;
          if (x >= 0 && x < this.briansBrain.width && y >= 0 && y < this.briansBrain.height) {
            this.briansBrain.setCell(x, y, this.currentBrushState);
          }
        }
      }
      this.briansBrain.updateStats(); // один раз после мазка
      this.render();
    }

    // ---------- публичные настройки ----------
    setBrushState(state) { this.currentBrushState = state; }
    setBrushSize(size)   { this.brushSize = size; }
    setShowHeatmap(v)    { this.showHeatmap = !!v; this.render(); }

    setTheme(nextTheme) {
      this.theme = nextTheme;
      theme && theme.applyCanvasCursor && theme.applyCanvasCursor(this.canvas, this.theme);
      this.render();
    }

    // ---------- цвета и рендер ----------
    render() {
      const { ctx, canvas } = this;

      const bg = (theme && theme.getSimBackground && theme.getSimBackground()) || '#ffffff';
      // фон
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // клетки
      for (let y = 0; y < this.briansBrain.height; y++) {
        for (let x = 0; x < this.briansBrain.width; x++) {
          const st = this.briansBrain.getCell(x, y);
          const color =
            (st === CELL_STATES.OFF)
              ? bg
              : (theme && theme.getStateColor && theme.getStateColor(this.theme, st)) ||
                (st === CELL_STATES.ON ? COLORS[this.theme].ON : COLORS[this.theme].DYING);

          const drawX = this.offsetX + x * this.cellSize;
          const drawY = this.offsetY + y * this.cellSize;
          ctx.fillStyle = color;
          ctx.fillRect(drawX, drawY, this.cellSize, this.cellSize);
        }
      }

      // сетка
      if (this.cellSize >= 10) {
        const w = this.briansBrain.width, h = this.briansBrain.height;
        ctx.save();
        ctx.strokeStyle = (theme && theme.getGridColor && theme.getGridColor()) || '#cccccc';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= w; x++) {
          const gx = this.offsetX + x * this.cellSize + 0.5;
          ctx.moveTo(gx, this.offsetY);
          ctx.lineTo(gx, this.offsetY + h * this.cellSize);
        }
        for (let y = 0; y <= h; y++) {
          const gy = this.offsetY + y * this.cellSize + 0.5;
          ctx.moveTo(this.offsetX, gy);
          ctx.lineTo(this.offsetX + w * this.cellSize, gy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // теплокарта
      if (this.showHeatmap) {
        let maxA = 0;
        for (let y = 0; y < this.briansBrain.height; y++) {
          for (let x = 0; x < this.briansBrain.width; x++) {
            const a = this.briansBrain.activityGrid[y][x] || 0;
            if (a > maxA) maxA = a;
          }
        }
        if (maxA > 0) {
          ctx.save();
          for (let y = 0; y < this.briansBrain.height; y++) {
            for (let x = 0; x < this.briansBrain.width; x++) {
              const a = this.briansBrain.activityGrid[y][x] || 0;
              if (!a) continue;
              const t = a / maxA;
              const r = Math.floor(255 * t);
              const g = Math.floor(128 * (1 - t));
              const b = 0;
              const alpha = 0.35 * t;
              ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
              const drawX = this.offsetX + x * this.cellSize;
              const drawY = this.offsetY + y * this.cellSize;
              ctx.fillRect(drawX, drawY, this.cellSize, this.cellSize);
            }
          }
          ctx.restore();
        }
      }
    }
  }

  BB.Renderer = Renderer;
})();
