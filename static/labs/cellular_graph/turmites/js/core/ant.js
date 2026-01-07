/**
 * Ant — агент-«муравей» на тороидальном поле.
 * Направление кодируется так: 0=↑, 1=→, 2=↓, 3=←.
 * Один шаг:
 *   - читает цвет клетки s,
 *   - выбирает действие act по правилу,
 *   - поворачивается (или нет) и перекрашивает клетку,
 *   - шагает на одну клетку вперёд в текущем направлении,
 *   - тороидальные границы: выход слева → вход справа и т.п.
 */
export class Ant{
  /**
   * @param {number} x Абсцисса клетки.
   * @param {number} y Ордината клетки.
   * @param {number} dir Начальное направление (0..3).
   * @param {string} color Цвет для визуализации (скин).
   */
  constructor(x, y, dir=0, color='#ffcc00'){
    this.x = x|0;
    this.y = y|0;
    this.dir = ((dir|0) % 4 + 4) % 4; // нормализация в диапазон 0..3
    this.color = color;
  }

  /**
   * Выполнить один шаг по полю.
   * @param {{width:number,height:number,get(x:number,y:number):number,set(x:number,y:number,v:number):void}} grid
   *   Поле клеток: get/set и размеры (ожидается 0..n-1).
   * @param {{states:number, actionForState(s:number):('L'|'R'|'F'|'U'), turnDeltaFor(action:string):number}} rules
   *   Экземпляр RuleSet.
   */
  step(grid, rules){
    // 1) читаем цвет клетки
    const s = grid.get(this.x, this.y); // 0..n-1

    // 2) действие по правилу
    const act = rules.actionForState(s);  // 'L','R','F','U'
    const d = rules.turnDeltaFor(act);    // -1,+1,0,+2
    this.dir = (this.dir + d + 4) & 3;    // новое направление

    // 3) перекраска клетки в следующий цвет (циклично)
    const next = (s + 1) % rules.states;
    grid.set(this.x, this.y, next);

    // 4) шаг вперёд
    const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
    const [dx, dy] = dirs[this.dir];

    // Тороидальные границы
    this.x = (this.x + dx + grid.width)  % grid.width;
    this.y = (this.y + dy + grid.height) % grid.height;
  }
}
