// Главный файл приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация основных компонентов
    const turingMachine = new TuringMachine();
    const simulator = new Simulator(turingMachine);
    const ui = new UI(turingMachine, simulator);
    
    // Загрузка сохраненной темы и установка тумблера
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    ui.currentTheme = savedTheme;
    
    // Установка состояния тумблера
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.checked = savedTheme === 'light';
    
    // Обновление label
    const themeLabel = document.querySelector('.theme-label');
    themeLabel.textContent = savedTheme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
    
    // Инициализация таблицы переходов
    ui.updateTransitionTable();
    
    console.log('Симулятор Машины Тьюринга инициализирован');
});