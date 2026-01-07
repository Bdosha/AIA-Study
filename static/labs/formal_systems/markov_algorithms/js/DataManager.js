/**
 * DataManager.js
 * Модуль управления данными (экспорт/импорт)
 * 
 * Обеспечивает сохранение и загрузку конфигураций алгоритмов
 * в формате JSON.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

/**
 * Класс менеджера данных
 */
export class DataManager {
    /**
     * Экспортирует данные в файл
     * @param {string} jsonString - JSON-строка для экспорта
     * @param {string} filename - Имя файла
     */
    exportToFile(jsonString, filename) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Импортирует данные из файла
     * @param {File} file - Файл для импорта
     * @param {Function} callback - Колбэк, получающий содержимое файла
     */
    importFromFile(file, callback) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                callback(content);
            } catch (error) {
                console.error('Ошибка чтения файла:', error);
                throw new Error('Не удалось прочитать файл');
            }
        };

        reader.onerror = () => {
            throw new Error('Ошибка чтения файла');
        };

        reader.readAsText(file);
    }

    /**
     * Сохраняет данные в localStorage
     * @param {string} key - Ключ для сохранения
     * @param {Object} data - Данные для сохранения
     */
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    /**
     * Загружает данные из localStorage
     * @param {string} key - Ключ для загрузки
     * @returns {Object|null} Загруженные данные или null
     */
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return null;
        }
    }
}