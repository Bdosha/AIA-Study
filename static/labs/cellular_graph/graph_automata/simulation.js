/*
  Simulation engine for the dynamic graph simulator.

  Runs the synchronous update cycle described in the specification. At each step:
    1. Compute the new state of every vertex using the state rules.
    2. Determine topology changes using the topology rules.
    3. Apply the new states and topology changes atomically.
    4. Advance the step counter.

  The Simulation class does not itself manage drawing; it simply mutates the graph.
  External code (renderer/UI) can subscribe to step events via the onStep callback.
*/

export default class Simulation {
  constructor(graph, rules) {
    this.graph = graph;
    this.rules = rules;
    this.stepCount = 0;
  }

  /** Execute one simulation step. Returns an object containing lists of changed
   *  vertices and topology operations for use by the renderer.
   */
  step() {
    const changedVertices = new Set();
    // 1. Compute new states into a temporary map
    const newStates = new Map();
    for (const [id, vertex] of this.graph.vertices) {
      const newState = this.rules.nextState(id, this.graph);
      newStates.set(id, newState);
    }
    // 2. Compute topology changes
    const operations = this.rules.topologyChanges(this.graph);
    // 3. Apply new states
    for (const [id, newState] of newStates) {
      const vertex = this.graph.vertices.get(id);
      if (vertex && vertex.state !== newState) {
        vertex.state = newState;
        changedVertices.add(id);
      }
    }
    // 4. Apply topology operations
    for (const op of operations) {
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
        changedVertices.add(id);
      }
    }
    this.stepCount++;
    return { changedVertices: Array.from(changedVertices), operations };
  }
}