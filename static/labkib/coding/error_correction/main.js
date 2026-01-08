/*** УПРАВЛЯЮЩИЙ СКРИПТ ***/
/* Проверка формата текста (0 и 1) */
function isValidMessage(value) {
    return /^[01]+$/.test(value.trim());
}
/* Проверка формата вероятности ошибки (число 0-100) */
function isValidError(value) {
    if (value === '' || isNaN(value)) return false;
    const num = Number(value);
    return num >= 0 && num <= 100;
}
/* Действия при нажатии на кнопку */
// Передача данных и валидация
document.getElementById('action').onclick = function() {
    const text = document.getElementById('inputText').value.trim();
    const error = document.getElementById('errorRate').value.trim();
    const noise = document.getElementById('noiseType').value;
    const algo = document.getElementById('algorithm').value;
    if (!isValidMessage(text)) {
        alert('Ошибка: сообщение должно быть непустым и содержать только нули и единицы');
        return;
    }
    if (!isValidError(error)) {
        alert('Ошибка: вероятность ошибки должна быть числом от 0 до 100');
        return;
    }
    /*** ВЫВОД ***/
    document.getElementById('result').style.display = 'block'; //сам блок
    document.getElementById('originalText').innerHTML = text.replace(/\n/g, '<br>'); //сообщение
    document.getElementById('errorFreq').textContent = error; //вероятность ошибки
    /* Ключевое ветвление */
    if (algo === "hamming") { runHamming(); }
    else if (algo === "reedSolomon") { runReedSolomon(); }
};