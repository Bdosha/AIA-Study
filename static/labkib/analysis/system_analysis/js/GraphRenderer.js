/**
 * Класс для отрисовки графа связей подсистем в SVG.
 * Отвечает за визуализацию и интерактивность.
 */
class GraphRenderer {
  /**
   * @param {string} containerId — ID DOM-элемента, куда вставлять SVG
   * @param {number} width — ширина SVG
   * @param {number} height — высота SVG
   */
  constructor(containerId, width = 2000, height = 1500) {
    this.container = document.getElementById(containerId);
    this.width = width;
    this.height = height;
    this.svg = null;
    this.system = null; // Ссылка на SystemModel
    this.nodeRadius = 60;
    this.nodePositions = new Map(); // id -> {x, y}
    this.scale = 1; // Масштаб SVG
    this.translateX = 0;
    this.translateY = 0;

    this.tooltip = null;
    this.currentHoveredNodeId = null;
    this.tooltipTimeoutId = null;
  }

  /**
   * Инициализирует SVG-контейнер.
   */
  init() {
    if (!this.container) {
      console.error(`Container with ID '${this.containerId}' not found.`);
      return;
    }

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", this.width);
    this.svg.setAttribute("height", this.height);
    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
    this.svg.setAttribute("class", "graph-svg");

    this.svg.addEventListener('wheel', (e) => this.#handleZoom(e));
    this.svg.addEventListener('mousedown', (e) => this.#handlePanStart(e), { once: true });

    this.container.innerHTML = "";
    this.container.appendChild(this.svg);
  }

  /**
   * Обработка колеса мыши для зума
   * @private
   */
  #handleZoom(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.scale = Math.max(0.5, Math.min(2, this.scale + delta));
    this.svg.setAttribute("viewBox", `${this.translateX} ${this.translateY} ${this.width / this.scale} ${this.height / this.scale}`);
  }

  /**
   * Обработка начала перетаскивания вида (panning)
   * @private
   */
  #handlePanStart(e) {
    if (e.button === 1 && !this.dragging) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      let lastX = startX;
      let lastY = startY;

      const onMouseMove = (moveEvent) => {
        const dx = (moveEvent.clientX - lastX) / this.scale;
        const dy = (moveEvent.clientY - lastY) / this.scale;
        this.translateX -= dx;
        this.translateY -= dy;
        this.svg.setAttribute("viewBox", `${this.translateX} ${this.translateY} ${this.width / this.scale} ${this.height / this.scale}`);
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.svg.addEventListener('mousedown', (ev) => this.#handlePanStart(ev), { once: true });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  }

  /**
   * Вычисляет и сохраняет фиксированные позиции для подсистем в конфигурации.
   * @private
   * @param {Array<Object>} subsystems — массив подсистем
   * @returns {Map<string, {x, y}>} — мапа id -> {x, y}
   */
  #calculateStaticLayout(subsystems) {
    const positions = new Map();
    const count = subsystems.length;
    if (count === 0) return positions;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    // Увеличен радиус для более разреженного расположения
    const radius = Math.min(this.width, this.height) * 0.42;

    subsystems.forEach((subsystem, i) => {
      const angle = (i / count) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(subsystem.id, { x, y });
    });

    return positions;
  }

  /**
   * Отрисовывает граф на основе текущего SystemModel.
   * @param {SystemModel} system
   */
  render(system) {
    if (!this.svg) {
      console.error("SVG not initialized. Call init() first.");
      return;
    }
    this.system = system;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);

    this.staticLayout = this.#calculateStaticLayout(this.system.subsystems);

    this.nodePositions.clear();
    this.system.subsystems.forEach(subsystem => {
      const staticPos = this.staticLayout.get(subsystem.id);
      if (staticPos) {
        this.nodePositions.set(subsystem.id, staticPos);
      }
    });

    this.svg.innerHTML = "";

    // Рисуем связи
    this.system.links.forEach(link => {
      this.#drawLink(link);
    });

    // Рисуем узлы
    this.system.subsystems.forEach(subsystem => {
      this.#drawNode(subsystem);
    });
  }

  /**
   * Рисует связь между двумя подсистемами.
   * @private
   * @param {Object} link — { from, to, strength, feedback }
   */
  #drawLink(link) {
    const fromPos = this.nodePositions.get(link.from);
    const toPos = this.nodePositions.get(link.to);

    if (!fromPos || !toPos) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromPos.x);
    line.setAttribute("y1", fromPos.y);
    line.setAttribute("x2", toPos.x);
    line.setAttribute("y2", toPos.y);

    if (link.strength === "сильная") {
      line.setAttribute("stroke", "var(--link-strong)");
      line.setAttribute("stroke-width", "3");
    } else if (link.strength === "средняя") {
      line.setAttribute("stroke", "var(--link-medium)");
      line.setAttribute("stroke-width", "2");
    } else {
      line.setAttribute("stroke", "var(--link-weak)");
      line.setAttribute("stroke-width", "1");
    }

    if (link.feedback) {
      line.setAttribute("stroke-dasharray", "5, 5");
    }

    this.svg.appendChild(line);
  }

  /**
   * Рисует узел (подсистему) как круг с подписью.
   * @private
   * @param {Object} subsystem — { id, type, status, feedback }
   */
  #drawNode(subsystem) {
    const pos = this.nodePositions.get(subsystem.id);
    if (!pos) return;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pos.x);
    circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", this.nodeRadius);
    circle.setAttribute("data-id", subsystem.id);
    circle.setAttribute("class", `node ${subsystem.status === "активна" ? "active" : ""}`);
    circle.setAttribute("fill", subsystem.status === "активна" ? "var(--node-active)" : "var(--node-inactive)");
    circle.setAttribute("stroke", "var(--accent)");
    circle.setAttribute("stroke-width", "3");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y + 10); // Смещение для центрирования шрифта
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "var(--text-primary)");
    text.setAttribute("font-size", "32");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("pointer-events", "none");
    text.textContent = subsystem.name || subsystem.id;

    this.svg.appendChild(circle);
    this.svg.appendChild(text);

    // Обработчики наведения для тултипа
    const showTooltip = (e) => {
      this.currentHoveredNodeId = subsystem.id;
      if (this.tooltipTimeoutId) {
        clearTimeout(this.tooltipTimeoutId);
        this.tooltipTimeoutId = null;
      }
      this.#showTooltip(subsystem, e.clientX, e.clientY);
    };

    const hideTooltip = () => {
      if (this.currentHoveredNodeId === subsystem.id) {
        this.tooltipTimeoutId = setTimeout(() => {
          this.#removeTooltip();
          this.currentHoveredNodeId = null;
          this.tooltipTimeoutId = null;
        }, 300);
      }
    };

    circle.addEventListener('mouseenter', showTooltip);
    circle.addEventListener('mouseleave', hideTooltip);

    // Визуальные эффекты при наведении
    circle.addEventListener('mouseover', () => {
      circle.setAttribute("r", this.nodeRadius * 1.1); // Увеличиваем радиус
      circle.setAttribute("stroke-width", "5"); // Увеличиваем обводку
      text.setAttribute("font-size", "35"); // Увеличиваем шрифт
    });

    circle.addEventListener('mouseout', () => {
      circle.setAttribute("r", this.nodeRadius);
      circle.setAttribute("stroke-width", "3");
      text.setAttribute("font-size", "32");
    });
  }

  /**
   * Показывает облачко с информацией об узле.
   * @private
   * @param {Object} subsystem — { id, type, status, feedback, name }
   * @param {number} clientX — координата X курсора
   * @param {number} clientY — координата Y курсора
   */
  #showTooltip(subsystem, clientX, clientY) {
    this.#removeTooltip();

    const tooltipDiv = document.createElement('div');
    tooltipDiv.className = 'graph-tooltip';

    const displayName = subsystem.name || subsystem.id;
    tooltipDiv.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>${displayName}</strong><br>
        <span>Тип: ${subsystem.type}</span><br>
        <span>Статус: ${subsystem.status}</span><br>
        <span>Обратная связь: ${subsystem.feedback ? 'Да' : 'Нет'}</span>
      </div>
      <button class="tooltip-btn" data-id="${subsystem.id}">Симулировать отказ</button>
    `;

    document.body.appendChild(tooltipDiv);
    this.tooltip = tooltipDiv;

    // Логика позиционирования
    const tooltipRect = tooltipDiv.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = clientY + 10;
    let left = clientX + 10;

    // Проверяем, не выходит ли тултип за нижнюю границу
    if (top + tooltipRect.height > viewportHeight) {
        top = clientY - tooltipRect.height - 10; // Позиционируем сверху от курсора
        if (top < 0) {
            top = 10; // Минимальный отступ сверху
        }
    }

    // Проверяем, не выходит ли тултип за правую границу
    if (left + tooltipRect.width > viewportWidth) {
        left = clientX - tooltipRect.width - 10; // Позиционируем слева от курсора
        if (left < 0) {
            left = 10; // Минимальный отступ слева
        }
    }

    // Применяем рассчитанные координаты
    tooltipDiv.style.top = `${top}px`;
    tooltipDiv.style.left = `${left}px`;

    const failBtn = tooltipDiv.querySelector(`.tooltip-btn[data-id="${subsystem.id}"]`);
    if (failBtn) {
      failBtn.addEventListener('click', () => {
        window.onNodeClick && window.onNodeClick(subsystem.id);
        this.#removeTooltip();
        this.currentHoveredNodeId = null;
        if (this.tooltipTimeoutId) {
            clearTimeout(this.tooltipTimeoutId);
            this.tooltipTimeoutId = null;
        }
      });
    }

    const keepTooltip = () => {
      if (this.tooltipTimeoutId) {
        clearTimeout(this.tooltipTimeoutId);
        this.tooltipTimeoutId = null;
      }
    };

    const removeTooltipDelayed = () => {
      this.tooltipTimeoutId = setTimeout(() => {
        this.#removeTooltip();
        this.currentHoveredNodeId = null;
        this.tooltipTimeoutId = null;
      }, 300);
    };

    tooltipDiv.addEventListener('mouseenter', keepTooltip);
    tooltipDiv.addEventListener('mouseleave', removeTooltipDelayed);
  }

  /**
   * Удаляет текущее облачко, если оно есть.
   * @private
   */
  #removeTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    if (this.tooltipTimeoutId) {
      clearTimeout(this.tooltipTimeoutId);
      this.tooltipTimeoutId = null;
    }
  }

  /**
   * Обновляет визуальное состояние узла (например, при отказе).
   * @param {string} id — ID подсистемы
   * @param {Object} newProps — { status?, critical? }
   */
  updateNode(id, newProps) {
    const circle = this.svg.querySelector(`circle[data-id="${id}"]`);
    if (!circle) return;

    if (newProps.status) {
      circle.setAttribute("fill", newProps.status === "активна" ? "var(--node-active)" : "var(--node-inactive)");
      if(newProps.status === "активна") {
        circle.classList.add('active');
      } else {
        circle.classList.remove('active');
      }
    }
    if (newProps.critical) {
      circle.setAttribute("stroke", "var(--gauge-low)");
      circle.setAttribute("stroke-width", "4");
    }
  }

  /**
   * Удаляет узел и все связанные с ним линии из SVG.
   * @param {string} id — ID подсистемы
   */
  removeNode(id) {
    // Удаляем узел (круг) из SVG
    const circle = this.svg.querySelector(`circle[data-id="${id}"]`);
    if (circle) circle.remove();

    // Удаляем ТЕКСТ узла из SVG
    const pos = this.nodePositions.get(id);
    if (pos) {
        // Ищем текст по координатам (x, y + смещение)
        const textY = pos.y + 10; // Используем то же смещение, что и в #drawNode
        const textElement = Array.from(this.svg.querySelectorAll('text')).find(t => 
            parseFloat(t.getAttribute('x')) === pos.x && 
            parseFloat(t.getAttribute('y')) === textY
        );
        if (textElement) {
            textElement.remove();
        }
    }

    // Удаляем все линии, в которых участвует этот узел
    this.svg.querySelectorAll('line').forEach(line => {
      const x1 = parseFloat(line.getAttribute('x1'));
      const y1 = parseFloat(line.getAttribute('y1'));
      const x2 = parseFloat(line.getAttribute('x2'));
      const y2 = parseFloat(line.getAttribute('y2'));

      const matchesStart = Math.abs(x1 - pos.x) < 0.1 && Math.abs(y1 - pos.y) < 0.1;
      const matchesEnd = Math.abs(x2 - pos.x) < 0.1 && Math.abs(y2 - pos.y) < 0.1;

      if (matchesStart || matchesEnd) {
        line.remove();
      }
    });

    // Позиция узла удаляется из this.nodePositions
    this.nodePositions.delete(id);

    // Удаляем тултип, если он был открыт для удаляемого узла
    if (this.tooltip && this.currentHoveredNodeId === id) {
      this.#removeTooltip();
      this.currentHoveredNodeId = null;
    }
  }
}