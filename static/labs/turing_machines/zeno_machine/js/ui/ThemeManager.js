
// js/ui/ThemeManager.js
/**
 * Класс для управления темами оформления приложения
 */
class ThemeManager {
    /**
     * Конструктор менеджера тем
     */
    constructor() {
        // Текущая активная тема
        this.currentTheme = 'dark'; // По умолчанию тёмная тема
        
        // Элементы DOM
        this.themeToggle = null;
        
        // Обработчики событий
        this.themeToggleHandler = null;
        this.systemThemeHandler = null;
        
        // Инициализация
        this.init();
    }

    /**
     * Инициализация менеджера тем
     */
    init() {
        this.findDOMElements();
        this.loadThemeFromStorage();
        this.setupEventListeners();
        this.applyTheme(this.currentTheme);
        
        console.log('✅ ThemeManager инициализирован');
    }

    /**
     * Поиск необходимых DOM элементов
     */
    findDOMElements() {
        this.themeToggle = document.getElementById('themeToggle');
        
        if (!this.themeToggle) {
            console.warn('Не найден переключатель темы');
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Создаем обработчики с привязкой контекста
        this.themeToggleHandler = this.handleThemeToggle.bind(this);
        this.systemThemeHandler = this.handleSystemThemeChange.bind(this);
        
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', this.themeToggleHandler);
        }
        
        // Обработка системных предпочтений темы
        this.setupSystemThemeListener();
    }

    /**
     * Обработка системных предпочтений темы
     */
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            
            // Проверка начальных предпочтений
            if (mediaQuery.matches && !localStorage.getItem('l-system-theme')) {
                this.switchTheme('light');
            }
            
            // Слушатель изменений системных предпочтений
            mediaQuery.addEventListener('change', this.systemThemeHandler);
        }
    }

    /**
     * Обработчик изменения системной темы
     * @param {MediaQueryListEvent} event - Событие изменения темы
     */
    handleSystemThemeChange(event) {
        // Меняем тему только если пользователь не выбирал её явно
        if (!localStorage.getItem('l-system-theme')) {
            this.switchTheme(event.matches ? 'light' : 'dark');
        }
    }

    /**
     * Обработчик переключения темы
     */
    handleThemeToggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.switchTheme(newTheme);
    }

    /**
     * Загрузка темы из localStorage
     */
    loadThemeFromStorage() {
        try {
            const savedTheme = localStorage.getItem('l-system-theme');
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                this.currentTheme = savedTheme;
            }
        } catch (error) {
            console.warn('Не удалось загрузить тему из localStorage:', error);
        }
    }

    /**
     * Сохранение темы в localStorage
     */
    saveThemeToStorage() {
        try {
            localStorage.setItem('l-system-theme', this.currentTheme);
        } catch (error) {
            console.warn('Не удалось сохранить тему в localStorage:', error);
        }
    }

    /**
     * Переключение темы
     * @param {string} newTheme - Новая тема ('light' или 'dark')
     */
    switchTheme(newTheme) {
        if (newTheme !== 'light' && newTheme !== 'dark') {
            console.warn('Некорректное название темы:', newTheme);
            return;
        }

        if (this.currentTheme === newTheme) {
            return; // Тема уже активна
        }

        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        this.saveThemeToStorage();
        this.updateToggleState();
        
        // Отправка события о смене темы
        this.dispatchThemeChangeEvent();
        
        console.log(`🎨 Тема изменена на: ${newTheme}`);
    }

    /**
     * Применение темы к документу
     * @param {string} theme - Название темы
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateToggleText();
        
        // Применяем дополнительные стили для canvas элементов
        this.applyThemeToCanvas(theme);
    }

    /**
     * Применение темы к canvas элементам
     * @param {string} theme - Название темы
     */
    applyThemeToCanvas(theme) {
        const canvas2d = document.getElementById('canvas2d');
        const container3d = document.getElementById('container3d');
        
        if (canvas2d) {
            const ctx = canvas2d.getContext('2d');
            if (ctx) {
                // Перерисовываем canvas при смене темы
                setTimeout(() => {
                    if (window.lSystemsApp && window.lSystemsApp.renderer2D) {
                        window.lSystemsApp.renderer2D.draw();
                    }
                }, 100);
            }
        }
        
        if (container3d && window.lSystemsApp && window.lSystemsApp.renderer3D) {
            // Для 3D рендерера обновляем фон сцены
            const renderer3D = window.lSystemsApp.renderer3D;
            if (renderer3D.scene) {
                renderer3D.scene.background = new THREE.Color(
                    theme === 'light' ? 0xf5f5f5 : 0x1a1a1a
                );
            }
        }
    }

    /**
     * Обновление текста переключателя
     */
    updateToggleText() {
        if (this.themeToggle) {
            this.themeToggle.textContent = this.currentTheme === 'light' 
                ? '🌞 Светлая тема' 
                : '🌙 Тёмная тема';
            
            // Добавляем классы для стилизации
            this.themeToggle.classList.remove('theme-light', 'theme-dark');
            this.themeToggle.classList.add(`theme-${this.currentTheme}`);
        }
    }

    /**
     * Обновление состояния переключателя
     */
    updateToggleState() {
        this.updateToggleText();
    }

    /**
     * Отправка события о смене темы
     */
    dispatchThemeChangeEvent() {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: this.currentTheme,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Получение текущей темы
     * @returns {string} Текущая тема
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Проверка, является ли тема светлой
     * @returns {boolean} true если тема светлая
     */
    isLightTheme() {
        return this.currentTheme === 'light';
    }

    /**
     * Проверка, является ли тема тёмной
     * @returns {boolean} true если тема тёмная
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Получение контрастного цвета для текущей темы
     * @returns {string} HEX код контрастного цвета
     */
    getContrastColor() {
        return this.currentTheme === 'light' ? '#000000' : '#ffffff';
    }

    /**
     * Получение цвета фона для текущей темы
     * @returns {string} HEX код цвета фона
     */
    getBackgroundColor() {
        return this.currentTheme === 'light' ? '#ffffff' : '#1a1a1a';
    }

    /**
     * Получение состояния менеджера тем
     * @returns {Object} Объект с состоянием
     */
    getState() {
        return {
            currentTheme: this.currentTheme,
            themeToggleExists: !!this.themeToggle,
            hasSystemThemeSupport: !!window.matchMedia,
            systemPrefersLight: window.matchMedia ? 
                window.matchMedia('(prefers-color-scheme: light)').matches : false
        };
    }

    /**
     * Сброс темы к системным настройкам
     */
    resetToSystemTheme() {
        localStorage.removeItem('l-system-theme');
        
        if (window.matchMedia) {
            const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
            this.switchTheme(prefersLight ? 'light' : 'dark');
        } else {
            this.switchTheme('dark');
        }
    }

    /**
     * Циклическое переключение между темами
     */
    cycleThemes() {
        const themes = ['dark', 'light'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.switchTheme(themes[nextIndex]);
    }

    /**
     * Уничтожение менеджера тем
     */
    destroy() {
        // Удаляем обработчики событий
        if (this.themeToggle && this.themeToggleHandler) {
            this.themeToggle.removeEventListener('click', this.themeToggleHandler);
        }
        
        if (window.matchMedia && this.systemThemeHandler) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            mediaQuery.removeEventListener('change', this.systemThemeHandler);
        }
        
        this.themeToggle = null;
        this.themeToggleHandler = null;
        this.systemThemeHandler = null;
        
        console.log('✅ ThemeManager уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else {
    window.ThemeManager = ThemeManager;
}
