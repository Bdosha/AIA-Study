// scripts/ui/components/footer.js
export function initFooter(root) {
  if (!root) return;
  root.addEventListener('footer-update', (e) => {
    const { step, timeSec } = e.detail || {};
    const stepEl = document.getElementById('f-step');
    const timeEl = document.getElementById('f-time');
    if (stepEl) stepEl.textContent = String(step ?? 0);
    if (timeEl) timeEl.textContent = (timeSec ?? 0).toFixed(2);
  });
}
