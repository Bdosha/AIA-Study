/*
 * Главный модуль приложения.
 * Обеспечивает инициализацию всех компонентов, управление интерфейсом,
 * обработку пользовательских событий, визуализацию решётки и проведение анализа случайности.
 */

import { Core } from "./modules/core.js";
import { VisualModule } from "./modules/visualModule.js";
import { UIController } from "./modules/uiController.js";
import { RandomnessAnalyzer } from "./modules/randomnessAnalyzer.js";
import { DataManager } from "./modules/dataManager.js";

/*
 * Объект ссылок на DOM-элементы интерфейса.
 * Все основные элементы управления и вывода результатов.
 */
const linkerObj = {
  rule: document.getElementById("ruleSelect"), // выбор правила автомата
  size: document.getElementById("sizeInput"), // размер решётки
  pattern: document.getElementById("patternInput"), // поле ввода шаблона
  patternError: document.getElementById("patternError"), // сообщение об ошибке длины шаблона
  start: document.getElementById("stepBtn"), // кнопка "Шаг"
  reset: document.getElementById("resetBtn"), // кнопка "Сброс"
  fill: document.getElementById("fillBtn"), // кнопка "Заполнить"
  canvas: document.getElementById("gridCanvas"), // область визуализации
  theme: document.getElementById("themeToggle"), // переключатель темы
  importJSON: document.getElementById("importJSON"), // импорт JSON
  exportJSON: document.getElementById("exportJSON"), // экспорт JSON
  exportCSV: document.getElementById("exportCSV"), // экспорт CSV
  propOnes: document.getElementById("propOnes"), // поле вывода доли единиц
  entropy: document.getElementById("entropy"), // поле вывода энтропии
  runs: document.getElementById("runs"), // поле вывода средней длины серий
  pValue: document.getElementById("pValue"), // поле вывода p-value
  randomPattern: document.getElementById("randomPatternBtn"), // кнопка "Случайный шаблон"
};

// Глобальные переменные состояния
let grid = []; // текущая матрица поколений автомата
let stepIndex = 0; // текущий номер шага симуляции
let state = { bitstream: [] }; // объект хранения битовой последовательности

// Инициализация модулей
const core = new Core(
  parseInt(linkerObj.size.value, 10),
  parseInt(linkerObj.rule.value, 10)
); // ядро ЭКлА
const visual = new VisualModule(linkerObj.canvas); // модуль визуализации
const analyzer = new RandomnessAnalyzer(); // модуль статистического анализа
const data = new DataManager(); // модуль импорта/экспорта

/*
 * Генерация случайного шаблона длиной size и вывод его в поле pattern.
 */
linkerObj.randomPattern.addEventListener("click", () => {
  const size = parseInt(linkerObj.size.value, 10);
  let pattern = "";
  for (let i = 0; i < size; i++) {
    pattern += Math.random() < 0.5 ? "0" : "1";
  }
  linkerObj.pattern.value = pattern;
  linkerObj.patternError.style.display = "none";
});

/*
 * Применяет введённый пользователем шаблон или устанавливает одиночную активную ячейку.
 * Проверяет корректность длины шаблона.
 */
function applyPattern() {
  const pattern = linkerObj.pattern.value.trim();
  const size = parseInt(linkerObj.size.value, 10);

  if (pattern && pattern.length !== size) {
    linkerObj.patternError.style.display = "block";
    throw new Error("pattern length mismatch");
  } else linkerObj.patternError.style.display = "none";

  if (pattern) {
    core.current = new Uint8Array(size);
    for (let i = 0; i < size; i++) core.current[i] = pattern[i] === "1" ? 1 : 0;
  } else {
    core.setSingleCenter();
  }
}

/*
 * Отрисовывает следующий шаг эволюции решётки.
 * При первом вызове создаёт исходное состояние.
 */
function drawNextStep() {
  if (stepIndex === 0) {
    grid = [core.current.slice()];
    visual.clear();
    visual.setSize(core.size);
    visual.drawFull(grid);
    stepIndex++;
    runAnalysisFromGrid();
    return;
  }
  if (stepIndex >= core.size) return;

  core.step();
  grid.push(core.current.slice());
  visual.clear();
  visual.setSize(core.size);
  visual.drawFull(grid);
  stepIndex++;
  runAnalysisFromGrid();
}

/*
 * Полное выполнение симуляции до конца.
 * Может использовать шаблон или случайную инициализацию.
 */
function drawFullSimulation(seedType = "center") {
  core.resize(parseInt(linkerObj.size.value, 10));
  core.setRule(parseInt(linkerObj.rule.value, 10));

  if (seedType === "random") core.randomize();
  else applyPattern();

  grid = [core.current.slice()];
  for (let i = 1; i < core.size; i++) {
    core.step();
    grid.push(core.current.slice());
  }

  visual.setSize(core.size);
  visual.clear();
  visual.drawFull(grid);

  runAnalysisFromGrid();
}

/*
 * Анализирует текущую решётку, формирует отчёт и обновляет показатели интерфейса.
 */
function runAnalysisFromGrid() {
  if (!Array.isArray(grid) || grid.length === 0) return;

  const bits = grid
    .flatMap((row) => Array.from(row))
    .filter((v) => v === 0 || v === 1);
  if (bits.length === 0) return;

  state.bitstream = bits;

  const res = analyzer.fullReport(bits);
  const prop = Number.isFinite(res.propOnes) ? res.propOnes : 0;
  const ent = Number.isFinite(res.entropy) ? res.entropy : 0;
  const runs = Number.isFinite(res.avgRunLen) ? res.avgRunLen : 0;
  const pval = Number.isFinite(res.pValueFreq) ? res.pValueFreq : 0;

  linkerObj.propOnes.textContent = (prop * 100).toFixed(2) + "%";
  linkerObj.entropy.textContent = ent.toFixed(3);
  linkerObj.runs.textContent = runs.toFixed(3);
  linkerObj.pValue.textContent = pval.toExponential(3);

  data.lastReport = { bits, res };
}

/*
 * Обновляет иконку темы (светлая/тёмная).
 */
function updateThemeIcon() {
  linkerObj.theme.textContent = document.body.classList.contains("light")
    ? "🌙"
    : "☀️";
}

/*
 * Инициализация контроллера пользовательского интерфейса.
 * Передаются коллбэки для всех кнопок.
 */
new UIController({
  linkerObj,
  onStart: () => {
    try {
      if (stepIndex === 0) {
        core.resize(parseInt(linkerObj.size.value, 10));
        core.setRule(parseInt(linkerObj.rule.value, 10));
        applyPattern();
      }
      drawNextStep();
    } catch {}
  },
  onReset: () => {
    stepIndex = 0;
    grid = [];
    visual.clear();
    linkerObj.patternError.style.display = "none";
  },
  onFill: () => {
    try {
      drawFullSimulation("pattern");
    } catch {}
  },
  onChangeParams: () => {
    stepIndex = 0;
    grid = [];
    visual.clear();
    linkerObj.patternError.style.display = "none";
  },
  onToggleTheme: () => {
    document.body.classList.toggle("light");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );
    updateThemeIcon();
    visual.clear();
    if (grid.length) visual.drawFull(grid);
  },
});

// Обработчики экспорта/импорта и снимка PNG

// Экспорт JSON: сохраняет конфигурацию и результаты анализа
linkerObj.exportJSON.addEventListener("click", () => {
  if (!data.lastReport) runAnalysisFromGrid();

  const config = {
    size: parseInt(linkerObj.size.value, 10),
    rule: parseInt(linkerObj.rule.value, 10),
    pattern: linkerObj.pattern.value.trim(),
  };

  const payload = {
    bits: state.bitstream,
    res: data.lastReport?.res || {},
    config,
  };

  data.exportJSON(payload, "report.json");
});

// Экспорт CSV: сохраняет битовую последовательность столбцом
linkerObj.exportCSV.addEventListener("click", () => {
  if (!state.bitstream?.length) {
    runAnalysisFromGrid();
  }
  data.exportCSV(state.bitstream, "bits.csv");
});

// Экспорт PNG: создаёт снимок текущей решётки
const exportBtn = document.getElementById("exportPNGBtn");
exportBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "grid.png";
  link.href = linkerObj.canvas.toDataURL("image/png");
  link.click();
});

// Импорт JSON: восстанавливает конфигурацию и результаты
linkerObj.importJSON.addEventListener("click", async () => {
  const loaded = await data.importJSON();
  if (!loaded) return;

  if (loaded.config) {
    if (loaded.config.size) linkerObj.size.value = loaded.config.size;
    if (loaded.config.rule) linkerObj.rule.value = loaded.config.rule;
    if (typeof loaded.config.pattern === "string")
      linkerObj.pattern.value = loaded.config.pattern;
  }

  if (Array.isArray(loaded.bits)) {
    state.bitstream = loaded.bits;
    const res = analyzer.fullReport(loaded.bits);
    linkerObj.propOnes.textContent = (res.propOnes * 100).toFixed(2) + "%";
    linkerObj.entropy.textContent = res.entropy.toFixed(3);
    linkerObj.runs.textContent = res.avgRunLen.toFixed(3);
    linkerObj.pValue.textContent = res.pValueFreq.toExponential(3);
    data.lastReport = { bits: loaded.bits, res };
  }

  try {
    applyPattern();
    grid = [core.current.slice()];
    drawFullSimulation("pattern");
  } catch (e) {
    console.error("Ошибка при восстановлении сетки:", e);
  }
});

// Установка сохранённой темы при загрузке страницы
if (localStorage.getItem("theme") === "light")
  document.body.classList.add("light");

updateThemeIcon();
visual.clear();
