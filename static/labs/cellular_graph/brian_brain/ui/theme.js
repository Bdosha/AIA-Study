// ui/theme.js
// Работа с темой документа (data-color-scheme) и иконкой переключателя.
// Использует глобальные COLORS и CELL_STATES из window.BB.

;(() => {
  const BB = (window.BB = window.BB || {});
  const { COLORS, CELL_STATES } = BB;

  const THEME_KEY = 'bb-theme';
  const root = document.documentElement;

  const getCurrentTheme = () =>
    root.getAttribute('data-color-scheme') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : '') ||
    'light';

  const setDocumentTheme = (theme) => {
    const t = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-color-scheme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.textContent = (t === 'dark') ? '🌙' : '☀️';
    return t;
  };

  const toggleDocumentTheme = () => {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    return setDocumentTheme(next);
  };

  const applyThemeFromLS = () => setDocumentTheme(getCurrentTheme());

  // SVG-курсор-прицел для Canvas
  const makeCanvasCrosshairCursor = (theme = getCurrentTheme()) => {
    const stroke = theme === 'dark' ? '%23FFFFFF' : '%23000000';
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'>
        <path d='M8 1v14M1 8h14' stroke='${stroke}' stroke-width='2' stroke-linecap='round'/>
      </svg>`;
    return `url("data:image/svg+xml,${svg.replace(/\s+/g,' ')}") 8 8, crosshair`;
  };

  const applyCanvasCursor = (canvas, theme = getCurrentTheme()) => {
    if (canvas && canvas.style) canvas.style.cursor = makeCanvasCrosshairCursor(theme);
  };

  const getSimBackground = () => {
    const val = getComputedStyle(root).getPropertyValue('--sim-field-bg').trim();
    const theme = getCurrentTheme();
    return val || (COLORS?.[theme]?.background || COLORS.light.background);
  };

  const getGridColor = () => {
    const val = getComputedStyle(root).getPropertyValue('--sim-grid-color').trim();
    return val || '#cccccc';
  };

  const getStateColor = (themeName, state) => {
    const map = COLORS?.[themeName] || COLORS.light;
    if (state === CELL_STATES.ON)    return map.ON;
    if (state === CELL_STATES.DYING) return map.DYING;
    return map.OFF;
  };

  // Экспорт в глобальный объект
  BB.theme = {
    getCurrentTheme,
    setDocumentTheme,
    toggleDocumentTheme,
    applyThemeFromLS,
    makeCanvasCrosshairCursor,
    applyCanvasCursor,
    getSimBackground,
    getGridColor,
    getStateColor,
  };
})();
