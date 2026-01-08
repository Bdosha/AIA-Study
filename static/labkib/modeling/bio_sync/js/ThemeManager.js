/**
 * ThemeManager.js
 * Управление переключением между светлой и темной темами
 */

class ThemeManager {
    /**
     * Конструктор класса ThemeManager
     * Инициализирует управление темами и загружает сохраненные настройки
     */
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.themeToggle = null;
        this.themeIcon = null;
    }

    /**
     * Инициализация ThemeManager
     * Устанавливает начальную тему и добавляет обработчики событий
     */
    init() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle.querySelector('.theme-icon');
        
        // Применить сохраненную тему
        this.applyTheme(this.currentTheme);
        
        // Добавить обработчик клика
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    /**
     * Применение темы к документу
     * @param {string} theme - Название темы ('dark' или 'light')
     */
    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            this.themeIcon.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            this.themeIcon.textContent = '🌙';
        }
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    /**
     * Переключение между темами
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Получение текущей темы
     * @returns {string} Название текущей темы
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}