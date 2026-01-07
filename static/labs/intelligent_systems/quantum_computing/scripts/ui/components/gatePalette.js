// scripts/ui/components/gatePalette.js
// Простой список «быстрых кнопок» для добавления типовых элементов в текущий слой.
// DnD не используем — откроем модальные prompt-окна в grid для выбора слоёв/кубитов.

export function initGatePalette(root, { onDragStart } = {}) {
  if (!root) return;
  root.innerHTML = `
    <div><strong>Палитра вентилей</strong></div>
    <div id="gp-buttons" style="margin-top:8px; display:grid; grid-template-columns: repeat(2, 1fr); gap:6px;"></div>
    <div style="margin-top:12px;"><strong>Алгоритмы</strong></div>
    <div id="gp-note" class="muted" style="margin-top:4px;">Алгоритмы выбираются из раздела «Пресеты» ниже.</div>
  `;

  const btns = [
    { label: 'H', type: 'H', aria: 'Хадамар' },
    { label: 'X', type: 'X', aria: 'Паули X' },
    { label: 'Y', type: 'Y', aria: 'Паули Y' },
    { label: 'Z', type: 'Z', aria: 'Паули Z' },
    { label: 'S', type: 'S', aria: 'Фаза S' },
    { label: 'T', type: 'T', aria: 'Фаза T' },
    { label: 'CNOT', type: 'CNOT', wide: true, aria: 'Контролируемый NOT' },
    { label: 'Измер.', type: 'MEASURE', wide: true, aria: 'Измерение кубита' },
    { label: 'Измерить все', type: 'MEASURE-ALL', wide: true, aria: 'Измерение всех' },
    { label: 'Oracle φ', type: 'U_FULL', wide: true, aria: 'Оракул фазы (Гровер)' },
    { label: 'Diffuser', type: 'DIFFUSER', wide: true, aria: 'Диффузор (Гровер)' },
  ];

  const grid = root.querySelector('#gp-buttons');
  grid.innerHTML = '';
  for (const b of btns) {
    const el = document.createElement('button');
    el.textContent = b.label;
    el.title = b.aria;
    if (b.wide) el.style.gridColumn = '1 / -1';
    // Палитра сама по себе не знает про схему. «Сообщим» grid'у хотение через CustomEvent:
    el.onclick = () => root.dispatchEvent(new CustomEvent('palette-insert', { detail: { type: b.type } }));
    grid.appendChild(el);
  }
}
