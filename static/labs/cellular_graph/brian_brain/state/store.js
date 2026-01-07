// state/store.js
// Централизованное состояние + pub/sub для UI (IIFE, без модулей).
// Зависимости берём из window.BB.theme и window.BB.persistence.

;(() => {
  const BB = (window.BB = window.BB || {});
  const { theme, persistence } = BB || {};
  const {
    saveRulesToLS,
    loadRulesFromLS,
    saveGridSnapshotToLS,
    loadGridSnapshotFromLS,
    saveThemeToLS,
  } = (persistence || {});

  // --- приватное состояние ---
  const state = {
    // UI/системные
    theme:
      (theme && theme.getCurrentTheme && theme.getCurrentTheme()) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('bb-theme') : '') ||
      'light',
    speed: 100,
    isRunning: false,
    showHeatmap: false,

    // инфо о поле (истина живёт в BriansBrain)
    width: 50,
    height: 50,

    // правила (для синка с контролами; применять должен BriansBrain)
    rules: {
      birthThreshold: 2,
      randomChance: 0,
      wrapEdges: false,
    },

    // последний сохранённый снапшот сетки (опционально)
    gridSnapshot: null,
  };

  // --- инициализация из LS (гидрация) ---
  try {
    const savedRules = loadRulesFromLS && loadRulesFromLS();
    if (savedRules && typeof savedRules === 'object') {
      state.rules = {
        birthThreshold:
          'birthThreshold' in savedRules ? (savedRules.birthThreshold | 0) : state.rules.birthThreshold,
        randomChance:
          'randomChance' in savedRules ? (savedRules.randomChance | 0) : state.rules.randomChance,
        wrapEdges:
          'wrapEdges' in savedRules ? !!savedRules.wrapEdges : state.rules.wrapEdges,
      };
    }

    const snap = loadGridSnapshotFromLS && loadGridSnapshotFromLS();
    if (snap != null) state.gridSnapshot = snap;
  } catch (e) {
    console.warn('store: не удалось восстановить состояние из LS', e);
  }

  // --- pub/sub ---
  const listeners = new Set();
  function notify() {
    const snap = getState();
    for (const fn of listeners) {
      try { fn(snap); } catch {}
    }
  }

  // защитное копирование
  function getState() {
    return Object.freeze({
      theme: state.theme,
      speed: state.speed,
      isRunning: state.isRunning,
      showHeatmap: state.showHeatmap,
      width: state.width,
      height: state.height,
      rules: { ...state.rules },
      gridSnapshot: state.gridSnapshot,
    });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.add(fn);
    try { fn(getState()); } catch {}
    return () => listeners.delete(fn);
  }

  // --- экшены ---
  function setTheme(nextTheme) {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    if (state.theme === nextTheme) return;
    state.theme = nextTheme;
    try { saveThemeToLS && saveThemeToLS(nextTheme); } catch {}
    try { typeof localStorage !== 'undefined' && localStorage.setItem('bb-theme', nextTheme); } catch {}
    notify();
  }

  function setSpeed(ms) {
    const v = Math.max(1, ms | 0);
    if (v === state.speed) return;
    state.speed = v;
    notify();
  }

  function setRunning(flag) {
    const v = !!flag;
    if (v === state.isRunning) return;
    state.isRunning = v;
    notify();
  }

  function setShowHeatmap(flag) {
    const v = !!flag;
    if (v === state.showHeatmap) return;
    state.showHeatmap = v;
    notify();
  }

  function setFieldSize(w, h) {
    const W = Math.max(1, w | 0);
    const H = Math.max(1, h | 0);
    let changed = false;
    if (W !== state.width)  { state.width = W;  changed = true; }
    if (H !== state.height) { state.height = H; changed = true; }
    if (changed) notify();
  }

  function setRules(patch) {
    if (!patch || typeof patch !== 'object') return;
    const next = {
      birthThreshold: ('birthThreshold' in patch) ? (patch.birthThreshold | 0) : state.rules.birthThreshold,
      randomChance:   ('randomChance'   in patch) ? (patch.randomChance   | 0) : state.rules.randomChance,
      wrapEdges:      ('wrapEdges'      in patch) ? !!patch.wrapEdges            : state.rules.wrapEdges,
    };

    const same =
      next.birthThreshold === state.rules.birthThreshold &&
      next.randomChance   === state.rules.randomChance &&
      next.wrapEdges      === state.rules.wrapEdges;

    if (same) return;
    state.rules = next;
    try { saveRulesToLS && saveRulesToLS(state.rules); } catch {}
    notify();
  }

  // Можно хранить как угодно сериализуемый снапшот (sparse/2D)
  function setGridSnapshot(gridData) {
    if (gridData == null) return;
    state.gridSnapshot = gridData;
    try { saveGridSnapshotToLS && saveGridSnapshotToLS(gridData); } catch {}
    notify();
  }

  function clearGridSnapshot() {
    state.gridSnapshot = null;
    try { saveGridSnapshotToLS && saveGridSnapshotToLS(null); } catch {}
    notify();
  }

  // --- публичный API (в глобальный неймспейс) ---
  const Store = {
    // чтение
    getState,
    subscribe,

    // запись
    setTheme,
    setSpeed,
    setRunning,
    setShowHeatmap,
    setFieldSize,
    setRules,
    setGridSnapshot,
    clearGridSnapshot,
  };

  BB.Store = Store;
  BB.store = Store;
})();