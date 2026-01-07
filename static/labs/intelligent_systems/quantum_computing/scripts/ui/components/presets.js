// scripts/ui/components/presets.js
// Рендерит список пресетов как кнопки.

export function initPresets(root, { presets, onSelect }) {
  if (!root) return;
  root.innerHTML = `
    <div><strong>Пресеты</strong></div>
    <div id="preset-list" style="margin-top:8px; display:flex; flex-direction:column; gap:8px;"></div>
  `;
  const list = root.querySelector('#preset-list');

  function render() {
    list.innerHTML = '';
    for (const p of presets) {
      const btn = document.createElement('button');
      btn.textContent = p.title;
      btn.style.textAlign = 'left';
      btn.onclick = () => {
        const built = p.build();
        onSelect?.(built);
      };
      list.appendChild(btn);
    }
  }

  render();
}
