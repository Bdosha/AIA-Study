// Аналитика: сбор статистики по шагам, экспорт CSV
export class Analytics {
  constructor(total) {
    this.reset(total);
  }
  reset(total) {
    this.step = 0;
    this.total = total;
    this.liveNow = 0;
    this.bornCum = 0;
    this.diedCum = 0;
    this.rows = []; // [{step,bornCum,diedCum,bornStep,diedStep,liveNow}]
  }
  onResizeOrImport(total, liveNow = 0) {
    this.reset(total);
    this.liveNow = liveNow;
  }
  onToggleCell(deltaLive) {
    this.liveNow += deltaLive;
    if (this.liveNow < 0) this.liveNow = 0;
    if (this.liveNow > this.total) this.liveNow = this.total;
  }
  onStep({ births, deaths, liveAfter }) {
    this.step += 1;
    this.bornCum += births;
    this.diedCum += deaths;
    this.liveNow = liveAfter;
    this.rows.push({
      step: this.step,
      bornCum: this.bornCum,
      diedCum: this.diedCum,
      bornStep: births,
      diedStep: deaths,
      liveNow: this.liveNow,
    });
  }
  getSnapshot() {
    return {
      step: this.step,
      liveNow: this.liveNow,
      deadNow: this.total - this.liveNow,
      total: this.total,
    };
  }
  getLastRows(limit = 2000) {
    if (this.rows.length <= limit) return this.rows;
    return this.rows.slice(this.rows.length - limit);
  }
  toCSV(delim = ';') {
    const header = ['step','liveNow','bornStep','diedStep','bornCum','diedCum'].join(delim);
    const lines = [header];
    for (const r of this.rows) {
      lines.push([r.step, r.liveNow, r.bornStep, r.diedStep, r.bornCum, r.diedCum].join(delim));
    }
    return lines.join('\r\n');
  }
}
