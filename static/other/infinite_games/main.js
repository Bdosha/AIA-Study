(function (root) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ids = {
    presetSelect: $('presetSelect'),
    funcInput: $('funcInput'),
    xMin: $('xMin'), xMax: $('xMax'), yMin: $('yMin'), yMax: $('yMax'),
    x0: $('x0'), y0: $('y0'), alpha: $('alpha'), eps: $('eps'), maxIter: $('maxIter'), gridDensity: $('gridDensity'),
    resetBtn: $('resetBtn'), stepBtn: $('stepBtn'), solveBtn: $('solveBtn'), stopBtn: $('stopBtn'), themeToggle: $('themeToggle'),
    manualBadge: $('manualBadge'), formulaBlock: $('formulaBlock'),
    statusText: $('statusText'), pointOut: $('pointOut'), valueOut: $('valueOut'), iterOut: $('iterOut'), residualOut: $('residualOut'), diagnosticsOut: $('diagnosticsOut'),
    surfacePlot: $('surfacePlot'), sectionsPlot: $('sectionsPlot'), convergencePlot: $('convergencePlot')
  };

  let currentPreset = root.GamePresets.PRESETS[0];
  let currentState = null;
  let currentResult = null;
  let currentOptions = null;
  let currentTrajectory = [];
  let currentResiduals = [];
  let shouldStop = false;
  let running = false;
  let manualChange = false;

  function init() {
    ids.presetSelect.innerHTML = root.GamePresets.PRESETS
      .map((preset, index) => `<option value="${index}">${preset.name}</option>`)
      .join('');

    ids.presetSelect.addEventListener('change', () => loadPreset(Number(ids.presetSelect.value)));
    ids.resetBtn.addEventListener('click', () => loadPreset(Number(ids.presetSelect.value)));
    ids.stepBtn.addEventListener('click', onStep);
    ids.solveBtn.addEventListener('click', onSolve);
    ids.stopBtn.addEventListener('click', () => { shouldStop = true; ids.statusText.textContent = 'Остановка после текущей итерации...'; });
    ids.themeToggle.addEventListener('change', () => {
      document.body.classList.toggle('light-theme', ids.themeToggle.checked);
      redrawAll();
    });
    window.addEventListener('resize', () => root.GameVisualization.resize({ surface: ids.surfacePlot, sections: ids.sectionsPlot, convergence: ids.convergencePlot }));

    [ids.funcInput, ids.xMin, ids.xMax, ids.yMin, ids.yMax, ids.x0, ids.y0, ids.alpha, ids.eps, ids.maxIter, ids.gridDensity]
      .forEach((element) => element.addEventListener('input', markManualChange));

    loadPreset(0);
  }

  function markManualChange() {
    manualChange = true;
    ids.manualBadge.hidden = false;
  }

  function loadPreset(index) {
    currentPreset = root.GamePresets.PRESETS[index] || root.GamePresets.PRESETS[0];
    ids.presetSelect.value = String(index);
    ids.funcInput.value = currentPreset.expr;
    ids.xMin.value = currentPreset.bounds.xMin;
    ids.xMax.value = currentPreset.bounds.xMax;
    ids.yMin.value = currentPreset.bounds.yMin;
    ids.yMax.value = currentPreset.bounds.yMax;
    ids.x0.value = currentPreset.x0;
    ids.y0.value = currentPreset.y0;
    ids.alpha.value = currentPreset.alpha;
    ids.eps.value = currentPreset.eps;
    ids.maxIter.value = currentPreset.maxIter;
    ids.gridDensity.value = currentPreset.gridDensity;

    manualChange = false;
    ids.manualBadge.hidden = true;
    resetState('Готов к расчётам');
    tryBuildPreview();
  }

  function resetState(status) {
    currentState = null;
    currentResult = null;
    currentOptions = null;
    currentTrajectory = [];
    currentResiduals = [];
    shouldStop = false;
    setRunning(false);
    setResultText(status, null, []);
  }

  function readOptions() {
    const bounds = {
      xMin: root.InputValidation.parseNumber(ids.xMin.value, 'x min'),
      xMax: root.InputValidation.parseNumber(ids.xMax.value, 'x max'),
      yMin: root.InputValidation.parseNumber(ids.yMin.value, 'y min'),
      yMax: root.InputValidation.parseNumber(ids.yMax.value, 'y max')
    };
    root.InputValidation.validateBounds(bounds);

    const fn = root.SafeEval.compileExpression(ids.funcInput.value);
    const x0 = root.InputValidation.parseNumber(ids.x0.value, 'x₀');
    const y0 = root.InputValidation.parseNumber(ids.y0.value, 'y₀');
    const alpha = root.InputValidation.parsePositive(ids.alpha.value, 'Шаг α');
    const eps = root.InputValidation.parsePositive(ids.eps.value, 'Точность ε');
    const maxIter = root.InputValidation.parsePositiveInteger(ids.maxIter.value, 'Макс. итераций', 1);
    const gridDensity = root.InputValidation.parsePositiveInteger(ids.gridDensity.value, 'Плотность сетки', 15);

    return {
      fn,
      expression: ids.funcInput.value,
      bounds,
      x0,
      y0,
      alpha,
      eps,
      maxIter,
      gridDensity,
      importantX: currentPreset.importantX || [],
      importantY: currentPreset.importantY || []
    };
  }

  function ensureCalculation() {
    currentOptions = readOptions();
    if (!currentState) {
      currentState = root.GameSolver.createInitialState(currentOptions);
      currentTrajectory = [{ x: currentState.x, y: currentState.y, value: currentState.value }];
      currentResiduals = [];
      const analysis = root.GridTools.analyseGrid(
        currentOptions.fn,
        currentOptions.bounds,
        currentOptions.gridDensity,
        currentOptions.importantX,
        currentOptions.importantY
      );
      redrawAll(analysis);
      updateIntermediate(currentState, currentState.warnings);
    }
  }

  function onStep() {
    if (running) return;
    try {
      ensureCalculation();
      currentState = root.GameSolver.projectedGradientStep(currentState, currentOptions);
      currentTrajectory.push({ x: currentState.x, y: currentState.y, value: currentState.value });
      currentResiduals.push(currentState.residual);
      updateIntermediate(currentState);

      if (currentState.residual <= currentOptions.eps || currentState.iteration >= currentOptions.maxIter) {
        finish(false);
      } else {
        redrawAll();
      }
    } catch (error) {
      setResultText(`Ошибка: ${error.message}`, null, []);
    }
  }

  async function onSolve() {
    if (running) return;
    try {
      ensureCalculation();
      setRunning(true);
      shouldStop = false;
      ids.statusText.textContent = 'Выполняется...';

      while (!shouldStop && currentState.iteration < currentOptions.maxIter) {
        currentState = root.GameSolver.projectedGradientStep(currentState, currentOptions);
        currentTrajectory.push({ x: currentState.x, y: currentState.y, value: currentState.value });
        currentResiduals.push(currentState.residual);

        if (currentState.iteration % 8 === 0 || currentState.residual <= currentOptions.eps) {
          updateIntermediate(currentState);
          redrawAll();
          await sleep(0);
        }
        if (currentState.residual <= currentOptions.eps) break;
      }

      finish(shouldStop);
    } catch (error) {
      setResultText(`Ошибка: ${error.message}`, null, []);
      setRunning(false);
    }
  }

  function finish(stoppedByUser) {
    const result = root.GameSolver.analyseFinal(currentOptions, currentState, currentTrajectory, currentResiduals, stoppedByUser);
    currentResult = result;
    currentState = null;
    setResultText(result.status, result, []);
    redrawAll();
    setRunning(false);
    shouldStop = false;
    if (root.MathJax && typeof root.MathJax.typesetPromise === 'function') root.MathJax.typesetPromise();
  }

  function updateIntermediate(state, warnings = []) {
    const partial = {
      acceptedPoint: { x: state.x, y: state.y, value: state.value },
      state,
      trajectory: currentTrajectory,
      residuals: currentResiduals,
      hasPureSaddle: false,
      game: currentOptions
        ? root.GridTools.analyseGrid(currentOptions.fn, currentOptions.bounds, currentOptions.gridDensity, currentOptions.importantX, currentOptions.importantY)
        : null,
      finalResidual: state.residual
    };
    setResultText('Выполняется...', partial, warnings);
  }

  function setRunning(value) {
    running = value;
    ids.solveBtn.disabled = value;
    ids.stepBtn.disabled = value;
    ids.resetBtn.disabled = value;
    ids.stopBtn.disabled = !value;
    ids.presetSelect.disabled = value;
  }

  function setResultText(status, result, warnings = []) {
    ids.statusText.textContent = status;
    if (!result) {
      ids.pointOut.textContent = '—';
      ids.valueOut.textContent = '—';
      ids.iterOut.textContent = '—';
      ids.residualOut.textContent = '—';
      ids.diagnosticsOut.innerHTML = '—';
      return;
    }

    const point = result.acceptedPoint;
    ids.pointOut.textContent = `(${root.GameSolver.formatFixed(point.x, 4)}, ${root.GameSolver.formatFixed(point.y, 4)})`;
    ids.valueOut.textContent = root.GameSolver.formatFixed(point.value, 4);
    ids.iterOut.textContent = String(result.state?.iteration ?? '—');
    ids.residualOut.textContent = Number.isFinite(result.finalResidual) ? result.finalResidual.toExponential(3) : '—';

    const game = result.game;
    const diagnostics = [];
    if (warnings.length) diagnostics.push(`<div class="warning-line">${warnings.join(' ')}</div>`);
    if (game) {
      diagnostics.push(`Нижняя цена v_lower = ${root.GameSolver.formatFixed(game.lower, 4)}`);
      diagnostics.push(`Верхняя цена v_upper = ${root.GameSolver.formatFixed(game.upper, 4)}`);
      diagnostics.push(`Минимаксный разрыв = ${root.GameSolver.formatFixed(game.gap, 6)}`);
    }
    if (result.pointCheck) {
      diagnostics.push(`Проверка седлового неравенства: нарушение = ${root.GameSolver.formatFixed(result.pointCheck.violation, 6)}`);
    }
    if (result.usedGlobalCandidate) {
      diagnostics.push('Использована глобальная проверка, чтобы не принять ложную локальную точку.');
    }
    ids.diagnosticsOut.innerHTML = diagnostics.join('<br>');
  }

  function tryBuildPreview() {
    try {
      const options = readOptions();
      currentOptions = options;
      const analysis = root.GridTools.analyseGrid(options.fn, options.bounds, options.gridDensity, options.importantX, options.importantY);
      redrawAll(analysis);
    } catch (_) {
      root.GameVisualization.clearPlots({ surface: ids.surfacePlot, sections: ids.sectionsPlot, convergence: ids.convergencePlot });
    }
  }

  function redrawAll(prebuiltAnalysis = null) {
    if (!prebuiltAnalysis && !currentOptions && !currentResult) {
      tryBuildPreview();
      return;
    }
    let options = currentOptions;
    if (!options) {
      try { options = readOptions(); } catch (_) { return; }
    }
    const analysis = prebuiltAnalysis || root.GridTools.analyseGrid(options.fn, options.bounds, options.gridDensity, options.importantX, options.importantY);
    const displayResult = currentResult || (currentState ? {
      acceptedPoint: { x: currentState.x, y: currentState.y, value: currentState.value },
      state: currentState,
      trajectory: currentTrajectory,
      residuals: currentResiduals,
      game: analysis,
      hasPureSaddle: false
    } : null);
    const light = document.body.classList.contains('light-theme');
    root.GameVisualization.drawSurface(ids.surfacePlot, analysis, displayResult, light);
    root.GameVisualization.drawSections(ids.sectionsPlot, analysis, displayResult, light);
    root.GameVisualization.drawConvergence(ids.convergencePlot, displayResult?.residuals || [], light);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
