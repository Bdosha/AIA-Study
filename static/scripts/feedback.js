let results = [];
let sortDirection = true; // Направление сортировки по умолчанию — по возрастанию


function ternary_search(x, a, b, c) {
    return a * (x ** 2) + x * b + c;
}

function simple(x, a, b) {
    console.log(x, a, b)
    console.log((-b / (2 * a)) - x)
    return Math.abs((-b / (2 * a)) - x)+ Math.random() * 1.2
}

function gradient(x, a, b) {
    return 2 * x * a + b
}

function applyInput(a1, b1, c1, mode) {
    const inputValue = parseFloat(document.getElementById("inputSlider").value);

    console.log(document.getElementById("resultsSection"))

    a1 = a1.replace(',', '.');
    b1 = b1.replace(',', '.');
    c1 = c1.replace(',', '.');

    const a = parseFloat(a1);
    const b = parseFloat(b1);
    const c = parseFloat(c1);
    console.log(a, b, c, a1, b1, c1)
    let outputValue;
    if (mode === "ternary_search") {
        outputValue = ternary_search(inputValue, a, b, c);
    }
    if (mode === "simple") {
        outputValue = simple(inputValue, a, b);
    }
    if (mode === "gradient") {
        outputValue = gradient(inputValue, a, b);
    }
    const roundedOutput = Math.round(outputValue * 100) / 100
    document.getElementById("outputValue").textContent = roundedOutput;
    addResultToTable(inputValue, roundedOutput);

}

// Добавление результата в таблицу с автоматической сортировкой
function addResultToTable(input, output) {
    results.push({input, output});
    updateTable();
    document.getElementById("resultsSection").style.display = 'block'; // Показываем таблицу после добавления данных
}

// Функция для сортировки массива results


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

// Обновление значения слайдера
function updateSliderValue() {
    document.getElementById("sliderValue").textContent = document.getElementById("inputSlider").value;
}

document.addEventListener('DOMContentLoaded', () => {
    let button = document.getElementById('submitButton');
    let counterElement = document.getElementById('left');
    let clickCount = 10;

    button.addEventListener('click', () => {
        if (clickCount > 0) {
            clickCount--
            updateCounter(counterElement, clickCount);
            if (clickCount === 0) {
                button.disabled = true;

                element.textContent = `Попыток не осталось! Введите финальное значение`;
            }
        }
    });

    function updateCounter(element, count) {
        element.textContent = `Осталось ${count} попыток`;
    }
});