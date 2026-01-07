/* Мини-шина событий */
export class Store {
  constructor() { this.handlers = new Map(); }
  on(evt, fn) { if (!this.handlers.has(evt)) this.handlers.set(evt, new Set()); this.handlers.get(evt).add(fn); }
  emit(evt, payload) { for (const fn of (this.handlers.get(evt) || [])) fn(payload); }
}