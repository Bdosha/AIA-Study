/**
 * Утилиты для работы с DOM: селекторы, создание элементов, навешивание событий.
 */
export const $ = (id) => document.getElementById(id);

export function on(element, event, handler) {
  element.addEventListener(event, handler);
}

export function createElement(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key in el) {
      try {
        el[key] = value;
      } catch(e) {
        el.setAttribute(key, value);
      }
    } else {
      el.setAttribute(key, value);
    }
  }
  children.flat().forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  return el;
}
