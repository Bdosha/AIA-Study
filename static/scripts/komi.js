// Обработчик для раскрытия/скрытия руководства
document.querySelector('.guide-header').addEventListener('click', function() {
  const guideContent = document.querySelector('.guide-content');
  const guideHeader = this;
  
  guideContent.classList.toggle('active');
  guideHeader.classList.toggle('active');
});

// Удаление нуля по клику
function DeleteOnClick(event) {
  const input = event.target;    
  if (input.value === "0") {       
    input.value = "";           
  }                            
}

function restoreZeroOnBlur(event) {
  const input = event.target;
  if (input.value === "" && !input.disabled) {
    input.value = "0";
  }
}

// Навигация между ячейками стрелками
function handleArrowNavigation(event) {
  const key = event.key;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return;
  
  event.preventDefault();
  
  const currentInput = event.target;
  const row = parseInt(currentInput.getAttribute("data-row"), 10);
  const col = parseInt(currentInput.getAttribute("data-col"), 10);
  const numVertices = parseInt(document.getElementById("number_of_v").value, 10);
  
  let newRow = row;
  let newCol = col;
  let attempts = 0;
  const maxAttempts = numVertices * 2;
  
  do {
    attempts++;
    
    switch(key) {
      case "ArrowUp": 
        newRow = (newRow - 1 + numVertices) % numVertices; 
        break;
      case "ArrowDown": 
        newRow = (newRow + 1) % numVertices; 
        break;
      case "ArrowLeft": 
        newCol = (newCol - 1 + numVertices) % numVertices; 
        break;
      case "ArrowRight": 
        newCol = (newCol + 1) % numVertices; 
        break;
    }
    
    if (attempts >= maxAttempts) return;
    
  } while (newRow === newCol);
  
  const selector = `input[data-row="${newRow}"][data-col="${newCol}"]:not([disabled])`;
  const targetInput = document.querySelector(selector);
  
  if (targetInput) {
    if (targetInput.value === "0") {
      DeleteOnClick({ target: targetInput });
    }
    targetInput.focus();
  }
}

// Случайное заполнение матрицы
function AutoGenerate() {
  const inputs = document.querySelectorAll("#matrixContainer table input:not([disabled])");
  inputs.forEach(input => {
    input.value = Math.floor(Math.random() * 100) + 1;
  });
}

// Генерация матрицы
function komi() {
  const numVertices = parseInt(document.getElementById("number_of_v").value, 10);
  if (isNaN(numVertices) || numVertices < 1 || numVertices > 10) {
    alert("Введите целое число в диапазоне от 1 до 10");
    return;
  }

  let matrixHTML = `
    <table>
      ${Array.from({length: numVertices}, (_, i) => `
        <tr>
          ${Array.from({length: numVertices}, (_, j) => `
            <td>
              ${i === j 
                ? `<input type="number" value="-1" disabled data-row="${i}" data-col="${j}">`
                : `<input type="number" value="0" min="0" data-row="${i}" data-col="${j}">`
              }
            </td>
          `).join('')}
        </tr>
      `).join('')}
    </table>
    <div class='matrix-buttons-container'>
      <button id="submitMatrixButton1">Ввод матрицы</button>
      <button id="submitMatrixButton2">Сгенерировать случайную матрицу</button>
    </div>
  `;

  document.getElementById("matrixContainer").innerHTML = matrixHTML;

  setTimeout(() => {
    document.getElementById("matrixContainer").scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, 50);

  document.querySelectorAll("#matrixContainer table input:not([disabled])").forEach(input => {
    input.addEventListener("click", DeleteOnClick);
    input.addEventListener("keydown", handleArrowNavigation);
    input.addEventListener("blur", restoreZeroOnBlur);
    input.addEventListener("input", function(e) {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  });

  document.getElementById("submitMatrixButton1").addEventListener("click", submitMatrix);
  document.getElementById("submitMatrixButton2").addEventListener("click", AutoGenerate);
}

// Отправка матрицы и отрисовка графа
function submitMatrix() {
  const numVertices = parseInt(document.getElementById("number_of_v").value, 10);
  const inputs = document.querySelectorAll("#matrixContainer table input");
  const matrix = Array(numVertices).fill().map(() => Array(numVertices).fill(0));

  inputs.forEach(input => {
    const row = parseInt(input.getAttribute("data-row"), 10);
    const col = parseInt(input.getAttribute("data-col"), 10);
    matrix[row][col] = parseFloat(input.value) || 0;
  });

  fetch('', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ matrix: matrix })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Сервер вернул ошибку: ' + response.status);
    }
    return response.json();
  })
  .then(data => {
    console.log('Ответ от сервера:', data);
    // Добавляем вывод информации о пути
    showPathInfo(data);
    // Передаем данные пути в функцию отрисовки
    drawGraph(matrix, true, data.path, data.cost);
  })
  .catch(error => {
    console.error('Ошибка при отправке матрицы:', error);
    alert('Ошибка при отправке матрицы. См. консоль.');
  });
}

// Новая функция для отображения информации о пути
function showPathInfo(data) {
  let infoContainer = document.getElementById("pathInfoContainer");
  if (infoContainer) infoContainer.remove();
  
  infoContainer = document.createElement("div");
  infoContainer.id = "pathInfoContainer";
  infoContainer.className = "path-info-container";
  
  const pathStr = data.path.join(' → ');
  infoContainer.innerHTML = `
    <div class="path-info-header">
      <h3>Оптимальный путь найден!</h3>
    </div>
    <div class="path-info-content">
      <div class="path-info-item">
        <span class="path-info-label">Маршрут:</span>
        <span class="path-info-value">${pathStr}</span>
      </div>
      <div class="path-info-item">
        <span class="path-info-label">Общая стоимость:</span>
        <span class="path-info-value">${data.cost}</span>
      </div>
    </div>
  `;
  
  // Вставляем контейнер после matrixContainer
  document.getElementById("matrixContainer").appendChild(infoContainer);
}

// Отрисовка графа
function drawGraph(matrix, oriented = true, optimalPath = [], cost = 0) {
  let container = document.getElementById("graphContainer");
  if (container) container.remove();
  
  container = document.createElement("div");
  container.id = "graphContainer";
  container.className = "graph-container";
  document.body.appendChild(container);

  const scale = 4;
  const displaySize = 800;
  const canvas = document.createElement("canvas");
  canvas.width = displaySize * scale;
  canvas.height = displaySize * scale;
  canvas.style.width = displaySize + 'px';
  canvas.style.height = displaySize + 'px';
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;

  const centerX = displaySize / 2;
  const centerY = displaySize / 2;
  const radius = displaySize / 2 - 50;
  const vertices = matrix.map((_, i) => {
    const angle = (2 * Math.PI * i) / matrix.length;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Создаем массив ребер оптимального пути для проверки
  const optimalEdges = [];
  if (optimalPath && optimalPath.length > 0) {
    for (let i = 0; i < optimalPath.length - 1; i++) {
      const from = optimalPath[i] - 1; // преобразуем в 0-based
      const to = optimalPath[i+1] - 1;
      optimalEdges.push(`${from}-${to}`);
    }
  }

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (i === j || matrix[i][j] <= 0) continue;

      const isOptimal = optimalEdges.includes(`${i}-${j}`);
      const start = vertices[i];
      const end = vertices[j];
      const hasReverse = matrix[j][i] > 0;
      
      if (hasReverse) {
        drawCurvedEdge(ctx, start, end, i < j, matrix[i][j], oriented, isOptimal);
      } else {
        drawStraightEdge(ctx, start, end, matrix[i][j], oriented, isOptimal);
      }
    }
  }

  vertices.forEach((pos, i) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(173, 216, 230, 0.5)";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.fillText(i + 1, pos.x, pos.y);
  });

  setTimeout(() => {
    container.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    container.classList.add('highlight');
  }, 100);
}

// Функции для рисования ребер
function drawStraightEdge(ctx, start, end, weight, oriented, isOptimal = false) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = isOptimal ? "#FF5252" : "#BCBCBC"; // Красный для оптимального пути
  ctx.lineWidth = isOptimal ? 5 : 3; // Толще для оптимального пути
  ctx.stroke();

  ctx.fillStyle = isOptimal ? "#FF5252" : "white";
  ctx.fillText(weight, (start.x + end.x) / 2, (start.y + end.y) / 2 + 20);

  if (oriented) drawArrow(ctx, start, end, isOptimal);
}

function drawCurvedEdge(ctx, start, end, isUpper, weight, oriented, isOptimal = false) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  const curvature = isUpper ? 15 : -80;
  const controlX = midX + nx * curvature;
  const controlY = midY + ny * curvature;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
  ctx.strokeStyle = isOptimal ? "#FF5252" : "#BCBCBC";
  ctx.lineWidth = isOptimal ? 5 : 3;
  ctx.stroke();

  const textX = (start.x + 2 * controlX + end.x) / 4;
  const textY = (start.y + 2 * controlY + end.y) / 4;
  ctx.fillStyle = isOptimal ? "#FF5252" : "white";
  ctx.fillText(weight, textX+10, textY-10);

  if (oriented) drawCurvedArrow(ctx, start, end, controlX, controlY, isOptimal);
}

// Функции для рисования стрелок
function drawArrow(ctx, start, end, isOptimal = false) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const vertexRadius = 20;
  const adjustedEnd = {
    x: end.x - vertexRadius * Math.cos(angle),
    y: end.y - vertexRadius * Math.sin(angle)
  };
  drawArrowHead(ctx, adjustedEnd.x, adjustedEnd.y, angle, isOptimal);
}

function drawCurvedArrow(ctx, start, end, controlX, controlY, isOptimal = false) {
  const t = 0.8;
  const dx = 2 * (1 - t) * (controlX - start.x) + 2 * t * (end.x - controlX);
  const dy = 2 * (1 - t) * (controlY - start.y) + 2 * t * (end.y - controlY);
  const angle = Math.atan2(dy, dx);
  const vertexRadius = 20;
  const adjustedEnd = {
    x: end.x - vertexRadius * Math.cos(angle),
    y: end.y - vertexRadius * Math.sin(angle)
  };
  drawArrowHead(ctx, adjustedEnd.x, adjustedEnd.y, angle, isOptimal);
}

function drawArrowHead(ctx, x, y, angle, isOptimal = false) {
  const arrowLength = 10;
  const arrowWidth = 5;
  const arrowX = x - arrowLength * Math.cos(angle);
  const arrowY = y - arrowLength * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(arrowX - arrowWidth * Math.sin(angle), arrowY + arrowWidth * Math.cos(angle));
  ctx.moveTo(x, y);
  ctx.lineTo(arrowX + arrowWidth * Math.sin(angle), arrowY - arrowWidth * Math.cos(angle));
  ctx.strokeStyle = isOptimal ? "#FF5252" : "#BCBCBC";
  ctx.lineWidth = isOptimal ? 3 : 2;
  ctx.stroke();
}

function validateVerticesInput(event) {
  const input = event.target;
  input.value = input.value.replace(/[^0-9]/g, ''); 
  
  const minVertices = 1;
  if (input.value < minVertices && input.value !== '') {
    input.value = minVertices;
  }
};

function handleEnterKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    
    if (event.target.id === 'number_of_v') {
      document.getElementById('generateMatrixButton').click();
    }
    else if (event.target.id === 'submitMatrixButton1') {
      event.target.click();
    }
  }
}

function initEventListeners() {
  document.getElementById('number_of_v').addEventListener('keydown', handleEnterKey);
  
  document.getElementById('generateMatrixButton').addEventListener('click', function() {
    setTimeout(() => {
      const submitBtn = document.getElementById('submitMatrixButton1');
      if (submitBtn) {
        submitBtn.addEventListener('keydown', handleEnterKey);
      }
    }, 50);
  });
}

document.getElementById("generateMatrixButton").addEventListener("click", komi);
document.getElementById('number_of_v').addEventListener('input', validateVerticesInput);
document.addEventListener('DOMContentLoaded', initEventListeners);