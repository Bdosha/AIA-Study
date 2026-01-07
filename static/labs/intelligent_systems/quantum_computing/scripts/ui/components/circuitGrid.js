// scripts/ui/components/circuitGrid.js
// Визуализация схемы с интерактивным добавлением элементов через prompts.
// Без dnd, но быстро и надёжно. Коллизии ловит Circuit._validateInsert().

const TYPE_LABEL = (el) => {
  if (el.type === 'CNOT') return `CNOT c=${el.control}→t=${el.targets[0]}`;
  if (el.type === 'MEASURE') return `MEASURE q=${el.targets[0]}`;
  if (el.type === 'MEASURE-ALL') return `MEASURE-ALL`;
  if (el.type === 'U_FULL') return `Oracle φ (marked=${(el.marked||[]).join(',')})`;
  if (el.type === 'DIFFUSER') return `Diffuser`;
  if (el.type === 'U2') return `U2 q=${el.targets.join(',')}`;
  return `${el.type} q=${(el.targets||[]).join(',')}`;
};

export function initCircuitGrid(root, { getCircuit, onDropElement, onRemoveElement } = {}) {
  if (!root) return;
  root.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
      <strong>Схема</strong>
      <div style="display:flex; gap:6px; align-items:center;">
        <button id="btn-add-layer">Добавить слой</button>
        <button id="btn-add-op">Добавить элемент…</button>
      </div>
    </div>
    <div id="grid-body" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
    <div class="muted" style="margin-top:8px">Подсказка: элементы можно удалять кнопкой «×» в строке.</div>
  `;

  const body = root.querySelector('#grid-body');
  const btnAddLayer = root.querySelector('#btn-add-layer');
  const btnAddOp = root.querySelector('#btn-add-op');

  // Поддержка палитры (сообщение от gatePalette)
  root.addEventListener('palette-insert', (e) => addElementWizard(e.detail?.type));

  btnAddLayer.onclick = () => {
    const c = getCircuit?.();
    if (!c) return;
    c.ensureLayers(c.layers.length + 1);
    render();
  };

  btnAddOp.onclick = () => addElementWizard();

  function addElementWizard(presetType) {
    const c = getCircuit?.();
    if (!c) return;

    let type = presetType;
    if (!type) {
      type = prompt('Тип элемента (H, X, Y, Z, S, T, CNOT, MEASURE, MEASURE-ALL, U_FULL, DIFFUSER):', 'H');
      if (!type) return;
      type = type.trim().toUpperCase();
    }

    const maxLayer = Math.max(0, c.layers.length);
    const layerIndex = parseInt(prompt(`Номер слоя [0..${maxLayer}] (существующий или новый в конце)`, String(maxLayer)), 10);
    if (!Number.isInteger(layerIndex) || layerIndex < 0) return;

    try {
      if (type === 'MEASURE-ALL' || type === 'DIFFUSER') {
        c.addElement({ type }, layerIndex);
      } else if (type === 'U_FULL') {
        // отмеченные состояния через запятую, например: "3" или "1,2"
        const markedStr = prompt('Отмеченные состояния (десятичные индексы через запятую), например 3 или 1,2:', '3') || '';
        const marked = markedStr.split(',').map(x => parseInt(x.trim(), 10)).filter(Number.isFinite);
        c.addElement({ type, marked }, layerIndex);
      } else if (type === 'CNOT') {
        const cIdx = parseInt(prompt(`Контрольный кубит [0..${c.qubits-1}]`, '0'), 10);
        const tIdx = parseInt(prompt(`Таргет-кубит [0..${c.qubits-1}]`, '1'), 10);
        c.addElement({ type: 'CNOT', control: cIdx, targets: [tIdx] }, layerIndex);
      } else if (type === 'MEASURE') {
        const q = parseInt(prompt(`Какой кубит измерить? [0..${c.qubits-1}]`, '0'), 10);
        c.addElement({ type: 'MEASURE', targets: [q] }, layerIndex);
      } else if (['H','X','Y','Z','S','T'].includes(type)) {
        const q = parseInt(prompt(`На какой кубит применить ${type}? [0..${c.qubits-1}]`, '0'), 10);
        c.addElement({ type, targets: [q] }, layerIndex);
      } else {
        alert('Неизвестный тип');
        return;
      }
      render();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  function render() {
    const c = getCircuit?.();
    body.innerHTML = '';
    if (!c) return;

    if (c.layers.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Нет слоёв';
      body.appendChild(empty);
      return;
    }

    c.layers.forEach((layer, li) => {
      const card = document.createElement('div');
      card.style.border = '1px solid #2a2f3a';
      card.style.borderRadius = '8px';
      card.style.padding = '8px';

      const title = document.createElement('div');
      title.innerHTML = `<strong>Слой ${li}</strong>`;
      card.appendChild(title);

      if (!layer || layer.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'muted';
        hint.textContent = '— пусто —';
        card.appendChild(hint);
      } else {
        const ul = document.createElement('ul');
        ul.style.margin = '6px 0 0';
        ul.style.paddingLeft = '18px';

        layer.forEach((el, ei) => {
          const liEl = document.createElement('li');
          liEl.textContent = TYPE_LABEL(el);

          const del = document.createElement('button');
          del.textContent = '×';
          del.title = 'Удалить элемент';
          del.style.marginLeft = '8px';
          del.onclick = () => {
            onRemoveElement?.({ layerIndex: li, elementIndex: ei });
            render();
          };

          liEl.appendChild(del);
          ul.appendChild(liEl);
        });

        card.appendChild(ul);
      }

      body.appendChild(card);
    });
  }

  // внешний запрос на перерисовку (main.js → render-request)
  root.addEventListener('render-request', render);
  render();
}
