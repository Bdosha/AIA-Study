// scripts/ui/components/matrixModal.js
import { buildCircuitUnitary, unitaryToSparseCSV } from '../../core/unitary.js';

function el(tag, attrs={}, children=[]) {
  const x = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => (k in x) ? x[k]=v : x.setAttribute(k,v));
  [].concat(children).forEach(c => x.append(c));
  return x;
}

function fmt(z) {
  const re = (z.re ?? z).toFixed(3);
  const im = (z.im ?? 0);
  const ims = Math.abs(im) < 1e-12 ? '0.000' : im.toFixed(3);
  return `${re}${im>=0?'+':''}${ims}i`;
}

export function showUnitaryOrCSV(circuit) {
  const n = circuit.qubits;
  const U = buildCircuitUnitary(circuit);
  if (n <= 4) {
    const N = 1 << n;
    const table = el('table', { className:'unitary-table' });
    for (let r=0;r<N;r++) {
      const tr = el('tr');
      for (let c=0;c<N;c++) tr.append(el('td',{}, fmt(U[r][c])));
      table.append(tr);
    }
    showModal('Итоговая унитарная матрица', table);
  } else {
    const csv = unitaryToSparseCSV(U);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = el('a', { download:'circuit_unitary_sparse.csv' });
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

export function showModal(title, contentNode) {
  const wrap = el('div', { className:'modal-wrap' });
  const box = el('div', { className:'modal-box' }, [
    el('div', { className:'modal-title', innerText: title }),
    el('div', { className:'modal-body' }, contentNode),
    el('div', { className:'modal-actions' }, [
      el('button', { className:'btn', innerText:'Закрыть', onclick: () => wrap.remove() })
    ])
  ]);
  wrap.append(box);
  document.body.append(wrap);
}

// простенькие стили, если у тебя нет global
const style = document.createElement('style');
style.textContent = `
.modal-wrap{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999}
.modal-box{background:#0f172a;color:#e5e7eb;min-width:60vw;max-width:90vw;max-height:80vh;overflow:auto;border-radius:12px;padding:16px}
.modal-title{font-weight:700;font-size:18px;margin:4px 0 12px}
.modal-body{overflow:auto}
.unitary-table{border-collapse:collapse;font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
.unitary-table td{border:1px solid #334155;padding:4px 6px;white-space:nowrap}
.modal-actions{text-align:right;margin-top:12px}
.btn{padding:6px 12px;border-radius:8px;border:1px solid #475569;background:#1e293b;color:#e5e7eb;cursor:pointer}
.btn:hover{background:#334155}
`;
document.head.appendChild(style);
