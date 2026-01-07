/*
  DSL parser and evaluator for the dynamic graph simulator.

  The DSL allows users to describe state transition and topology modification rules.
  Syntax overview:

  STATE_RULES:
    IF condition THEN new_state = <number>
    IF condition THEN SET STATE TO <number>

  TOPOLOGY_RULES:
    IF condition THEN ADD EDGE(u,v)
    IF condition THEN REMOVE EDGE(u,v)
    IF condition THEN NEW VERTEX [STATE=<number>]

  The language understands the following primitives:
    - state: the current state of the vertex in state rules.
      state(u), state(v) refer to the states of the endpoints in topology rules.
    - COUNT(state=<value>): number of neighbours of the current vertex having the given state.
    - EDGE(u,v): true if an edge exists between vertices u and v.
    - Logical operators: AND, OR, NOT.
    - Comparison operators: =, ==, !=, <, >, <=, >=.
    - Parentheses for grouping.

  The parser outputs an abstract syntax tree (AST) which can be evaluated
  against a context ({ vertex, u, v }) and a Graph instance.

  The evaluation avoids use of eval() or Function() to maintain security.
*/

// Tokenizer: splits an input string into a sequence of tokens for parsing.
class Tokenizer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.tokens = [];
    this.tokenize();
  }

  // Recognised token types
  static get tokenSpec() {
    return [
      { type: 'WHITESPACE', regex: /^\s+/ },
      { type: 'NUMBER', regex: /^\d+/ },
      { type: 'OP', regex: /^(==|!=|<=|>=|<|>|=)/ },
      { type: 'LPAREN', regex: /^\(/ },
      { type: 'RPAREN', regex: /^\)/ },
      { type: 'COMMA', regex: /^,/ },
      { type: 'IDENT', regex: /^[A-Za-z_][A-Za-z0-9_]*/ }
    ];
  }

  tokenize() {
    let str = this.input;
    while (str.length > 0) {
      let matched = false;
      for (const spec of Tokenizer.tokenSpec) {
        const match = spec.regex.exec(str);
        if (match) {
          matched = true;
          const value = match[0];
          if (spec.type !== 'WHITESPACE') {
            let valUpper = value;
            if (spec.type === 'IDENT') {
              valUpper = value.toUpperCase();
            }
            this.tokens.push({ type: spec.type, value: valUpper, raw: value });
          }
          str = str.slice(value.length);
          break;
        }
      }
      if (!matched) {
        throw new Error('Unexpected character: ' + str[0]);
      }
    }
    // Append an EOF marker
    this.tokens.push({ type: 'EOF', value: null });
  }
}

// Parser implements a recursive descent parser for conditions.
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  peek() {
    return this.tokens[this.position];
  }

  consume(expectedType, expectedValue) {
    const token = this.peek();
    if (!token || token.type === 'EOF') {
      throw new Error('Unexpected end of input');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType} but found ${token.type}`);
    }
    if (expectedValue && token.value !== expectedValue) {
      throw new Error(`Expected ${expectedValue} but found ${token.value}`);
    }
    this.position++;
    return token;
  }

  // condition := orExpr
  parseCondition() {
    return this.parseOr();
  }

  // orExpr := andExpr (OR andExpr)*
  parseOr() {
    let node = this.parseAnd();
    while (true) {
      const token = this.peek();
      if (token.type === 'IDENT' && token.value === 'OR') {
        this.consume('IDENT');
        const right = this.parseAnd();
        node = { type: 'Logical', op: 'OR', left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  // andExpr := notExpr (AND notExpr)*
  parseAnd() {
    let node = this.parseNot();
    while (true) {
      const token = this.peek();
      if (token.type === 'IDENT' && token.value === 'AND') {
        this.consume('IDENT');
        const right = this.parseNot();
        node = { type: 'Logical', op: 'AND', left: node, right };
      } else {
        break;
      }
    }
    return node;
  }

  // notExpr := NOT? compareExpr
  parseNot() {
    const token = this.peek();
    if (token.type === 'IDENT' && token.value === 'NOT') {
      this.consume('IDENT');
      const operand = this.parseNot();
      return { type: 'Not', operand };
    }
    return this.parseComparison();
  }

  // compareExpr := primary ( (OP) primary )?
  parseComparison() {
    let left = this.parsePrimary();
    const token = this.peek();
    if (token.type === 'OP') {
      const op = token.value;
      this.consume('OP');
      const right = this.parsePrimary();
      return { type: 'Comparison', op, left, right };
    }
    return left;
  }

  // primary := NUMBER | stateExpr | countExpr | edgeExpr | '(' condition ')'
  parsePrimary() {
    const token = this.peek();
    if (token.type === 'NUMBER') {
      this.consume('NUMBER');
      return { type: 'Number', value: parseInt(token.value, 10) };
    }
    if (token.type === 'IDENT') {
      // handle identifiers
      if (token.value === 'STATE') {
        return this.parseStateExpr();
      }
      if (token.value === 'COUNT') {
        return this.parseCountExpr();
      }
      if (token.value === 'EDGE') {
        return this.parseEdgeExpr();
      }
    }
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseCondition();
      this.consume('RPAREN');
      return expr;
    }
    throw new Error(`Unexpected token: ${token.type} ${token.value}`);
  }

  // stateExpr := STATE | STATE '(' 'U' ')' | STATE '(' 'V' ')'
  parseStateExpr() {
    this.consume('IDENT', 'STATE');
    let target = 'self';
    if (this.peek().type === 'LPAREN') {
      this.consume('LPAREN');
      const ident = this.consume('IDENT');
      if (ident.value === 'U') {
        target = 'u';
      } else if (ident.value === 'V') {
        target = 'v';
      } else {
        throw new Error('Unexpected token inside state(): ' + ident.value);
      }
      this.consume('RPAREN');
    }
    return { type: 'State', target };
  }

  // countExpr := COUNT '(' STATE '=' NUMBER ')'
  parseCountExpr() {
    this.consume('IDENT', 'COUNT');
    this.consume('LPAREN');
    // Expect STATE
    this.consume('IDENT', 'STATE');
    this.consume('OP', '=');
    const numToken = this.consume('NUMBER');
    const value = parseInt(numToken.value, 10);
    this.consume('RPAREN');
    return { type: 'Count', value };
  }

  // edgeExpr := EDGE '(' 'U' ',' 'V' ')'
  parseEdgeExpr() {
    this.consume('IDENT', 'EDGE');
    this.consume('LPAREN');
    const first = this.consume('IDENT');
    if (first.value !== 'U') {
      throw new Error('EDGE expects first argument U');
    }
    this.consume('COMMA');
    const second = this.consume('IDENT');
    if (second.value !== 'V') {
      throw new Error('EDGE expects second argument V');
    }
    this.consume('RPAREN');
    return { type: 'Edge' };
  }
}

// Evaluate an AST node in a given context and graph.
function evaluateCondition(node, context, graph) {
  switch (node.type) {
    case 'Logical': {
      const left = evaluateCondition(node.left, context, graph);
      const right = evaluateCondition(node.right, context, graph);
      if (node.op === 'AND') return Boolean(left) && Boolean(right);
      if (node.op === 'OR') return Boolean(left) || Boolean(right);
      throw new Error('Unknown logical operator: ' + node.op);
    }
    case 'Not': {
      const val = evaluateCondition(node.operand, context, graph);
      return !Boolean(val);
    }
    case 'Comparison': {
      // Evaluate both sides; convert booleans to numbers for numeric comparisons
      const left = evaluateCondition(node.left, context, graph);
      const right = evaluateCondition(node.right, context, graph);
      const lv = typeof left === 'boolean' ? (left ? 1 : 0) : left;
      const rv = typeof right === 'boolean' ? (right ? 1 : 0) : right;
      switch (node.op) {
        case '==':
        case '=':
          return lv === rv;
        case '!=':
          return lv !== rv;
        case '<':
          return lv < rv;
        case '>':
          return lv > rv;
        case '<=':
          return lv <= rv;
        case '>=':
          return lv >= rv;
        default:
          throw new Error('Unknown comparison operator: ' + node.op);
      }
    }
    case 'Number':
      return node.value;
    case 'State': {
      let id;
      if (node.target === 'self') {
        id = context.vertex;
      } else if (node.target === 'u') {
        id = context.u;
      } else if (node.target === 'v') {
        id = context.v;
      }
      if (id === undefined || id === null) return 0;
      const vertex = graph.vertices.get(id);
      return vertex ? vertex.state : 0;
    }
    case 'Count': {
      // Use vertex from context if present; fallback to u
      let id = context.vertex;
      if (id === undefined || id === null) id = context.u;
      if (id === undefined || id === null) return 0;
      return graph.countNeighborsWithState(id, node.value);
    }
    case 'Edge': {
      if (context.u === undefined || context.v === undefined) return false;
      return graph.hasEdge(context.u, context.v);
    }
    default:
      throw new Error('Unknown node type: ' + node.type);
  }
}

// Parse a condition string into an AST. Throws an error on invalid syntax.
export function parseCondition(conditionStr) {
  const tokenizer = new Tokenizer(conditionStr);
  const parser = new Parser(tokenizer.tokens);
  const ast = parser.parseCondition();
  // After parsing, ensure we consumed all tokens except EOF
  const leftover = parser.peek();
  if (leftover && leftover.type !== 'EOF') {
    throw new Error('Unexpected tokens after end of condition');
  }
  return ast;
}

// Evaluate a parsed condition AST in a given context and graph.
export function evalCondition(ast, context, graph) {
  return Boolean(evaluateCondition(ast, context, graph));
}

// Parse a rule action string into an object representation.
export function parseAction(actionStr, section) {
  // Normalise whitespace and uppercase for matching keywords
  const trimmed = actionStr.trim();
  const upper = trimmed.toUpperCase();

  if (section === 'state') {
    // Accept new_state = value or set state to value
    // Remove underscores and spaces for easier matching
    const cleaned = upper.replace(/_/g, '').replace(/\s+/g, ' ').trim();
    // Match NEWSTATE = N
    let match = cleaned.match(/^NEWSTATE\s*=\s*(\d+)$/);
    if (match) {
      return { type: 'state', newState: parseInt(match[1], 10) };
    }
    // Match SET STATE TO N
    match = cleaned.match(/^SET STATE TO\s*(\d+)$/);
    if (match) {
      return { type: 'state', newState: parseInt(match[1], 10) };
    }
    throw new Error('Invalid state action: ' + actionStr);
  } else if (section === 'topology') {
    // Match ADD EDGE(u,v)
    let m = upper.match(/^ADD\s+EDGE\s*\(\s*U\s*,\s*V\s*\)$/);
    if (m) {
      return { type: 'add_edge' };
    }
    // Match REMOVE EDGE(u,v)
    m = upper.match(/^REMOVE\s+EDGE\s*\(\s*U\s*,\s*V\s*\)$/);
    if (m) {
      return { type: 'remove_edge' };
    }
    // Match NEW VERTEX optionally with state
    m = upper.match(/^NEW\s+VERTEX(?:\s+STATE\s*=\s*(\d+))?$/);
    if (m) {
      const newState = m[1] ? parseInt(m[1], 10) : 0;
      return { type: 'new_vertex', newState };
    }
    throw new Error('Invalid topology action: ' + actionStr);
  }
  throw new Error('Unknown rule section');
}