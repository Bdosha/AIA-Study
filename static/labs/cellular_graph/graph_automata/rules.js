/*
  Rules engine for the dynamic graph simulator.
  Parses user DSL into executable state transition and topology modification rules.

  The Rules class exposes two main methods:
    - nextState(vertexId, graph): compute the next state for a vertex according to state rules.
    - topologyChanges(graph): compute a list of topology operations to perform.

  Rules are evaluated sequentially. For state rules the first matching rule is applied;
  if no rule matches the vertex retains its current state. Topology rules are applied
  collectively: all matches across all pairs of vertices are gathered and returned.

  The class also keeps a list of validation errors encountered during parsing.
*/

import { parseCondition, evalCondition, parseAction } from './dsl.js';

export default class Rules {
  constructor(rulesText = '') {
    this.stateRules = [];
    this.topologyRules = [];
    this.errors = [];
    if (rulesText) {
      this.parse(rulesText);
    }
  }

  /** Parse the DSL text into rules. */
  parse(rulesText) {
    this.stateRules = [];
    this.topologyRules = [];
    this.errors = [];
    // Split input into lines and ignore empty/comment lines
    const lines = rulesText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    let section = null;
    for (const line of lines) {
      // Detect section headers
      if (/^STATE_RULES:?$/i.test(line)) {
        section = 'state';
        continue;
      }
      if (/^TOPOLOGY_RULES:?$/i.test(line)) {
        section = 'topology';
        continue;
      }
      if (!section) {
        // skip stray lines outside sections
        continue;
      }
      // Each rule expected as IF ... THEN ...
      const match = line.match(/^IF\s+(.+)\s+THEN\s+(.+)$/i);
      if (!match) {
        this.errors.push(`Invalid rule syntax: ${line}`);
        continue;
      }
      const condStr = match[1];
      const actionStr = match[2];
      try {
        const conditionAST = parseCondition(condStr);
        const action = parseAction(actionStr, section);
        if (section === 'state') {
          this.stateRules.push({ condition: conditionAST, newState: action.newState });
        } else if (section === 'topology') {
          this.topologyRules.push({ condition: conditionAST, actionType: action.type, newState: action.newState });
        }
      } catch (e) {
        this.errors.push(`Error parsing rule: ${line}\n  ${e.message}`);
      }
    }
  }

  /** Check if rules have any errors. */
  hasErrors() {
    return this.errors.length > 0;
  }

  /** Compute the next state for a vertex. */
  nextState(vertexId, graph) {
    for (const rule of this.stateRules) {
      try {
        const match = evalCondition(rule.condition, { vertex: vertexId }, graph);
        if (match) {
          return rule.newState;
        }
      } catch (e) {
        // evaluation error; treat as non-matching
        continue;
      }
    }
    // If no rule matches, return current state
    const v = graph.vertices.get(vertexId);
    return v ? v.state : 0;
  }

  /** Compute topology changes for the whole graph.
   *  Returns an array of operations: {type:'add_edge'|'remove_edge'|'new_vertex', u, v, state}.
   */
  topologyChanges(graph) {
    const ops = [];
    // Precollect vertex IDs
    const ids = Array.from(graph.vertices.keys());
    for (const rule of this.topologyRules) {
      if (rule.actionType === 'add_edge' || rule.actionType === 'remove_edge') {
        // iterate over all unordered pairs (u < v) to avoid duplicates
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const u = ids[i];
            const v = ids[j];
            try {
              const match = evalCondition(rule.condition, { u, v }, graph);
              if (match) {
                ops.push({ type: rule.actionType, u, v });
              }
            } catch (e) {
              // skip evaluation errors
            }
          }
        }
      } else if (rule.actionType === 'new_vertex') {
        // Evaluate once per rule; if true add one new vertex
        try {
          // Provide context with arbitrary vertex id (first vertex if exists)
          const someId = ids.length > 0 ? ids[0] : null;
          const match = evalCondition(rule.condition, { vertex: someId }, graph);
          if (match) {
            ops.push({ type: 'new_vertex', state: rule.newState || 0 });
          }
        } catch (e) {
          // ignore errors
        }
      }
    }
    return ops;
  }
}