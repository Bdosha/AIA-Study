// scripts/core/simulator.js
// Универсальный движок симуляции слоёв.
import { QState } from './qstate.js';
import { H, X, Y, Z, S, T } from './gates.js';

export class Simulator {
  constructor(circuit) {
    this.circuit = circuit;          // { qubits, layers }
    this.q = new QState(circuit.qubits);
    this.layerIndex = 0;
    this.isRunning = false;
    this.speedMs = 300;
    this._timer = null;
    this._listeners = { beforeStep: [], afterStep: [], reset: [] };
  }

  on(event, cb) { this._listeners[event]?.push(cb); }
  _emit(event, payload) { for (const cb of this._listeners[event] || []) cb(payload); }

  reset() {
    this.q = new QState(this.circuit.qubits);
    this.layerIndex = 0;
    this.stop();
    this._emit('reset', { state: this.q });
  }

  setSpeed(ms) { this.speedMs = Math.max(0, ms | 0); }

  step() {
    if (this.layerIndex >= this.circuit.layers.length) return false;
    const layer = this.circuit.layers[this.layerIndex] || [];
    this._emit('beforeStep', { layerIndex: this.layerIndex, layer, state: this.q });

    for (const el of layer) {
      switch (el.type) {
        case 'H': this.q.apply1(H(), el.targets[0]); break;
        case 'X': this.q.apply1(X(), el.targets[0]); break;
        case 'Y': this.q.apply1(Y(), el.targets[0]); break;
        case 'Z': this.q.apply1(Z(), el.targets[0]); break;
        case 'S': this.q.apply1(S(), el.targets[0]); break;
        case 'T': this.q.apply1(T(), el.targets[0]); break;
        case 'CNOT': this.q.applyCNOT(el.control, el.targets[0]); break;

        // Общий 2-кубитный оператор (если понадобится для кастомного оракула на 2 кубитах)
        case 'U2': {
          const [q1, q2] = el.targets;
          this.q.apply2(el.U, q1, q2);
          break;
        }

        // Виртуальный «полный» оракул фазы для n кубитов: -1 на отмеченных базисных состояниях
        case 'U_FULL': {
          const marked = new Set(el.marked || []);
          const psi = this.q.psi.slice();
          for (let i = 0; i < psi.length; i++) {
            if (marked.has(i)) this.q.psi[i] = { re: -psi[i].re, im: -psi[i].im };
          }
          this.q.renorm();
          break;
        }

        // Диффузор: отражение амплитуд относительно среднего значения
        case 'DIFFUSER': {
          const psi = this.q.psi.slice();
          let meanRe = 0, meanIm = 0;
          for (const a of psi) { meanRe += a.re; meanIm += a.im; }
          meanRe /= psi.length; meanIm /= psi.length;
          for (let i = 0; i < psi.length; i++) {
            const re = 2 * meanRe - psi[i].re;
            const im = 2 * meanIm - psi[i].im;
            this.q.psi[i] = { re, im };
          }
          this.q.renorm();
          break;
        }

        case 'MEASURE-ALL': {
          const out = this.q.measureAll();
          el._result = out; // int 0..2^n-1
          break;
        }
        case 'MEASURE': {
          const tgt = el.targets[0];
          const bit = this.q.measureAt(tgt);
          el._result = bit; // 0|1
          break;
        }
        default:
          console.warn('Unknown element type', el);
      }
    }

    this._emit('afterStep', { layerIndex: this.layerIndex, layer, state: this.q });
    this.layerIndex++;
    return this.layerIndex < this.circuit.layers.length;
  }

  run() {
    if (this.isRunning) return;
    this.isRunning = true;
    const tick = () => {
      const hasMore = this.step();
      if (!this.isRunning) return;
      if (hasMore) {
        this._timer = setTimeout(tick, this.speedMs);
      } else {
        this.stop();
      }
    };
    this._timer = setTimeout(tick, this.speedMs);
  }

  stop() {
    this.isRunning = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }
}
