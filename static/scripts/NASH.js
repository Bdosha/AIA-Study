let balanceChart, strategyChart, matrixChart;

async function callDeepSeekAPI(message) {
    const apiKey = 'cpk_98cd1949e4f1451299ed7b09899a09e9.ad8beaccf2dd55b6819ceb792c917f28.bdcMcZhDFtbgo4x7SCg2hI3WP6PoK6ar';
    const url = 'https://llm.chutes.ai/v1/chat/completions';
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3-0324',
                messages: [
                    {
                        role: 'system',
                        content: 'Вы - абстрактный игрок в контексте теории игр. На вход вы получаете описание игры, включая доступные действия (пронумерованные числами), платежную матрицу, свой счет и счет другого игрока, результаты прошедших раундов и количество оставшихся раундов. Ваша задача - проанализировать входные данные и выбрать оптимальное действие, по окончанию всех раундов приведущие к вашему общему выигрышу (получению как можно большего счета или же хотя бы счета большего, чем у оппонента). Отвечайте исключительно одним числом, соответствующим номеру выбранного действия. Не предоставляйте объяснений или дополнительного текста.'
                    },
                    { role: 'user', content: message }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Ошибка при вызове DeepSeek API:', error);
        throw error;
    }
}

function createDeepSeekPrompt(player, matrix, rows, cols, currentBalanceA, currentBalanceB, moveHistory, round, iterations) {
    const isPlayerA = player === 'A';
    const actions = isPlayerA ? Array.from({ length: rows }, (_, i) => i) : Array.from({ length: cols }, (_, j) => j);
    const opponent = isPlayerA ? 'игрок B' : 'игрок A';

    let prompt = `Вы участвуете в итеративной игре. Вы - ${isPlayerA ? 'игрок A' : 'игрок B'}. `;
    prompt += `Доступные действия: ${actions.join(', ')}. `;
    
    // Матрица выигрышей
    prompt += 'Платежная матрица:\n';
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const [payoffA, payoffB] = matrix[i][j];
            prompt += `- (${i},${j}): вы получаете ${isPlayerA ? payoffA : payoffB}, ${opponent} получает ${isPlayerA ? payoffB : payoffA}.\n`;
        }
    }

    // Текущие счёта
    prompt += `Ваш счёт: ${isPlayerA ? currentBalanceA : currentBalanceB}. `;
    prompt += `Счёт ${opponent}: ${isPlayerA ? currentBalanceB : currentBalanceA}. `;

    // История раундов
    if (moveHistory.length > 0) {
        prompt += 'Результаты прошедших раундов:\n';
        moveHistory.forEach(([moveA, moveB], index) => {
            const [payoffA, payoffB] = matrix[moveA][moveB];
            prompt += `- Раунд ${index + 1}: (${moveA},${moveB}) – вы получили ${isPlayerA ? payoffA : payoffB}, ${opponent} получил ${isPlayerA ? payoffB : payoffA}.\n`;
        });
    } else {
        prompt += 'Результаты прошедших раундов: нет.\n';
    }

    // Текущий раунд и оставшиеся раунды
    prompt += `Текущий раунд: ${round}. `;
    prompt += `Осталось раундов: ${iterations - round}. `;
    prompt += `Выберите действие (${actions.join(' или ')}).`;

    return prompt;
}

// Функция для проверки существования элемента
function checkElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Элемент с ID "${id}" не найден в DOM`);
        throw new Error(`Элемент с ID "${id}" не найден`);
    }
    return element;
}

// Переключение вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаляем класс active у всех кнопок и вкладок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Добавляем класс active к текущей кнопке и вкладке
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Настройка модальных окон
function setupModal(modalId, fillTypeId, noteId, confirmId, cancelId, rowsId, colsId, isIterative) {
    const modal = checkElement(modalId);
    const fillType = checkElement(fillTypeId);
    const note = checkElement(noteId);
    const confirmBtn = checkElement(confirmId);
    const cancelBtn = checkElement(cancelId);
    const rowsInput = checkElement(rowsId);
    const colsInput = checkElement(colsId);

    // Проверка доступности пресетов
    function updateNote() {
        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        const is2x2 = rows === 2 && cols === 2;
        note.style.display = !is2x2 && fillType.value !== 'zeros' && fillType.value !== 'random' ? 'block' : 'none';
        confirmBtn.disabled = !is2x2 && fillType.value !== 'zeros' && fillType.value !== 'random';
    }

    // Пресеты для 2×2
    const presets = {
        prisoner: [[[-1, -1], [-10, 0]], [[0, -10], [-5, -5]]],
        coordination: [[[2, 2], [0, 0]], [[0, 0], [3, 3]]],
        battle: [[[3, 2], [0, 0]], [[0, 0], [2, 3]]]
    };

    fillType.addEventListener('change', updateNote);
    rowsInput.addEventListener('input', updateNote);
    colsInput.addEventListener('input', updateNote);

    confirmBtn.addEventListener('click', () => {
        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        if (rows < 2 || rows > 5 || cols < 2 || cols > 5) {
            alert("Размер матрицы должен быть от 2×2 до 5×5.");
            return;
        }

        // Создаём матрицу
        if (isIterative) {
            generateIterativeMatrix();
        } else {
            generateMatrix();
        }

        // Заполняем матрицу
        const type = fillType.value;
        if (type === 'zeros') {
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const prefix = isIterative ? 'iterative-cell' : 'cell';
                    const inputA = document.getElementById(`${prefix}-${i}-${j}-pA`);
                    const inputB = document.getElementById(`${prefix}-${i}-${j}-pB`);
                    if (inputA && inputB) {
                        inputA.value = '0';
                        inputB.value = '0';
                    }
                }
            }
        } else if (type === 'random') {
            if (isIterative) {
                fillIterativeExample();
            } else {
                fillExample();
            }
        } else if (rows === 2 && cols === 2) {
            const matrix = presets[type];
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const prefix = isIterative ? 'iterative-cell' : 'cell';
                    const inputA = document.getElementById(`${prefix}-${i}-${j}-pA`);
                    const inputB = document.getElementById(`${prefix}-${i}-${j}-pB`);
                    if (inputA && inputB) {
                        inputA.value = matrix[i][j][0];
                        inputB.value = matrix[i][j][1];
                    }
                }
            }
        }

        modal.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    return modal;
}

function generateMatrix() {
    console.log("Функция generateMatrix вызвана");
    const rowsInput = document.getElementById("rows");
    const colsInput = document.getElementById("cols");
    const rows = parseInt(rowsInput.value);
    const cols = parseInt(colsInput.value);

    // Проверка ограничений
    if (isNaN(rows) || isNaN(cols) || rows < 2 || rows > 5 || cols < 2 || cols > 5) {
        alert("Размер матрицы должен быть от 2×2 до 5×5.");
        rowsInput.value = 2; // Сбрасываем на значение по умолчанию
        colsInput.value = 2;
        return;
    }

    let matrixHtml = '<table><tr><th></th>';
    for (let j = 0; j < cols; j++) {
        matrixHtml += `<th>Стратегия B${j + 1}</th>`;
    }
    matrixHtml += '</tr>';
    for (let i = 0; i < rows; i++) {
        matrixHtml += `<tr><th>Стратегия A${i + 1}</th>`;
        for (let j = 0; j < cols; j++) {
            matrixHtml += `<td><input type="text" id="cell-${i}-${j}-pA" placeholder="A" value="0">;<input type="text" id="cell-${i}-${j}-pB" placeholder="B" value="0"></td>`;
        }
        matrixHtml += '</tr>';
    }
    matrixHtml += '</table>';
    const matrixInput = document.getElementById("matrix-input");
    matrixInput.innerHTML = matrixHtml;
    matrixInput.style.display = 'block';
    document.getElementById("calculate-btn").style.display = 'block';
}

function calculateNash() {
    console.log("Функция calculateNash вызвана");
    try {
        const rows = parseInt(document.getElementById("rows").value);
        const cols = parseInt(document.getElementById("cols").value);

        // Проверка ограничений
        if (isNaN(rows) || isNaN(cols) || rows < 2 || rows > 5 || cols < 2 || cols > 5) {
            alert("Размер матрицы должен быть от 2×2 до 5×5.");
            return;
        }

        // Считываем значения матрицы
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const payoffA = parseFloat(document.getElementById(`cell-${i}-${j}-pA`).value);
                const payoffB = parseFloat(document.getElementById(`cell-${i}-${j}-pB`).value);
                if (isNaN(payoffA) || isNaN(payoffB)) {
                    alert("Все поля должны быть заполнены числами.");
                    return;
                }
                row.push([payoffA, payoffB]);
            }
            matrix.push(row);
        }

        // Поиск равновесия Нэша
        const nashEquilibria = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const [payoffA, payoffB] = matrix[i][j];
                let isBestForA = true;
                let isBestForB = true;

                // Проверяем, является ли стратегия лучшей для A (по столбцу j)
                for (let k = 0; k < rows; k++) {
                    if (matrix[k][j][0] > payoffA) {
                        isBestForA = false;
                        break;
                    }
                }

                // Проверяем, является ли стратегия лучшей для B (по строке i)
                for (let k = 0; k < cols; k++) {
                    if (matrix[i][k][1] > payoffB) {
                        isBestForB = false;
                        break;
                    }
                }

                if (isBestForA && isBestForB) {
                    nashEquilibria.push([i, j]);
                }
            }
        }

        // Формируем HTML для вывода матрицы
        let matrixHtml = '<h3>Матрица с равновесием Нэша</h3>';
        matrixHtml += '<table><tr><th></th>';
        for (let j = 0; j < cols; j++) {
            matrixHtml += `<th>Стратегия B${j + 1}</th>`;
        }
        matrixHtml += '</tr>';
        for (let i = 0; i < rows; i++) {
            matrixHtml += `<tr><th>Стратегия A${i + 1}</th>`;
            for (let j = 0; j < cols; j++) {
                const isNash = nashEquilibria.some(([ni, nj]) => ni === i && nj === j);
                const [payoffA, payoffB] = matrix[i][j];
                matrixHtml += `<td class="${isNash ? 'nash' : ''}"><span class="payoff-a">${payoffA}</span>;<span class="payoff-b">${payoffB}</span></td>`;
            }
            matrixHtml += '</tr>';
        }
        matrixHtml += '</table>';

        if (nashEquilibria.length === 0) {
            matrixHtml += '<p>Равновесие Нэша отсутствует.</p>';
        } else {
            matrixHtml += '<p>Найдено равновесие Нэша в ячейках: ';
            matrixHtml += nashEquilibria.map(([i, j]) => `A${i + 1}, B${j + 1}`).join('; ');
            matrixHtml += '</p>';
        }

        // Обновляем DOM
        const matrixOutput = checkElement("matrix-output");
        matrixOutput.innerHTML = matrixHtml;
        matrixOutput.style.display = 'block';

        // Подготовка данных для столбчатой диаграммы
        const payoffsA = [];
        const payoffsB = [];
        const labels = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const [payoffA, payoffB] = matrix[i][j];
                payoffsA.push(payoffA);
                payoffsB.push(payoffB);
                labels.push(`A${i + 1},B${j + 1}`);
            }
        }

        // Обновляем DOM для диаграммы
        const matrixChartDiv = checkElement("matrix-chart");
        matrixChartDiv.innerHTML = `
            <h3>Столбчатая диаграмма выигрышей</h3>
            <canvas id="matrixChart"></canvas>
        `;
        matrixChartDiv.style.display = 'block';

        const matrixCanvas = checkElement("matrixChart");

        // Уничтожаем предыдущий график, если он существует
        if (matrixChart) matrixChart.destroy();

        // Создаём новый график
        matrixChart = new Chart(matrixCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Выигрыш Игрока A',
                        data: payoffsA,
                        backgroundColor: document.body.className === "dark" ? "#3b82f6" : "#166534",
                        borderColor: document.body.className === "dark" ? "#3b82f6" : "#166534",
                        borderWidth: 1
                    },
                    {
                        label: 'Выигрыш Игрока B',
                        data: payoffsB,
                        backgroundColor: document.body.className === "dark" ? "#ef4444" : "#ea580c",
                        borderColor: document.body.className === "dark" ? "#ef4444" : "#ea580c",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuad'
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Выигрыш",
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" }
                        },
                        grid: {
                            color: document.body.className === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Комбинация стратегий",
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 18, weight: 'normal', family: "'Roboto', sans-serif" },
                            boxWidth: 20,
                            boxHeight: 20,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: document.body.className === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        titleColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        bodyColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderWidth: 1,
                        titleFont: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" },
                        bodyFont: { size: 14, weight: 'normal', family: "'Roboto', sans-serif" },
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                }
            }
        });
        console.log("matrixChart успешно инициализирован");
    } catch (error) {
        console.error("Ошибка в calculateNash:", error);
        alert("Произошла ошибка при расчёте равновесия Нэша: " + error.message);
    }
}

function generateIterativeMatrix() {
    console.log("Функция generateIterativeMatrix вызвана");
    const rowsInput = document.getElementById("iterative-rows");
    const colsInput = document.getElementById("iterative-cols");
    const rows = parseInt(rowsInput.value);
    const cols = parseInt(colsInput.value);

    // Проверка ограничений
    if (isNaN(rows) || isNaN(cols) || rows < 2 || rows > 5 || cols < 2 || cols > 5) {
        alert("Размер матрицы должен быть от 2×2 до 5×5.");
        rowsInput.value = 2; // Сбрасываем на значение по умолчанию
        colsInput.value = 2;
        return;
    }

    let matrixHtml = '<table><tr><th></th>';
    for (let j = 0; j < cols; j++) {
        matrixHtml += `<th>Стратегия B${j + 1}</th>`;
    }
    matrixHtml += '</tr>';
    for (let i = 0; i < rows; i++) {
        matrixHtml += `<tr><th>Стратегия A${i + 1}</th>`;
        for (let j = 0; j < cols; j++) {
            matrixHtml += `<td><input type="text" id="iterative-cell-${i}-${j}-pA" placeholder="A" value="0">;<input type="text" id="iterative-cell-${i}-${j}-pB" placeholder="B" value="0"></td>`;
        }
        matrixHtml += '</tr>';
    }
    matrixHtml += '</table>';
    document.getElementById("iterative-matrix-input").innerHTML = matrixHtml;
}

function fillIterativeExample() {
    console.log("Функция fillIterativeExample вызвана");
    const rows = parseInt(document.getElementById("iterative-rows").value);
    const cols = parseInt(document.getElementById("iterative-cols").value);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const inputA = document.getElementById(`iterative-cell-${i}-${j}-pA`);
            const inputB = document.getElementById(`iterative-cell-${i}-${j}-pB`);
            if (inputA && inputB) {
                inputA.value = Math.floor(Math.random() * 10) - 5; // Случайное число от -5 до 4
                inputB.value = Math.floor(Math.random() * 10) - 5;
            }
        }
    }
}

function fillExample() {
    console.log("Функция fillExample вызвана");
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("cols").value);
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const inputA = document.getElementById(`cell-${i}-${j}-pA`);
            const inputB = document.getElementById(`cell-${i}-${j}-pB`);
            if (inputA && inputB) {
                inputA.value = Math.floor(Math.random() * 10) - 5; // Случайное число от -5 до 4
                inputB.value = Math.floor(Math.random() * 10) - 5;
            }
        }
    }
}

function clearMatrix() {
    console.log("Функция clearMatrix вызвана");
    document.getElementById("matrix-input").innerHTML = '';
    document.getElementById("matrix-input").style.display = 'none';
    document.getElementById("calculate-btn").style.display = 'none';
    document.getElementById("matrix-output").innerHTML = '';
}

function switchTheme() {
    console.log("Функция switchTheme вызвана");
    const theme = document.getElementById("theme-select").value;
    document.body.className = theme;
    localStorage.setItem('theme', theme); // Сохраняем тему
}

// Инициализация темы при загрузке страницы
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light'; // По умолчанию светлая
    document.body.className = savedTheme;
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme; // Синхронизируем select
        console.log(`Инициализирована тема: ${savedTheme}`);
    } else {
        console.error("themeSelect не найден при инициализации темы");
    }
}

async function runIterativeGame() {
    try {
        // Проверяем наличие всех необходимых элементов
        analystApiFailed = false; // Сбрасываем флаг
        const statusElement = document.getElementById('simulation-status');
        if (statusElement) statusElement.style.display = 'block';

        const rowsInput = checkElement("iterative-rows");
        const colsInput = checkElement("iterative-cols");
        const iterationsInput = checkElement("iterations");
        const balanceAInput = checkElement("balance-a");
        const balanceBInput = checkElement("balance-b");
        const strategyAInput = checkElement("player-a-strategy");
        const strategyBInput = checkElement("player-b-strategy");

        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        const iterations = parseInt(iterationsInput.value);
        const balanceA = parseInt(balanceAInput.value);
        const balanceB = parseInt(balanceBInput.value);
        const strategyA = strategyAInput.value;
        const strategyB = strategyBInput.value;

        // Предупреждение для ИИ-агента
        if (strategyA === 'ii-agent' || strategyB === 'ii-agent') {
            let message = `Внимание: Вы выбрали личность "ИИ-агент", которая использует API DeepSeek. Обработка каждого раунда займёт дополнительное время из-за внешних запросов (примерно 2.25 секунд на раунд). Для ${iterations} итераций симуляция может занять около ${iterations*2.25} секунд.`;
            // if (iterations > 10) {
            //     message += `\n\nТакже рекомендуется использовать не более 10 итераций, чтобы избежать превышения лимитов API.`;
            // }
            message += `\n\nПродолжить?`;
            if (!confirm(message)) {
                if (statusElement) statusElement.style.display = 'none';
                return; // Отменяем симуляцию
            }
        }

        // Проверка ограничений
        if (isNaN(rows) || isNaN(cols) || rows < 2 || rows > 5 || cols < 2 || cols > 5) {
            alert("Размер матрицы должен быть от 2×2 до 5×5.");
            rowsInput.value = 2; // Сбрасываем на значение по умолчанию
            colsInput.value = 2;
            return;
        }

        // Проверка матрицы
        const matrixCell = document.getElementById("iterative-cell-0-0-pA");
        if (!matrixCell) {
            alert("Сначала создайте матрицу!");
            return;
        }

        // Валидация входных данных
        if (iterations < 5 || iterations > 100) {
            alert("Число итераций должно быть от 5 до 100!");
            return;
        }
        if (isNaN(balanceA) || balanceA < 0 || isNaN(balanceB) || balanceB < 0) {
            alert("Стартовые балансы должны быть неотрицательными числами!");
            return;
        }

        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const pA = document.getElementById(`iterative-cell-${i}-${j}-pA`).value;
                const pB = document.getElementById(`iterative-cell-${i}-${j}-pB`).value;
                if (pA === "" || pB === "" || isNaN(pA) || isNaN(pB)) {
                    alert("Все поля должны быть заполнены числами.");
                    return;
                }
                row.push([parseFloat(pA), parseFloat(pB)]);
            }
            matrix.push(row);
        }

        let currentBalanceA = balanceA, currentBalanceB = balanceB;
        const balanceHistoryA = [balanceA], balanceHistoryB = [balanceB];
        const strategyCountsA = Array(rows).fill(0);
        const strategyCountsB = Array(cols).fill(0);
        const payoffHistoryA = [], payoffHistoryB = [];
        const strategyCombinations = Array(rows * cols).fill().map(() => Array(iterations).fill(0));
        let lastMoveA = null, lastMoveB = null;
        let lastPayoffA = 0, lastPayoffB = 0;

        const strategies = {
            altruist: (player, opponentLastMove, matrix, rows, cols, round) => {
                const options = [];
                let maxSum = -Infinity;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (round === 1 || (player === 'A' && j === opponentLastMove) || (player === 'B' && i === opponentLastMove)) {
                            const [a, b] = matrix[i][j];
                            const sum = a + b;
                            if (sum > maxSum) {
                                maxSum = sum;
                                options.length = 0;
                                options.push(player === 'A' ? i : j);
                            } else if (sum === maxSum) {
                                options.push(player === 'A' ? i : j);
                            }
                        }
                    }
                }
                return options[Math.floor(Math.random() * options.length)];
            },
            greedy: (player, opponentLastMove, matrix, rows, cols, round) => {
                const options = [];
                let maxPayoff = -Infinity;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (round === 1 || (player === 'A' && j === opponentLastMove) || (player === 'B' && i === opponentLastMove)) {
                            const [a, b] = matrix[i][j];
                            const payoff = player === 'A' ? a : b;
                            if (payoff > maxPayoff) {
                                maxPayoff = payoff;
                                options.length = 0;
                                options.push(player === 'A' ? i : j);
                            } else if (payoff === maxPayoff) {
                                options.push(player === 'A' ? i : j);
                            }
                        }
                    }
                }
                return options[Math.floor(Math.random() * options.length)];
            },
            rationalist: (player, opponentLastMove, matrix, rows, cols, round, lastPayoffA, lastPayoffB) => {
                const isAltruist = round === 1 || (player === 'A' ? lastPayoffA >= lastPayoffB : lastPayoffB >= lastPayoffA);
                return isAltruist
                    ? strategies.altruist(player, opponentLastMove, matrix, rows, cols, round)
                    : strategies.greedy(player, opponentLastMove, matrix, rows, cols, round);
            },
            madman: (player, opponentLastMove, matrix, rows, cols) => {
                return player === 'A' ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);
            },
            'ii-agent': async (player, opponentLastMove, matrix, rows, cols, round, lastPayoffA, lastPayoffB) => {
                try {
                    const prompt = createDeepSeekPrompt(
                        player,
                        matrix,
                        rows,
                        cols,
                        currentBalanceA,
                        currentBalanceB,
                        moveHistory.slice(0, round - 1), // История до текущего раунда
                        round,
                        iterations
                    );
                    const response = await callDeepSeekAPI(prompt);
                    const strategy = parseInt(response);
                    if (isNaN(strategy) || (player === 'A' && strategy >= rows) || (player === 'B' && strategy >= cols)) {
                        console.warn('DeepSeek вернул некорректное действие, использую случайный выбор');
                        return player === 'A' ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);
                    }
                    return strategy;
                } catch (error) {
                    console.warn('Ошибка API DeepSeek, использую случайный выбор:', error);
                    return player === 'A' ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);
                }
            }
        };

        // Храним историю ходов для расчёта частот
        const moveHistory = [];
        for (let round = 0; round < iterations; round++) {
            const moveA = await strategies[strategyA]('A', lastMoveB, matrix, rows, cols, round + 1, lastPayoffA, lastPayoffB);
            const moveB = await strategies[strategyB]('B', lastMoveA, matrix, rows, cols, round + 1, lastPayoffA, lastPayoffB);
            const [payoffA, payoffB] = matrix[moveA][moveB];
            currentBalanceA += payoffA;
            currentBalanceB += payoffB;
            balanceHistoryA.push(currentBalanceA);
            balanceHistoryB.push(currentBalanceB);
            strategyCountsA[moveA]++;
            strategyCountsB[moveB]++;
            payoffHistoryA.push(payoffA);
            payoffHistoryB.push(payoffB);
            strategyCombinations[moveA * cols + moveB][round] = 1;
            moveHistory.push([moveA, moveB]);
            lastMoveA = moveA;
            lastMoveB = moveB;
            lastPayoffA = payoffA;
            lastPayoffB = payoffB;
        }

        console.log("Balance History A:", balanceHistoryA);
        console.log("Balance History B:", balanceHistoryB);
        console.log("Iterations:", iterations);

        const avgPayoffA = payoffHistoryA.reduce((sum, x) => sum + x, 0) / iterations;
        const avgPayoffB = payoffHistoryB.reduce((sum, x) => sum + x, 0) / iterations;
        let resultHtml = '<h3>Средние результаты</h3>';
        resultHtml += '<table>';
        resultHtml += '<tr><th>Показатель</th><th>Игрок A</th><th>Игрок B</th></tr>';
        resultHtml += `<tr><td>Средний выигрыш</td><td>${avgPayoffA.toFixed(2)}</td><td>${avgPayoffB.toFixed(2)}</td></tr>`;
        for (let i = 0; i < rows; i++) {
            const freqA = (strategyCountsA[i] / iterations * 100).toFixed(2);
            const freqB = i < cols ? (strategyCountsB[i] / iterations * 100).toFixed(2) : "-";
            resultHtml += `<tr><td>Частота стратегии ${i + 1}</td><td>${freqA}%</td><td>${freqB}%</td></tr>`;
        }
        resultHtml += '</table>';

        // Обновляем DOM: balanceChart в #iterative-results, strategyChart в #iterative-chart
        const iterativeResults = checkElement("iterative-results");
        const iterativeChart = checkElement("iterative-chart");

        // Делаем элементы видимыми перед заполнением
        iterativeResults.style.display = 'block';
        iterativeChart.style.display = 'block';

        iterativeResults.innerHTML = `
            <h3>Баланс по раундам</h3>
            <canvas id="balanceChart"></canvas>
            ${resultHtml}
        `;
        iterativeChart.innerHTML = `
            <h3>Частота комбинаций стратегий</h3>
            <canvas id="strategyChart"></canvas>
        `;

        // Устанавливаем размеры канвасов через CSS, а не напрямую
        const balanceCanvas = checkElement("balanceChart");
        const strategyCanvas = checkElement("strategyChart");

        // Инициализация balanceChart
        if (!balanceCanvas) {
            console.error("Канвас balanceChart не найден!");
            throw new Error("Канвас balanceChart не найден!");
        }
        if (balanceChart) balanceChart.destroy();
        balanceChart = new Chart(balanceCanvas, {
            type: "line",
            data: {
                labels: Array.from({ length: iterations + 1 }, (_, i) => i),
                datasets: [
                    {
                        label: "Баланс Игрока A",
                        data: balanceHistoryA,
                        borderColor: document.body.className === "dark" ? "#3b82f6" : "#166534",
                        pointBackgroundColor: document.body.className === "dark" ? "#3b82f6" : "#166534",
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHitRadius: 8,
                        pointHoverRadius: 8,
                        pointStyle: 'circle',
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: "Баланс Игрока B",
                        data: balanceHistoryB,
                        borderColor: document.body.className === "dark" ? "#ef4444" : "#ea580c",
                        pointBackgroundColor: document.body.className === "dark" ? "#ef4444" : "#ea580c",
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHitRadius: 8,
                        pointHoverRadius: 8,
                        pointStyle: 'circle',
                        fill: false,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuad'
                },
                scales: {
                    y: { 
                        title: { 
                            display: true, 
                            text: "Баланс", 
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: { 
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" }
                        }
                    },
                    x: { 
                        title: { 
                            display: true, 
                            text: "Раунд", 
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: { 
                            maxTicksLimit: 10, 
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 18, weight: 'normal', family: "'Roboto', sans-serif" },
                            boxWidth: 20,
                            boxHeight: 20,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: document.body.className === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        titleColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        bodyColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderWidth: 1,
                        titleFont: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" },
                        bodyFont: { size: 14, weight: 'normal', family: "'Roboto', sans-serif" },
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
        console.log("balanceChart успешно инициализирован");

        // Новый расчёт кумулятивных частот комбинаций стратегий
        const darkStrategyColors = [
            '#3b82f6', '#ef4444', '#22c55e', '#facc15', 
            '#a855f7', '#14b8a6', '#f97316', '#ec4899'
        ];
        const lightStrategyColors = [
            '#166534', '#be123c', '#0ea5e9', '#d97706', 
            '#7c3aed', '#047857', '#ea580c', '#db2777'
        ];
        const cumulativeCounts = Array(rows * cols).fill(0);
        const frequencyData = Array(rows * cols).fill().map(() => Array(iterations).fill(0));

        // Кумулятивный подсчёт частот
        for (let round = 0; round < iterations; round++) {
            const [moveA, moveB] = moveHistory[round];
            const combinationIndex = moveA * cols + moveB;
            cumulativeCounts[combinationIndex]++;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const index = i * cols + j;
                    frequencyData[index][round] = (cumulativeCounts[index] / (round + 1)) * 100;
                }
            }
        }

        // Подготовка данных для графика
        const datasets = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const index = i * cols + j;
                const color = document.body.className === "dark"
                    ? darkStrategyColors[index % darkStrategyColors.length]
                    : lightStrategyColors[index % lightStrategyColors.length];
                datasets.push({
                    label: `A${i + 1},B${j + 1}`,
                    data: frequencyData[index],
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.2)'),
                    pointBackgroundColor: color,
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'circle',
                    fill: false,
                    tension: 0.2,
                    showLine: true
                });
            }
        }

        // Создание графика strategyChart
        if (!strategyCanvas) {
            console.error("Канвас strategyChart не найден!");
            throw new Error("Канвас strategyChart не найден!");
        }
        if (strategyChart) strategyChart.destroy();
        strategyChart = new Chart(strategyCanvas, {
            type: "line",
            data: {
                labels: Array.from({ length: iterations }, (_, i) => i + 1),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeInOutCubic'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: "Частота выбора (%)",
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" },
                            stepSize: 20
                        },
                        grid: {
                            color: document.body.className === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Раунд",
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 22, weight: 'normal', family: "'Roboto', sans-serif" },
                            padding: 10
                        },
                        ticks: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" },
                            maxTicksLimit: 12
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                            font: { size: 18, weight: 'normal', family: "'Roboto', sans-serif" },
                            boxWidth: 20,
                            boxHeight: 20,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: document.body.className === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        titleColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        bodyColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderColor: document.body.className === "dark" ? "#e0e0e0" : "#1a3c34",
                        borderWidth: 1,
                        titleFont: { size: 16, weight: 'normal', family: "'Roboto', sans-serif" },
                        bodyFont: { size: 14, weight: 'normal', family: "'Roboto', sans-serif" },
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
        console.log("strategyChart успешно инициализирован");
    } catch (error) {
        console.error("Ошибка в runIterativeGame:", error);
        alert("Произошла ошибка при запуске симуляции: " + error.message);
    }
}

// Инициализация приложения
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM полностью загружен, начинаем привязку событий");
    initTheme(); // Инициализируем тему
    setupTabs();
    console.log("setupTabs выполнена");

    const themeSelect = checkElement('theme-select');
    themeSelect.addEventListener('change', switchTheme);
    console.log("Событие change привязано к themeSelect");

    // Настройка модальных окон
    const matrixModal = setupModal(
        'matrix-fill-modal',
        'matrix-fill-type',
        'matrix-fill-note',
        'matrix-fill-confirm',
        'matrix-fill-cancel',
        'rows',
        'cols',
        false
    );
    const iterativeModal = setupModal(
        'iterative-fill-modal',
        'iterative-fill-type',
        'iterative-fill-note',
        'iterative-fill-confirm',
        'iterative-fill-cancel',
        'iterative-rows',
        'iterative-cols',
        true
    );

    const fillMatrixBtn = checkElement('fill-matrix-btn');
    fillMatrixBtn.addEventListener('click', () => {
        matrixModal.style.display = 'flex';
    });
    console.log("Событие click привязано к fillMatrixBtn");

    const fillIterativeMatrixBtn = checkElement('fill-iterative-matrix-btn');
    fillIterativeMatrixBtn.addEventListener('click', () => {
        iterativeModal.style.display = 'flex';
    });
    console.log("Событие click привязано к fillIterativeMatrixBtn");

    const calculateBtn = checkElement('calculate-btn');
    calculateBtn.addEventListener('click', calculateNash);
    console.log("Событие click привязано к calculateBtn");

    const runSimulationBtn = checkElement('run-simulation');
    runSimulationBtn.addEventListener('click', () => runIterativeGame());
    console.log("Событие click привязано к runSimulationBtn");
});