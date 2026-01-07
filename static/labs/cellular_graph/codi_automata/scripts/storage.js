// scripts/storage.js
// Хранение состояний/настроек в localStorage (по ДРВ — опционально, реализовано безопасно).

export class StorageManager {
  constructor() {
    this.storageKey = 'stochastic_ca_saved_states';
    this.settingsKey = 'stochastic_ca_settings';
  }

  saveState(state) {
    try {
      const savedStates = this.getSavedStates();
      const timestamp = new Date().toISOString();
      const stateWithMetadata = {
        ...state,
        timestamp,
        id: Date.now().toString(),
        name: `Сохранение от ${new Date().toLocaleString()}`
      };

      savedStates.unshift(stateWithMetadata);
      if (savedStates.length > 10) savedStates.pop();

      localStorage.setItem(this.storageKey, JSON.stringify(savedStates));
      return stateWithMetadata.id;
    } catch (err) {
      console.error('Ошибка при сохранении состояния:', err);
      return null;
    }
  }

  loadState(id = null) {
    try {
      const savedStates = this.getSavedStates();
      if (savedStates.length === 0) return null;
      if (id) return savedStates.find(s => s.id === id) || null;
      return savedStates[0];
    } catch (err) {
      console.error('Ошибка при загрузке состояния:', err);
      return null;
    }
  }

  getSavedStates() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Ошибка при чтении состояний:', err);
      return [];
    }
  }

  deleteState(id) {
    try {
      const savedStates = this.getSavedStates();
      const filtered = savedStates.filter(s => s.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (err) {
      console.error('Ошибка при удалении состояния:', err);
      return false;
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error('Ошибка при сохранении настроек:', err);
      return false;
    }
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.settingsKey);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Ошибка при загрузке настроек:', err);
      return {};
    }
  }

  clearAll() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.settingsKey);
      return true;
    } catch (err) {
      console.error('Ошибка при очистке хранилища:', err);
      return false;
    }
  }
}
