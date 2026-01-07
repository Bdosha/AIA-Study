/* Вспомогательная инициализация вкладок */
export function setupTabs(root) {
  const tabs = root.querySelectorAll(".tab");
  const panes = root.querySelectorAll(".tabcontent");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.toggle("active", x === t));
    panes.forEach(p => p.classList.toggle("active", p.id === `tab-${t.dataset.tab}`));
  }));
}