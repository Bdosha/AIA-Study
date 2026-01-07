/*
 * Класс Core — вычислительное ядро элементарного клеточного автомата (ЭКлА).
 * Реализует правила Вольфрама, хранение текущего и следующего состояний решётки,
 * обновление поколений и выбор центральной ячейки.
 */
export class Core {
  /*
   * @param {number} size — длина решётки
   * @param {number} rule — номер правила Вольфрама (0–255)
   */
  constructor(size = 100, rule = 30) {
    this.setRule(rule);
    this.resize(size);
  }

  /*
   * Устанавливает правило Вольфрама и формирует таблицу переходов.
   */
  setRule(rule) {
    this.rule = rule & 255;
    this.lookup = new Uint8Array(8);
    for (let i = 0; i < 8; i++) this.lookup[i] = (this.rule >> i) & 1;
  }

  /*
   * Изменяет размер решётки и сбрасывает состояние.
   */
  resize(size) {
    this.size = size;
    this.current = new Uint8Array(size);
    this.next = new Uint8Array(size);
    this.setSingleCenter();
  }

  /* Устанавливает единственную активную ячейку в центре. */
  setSingleCenter() {
    this.current.fill(0);
    this.current[Math.floor(this.size / 2)] = 1;
  }

  /* Случайная инициализация решётки. */
  randomize() {
    for (let i = 0; i < this.size; i++)
      this.current[i] = Math.random() < 0.5 ? 0 : 1;
  }

  /*
   * Выполняет один шаг эволюции автомата.
   * Применяется правило Вольфрама к каждому триплету соседей.
   */
  step() {
    const N = this.size;
    for (let i = 0; i < N; i++) {
      const l = this.current[(i - 1 + N) % N];
      const c = this.current[i];
      const r = this.current[(i + 1) % N];
      const idx = (l << 2) | (c << 1) | r;
      this.next[i] = this.lookup[idx];
    }
    // обмен буферов
    [this.current, this.next] = [this.next, this.current];
  }

  /* Возвращает значение центральной ячейки. */
  sampleCenter() {
    return this.current[Math.floor(this.size / 2)];
  }
}
