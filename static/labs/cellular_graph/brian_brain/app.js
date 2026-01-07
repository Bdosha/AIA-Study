// app.js
/**
 * Точка входа симулятора "Мозг Брайана" (IIFE, без модулей)
 * Подключает основные классы из window.BB, восстанавливает тему,
 * создаёт экземпляры автомата, рендерера и контроллера.
 */
;(() => {
  const BB = (window.BB = window.BB || {});
  const { BriansBrain, Renderer, Controls, theme } = BB;

  function initializeApp() {
    // 1) Применяем сохранённую тему ДО всего остального
    if (theme && theme.applyThemeFromLS) theme.applyThemeFromLS();

    // 2) Берём холст
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.getContext) {
      alert('Ваш браузер не поддерживает HTML5 Canvas.');
      return;
    }

    // 3) Создаём автомат
    const brain = new BriansBrain(50, 50);
    if (typeof brain.updateStats === 'function') brain.updateStats();

    // 4) Рендерер + текущая тема
    const renderer = new Renderer(canvas, brain);
    const currentTheme = theme && theme.getCurrentTheme ? theme.getCurrentTheme() : 'light';
    if (typeof renderer.setTheme === 'function') renderer.setTheme(currentTheme);

    // Первичная подгонка и отрисовка
    if (typeof renderer.resize === 'function') renderer.resize();
    if (typeof renderer.render === 'function') renderer.render();

    // 5) Контролы
    const controls = new Controls(brain, renderer);

    // Обновим кнопку темы (не критично)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.textContent = currentTheme === 'dark' ? '🌙' : '☀️';

    // 6) Ресайз / ре-рендер при изменении контейнера/окна
    const doResize = () => {
      if (typeof renderer.resize === 'function') renderer.resize();
      if (typeof renderer.render === 'function') renderer.render();
      if (typeof controls.updateUI === 'function') controls.updateUI();
      if (typeof controls.syncLegend === 'function') controls.syncLegend();
    };
    const container = document.querySelector('.canvas-container');
    if (window.ResizeObserver && container) {
      const ro = new ResizeObserver(() => doResize());
      ro.observe(container);
    }
    window.addEventListener('resize', doResize);

    // 7) Синхронизация легенды
    if (typeof controls.syncLegend === 'function') controls.syncLegend();

    // Логи для отладки
    console.log('✅ Симулятор "Мозг Брайана" инициализирован');
    console.log(`Размер поля: ${brain.width}×${brain.height}`);
    console.log('Текущая тема:', currentTheme);
    if (brain.rules) console.log('Начальные правила:', brain.rules);
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
