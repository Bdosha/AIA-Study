/*
  Graph data structure for the dynamic graph simulator.
  Manages vertices, edges and neighbour lookup.
  Supports generation of random and grid topologies and import/export.
*/

export default class Graph {
  constructor() {
    this.vertices = new Map(); // id -> { id, state, x, y, vx, vy }
    this.edges = new Map();    // id -> Set of neighbour ids (undirected)
    this.nextVertexId = 0;
  }

  /** Clear the graph completely. */
  clear() {
    this.vertices.clear();
    this.edges.clear();
    this.nextVertexId = 0;
  }

  /** Add a new vertex with an optional state (defaults to 0).
   *  Returns the id of the new vertex. */
  addVertex(state = 0) {
    const id = this.nextVertexId++;
    // assign random initial coordinates; velocities zero
    this.vertices.set(id, { id, state, x: Math.random(), y: Math.random(), vx: 0, vy: 0 });
    return id;
  }

  /** Remove a vertex and all incident edges. */
  removeVertex(id) {
    this.vertices.delete(id);
    // Remove from adjacency lists
    for (const [u, neighbours] of this.edges) {
      neighbours.delete(id);
    }
    this.edges.delete(id);
  }

  /** Add an undirected edge between u and v. */
  addEdge(u, v) {
    if (u === v) return; // avoid self edges
    if (!this.vertices.has(u) || !this.vertices.has(v)) return;
    if (!this.edges.has(u)) this.edges.set(u, new Set());
    if (!this.edges.has(v)) this.edges.set(v, new Set());
    this.edges.get(u).add(v);
    this.edges.get(v).add(u);
  }

  /** Remove an edge between u and v if it exists. */
  removeEdge(u, v) {
    if (this.edges.has(u)) this.edges.get(u).delete(v);
    if (this.edges.has(v)) this.edges.get(v).delete(u);
  }

  /** Test whether an edge exists between u and v. */
  hasEdge(u, v) {
    return this.edges.has(u) && this.edges.get(u).has(v);
  }

  /** Get neighbours of a vertex. Returns an empty set if none. */
  getNeighbors(id) {
    return this.edges.get(id) || new Set();
  }

  /** Degree of a vertex (number of neighbours). */
  degree(id) {
    return this.getNeighbors(id).size;
  }

  /** Count neighbours of a vertex that have a given state. */
  countNeighborsWithState(id, state) {
    let count = 0;
    const vertex = this.vertices.get(id);
    if (!vertex) return 0;
    for (const nb of this.getNeighbors(id)) {
      const neighbour = this.vertices.get(nb);
      if (neighbour && neighbour.state === state) count++;
    }
    return count;
  }

  /** Generate a random undirected graph with n vertices and probability density for edges. */
  generateRandomGraph(n, density = 0.3) {
    this.clear();
    for (let i = 0; i < n; i++) {
      this.addVertex(0);
    }
    const ids = Array.from(this.vertices.keys());
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (Math.random() < density) {
          this.addEdge(ids[i], ids[j]);
        }
      }
    }
  }

  /** Generate a 2D grid graph with roughly n vertices. Attempts to create a square grid. */
  generateGridGraph(n) {
    this.clear();
    // Determine number of rows and columns; choose rows ~ sqrt(n)
    const size = Math.ceil(Math.sqrt(n));
    const rows = size;
    const cols = size;
    // Create vertices
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.nextVertexId >= n) break;
        this.addVertex(0);
      }
    }
    // Create edges between grid neighbours
    const ids = Array.from(this.vertices.keys());
    // map grid index to vertex id: id(r,c) = r*cols + c but truncated
    const idAt = (r, c) => {
      const idx = r * cols + c;
      return ids[idx];
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = idAt(r, c);
        if (id === undefined) continue;
        // right neighbour
        if (c + 1 < cols) {
          const right = idAt(r, c + 1);
          if (right !== undefined) this.addEdge(id, right);
        }
        // bottom neighbour
        if (r + 1 < rows) {
          const bottom = idAt(r + 1, c);
          if (bottom !== undefined) this.addEdge(id, bottom);
        }
      }
    }
  }

  /** Export the graph, rules and simulation parameters to a JSON‑compatible object. */
  exportData(rulesText, simParams, vizParams) {
    const vertices = [];
    for (const [id, v] of this.vertices) {
      vertices.push({ id, state: v.state });
    }
    const edges = [];
    const seen = new Set();
    for (const [u, neighbours] of this.edges) {
      for (const v of neighbours) {
        // ensure each undirected edge only once (u < v)
        if (u < v) {
          edges.push({ u, v });
        }
      }
    }
    return { vertices, edges, rulesText, simParams, vizParams };
  }

  /** Import a graph from a JSON object produced by exportData. */
  importData(data) {
    this.clear();
    // Add vertices first
    for (const v of data.vertices || []) {
      const id = this.addVertex(v.state || 0);
      // Keep consistent IDs if possible
    }
    // Now add edges
    for (const e of data.edges || []) {
      this.addEdge(e.u, e.v);
    }
  }
}