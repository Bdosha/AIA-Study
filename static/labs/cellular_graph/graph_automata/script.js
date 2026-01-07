// Простая реализация динамического графового автомата. 
// Здесь объединены классы Graph, Rules, Simulation, Analytics, Renderer и App.

class Graph {
  constructor() {
      this.vertices = [];
      this.edges = []; // format: {u, v}
  }
  reset() {
      this.vertices = [];
      this.edges = [];
  }
  addVertex() {
      const v = { id: this.vertices.length, state: 0 };
      this.vertices.push(v);
      return v;
  }
  addEdge(u, v) {
      if (!this.hasEdge(u, v)) this.edges.push({ u, v });
  }
  removeEdge(u, v) {
      this.edges = this.edges.filter(e => !(e.u === u && e.v === v) && !(e.u === v && e.v === u));
  }
  hasEdge(u, v) {
      return this.edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  }
  neighbors(v) {
      const id = v.id;
      const neighbors = [];
      for (const e of this.edges) {
          if (e.u === id) neighbors.push(this.vertices[e.v]);
          else if (e.v === id) neighbors.push(this.vertices[e.u]);
      }
      return neighbors;
  }
  degree(v) {
      return this.neighbors(v).length;
  }
  randomGraph(n, density) {
      this.reset();
      for (let i = 0; i < n; i++) this.addVertex();
      for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
              if (Math.random() < density) this.addEdge(i, j);
          }
      }
  }
  gridGraph(n) {
      this.reset();
      // n = sqrt(?). Можно сложнее, но тут возьмём ближний квадрат.
      const side = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) this.addVertex();
      const idx = (r, c) => r * side + c;
      for (let r = 0; r < side; r++) {
          for (let c = 0; c < side; c++) {
              const u = idx(r, c);
              if (u >= n) continue;
              if (c + 1 < side && idx(r, c + 1) < n) this.addEdge(u, idx(r, c + 1));
              if (r + 1 < side && idx(r + 1, c) < n) this.addEdge(u, idx(r + 1, c));
          }
      }
  }
}

class DSL {
  // Расширенный парсер DSL: поддержка COUNT(state=x), DEGREE, EDGE(u,v), state, state(u), state(v),
  // логические операторы AND/OR/NOT и сравнения (=, ==, !=, <, >, <=, >=).
  static tokenize(str) {
      return str
        .replace(/(==|!=|<=|>=|[()=<>!,])/g, ' $1 ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(t => t.length > 0)
        .map(t => {
          const upper = t.toUpperCase();
          if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
            return upper;
          }
          return t;
        });
  }
  // Recursive descent parser returning an AST
  static parseCondition(tokens) {
      let i = 0;
      const peek = () => tokens[i];
      const pop = () => tokens[i++];
      // Parse primary units: numbers, count, degree, state, edge, parenthesis
      function primary() {
          const t = peek();
          if (t === '(') {
              pop();
              const e = expr();
              pop(); // ')'
              return e;
          }
          // COUNT ( STATE = n )
          if (t && t.toUpperCase() === 'COUNT') {
              pop(); // 'COUNT'
              // Expect '('
              if (peek() === '(') pop();
              // Expect 'STATE'
              const ident = peek();
              if (ident && ident.toUpperCase() === 'STATE') pop();
              // Expect '='
              if (peek() === '=') pop();
              // Expect number
              const numTok = pop();
              const num = parseInt(numTok, 10);
              // Expect ')'
              if (peek() === ')') pop();
              return { type: 'Count', value: num };
          }
          // DEGREE
          if (t && t.toUpperCase() === 'DEGREE') {
              pop();
              return { type: 'Degree' };
          }
          // EDGE or EDGE(u,v)
          if (t && t.toUpperCase() === 'EDGE') {
              pop(); // 'EDGE'
              // Skip optional ( u , v )
              if (peek() === '(') {
                  pop(); // '('
                  // skip tokens until ')'
                  while (peek() && peek() !== ')') pop();
                  if (peek() === ')') pop();
              }
              return { type: 'Edge' };
          }
          // STATE or STATE(u) / STATE(v)
          if (t && t.toUpperCase() === 'STATE') {
              pop(); // 'STATE'
              if (peek() === '(') {
                  pop(); // '(';
                  const targetTok = pop(); // 'U' or 'V'
                  const target = targetTok ? targetTok.toLowerCase() : 'self';
                  if (peek() === ')') pop();
                  return { type: 'State', target };
              }
              return { type: 'State', target: 'self' };
          }
          // Numeric literal
          if (/^\d+$/.test(t)) {
              pop();
              return { type: 'Number', value: parseInt(t, 10) };
          }
          throw new Error('Unexpected token: ' + t);
      }
      // Parse NOT prefix and comparisons
      function notExpr() {
          if (peek() === 'NOT') {
              pop();
              return { type: 'Not', expr: notExpr() };
          }
          return cmpExpr();
      }
      function cmpExpr() {
          let left = primary();
          const op = peek();
          if (op === '=' || op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>=') {
              pop();
              const right = primary();
              return { type: 'Comparison', op: op === '=' ? '==' : op, left, right };
          }
          return left;
      }
      // Parse AND
      function andExpr() {
          let node = notExpr();
          while (peek() === 'AND') {
              pop();
              node = { type: 'Logical', op: 'AND', left: node, right: notExpr() };
          }
          return node;
      }
      // Parse OR
      function expr() {
          let node = andExpr();
          while (peek() === 'OR') {
              pop();
              node = { type: 'Logical', op: 'OR', left: node, right: andExpr() };
          }
          return node;
      }
      return expr();
  }
  // Evaluate an AST in a given context and graph. Context may contain:
  // stateSelf, stateU, stateV, neighborCounts, degree, edge (boolean).
  static evalCond(node, context) {
      switch (node.type) {
          case 'Logical': {
              const left = DSL.evalCond(node.left, context);
              const right = DSL.evalCond(node.right, context);
              if (node.op === 'AND') return Boolean(left) && Boolean(right);
              if (node.op === 'OR') return Boolean(left) || Boolean(right);
              return false;
          }
          case 'Not':
              return !DSL.evalCond(node.expr, context);
          case 'Comparison': {
              const leftVal = DSL.evalCond(node.left, context);
              const rightVal = DSL.evalCond(node.right, context);
              const l = typeof leftVal === 'boolean' ? (leftVal ? 1 : 0) : leftVal;
              const r = typeof rightVal === 'boolean' ? (rightVal ? 1 : 0) : rightVal;
              switch (node.op) {
                  case '==': return l === r;
                  case '!=': return l !== r;
                  case '<': return l < r;
                  case '>': return l > r;
                  case '<=': return l <= r;
                  case '>=': return l >= r;
                  default: return false;
              }
          }
          case 'Number':
              return node.value;
          case 'State': {
              if (node.target === 'self') {
                  return context.stateSelf !== undefined ? context.stateSelf : 0;
              }
              if (node.target === 'u') {
                  return context.stateU !== undefined ? context.stateU : 0;
              }
              if (node.target === 'v') {
                  return context.stateV !== undefined ? context.stateV : 0;
              }
              return 0;
          }
          case 'Count': {
              const counts = context.neighborCounts || {};
              return counts[node.value] || 0;
          }
          case 'Degree':
              return context.degree !== undefined ? context.degree : 0;
          case 'Edge':
              return context.edge ? true : false;
          default:
              return false;
      }
  }
}

class RuleEngine {
  constructor() {
      this.stateRules = [];
      this.topologyRules = [];
  }
  /**
   * Parse state and topology DSL strings into executable rules.
   * Supports state rule actions of the form:
   *   new_state = N
   *   SET STATE TO N
   * and topology actions of the form:
   *   ADD EDGE(u,v)
   *   REMOVE EDGE(u,v)
   *   NEW VERTEX [STATE=N]
   */
  parseRules(stateText, topoText) {
      this.stateRules = [];
      this.topologyRules = [];
      const parseBlock = (text, section) => {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
          for (const line of lines) {
              const m = line.match(/^IF\s+(.+)\s+THEN\s+(.+)$/i);
              if (!m) continue;
              const condStr = m[1].trim();
              const actionStr = m[2].trim();
              const tokens = DSL.tokenize(condStr);
              let condTree;
              try {
                  condTree = DSL.parseCondition(tokens);
              } catch (err) {
                  // skip invalid conditions
                  continue;
              }
              if (section === 'state') {
                  // Normalise the action string by removing underscores and collapsing whitespace
                  const upper = actionStr.toUpperCase().replace(/_/g, '').replace(/\s+/g, '');
                  let match = upper.match(/^NEWSTATE=(\d+)$/);
                  if (!match) match = upper.match(/^SETSTATETO(\d+)$/);
                  if (match) {
                      const newState = parseInt(match[1], 10);
                      this.stateRules.push({ cond: condTree, newState });
                  }
              } else {
                  // Parse topology action type and optional new state
                  const upper = actionStr.toUpperCase().trim();
                  let actionType = null;
                  let newState = 0;
                  if (/^ADD\s+EDGE/.test(upper)) {
                      actionType = 'add_edge';
                  } else if (/^REMOVE\s+EDGE/.test(upper)) {
                      actionType = 'remove_edge';
                  } else if (/^NEW\s+VERTEX/.test(upper)) {
                      actionType = 'new_vertex';
                      const mns = upper.match(/STATE\s*=\s*(\d+)/);
                      if (mns) {
                          newState = parseInt(mns[1], 10);
                      }
                  }
                  if (actionType) {
                      this.topologyRules.push({ cond: condTree, actionType, newState });
                  }
              }
          }
      };
      parseBlock(stateText, 'state');
      parseBlock(topoText, 'topology');
  }
  nextState(v, graph) {
      const neighbors = graph.neighbors(v);
      const counts = {};
      for (const nb of neighbors) {
          counts[nb.state] = (counts[nb.state] || 0) + 1;
      }
      const context = {
          stateSelf: v.state,
          neighborCounts: counts,
          degree: neighbors.length
      };
      for (const rule of this.stateRules) {
          const match = DSL.evalCond(rule.cond, context);
          if (match) {
              return rule.newState;
          }
      }
      return v.state;
  }
  topologyChanges(graph) {
      // Collect a list of topology operations: add/remove edges and new vertices
      const ops = [];
      const vertices = graph.vertices;
      // First handle edge operations on unordered pairs
      for (const u of vertices) {
          for (const v of vertices) {
              if (u.id >= v.id) continue;
              const context = {
                  stateU: u.state,
                  stateV: v.state,
                  edge: graph.hasEdge(u.id, v.id)
              };
              for (const rule of this.topologyRules) {
                  if (rule.actionType === 'add_edge' || rule.actionType === 'remove_edge') {
                      try {
                          const match = DSL.evalCond(rule.cond, context);
                          if (match) {
                              ops.push({ type: rule.actionType, u: u.id, v: v.id });
                              break; // only first matching rule per pair
                          }
                      } catch (err) {
                          // ignore evaluation errors
                      }
                  }
              }
          }
      }
      // Then handle new vertex rules (evaluate once per rule)
      for (const rule of this.topologyRules) {
          if (rule.actionType === 'new_vertex') {
              // Use context with arbitrary vertex; if none, skip
              const vid = vertices.length > 0 ? vertices[0].id : null;
              const ctx = { vertex: vid };
              try {
                  const match = DSL.evalCond(rule.cond, ctx);
                  if (match) {
                      ops.push({ type: 'new_vertex', state: rule.newState });
                  }
              } catch (err) {
                  // ignore errors
              }
          }
      }
      return ops;
  }
}

class Simulation {
  constructor(graph, rules) {
      this.graph = graph;
      this.rules = rules;
      this.stepCount = 0;
      this.running = false;
      this.speed = 5; // steps per second
      this.timer = null;
  }
  setSpeed(val) {
      this.speed = val;
      if (this.running) {
          clearInterval(this.timer);
          this.timer = setInterval(() => this.step(), 1000 / this.speed);
      }
  }
  start() {
      if (!this.running) {
          this.running = true;
          this.timer = setInterval(() => this.step(), 1000 / this.speed);
      }
  }
  pause() {
      if (this.running) {
          clearInterval(this.timer);
          this.running = false;
      }
  }
  step() {
      // Собрать новый массив состояний
      const newStates = [];
      for (const v of this.graph.vertices) {
          newStates[v.id] = this.rules.nextState(v, this.graph);
      }
      // Применить топологические изменения
      const ops = this.rules.topologyChanges(this.graph);
      for (const op of ops) {
          if (op.type === 'add_edge') {
              if (!this.graph.hasEdge(op.u, op.v)) {
                  this.graph.addEdge(op.u, op.v);
              }
          } else if (op.type === 'remove_edge') {
              if (this.graph.hasEdge(op.u, op.v)) {
                  this.graph.removeEdge(op.u, op.v);
              }
          } else if (op.type === 'new_vertex') {
              const id = this.graph.addVertex(op.state || 0);
              // Optionally mark new vertex as changed
          }
      }
      // Обновить состояния
      for (const v of this.graph.vertices) {
          v.state = newStates[v.id];
      }
      this.stepCount++;
      App.instance.updateAll();
  }
  runBatch(n) {
      for (let i = 0; i < n; i++) this.step();
  }
}

class Analytics {
  constructor(graph) {
      this.graph = graph;
  }
  compute() {
      const vCount = this.graph.vertices.length;
      const eCount = this.graph.edges.length;
      // DFS для компоненты
      const visited = new Array(vCount).fill(false);
      let maxComp = 0;
      const dfs = (i) => {
          visited[i] = true;
          let size = 1;
          for (const nb of this.graph.neighbors(this.graph.vertices[i])) {
              if (!visited[nb.id]) size += dfs(nb.id);
          }
          return size;
      };
      for (let i = 0; i < vCount; i++) {
          if (!visited[i]) {
              const size = dfs(i);
              if (size > maxComp) maxComp = size;
          }
      }
      // Распределение степеней
      const degDist = {};
      for (const v of this.graph.vertices) {
          const d = this.graph.degree(v);
          degDist[d] = (degDist[d] || 0) + 1;
      }
      // Распределение состояний
      const stateDist = {};
      for (const v of this.graph.vertices) {
          stateDist[v.state] = (stateDist[v.state] || 0) + 1;
      }
      return { vCount, eCount, maxComp, degDist, stateDist };
  }
}

class Renderer {
  constructor(canvas, graph) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.graph = graph;
      this.positions = {};
      this.colors = [
          '#ff5555', // state 0
          '#55cc55', // state 1
          '#5555ff', // state 2
          '#ffaa00', // state 3
          '#cc55ff'  // state 4
      ];
  }
  setSize() {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
  }
  assignRandomPositions() {
      for (const v of this.graph.vertices) {
          this.positions[v.id] = {
              x: Math.random() * this.canvas.width * 0.9 + this.canvas.width * 0.05,
              y: Math.random() * this.canvas.height * 0.9 + this.canvas.height * 0.05,
          };
      }
  }
  draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Сначала рёбра
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      for (const e of this.graph.edges) {
          const u = this.positions[e.u];
          const v = this.positions[e.v];
          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.stroke();
      }
      // Теперь вершины
      for (const v of this.graph.vertices) {
          const pos = this.positions[v.id];
          ctx.beginPath();
          ctx.fillStyle = this.colors[v.state % this.colors.length];
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
      }
  }
}

class App {
  constructor() {
      this.graph = new Graph();
      this.rules = new RuleEngine();
      this.renderer = new Renderer(document.getElementById('graphCanvas'), this.graph);
      this.sim = new Simulation(this.graph, this.rules);
      this.analytics = new Analytics(this.graph);
      App.instance = this;
      this.bindEvents();
  }
  static get presets() {
      return {
          life: {
              // Правила для классической игры «Жизнь». Используем реальный перевод строки,
              // чтобы парсер правильно разбивал правила по строкам. Первая строка описывает
              // гибель клетки при одиночестве или перенаселении. Вторая строка – рождение
              // клетки при ровно трёх соседях.
              stateRules: `IF state = 1 AND (COUNT(state=1) < 2 OR COUNT(state=1) > 3) THEN new_state = 0
IF state = 0 AND COUNT(state=1) = 3 THEN new_state = 1`,
              topoRules: ``,
              init: () => {
                  // initialise vertices for life preset using App.instance
                  const vertices = App.instance.graph.vertices;
                  for (const v of vertices) {
                      v.state = Math.random() < 0.2 ? 1 : 0;
                  }
              }
          },
          predator: {
              // Модель «хищник–жертва». Несколько правил: хищники (state=2) и жертвы (state=1)
              // взаимодействуют, причём хищник умирает без пищи, а жертвы появляются при достатке
              // соседей. Используем реальные переводы строк.
              stateRules: `IF state = 1 AND COUNT(state=2) >= 1 THEN new_state = 0
IF state = 2 AND COUNT(state=1) = 0 THEN new_state = 0
IF state = 0 AND COUNT(state=1) >= 2 THEN new_state = 1
IF state = 2 AND COUNT(state=1) >= 2 THEN new_state = 2`,
              topoRules: `IF EDGE THEN REMOVE EDGE
IF NOT EDGE THEN ADD EDGE`,
              init: () => {
                  const vertices = App.instance.graph.vertices;
                  for (const v of vertices) {
                      const r = Math.random();
                      v.state = r < 0.3 ? 1 : (r < 0.45 ? 2 : 0);
                  }
              }
          },
          friendship: {
              // Социальная модель «дружба»: вершины склонны принимать мнение большинства
              // соседей. Плюс связи появляются между одинаковыми состояниями и исчезают
              // между различными.
              stateRules: `IF state = 0 AND COUNT(state=1) > COUNT(state=2) THEN new_state = 1
IF state = 0 AND COUNT(state=2) > COUNT(state=1) THEN new_state = 2
IF state = 1 AND COUNT(state=2) > 2 THEN new_state = 2
IF state = 2 AND COUNT(state=1) > 2 THEN new_state = 1`,
              topoRules: `IF NOT EDGE AND state(u)=state(v) THEN ADD EDGE
IF EDGE AND state(u)!=state(v) THEN REMOVE EDGE`,
              init: () => {
                  const vertices = App.instance.graph.vertices;
                  for (const v of vertices) {
                      v.state = Math.floor(Math.random() * 3);
                  }
              }
          },
          social: {
              // Модель социального влияния: более строгий порог для смены убеждения.
              stateRules: `IF state = 0 AND COUNT(state=1) > COUNT(state=2) THEN new_state = 1
IF state = 0 AND COUNT(state=2) > COUNT(state=1) THEN new_state = 2
IF state = 1 AND COUNT(state=2) > 3 THEN new_state = 2
IF state = 2 AND COUNT(state=1) > 3 THEN new_state = 1`,
              topoRules: `IF NOT EDGE AND state(u)=state(v) THEN ADD EDGE
IF EDGE AND state(u)!=state(v) THEN REMOVE EDGE`,
              init: () => {
                  const vertices = App.instance.graph.vertices;
                  for (const v of vertices) {
                      v.state = Math.floor(Math.random() * 3);
                  }
              }
          },
          neural: {
              // Нейронный рост: активные нейроны соединяются, неактивные теряют связи.
              stateRules: `IF state = 0 AND COUNT(state=1) >= 3 THEN new_state = 1
IF state = 1 AND COUNT(state=1) < 1 THEN new_state = 0`,
              topoRules: `IF NOT EDGE AND state(u)=1 AND state(v)=1 THEN ADD EDGE
IF EDGE AND state(u)=0 AND state(v)=0 THEN REMOVE EDGE`,
              init: () => {
                  const vertices = App.instance.graph.vertices;
                  for (const v of vertices) {
                      v.state = Math.random() < 0.1 ? 1 : 0;
                  }
              }
          }
      };
  }
  bindEvents() {
      document.getElementById('generateGraph').onclick = () => {
          const n = parseInt(document.getElementById('vertexInput').value);
          const density = parseFloat(document.getElementById('densityInput').value);
          const topo = document.getElementById('topologySelect').value;
          if (topo === 'grid') this.graph.gridGraph(n);
          else this.graph.randomGraph(n, density);
          this.renderer.assignRandomPositions();
          this.updateAll();
      };
      document.getElementById('applyRules').onclick = () => {
          this.rules.parseRules(
              document.getElementById('stateRulesInput').value,
              document.getElementById('topologyRulesInput').value
          );
          this.updateAll();
      };
      document.getElementById('startBtn').onclick = () => this.sim.start();
      document.getElementById('pauseBtn').onclick = () => this.sim.pause();
      document.getElementById('stepBtn').onclick = () => this.sim.step();
      document.getElementById('runBatchBtn').onclick = () => {
          const n = parseInt(document.getElementById('batchInput').value);
          this.sim.runBatch(n);
      };
      document.getElementById('speedInput').onchange = (e) => {
          this.sim.setSpeed(parseInt(e.target.value));
      };
      document.getElementById('presetSelect').onchange = (e) => {
          const val = e.target.value;
          if (!val) return;
          const preset = App.presets[val];
          document.getElementById('stateRulesInput').value = preset.stateRules;
          document.getElementById('topologyRulesInput').value = preset.topoRules;
          this.rules.parseRules(preset.stateRules, preset.topoRules);
          // назначить случайные состояния
          preset.init();
          this.renderer.assignRandomPositions();
          this.sim.stepCount = 0;
          this.updateAll();
      };
      document.getElementById('toggleThemeBtn').onclick = () => {
          document.body.classList.toggle('dark');
      };
      // Импорт / Экспорт
      document.getElementById('exportBtn').onclick = () => {
          const data = {
              vertices: this.graph.vertices.map(v => v.state),
              edges: this.graph.edges,
              stateRules: document.getElementById('stateRulesInput').value,
              topoRules: document.getElementById('topologyRulesInput').value
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'graph_config.json';
          a.click();
          URL.revokeObjectURL(url);
      };
      document.getElementById('importBtn').onclick = () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e) => {
              const file = e.target.files[0];
              const reader = new FileReader();
              reader.onload = (evt) => {
                  const data = JSON.parse(evt.target.result);
                  const n = data.vertices.length;
                  this.graph.reset();
                  for (let i = 0; i < n; i++) this.graph.addVertex();
                  for (const [u, state] of data.vertices.entries()) this.graph.vertices[u].state = state;
                  this.graph.edges = data.edges;
                  document.getElementById('stateRulesInput').value = data.stateRules;
                  document.getElementById('topologyRulesInput').value = data.topoRules;
                  this.rules.parseRules(data.stateRules, data.topoRules);
                  this.renderer.assignRandomPositions();
                  this.updateAll();
              };
              reader.readAsText(file);
          };
          input.click();
      };
      window.addEventListener('resize', () => {
          this.renderer.setSize();
          this.renderer.assignRandomPositions();
          this.updateAll();
      });
  }
  updateLegend(stateDist) {
      const container = document.getElementById('legendContainer');
      container.innerHTML = '';
      for (const [state, count] of Object.entries(stateDist)) {
          const item = document.createElement('div');
          item.className = 'legend-item';
          const colorBox = document.createElement('div');
          colorBox.className = 'legend-color';
          colorBox.style.backgroundColor = this.renderer.colors[state % this.renderer.colors.length];
          const label = document.createElement('span');
          label.className = 'legend-label';
          label.textContent = `Состояние ${state}: ${count}`;
          item.appendChild(colorBox);
          item.appendChild(label);
          container.appendChild(item);
      }
  }
  updateAnalytics() {
      const data = this.analytics.compute();
      document.getElementById('vertexCount').textContent = `Вершин: ${data.vCount}`;
      document.getElementById('edgeCount').textContent = `Рёбер: ${data.eCount}`;
      document.getElementById('componentSize').textContent = `Крупнейшая компонента: ${data.maxComp}`;
      // Степени
      const degList = document.getElementById('degreeList');
      degList.innerHTML = '';
      Object.keys(data.degDist).sort((a,b) => parseInt(a)-parseInt(b)).forEach(deg => {
          const li = document.createElement('li');
          li.textContent = `Степень ${deg}: ${data.degDist[deg]}`;
          degList.appendChild(li);
      });
      this.updateLegend(data.stateDist);
  }
  updateAll() {
      this.renderer.setSize();
      this.renderer.draw();
      this.updateAnalytics();
      document.getElementById('status').textContent = `Шаг: ${this.sim.stepCount}`;
  }
}

// Инициализация приложения
const app = new App();
app.graph.randomGraph(10, 0.25);
app.renderer.assignRandomPositions();
app.updateAll();
