/**
 * @fileoverview Главный файл-инициализатор для Симулятора Циклической тег-системы.
 * Этот файл связывает все модули (Model, View, Controller) и запускает приложение.
 */

// --- ИМПОРТ МОДУЛЕЙ ---

import TagSystem from './model.js';
import UI from './view.js';
import Controller from './controller.js';

// --- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---

/**
 * Основная точка входа. Скрипт выполняется после полной загрузки DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Создаем экземпляр View для работы с DOM
    const view = new UI();
    // Создаем экземпляр Model, передавая ему начальную конфигурацию из формы
    const model = new TagSystem(view.getFormConfig());
    // Создаем экземпляр Controller, который связывает Model и View
    const controller = new Controller(model, view);
    // Запускаем инициализацию контроллера (установка обработчиков событий и т.д.)
    controller.init();
});