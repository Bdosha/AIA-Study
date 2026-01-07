/**
 * RuleSet — описание алфавита действий и правила турмита.
 * Поддерживаемые действия (Σ): L — Left, R — Right, F — Forward, U — U-turn (180°).
 * Правило задаётся строкой из символов Σ длины n = |S| (число цветов клеток).
 *
 * Модель шага (для справки):
 *   1) читаем состояние клетки s (0..n-1),
 *   2) берём action = rule[s],
 *   3) поворачиваем муравья согласно action,
 *   4) перекрашиваем клетку в (s+1 mod n),
 *   5) муравей шагает вперёд на одну клетку (в новом направлении).
 */
export class RuleSet {
  /**
   * @param {string} ruleString Строка из символов L/R/F/U (например: "RL", "RLF", "RLUF").
   */
  constructor(ruleString='RL'){
    this.setRule(ruleString);
  }

  /**
   * Установить/очистить строку правила.
   * Недопустимые символы отбрасываются, пустое правило заменяется на "RL".
   * @param {string} str
   */
  setRule(str){
    const clean = (str || 'RL').toUpperCase().replace(/[^LRFU]/g, '');
    this.ruleString = clean.length ? clean : 'RL';
    this.states = this.ruleString.length; // |S| — число цветов поля
  }

  /** @returns {string[]} Алфавит действий Σ. */
  get actionAlphabet(){ return ['L','R','F','U']; }

  /**
   * Символ действия для данного состояния клетки s (0..n-1).
   * @param {number} s
   * @returns {'L'|'R'|'F'|'U'}
   */
  actionForState(s){
    const i = (s % this.states + this.states) % this.states;
    return /** @type {'L'|'R'|'F'|'U'} */(this.ruleString[i]);
  }

  /**
   * Поворот как приращение направления (0=↑,1=→,2=↓,3=←).
   * L → -1; R → +1; U → +2; F → 0 (без поворота).
   * @param {'L'|'R'|'F'|'U'} action
   * @returns {number} Δнаправления
   */
  turnDeltaFor(action){
    switch(action){
      case 'L': return -1;
      case 'R': return +1;
      case 'U': return +2;
      case 'F': return 0;
      default:  return 0;
    }
  }
}
