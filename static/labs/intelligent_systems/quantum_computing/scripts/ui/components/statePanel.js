// scripts/ui/components/statePanel.js
// Показ |ψ|², селектор кубита для Блоха, канвас-гистограмма и сфера Блоха.

import { blochVector } from '../../core/partialTrace.js';
import { drawProbabilityChart } from './probChart.js';
import { drawBlochSphere } from './blochView.js';

export function initStatePanel(root, { getState, getLog, onSelectBlochQubit }) {
  if (!root) return;
  root.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <strong>Состояние</strong>
      <div class="muted" id="sp-size"></div>
    </div>

    <div id="sp-probs" class="muted" style="margin-top:6px; font-variant-numeric: tabular-nums;"></div>

    <div style="margin-top:10px; display:grid; grid-template-columns: 1fr; gap:12px;">
      <canvas id="sp-prob-canvas" width="320" height="160" style="width:100%; height:160px; background:#0f1115; border:1px solid #2a2f3a; border-radius:8px;"></canvas>
    </div>

    <div style="margin-top:12px; display:flex; align-items:center; gap:8px;">
      <label>Кубит для Блоха:
        <select id="sp-bloch" style="min-width:80px"></select>
      </label>
      <span id="sp-bloch-vec" class="muted"></span>
    </div>

    <div style="margin-top:10px;">
      <canvas id="sp-bloch-canvas" width="240" height="240" style="width:100%; max-width:260px; height:auto; background:#0f1115; border:1px solid #2a2f3a; border-radius:8px;"></canvas>
    </div>

    <div style="margin-top:12px;">
      <details>
        <summary>Лог</summary>
        <div id="sp-log" class="muted" style="margin-top:6px; white-space:pre-line"></div>
      </details>
    </div>
  `;

  const elSize  = root.querySelector('#sp-size');
  const elProbs = root.querySelector('#sp-probs');
  const canvasProb = root.querySelector('#sp-prob-canvas');
  const selBloch = root.querySelector('#sp-bloch');
  const elBlochVec = root.querySelector('#sp-bloch-vec');
  const canvasBloch = root.querySelector('#sp-bloch-canvas');
  const elLog = root.querySelector('#sp-log');

  function render() {
    const st = getState?.();
    if (!st) return;

    // размер
    elSize.textContent = `кубитов: ${st.n}`;

    // вероятности
    const probs = st.probabilities();
    elProbs.textContent = probs.map((p, i) => `${i.toString(2).padStart(st.n,'0')}:${p.toFixed(3)}`).join('  ');

    // гистограмма
    drawProbabilityChart(canvasProb, probs);

    // список кубитов
    const cur = selBloch.value;
    selBloch.innerHTML = '';
    for (let i=0;i<st.n;i++) {
      const opt = document.createElement('option');
      opt.value = String(i); opt.textContent = `q${i}`;
      selBloch.appendChild(opt);
    }
    if (cur) selBloch.value = cur;

    // Блоха
    const q = Number(selBloch.value || 0);
    const v = blochVector(st.psi, st.n, q);
    elBlochVec.textContent = `⟨σ⟩ = (x:${v.x.toFixed(3)}, y:${v.y.toFixed(3)}, z:${v.z.toFixed(3)})`;
    drawBlochSphere(canvasBloch, v);

    // лог
    const log = getLog?.() || [];
    elLog.textContent = log.join('\n');
  }

  selBloch.onchange = () => onSelectBlochQubit?.(Number(selBloch.value));

  root.addEventListener('render-request', render);
  render();
}
