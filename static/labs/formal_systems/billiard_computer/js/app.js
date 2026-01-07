// Safari module prelude: ensure requestAnimationFrame exists (very old Safari fallback)
window.requestAnimationFrame ||= (cb)=> setTimeout(()=>cb(performance.now()), 16);
window.cancelAnimationFrame ||= clearTimeout;

// Логируем запуск приложения
window.logger.logSystem('Application started', {
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  }
});

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });

window.logger.logSystem('Canvas initialized', {
  canvasWidth: canvas.width,
  canvasHeight: canvas.height
});

const physics = new window.PhysicsEngine();
const logic = new window.LogicLayer(physics);
const renderer = new window.Renderer(canvas, physics, logic);
const ui = new window.UI({ physics, logic, renderer });

window.logger.logSystem('Core modules initialized', {
  physics: 'PhysicsEngine',
  logic: 'LogicLayer', 
  renderer: 'Renderer',
  ui: 'UI'
});

// Initial scene - полная очистка перед загрузкой
window.logger.logSystem('Loading initial preset', { preset: 'custom' });
logic.clear(); // Принудительная очистка перед первой загрузкой
logic.loadPreset('custom');
renderer.renderOnce();

// Шары создаются только по требованию пользователя через кнопку "Создать шарики"
// или через spawnBallsAtAllInputs() - только в центрах объектов "Вход"

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') root.classList.add('light');
window.logger.logSystem('Theme initialized', { initialTheme: savedTheme || 'dark' });

themeToggle.addEventListener('click', () => {
  const wasLight = root.classList.contains('light');
  root.classList.toggle('light');
  const newTheme = root.classList.contains('light') ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  window.logger.logUI('Theme toggled', themeToggle, { 
    from: wasLight ? 'light' : 'dark', 
    to: newTheme 
  });
});

// Menu interactions
const fileMenuBtn = document.getElementById('fileMenuBtn');
const fileMenu = document.getElementById('fileMenu');
const toggleMenu = () => {
  const isHidden = fileMenu.getAttribute('aria-hidden') === 'true';
  fileMenu.setAttribute('aria-hidden', !isHidden);
  window.logger.logUI('File menu toggled', fileMenuBtn, { opened: !isHidden });
};
fileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
document.addEventListener('click', ()=> {
  const wasOpen = fileMenu.getAttribute('aria-hidden') === 'false';
  fileMenu.setAttribute('aria-hidden','true');
  if (wasOpen) {
    window.logger.logUI('File menu closed', null, { reason: 'click_outside' });
  }
});

// About dialog
const aboutDialog = document.getElementById('aboutDialog');
document.getElementById('aboutBtn').addEventListener('click', ()=> {
  aboutDialog.showModal();
  window.logger.logUI('About dialog opened', document.getElementById('aboutBtn'));
});

// File operations
document.getElementById('exportSceneBtn').addEventListener('click', () => {
  window.logger.logUI('Export scene clicked', document.getElementById('exportSceneBtn'));
  ui.exportJSON();
});
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  window.logger.logUI('Download logs clicked', document.getElementById('exportCsvBtn'));
  const logView = document.getElementById('logView');
  if (!logView) return;
  let text = logView.textContent.trim();
  if (!text) return;
  // Каждая строка панели — новая строка CSV (одна колонка: "log")
  const lines = text.split('\n').map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
  const blob = new Blob([lines], {type: 'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `logView_${Date.now()}.csv`;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 0);
});
document.getElementById('importSceneBtn').addEventListener('click', () => {
  window.logger.logUI('Import scene clicked', document.getElementById('importSceneBtn'));
  ui.importJSON();
});

// Controls
ui.attachControls({
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  stepBtn: document.getElementById('stepBtn'),
  resetBtn: document.getElementById('resetBtn'),
  cycleBtn: document.getElementById('cycleBtn'),
  speedRange: document.getElementById('speedRange'),
  stepCount: document.getElementById('stepCount'),
  simTime: document.getElementById('simTime'),
  fps: document.getElementById('fps'),
  presetSelect: document.getElementById('presetSelect'),
  addWallBtn: document.getElementById('addWallBtn'),
  addInputBtn: document.getElementById('addInputBtn'),
  addOutputBtn: document.getElementById('addOutputBtn'),
  spawnBallsBtn: document.getElementById('spawnBallsBtn'),
  inputSpawnList: document.getElementById('inputSpawnList'),
  clearBallsBtn: document.getElementById('clearBallsBtn'),
  clearLogsBtn: document.getElementById('clearLogsBtn'),
  logView: document.getElementById('logView'),
  fileInput: document.getElementById('fileInput'),
});

// Presets API (global for quick testing)
window.BBM = { physics, logic, renderer, ui, Presets, logger };

// Логируем завершение инициализации
window.logger.logSystem('Application initialization completed', {
  modulesLoaded: ['PhysicsEngine', 'LogicLayer', 'Renderer', 'UI', 'Logger'],
  globalAPI: 'BBM'
});

window.PHYS_DEBUG = false;
// При наличии physicsEngine: physicsEngine.setDebug(window.PHYS_DEBUG);
// Можно включать debug в консоли: window.PHYS_DEBUG=true; physicsEngine.setDebug(true); // и отключать аналогично


