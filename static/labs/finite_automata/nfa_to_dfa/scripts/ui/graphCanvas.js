/* Рендер и интерактив на SVG-холсте для НКА/ДКА (выбор, перетаскивание, подсветка) */
export class GraphCanvas {
  constructor(svg) {
    this.svg = svg;
    this.viewMode = "nfa";
    this.modelNFA = null; this.modelDFA = null;

    this.posNFA = new Map(); this.posDFA = new Map();
    this.onSelectState = null;
    this.selected = { nfa: null, dfa: null };
    this.highlight = { nfaStates: new Set(), dfaState: null };

    this._drag = { active: false, which: null, id: null, offX: 0, offY: 0 };
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this.svg.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mouseup", this._onMouseUp);
  }

  setView(mode) { this.viewMode = mode; this.render(this.modelNFA, this.modelDFA); }
  setHighlights({ nfaStates = null, dfaState = null } = {}) {
    if (nfaStates !== null) this.highlight.nfaStates = new Set(nfaStates);
    if (dfaState !== null) this.highlight.dfaState = dfaState;
    this.render(this.modelNFA, this.modelDFA);
  }
  setNodePosNFA(id, pos) { this.posNFA.set(id, pos); }
  setNodePosDFA(id, pos) { this.posDFA.set(id, pos); }

  render(nfa, dfa) {
    this.modelNFA = nfa; this.modelDFA = dfa;
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    const g = (tag, attrs={}) => { const el = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

    const defs = g("defs");
    const marker = g("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "10", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto" });
    marker.appendChild(g("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#9aa4b2" }));
    defs.appendChild(marker); this.svg.appendChild(defs);

    const leftX = 120, midY = 160, shift = 520;

    if (this.viewMode === "nfa" || this.viewMode === "both") {
      const group = g("g", { transform: "translate(0,0)" });
      this.svg.appendChild(group);
      if (nfa) this._drawAutomaton(group, nfa, this.posNFA, { x: leftX, y: midY, which: "nfa" });
    }
    if (this.viewMode === "dfa" || this.viewMode === "both") {
      const group = g("g", { transform: `translate(${shift},0)` });
      this.svg.appendChild(group);
      if (dfa) this._drawAutomaton(group, dfa, this.posDFA, { x: leftX, y: midY, which: "dfa" });
    }
  }

  _drawAutomaton(group, automaton, posMap, { x, y, which }) {
    const g = (tag, attrs={}) => { const el = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

    const ids = [...automaton.states];
    if (posMap.size === 0 || ids.some(id => !posMap.has(id))) {
      ids.forEach((id, i) => { if (!posMap.has(id)) posMap.set(id, { x: x + i*140, y }); });
    }

    const grouped = new Map();
    const pushEdge = (from, to, label) => {
      const k = `${from}|${to}`;
      if (!grouped.has(k)) grouped.set(k, { from, to, labels: new Set() });
      grouped.get(k).labels.add(label);
    };
    for (const [from, mmap] of automaton.transitions.entries()) {
      for (const [key, toOrMap] of mmap.entries()) {
        if (typeof toOrMap === "string") pushEdge(from, toOrMap, key);
        else for (const to of toOrMap) pushEdge(from, to, key);
      }
    }

    for (const { from, to, labels } of grouped.values()) {
      const A = posMap.get(from), B = posMap.get(to);
      if (!A || !B) continue;

      if (from === to) {
        const r = 28, lift = 48;
        const path = g("path", {
          d: `M ${A.x} ${A.y - r}
              C ${A.x - 30} ${A.y - r - lift},
                ${A.x + 30} ${A.y - r - lift},
                ${A.x} ${A.y - r}`,
          stroke: "#9aa4b2", "stroke-width": 2, fill: "none", "marker-end": "url(#arrow)"
        });
        group.appendChild(path);
        const text = g("text", { x: A.x, y: A.y - r - lift - 6, "text-anchor": "middle", "font-size": 12, fill: "#9aa4b2" });
        text.textContent = [...labels].join(",");
        group.appendChild(text);
        continue;
      }

      const dirUp = from < to;
      const curveY = dirUp ? Math.min(A.y, B.y) - 60 : Math.max(A.y, B.y) + 60;
      const path = g("path", {
        d: `M ${A.x+28} ${A.y}
            C ${A.x+60} ${curveY},
              ${B.x-60} ${curveY},
              ${B.x-28} ${B.y}`,
        stroke: "#9aa4b2", "stroke-width": 2, fill: "none", "marker-end": "url(#arrow)"
      });
      group.appendChild(path);

      const midX = (A.x + B.x) / 2, midY = dirUp ? curveY - 6 : curveY + 16;
      const text = g("text", { x: midX, y: midY, "text-anchor": "middle", "font-size": 12, fill: "#9aa4b2" });
      text.textContent = [...labels].join(",");
      group.appendChild(text);
    }

    for (const id of ids) {
      const { x: nx, y: ny } = posMap.get(id);
      const isStart = automaton.start === id;
      const isFinal = automaton.finals?.has(id);
      const isActive = (which === "nfa" && this.highlight.nfaStates.has(id)) ||
                       (which === "dfa" && this.highlight.dfaState === id);

      const circle = g("circle", { cx: nx, cy: ny, r: 28, fill: isActive ? "#20304a" : "#1a2030", stroke: isActive ? "#4da3ff" : "#2a3040", "stroke-width": isActive ? 3 : 2 });
      group.appendChild(circle);
      if (isFinal) group.appendChild(g("circle", { cx: nx, cy: ny, r: 22, fill: "none", stroke: "#4da3ff", "stroke-width": 2 }));

      const label = g("text", { x: nx, y: ny + 5, "text-anchor": "middle", "font-size": 14, fill: "#e6e9ef" });
      label.textContent = id; group.appendChild(label);

      if (isStart) {
        const arrow = g("path", { d: `M ${nx-60} ${ny} L ${nx-32} ${ny}`, stroke: "#7bd88f", "stroke-width": 3, fill: "none", "marker-end": "url(#arrow)" });
        group.appendChild(arrow);
      }

      const editable = (which === "nfa" && (this.viewMode === "nfa" || this.viewMode === "both")) ||
                       (which === "dfa" && (this.viewMode === "dfa" || this.viewMode === "both"));
      if (editable) {
        const hit = g("circle", { cx: nx, cy: ny, r: 30, fill: "transparent", cursor: "pointer" });
        hit.addEventListener("click", () => {
          this.selected[which] = id;
          if (typeof this.onSelectState === "function") this.onSelectState(id, which);
          if (which === "nfa") this.setHighlights({ nfaStates: new Set([id]) });
          if (which === "dfa") this.setHighlights({ dfaState: id });
        });
        hit.addEventListener("mousedown", (ev) => {
          this._drag.active = true; this._drag.which = which; this._drag.id = id;
          this._drag.offX = ev.offsetX - nx; this._drag.offY = ev.offsetY - ny; ev.preventDefault();
        });
        group.appendChild(hit);
      }
    }
  }

  _handleMouseMove(ev) {
    if (!this._drag.active || !this._drag.id) return;
    const id = this._drag.id, which = this._drag.which;
    const pos = { x: ev.offsetX - this._drag.offX, y: ev.offsetY - this._drag.offY };
    if (which === "nfa") this.posNFA.set(id, pos); else this.posDFA.set(id, pos);
    this.render(this.modelNFA, this.modelDFA);
  }
  _handleMouseUp() { this._drag.active = false; this._drag.id = null; this._drag.which = null; }

  exportSVG(filename = "graph.svg") {
    const blob = new Blob([this.svg.outerHTML], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}