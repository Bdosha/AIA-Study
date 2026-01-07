// scripts/core/circuit.js
// Модель квантовой схемы: qubits, layers[], валидация занятости, (де)сериализация.

export class Circuit {
  constructor(qubits = 1) {
    if (qubits < 1) throw new Error('Circuit: qubits >= 1');
    this.qubits = qubits;
    this.layers = []; // Array< Array<Element> >
  }

  ensureLayers(n) {
    while (this.layers.length < n) this.layers.push([]);
  }

  // Проверка, что на данном слое нет коллизии по таргетам/контролям
  static _occupiesSameWire(a, b) {
    const wiresA = new Set([...(a.targets ?? []), ...(a.control !== undefined ? [a.control] : [])]);
    const wiresB = new Set([...(b.targets ?? []), ...(b.control !== undefined ? [b.control] : [])]);
    for (const w of wiresA) if (wiresB.has(w)) return true;
    return false;
  }

  _validateInsert(el, layerIndex) {
    if (layerIndex < 0) throw new Error('layerIndex < 0');
    // проверка индексов кубитов
    const all = [...(el.targets ?? []), ...(el.control !== undefined ? [el.control] : [])];
    for (const q of all) {
      if (!Number.isInteger(q) || q < 0 || q >= this.qubits) {
        throw new Error(`Invalid wire index ${q}`);
      }
    }
    // коллизии в слое
    this.ensureLayers(layerIndex + 1);
    const layer = this.layers[layerIndex];
    for (const e of layer) {
      if (Circuit._occupiesSameWire(e, el)) throw new Error('Кубит занят в этом слое');
    }
  }

  addElement(el, layerIndex) {
    // el: { type, targets: [q?], control?, U?, marked? ... }
    this._validateInsert(el, layerIndex);
    this.layers[layerIndex].push(structuredClone(el));
    return this;
  }

  removeElement(layerIndex, elementIndex) {
    if (layerIndex < 0 || layerIndex >= this.layers.length) return;
    const layer = this.layers[layerIndex];
    if (!layer || elementIndex < 0 || elementIndex >= layer.length) return;
    layer.splice(elementIndex, 1);
  }

  clear() {
    this.layers = [];
  }

  toJSON() {
    return JSON.stringify({ qubits: this.qubits, layers: this.layers }, null, 2);
  }

  static fromJSON(json) {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const c = new Circuit(obj.qubits);
    c.layers = (obj.layers || []).map(layer => layer.map(e => ({ ...e })));
    return c;
  }
}
