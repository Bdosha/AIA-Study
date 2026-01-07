/* Заготовка «ленты» чтения (не используется в текущем UI) */
export class TapeView {
  constructor(inputEl) { this.inputEl = inputEl; this.word = ""; this.pos = 0; }
  setWord(w) { this.word = w ?? ""; this.pos = 0; }
  step() { if (this.pos < this.word.length) this.pos++; }
}