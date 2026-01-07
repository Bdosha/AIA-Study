
// js/core/LSystem.js
/**
 * Класс для работы с L-системами, включая детерминированные и стохастические правила
 */
class LSystem {
    /**
     * Конструктор L-системы
     * @param {string} axiom - Аксиома (начальная строка)
     * @param {Object} rules - Правила подстановки
     * @param {number} angle - Угол поворота в градусах
     * @param {number} iterations - Количество итераций
     */
    constructor(axiom = 'F', rules = {}, angle = 25, iterations = 4) {
        this.axiom = axiom;
        this.rules = {};
        this.stochasticRules = {};
        this.angle = angle;
        this.iterations = Math.min(Math.max(1, iterations), 15);
        this.currentIteration = 0;
        this.generatedString = '';
        
        this.generationCache = new Map();
        this.isGenerating = false;
        this.generationComplete = false;
        this.shouldStop = false;
        
        this.MAX_STRING_LENGTH = 100000;
        
        // Генератор случайных чисел с возможностью установки seed
        this.randomSeed = null;
        this.randomGenerator = Math.random;
        
        // Парсим правила при инициализации
        this.setParameters(axiom, rules, angle, iterations);
    }

    /**
     * Парсинг правил из строки или объекта
     * @param {string|Object} rules - Правила в виде строки или объекта
     * @returns {Object} Объект с детерминированными правилами
     */
    parseRules(rules) {
        const deterministicRules = {};
        
        if (typeof rules === 'string') {
            const lines = rules.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.includes('->')) continue;
                
                const [key, value] = trimmedLine.split('->');
                const trimmedKey = key.trim();
                let trimmedValue = value.trim();
                
                if (trimmedKey && trimmedValue) {
                    // Проверка на вероятностные правила
                    if (trimmedValue.includes('|') && trimmedValue.includes('[') && trimmedValue.includes('%')) {
                        this.parseStochasticRule(trimmedKey, trimmedValue);
                    } else {
                        // Удаляем возможные вероятностные аннотации для детерминированных правил
                        trimmedValue = trimmedValue.replace(/\[\d+%\][\s\|]*/g, '').trim();
                        deterministicRules[trimmedKey] = trimmedValue;
                    }
                }
            }
            return deterministicRules;
        }
        
        // Если правила переданы как объект, разделяем детерминированные и стохастические
        if (typeof rules === 'object') {
            for (const [key, value] of Object.entries(rules)) {
                if (typeof value === 'string' && value.includes('|') && value.includes('[') && value.includes('%')) {
                    this.parseStochasticRule(key, value);
                } else {
                    deterministicRules[key] = value;
                }
            }
        }
        
        return deterministicRules;
    }

    /**
     * Парсинг вероятностных правил
     * @param {string} predecessor - Предшественник
     * @param {string} ruleString - Строка правила с вероятностями
     */
    parseStochasticRule(predecessor, ruleString) {
        const variants = ruleString.split('|');
        const rulesWithProb = [];
        let totalProbability = 0;

        for (const variant of variants) {
            const trimmedVariant = variant.trim();
            const match = trimmedVariant.match(/^(.*?)\[(\d+(?:\.\d+)?)%\]$/);
            
            if (match) {
                const [, successor, probStr] = match;
                const probability = parseFloat(probStr) / 100;
                rulesWithProb.push({ 
                    successor: successor.trim(), 
                    probability 
                });
                totalProbability += probability;
            } else {
                // Если вероятность не указана, распределяем равномерно
                const remainingProbability = 1.0 - totalProbability;
                const probability = remainingProbability / (variants.length - rulesWithProb.length);
                rulesWithProb.push({ 
                    successor: trimmedVariant, 
                    probability 
                });
                totalProbability += probability;
            }
        }

        // Нормализуем вероятности если нужно
        if (Math.abs(totalProbability - 1.0) > 0.001) {
            console.warn(`Сумма вероятностей для '${predecessor}' не равна 1.0: ${totalProbability}. Нормализация...`);
            for (const rule of rulesWithProb) {
                rule.probability /= totalProbability;
            }
        }

        this.stochasticRules[predecessor] = rulesWithProb;
        console.log(`Добавлено стохастическое правило для '${predecessor}':`, rulesWithProb);
    }

    /**
     * Добавление вероятностного правила
     * @param {string} predecessor - Предшественник
     * @param {Array} rulesWithProb - Массив правил с вероятностями
     */
    addStochasticRule(predecessor, rulesWithProb) {
        const totalProb = rulesWithProb.reduce((sum, rule) => sum + rule.probability, 0);
        
        if (Math.abs(totalProb - 1.0) > 0.001) {
            console.warn(`Сумма вероятностей для '${predecessor}' не равна 1.0: ${totalProb}`);
            // Нормализуем
            for (const rule of rulesWithProb) {
                rule.probability /= totalProb;
            }
        }
        
        this.stochasticRules[predecessor] = rulesWithProb;
    }

    /**
     * Установка seed для детерминированной случайности
     * @param {number} seed - Seed для генератора случайных чисел
     */
    setRandomSeed(seed) {
        this.randomSeed = seed;
        // Линейный конгруэнтный генератор для детерминированной случайности
        this.randomGenerator = function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    /**
     * Генерация следующего символа с учетом вероятностных правил
     * @param {string} char - Текущий символ
     * @returns {string} Сгенерированная строка-замена
     */
    generateNextSymbol(char) {
        // Сначала проверяем вероятностные правила
        if (this.stochasticRules[char]) {
            const rand = this.randomGenerator();
            let cumulativeProb = 0;
            
            for (const rule of this.stochasticRules[char]) {
                cumulativeProb += rule.probability;
                if (rand <= cumulativeProb) {
                    return rule.successor;
                }
            }
        }
        
        // Затем проверяем обычные детерминированные правила
        return this.rules[char] || char;
    }

    /**
     * Установка параметров системы
     * @param {string} axiom - Аксиома
     * @param {string|Object} rules - Правила
     * @param {number} angle - Угол поворота
     * @param {number} iterations - Количество итераций
     */
    setParameters(axiom, rules, angle, iterations) {
        this.axiom = axiom || 'F';
        this.rules = {};
        this.stochasticRules = {};
        this.angle = typeof angle === 'number' ? angle : 25;
        this.iterations = Math.min(Math.max(1, iterations || 4), 15);
        
        // Парсим правила (включая вероятностные)
        this.rules = this.parseRules(rules);
        
        this.reset();
    }

    /**
     * Генерация полной строки L-системы
     * @returns {string} Сгенерированная строка
     */
    generateAll() {
        this.reset();
        this.shouldStop = false;
        
        let currentString = this.axiom;
        this.generationCache.set(0, currentString);
        
        for (let i = 1; i <= this.iterations; i++) {
            if (this.shouldStop || currentString.length > this.MAX_STRING_LENGTH) break;
            
            let newString = '';
            for (let j = 0; j < currentString.length; j++) {
                const char = currentString[j];
                newString += this.generateNextSymbol(char);
                
                if (newString.length > this.MAX_STRING_LENGTH) {
                    newString = newString.substring(0, this.MAX_STRING_LENGTH);
                    break;
                }
            }
            
            currentString = newString;
            this.generationCache.set(i, currentString);
            this.currentIteration = i;
        }
        
        this.generatedString = currentString;
        this.generationComplete = this.currentIteration >= this.iterations;
        return this.generatedString;
    }

    /**
     * Выполнение одной итерации генерации
     * @returns {string} Текущая строка после итерации
     */
    iterate() {
        if (this.currentIteration >= this.iterations) {
            this.generationComplete = true;
            return this.generatedString;
        }
        
        let newString = '';
        for (let i = 0; i < this.generatedString.length; i++) {
            const char = this.generatedString[i];
            newString += this.generateNextSymbol(char);
            
            if (newString.length > this.MAX_STRING_LENGTH) {
                newString = newString.substring(0, this.MAX_STRING_LENGTH);
                break;
            }
        }
        
        this.generatedString = newString;
        this.currentIteration++;
        this.generationComplete = this.currentIteration >= this.iterations;
        
        // Сохраняем в кэш
        this.generationCache.set(this.currentIteration, this.generatedString);
        
        return this.generatedString;
    }

    /**
     * Быстрая генерация (без пошагового кэширования)
     * @returns {string} Сгенерированная строка
     */
    generateFast() {
        return this.generateAll();
    }

    /**
     * Сброс системы в начальное состояние
     */
    reset() {
        this.currentIteration = 0;
        this.generatedString = this.axiom;
        this.generationComplete = false;
        this.shouldStop = false;
        this.generationCache.clear();
        this.generationCache.set(0, this.axiom);
    }

    /**
     * Остановка генерации
     */
    stop() {
        this.shouldStop = true;
        this.isGenerating = false;
    }

    /**
     * Валидация параметров системы
     * @returns {Object} Результаты валидации
     */
    validate() {
        const errors = [];
        const warnings = [];

        // Проверка аксиомы
        if (!this.axiom || typeof this.axiom !== 'string') {
            errors.push('Аксиома должна быть непустой строкой');
        }

        // Проверка правил
        if (typeof this.rules !== 'object') {
            errors.push('Правила должны быть объектом или строкой');
        }

        // Проверка угла
        if (typeof this.angle !== 'number' || isNaN(this.angle)) {
            errors.push('Угол должен быть числом');
        }

        // Проверка итераций
        if (typeof this.iterations !== 'number' || isNaN(this.iterations) || 
            this.iterations < 1 || this.iterations > 15) {
            errors.push('Количество итераций должно быть целым числом от 1 до 15');
        }

        // Проверка вероятностных правил
        for (const [predecessor, rules] of Object.entries(this.stochasticRules)) {
            const totalProb = rules.reduce((sum, rule) => sum + rule.probability, 0);
            if (Math.abs(totalProb - 1.0) > 0.001) {
                warnings.push(`Сумма вероятностей для правила '${predecessor}' не равна 1.0 (${totalProb.toFixed(3)})`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Получение статистики системы
     * @returns {Object} Статистика
     */
    getStats() {
        const validation = this.validate();
        
        return {
            currentIteration: this.currentIteration,
            totalIterations: this.iterations,
            stringLength: this.generatedString.length,
            generationComplete: this.generationComplete,
            isGenerating: this.isGenerating,
            rulesCount: Object.keys(this.rules).length,
            stochasticRulesCount: Object.keys(this.stochasticRules).length,
            cacheSize: this.generationCache.size,
            validation,
            hasStochasticRules: Object.keys(this.stochasticRules).length > 0
        };
    }

    /**
     * Получение строки для определенной итерации из кэша
     * @param {number} iteration - Номер итерации
     * @returns {string} Строка L-системы
     */
    getStringForIteration(iteration) {
        return this.generationCache.get(iteration) || '';
    }

    /**
     * Получение информации о правилах
     * @returns {Object} Информация о правилах
     */
    getRulesInfo() {
        return {
            deterministic: this.rules,
            stochastic: this.stochasticRules,
            totalRules: Object.keys(this.rules).length + Object.keys(this.stochasticRules).length
        };
    }

    /**
     * Создание стохастической L-системы для дерева
     * @returns {LSystem} Готовая стохастическая L-система
     */
    static createStochasticTree() {
        const system = new LSystem();
        system.setParameters(
            'A',
            {
                'A': 'F[+A][-A][&A][^A]',
            },
            22.5,
            5
        );
        
        system.addStochasticRule('F', [
            { successor: 'FF', probability: 0.7 },
            { successor: 'F[+F]F', probability: 0.2 },
            { successor: 'F[-F]F', probability: 0.1 }
        ]);
        
        return system;
    }

    /**
     * Создание предустановленной L-системы
     * @param {string} name - Название предустановки
     * @returns {Object} Параметры предустановки
     */
    static createPreset(name) {
        const presets = {
            koch: {
                axiom: 'F--F--F',
                rules: { 'F': 'F+F--F+F' },
                angle: 60,
                iterations: 4,
                description: 'Классическая снежинка Коха'
            },
            plant: {
                axiom: 'X',
                rules: { 'X': 'F[+X]F[-X]+X', 'F': 'FF' },
                angle: 25,
                iterations: 5,
                description: 'Модель роста растения'
            },
            dragon: {
                axiom: 'FX',
                rules: { 'X': 'X+YF+', 'Y': '-FX-Y' },
                angle: 90,
                iterations: 10,
                description: 'Фрактальная кривая дракона'
            },
            tree: {
                axiom: '0',
                rules: { '1': '11', '0': '1[0]0' },
                angle: 45,
                iterations: 6,
                description: 'Фрактальное бинарное дерево'
            },
            sierpinski: {
                axiom: 'F-G-G',
                rules: { 'F': 'F-G+F+G-F', 'G': 'GG' },
                angle: 120,
                iterations: 5,
                description: 'Треугольник Серпинского'
            },
            bush: {
                axiom: 'F',
                rules: { 'F': 'FF+[+F-F-F]-[-F+F+F]' },
                angle: 22.5,
                iterations: 4,
                description: 'Фрактальный куст'
            },
            fractalTree: {
                axiom: 'F',
                rules: { 'F': 'F[+FF][-FF]F[-F][+F]F' },
                angle: 35,
                iterations: 4,
                description: 'Сложное фрактальное дерево'
            },
            weed: {
                axiom: 'F',
                rules: { 'F': 'FF-[-F+F+F]+[+F-F-F]' },
                angle: 22.5,
                iterations: 4,
                description: 'Фрактальный сорняк'
            },
            // Стохастические предустановки
            stochastic_tree: {
                axiom: 'A',
                rules: { 
                    'A': 'F[+A][-A][&A][^A]',
                    'F': 'FF[70%]|F[+F]F[20%]|F[-F]F[10%]'
                },
                angle: 25,
                iterations: 5,
                description: 'Дерево со случайными вариациями ветвления'
            },
            stochastic_bush: {
                axiom: 'F',
                rules: {
                    'F': 'FF+[+F-F-F][40%]|FF-[+F-F-F][30%]|FF[30%]'
                },
                angle: 22.5,
                iterations: 4,
                description: 'Куст со случайными вариациями роста'
            },
            stochastic_weed: {
                axiom: 'F',
                rules: {
                    'F': 'FF-[-F+F+F][50%]|FF+[+F-F-F][30%]|F[20%]'
                },
                angle: 25,
                iterations: 4,
                description: 'Сорняк со случайными вариациями формы'
            },
            // 3D предустановки
            tree3d: {
                axiom: 'A',
                rules: {
                    'A': 'F[+A][-A][&A][^A]F[+A][-A]',
                    'F': 'FF'
                },
                angle: 22.5,
                iterations: 4,
                description: 'Объемное 3D дерево с ветвлением во всех направлениях'
            },
            tree3d_bush: {
                axiom: 'A',
                rules: {
                    'A': 'F[+A][-A][&A][^A]',
                    'F': 'FF'
                },
                angle: 25,
                iterations: 4,
                description: 'Объемный 3D куст'
            },
            tree3d_pine: {
                axiom: 'A',
                rules: {
                    'A': 'F[+A][-A][&A]FA',
                    'F': 'FF'
                },
                angle: 20,
                iterations: 5,
                description: 'Объемная 3D ель с вертикальным ростом'
            }
        };

        return presets[name] || null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LSystem;
} else {
    window.LSystem = LSystem;
}
