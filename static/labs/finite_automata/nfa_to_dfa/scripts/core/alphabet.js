/* Алфавит: хранение и ввод из CSV */
export class Alphabet {
  constructor(symbols = []) {
    this.symbols = new Set(symbols.map(s => String(s)));
  }
  setFromCsv(csv) {
    const parts = csv.split(",").map(s => s.trim()).filter(Boolean);
    this.symbols = new Set(parts);
  }
  has(sym) { return this.symbols.has(sym); }
  toArray() { return [...this.symbols]; }
}