// scripts/main.js
// Биндинг UI, темы и экспортов. Унитарь строится без Simulator.

import { Circuit } from './core/circuit.js';
import { Simulator } from './core/simulator.js';
import { QState } from './core/qstate.js';
import { saveCircuit, loadCircuit, exportCircuit, importCircuit } from './state/persistence.js';
import { presets } from './presets/list.js';

// UI
import { initHeader } from './ui/components/header.js';
import { initFooter } from './ui/components/footer.js';
import { initToolbar } from './ui/components/toolbar.js';
import { initGatePalette } from './ui/components/gatePalette.js';
import { initCircuitGrid } from './ui/components/circuitGrid.js';
import { initStatePanel } from './ui/components/statePanel.js';
import { initPresets } from './ui/components/presets.js';

// Темы
import { initTheme, toggleTheme, loadTheme } from './ui/theme.js';

const ok  = (msg) => console.log('[OK]', msg);
const err = (msg, e) => console.error('[ERR]', msg, e);

const dom = {
  header: document.getElementById('app-header'),
  footer: document.getElementById('app-footer'),
  toolbar: document.getElementById('app-toolbar'),
  leftPalette: document.getElementById('left-palette'),
  leftPresets: document.getElementById('left-presets'),
  centerGrid: document.getElementById('circuit-grid'),
  rightPanel: document.getElementById('right-panel'),
  fStep: document.getElementById('f-step'),
  fTime: document.getElementById('f-time'),

  // сим-управление
  btnStart: document.getElementById('btn-start'),
  btnStop: document.getElementById('btn-stop'),
  btnStep: document.getElementById('btn-step'),
  btnReset: document.getElementById('btn-reset'),
  speedRange: document.getElementById('speed-range'),

  // экспорты/импорт
  btnExport: document.getElementById('btn-export'),
  btnImport: document.getElementById('btn-import'),
  btnUnitary: document.getElementById('btn-unitary'),
  btnProbsCsv: document.getElementById('btn-probs-csv'),
  btnQasm: document.getElementById('btn-qasm'),
  btnQuil: document.getElementById('btn-quil'),

  // тема
  btnTheme: document.getElementById('btn-theme')
};

const store = {
  circuit: null,
  simulator: null,
  stepsExplain: [],
  blochTarget: 0
};

document.addEventListener('DOMContentLoaded', () => {
  try { bootstrap(); } catch (e) { err('Bootstrap failed', e); }
});

function bootstrap() {
  initHeader(dom.header, { title: 'Симулятор квантовых схем', subtitle: '' });
  initFooter(dom.footer);

  // Палитра / пресеты / сетка / стейт-панель
  initGatePalette(dom.leftPalette);
  initPresets(dom.leftPresets, {
    presets,
    onSelect: ({ circuit, stepsExplain }) => {
      replaceCircuit(circuit);
      store.stepsExplain = stepsExplain || [];
      resetSimulator();
      renderAll();
    }
  });
  initCircuitGrid(dom.centerGrid, {
    getCircuit: () => store.circuit,
    onRemoveElement: ({ layerIndex, elementIndex }) => {
      store.circuit.removeElement(layerIndex, elementIndex);
      persist();
      renderAll();
    }
  });
  initStatePanel(dom.rightPanel, {
    getState: () => store.simulator?.q,
    getLog: () => store.stepsExplain,
    onSelectBlochQubit: (q) => { store.blochTarget = q; renderState(); }
  });

  // Тулбар базовых кнопок
  initToolbar(dom.toolbar, {
    onStart: handleStart,
    onStop: handleStop,
    onStep: handleStep,
    onReset: handleReset,
    onSpeed: handleSpeed
  });

  // Прямые обработчики экспортов/темы/импорта
  bindDirectHandlers();

  // Схема по умолчанию или из сохранённой
  const saved = loadCircuit();
  if (saved) {
    replaceCircuit(saved);
  } else {
    const { circuit, stepsExplain } = presets.find(p => p.id === 'h-on-zero').build();
    replaceCircuit(circuit);
    store.stepsExplain = stepsExplain || [];
  }

  resetSimulator();
  renderAll();

  // Темы
  initTheme();
  updateThemeButtonLabel();

  // Применить текущую скорость (инверсия: вправо быстрее)
  if (dom.speedRange) handleSpeed(dom.speedRange.value);

  ok('Готово ✅');
}

/* ------------------------ Glue ------------------------ */
function replaceCircuit(c) {
  if (!(c instanceof Circuit)) throw new Error('replaceCircuit: not a Circuit');
  store.circuit = c;
}
function resetSimulator() {
  if (!store.circuit) throw new Error('resetSimulator: circuit missing');
  store.simulator = new Simulator(store.circuit);
  const t0 = performance.now();
  store.simulator.on('reset', () => { updateFooter(0,0); renderAll(); });
  store.simulator.on('afterStep', ({ layerIndex }) => {
    const dt = (performance.now() - t0) / 1000;
    updateFooter(layerIndex + 1, dt);
    renderAll();
  });
}
function persist() { try { saveCircuit(store.circuit); } catch(e){ console.warn(e); }}

/* ------------------------ Render ---------------------- */
function renderAll(){ renderGrid(); renderState(); }
function renderGrid(){ dom.centerGrid?.dispatchEvent(new CustomEvent('render-request')); }
function renderState(){
  dom.rightPanel?.dispatchEvent(new CustomEvent('render-request', { detail: { blochTarget: store.blochTarget }}));
}
function updateFooter(step, timeSec) {
  dom.fStep && (dom.fStep.textContent = String(step ?? 0));
  dom.fTime && (dom.fTime.textContent = (timeSec ?? 0).toFixed(2));
}

/* --------------------- Sim controls ------------------- */
function handleStart(){ try{ store.simulator?.run(); } catch(e){ err('run()', e); } }
function handleStop(){  try{ store.simulator?.stop(); } catch(e){ err('stop()', e); } }
function handleStep(){  try{ store.simulator?.step(); renderAll(); } catch(e){ err('step()', e); } }
function handleReset(){ try{ store.simulator?.reset(); } catch(e){ err('reset()', e); } }

/** Инвертированная шкала: вправо = быстрее */
function handleSpeed(raw) {
  const slider = dom.speedRange;
  const v = Number(raw);
  if (!Number.isFinite(v)) return;
  const sMin = Number(slider?.min ?? 0);
  const sMax = Number(slider?.max ?? 100);
  const DELAY_MIN = 10;    // быстро
  const DELAY_MAX = 1000;  // медленно
  const t = (v - sMin) / Math.max(1, (sMax - sMin)); // 0..1
  const delayMs = DELAY_MAX - t * (DELAY_MAX - DELAY_MIN);
  try { store.simulator?.setSpeed(delayMs); if (slider) slider.value = String(v); } catch(e){ err('setSpeed()', e); }
}

/* -------------- Прямые обработчики кнопок -------------- */
function bindDirectHandlers(){
  // JSON экспорт/импорт
  dom.btnExport && dom.btnExport.addEventListener('click', () => {
    const data = exportCircuit(store.circuit); if (!data) return;
    downloadText('circuit.json', data);
  });
  dom.btnImport && dom.btnImport.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      const text = await f.text();
      const c = importCircuit(text);
      if (!c) { alert('Импорт не удался'); return; }
      replaceCircuit(c); resetSimulator(); renderAll();
    };
    input.click();
  });

  // Экспорт вероятностей
  dom.btnProbsCsv && dom.btnProbsCsv.addEventListener('click', onExportProbabilitiesCsv);

  // Экспорт QASM/Quil
  dom.btnQasm && dom.btnQasm.addEventListener('click', onExportQasm);
  dom.btnQuil && dom.btnQuil.addEventListener('click', onExportQuil);

  // Унитар / CSV
  dom.btnUnitary && dom.btnUnitary.addEventListener('click', onExportUnitaryOrCsv);

  // Переключение темы
  dom.btnTheme && dom.btnTheme.addEventListener('click', () => {
    toggleTheme();
    updateThemeButtonLabel();
  });
}

/* -------------------- Экспорт: Prob CSV ---------------- */
function onExportProbabilitiesCsv(){
  const q = store.simulator?.q;
  const n = q?.n ?? 0;
  const amps = q?.amplitudes || q?.state || [];
  if (!n || !amps?.length){ alert('Состояние не готово'); return; }

  const N = 1 << n;
  const rows = ['index,bits,probability'];
  for (let i=0;i<N;i++){
    const a = amps[i];
    const re = typeof a?.re === 'number' ? a.re : (Array.isArray(a)?a[0]:0);
    const im = typeof a?.im === 'number' ? a.im : (Array.isArray(a)?a[1]:0);
    const p = re*re + im*im;
    rows.push(`${i},${toBits(i,n)},${p.toFixed(10)}`);
  }
  downloadText('circuit_probabilities.csv', rows.join('\n'));
}

/* -------------------- Экспорт: QASM/Quil --------------- */
function onExportQasm(){
  if (!store.circuit) return;
  const n = store.circuit.qubits ?? store.circuit.n ?? 0;
  const body = emitProgram(store.circuit, 'qasm');
  const src = [
    'OPENQASM 3;',
    'include "stdgates.inc";',
    `qubit[${n}] q;`,
    `bit[${n}] c;`,
    '',
    body,
  ].join('\n');
  downloadText('circuit.qasm', src);
}
function onExportQuil(){
  if (!store.circuit) return;
  const n = store.circuit.qubits ?? store.circuit.n ?? 0;
  const header = `DECLARE ro BIT[${n}]`;
  const body = emitProgram(store.circuit, 'quil');
  const src = [header, '', body].join('\n');
  downloadText('circuit.quil', src);
}
function emitProgram(circuit, fmt){
  const m1 = { qasm: (g,t)=>`${g} q[${t}];`, quil: (g,t)=>`${g} ${t}` };
  const two= { qasm: (g,c,t)=>`${g} q[${c}], q[${t}];`, quil:(g,c,t)=>`${g} ${c} ${t}` };
  const lines = [];
  const n = circuit.qubits ?? circuit.n ?? 0;
  const layers = circuit.layers || [];

  for (const layer of layers){
    for (const el of layer){
      const type = el.type?.toUpperCase?.() || '';
      switch (type){
        case 'H': case 'X': case 'Y': case 'Z': case 'S': case 'T':
          for (const t of (el.targets||[])) lines.push(m1[fmt](type.toLowerCase(), t));
          break;
        case 'CNOT': {
          const c = el.control;
          for (const t of (el.targets||[])) lines.push(two[fmt](fmt==='qasm'?'cx':'CNOT', c, t));
          break;
        }
        case 'MEASURE':
          for (const t of (el.targets||[]))
            lines.push(fmt==='qasm' ? `c[${t}] = measure q[${t}];` : `MEASURE ${t} ro[${t}]`);
          break;
        case 'MEASURE-ALL':
          for (let i=0;i<n;i++)
            lines.push(fmt==='qasm' ? `c[${i}] = measure q[${i}];` : `MEASURE ${i} ro[${i}]`);
          break;
        case 'U_FULL': {
          const mark = Array.isArray(el.marked) ? el.marked.join(',') : (el.marked ?? '');
          lines.push(fmt==='qasm'
            ? `// U_FULL (oracle) — реализуйте отдельно; marked=[${mark}]`
            : `# U_FULL (oracle) — реализуйте отдельно; marked=[${mark}]`);
          break;
        }
        case 'DIFFUSER':
          lines.push(fmt==='qasm'
            ? `// DIFFUSER — реализуйте отдельно (D=2|s><s|-I)`
            : `# DIFFUSER — реализуйте отдельно (D=2|s><s|-I)`);
          break;
        default:
          lines.push(fmt==='qasm' ? `// [WARN] Неизвестный элемент: ${type}` : `# [WARN] Неизвестный элемент: ${type}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/* --------------- УНИТАРЬ: таблица или CSV -------------- */
function onExportUnitaryOrCsv(){
  const circuit = store.circuit; if (!circuit) return;
  const n = circuit.qubits ?? circuit.n ?? 0;
  const N = 1 << n;

  if (n <= 4){
    const U = buildUnitaryByColumns(circuit, n);
    showUnitaryTable(U, n);
  } else {
    const rows = ['row,col,re,im'];
    for (let c=0;c<N;c++){
      const col = evolveBasisColumn(circuit, n, c);
      for (let r=0;r<N;r++){
        const z = col[r];
        if (Math.abs(z.re) > 1e-12 || Math.abs(z.im) > 1e-12){
          rows.push(`${r},${c},${fmt(z.re)},${fmt(z.im)}`);
        }
      }
    }
    downloadText('circuit_unitary_sparse.csv', rows.join('\n'));
  }
}

/* ======= независимый от Simulator расчёт унитаря ======= */

// комплекс
const C = (re, im=0) => ({re, im});
const cAdd = (a,b) => C(a.re+b.re, a.im+b.im);
const cSub = (a,b) => C(a.re-b.re, a.im-b.im);
const cMul = (a,b) => C(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
const cScale = (a,k) => C(a.re*k, a.im*k);

// 2x2 матрицы базовых вентилей
const SQ2 = Math.SQRT1_2;
const Gx = [C(0,0),C(1,0), C(1,0),C(0,0)];                          // X
const Gy = [C(0,0),C(0,-1), C(0,1),C(0,0)];                          // Y
const Gz = [C(1,0),C(0,0), C(0,0),C(-1,0)];                           // Z
const Gh = [C(SQ2,0),C(SQ2,0), C(SQ2,0),C(-SQ2,0)];                   // H
const Gs = [C(1,0),C(0,0), C(0,0),C(0,1)];                            // S = diag(1,i)
const Gt = [C(1,0),C(0,0), C(0,0),C(Math.SQRT1_2,Math.SQRT1_2)];      // ~T≈π/4, но оставим i^(1/2) упрощённо

function oneQ(state, n, t, G2) {
  // применяем 2x2 к целевому кубиту t (бит t — МЛАДШИЙ разряд q0)
  const N = state.length;
  const bit = 1 << t;
  for (let base = 0; base < N; base += (bit<<1)) {
    for (let i = 0; i < bit; i++) {
      const i0 = base + i;       // |...0_t...>
      const i1 = i0 + bit;       // |...1_t...>
      const a0 = state[i0], a1 = state[i1];
      // [a0'; a1'] = G2 * [a0; a1]
      state[i0] = cAdd(cMul(G2[0], a0), cMul(G2[1], a1));
      state[i1] = cAdd(cMul(G2[2], a0), cMul(G2[3], a1));
    }
  }
}
function cnot(state, n, c, t) {
  if (c === t) return;
  const N = state.length;
  const bc = 1 << c, bt = 1 << t;
  for (let i = 0; i < N; i++) {
    if ( (i & bc) && !(i & bt) ) {
      const j = i | bt; // flip target
      const tmp = state[i];
      state[i]  = state[j];
      state[j]  = tmp;
    }
  }
}
function uFull(state, n, marked) {
  if (!Array.isArray(marked)) return;
  for (const m of marked) if (m >= 0 && m < state.length) state[m] = cScale(state[m], -1);
}
function diffuser(state, n) {
  // D = 2|s><s| - I, |s> = (1/√N) Σ|i>
  const N = state.length;
  // mean amplitude: (sum a_i)/N
  let sum = C(0,0);
  for (let i=0;i<N;i++) sum = cAdd(sum, state[i]);
  const mean = cScale(sum, 1/N);
  for (let i=0;i<N;i++) {
    // a' = 2*mean - a
    state[i] = cSub(cScale(mean, 2), state[i]);
  }
}

// прогон одного базисного столбца через все слои схемы
function evolveBasisColumn(circuit, n, basisIndex) {
  const N = 1 << n;
  const state = Array.from({length:N}, (_,i)=> C(i===basisIndex?1:0, 0));

  const layers = circuit.layers || [];
  for (const layer of layers) {
    for (const el of layer) {
      const type = String(el.type||'').toUpperCase();
      if (type === 'MEASURE' || type === 'MEASURE-ALL') continue; // унитарь без измерений

      switch (type) {
        case 'H': for (const t of (el.targets||[])) oneQ(state, n, t, Gh); break;
        case 'X': for (const t of (el.targets||[])) oneQ(state, n, t, Gx); break;
        case 'Y': for (const t of (el.targets||[])) oneQ(state, n, t, Gy); break;
        case 'Z': for (const t of (el.targets||[])) oneQ(state, n, t, Gz); break;
        case 'S': for (const t of (el.targets||[])) oneQ(state, n, t, Gs); break;
        case 'T': for (const t of (el.targets||[])) oneQ(state, n, t, Gt); break;
        case 'CNOT': {
          const c = el.control;
          for (const t of (el.targets||[])) cnot(state, n, c, t);
          break;
        }
        case 'U_FULL': uFull(state, n, el.marked||[]); break;
        case 'DIFFUSER': diffuser(state, n); break;
        default: /* неизвестный элемент — ничего не делаем */ break;
      }
    }
  }
  return state;
}
function buildUnitaryByColumns(circuit, n) {
  const N = 1 << n;
  const U = Array.from({length:N}, () => Array.from({length:N}, () => C(0,0)));
  for (let c=0;c<N;c++) {
    const col = evolveBasisColumn(circuit, n, c);
    for (let r=0;r<N;r++) U[r][c] = col[r];
  }
  return U;
}

/* ------------------- Таблица унитаря ------------------- */
function showUnitaryTable(U, n){
  const N = 1 << n;
  const html = [
    '<!doctype html><html><head><meta charset="utf-8"><title>Unitary</title>',
    '<style>body{font:12px system-ui;padding:10px;background:#0f1115;color:#e9eff7}',
    'table{border-collapse:collapse} td,th{border:1px solid #273042;padding:4px 6px;text-align:right}',
    'th{background:#151922} .idx{color:#9aa4b2;text-align:center} .re{color:#dbeafe} .im{color:#93c5fd}</style>',
    '</head><body>',
    `<h3>U (2^${n} × 2^${n})</h3>`,
    '<table><tr><th></th>',
    Array.from({length:N}, (_,c)=>`<th>c${c}</th>`).join(''),
    '</tr>',
    ...Array.from({length:N}, (_,r)=>{
      const row = U[r];
      const tds = row.map(z => {
        const re = fmt(z.re); const im = fmt(z.im);
        return `<td><span class="re">${re}</span> <span class="im">${im>=0?'+':''}${im}i</span></td>`;
      }).join('');
      return `<tr><th class="idx">r${r}</th>${tds}</tr>`;
    }),
    '</table></body></html>'
  ].join('');
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

/* ---------------------- Утилиты ------------------------ */
function toBits(i, n){ return i.toString(2).padStart(n,'0'); }
function fmt(x){ return (Math.abs(x)<1e-12?0:x).toFixed(10); }
function downloadText(filename, text){
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ---------------------- Тема --------------------------- */
function updateThemeButtonLabel(){
  const btn = dom.btnTheme; if (!btn) return;
  const mode = loadTheme(); // light | dark | system
  const label = mode === 'light' ? '☀️ Светлая'
              : mode === 'dark'  ? '🌙 Тёмная'
              : '🖥️ Системная';
  btn.textContent = label;
}
