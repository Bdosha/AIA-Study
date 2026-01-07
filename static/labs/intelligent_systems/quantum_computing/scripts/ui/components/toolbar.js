// scripts/ui/components/toolbar.js
// Привязывает только базовые кнопки симуляции, НИЧЕГО больше.

export function initToolbar(root, { onStart, onStop, onStep, onReset, onSpeed }) {
  const start = document.getElementById('btn-start');
  const stop  = document.getElementById('btn-stop');
  const step  = document.getElementById('btn-step');
  const reset = document.getElementById('btn-reset');
  const speed = document.getElementById('speed-range');

  start && (start.onclick = () => onStart?.());
  stop  && (stop.onclick  = () => onStop?.());
  step  && (step.onclick  = () => onStep?.());
  reset && (reset.onclick = () => onReset?.());
  speed && (speed.oninput = e => onSpeed?.(e.target.value));
}

export default { initToolbar };
