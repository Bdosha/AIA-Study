/**
 * Менеджер предустановленных конфигураций космического объекта.
 */
class ConfigManager {
  constructor() {
    this.configs = {
      passive: {
        name: "Пассивный артефакт",
        description: "Объект с низкой активностью, стабильной структурой и минимальной реакцией на внешние сигналы.",
        criticalNodes: ["core"],
        subsystems: [
          { id: "power", type: "энергетическая", name: "Энергоблок", status: "активна", feedback: true },
          { id: "comm", type: "информационная", name: "Коммуникационный модуль", status: "пассивна", feedback: false },
          { id: "core", type: "структурная", name: "Центральная система управления", status: "активна", feedback: true },
          { id: "shield", type: "защитная", name: "Защитное поле", status: "пассивна", feedback: false },
          { id: "sensor", type: "сенсорная", name: "Сенсорный комплекс", status: "пассивна", feedback: false },
          { id: "storage", type: "информационная", name: "Модуль хранения данных", status: "пассивна", feedback: true },
          { id: "maint", type: "вспомогательная", name: "Система обслуживания", status: "пассивна", feedback: false },
          { id: "aux", type: "энергетическая", name: "Вспомогательный блок", status: "пассивна", feedback: false }
        ],
        links: [
          { from: "power", to: "comm", strength: "сильная" },
          { from: "comm", to: "core", strength: "средняя" },
          { from: "core", to: "power", strength: "слабая", feedback: true },
          { from: "core", to: "shield", strength: "средняя" },
          { from: "power", to: "sensor", strength: "средняя" },
          { from: "sensor", to: "comm", strength: "слабая" },
          { from: "comm", to: "storage", strength: "средняя" },
          { from: "core", to: "maint", strength: "слабая" },
          { from: "maint", to: "power", strength: "слабая" },
          { from: "aux", to: "shield", strength: "слабая" },
          { from: "aux", to: "maint", strength: "слабая" },
          { from: "storage", to: "sensor", strength: "слабая" }
        ]
      },

      aggressive: {
        name: "Агрессивный дрон",
        description: "Объект с высокой активностью, агрессивной реакцией на сканирование и нестабильной структурой.",
        criticalNodes: ["ai", "reactor"],
        subsystems: [
          { id: "weapon", type: "боевая", name: "Боевой модуль", status: "пассивна", feedback: true },
          { id: "sensor", type: "сенсорная", name: "Сенсорный комплекс", status: "пассивна", feedback: true },
          { id: "reactor", type: "энергетическая", name: "Реактор", status: "активна", feedback: false },
          { id: "ai", type: "управляющая", name: "Центральный ИИ", status: "активна", feedback: true },
          { id: "radar", type: "сенсорная", name: "Радарная система", status: "пассивна", feedback: true },
          { id: "target", type: "управляющая", name: "Система наведения", status: "пассивна", feedback: true },
          { id: "cool", type: "вспомогательная", name: "Система охлаждения", status: "пассивна", feedback: false },
          { id: "shield_gen", type: "защитная", name: "Генератор щита", status: "пассивна", feedback: false }
        ],
        links: [
          { from: "sensor", to: "ai", strength: "сильная" },
          { from: "ai", to: "weapon", strength: "сильная" },
          { from: "reactor", to: "weapon", strength: "сильная" },
          { from: "reactor", to: "ai", strength: "средняя" },
          { from: "ai", to: "reactor", strength: "слабая", feedback: true },
          { from: "sensor", to: "radar", strength: "средняя" },
          { from: "radar", to: "target", strength: "средняя" },
          { from: "target", to: "weapon", strength: "сильная" },
          { from: "reactor", to: "cool", strength: "средняя" },
          { from: "cool", to: "reactor", strength: "слабая", feedback: true },
          { from: "reactor", to: "shield_gen", strength: "средняя" },
          { from: "shield_gen", to: "ai", strength: "слабая" }
        ]
      },

      evolving: {
        name: "Эволюционирующая структура",
        description: "Объект с адаптивной структурой, способной изменять связи и поведение в ответ на внешние воздействия.",
        criticalNodes: ["adapt", "core"],
        subsystems: [
          { id: "rep", type: "репликационная", name: "Модуль репликации", status: "пассивна", feedback: true },
          { id: "data", type: "информационная", name: "Хранилище данных", status: "пассивна", feedback: true },
          { id: "core", type: "структурная", name: "Центральный блок", status: "активна", feedback: true },
          { id: "adapt", type: "адаптивная", name: "Модуль адаптации", status: "активна", feedback: true },
          { id: "mem", type: "информационная", name: "Модуль памяти", status: "пассивна", feedback: true },
          { id: "learn", type: "адаптивная", name: "Модуль обучения", status: "пассивна", feedback: true },
          { id: "linker", type: "структурная", name: "Модуль переподключения", status: "пассивна", feedback: true },
          { id: "eval", type: "аналитическая", name: "Модуль оценки", status: "пассивна", feedback: true }
        ],
        links: [
          { from: "data", to: "rep", strength: "средняя" },
          { from: "rep", to: "core", strength: "сильная" },
          { from: "core", to: "adapt", strength: "средняя" },
          { from: "adapt", to: "data", strength: "сильная", feedback: true },
          { from: "core", to: "data", strength: "слабая" },
          { from: "data", to: "mem", strength: "средняя" },
          { from: "mem", to: "learn", strength: "средняя" },
          { from: "learn", to: "adapt", strength: "сильная" },
          { from: "eval", to: "core", strength: "средняя" },
          { from: "adapt", to: "linker", strength: "средняя" },
          { from: "linker", to: "core", strength: "слабая" },
          { from: "eval", to: "learn", strength: "слабая" }
        ]
      }
    };
  }

  /**
   * Возвращает конфигурацию по ключу.
   * @param {string} key — 'passive', 'aggressive', 'evolving'
   * @returns {Object}
   */
  getConfig(key) {
    return this.configs[key] || this.configs.passive;
  }

  /**
   * Возвращает список доступных конфигураций с описанием.
   * @returns {Array<{key: string, name: string, description: string}>}
   */
  getOptions() {
    return Object.keys(this.configs).map(key => ({
      key,
      name: this.configs[key].name,
      description: this.configs[key].description
    }));
  }
}