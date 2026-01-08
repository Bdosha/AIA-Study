/**
 * Вспомогательные функции и утилиты
 * Файл: utils.js
 * Назначение: Общие функции, используемые в других модулях
 */

/**
 * Валидация входных параметров системы
 * @param {number} accuracy - Точность датчиков (1-10)
 * @param {number} power - Мощность системы (1-10)
 * @param {number} noise - Уровень помех (0-5)
 * @returns {boolean} true если параметры валидны
 */
export function validateParameters(accuracy, power, noise) {
    if (accuracy < 1 || accuracy > 10) {
        throw new Error('Точность датчиков должна быть в диапазоне от 1 до 10');
    }

    if (power < 1 || power > 10) {
        throw new Error('Мощность системы должна быть в диапазоне от 1 до 10');
    }

    if (noise < 0 || noise > 5) {
        throw new Error('Уровень помех должен быть в диапазоне от 0 до 5');
    }

    return true;
}

/**
 * Генератор уникального ID для тестов
 * @returns {string} Уникальный идентификатор
 */
export function generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Форматирование числа для отображения
 * @param {number} value - Число для форматирования
 * @param {number} decimals - Количество знаков после запятой
 * @returns {string} Отформатированная строка
 */
export function formatNumber(value, decimals = 1) {
    return Number(value).toFixed(decimals);
}

/**
 * Проверка поддержки localStorage в браузере
 * @returns {boolean} true если localStorage поддерживается
 */
export function isLocalStorageSupported() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Сохранение данных в localStorage с обработкой ошибок
 * @param {string} key - Ключ для сохранения
 * @param {any} data - Данные для сохранения
 */
export function saveToStorage(key, data) {
    if (!isLocalStorageSupported()) {
        console.warn('localStorage не поддерживается браузером');
        return;
    }

    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения в localStorage:', e);
    }
}

/**
 * Загрузка данных из localStorage
 * @param {string} key - Ключ для загрузки
 * @returns {any} Данные или null при ошибке
 */
export function loadFromStorage(key) {
    if (!isLocalStorageSupported()) {
        return null;
    }

    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Ошибка загрузки из localStorage:', e);
        return null;
    }
}

/**
 * Анимация перехода между страницами
 * @param {HTMLElement} fromElement - Элемент для скрытия
 * @param {HTMLElement} toElement - Элемент для показа
 * @param {number} duration - Длительность анимации в мс
 */
export function animatePageTransition(fromElement, toElement, duration = 500) {
    return new Promise((resolve) => {
        fromElement.style.opacity = '1';
        toElement.style.opacity = '0';
        toElement.style.display = 'block';

        let startTime = null;

        function animate(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Эффект fade out для текущей страницы
            fromElement.style.opacity = (1 - progress).toString();

            // Эффект fade in для новой страницы
            toElement.style.opacity = progress.toString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                fromElement.style.display = 'none';
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}