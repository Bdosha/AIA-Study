/**
 * AnimationEngine.js
 * Модуль системы анимации переходов состояний
 * 
 * Обеспечивает плавные анимационные переходы при изменении состояния
 * рабочей строки алгоритма.
 * 
 * @author Яхиев Г.А.
 * @version 1.0
 * @date 2025
 */

/**
 * Класс движка анимации
 */
export class AnimationEngine {
    /**
     * Создает новый экземпляр движка анимации
     */
    constructor() {
        this.duration = 300; // миллисекунды
        this.isAnimating = false;
    }

    /**
     * Устанавливает длительность анимации
     * @param {number} duration - Длительность в миллисекундах
     */
    setDuration(duration) {
        this.duration = duration;
    }

    /**
     * Анимирует изменение текста в элементе
     * @param {HTMLElement} element - DOM элемент для анимации
     * @param {string} newText - Новый текст
     * @returns {Promise} Promise, который разрешается после завершения анимации
     */
    animateTextChange(element, newText) {
        return new Promise((resolve) => {
            if (this.isAnimating) {
                element.textContent = newText;
                resolve();
                return;
            }

            this.isAnimating = true;

            // Fade out
            element.style.transition = `opacity ${this.duration / 2}ms ease-out`;
            element.style.opacity = '0';

            setTimeout(() => {
                element.textContent = newText;

                // Fade in
                element.style.opacity = '1';

                setTimeout(() => {
                    this.isAnimating = false;
                    resolve();
                }, this.duration / 2);
            }, this.duration / 2);
        });
    }

    /**
     * Анимирует появление элемента
     * @param {HTMLElement} element - DOM элемент
     */
    animateAppear(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.transition = `all ${this.duration}ms ease-out`;

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    }
}