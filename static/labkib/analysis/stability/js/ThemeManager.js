/**
 * Менеджер тем приложения
 * Файл: ThemeManager.js
 * Назначение: Управление переключением между светлой и тёмной темами
 */

import { saveToStorage, loadFromStorage } from './utils.js';

export class ThemeManager {
    /**
     * Конструктор класса ThemeManager
     * @param {string} defaultTheme - Тема по умолчанию ('dark-theme' или 'light-theme')
     */
    constructor(defaultTheme = 'dark-theme') {
        this.currentTheme = defaultTheme;
        this.bodyElement = document.body;
        this.themeToggleButton = null;
        this.storageKey = 'ship-stability-theme';

        this.init();
    }

    /**
     * Инициализация менеджера тем
     */
    init() {
        this.loadSavedTheme();
        this.createThemeToggle();
        this.applyTheme(this.currentTheme);
    }

    /**
     * Загрузка сохранённой темы из localStorage
     */
    loadSavedTheme() {
        const savedTheme = loadFromStorage(this.storageKey);
        if (savedTheme && this.isValidTheme(savedTheme)) {
            this.currentTheme = savedTheme;
        }
    }

    /**
     * Проверка валидности названия темы
     * @param {string} theme - Название темы для проверки
     * @returns {boolean} true если тема валидна
     */
    isValidTheme(theme) {
        return ['dark-theme', 'light-theme'].includes(theme);
    }

    /**
     * Создание кнопки переключения темы
     */
    createThemeToggle() {
        this.themeToggleButton = document.getElementById('themeToggle');

        if (!this.themeToggleButton) {
            console.warn('Элемент themeToggle не найден в DOM');
            return;
        }

        this.updateToggleButtonText();
        this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
    }

    /**
     * Переключение между темами
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
        this.applyTheme(this.currentTheme);
        this.updateToggleButtonText();
        saveToStorage(this.storageKey, this.currentTheme);
    }

    /**
     * Применение выбранной темы к документу
     * @param {string} theme - Название темы для применения
     */
    applyTheme(theme) {
        if (!this.isValidTheme(theme)) {
            console.error('Попытка применить невалидную тему:', theme);
            return;
        }

        this.bodyElement.className = theme;

        // Генерируем событие для уведомления других компонентов
        const themeChangeEvent = new CustomEvent('themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(themeChangeEvent);
    }

    /**
     * Обновление текста кнопки переключения темы
     */
    updateToggleButtonText() {
        if (this.themeToggleButton) {
            const isDark = this.currentTheme === 'dark-theme';
            this.themeToggleButton.textContent = isDark ? '☀️ Переключить на светлую тему' : '🌙 Переключить на тёмную тему';
        }
    }

    /**
     * Получение текущей активной темы
     * @returns {string} Текущая тема
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Принудительная установка темы
     * @param {string} theme - Название темы для установки
     */
    setTheme(theme) {
        if (this.isValidTheme(theme)) {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.updateToggleButtonText();
            saveToStorage(this.storageKey, theme);
        }
    }
}