/*
 * Класс VisualModule — отвечает за визуализацию решётки клеточного автомата.
 * Использует HTML5 Canvas для рисования состояний ячеек.
 */
export class VisualModule {
  /*
   * @param {HTMLCanvasElement} canvas — целевой холст для отображения
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;

    // Масштабирование под плотность пикселей (ретина)
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = canvas.clientHeight || canvas.height;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cols = 0;
    this.cell = 0;
    this.offX = 0;
    this.offY = 0;
    this.clear();
  }

  /*
   * Устанавливает размер сетки и вычисляет размер ячейки.
   */
  setSize(cols) {
    this.cols = cols;
    const W = this.canvas.width / this.ctx.getTransform().a;
    const H = this.canvas.height / this.ctx.getTransform().d;
    this.cell = Math.floor(Math.min(W, H) / this.cols);
    const used = this.cell * this.cols;
    this.offX = Math.floor((W - used) / 2);
    this.offY = Math.floor((H - used) / 2);
  }

  /* Очищает холст, закрашивая фон цветом темы. */
  clear() {
    const panel = getComputedStyle(document.body).getPropertyValue("--panel");
    this.ctx.fillStyle = panel;
    const W = this.canvas.width / this.ctx.getTransform().a;
    const H = this.canvas.height / this.ctx.getTransform().d;
    this.ctx.fillRect(0, 0, W, H);
  }

  /*
   * Отрисовывает всю решётку.
   * @param {Array<Uint8Array>} grid — массив поколений автомата
   */
  drawFull(grid) {
    const isLight = document.body.classList.contains("light");
    const alive = isLight ? "#000000" : "#ffffff";
    const dead = isLight ? "#ffffff" : "#000000";

    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        this.ctx.fillStyle = row[x] ? alive : dead;
        const px = this.offX + x * this.cell;
        const py = this.offY + y * this.cell;
        this.ctx.fillRect(px, py, this.cell, this.cell);
      }
    }
  }
}
