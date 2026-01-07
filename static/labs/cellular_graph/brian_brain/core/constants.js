// core/constants.js
;(() => {
  const CELL_STATES = Object.freeze({
    OFF: 0,
    ON: 1,
    DYING: 2,
  });

  const COLORS = Object.freeze({
    light: Object.freeze({
      OFF: '#FFFFFF',
      ON:  '#808080',
      DYING:'#FF0000',
      background: '#FFFFFF',
    }),
    dark: Object.freeze({
      OFF: '#808080',
      ON:  '#FFFFFF',
      DYING:'#0080FF',
      background: '#2B3037',
    }),
  });

  const DEFAULT_RULES = Object.freeze({
    birthThreshold: 2,
    randomChance: 0,   // %
    wrapEdges: false,
  });

  const THEME_STORAGE_KEY = 'bb-theme';

  // Экспорт в глобальный неймспейс
  window.BB = Object.assign(window.BB || {}, {
    CELL_STATES,
    COLORS,
    DEFAULT_RULES,
    THEME_STORAGE_KEY,
  });
})();
