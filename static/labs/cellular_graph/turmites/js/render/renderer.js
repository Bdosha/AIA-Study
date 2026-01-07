/**
 * Renderer — отвечает за то, как логическое поле (в клетках)
 * отображается на canvas (в пикселях CSS / device).
 *
 * Ключевые идеи:
 *  - integer-scale: целочисленный масштаб (CSS-пикселей на клетку) => чёткая картинка без муара.
 *  - центрирование: считаем отступы offsetX/offsetY (letterboxing) для ровного центрирования.
 *  - dpr-коррекция: учитываем devicePixelRatio при установке canvas.width/height и setTransform.
 *  - сетка (grid overlay): рендерим не на canvas, а CSS-фоном поверх, обновляя step/offset.
 *  - система координат: 1 canvas-юнит = 1 клетка (после setTransform(k, 0, 0, k, tx, ty)).
 */
export class Renderer{
  /**
   * @param {HTMLCanvasElement} canvas целевой canvas
   */
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Логические размеры поля (в клетках)
    this.gridW = 1;
    this.gridH = 1;

    // Параметры преобразования
    this.scale = 1;   // CSS-пикселей на клетку (целое)
    this.offsetX = 0; // отступы для центрирования (CSS px)
    this.offsetY = 0;
    this.dpr = window.devicePixelRatio || 1;

    // CSS-слой сетки
    this.gridEl = null;
    this.showGrid = false;
  }

  /** Привязать overlay-элемент для CSS-сетки */
  attachGridOverlay(el){
    this.gridEl = el || null;
    this.updateGridOverlay();
  }

  /**
   * Сообщить новые логические размеры (в клетках).
   * @param {number} w
   * @param {number} h
   */
  resizeToGrid(w,h){
    this.gridW = Math.max(1, w|0);
    this.gridH = Math.max(1, h|0);
    this.updateViewportMetrics();
  }

  /**
   * Пересчитать связку (CSS-px → device-px), integer-scale, отступы и dpr.
   * Меняем canvas.width/height только при фактическом изменении реальных размеров —
   * это снижает риск «чёрных кадров» при ресайзе.
   */
  updateViewportMetrics(){
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clientW = Math.max(1, Math.floor(rect.width));
    const clientH = Math.max(1, Math.floor(rect.height));

    // Физический размер канваса в device-пикселях
    const needW = Math.max(1, Math.round(clientW * dpr));
    const needH = Math.max(1, Math.round(clientH * dpr));
    if (this.canvas.width !== needW || this.canvas.height !== needH){
      this.canvas.width = needW;
      this.canvas.height = needH;
    }

    // Целочисленный масштаб (CSS-px/клетку)
    const scaleCss = Math.max(1, Math.floor(Math.min(clientW / this.gridW, clientH / this.gridH)));
    this.scale = scaleCss;

    // Отступы для центрирования (в CSS-px)
    this.offsetX = Math.floor((clientW - this.gridW * this.scale) / 2);
    this.offsetY = Math.floor((clientH - this.gridH * this.scale) / 2);
    this.dpr = dpr;
  }

  /**
   * Перевод координат мыши (clientX/Y) в координаты клетки (x,y).
   * Возвращает null, если клик вне поля.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x:number,y:number}|null}
   */
  clientToCell(clientX, clientY){
    this.updateViewportMetrics();
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const gx = Math.floor((localX - this.offsetX) / this.scale);
    const gy = Math.floor((localY - this.offsetY) / this.scale);
    if (gx < 0 || gy < 0 || gx >= this.gridW || gy >= this.gridH) return null;
    return { x: gx, y: gy };
  }

  /**
   * Синхронизация CSS-сетки: шаг/позиция/видимость.
   * Скрываем сетку при слишком мелком шаге (<3px) — иначе будет муар.
   */
  updateGridOverlay(){
    if(!this.gridEl) return;
    const step = Math.max(1, Math.round(this.scale));
    if(!this.showGrid || step < 3){
      this.gridEl.style.opacity = '0';
      return;
    }
    this.gridEl.style.backgroundSize = `${step}px ${step}px`;
    this.gridEl.style.backgroundPosition = `${this.offsetX}px ${this.offsetY}px`;
    this.gridEl.style.opacity = '1';
  }

  /**
   * Основной рендер: сначала фон, затем клетки, затем иконки муравьёв.
   * Сетка обновляется отдельным слоем CSS-background.
   * @param {{grid:{width:number,height:number,cells:Uint8Array}, ants:Array<{x:number,y:number,dir:number,color:string}>}} snap
   */
  draw(snap){
    this.updateViewportMetrics();

    const { grid, ants } = snap;
    const { width, height, cells } = grid;
    const c = this.ctx;

    // Палитра из CSS-переменных
    const css = getComputedStyle(document.body);
    const color0 = css.getPropertyValue('--cell0').trim() || '#000000';
    const color1 = css.getPropertyValue('--cell1').trim() || '#ffffff';
    const color2 = css.getPropertyValue('--cell2').trim() || '#66aaff';
    const color3 = css.getPropertyValue('--cell3').trim() || '#a879ff';

    // Сброс трансформа и заливка фона под весь canvas (в device-px)
    c.setTransform(1,0,0,1,0,0);
    c.fillStyle = color0;
    c.fillRect(0,0,this.canvas.width,this.canvas.height);
    c.imageSmoothingEnabled = false;

    // Переход в систему координат «1 юнит = 1 клетка»
    const k = this.scale * this.dpr;
    const tx = this.offsetX * this.dpr;
    const ty = this.offsetY * this.dpr;
    c.setTransform(k, 0, 0, k, tx, ty);

    // Рисуем только ненулевые клетки (0 — фон)
    for(let y=0;y<height;y++){
      const rowOff = y*width;
      for(let x=0;x<width;x++){
        const s = cells[rowOff + x];
        if(s === 0) continue;
        c.fillStyle = (s===1)?color1:(s===2)?color2:color3;
        c.fillRect(x, y, 1, 1);
      }
    }

    // Иконки муравьёв (в координатах клеток)
    for(const a of ants){
      this.drawAntIcon(a.x, a.y, 1, a.color || '#ffcc00', a.dir|0);
    }

    // Обновляем CSS-сетку поверх
    this.updateGridOverlay();
  }

  /**
   * Простая векторная «иконка муравья», ориентируемая по dir.
   * @param {number} gridX
   * @param {number} gridY
   * @param {number} size размер в клетках (обычно 1)
   * @param {string} color цвет
   * @param {number} dir 0..3 (0=↑)
   */
  drawAntIcon(gridX, gridY, size, color, dir){
    const c = this.ctx;
    const cx = gridX + size/2;
    const cy = gridY + size/2;
    const body = size*0.36;
    const head = size*0.20;

    c.save();
    c.translate(cx, cy);
    c.rotate((Math.PI/2) * dir); // 0=↑, 1=→, 2=↓, 3=←

    c.lineWidth = Math.max(0.02, size*0.08);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.fillStyle = color;

    // три овала (брюшко, грудь, голова)
    c.beginPath(); c.ellipse(0, size*0.08, body*0.9, body*0.7, 0, 0, Math.PI*2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -body*0.2, body*0.6, body*0.5, 0, 0, Math.PI*2); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -(body*0.6), head, 0, Math.PI*2); c.fill(); c.stroke();

    // усы
    c.beginPath();
    c.moveTo( head*0.6, -(body*0.6 + head*0.5)); c.lineTo( head*1.4, -(body*0.9 + head*0.9));
    c.moveTo(-head*0.6, -(body*0.6 + head*0.5)); c.lineTo(-head*1.4, -(body*0.9 + head*0.9));
    c.stroke();

    // лапки
    const y0 = 0;
    for(const dy of [-0.15, 0.05, 0.25]){
      c.beginPath(); c.moveTo(0, y0 + dy*size); c.lineTo( body*0.9, y0 + (dy+0.05)*size ); c.stroke();
      c.beginPath(); c.moveTo(0, y0 + dy*size); c.lineTo(-body*0.9, y0 + (dy+0.05)*size ); c.stroke();
    }
    c.restore();
  }
}
