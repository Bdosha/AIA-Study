/**
 * Локализация интерфейса: строки на русском (и задел под английский).
 */
export const i18n = {
  locale: 'ru',
  strings: {
    ru: {
      'app.title': 'Симулятор квантовых схем',
      'mode.setup': 'Настройка',
      'mode.run': 'Работа',
      'control.start': 'Старт',
      'control.stop': 'Стоп',
      'control.step': 'Шаг',
      'control.reset': 'Сброс',
      'speed': 'Скорость',
      'step': 'Шаг',
      'time': 'Время'
      // ... другие строки интерфейса
    },
    en: {
      'app.title': 'Quantum Circuit Simulator',
      'mode.setup': 'Setup',
      'mode.run': 'Run',
      'control.start': 'Start',
      'control.stop': 'Stop',
      'control.step': 'Step',
      'control.reset': 'Reset',
      'speed': 'Speed',
      'step': 'Step',
      'time': 'Time'
      // ... other interface strings
    }
  },
  t(key) {
    const lang = this.locale;
    return this.strings[lang][key] || key;
  }
};
