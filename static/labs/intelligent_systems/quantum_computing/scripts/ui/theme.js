// scripts/ui/theme.js
const STORAGE_KEY = 'qs:theme'; // 'light' | 'dark' | 'system'

export function getSystemTheme(){
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function loadTheme(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  return 'system';
}
export function saveTheme(mode){ localStorage.setItem(STORAGE_KEY, mode); }
export function applyTheme(mode){
  const root = document.documentElement;
  const effective = mode === 'system' ? getSystemTheme() : mode;
  root.setAttribute('data-theme', effective);
  root.setAttribute('data-theme-mode', mode);
}
export function initTheme(){
  const mode = loadTheme();
  applyTheme(mode);
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (mq && mq.addEventListener){
    mq.addEventListener('change', () => {
      if (loadTheme() === 'system') applyTheme('system');
    });
  }
}
export function toggleTheme(){
  const order = ['light','dark','system'];
  const cur = loadTheme();
  const idx = order.indexOf(cur);
  const next = order[(idx+1)%order.length];
  saveTheme(next);
  applyTheme(next);
  return next;
}
