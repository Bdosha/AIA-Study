/**
 * SVG-визуализация множества исходов (u1, u2) с выделением Pareto-границы и Nash-точек.
 * Рендер адаптируется под фактический размер контейнера графика.
 */
(() => {

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;

class PayoffChart {
  constructor(svg) {
    this.svg = svg;
    this.lastPayload = null;
    this.resizeRaf = null;

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.lastPayload) return;
        if (this.resizeRaf !== null) {
          window.cancelAnimationFrame(this.resizeRaf);
        }
        this.resizeRaf = window.requestAnimationFrame(() => {
          this.resizeRaf = null;
          const { matrix, nashPairs, paretoSet } = this.lastPayload;
          this.render(matrix, nashPairs, paretoSet);
        });
      });
      this.resizeObserver.observe(this.svg);
    }
  }

  clear() {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
  }

  draw(matrix, nashPairs, paretoSet) {
    this.lastPayload = {
      matrix,
      nashPairs: Array.isArray(nashPairs) ? [...nashPairs] : [],
      paretoSet: paretoSet instanceof Set ? new Set(paretoSet) : new Set(),
    };

    this.render(matrix, nashPairs, paretoSet);
  }

  render(matrix, nashPairs, paretoSet) {
    this.clear();

    const { width, height } = this.getViewport();
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    if (!matrix.length || !matrix[0].length) {
      this.drawEmptyState(width, height);
      return;
    }

    const points = [];
    matrix.forEach((row, i) => {
      row.forEach((cell, j) => {
        points.push({
          row: i,
          col: j,
          u1: Number.isFinite(cell.u1) ? cell.u1 : Number(cell.u1) || 0,
          u2: Number.isFinite(cell.u2) ? cell.u2 : Number(cell.u2) || 0,
        });
      });
    });

    if (!points.length) {
      this.drawEmptyState(width, height);
      return;
    }

    const legendLayout = this.getLegendLayout(width);

    const padding = {
      top: Math.max(legendLayout.bottom + 16, Math.round(height * 0.18), 88),
      right: Math.max(32, Math.round(width * 0.05)),
      bottom: Math.max(64, Math.round(height * 0.14)),
      left: Math.max(64, Math.round(width * 0.085)),
    };

    const { min: minU1, max: maxU1 } = normalizeBounds(points.map((point) => point.u1));
    const { min: minU2, max: maxU2 } = normalizeBounds(points.map((point) => point.u2));

    const scaleX = (value) =>
      padding.left + ((value - minU1) / (maxU1 - minU1)) * (width - padding.left - padding.right);
    const scaleY = (value) =>
      height -
      (padding.bottom + ((value - minU2) / (maxU2 - minU2)) * (height - padding.top - padding.bottom));

    this.drawChartArea(width, height, padding);
    this.drawAxesAndGrid({
      width,
      height,
      padding,
      scaleX,
      scaleY,
      minU1,
      maxU1,
      minU2,
      maxU2,
    });
    this.drawParetoLine(points, paretoSet, scaleX, scaleY, width);
    this.drawPoints(points, nashPairs, paretoSet, scaleX, scaleY, width);
    this.drawAxisLabels(width, height, padding);
    this.drawLegend(legendLayout, width);
  }

  getViewport() {
    const rawWidth = Math.round(this.svg.clientWidth || 0);
    const rawHeight = Math.round(this.svg.clientHeight || 0);

    return {
      width: rawWidth > 0 ? Math.max(rawWidth, MIN_WIDTH) : 900,
      height: rawHeight > 0 ? Math.max(rawHeight, MIN_HEIGHT) : 560,
    };
  }

  drawEmptyState(width, height) {
    const helper = createSvgElement("text", {
      x: width / 2,
      y: height / 2,
      "text-anchor": "middle",
      fill: "var(--text-muted)",
      "font-size": Math.max(14, Math.round(width * 0.02)),
      "font-weight": "600",
    });
    helper.textContent = "График появится после расчёта";
    this.svg.appendChild(helper);
  }

  drawChartArea(width, height, padding) {
    const area = createSvgElement("rect", {
      x: padding.left,
      y: padding.top,
      width: width - padding.left - padding.right,
      height: height - padding.top - padding.bottom,
      rx: Math.max(10, Math.round(width * 0.012)),
      fill: "rgba(255,255,255,0.02)",
      stroke: "var(--border)",
      "stroke-width": "1",
    });
    this.svg.appendChild(area);
  }

  drawAxesAndGrid({ width, height, padding, scaleX, scaleY, minU1, maxU1, minU2, maxU2 }) {
    const ticks = width >= 900 ? 6 : 5;
    const labelSize = width >= 900 ? 12 : 11;

    for (let i = 0; i <= ticks; i += 1) {
      const ratio = i / ticks;
      const xValue = minU1 + ratio * (maxU1 - minU1);
      const x = scaleX(xValue);
      const yValue = minU2 + ratio * (maxU2 - minU2);
      const y = scaleY(yValue);

      this.svg.appendChild(
        createSvgElement("line", {
          x1: x,
          y1: padding.top,
          x2: x,
          y2: height - padding.bottom,
          stroke: "var(--border)",
          "stroke-dasharray": "5 6",
        })
      );

      this.svg.appendChild(
        createSvgElement("line", {
          x1: padding.left,
          y1: y,
          x2: width - padding.right,
          y2: y,
          stroke: "var(--border)",
          "stroke-dasharray": "5 6",
        })
      );

      const xLabel = createSvgElement("text", {
        x,
        y: height - padding.bottom + 26,
        "text-anchor": "middle",
        fill: "var(--text-muted)",
        "font-size": labelSize,
      });
      xLabel.textContent = formatTick(xValue);
      this.svg.appendChild(xLabel);

      const yLabel = createSvgElement("text", {
        x: padding.left - 10,
        y: y + 4,
        "text-anchor": "end",
        fill: "var(--text-muted)",
        "font-size": labelSize,
      });
      yLabel.textContent = formatTick(yValue);
      this.svg.appendChild(yLabel);
    }

    this.svg.appendChild(
      createSvgElement("line", {
        x1: padding.left,
        y1: height - padding.bottom,
        x2: width - padding.right,
        y2: height - padding.bottom,
        stroke: "var(--text)",
        "stroke-width": "1.6",
      })
    );

    this.svg.appendChild(
      createSvgElement("line", {
        x1: padding.left,
        y1: padding.top,
        x2: padding.left,
        y2: height - padding.bottom,
        stroke: "var(--text)",
        "stroke-width": "1.6",
      })
    );
  }

  drawParetoLine(points, paretoSet, scaleX, scaleY, width) {
    const paretoPoints = points
      .filter((point) => paretoSet.has(`${point.row},${point.col}`))
      .sort((a, b) => a.u1 - b.u1 || a.u2 - b.u2);

    if (paretoPoints.length < 2) return;

    const polyline = createSvgElement("polyline", {
      points: paretoPoints.map((point) => `${scaleX(point.u1)},${scaleY(point.u2)}`).join(" "),
      fill: "none",
      stroke: "var(--cell-pareto)",
      "stroke-width": width >= 900 ? "3.4" : "2.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    this.svg.appendChild(polyline);
  }

  drawPoints(points, nashPairs, paretoSet, scaleX, scaleY, width) {
    const normalRadius = width >= 900 ? 6 : 5;
    const nashRadius = width >= 900 ? 8 : 7;

    points.forEach((point) => {
      const isNash = nashPairs.some(([row, col]) => row === point.row && col === point.col);
      const isPareto = paretoSet.has(`${point.row},${point.col}`);

      const circle = createSvgElement("circle", {
        cx: scaleX(point.u1),
        cy: scaleY(point.u2),
        r: isNash ? nashRadius : normalRadius,
        fill: isNash ? "var(--accent)" : "var(--text)",
        opacity: isNash ? "1" : "0.9",
      });

      if (isPareto) {
        circle.setAttribute("stroke", "var(--cell-pareto)");
        circle.setAttribute("stroke-width", isNash ? "2.8" : "2.2");
      }

      const tooltip = createSvgElement("title");
      tooltip.textContent = `(i${point.row + 1}, j${point.col + 1}): (${formatTick(point.u1)}, ${formatTick(point.u2)})`;
      circle.appendChild(tooltip);

      this.svg.appendChild(circle);
    });
  }

  drawAxisLabels(width, height, padding) {
    const size = width >= 900 ? 14 : 13;

    const xLabel = createSvgElement("text", {
      x: (padding.left + width - padding.right) / 2,
      y: height - 18,
      "text-anchor": "middle",
      fill: "var(--text)",
      "font-size": size,
      "font-weight": "700",
    });
    xLabel.textContent = "u1";

    const yLabel = createSvgElement("text", {
      x: 24,
      y: (padding.top + height - padding.bottom) / 2,
      transform: `rotate(-90 24 ${(padding.top + height - padding.bottom) / 2})`,
      "text-anchor": "middle",
      fill: "var(--text)",
      "font-size": size,
      "font-weight": "700",
    });
    yLabel.textContent = "u2";

    this.svg.append(xLabel, yLabel);
  }

  getLegendLayout(width) {
    const boxWidth = width >= 760 ? 252 : 222;
    const boxHeight = 82;
    const x = Math.max(14, width - boxWidth - 16);
    const y = 12;

    return {
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      bottom: y + boxHeight,
    };
  }

  drawLegend(layout, width) {
    const labelSize = width >= 900 ? 13 : 12;
    const firstBaseline = layout.y + 26;
    const rowGap = 23;
    const markerX = layout.x + 16;
    const textX = layout.x + 30;
    const markerRadiusNormal = width >= 900 ? 5.5 : 5;
    const markerRadiusNash = width >= 900 ? 7 : 6.5;

    this.svg.appendChild(
      createSvgElement("rect", {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        rx: 12,
        fill: "var(--panel-strong)",
        "fill-opacity": "0.9",
        stroke: "var(--border-strong)",
      })
    );

    this.svg.appendChild(
      createSvgElement("circle", {
        cx: markerX,
        cy: firstBaseline - 5,
        r: markerRadiusNormal,
        fill: "var(--text)",
      })
    );
    const label1 = createSvgElement("text", {
      x: textX,
      y: firstBaseline,
      fill: "var(--text-muted)",
      "font-size": labelSize,
      "font-family": "IBM Plex Sans, Segoe UI, sans-serif",
      "font-weight": "600",
    });
    label1.textContent = "Обычный исход";
    this.svg.appendChild(label1);

    this.svg.appendChild(
      createSvgElement("circle", {
        cx: markerX,
        cy: firstBaseline + rowGap - 5,
        r: markerRadiusNash,
        fill: "var(--accent)",
      })
    );
    const label2 = createSvgElement("text", {
      x: textX,
      y: firstBaseline + rowGap,
      fill: "var(--text-muted)",
      "font-size": labelSize,
      "font-family": "IBM Plex Sans, Segoe UI, sans-serif",
      "font-weight": "600",
    });
    label2.textContent = "Равновесие Нэша";
    this.svg.appendChild(label2);

    this.svg.appendChild(
      createSvgElement("line", {
        x1: markerX - 7,
        y1: firstBaseline + rowGap * 2 - 5,
        x2: markerX + 7,
        y2: firstBaseline + rowGap * 2 - 5,
        stroke: "var(--cell-pareto)",
        "stroke-width": "3.2",
        "stroke-linecap": "round",
      })
    );
    const label3 = createSvgElement("text", {
      x: textX,
      y: firstBaseline + rowGap * 2,
      fill: "var(--text-muted)",
      "font-size": labelSize,
      "font-family": "IBM Plex Sans, Segoe UI, sans-serif",
      "font-weight": "600",
    });
    label3.textContent = "Парето-граница";
    this.svg.appendChild(label3);
  }
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });

  return element;
}

function normalizeBounds(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: -1, max: 1 };
  }

  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }

  const range = max - min;
  const margin = range * 0.08;
  return { min: min - margin, max: max + margin };
}

function formatTick(value) {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);

  const fixed = value.toFixed(Math.abs(value) >= 10 ? 1 : 2);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

window.GTLabPayoffChart = PayoffChart;
})();
