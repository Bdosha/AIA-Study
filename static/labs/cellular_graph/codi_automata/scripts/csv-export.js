// scripts/csv-export.js
// Простой экспорт CSV: параметры, финальная статистика, история метрик, финальная решётка (если небольшая).

export class CSVExporter {
  exportToCSV(data) {
    const { steps, time, parameters, statistics, history } = data;

    let csv = 'Стохастические клеточные автоматы - Результаты симуляции\n\n';

    // Параметры
    csv += 'ОБЩИЕ ПАРАМЕТРЫ\n';
    csv += `Время симуляции,${time.toFixed(2)}с\n`;
    csv += `Количество шагов,${steps}\n`;
    csv += `Размер сетки,${parameters.width}x${parameters.height}\n`;
    csv += `Количество состояний,${parameters.states}\n`;
    csv += `Правило,${parameters.rule}\n`;
    csv += `Параметр правила,${parameters.noise}\n`;
    csv += `Начальное состояние,${parameters.initialState}\n\n`;

    // Финальная статистика
    csv += 'ФИНАЛЬНАЯ СТАТИСТИКА\n';
    csv += 'Состояние,Количество клеток,Доля\n';
    for (let i = 0; i < statistics.stateCount.length; i++) {
      const count = statistics.stateCount[i];
      const proportion = count / statistics.totalCells;
      csv += `${i},${count},${proportion.toFixed(4)}\n`;
    }
    csv += '\n';

    // История метрик
    if (history && history.length > 0) {
      csv += 'ИСТОРИЯ МЕТРИК\n';
      csv += 'Шаг,Время,Энтропия,Параметр порядка,Активные клетки\n';
      history.forEach(e => {
        csv += `${e.step},${e.time.toFixed(2)},${e.entropy.toFixed(4)},${e.orderParameter.toFixed(4)},${e.activeCells}\n`;
      });
    }

    // Сетка если компактная
    if (parameters.width <= 50 && parameters.height <= 50) {
      csv += '\nФИНАЛЬНАЯ СЕТКА СОСТОЯНИЙ\n';
      for (let y = 0; y < parameters.height; y++) {
        const row = statistics.finalGrid[y].join(',');
        csv += row + '\n';
      }
    } else {
      csv += '\nПримечание: Сетка слишком большая для экспорта в CSV\n';
    }

    this.downloadCSV(csv, `cellular_automata_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`);
  }

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportGridToCSV(grid, filename = 'grid_export.csv') {
    const lines = grid.map(row => row.join(',')).join('\n');
    this.downloadCSV(lines + '\n', filename);
  }
}
