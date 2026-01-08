/*** КОД ХЭММИНГА ***/
// Вычисление количества проверочных бит
function calcParityBits(k) {
  let r = 0;
  while ((k + r + 1) > Math.pow(2, r)) r++;
  return r;
}
// Кодирование Хэмминга (вставка проверочных бит)
function hammingEncode(data) {
  const k = data.length;
  const r = calcParityBits(k);
  const n = k + r;
  const encoded = new Array(n + 1).fill(0);
  let dataIndex = 0;
  for (let i = 1; i <= n; i++) {
    if ((i & (i - 1)) === 0) {
      encoded[i] = 0;
    } else {
      encoded[i] = Number(data[dataIndex]);
      dataIndex++;
    }
  }
  for (let i = 0; i < r; i++) {
    const parityPos = 1 << i;
    let parity = 0;
    for (let j = 1; j <= n; j++) {
      if ((j & parityPos) && j !== parityPos) {
        parity ^= encoded[j];
      }
    }
    encoded[parityPos] = parity;
  }
  encoded.shift();
  return encoded.join('');
}
// Моделирование ошибок
// errorRate в процентах (0-100)
// noiseType: "Случайные (равномерные)" или "Импульсные (блоковые)"
function addNoiseHamming(encodedStr, errorRate, noiseType) {
  const n = encodedStr.length;
  const bits = encodedStr.split('').map(Number);
  const p = errorRate / 100;
  if (noiseType === 'Случайные (равномерные)') {
    // Каждый бит с вероятностью p инвертируем
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) {
        bits[i] ^= 1;
      }
    }
  } else if (noiseType === 'Импульсные (блоковые)') {
    const maxBlockSize = Math.floor(Math.sqrt(n));
    let pos = 0;
    while (pos < n) {
      // Выбираем длину блока случайно от 1 до maxBlockSize, но не выходя за конец массива
      const blockSize = Math.min(1 + Math.floor(Math.random() * maxBlockSize),n - pos);
      // С вероятностью p инвертируем весь блок
      if (Math.random() < p) {
        for (let i = pos; i < pos + blockSize; i++) {
          bits[i] ^= 1;
        }
      }
      // Переходим к следующему блоку
      pos += blockSize;
    }
  }
  return bits.join('');
}
// Декодирование Хэмминга: исправление одной ошибки (если есть)
function hammingDecode(encoded) {
  const bits = encoded.split('').map(Number);
  const n = bits.length;
  // вычисляем r
  let r = 0;
  while (Math.pow(2, r) < n + 1) r++;
  // индексация с 1, вставим спереди для удобства
  bits.unshift(0);
  let errorPos = 0;
  for (let i = 0; i < r; i++) {
    const parityPos = 1 << i;
    let parity = 0;
    for (let j = 1; j <= n; j++) {
      if ((j & parityPos) != 0) {
        parity ^= bits[j];
      }
    }
    if (parity !== 0) {
      errorPos += parityPos;
    }
  }
  // исправляем ошибку, если она есть
  if (errorPos > 0 && errorPos <= n) {
    bits[errorPos] ^= 1;
  }
  // извлекаем информационные биты (не на позициях степеней двойки)
  let decoded = [];
  for (let i = 1; i <= n; i++) {
    if ((i & (i - 1)) !== 0) {
      decoded.push(bits[i]);
    }
  }
  return {
    corrected: bits.slice(1).join(''),
    decoded: decoded.join(''),
    errorPos: errorPos
  };
}
/* Запуск алгоритма */
function runHamming() {
    const text = document.getElementById('inputText').value.trim();
    const error = document.getElementById('errorRate').value.trim();
    const noise = document.getElementById('noiseType').value;
    const encodedData = hammingEncode(text); // Закодированное сообщение
    const corruptedData = addNoiseHamming(encodedData, error, noise); // Закодированное сообщение с ошибками
    const decodeResult = hammingDecode(corruptedData); // Восстановленное сообщение
    // Вывод
    document.getElementById('encodedText').textContent = encodedData;
    document.getElementById('corruptedText').textContent = corruptedData;
    document.getElementById('decodedText').textContent = decodeResult.decoded;
    // Анализ
    const eff = Math.round((text.length-hammingDistance(text, decodeResult.decoded))/text.length*100); // Эффективность кодирования
    document.getElementById('efficiency').textContent = eff;
    const red = encodedData.length-text.length; // Избыточность кодирования n-k
    document.getElementById('redundancy').textContent = red;
    const speed = (text.length/encodedData.length).toFixed(2); // Кодовая скорость k/n
    document.getElementById('speed').textContent = speed;
    const compl = "O(n)"; 
    document.getElementById('complexity').textContent = compl;
}
// Экспорт функции для вызова из UI
window.runHamming = runHamming;