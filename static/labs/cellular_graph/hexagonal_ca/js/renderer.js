/* =====================================
 * Canvas renderer (device-pixel exact)
 * - Pointy-top hexes
 * - Odd-r offset grid
 * - Zoom/pan, brush/eraser
 * - ResizeObserver for container-driven layout
 * - All math in DEVICE PIXELS (no CSS transforms)
 * ===================================== */
export class Renderer {
  constructor(canvas, grid) {
    this.c   = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.g   = grid;

    const dpr = window.devicePixelRatio || 1;

    // World params in DEVICE PIXELS
    this.scale = 14 * dpr;  // hex "radius"
    this.ox    = 20 * dpr;  // world origin X
    this.oy    = 20 * dpr;  // world origin Y

    this.tool = 'brush';
    this.brushRadius = 0;

    this._bindPointer();
    this._setupResizeObserver();

    // do two staged resizes to avoid first-layout race
    requestAnimationFrame(() => {
      this._resize();
      requestAnimationFrame(() => {
        this._resize(); // catches late CSS/layout adjustments
        this.draw();
      });
    });
  }

  /* ---------- public API ---------- */
  setTool(t){ this.tool = t; }
  // UI value n (1..5) -> radius (0..4)
  setBrushSize(n){ this.brushRadius = Math.max(0, (n|0) - 1); }

  centerOnGrid(){
    const s = this.scale;
    const wpx = Math.sqrt(3) * s * (this.g.w + 0.5);
    const hpx = (1.5 * (this.g.h - 1) + 2) * s;
    this.ox = (this.c.width  - wpx) / 2;
    this.oy = (this.c.height - hpx) / 2;
    this.draw();
  }

  /* ---------- pointer/zoom/pan ---------- */
  _bindPointer(){
    // zoom around mouse point
    this.c.addEventListener('wheel', (e) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.c.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top)  * dpr;

      const sgn = e.deltaY > 0 ? 0.9 : 1.1;
      const prev = this.scale;
      this.scale = clamp(this.scale * sgn, 6*dpr, 64*dpr);

      // keep zoom anchored at cursor
      this.ox = mx - (mx - this.ox) * (this.scale / prev);
      this.oy = my - (my - this.oy) * (this.scale / prev);

      this.draw();
      e.preventDefault();
    }, { passive: false });

    // pan: MMB or Shift+LMB
    this.c.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        const dpr = window.devicePixelRatio || 1;
        this._panning = true;
        this._px = e.clientX * dpr;
        this._py = e.clientY * dpr;
        e.preventDefault();
        return;
      }
      this._painting = true;
      this._paintFromEvent(e);
      e.preventDefault();
    });

    addEventListener('mouseup', () => { this._panning = false; this._painting = false; });

    addEventListener('mousemove', (e) => {
      if (this._panning) {
        const dpr = window.devicePixelRatio || 1;
        const nx = e.clientX * dpr, ny = e.clientY * dpr;
        this.ox += nx - this._px;
        this.oy += ny - this._py;
        this._px = nx; this._py = ny;
        this.draw();
      } else if (this._painting) {
        this._paintFromEvent(e);
      }
    });

    this.c.addEventListener('contextmenu', (e)=>e.preventDefault());
  }

  _paintFromEvent(e){
    const dpr = window.devicePixelRatio || 1;
    const rect = this.c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top)  * dpr;
    const [q0, r0] = this.pixelToCell(x, y);
    this.paint(q0, r0);
  }

  paint(q0, r0){
    const g = this.g;
    const R = this.brushRadius;
    for (let dr = -R; dr <= R; dr++) {
      for (let dq = -R; dq <= R; dq++) {
        const q = q0 + dq, r = r0 + dr;
        if (this.hexDistance(q0, r0, q, r) <= R) {
          if (!g.inBounds(q, r)) continue;
          g.set(q, r, this.tool === 'brush' ? 1 : 0);
        }
      }
    }
    this.draw();
  }

  /* ---------- sizing ---------- */
  _setupResizeObserver(){
    const ro = new ResizeObserver(() => this._resize());
    // observe the canvas element (or switch to its parent if you prefer)
    ro.observe(this.c);
    this._ro = ro;

    // DPR changes (OS zoom / monitor move) also force resize
    addEventListener('resize', () => this._resize(), { passive:true });
  }

  _resize(){
    const dpr  = window.devicePixelRatio || 1;
    const rect = this.c.getBoundingClientRect();

    // internal buffer: device pixels
    const w = Math.max(1, Math.round(rect.width  * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));

    if (w !== this.c.width || h !== this.c.height) {
      this.c.width  = w;
      this.c.height = h;
    }

    // we draw in device pixels: reset transform
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- transforms ---------- */
  // cell -> pixel (odd-r, pointy-top)
  axialToPixel(q, r){
    const s = this.scale;
    const x = s * (Math.sqrt(3) * (q + ((r & 1) ? 0.5 : 0))) + this.ox;
    const y = s * (1.5 * r) + this.oy;
    return [x, y];
  }

  // pixel (device px) -> nearest cell (odd-r)
  pixelToCell(x, y){
    const s = this.scale;
    const q_ax = (Math.sqrt(3)/3 * (x - this.ox) / s) - (1/3) * (y - this.oy) / s;
    const r_ax = (2/3) * (y - this.oy) / s;

    let cx = q_ax, cz = r_ax, cy = -cx - cz;
    [cx, cy, cz] = cube_round(cx, cy, cz);

    const row = cz;
    const col = cx + ((row - (row & 1)) >> 1);
    return [col|0, row|0];
  }

  /* ---------- draw ---------- */
  draw(){
    const ctx = this.ctx;

    // clear in device px
    ctx.clearRect(0, 0, this.c.width, this.c.height);

    const cs = getComputedStyle(document.documentElement);
    const gridCol  = cs.getPropertyValue('--border')?.trim() || '#2a3040';
    const aliveCol = cs.getPropertyValue('--accent')?.trim() || '#4f8cff';

    ctx.lineWidth = Math.max(1, Math.round((window.devicePixelRatio||1)));
    ctx.strokeStyle = gridCol;

    const s = this.scale * 0.96; // slight inset

    for (let r = 0; r < this.g.h; r++) {
      for (let q = 0; q < this.g.w; q++) {
        const [x, y] = this.axialToPixel(q, r);
        this.hex(x, y, s);
        ctx.stroke();
        if (this.g.get(q, r)) {
          ctx.fillStyle = aliveCol;
          ctx.fill();
        }
      }
    }
  }

  // pointy-top hex outline: start at -30° (−π/6), step 60°
  hex(x, y, s){
    const ctx = this.ctx;
    const ang = (k)=> -Math.PI/6 + k*Math.PI/3;
    ctx.beginPath();
    for (let i=0;i<6;i++){
      const px = x + s*Math.cos(ang(i));
      const py = y + s*Math.sin(ang(i));
      if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }

  /* ---------- metrics ---------- */
  hexDistance(q1, r1, q2, r2){
    const [x1, y1, z1] = oddr_to_cube(q1, r1);
    const [x2, y2, z2] = oddr_to_cube(q2, r2);
    return Math.max(Math.abs(x1-x2), Math.abs(y1-y2), Math.abs(z1-z2));
  }
}

/* ---------- helpers ---------- */
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

function oddr_to_cube(q,r){
  const x = q - ((r - (r & 1)) >> 1);
  const z = r;
  const y = -x - z;
  return [x,y,z];
}

function cube_round(x,y,z){
  let rx=Math.round(x), ry=Math.round(y), rz=Math.round(z);
  const x_diff=Math.abs(rx-x), y_diff=Math.abs(ry-y), z_diff=Math.abs(rz-z);
  if (x_diff>y_diff && x_diff>z_diff) rx = -ry - rz;
  else if (y_diff>z_diff)            ry = -rx - rz;
  else                               rz = -rx - ry;
  return [rx,ry,rz];
}
