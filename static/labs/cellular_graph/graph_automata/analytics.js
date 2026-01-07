/*
  Analytics module for computing statistics on the graph during simulation.
  Provides a method to compute and return metrics such as:
    - number of vertices
    - number of edges
    - distribution of vertex states
    - distribution of vertex degrees
    - size of the largest connected component
*/

export default class Analytics {
  constructor(graph) {
    this.graph = graph;
  }

  /** Compute and return an object with graph metrics. */
  compute() {
    const vertexCount = this.graph.vertices.size;
    // Count each undirected edge once
    let edgeCount = 0;
    for (const [u, neighbours] of this.graph.edges) {
      edgeCount += neighbours.size;
    }
    edgeCount = edgeCount / 2;
    // State distribution
    const stateDist = {};
    for (const [id, vertex] of this.graph.vertices) {
      const state = vertex.state;
      stateDist[state] = (stateDist[state] || 0) + 1;
    }
    // Degree distribution
    const degreeDist = {};
    for (const id of this.graph.vertices.keys()) {
      const deg = this.graph.degree(id);
      degreeDist[deg] = (degreeDist[deg] || 0) + 1;
    }
    // Size of largest connected component using DFS
    let largest = 0;
    const visited = new Set();
    const ids = Array.from(this.graph.vertices.keys());
    for (const id of ids) {
      if (!visited.has(id)) {
        let size = 0;
        const stack = [id];
        visited.add(id);
        while (stack.length > 0) {
          const v = stack.pop();
          size++;
          for (const nb of this.graph.getNeighbors(v)) {
            if (!visited.has(nb)) {
              visited.add(nb);
              stack.push(nb);
            }
          }
        }
        if (size > largest) largest = size;
      }
    }
    return { vertexCount, edgeCount, stateDist, degreeDist, largestComponent: largest };
  }
}