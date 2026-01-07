/**
 * main.js
 * Точка входа приложения
 * 
 * Инициализирует контроллер интерфейса и запускает приложение.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

import { UIController } from './UIController.js';

/**
 * Инициализация приложения после загрузки DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Симулятор нормальных алгорифмов Маркова');
    console.log('НИЯУ МИФИ, Кафедра №22 "Кибернетика"');
    console.log('Версия 1.0, 2025');

    // Создаем экземпляр контроллера
    const controller = new UIController();

    console.log('Приложение инициализировано');
});