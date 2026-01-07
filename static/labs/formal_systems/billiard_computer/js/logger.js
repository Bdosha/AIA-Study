/**
 * Система логирования с поддержкой Safari и Chrome
 * Обеспечивает запись всех событий приложения и возможность скачивания логов
 */
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000; // Максимальное количество записей в памяти
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
    
    // Логируем инициализацию системы логирования
    this.log('SYSTEM', 'Logger initialized', { 
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Генерирует уникальный ID сессии
   */
  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Основной метод логирования
   * @param {string} category - Категория события (SYSTEM, UI, PHYSICS, etc.)
   * @param {string} message - Сообщение о событии
   * @param {Object} data - Дополнительные данные
   */
  log(category, message, data = {}) {
    const timestamp = Date.now();
    const relativeTime = timestamp - this.startTime;
    
    const logEntry = {
      timestamp: timestamp,
      relativeTime: relativeTime,
      category: category,
      message: message,
      data: data,
      formattedTime: new Date(timestamp).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      })
    };

    this.logs.push(logEntry);
    
    // Ограничиваем количество логов в памяти
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Выводим в консоль для разработки
    console.log(`[${category}] ${message}`, data);
  }

  /**
   * Логирование событий пользовательского интерфейса
   */
  logUI(action, element = null, details = {}) {
    this.log('UI', `User action: ${action}`, {
      element: element?.id || element?.tagName || 'unknown',
      elementType: element?.type || null,
      details: details
    });
  }

  /**
   * Логирование физических событий
   */
  logPhysics(event, details = {}) {
    this.log('PHYSICS', `Physics event: ${event}`, details);
  }

  /**
   * Логирование системных событий
   */
  logSystem(event, details = {}) {
    this.log('SYSTEM', `System event: ${event}`, details);
  }

  /**
   * Логирование ошибок
   */
  logError(error, context = {}) {
    this.log('ERROR', `Error occurred: ${error.message}`, {
      stack: error.stack,
      context: context
    });
  }

  /**
   * Логирование отладочной информации
   */
  logDebug(message, details = {}) {
    if (Logger.debugEnabled || window.PHYS_DEBUG) {
      this.log('DEBUG', `[DEBUG] ${message}`, details);
    }
  }

  /**
   * Включение/выключение логирования отладки глобально
   */
  static setDebug(flag) {
    Logger.debugEnabled = !!flag;
    window.PHYS_DEBUG = !!flag;
  }

  /**
   * Получить все логи в формате CSV
   */
  exportCSV() {
    const headers = ['Timestamp', 'RelativeTime(ms)', 'Category', 'Message', 'Data'];
    const rows = [headers.join(',')];
    
    this.logs.forEach(log => {
      const dataStr = JSON.stringify(log.data).replace(/"/g, '""');
      const row = [
        `"${log.formattedTime}"`,
        log.relativeTime,
        `"${log.category}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${dataStr}"`
      ];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }

  /**
   * Получить все логи в формате JSON
   */
  exportJSON() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      totalLogs: this.logs.length,
      logs: this.logs
    };
  }

  /**
   * Получить логи в виде текста для отображения
   */
  exportText() {
    return this.logs.map(log => {
      const dataStr = Object.keys(log.data).length > 0 ? 
        ` | ${JSON.stringify(log.data)}` : '';
      return `[${log.formattedTime}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  /**
   * Скачать логи за всю сессию (отображаемые в панели "Логи" при активном режиме DEBUG)
   * Формат: 'csv' (по умолчанию), 'json', 'txt'
   */
  downloadLogs(format = 'csv') {
    let content, filename, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(this.exportJSON(), null, 2);
        filename = `bbm_logs_${this.sessionId}_${Date.now()}.json`;
        mimeType = 'application/json';
        break;
      case 'txt':
        content = this.exportText();
        filename = `bbm_logs_${this.sessionId}_${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
      default: // csv
        content = this.exportCSV();
        filename = `bbm_logs_${this.sessionId}_${Date.now()}.csv`;
        mimeType = 'text/csv';
    }

    // Создаем blob и скачиваем файл
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
    
    // Логируем скачивание
    this.log('SYSTEM', `Logs downloaded in ${format.toUpperCase()} format`, {
      filename: filename,
      logCount: this.logs.length
    });
  }

  /**
   * Универсальная функция скачивания файлов для Safari и Chrome
   */
  downloadBlob(blob, filename) {
    // Создаем URL для blob
    const url = URL.createObjectURL(blob);
    
    try {
      // Создаем временную ссылку
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // Добавляем в DOM, кликаем и удаляем
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Освобождаем память
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      // Fallback для старых браузеров
      this.logError(error, { action: 'downloadBlob', filename });
      
      // Альтернативный способ через window.open
      const newWindow = window.open();
      if (newWindow) {
        newWindow.location.href = url;
      }
    }
  }

  /**
   * Очистить все логи
   */
  clear() {
    const logCount = this.logs.length;
    this.logs = [];
    this.log('SYSTEM', `Logs cleared`, { previousLogCount: logCount });
  }

  /**
   * Получить статистику логов
   */
  getStats() {
    const categories = {};
    this.logs.forEach(log => {
      categories[log.category] = (categories[log.category] || 0) + 1;
    });
    
    return {
      totalLogs: this.logs.length,
      categories: categories,
      sessionDuration: Date.now() - this.startTime,
      sessionId: this.sessionId
    };
  }
}

// Создаем глобальный экземпляр логгера
const logger = new Logger();
window.logger = logger;

// === [DEBUG/LOGVIEW PATCH]: FILTER SPAM LOGS ===
const logSpamThrottle = {
  lastTick: 0,
  lastAnim: 0,
};

const origLogDebug = logger.logDebug.bind(logger);
logger.logDebug = function(msg, data) {
  if (typeof msg === 'string' && (
      msg.includes('Tick start') || msg.includes('Tick loop') || msg.includes('Animation frame'))
  ) {
    const now = Date.now();
    if (
      msg.includes('Tick') && now - logSpamThrottle.lastTick < 200
    ) return;
    if (
      msg.includes('Animation frame') && now - logSpamThrottle.lastAnim < 200
    ) return;
    if (msg.includes('Tick')) logSpamThrottle.lastTick = now;
    if (msg.includes('Animation frame')) logSpamThrottle.lastAnim = now;
  }
  return origLogDebug(msg, data);
};

// === [LOGVIEW SIZE LIMIT] ===
(function(){
  const logView = document.getElementById('logView');
  if (!logView) return;
  const orig = logger._logToView ? logger._logToView.bind(logger) : null;
  logger._logToView = function(line) {
    if (orig) orig(line);
    if (logView.childNodes.length > 500) logView.textContent = '[Log cleared: too many lines]';
  };
})();

// === [GLOBAL ERROR HANDLER PATCH] ===
window.addEventListener('error', function(ev){
  console.error('[GlobalError]', ev.message, ev.filename, ev.lineno, ev.colno, ev.error);
  const logView = document.getElementById('logView');
  if (logView) {
    const line = document.createElement('div');
    line.style.color = 'crimson';
    line.textContent = '[ERROR] ' + ev.message + (ev.error ? (': ' + ev.error.stack) : '');
    logView.appendChild(line);
    // Если слишком много строк, очистить
    if (logView.childNodes.length > 500) logView.textContent = '[Log cleared: too many lines]';
  }
});
