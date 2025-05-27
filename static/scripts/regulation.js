function calculateT(V, epsilon, beta, omega, Kp, Ki, Kd, dt = 0.1) {
    let t = 0;
    let integral = 0;  // Интеграл ошибки

    // Функция переходного процесса o(t)
    function o(t) {
        return V + Math.exp(-beta * t) * Math.cos(omega * t);
    }

    // Функция ошибки e(t)
    function e(t) {
        return V - o(t);
    }

    // Производная ошибки e(t) по времени
    function de_dt(t) {
        return beta * Math.exp(-beta * t) * Math.cos(omega * t) - Math.exp(-beta * t) * omega * Math.sin(omega * t);
    }

    // Функция регулирования r(t)
    function r(t, e, de_dt) {
        integral += e * dt;
        return Kp * e + Ki * integral + Kd * de_dt;
    }

    let mindel = 99;
    // Основной цикл для нахождения минимального t, удовлетворяющего условию стабилизации
    while (t <20) {
        console.log('1')
        let error = e(t);
        let control = r(t, error, de_dt(t));
        mindel = Math.min(mindel, Math.abs(o(t) + control));

        if (Math.abs(o(t) + control) < epsilon) {
            return t;  // Нашли минимальное значение t
        }
        t += dt;
    }
    console.log(mindel, epsilon);

    return 5
}


function applyInput(v, t_max, e, b, w) {

    const Kp = parseFloat(document.getElementById("input1").value.replace(',', '.'));
    const Ki = parseFloat(document.getElementById("input2").value.replace(',', '.'));
    const Kd = parseFloat(document.getElementById("input3").value.replace(',', '.'));
    if (isNaN(Kp) || isNaN(Ki) || isNaN(Kd)) return;
    // console.log(document.getElementById("resultsSection"))

    // Пример использования функции
    const V = parseFloat(v.replace(',', '.'));

    const epsilon = parseFloat(e.replace(',', '.'));
    const beta = parseFloat(b.replace(',', '.'));
    const omega = parseFloat(w.replace(',', '.'));
    const tmax = parseFloat(t_max.replace(',', '.'));

    let t = calculateT(V, epsilon, beta, omega, Kp, Ki, Kd).toFixed(2);

    if (t === '5.00') t = "Слишком долго";
    console.log(V, epsilon, beta, omega)
    addColumn([Kp, Ki, Kd, t]);
    console.log("Значение времени t, при котором процесс стабилизируется:", t);
    document.getElementById("outputValue").textContent = t;

    if (t !== "Слишком долго") {
        t = parseFloat(t);
        console.log(t, tmax, t < tmax)
        if (t <= tmax) {
            const hiddenButton = document.getElementById("submitBtn");
            const toggleButton = document.getElementById("submitButton");
            hiddenButton.style.display = "inline-block"; // Делаем скрытую кнопку видимой
            toggleButton.disabled = true; // Деактивируем другую кнопку
        }
    }

}

// Обновление таблицы с результатами
function addColumn(values) {
    const table = document.getElementById("resultsTable");
    const headerRow = table.querySelector("thead tr");
    const rows = table.querySelectorAll("tbody tr");

    // Добавляем заголовок нового столбца
    const newHeaderCell = document.createElement("th");
    const columnIndex = headerRow.children.length; // определение индекса для "Попытка N"
    newHeaderCell.textContent = `Попытка ${columnIndex}`;
    headerRow.appendChild(newHeaderCell);

    // Добавляем значения в каждую строку таблицы
    values.forEach((value, index) => {
        const newCell = document.createElement("td");
        newCell.textContent = value;
        rows[index].appendChild(newCell);
    });
}