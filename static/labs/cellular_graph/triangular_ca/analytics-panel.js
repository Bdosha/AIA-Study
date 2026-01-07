// Правая панель аналитики: значения, графики (заглушка), таблица, кнопки
export function initAnalyticsPanel(root) {
  root.innerHTML = `
    <section class="group">
      <h3>Аналитика</h3>
      <div class="values">
        <div><div>Живых</div><strong id="val-live">0</strong></div>
        <div><div>Мёртвых</div><strong id="val-dead">0</strong></div>
        <div><div>Всего</div><strong id="val-total">0</strong></div>
      </div>
    </section>
    <section class="group">
      <h3>Графики</h3>
      <canvas id="chart-live" height="120"></canvas>
      <div class="chart-caption">Живые клетки (по шагам)</div>
      <div style="height:8px"></div>
      <canvas id="chart-born" height="120"></canvas>
      <div class="chart-caption">Рождённые клетки (накопительно)</div>
      <div style="height:8px"></div>
      <canvas id="chart-died" height="120"></canvas>
      <div class="chart-caption">Умершие клетки (накопительно)</div>
      <div class="row" style="margin-top:8px">
        <label><input type="checkbox" id="chk-slow-charts" checked /> Медленнее обновлять графики при запуске</label>
      </div>
    </section>
    <section class="group">
      <h3>Таблица</h3>
      <div class="table-wrap">
        <table id="stats-table">
          <thead>
            <tr>
              <th>Шаг</th>
              <th>Живых</th>
              <th>Рожд. шаг</th>
              <th>Умерш. шаг</th>
              <th>Рожд. сумм.</th>
              <th>Умерш. сумм.</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="row" style="margin-top:8px">
        <button id="btn-reset-stats">Сброс статистики</button>
        <button id="btn-export-csv">Экспорт CSV</button>
      </div>
    </section>
  `;
  const el = {
    live: root.querySelector('#val-live'),
    dead: root.querySelector('#val-dead'),
    total: root.querySelector('#val-total'),
    tbody: root.querySelector('#stats-table tbody'),
    btnReset: root.querySelector('#btn-reset-stats'),
    btnCSV: root.querySelector('#btn-export-csv'),
    chartLive: root.querySelector('#chart-live'),
    chartBorn: root.querySelector('#chart-born'),
    chartDied: root.querySelector('#chart-died'),
    slowCharts: root.querySelector('#chk-slow-charts'),
  };
  // Инициализируем графики (пока только линии)
  let charts = null;
  async function ensureCharts() {
    if (charts) return charts;
    const mod = await import('./charts.js');
    charts = {
      live: mod.initLineChart(el.chartLive, { color: getComputedStyle(document.documentElement).getPropertyValue('--alive-fill').trim() || '#4ea1ff' }),
      born: mod.initLineChart(el.chartBorn, { color: '#29c163' }),
      died: mod.initLineChart(el.chartDied, { color: '#ff5a5f' }),
    };
    return charts;
  }
  return {
    bind({ onResetStats, onExportCSV, onToggleSlowCharts }) {
      el.btnReset.addEventListener('click', onResetStats);
      el.btnCSV.addEventListener('click', onExportCSV);
      if (onToggleSlowCharts && el.slowCharts) {
        el.slowCharts.addEventListener('change', () => onToggleSlowCharts(!!el.slowCharts.checked));
      }
    },
    setSlowCharts(checked) { if (el.slowCharts) el.slowCharts.checked = !!checked; },
    updateValues({ liveNow, deadNow, total }) {
      el.live.textContent = String(liveNow);
      el.dead.textContent = String(deadNow);
      el.total.textContent = String(total);
    },
    updateTable(rows) {
      const frag = document.createDocumentFragment();
      el.tbody.textContent = '';
      for (const r of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.step}</td>
          <td>${r.liveNow}</td>
          <td>${r.bornStep}</td>
          <td>${r.diedStep}</td>
          <td>${r.bornCum}</td>
          <td>${r.diedCum}</td>`;
        frag.appendChild(tr);
      }
      el.tbody.appendChild(frag);
    },
    async updateChartsFrom(analytics) {
      await ensureCharts();
      // Синхронизируем данные графиков
      const rows = analytics.rows;
      const liveSeries = rows.map(r => r.liveNow);
      const bornCum = rows.map(r => r.bornCum);
      const diedCum = rows.map(r => r.diedCum);
      charts.live.setData(liveSeries);
      charts.born.setData(bornCum);
      charts.died.setData(diedCum);
    },
    elements: el,
  };
}
