/*** ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ***/
document.documentElement.setAttribute('data-theme', 'dark');
const themeBtn = document.getElementById('themeToggleCorner');
// Функция внешнего вида иконки
function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  themeBtn.textContent = (theme === 'dark') ? '🌙' : '☀️';
}
// Изменение темы и иконки при клике
themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  updateThemeIcon();
});
// Установка корректной иконки при загрузке
updateThemeIcon();