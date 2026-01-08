document.addEventListener('DOMContentLoaded', function () {
    console.log('Инициализация приложения...');

    initializeTransitions();


    const validateBtn = document.querySelector('button[onclick="validateAutomaton()"]');
    if (validateBtn) {
        validateBtn.removeAttribute('onclick');
        validateBtn.addEventListener('click', validateAutomaton);
    }

    drawAutomatonDiagram();
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.addEventListener('click', function () {
        const body = document.body;
        if (body.classList.contains('dark-space-theme')) {
            body.classList.remove('dark-space-theme');
            body.classList.add('light-space-theme');
        } else {
            body.classList.remove('light-space-theme');
            body.classList.add('dark-space-theme');
        }
    });


    console.log('Приложение готово');
});

