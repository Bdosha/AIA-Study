// scripts/state/persistence.js
import { Circuit } from '../core/circuit.js';

const KEY = 'quantum-sim:circuit';

export function saveCircuit(circuit) {
  try {
    localStorage.setItem(KEY, circuit.toJSON());
    return true;
  } catch (e) {
    console.error('saveCircuit:', e);
    return false;
  }
}

export function loadCircuit() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return Circuit.fromJSON(raw);
  } catch (e) {
    console.error('loadCircuit:', e);
    return null;
  }
}

export function exportCircuit(circuit) {
  try {
    return circuit.toJSON();
  } catch (e) {
    console.error('exportCircuit:', e);
    return null;
  }
}

export function importCircuit(json) {
  try {
    return Circuit.fromJSON(json);
  } catch (e) {
    console.error('importCircuit:', e);
    return null;
  }
}
