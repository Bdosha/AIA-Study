(() => {
const { getPresetById, getPresetOptions } = window.GTLabPresets;
const {
  computeBestResponses,
  computeDilemmaIndicator,
  computeMixedStrategy2x2,
  computeParetoSet,
  findPureNash,
  formatOutcome,
} = window.GTLabAnalysis;
const { createStore, clearComputedState, normalizeDimension } = window.GTLabStore;
const MatrixUI = window.GTLabMatrixUI;
const PayoffChart = window.GTLabPayoffChart;
const ThemeController = window.GTLabThemeController;

const AUTO_STEP_INTERVAL_MS = 900;
const STORAGE_KEY = "gtlab-ui-state-v1";

const elements = {
  rowsInput: document.getElementById("rowsInput"),
  colsInput: document.getElementById("colsInput"),
  applySizeBtn: document.getElementById("applySizeBtn"),
  presetSelect: document.getElementById("presetSelect"),
  loadPresetBtn: document.getElementById("loadPreset"),
  calculateBtn: document.getElementById("calculateBtn"),
  stepBtn: document.getElementById("stepBtn"),
  autoBtn: document.getElementById("autoBtn"),
  stopBtn: document.getElementById("stopBtn"),
  resetBtn: document.getElementById("resetBtn"),
  clearMatrixBtn: document.getElementById("clearMatrixBtn"),
  randomFillBtn: document.getElementById("randomFillBtn"),
  zeroFillBtn: document.getElementById("zeroFillBtn"),
  diagonalPresetBtn: document.getElementById("diagonalPresetBtn"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  saveMatrixBtn: document.getElementById("saveMatrixBtn"),
  loadMatrixInput: document.getElementById("loadMatrixInput"),
  statusText: document.getElementById("statusText"),
  statusBadge: document.getElementById("statusBadge"),
  nashList: document.getElementById("nashList"),
  paretoList: document.getElementById("paretoList"),
  dilemmaIndicator: document.getElementById("dilemmaIndicator"),
  mixedInfo: document.getElementById("mixedInfo"),
  processLog: document.getElementById("processLog"),
  payoffChart: document.getElementById("payoffChart"),
  matrixContainer: document.getElementById("matrixContainer"),
  matrixSizeLabel: document.getElementById("matrixSizeLabel"),
  outcomesCount: document.getElementById("outcomesCount"),
  nashCount: document.getElementById("nashCount"),
  paretoCount: document.getElementById("paretoCount"),
  themeToggle: document.getElementById("themeToggle"),
};

const state = createStore(2, 2);
const matrixUI = new MatrixUI(elements.matrixContainer);
const chartUI = new PayoffChart(elements.payoffChart);

bootstrap();

function bootstrap() {
  const restored = restoreSnapshot();
  if (restored) {
    state.rows = normalizeDimension(restored.rows, 2);
    state.cols = normalizeDimension(restored.cols, 2);
    elements.rowsInput.value = String(state.rows);
    elements.colsInput.value = String(state.cols);
  }

  fillPresetSelect();

  const themeController = new ThemeController(elements.themeToggle);
  themeController.init();

  matrixUI.setInputHandler(() => {
    markDirty("Матрица изменена. Выполните расчёт заново.");
    syncCounters();
    persistSnapshot();
  });

  bindEvents();

  if (restored?.matrix) {
    rebuildMatrix(state.rows, state.cols, restored.matrix);
  } else {
    const defaultPreset = getPresetById("prisoners");
    if (defaultPreset) {
      state.rows = defaultPreset.rows;
      state.cols = defaultPreset.cols;
      elements.rowsInput.value = String(defaultPreset.rows);
      elements.colsInput.value = String(defaultPreset.cols);
      rebuildMatrix(defaultPreset.rows, defaultPreset.cols, defaultPreset.matrix);
      elements.presetSelect.value = "prisoners";
    } else {
      rebuildMatrix(state.rows, state.cols);
    }
  }

  resetOutput({ clearMatrixInputs: false, keepStatus: true });
  renderProcessLog();
  chartUI.draw([], [], new Set());
  syncCounters();
  updateButtonState();
  setStatus("Интерфейс готов. Все действия и результаты видны на одном экране.");
}

function bindEvents() {
  elements.applySizeBtn.addEventListener("click", () => {
    applyNewSize();
  });

  elements.rowsInput.addEventListener("change", applyNewSize);
  elements.colsInput.addEventListener("change", applyNewSize);

  elements.loadPresetBtn.addEventListener("click", () => {
    if (elements.presetSelect.value === "custom") {
      setStatus("Выбрана пользовательская матрица. Можно редактировать вручную.");
      return;
    }

    const preset = getPresetById(elements.presetSelect.value);
    if (!preset) return;

    state.rows = preset.rows;
    state.cols = preset.cols;
    elements.rowsInput.value = String(preset.rows);
    elements.colsInput.value = String(preset.cols);
    rebuildMatrix(preset.rows, preset.cols, preset.matrix);
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    syncCounters();
    setStatus(`Загружен пример: ${elements.presetSelect.selectedOptions[0].textContent}.`);
  });

  elements.calculateBtn.addEventListener("click", () => {
    stopAutoSolve();
    if (!computeAndRender()) return;
    applyAllHighlights();
    renderProcessLog();
    setStatus("Расчёт завершён. Итоги и подсветка обновлены.");
  });

  elements.stepBtn.addEventListener("click", () => {
    stopAutoSolve();
    if (state.dirty && !computeAndRender()) {
      return;
    }

    const hasMore = runSingleStep();
    if (!hasMore) {
      setStatus("Все шаги уже выполнены. Итог готов.");
    }
  });

  elements.autoBtn.addEventListener("click", () => {
    startAutoSolve();
  });

  elements.stopBtn.addEventListener("click", () => {
    stopAutoSolve();
    setStatus("Автопроигрывание остановлено.");
  });

  elements.resetBtn.addEventListener("click", () => {
    stopAutoSolve();
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    setStatus("Подсветка и результаты сброшены. Матрица сохранена.");
  });

  elements.clearMatrixBtn.addEventListener("click", () => {
    fillMatrixWith((row, col) => ({ u1: "", u2: "" }));
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    setStatus("Матрица очищена.");
  });

  elements.randomFillBtn.addEventListener("click", () => {
    fillMatrixWith(() => ({
      u1: randomInt(-2, 9),
      u2: randomInt(-2, 9),
    }));
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    setStatus("Матрица заполнена случайными значениями.");
  });

  elements.zeroFillBtn.addEventListener("click", () => {
    fillMatrixWith(() => ({ u1: 0, u2: 0 }));
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    setStatus("Во все ячейки поставлены нули.");
  });

  elements.diagonalPresetBtn.addEventListener("click", () => {
    fillMatrixWith((row, col) => {
      const diagBonus = row === col ? 4 : 1;
      return { u1: diagBonus, u2: diagBonus };
    });
    resetOutput({ clearMatrixInputs: false, keepStatus: true });
    setStatus("Сформирован координационный пример с усиленной диагональю.");
  });

  elements.copyReportBtn.addEventListener("click", async () => {
    if (state.dirty) {
      computeAndRender();
      applyAllHighlights();
    }

    const report = buildReportText();

    try {
      await navigator.clipboard.writeText(report);
      setStatus("Краткий отчёт скопирован в буфер обмена.");
    } catch (error) {
      setStatus("Не удалось скопировать автоматически. Текст отчёта подготовлен в консоли.");
      console.log(report);
    }
  });

  elements.saveMatrixBtn.addEventListener("click", () => {
    const payload = {
      rows: state.rows,
      cols: state.cols,
      matrix: matrixUI.read(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `game-matrix-${state.rows}x${state.cols}.json`);
    setStatus("Матрица сохранена в JSON-файл.");
  });

  elements.loadMatrixInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const rows = normalizeDimension(parsed.rows, 2);
      const cols = normalizeDimension(parsed.cols, 2);
      const matrix = sanitizeMatrix(parsed.matrix, rows, cols);

      state.rows = rows;
      state.cols = cols;
      elements.rowsInput.value = String(rows);
      elements.colsInput.value = String(cols);
      elements.presetSelect.value = "custom";
      rebuildMatrix(rows, cols, matrix);
      resetOutput({ clearMatrixInputs: false, keepStatus: true });
      syncCounters();
      setStatus(`Матрица загружена из файла: ${file.name}.`);
    } catch (error) {
      setStatus(`Не удалось загрузить JSON: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      elements.calculateBtn.click();
    }

    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      elements.autoBtn.click();
    }

    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      elements.stepBtn.click();
    }
  });
}

function applyNewSize() {
  stopAutoSolve();

  const nextRows = normalizeDimension(elements.rowsInput.value, state.rows);
  const nextCols = normalizeDimension(elements.colsInput.value, state.cols);
  const currentMatrix = matrixUI.read();
  const resizedMatrix = resizeMatrixData(currentMatrix, nextRows, nextCols);

  state.rows = nextRows;
  state.cols = nextCols;
  elements.rowsInput.value = String(nextRows);
  elements.colsInput.value = String(nextCols);

  rebuildMatrix(nextRows, nextCols, resizedMatrix);
  resetOutput({ clearMatrixInputs: false, keepStatus: true });
  syncCounters();
  setStatus(`Размер матрицы обновлён: ${nextRows} × ${nextCols}.`);
}

function rebuildMatrix(rows, cols, matrixData = null) {
  matrixUI.build(rows, cols, matrixData);
  state.rows = rows;
  state.cols = cols;
  markDirty("Матрица обновлена. Нужен новый расчёт.");
  persistSnapshot();
}

function computeAndRender() {
  state.matrix = matrixUI.read();

  if (!state.matrix.length || !state.matrix[0].length) {
    setStatus("Матрица пуста. Заполните значения выигрышей.");
    return false;
  }

  state.bestResponses = computeBestResponses(state.matrix);
  state.nashPairs = findPureNash(state.bestResponses);
  state.paretoSet = computeParetoSet(state.matrix);
  state.dilemmaResult = computeDilemmaIndicator(state.matrix, state.nashPairs);
  state.mixedResult = computeMixedStrategy2x2(state.matrix);
  state.stepSequence = buildStepSequence();
  state.currentStepIndex = 0;
  state.dirty = false;

  matrixUI.clearHighlights();
  renderResultLists();
  renderIndicator();
  renderMixedInfo();
  renderProcessLog();
  chartUI.draw(state.matrix, state.nashPairs, state.paretoSet);
  syncCounters();
  updateButtonState();
  persistSnapshot();

  return true;
}

function buildStepSequence() {
  const steps = [];

  state.bestResponses.player1ByColumn.forEach((rows, col) => {
    steps.push({
      type: "bestP1",
      col,
      rows,
      text: `Игрок 1: отмечены лучшие ответы для столбца j${col + 1}.`,
    });
  });

  state.bestResponses.player2ByRow.forEach((cols, row) => {
    steps.push({
      type: "bestP2",
      row,
      cols,
      text: `Игрок 2: отмечены лучшие ответы для строки i${row + 1}.`,
    });
  });

  steps.push({
    type: "pareto",
    text:
      state.paretoSet.size > 0
        ? "Выделены Pareto-эффективные исходы."
        : "Pareto-эффективные исходы не найдены.",
  });

  steps.push({
    type: "nash",
    text:
      state.nashPairs.length > 0
        ? "Пересечения лучших ответов отмечены как равновесия Нэша."
        : "Пересечения лучших ответов отсутствуют: чистых равновесий Нэша нет.",
  });

  return steps;
}

function applyAllHighlights() {
  matrixUI.clearHighlights();

  state.bestResponses.player1ByColumn.forEach((rows, col) => {
    matrixUI.highlightBestResponsesPlayer1(col, rows);
  });

  state.bestResponses.player2ByRow.forEach((cols, row) => {
    matrixUI.highlightBestResponsesPlayer2(row, cols);
  });

  matrixUI.highlightPareto(state.paretoSet);
  matrixUI.highlightNash(state.nashPairs, state.paretoSet);

  state.currentStepIndex = state.stepSequence.length;
  renderProcessLog();
  updateButtonState();
}

function runSingleStep() {
  if (state.currentStepIndex >= state.stepSequence.length) {
    updateButtonState();
    return false;
  }

  const step = state.stepSequence[state.currentStepIndex];

  switch (step.type) {
    case "bestP1":
      matrixUI.highlightBestResponsesPlayer1(step.col, step.rows);
      break;
    case "bestP2":
      matrixUI.highlightBestResponsesPlayer2(step.row, step.cols);
      break;
    case "pareto":
      matrixUI.highlightPareto(state.paretoSet);
      break;
    case "nash":
      matrixUI.highlightNash(state.nashPairs, state.paretoSet);
      break;
    default:
      break;
  }

  state.currentStepIndex += 1;
  renderProcessLog();
  updateButtonState();
  setStatus(step.text);

  return state.currentStepIndex < state.stepSequence.length;
}

function startAutoSolve() {
  stopAutoSolve();

  if (!state.dirty && state.currentStepIndex >= state.stepSequence.length) {
    state.currentStepIndex = 0;
    matrixUI.clearHighlights();
    renderProcessLog();
  }

  if (state.dirty && !computeAndRender()) {
    return;
  }

  setStatus("Запущено автопроигрывание шагов анализа.");
  updateButtonState(true);

  state.autoTimerId = window.setInterval(() => {
    const hasMore = runSingleStep();

    if (!hasMore) {
      stopAutoSolve();
      setStatus("Автопроигрывание завершено. Итог готов.");
    }
  }, AUTO_STEP_INTERVAL_MS);
}

function stopAutoSolve() {
  if (state.autoTimerId !== null) {
    window.clearInterval(state.autoTimerId);
    state.autoTimerId = null;
  }
  updateButtonState();
}

function resetOutput({ clearMatrixInputs = false, keepStatus = false } = {}) {
  clearComputedState(state);
  stopAutoSolve();
  matrixUI.clearHighlights();
  renderResultLists();
  renderIndicator();
  renderMixedInfo();
  renderProcessLog();
  chartUI.draw([], [], new Set());
  syncCounters();
  updateButtonState();

  if (clearMatrixInputs) {
    fillMatrixWith(() => ({ u1: "", u2: "" }));
  }

  if (!keepStatus) {
    setStatus("Состояние интерфейса очищено.");
  }

  persistSnapshot();
}

function renderResultLists() {
  renderList(
    elements.nashList,
    state.nashPairs.map(([row, col]) => {
      const cell = state.matrix[row][col];
      return `${formatOutcome(row, col)} → (${formatNumber(cell.u1)}; ${formatNumber(cell.u2)})`;
    }),
    "Чистые равновесия Нэша пока не найдены."
  );

  renderList(
    elements.paretoList,
    Array.from(state.paretoSet).map((pair) => {
      const [row, col] = pair.split(",").map(Number);
      const cell = state.matrix[row][col];
      return `${formatOutcome(row, col)} → (${formatNumber(cell.u1)}; ${formatNumber(cell.u2)})`;
    }),
    "Pareto-множество пока не вычислено."
  );
}

function renderIndicator() {
  const el = elements.dilemmaIndicator;

  if (!state.dilemmaResult) {
    el.className = "callout callout--neutral";
    el.textContent = "Ещё не вычислено.";
    return;
  }

  el.textContent = state.dilemmaResult.explanation;
  el.className = `callout ${state.dilemmaResult.isDilemma ? "callout--warning" : "callout--success"}`;
}

function renderMixedInfo() {
  const el = elements.mixedInfo;

  if (!state.mixedResult) {
    el.className = "callout callout--neutral";
    el.textContent =
      state.rows === 2 && state.cols === 2
        ? "Для этой матрицы смешанное равновесие не обнаружено."
        : "Смешанное равновесие вычисляется только для игр 2 × 2.";
    return;
  }

  el.className = "callout callout--success";
  el.innerHTML = [
    `p(i1) = <strong>${state.mixedResult.p.toFixed(3)}</strong>, p(i2) = <strong>${(1 - state.mixedResult.p).toFixed(3)}</strong>`,
    `q(j1) = <strong>${state.mixedResult.q.toFixed(3)}</strong>, q(j2) = <strong>${(1 - state.mixedResult.q).toFixed(3)}</strong>`,
    `E(u1) = <strong>${formatNumber(state.mixedResult.expectedU1)}</strong>, E(u2) = <strong>${formatNumber(state.mixedResult.expectedU2)}</strong>`,
  ].join("<br />");
}

function renderProcessLog() {
  const items = state.stepSequence.length
    ? state.stepSequence
    : [{ text: "После расчёта здесь появится последовательность шагов метода подчёркиваний." }];

  elements.processLog.innerHTML = "";

  items.forEach((step, index) => {
    const li = document.createElement("li");
    li.textContent = step.text;

    if (state.stepSequence.length && index === Math.max(0, state.currentStepIndex - 1)) {
      li.classList.add("is-active");
    }

    elements.processLog.appendChild(li);
  });
}

function renderList(target, items, fallbackText) {
  target.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = fallbackText;
    target.appendChild(li);
    return;
  }

  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    target.appendChild(li);
  });
}

function fillPresetSelect() {
  const fragment = document.createDocumentFragment();

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Пользовательская биматрица";
  fragment.appendChild(customOption);

  getPresetOptions().forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    fragment.appendChild(option);
  });

  elements.presetSelect.innerHTML = "";
  elements.presetSelect.appendChild(fragment);
}

function fillMatrixWith(factory) {
  const matrix = Array.from({ length: state.rows }, (_, row) =>
    Array.from({ length: state.cols }, (_, col) => factory(row, col))
  );

  matrixUI.write(matrix);
  markDirty("Матрица обновлена вручную.");
  syncCounters();
  persistSnapshot();
}

function resizeMatrixData(matrix, nextRows, nextCols) {
  return Array.from({ length: nextRows }, (_, row) =>
    Array.from({ length: nextCols }, (_, col) => ({
      u1: matrix?.[row]?.[col]?.u1 ?? 0,
      u2: matrix?.[row]?.[col]?.u2 ?? 0,
    }))
  );
}

function sanitizeMatrix(matrix, rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      u1: Number(matrix?.[row]?.[col]?.u1 ?? 0),
      u2: Number(matrix?.[row]?.[col]?.u2 ?? 0),
    }))
  );
}

function syncCounters() {
  const matrix = matrixUI.read();
  elements.matrixSizeLabel.textContent = `${state.rows} × ${state.cols}`;
  elements.outcomesCount.textContent = String(state.rows * state.cols);
  elements.nashCount.textContent = String(state.nashPairs.length);
  elements.paretoCount.textContent = String(state.paretoSet.size);
  state.matrix = matrix;
}

function updateButtonState(isRunning = false) {
  const running = isRunning || state.autoTimerId !== null;
  elements.stopBtn.disabled = !running;
  elements.autoBtn.disabled = running;
  elements.calculateBtn.disabled = running;
  elements.stepBtn.disabled = running || (!state.dirty && state.currentStepIndex >= state.stepSequence.length && state.stepSequence.length > 0);
}

function setStatus(message) {
  elements.statusText.textContent = message;
  elements.statusBadge.textContent = state.dirty ? "Есть несохранённый расчёт" : "Актуальный результат";
}

function markDirty(message) {
  state.dirty = true;
  state.currentStepIndex = 0;
  state.stepSequence = [];
  state.bestResponses = null;
  state.nashPairs = [];
  state.paretoSet = new Set();
  state.dilemmaResult = null;
  state.mixedResult = null;
  renderResultLists();
  renderIndicator();
  renderMixedInfo();
  renderProcessLog();
  chartUI.draw([], [], new Set());
  updateButtonState();
  elements.statusBadge.textContent = "Нужен пересчёт";
  if (message) {
    elements.statusText.textContent = message;
  }
}

function buildReportText() {
  const lines = [
    "Лабораторная работа: анализ неантагонистической игры",
    `Размер матрицы: ${state.rows} × ${state.cols}`,
    "",
    "Матрица выигрышей:",
  ];

  state.matrix.forEach((row, rowIndex) => {
    lines.push(
      `i${rowIndex + 1}: ${row
        .map((cell, colIndex) => `j${colIndex + 1}=[${formatNumber(cell.u1)}; ${formatNumber(cell.u2)}]`)
        .join("  ")}`
    );
  });

  lines.push("");
  lines.push(`Равновесия Нэша: ${state.nashPairs.length ? state.nashPairs.map(([row, col]) => formatOutcome(row, col)).join(", ") : "не обнаружены"}`);
  lines.push(`Pareto-эффективные исходы: ${state.paretoSet.size ? Array.from(state.paretoSet).map((pair) => {
    const [row, col] = pair.split(",").map(Number);
    return formatOutcome(row, col);
  }).join(", ") : "не обнаружены"}`);
  lines.push(`Признак дилеммы заключённого: ${state.dilemmaResult ? (state.dilemmaResult.isDilemma ? "обнаружен" : "не обнаружен") : "не вычислен"}`);
  lines.push(`Комментарий: ${state.dilemmaResult?.explanation ?? "—"}`);

  if (state.mixedResult) {
    lines.push(
      `Смешанное равновесие: p(i1)=${state.mixedResult.p.toFixed(3)}, q(j1)=${state.mixedResult.q.toFixed(3)}, E(u1)=${formatNumber(state.mixedResult.expectedU1)}, E(u2)=${formatNumber(state.mixedResult.expectedU2)}`
    );
  } else {
    lines.push("Смешанное равновесие: отсутствует или не применимо.");
  }

  return lines.join("\n");
}

function persistSnapshot() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rows: state.rows,
        cols: state.cols,
        matrix: matrixUI.read(),
      })
    );
  } catch (error) {
    // ignore
  }
}

function restoreSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(3);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
})();
