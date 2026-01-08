class LabApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.systemModel = null;
    this.graphRenderer = new GraphRenderer('graph-container', 2000, 1500);
    this.analyzer = null;
    this.themeController = new ThemeController();
    this.attemptsLeft = 5;
    this.history = [];
    this.initialSubsystemsCountAtStart = 0;
    this.currentConfigKeyAtStart = null;
  }

  init() {
    console.log("Инициализация приложения...");
    this.graphRenderer.init();
    window.onNodeClick = (nodeId) => this.simulateFailure(nodeId);
    this.setupEventListeners();
    console.log("Приложение инициализировано.");
  }

  loadConfiguration(configKey) {
    const config = this.configManager.getConfig(configKey);
    this.systemModel = new SystemModel(config);
    this.analyzer = new Analyzer(this.systemModel);

    this.initialSubsystemsCountAtStart = this.systemModel.initialSubsystemsCount;
    this.attemptsLeft = 5;
    this.currentConfigKeyAtStart = configKey;

    this.graphRenderer.render(this.systemModel);
    this.updateUI();
  }

  simulateFailure(nodeId) {
    if (this.attemptsLeft <= 0) {
      return;
    }

    this.attemptsLeft--;
    const attemptsEl = document.getElementById('attempts-left');
    if (attemptsEl) attemptsEl.textContent = this.attemptsLeft;

    const result = this.systemModel.simulateFailure(nodeId);
    if (result) {
      console.log("Симуляция отказа:", result);

      this.graphRenderer.removeNode(nodeId);

      this.updateStabilityDisplay(this.systemModel.stability);
      this.updateSWOTDisplay();
      this.updateRecommendationsDisplay();

      this.history.push({
        subsystem: nodeId,
        stability: result.newStability,
        result: result.newStability < 20 ? 'Критическое падение' : 'Нестабильность'
      });

      if (this.systemModel.stability < 20) {
        alert("Уровень устойчивости упал ниже 20%! Объект самовозбуждён. Миссия провалена.");
        this.resetSimulation();
        return;
      }

      if (this.attemptsLeft <= 0) {
        const initialCount = this.initialSubsystemsCountAtStart;
        const currentCount = this.systemModel.subsystems.length;
        const removedCount = initialCount - currentCount;
        const removalPercentage = (removedCount / initialCount) * 100;

        if (removalPercentage >= 60 && this.systemModel.stability > 20) {
          alert("Миссия выполнена! Удалено более 60% узлов. Угроза нейтрализована, объект стабилен. Вы выиграли.");
          this.exportResultsAsPng(); // Вызов функции экспорта при победе
        } else {
          alert("Попытки закончились! Условия победы не выполнены. Объект нестабилен или удалено недостаточно узлов. Миссия провалена.");
        }
        this.resetSimulation();
      }
    }
  }

  updateStabilityDisplay(value) {
    const stabilityEl = document.getElementById('stability-value');
    if (!stabilityEl) {
      console.error('stability-value element not found');
      return;
    }
    stabilityEl.textContent = `${value}%`;
    const gauge = document.getElementById('stability-gauge');
    if (gauge) {
      if (value > 70) gauge.style.backgroundColor = 'var(--gauge-high)';
      else if (value > 30) gauge.style.backgroundColor = 'var(--gauge-mid)';
      else gauge.style.backgroundColor = 'var(--gauge-low)';
    }
  }

  updateSWOTDisplay() {
    const swot = this.analyzer.generateSWOT();
    const swotPanel = document.getElementById('swot-panel');
    if (!swotPanel) {
      console.error('swot-panel element not found');
      return;
    }
    let html = '';
    if (swot.strengths.length > 0) {
        html += `<div class='swot-section'><h4>Сильные стороны</h4><ul>${swot.strengths.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
    }
    if (swot.weaknesses.length > 0) {
        html += `<div class='swot-section'><h4>Слабые стороны</h4><ul>${swot.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
    }
    if (swot.opportunities.length > 0) {
        html += `<div class='swot-section'><h4>Возможности</h4><ul>${swot.opportunities.map(o => `<li>${o}</li>`).join('')}</ul></div>`;
    }
    if (swot.threats.length > 0) {
        html += `<div class='swot-section'><h4>Угрозы</h4><ul>${swot.threats.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
    }
    swotPanel.innerHTML = html;
  }

  updateRecommendationsDisplay() {
    const recommendations = this.analyzer.generateRecommendations();
    const recPanel = document.getElementById('recommendations-panel');
    if (!recPanel) {
      console.error('recommendations-panel element not found');
      return;
    }
    recPanel.innerHTML = `<ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`;
  }

  updateUI() {
    const attemptsEl = document.getElementById('attempts-left');
    if (attemptsEl) attemptsEl.textContent = this.attemptsLeft;
    this.updateStabilityDisplay(this.systemModel.stability);
    this.updateSWOTDisplay();
    this.updateRecommendationsDisplay();
  }

  resetSimulation() {
    this.history = []; // history теперь используется только для экспорта
    if (this.currentConfigKeyAtStart) {
      this.loadConfiguration(this.currentConfigKeyAtStart);
    } else {
      const firstConfigKey = this.configManager.getOptions()[0].key;
      this.loadConfiguration(firstConfigKey);
    }
  }

  exportResultsAsPng() {
    // Получаем текущую тему напрямую из ThemeController
    const currentTheme = this.themeController.getCurrentTheme();

    // Определяем цвета для таблицы в зависимости от темы
    const colors = currentTheme === 'light' ? {
      bg: '#ffffff',
      text: '#212121',
      border: '#ccc',
      headerBg: '#f9f9f9',
      evenRow: '#fafafa'
    } : {
      bg: '#121212',
      text: '#e0e0e0',
      border: '#333',
      headerBg: '#1a1a1a',
      evenRow: '#1e1e1e'
    };

    // Создаём временный div для таблицы
    const tempTableDiv = document.createElement('div');
    tempTableDiv.id = 'temp-results-table';
    tempTableDiv.style.cssText = `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      background-color: ${colors.bg};
      color: ${colors.text};
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    // Создаём HTML таблицы БЕЗ колонки "Результат"
    let tableHTML = `
      <h3 style="text-align: center; margin-bottom: 20px; color: ${colors.text};">История симуляций</h3>
      <table style="width: 100%; border-collapse: collapse; background-color: ${colors.bg};">
        <thead>
          <tr style="background-color: ${colors.headerBg};">
            <th style="padding: 12px 15px; text-align: left; border: 1px solid ${colors.border};">Подсистема</th>
            <th style="padding: 12px 15px; text-align: center; border: 1px solid ${colors.border};">Устойчивость</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Заполняем тело таблицы
    this.history.forEach((entry, index) => {
      const rowBg = index % 2 === 0 ? colors.evenRow : colors.bg;

      // ИЩЕМ РУССКОЕ ИМЯ УЗЛА
      const subsystemObj = this.systemModel.subsystems.find(s => s.id === entry.subsystem);
      const displayName = subsystemObj ? (subsystemObj.name || subsystemObj.id) : entry.subsystem;

      tableHTML += `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 12px 15px; border: 1px solid ${colors.border};">${displayName}</td>
          <td style="padding: 12px 15px; text-align: center; border: 1px solid ${colors.border};">${entry.stability}%</td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    tempTableDiv.innerHTML = tableHTML;

    // Добавляем во временное DOM-дерево
    document.body.appendChild(tempTableDiv);

    // Экспортируем с помощью html-to-image
    htmlToImage.toPng(tempTableDiv)
      .then(dataUrl => {
        const link = document.createElement('a');
        link.download = 'results_history.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error('Ошибка при создании PNG:', err);
        alert('К сожалению, не удалось сохранить отчёт. Попробуйте использовать другой браузер.');
      })
      .finally(() => {
        // Удаляем временный элемент
        document.body.removeChild(tempTableDiv);
      });
  }

  setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const introScreen = document.getElementById('intro-screen');
        const mainInterface = document.getElementById('main-interface');
        if (introScreen && mainInterface) {
          introScreen.classList.add('hidden');
          mainInterface.classList.remove('hidden');
          const firstConfigKey = this.configManager.getOptions()[0].key;
          this.loadConfiguration(firstConfigKey);
        }
      });
    }

    const configSelect = document.getElementById('config-select');
    if (configSelect) {
      configSelect.innerHTML = this.configManager.getOptions().map(opt => `<option value="${opt.key}">${opt.name}</option>`).join('');
      configSelect.addEventListener('change', (e) => {
        this.history = [];
        this.loadConfiguration(e.target.value);
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSimulation();
      });
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.themeController.toggleTheme());
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new LabApp().init());