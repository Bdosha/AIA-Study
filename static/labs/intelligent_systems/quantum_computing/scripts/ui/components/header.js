// scripts/ui/components/header.js
export function initHeader(root, { title, subtitle }) {
  if (!root) return;
  const strong = root.querySelector('strong');
  if (strong) strong.textContent = title || 'Симулятор квантовых схем';
}
