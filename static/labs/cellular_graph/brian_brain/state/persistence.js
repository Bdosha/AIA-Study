// state/persistence.js
// Утилиты работы с файлами/локальным хранилищем:
// - сохранение/загрузка узора (.json)
// - экспорт результатов анализа (.csv)
// - сохранение/чтение правил/темы/снимка сетки в LocalStorage

;(() => {
  const BB = (window.BB = window.BB || {});

  // ---------- helpers: Blob → download ----------
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- PATTERN JSON ----------
  /**
   * Сохранить текущий узор автомата в .json
   * @param {object} briansBrain - инстанс автомата с exportPattern()
   * @param {string} [filename]
   */
  function savePatternJSON(briansBrain, filename) {
    const obj = briansBrain.exportPattern();
    const name = filename || `brians-brain-pattern-${briansBrain.width}x${briansBrain.height}.json`;
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    downloadBlob(blob, name);
  }

  /**
   * Прочитать файл с узором (.json) и применить к автомату
   * @param {File} file
   * @param {object} briansBrain - инстанс автомата с importPattern(obj)
   */
  async function loadPatternJSON(file, briansBrain) {
    const text = await file.text();
    const obj = JSON.parse(text);
    briansBrain.importPattern(obj);
  }

  /**
   * Удобный хендлер для <input type="file">
   * @param {HTMLInputElement} inputEl
   * @param {object} briansBrain
   * @param {Function} [onSuccess]
   * @param {Function} [onError]
   */
  function wirePatternFileInput(inputEl, briansBrain, onSuccess, onError) {
    if (!inputEl) return;
    inputEl.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await loadPatternJSON(file, briansBrain);
        onSuccess && onSuccess();
      } catch (err) {
        onError && onError(err);
      } finally {
        e.target.value = '';
      }
    });
  }

  // ---------- CSV (analysis) ----------
  /**
   * Экспортировать CSV из серии анализа.
   * @param {Array<Object>} series
   * @param {number} gens - для имени файла
   * @param {string} [filename]
   */
  function exportAnalysisCSV(series, gens, filename) {
    const header = 'gen,on,dying,off,alive,density,entropy,hash';
    const rows = series.map(r =>
      `${r.gen},${r.on},${r.dying},${r.off},${r.alive},${r.density},${r.entropy},${r.hash}`
    );
    const csv = [header, ...rows].join('\n');
    const name = filename || `brians-brain-analysis-${gens}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, name);
  }

  // ---------- LocalStorage ----------
  const LS_KEYS = {
    THEME: 'bb-theme',
    RULES: 'bb-rules',
    GRID_SNAPSHOT: 'bb-grid-snapshot', // можно хранить sparse или 2D-массив
  };

  const safeSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const safeGet = (k, d = null) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch { return d; }
  };

  // Правила (без привязки к инстансу)
  const saveRulesToLS = (rulesObj) => safeSet(LS_KEYS.RULES, rulesObj);
  const loadRulesFromLS = () => safeGet(LS_KEYS.RULES, null);

  // Снимок сетки (любой сериализуемый объект/массив)
  const saveGridSnapshotToLS = (gridData) => safeSet(LS_KEYS.GRID_SNAPSHOT, gridData);
  const loadGridSnapshotFromLS = () => safeGet(LS_KEYS.GRID_SNAPSHOT, null);

  // Тема
  function saveThemeToLS(theme) {
    try { localStorage.setItem(LS_KEYS.THEME, theme); } catch {}
  }
  function readThemeFromLS() {
    try { return localStorage.getItem(LS_KEYS.THEME) || null; } catch { return null; }
  }

  // Экспорт в глобальный неймспейс
  BB.persistence = {
    // Files
    savePatternJSON,
    loadPatternJSON,
    wirePatternFileInput,
    exportAnalysisCSV,
    // LS
    saveRulesToLS,
    loadRulesFromLS,
    saveGridSnapshotToLS,
    loadGridSnapshotFromLS,
    saveThemeToLS,
    readThemeFromLS,
    // helpers (если вдруг понадобятся снаружи)
    _downloadBlob: downloadBlob,
    _LS_KEYS: LS_KEYS,
  };
})();
