// Движок симуляции — Итерация 4
/**
 * Класс симуляции клеточного автомата на основе двойного буфера.
 * Отвечает за шаги, запуск/остановку, ограничение FPS и накопление времени.
 */
export class Sim {
  /**
   * @param {import('./grid-tri').TriGrid} grid – решётка треугольников
   */
  constructor(grid) {
    this.grid = grid;
    this.cur = new Uint8Array(grid.size);
    this.next = new Uint8Array(grid.size);
    this.stepCount = 0;
    this.running = false;
    this.fps = 30;
    this._rafId = null;
    this._lastTS = 0;
    this._accum = 0;
    this._elapsed = 0; // накопленное время в мс
  }

  /**
   * Устанавливает внешний буфер текущего состояния.
   * @param {Uint8Array} buffer – массив 0/1 длиной grid.size
   */
  setBuffer(buffer) {
    this.cur.set(buffer);
  }

  /** Подсчёт живых соседей для индекса и ядра */
  _aliveNeighbors(idx, kernel) {
    let n = 0;
    const nbrs = this.grid.neighbors(idx, kernel);
    for (let i = 0; i < nbrs.length; i++) n += this.cur[nbrs[i]];
    return n;
  }

  /** Один шаг симуляции по правилу. Возвращает изменившиеся индексы и статистику. */
  /**
   * Выполняет один шаг симуляции.
   * @param {{next(alive:number, n:number): boolean}} rule – правило перехода
   * @param {'edge-3'|'moore-12'} kernel – тип соседства
   * @param {boolean} [collectDirty=false] – собирать ли изменившиеся индексы
   * @returns {{ dirty:number[]|null, births:number, deaths:number, liveAfter:number }}
   */
  step(rule, kernel, collectDirty = false) {
    const size = this.grid.size;
    let dirty = collectDirty ? [] : null;
    let births = 0, deaths = 0, liveAfter = 0;
    for (let i = 0; i < size; i++) {
      const wasAlive = this.cur[i] === 1;
      const n = this._aliveNeighbors(i, kernel);
      const willAlive = rule.next(wasAlive, n) ? 1 : 0;
      this.next[i] = willAlive;
      if (willAlive) liveAfter++;
      if (collectDirty && willAlive !== (wasAlive ? 1 : 0)) dirty.push(i);
      if (willAlive && !wasAlive) births++;
      else if (!willAlive && wasAlive) deaths++;
    }
    // swap
    const tmp = this.cur; this.cur = this.next; this.next = tmp;
    this.stepCount++;
    return { dirty, births, deaths, liveAfter };
  }

  /**
   * Запускает анимационный цикл с ограничением FPS.
   * onAfterStep вызывается после каждого фактического шага.
   * @param {{next(alive:number, n:number): boolean}} rule
   * @param {'edge-3'|'moore-12'} kernel
  * @param {(cur:Uint8Array, steps:number, dt:number, dirty:number[], stats:{births:number,deaths:number,liveAfter:number})=>void} [onAfterStep]
   */
  run(rule, kernel, onAfterStep) {
    if (this.running) return;
    this.running = true;
    const frame = (ts) => {
      if (!this.running) return;
      if (!this._lastTS) this._lastTS = ts;
      const dt = ts - this._lastTS; this._lastTS = ts;
      this._accum += dt;
      this._elapsed += dt;
      const interval = 1000 / (this.fps || 30);
      let stepsThisFrame = 0;
  while (this._accum >= interval && stepsThisFrame < 3) {
        this._accum -= interval;
  const res = this.step(rule, kernel, true);
  onAfterStep?.(this.cur, this.stepCount, dt, res.dirty, { births: res.births, deaths: res.deaths, liveAfter: res.liveAfter });
        stepsThisFrame++;
      }
      this._rafId = requestAnimationFrame(frame);
    };
    this._rafId = requestAnimationFrame(frame);
  }

  /** Останавливает симуляцию и сбрасывает таймеры кадра. */
  stop() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._lastTS = 0; this._accum = 0;
  }

  /** Полный сброс: очищает буферы, шаги и счётчик времени. */
  reset() {
    this.stop();
    this.cur.fill(0);
    this.next.fill(0);
    this.stepCount = 0;
    this._elapsed = 0;
  }

  /** Возвращает накопленное «стеночное» время работы в миллисекундах. */
  getElapsedMS() {
    return Math.round(this._elapsed);
  }
}
