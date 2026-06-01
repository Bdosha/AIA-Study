/**
 * Отвечает за построение и чтение биматрицы в DOM,
 * а также за подсветку best responses, Nash и Pareto.
 */
(() => {

class MatrixUI {
  constructor(container) {
    this.container = container;
    this.onInput = () => {};
  }

  setInputHandler(handler) {
    this.onInput = typeof handler === "function" ? handler : () => {};
  }

  build(rows, cols, matrixData = null) {
    this.container.innerHTML = "";
    this.applySizingVariables(rows, cols);

    const table = document.createElement("table");
    table.className = "payoff-table";

    table.appendChild(this.createHeader(cols));

    const body = document.createElement("tbody");

    for (let row = 0; row < rows; row += 1) {
      const tr = document.createElement("tr");

      const rowHeader = document.createElement("th");
      rowHeader.scope = "row";
      rowHeader.textContent = `i${row + 1}`;
      tr.appendChild(rowHeader);

      for (let col = 0; col < cols; col += 1) {
        const td = document.createElement("td");
        td.className = "payoff-cell";
        td.dataset.row = String(row);
        td.dataset.col = String(col);

        const value = matrixData?.[row]?.[col] ?? { u1: "", u2: "" };
        td.appendChild(this.createPayoffEntry(value.u1, value.u2));
        tr.appendChild(td);
      }

      body.appendChild(tr);
    }

    table.appendChild(body);
    this.container.appendChild(table);
  }

  read() {
    const table = this.container.querySelector("table");
    if (!table) return [];

    return Array.from(table.querySelectorAll("tbody tr")).map((rowElement) =>
      Array.from(rowElement.querySelectorAll("td")).map((cell) => {
        const u1 = Number.parseFloat(cell.querySelector(".u1")?.value ?? "0");
        const u2 = Number.parseFloat(cell.querySelector(".u2")?.value ?? "0");

        return {
          u1: Number.isNaN(u1) ? 0 : u1,
          u2: Number.isNaN(u2) ? 0 : u2,
        };
      })
    );
  }

  write(matrixData) {
    matrixData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const target = this.getCell(rowIndex, colIndex);
        if (!target) return;

        const u1 = target.querySelector(".u1");
        const u2 = target.querySelector(".u2");
        if (u1) u1.value = String(cell.u1);
        if (u2) u2.value = String(cell.u2);
      });
    });
  }

  clearHighlights() {
    this.container.querySelectorAll(".payoff-cell").forEach((cell) => {
      cell.classList.remove("best-p1", "best-p2", "nash", "pareto");
    });
  }

  highlightBestResponsesPlayer1(column, rowIndexes) {
    rowIndexes.forEach((row) => {
      const cell = this.getCell(row, column);
      if (cell) cell.classList.add("best-p1");
    });
  }

  highlightBestResponsesPlayer2(row, colIndexes) {
    colIndexes.forEach((col) => {
      const cell = this.getCell(row, col);
      if (cell) cell.classList.add("best-p2");
    });
  }

  highlightPareto(paretoSet) {
    paretoSet.forEach((pair) => {
      const [row, col] = pair.split(",").map(Number);
      const cell = this.getCell(row, col);
      if (cell) cell.classList.add("pareto");
    });
  }

  highlightNash(nashPairs, paretoSet = new Set()) {
    nashPairs.forEach(([row, col]) => {
      const cell = this.getCell(row, col);
      if (!cell) return;

      cell.classList.add("nash");
      if (paretoSet.has(`${row},${col}`)) {
        cell.classList.add("pareto");
      }
    });
  }

  getCell(row, col) {
    return this.container.querySelector(`.payoff-cell[data-row="${row}"][data-col="${col}"]`);
  }

  createHeader(cols) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    const corner = document.createElement("th");
    corner.textContent = "u₁ / u₂";
    tr.appendChild(corner);

    for (let col = 0; col < cols; col += 1) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = `j${col + 1}`;
      tr.appendChild(th);
    }

    thead.appendChild(tr);
    return thead;
  }

  createPayoffEntry(u1, u2) {
    const wrapper = document.createElement("div");
    wrapper.className = "payoff-entry";

    const inputU1 = this.createNumberInput("u1", u1, "Выигрыш игрока 1");
    const inputU2 = this.createNumberInput("u2", u2, "Выигрыш игрока 2");
    wrapper.append(inputU1, inputU2);
    return wrapper;
  }

  createNumberInput(className, value, ariaLabel) {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.className = className;
    input.value = value;
    input.placeholder = "0";
    input.setAttribute("aria-label", ariaLabel);
    input.addEventListener("input", () => this.onInput());

    return input;
  }

  applySizingVariables(rows, cols) {
    const density = Math.max(rows, cols);
    const cellHeight = density <= 2 ? 126 : density === 3 ? 108 : density === 4 ? 94 : density === 5 ? 84 : 76;
    const inputHeight = density <= 2 ? 48 : density === 3 ? 42 : density === 4 ? 37 : density === 5 ? 34 : 30;
    const fontSize = density <= 2 ? 30 : density === 3 ? 24 : density === 4 ? 19 : density === 5 ? 16 : 14;
    const entryGap = density <= 3 ? 10 : density <= 4 ? 8 : 6;
    const cellPadding = density <= 2 ? 12 : density <= 4 ? 10 : 8;
    const indexWidth = density <= 2 ? 104 : density === 3 ? 92 : density === 4 ? 84 : density === 5 ? 76 : 66;

    this.container.style.setProperty("--matrix-cols", String(cols));
    this.container.style.setProperty("--matrix-rows", String(rows));
    this.container.style.setProperty("--matrix-cell-height", `${cellHeight}px`);
    this.container.style.setProperty("--matrix-input-height", `${inputHeight}px`);
    this.container.style.setProperty("--matrix-font-size", `${fontSize}px`);
    this.container.style.setProperty("--matrix-entry-gap", `${entryGap}px`);
    this.container.style.setProperty("--matrix-cell-padding", `${cellPadding}px`);
    this.container.style.setProperty("--matrix-index-width", `${indexWidth}px`);
  }
}

window.GTLabMatrixUI = MatrixUI;
})();
