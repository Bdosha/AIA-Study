(function (root) {
  'use strict';

  function plotlyAvailable() {
    return typeof root.Plotly !== 'undefined';
  }

  function themeLayout(title, light = false) {
    const paper = light ? '#ffffff' : '#111827';
    const plot = light ? '#ffffff' : '#111827';
    const font = light ? '#111827' : '#f8fafc';
    const grid = light ? '#d1d5db' : '#334155';

    return {
      title,
      paper_bgcolor: paper,
      plot_bgcolor: plot,
      font: { color: font, family: 'Inter, Arial, sans-serif' },
      margin: { l: 60, r: 30, t: 55, b: 55 },
      xaxis: { gridcolor: grid, zerolinecolor: grid },
      yaxis: { gridcolor: grid, zerolinecolor: grid }
    };
  }

  function clearPlots(elements) {
    if (!plotlyAvailable()) {
      Object.values(elements).forEach((el) => {
        if (el) el.innerHTML = '<div class="plot-fallback">Plotly не загрузился. Проверьте подключение к интернету или CDN.</div>';
      });
      return;
    }
    Object.values(elements).forEach((el) => {
      if (el) root.Plotly.purge(el);
    });
  }

  function drawSurface(el, analysis, result, light = false) {
    if (!plotlyAvailable() || !el || !analysis) return;

    const surfaceTrace = {
      x: analysis.xs,
      y: analysis.ys,
      z: analysis.z,
      type: 'surface',
      name: 'K(x,y)',
      colorscale: 'Viridis',
      opacity: 0.94,
      showscale: true
    };

    const trajectory = result?.trajectory || [];
    const trajectoryTrace = {
      x: trajectory.map((p) => p.x),
      y: trajectory.map((p) => p.y),
      z: trajectory.map((p) => p.value),
      mode: 'lines+markers',
      type: 'scatter3d',
      name: 'Траектория',
      line: { color: '#f97316', width: 6 },
      marker: { size: 3, color: '#f97316' }
    };

    const accepted = result?.acceptedPoint;
    const acceptedTrace = accepted ? {
      x: [accepted.x],
      y: [accepted.y],
      z: [accepted.value],
      mode: 'markers',
      type: 'scatter3d',
      name: result.hasPureSaddle ? 'Седловая точка' : 'Последняя точка',
      marker: { size: 6, color: result.hasPureSaddle ? '#22c55e' : '#ef4444' }
    } : null;

    const layout = {
      ...themeLayout('Поверхность выигрыша K(x,y)', light),
      scene: {
        xaxis: { title: 'x', backgroundcolor: light ? '#ffffff' : '#111827', color: light ? '#111827' : '#f8fafc' },
        yaxis: { title: 'y', backgroundcolor: light ? '#ffffff' : '#111827', color: light ? '#111827' : '#f8fafc' },
        zaxis: { title: 'K(x,y)', backgroundcolor: light ? '#ffffff' : '#111827', color: light ? '#111827' : '#f8fafc' }
      }
    };

    const traces = [surfaceTrace];
    if (trajectory.length) traces.push(trajectoryTrace);
    if (acceptedTrace) traces.push(acceptedTrace);
    root.Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false });
  }

  function drawSections(el, analysis, result, light = false) {
    if (!plotlyAvailable() || !el || !analysis) return;

    const traces = [
      {
        x: analysis.xs,
        y: analysis.rowMax,
        type: 'scatter',
        mode: 'lines',
        name: 'ψ(x)=maxᵧK(x,y)',
        line: { width: 3 }
      },
      {
        x: analysis.ys,
        y: analysis.colMin,
        type: 'scatter',
        mode: 'lines',
        name: 'φ(y)=minₓK(x,y)',
        line: { width: 3 }
      }
    ];

    if (result?.acceptedPoint) {
      const xi = root.GridTools.nearestIndex(analysis.xs, result.acceptedPoint.x);
      const yi = root.GridTools.nearestIndex(analysis.ys, result.acceptedPoint.y);
      traces.push({
        x: [analysis.xs[xi]],
        y: [analysis.rowMax[xi]],
        type: 'scatter',
        mode: 'markers',
        name: 'Точка на ψ(x)',
        marker: { size: 11, color: '#22c55e' }
      });
      traces.push({
        x: [analysis.ys[yi]],
        y: [analysis.colMin[yi]],
        type: 'scatter',
        mode: 'markers',
        name: 'Точка на φ(y)',
        marker: { size: 11, color: '#f97316' }
      });
    }

    const layout = {
      ...themeLayout('Минимаксные сечения', light),
      xaxis: { ...themeLayout('', light).xaxis, title: 'Аргумент x для ψ(x), аргумент y для φ(y)' },
      yaxis: { ...themeLayout('', light).yaxis, title: 'Значение' },
      legend: { orientation: 'h', y: -0.25 }
    };

    root.Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false });
  }

  function drawConvergence(el, residuals = [], light = false) {
    if (!plotlyAvailable() || !el) return;
    const ys = residuals.map((value) => Math.max(value, 1e-16));
    const trace = {
      x: residuals.map((_, index) => index + 1),
      y: ys,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Остаток',
      line: { width: 3 }
    };
    const layout = {
      ...themeLayout('Сходимость', light),
      xaxis: { ...themeLayout('', light).xaxis, title: 'Итерация' },
      yaxis: { ...themeLayout('', light).yaxis, title: 'Остаток', type: 'log' },
      showlegend: false
    };
    root.Plotly.react(el, [trace], layout, { responsive: true, displayModeBar: false });
  }

  function resize(elements) {
    if (!plotlyAvailable()) return;
    Object.values(elements).forEach((el) => {
      if (el) root.Plotly.Plots.resize(el);
    });
  }

  root.GameVisualization = {
    clearPlots,
    drawSurface,
    drawSections,
    drawConvergence,
    resize
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.GameVisualization;
  }
})(typeof window !== 'undefined' ? window : globalThis);
