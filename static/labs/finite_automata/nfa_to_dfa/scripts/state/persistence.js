/* Простое сохранение части сессии в localStorage */
export const Persistence = {
  save(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  load(key, fallback=null) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
    catch { return fallback; }
  }
};