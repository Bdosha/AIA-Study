let k, b, u;
let results = [];
let sortDirection = true; // Направление сортировки по умолчанию — по возрастанию

// Функция для разблокировки кнопки "Запустить эксперимент"
document.getElementById("visualization").addEventListener('change', function () {
    if (this.value) {
        document.getElementById("startExperiment").disabled = false;
        document.getElementById("description").style.display = 'block'; // Показываем описание
    } else {
        document.getElementById("startExperiment").disabled = true;
        document.getElementById("description").style.display = 'none'; // Скрываем описание
    }
});

// Функция для применения значений и отображения результата
function applyInput(k, b, u) {
    const inputValue = parseFloat(document.getElementById("inputSlider").value);
    console.log(k, b, u)
    const k1 = parseFloat(k) * 1.2;
    const b1 = parseFloat(b) * 1.2;
    const u1 = parseFloat(u) * 1.2;
    const outputValue = k1 * inputValue + b1 + (Math.random() * u1 - u1 / 2);
    const roundedOutput = Math.round(outputValue);
    document.getElementById("outputValue").textContent = roundedOutput;

    addResultToTable(inputValue, roundedOutput);

}

// Добавление результата в таблицу с автоматической сортировкой
function addResultToTable(input, output) {
    results.push({input, output});
    sortResults(); // Сортировка перед обновлением таблицы
    updateTable();
    document.getElementById("resultsSection").style.display = 'block'; // Показываем таблицу после добавления данных
    // document.getElementById("resetButton").style.display = 'inline'; // Показываем кнопку сброса результатов
}

// Функция для сортировки массива results
function sortResults() {
    results.sort((a, b) => sortDirection ? a.input - b.input : b.input - a.input);
}

// Обновление таблицы с результатами
function updateTable() {
    const inputRow = document.getElementById("inputRow");
    const outputRow = document.getElementById("outputRow");

    // Очищаем содержимое строк для перерисовки с сортировкой
    inputRow.innerHTML = "<th id='sortInput'>Вход: ↑↓</th>";
    outputRow.innerHTML = "<th id='sortOutput'>Выход: ↑↓</th>";

    // Добавляем данные для каждого результата
    results.forEach(result => {
        const inputCell = document.createElement('td');
        inputCell.textContent = result.input;

        const outputCell = document.createElement('td');
        outputCell.textContent = result.output;

        inputRow.appendChild(inputCell);
        outputRow.appendChild(outputCell);
    });

    // Добавляем обработчики событий для сортировки
    document.getElementById('sortInput').addEventListener('click', function () {
        sortDirection = !sortDirection; // Меняем направление сортировки
        sortResults(); // Сортируем по "Вход"
        updateTable(); // Обновляем таблицу
    });
    document.getElementById('sortOutput').addEventListener('click', function () {
        sortDirection = !sortDirection; // Меняем направление сортировки
        results.sort((a, b) => sortDirection ? a.output - b.output : b.output - a.output);
        updateTable(); // Обновляем таблицу
    });
}

// Сброс таблицы
function resetTable() {
    results = []; // Очищаем массив результатов
    document.querySelector("#inputRow").innerHTML = "<th>Вход:</th>"; // Сбрасываем строку с входными данными
    document.querySelector("#outputRow").innerHTML = "<th>Выход:</th>"; // Сбрасываем строку с выходными данными
    document.getElementById("outputValue").textContent = "-"; // Сбрасываем отображение результата
    document.getElementById("submitButton").disabled = true; // Блокируем кнопку отправки
    document.getElementById("resultsSection").style.display = 'none'; // Скрываем секцию с таблицей
    // document.getElementById("resetButton").style.display = 'none'; // Скрываем кнопку сброса
}

// Обновление значения слайдера
function updateSliderValue() {
    document.getElementById("sliderValue").textContent = document.getElementById("inputSlider").value;
}

// Обработчик изменения выбора системы
document.getElementById("visualization").addEventListener('change', function () {
    const selectedVisualization = this.value;

    resetTable(); // Сбрасываем таблицу при смене системы

    if (selectedVisualization) {
        calculateCoefficients(selectedVisualization); // Рассчитываем коэффициенты до отображения секции
        updateSliderRange(selectedVisualization); // Обновляем диапазон и шаг слайдера
        document.getElementById("visualizationSection").style.display = 'block'; // Показываем секцию визуализации
        updateVisualization(selectedVisualization);
        updateDescription(selectedVisualization);
        updateUnits(selectedVisualization);  // Обновляем единицы измерения
        document.getElementById("startExperiment").disabled = false; // Разблокируем кнопку запуска эксперимента
        document.getElementById("description").style.display = 'block'; // Показываем описание
    } else {
        document.getElementById("visualizationSection").style.display = 'none'; // Скрываем секцию визуализации
        document.getElementById("resultsSection").style.display = 'none'; // Скрываем секцию с таблицей
        document.getElementById("startExperiment").disabled = true; // Блокируем кнопку запуска эксперимента
        document.getElementById("description").style.display = 'none'; // Скрываем описание
    }
});

