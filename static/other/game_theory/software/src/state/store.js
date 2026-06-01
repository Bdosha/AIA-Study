(() => {
const MAX_DIMENSION = 6;

function normalizeDimension(rawValue, fallback = 2) {
  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(MAX_DIMENSION, parsed));
}

function createStore(rows = 2, cols = 2) {
  return {
    rows,
    cols,
    matrix: [],
    bestResponses: null,
    nashPairs: [],
    paretoSet: new Set(),
    dilemmaResult: null,
    mixedResult: null,
    stepSequence: [],
    currentStepIndex: 0,
    autoTimerId: null,
    dirty: true,
  };
}

function clearComputedState(state) {
  state.bestResponses = null;
  state.nashPairs = [];
  state.paretoSet = new Set();
  state.dilemmaResult = null;
  state.mixedResult = null;
  state.stepSequence = [];
  state.currentStepIndex = 0;
  state.dirty = true;
}

window.GTLabStore = {
  normalizeDimension,
  createStore,
  clearComputedState,
};
})();
