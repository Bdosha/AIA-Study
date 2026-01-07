/**
 * themeSwitcher.js
 * 
 * Менеджер переключения между светлой и тёмной темой.
 * ✅ ИСПРАВЛЕНИЕ: Генерирует правильное событие theme:changed
 */

(function(global) {
    'use strict';

    const THEME_STORAGE_KEY = 'mealy_theme';

    /**
     * Установка темы.
     * @param {string} theme - 'dark' или 'light'
     */
    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (e) {
            console.warn('localStorage недоступно');
        }

        // Генерация события с задержкой для гарантированного срабатывания
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('theme:changed', {
                detail: { theme: theme }
            }));
        }, 50);
    }

    /**
     * Переключение текущей темы.
     */
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        const newTheme = isDark ? 'dark' : 'light';

        try {
            localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (e) {
            console.warn('localStorage недоступно');
        }

        // Генерация события с задержкой
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('theme:changed', {
                detail: { theme: newTheme }
            }));
        }, 50);

        console.log('Тема переключена на:', newTheme);
    }

    /**
     * Инициализация темы при загрузке.
     */
    function init() {
        try {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';

            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            // Генерация события инициализации
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('theme:changed', {
                    detail: { theme: savedTheme }
                }));
            }, 50);

            console.log('Тема инициализирована:', savedTheme);
        } catch (e) {
            // Если localStorage недоступен, используем dark по умолчанию
            document.documentElement.classList.add('dark');
            console.warn('localStorage недоступно, используется тёмная тема');
        }
    }

    // Экспорт функций в глобальный объект
    global.themeSwitcher = {
        init: init,
        toggleTheme: toggleTheme,
        setTheme: setTheme
    };

    // Автоматическая инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);