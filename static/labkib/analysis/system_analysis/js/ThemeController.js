/**
 * Класс для управления светлой/тёмной темой интерфейса.
 */
class ThemeController {
  constructor() {
    this.currentTheme = 'dark';
    this.storageKey = 'lab-theme';
    this.button = document.getElementById('theme-toggle');
    this.init();
  }

  /**
   * Инициализирует тему: загружает из localStorage или использует по умолчанию.
   */
  init() {
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      this.currentTheme = savedTheme;
    }
    this.applyTheme();
    this.updateButtonText();
  }

  /**
   * Применяет текущую тему к документу через CSS-переменные.
   */
  applyTheme() {
    const root = document.documentElement;

    if (this.currentTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#0a0a0a');
      root.style.setProperty('--bg-secondary', '#121212');
      root.style.setProperty('--text-primary', '#e0e0e0');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--border-color', '#333');
      root.style.setProperty('--node-active', '#03dac6');
      root.style.setProperty('--node-inactive', '#444444');
      root.style.setProperty('--link-strong', '#ff4081');
      root.style.setProperty('--link-medium', '#ffb300');
      root.style.setProperty('--link-weak', '#00b0ff');
      root.style.setProperty('--button-bg', '#1f1f1f');
      root.style.setProperty('--button-hover', '#333333');
      root.style.setProperty('--panel-bg', '#1a1a1a');
      root.style.setProperty('--panel-border', '#2a2a2a');
      root.style.setProperty('--gauge-bg', '#222');
      root.style.setProperty('--gauge-low', '#f44336');
      root.style.setProperty('--gauge-mid', '#ff9800');
      root.style.setProperty('--gauge-high', '#4caf50');
      root.style.setProperty('--accent', '#6200ea');
      root.style.setProperty('--glass-bg', 'rgba(26, 26, 26, 0.85)');
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    } else {
      root.style.setProperty('--bg-primary', '#f5f5f5');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--text-primary', '#212121');
      root.style.setProperty('--text-secondary', '#757575');
      root.style.setProperty('--border-color', '#ccc');
      root.style.setProperty('--node-active', '#009688');
      root.style.setProperty('--node-inactive', '#9e9e9e');
      root.style.setProperty('--link-strong', '#e91e63');
      root.style.setProperty('--link-medium', '#ff9800');
      root.style.setProperty('--link-weak', '#2196f3');
      root.style.setProperty('--button-bg', '#e0e0e0');
      root.style.setProperty('--button-hover', '#ccc');
      root.style.setProperty('--panel-bg', '#f9f9f9');
      root.style.setProperty('--panel-border', '#ddd');
      root.style.setProperty('--gauge-bg', '#e0e0e0');
      root.style.setProperty('--gauge-low', '#f44336');
      root.style.setProperty('--gauge-mid', '#ff9800');
      root.style.setProperty('--gauge-high', '#4caf50');
      root.style.setProperty('--accent', '#6200ea');
      root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.9)');
      root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.1)');
    }

    document.body.classList.remove('dark-theme', 'light-theme');
    document.body.classList.add(`${this.currentTheme}-theme`);
  }

  /**
   * Обновляет текст на кнопке переключения темы.
   */
  updateButtonText() {
    if (this.button) {
      if (this.currentTheme === 'dark') {
        this.button.textContent = 'Светлая тема';
      } else {
        this.button.textContent = 'Тёмная тема';
      }
    }
  }

  /**
   * Переключает текущую тему и применяет изменения.
   */
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.updateButtonText();
    localStorage.setItem(this.storageKey, this.currentTheme);
  }

  /**
   * Возвращает текущую активную тему ('dark' или 'light').
   * @returns {string}
   */
  getCurrentTheme() {
    return this.currentTheme;
  }
}