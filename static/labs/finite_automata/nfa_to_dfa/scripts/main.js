/* Точка входа: UI, редактор, симуляция, построение эталона и проверка */
import { Alphabet } from "./core/alphabet.js";
import { NFA } from "./core/nfa.js";
import { DFA } from "./core/dfa.js";
import { Epsilon } from "./core/epsilon.js";
import { buildDFA } from "./core/subset.js";
import { runNFA, runDFA } from "./core/simulate.js";
import { nfaToJSON } from "./core/serializer.js";
import { checkEquivalence } from "./grading/equiv.js";
import { GraphCanvas } from "./ui/graphCanvas.js";
import { SubsetTable } from "./ui/subsetTable.js";
import { Persistence } from "./state/persistence.js";

const svg = document.getElementById("graphSvg");
const canvas = new GraphCanvas(svg);
const subsetTable = new SubsetTable(document.getElementById("subsetTable"));
const logArea = document.getElementById("logArea");
const resultsArea = document.getElementById("resultsArea");

let nfa = bootstrapNFA();
let userDFA = new DFA(); userDFA.alphabet = nfa.alphabet;
let refDFA = null;

let stateCounter = 4;
let dfaCounter = 0;
let simTimer = null, simIdx = 0, nfaSteps = null, dfaSteps = null;

wireTabs();
canvas.onSelectState = (id, which) => log(`Выбрано состояние ${which.toUpperCase()}: ${id}`);
canvas.render(nfa, userDFA);
saveSession();

/* Тема */
document.getElementById("themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  html.setAttribute("data-theme", html.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

/* Вид */
document.querySelectorAll(".segmented .seg").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".segmented .seg").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    canvas.setView(btn.dataset.view);
    canvas.render(nfa, userDFA);
  });
});

/* Алфавит */
document.getElementById("alphabetInput").addEventListener("change", e => {
  nfa.alphabet.setFromCsv(e.target.value); userDFA.alphabet = nfa.alphabet;
  saveSession(); canvas.render(nfa, userDFA);
});

/* Цель редактирования для команд, кроме добавления состояния */
function currentTarget() {
  const mode = document.querySelector(".segmented .seg.active")?.dataset.view || "nfa";
  return mode === "dfa" ? "dfa" : "nfa"; // в both по умолчанию редактируем НКА
}

/* Редактор: состояния */
document.getElementById("addStateBtn").addEventListener("click", () => {
  const mode = document.querySelector(".segmented .seg.active")?.dataset.view || "nfa";
  let target = (mode === "dfa") ? "dfa" : "nfa";
  if (mode === "both") {
    const ans = prompt("Создать состояние для: 'nfa' или 'dfa'?")?.trim().toLowerCase();
    target = (ans === "dfa") ? "dfa" : "nfa";
  }

  const suggested = target === "nfa" ? `q${stateCounter}` : `D${dfaCounter}`;
  const name = prompt(`Имя нового состояния (${target.toUpperCase()}):`, suggested)?.trim();
  if (!name) return;
  if (target === "nfa" ? nfa.states.has(name) : userDFA.states.has(name)) {
    alert("Состояние с таким именем уже существует");
    return;
  }

  if (target === "nfa") {
    nfa.addState(name); stateCounter++;
    const x = 120 + (nfa.states.size - 1) * 130, y = 160 + ((nfa.states.size % 2) * 100);
    canvas.setNodePosNFA(name, { x, y });
    log(`НКА: добавлено состояние ${name}`);
  } else {
    userDFA.addState(name); dfaCounter++;
    const x = 120 + (userDFA.states.size - 1) * 130, y = 160 + ((userDFA.states.size % 2) * 100);
    canvas.setNodePosDFA(name, { x, y });
    log(`ДКА: добавлено состояние ${name}`);
  }
  canvas.render(nfa, userDFA); saveSession();
});

/* Редактор: переходы */
document.getElementById("addEdgeBtn").addEventListener("click", () => {
  const target = currentTarget();
  const from = prompt(`${target.toUpperCase()}: из какого состояния?`)?.trim();
  const to   = prompt(`${target.toUpperCase()}: в какое состояние?`)?.trim();
  if (!from || !to) return;
  const label = prompt(target === "nfa"
    ? "Метка: 'ε' (для НКА) или символы через запятую"
    : "Метка: символы через запятую")?.trim();
  if (!label) return;

  if (target === "nfa") {
    if (!nfa.states.has(from) || !nfa.states.has(to)) return alert("Нет такого состояния в НКА");
    if (label === "ε" || /^e(ps)?$/i.test(label)) nfa.addTransition(from, to, { epsilon: true });
    else nfa.addTransition(from, to, { symbols: label.split(",").map(s => s.trim()).filter(Boolean) });
    log(`НКА: переход ${from} --${label}--> ${to}`);
  } else {
    if (!userDFA.states.has(from) || !userDFA.states.has(to)) return alert("Нет такого состояния в ДКА");
    const symbols = label.split(",").map(s => s.trim()).filter(Boolean);
    if (symbols.some(s => s === "ε" || /^e(ps)?$/i.test(s))) {
      return alert("В ДКА нельзя добавлять ε-переходы.");
    }
    for (const a of symbols) userDFA.addTransition(from, a, to);
    log(`ДКА: переход ${from} --${symbols.join(",")}--> ${to}`);
  }
  canvas.render(nfa, userDFA); saveSession();
});

/* Начальное/конечное */
document.getElementById("markStartBtn").addEventListener("click", () => {
  const t = currentTarget();
  if (t === "nfa") {
    const id = canvas.selected.nfa || prompt("НКА: сделать начальным?")?.trim();
    if (!id || !nfa.states.has(id)) return alert("Нет такого состояния");
    nfa.setStart(id); log(`НКА: начальное = ${id}`);
  } else {
    const id = canvas.selected.dfa || prompt("ДКА: сделать начальным?")?.trim();
    if (!id || !userDFA.states.has(id)) return alert("Нет такого состояния");
    userDFA.setStart(id); log(`ДКА: начальное = ${id}`);
  }
  canvas.render(nfa, userDFA); saveSession();
});

document.getElementById("markFinalBtn").addEventListener("click", () => {
  const t = currentTarget();
  if (t === "nfa") {
    const id = canvas.selected.nfa || prompt("НКА: отметить конечным?")?.trim();
    if (!id || !nfa.states.has(id)) return alert("Нет такого состояния");
    if (nfa.finals.has(id)) { nfa.finals.delete(id); log(`НКА: снято конечное ${id}`); }
    else { nfa.addFinal(id); log(`НКА: назначено конечное ${id}`); }
  } else {
    const id = canvas.selected.dfa || prompt("ДКА: отметить конечным?")?.trim();
    if (!id || !userDFA.states.has(id)) return alert("Нет такого состояния");
    if (userDFA.finals.has(id)) { userDFA.finals.delete(id); log(`ДКА: снято конечное ${id}`); }
    else { userDFA.addFinal(id); log(`ДКА: назначено конечное ${id}`); }
  }
  canvas.render(nfa, userDFA); saveSession();
});

/* Удаления */
document.getElementById("deleteStateBtn").addEventListener("click", () => {
  const t = currentTarget();
  const id = (t === "nfa" ? canvas.selected.nfa : canvas.selected.dfa) || prompt(`${t.toUpperCase()}: какое состояние удалить?`)?.trim();
  if (!id) return;
  if (t === "nfa") { if (!nfa.states.has(id)) return alert("Нет такого состояния"); nfa.removeState(id); }
  else { if (!userDFA.states.has(id)) return alert("Нет такого состояния"); userDFA.removeState(id); }
  log(`${t.toUpperCase()}: удалено состояние ${id}`); canvas.render(nfa, userDFA); saveSession();
});

document.getElementById("deleteEdgeBtn").addEventListener("click", () => {
  const t = currentTarget();
  const from = prompt(`${t.toUpperCase()}: из какого состояния (from)?`)?.trim();
  if (!from) return;
  const to = prompt(`${t.toUpperCase()}: в какое (to)? (пусто — удалить все исходящие)`)?.trim();
  const raw = prompt(`${t.toUpperCase()}: метки ('ε', список, или пусто — все)` )?.trim();
  if (t === "nfa") {
    if (!nfa.states.has(from) || (to && !nfa.states.has(to))) return alert("Нет такого состояния");
    if (!raw) nfa.removeTransition(from, to || undefined, {});
    else if (raw === "ε" || /^e(ps)?$/i.test(raw)) nfa.removeTransition(from, to || undefined, { epsilon: true });
    else nfa.removeTransition(from, to || undefined, { symbols: raw.split(",").map(s=>s.trim()).filter(Boolean) });
  } else {
    if (!userDFA.states.has(from) || (to && !userDFA.states.has(to))) return alert("Нет такого состояния");
    if (!raw) userDFA.removeTransition(from); else userDFA.removeTransition(from, raw);
  }
  log(`${t.toUpperCase()}: удалены переходы из ${from}`); canvas.render(nfa, userDFA); saveSession();
});

/* Построение эталонного ДКА и трассировка */
document.getElementById("convertBtn").addEventListener("click", () => {
  subsetTable.clear();
  refDFA = buildDFA(nfa, (I, a, J) => subsetTable.addRow(I, a, J));
  log(`Построен эталонный ДКА из НКА. Состояний: ${refDFA.states.size}`);
  canvas.render(nfa, userDFA);
});

/* Проверка эквивалентности пользовательского ДКА и эталона */
document.getElementById("checkBtn").addEventListener("click", () => {
  try {
    if (!refDFA) {
      subsetTable.clear();
      refDFA = buildDFA(nfa, (I,a,J)=>subsetTable.addRow(I,a,J));
    }
    const res = checkEquivalence(userDFA, refDFA);
    if (res.equivalent) { resultsArea.textContent = "Эквивалентно эталону. 100 баллов."; log("Проверка: эквивалентно."); }
    else { resultsArea.textContent = `Неэквивалентно. Контрпример: ${res.counterexample}`; log(`Проверка: неэквивалентно. CE = ${res.counterexample}`); alert(`Контрпример: ${res.counterexample}`); }
  } catch (e) { error("Ошибка проверки: " + e.message); }
});

/* Симуляция */
document.getElementById("startBtn").addEventListener("click", () => startSim());
document.getElementById("stepBtn").addEventListener("click", () => stepSim());
document.getElementById("stopBtn").addEventListener("click", () => stopSim());
document.getElementById("resetBtn").addEventListener("click", () => resetSim());

function startSim() {
  prepareSim();
  const range = document.getElementById("speedRange");
  const val = Number(range.value), min = Number(range.min), max = Number(range.max);
  const delay = min + max - val;
  if (simTimer) clearInterval(simTimer);
  simTimer = setInterval(() => { if (!stepSim()) { clearInterval(simTimer); simTimer = null; } }, delay);
  log(`Симуляция: задержка ${delay} мс`);
}
function prepareSim() {
  if (!refDFA) refDFA = buildDFA(nfa);
  const word = document.getElementById("inputWord").value ?? "";
  const eps = new Epsilon(nfa);
  nfaSteps = runNFA(nfa, word, eps).steps;
  dfaSteps = runDFA(refDFA, word).steps;
  simIdx = 0; updateHighlights(); document.getElementById("stepCounter").textContent = "0";
}
function stepSim() {
  if (!nfaSteps || !dfaSteps) prepareSim();
  if (simIdx >= Math.max(nfaSteps.length, dfaSteps.length)) return false;
  updateHighlights(); document.getElementById("stepCounter").textContent = String(simIdx);
  simIdx++;
  if (simIdx >= Math.max(nfaSteps.length, dfaSteps.length)) {
    const word = document.getElementById("inputWord").value ?? "";
    const eps = new Epsilon(nfa);
    const nfaRes = runNFA(nfa, word, eps);
    const userRes = runDFA(userDFA, word);
    resultsArea.innerHTML = `<div>НКА: ${nfaRes.accepted ? "принято" : "не принято"}</div><div>Ваш ДКА: ${userRes.accepted ? "принято" : "не принято"}</div>`;
    return false;
  }
  return true;
}
function stopSim() { if (simTimer) { clearInterval(simTimer); simTimer = null; log("Симуляция остановлена"); } }
function resetSim() {
  stopSim(); simIdx = 0; nfaSteps = null; dfaSteps = null;
  canvas.setHighlights({ nfaStates: new Set(), dfaState: null });
  document.getElementById("stepCounter").textContent = "0";
  resultsArea.textContent = ""; log("Сброс симуляции");
}
function updateHighlights() {
  const nfaStep = nfaSteps[Math.min(simIdx, nfaSteps.length - 1)] ?? { active: [] };
  const dfaStep = dfaSteps[Math.min(simIdx, dfaSteps.length - 1)] ?? { state: null };
  canvas.setHighlights({ nfaStates: new Set(nfaStep.active || []), dfaState: dfaStep.state || null });
}

/* Импорт/экспорт */
document.getElementById("exportJsonBtn").addEventListener("click", () => exportJson());
document.getElementById("importJsonBtn").addEventListener("click", () => importJson());
document.getElementById("exportSvgBtn").addEventListener("click", () => canvas.exportSVG("graph.svg"));
document.getElementById("exportPngBtn").addEventListener("click", () => exportAsPng());
document.getElementById("importSvgBtn").addEventListener("click", () => importSVGStatic());

function exportJson() {
  const blob = new Blob([nfaToJSON(nfa)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nfa.json"; a.click();
  URL.revokeObjectURL(a.href);
}
function importJson() {
  const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json";
  input.onchange = async () => {
    const file = input.files[0]; const text = await file.text();
    try {
      const obj = JSON.parse(text);
      const nf = new NFA(); nf.alphabet = new Alphabet(obj.alphabet || []);
      (obj.states || []).forEach(s => nf.addState(s.id));
      (obj.states || []).forEach(s => { if (s.start) nf.setStart(s.id); if (s.final) nf.addFinal(s.id); });
      (obj.transitions || []).forEach(t => nf.addTransition(t.from, t.to, { symbols: t.symbols || [], epsilon: t.epsilon }));
      nfa = nf; refDFA = null; userDFA = new DFA(); userDFA.alphabet = nfa.alphabet;
      document.getElementById("alphabetInput").value = [...nf.alphabet.symbols].join(",");
      canvas.posNFA.clear(); canvas.posDFA.clear();
      canvas.render(nfa, userDFA);
      log("Импортирован NFA из JSON");
      saveSession();
    } catch (e) { error("Ошибка импорта: " + e.message); }
  };
  input.click();
}
function exportAsPng() {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    const canvasEl = document.createElement("canvas"); canvasEl.width = 1600; canvasEl.height = 900;
    const ctx = canvasEl.getContext("2d"); ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
    canvasEl.toBlob((pngBlob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(pngBlob); a.download = "graph.png"; a.click(); URL.revokeObjectURL(a.href); URL.revokeObjectURL(url); }, "image/png");
  };
  img.src = url;
}
function importSVGStatic() {
  const input = document.createElement("input"); input.type = "file"; input.accept = "image/svg+xml,.svg";
  input.onchange = async () => {
    const file = input.files[0]; const text = await file.text();
    const blob = new Blob([text], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image(); img.src = url; img.alt = "Импортированный SVG (статический)";
    img.style.maxWidth = "100%"; img.style.maxHeight = "100%"; img.style.border = "1px solid var(--border)";
    document.querySelector(".tabs .tab[data-tab='results']").click();
    resultsArea.innerHTML = ""; resultsArea.appendChild(img);
    log("Импортирован SVG (статическое изображение).");
  };
  input.click();
}

/* Вкладки */
function wireTabs() {
  const tabs = document.querySelectorAll(".tabbar .tab");
  const panes = document.querySelectorAll(".tabcontent");
  tabs.forEach(tab => tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.toggle("active", t === tab));
    panes.forEach(p => p.classList.toggle("active", p.id === `tab-${tab.dataset.tab}`));
  }));
}

/* Утилиты и пресет */
function log(msg) { const now = new Date().toLocaleTimeString(); logArea.textContent += `[${now}] ${msg}\n`; logArea.scrollTop = logArea.scrollHeight; }
function error(msg) { log("Ошибка: " + msg); alert(msg); }
function saveSession() {
  Persistence.save("nfa2dfa.session", {
    alphabet: [...nfa.alphabet.symbols],
    nfaStates: [...nfa.states], start: nfa.start, finals: [...nfa.finals]
  });
}
function bootstrapNFA() {
  const n = new NFA(); n.alphabet = new Alphabet(["a","b"]);
  ["q0","q1","q2","q3"].forEach(id => n.addState(id));
  n.setStart("q0"); n.addFinal("q3");
  n.addTransition("q0","q1",{epsilon:true});
  n.addTransition("q1","q2",{symbols:["a"]});
  n.addTransition("q2","q3",{symbols:["b"]});
  n.addTransition("q1","q1",{symbols:["b"]});
  n.addTransition("q2","q2",{symbols:["a"]});
  n.addTransition("q3","q3",{symbols:["a","b"]});
  document.getElementById("alphabetInput").value = "a,b";
  canvas.setNodePosNFA("q0",{x:120,y:160}); canvas.setNodePosNFA("q1",{x:260,y:160}); canvas.setNodePosNFA("q2",{x:400,y:160}); canvas.setNodePosNFA("q3",{x:540,y:160});
  return n;
}