/*** КОД РИДА-СОЛОМОНА ***/
/* Арифметика в поле Галуа GF(2^8) */
const gf = (() => {
  const poly = 0x11d;
  const expTable = new Uint8Array(512);
  const logTable = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    expTable[i] = x;
    logTable[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= poly;
  }
  for (let i = 255; i < 512; i++) expTable[i] = expTable[i - 255];
  function add(a, b) { return a ^ b; }
  function mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return expTable[(logTable[a] + logTable[b]) % 255];
  }
  function div(a, b) {
    if (b === 0) throw new Error("Division by zero");
    if (a === 0) return 0;
    let diff = logTable[a] - logTable[b];
    if (diff < 0) diff += 255;
    return expTable[diff];
  }
  function inverse(a) {
    if (a === 0) throw new Error("Inverse of zero");
    return expTable[255 - logTable[a]];
  }
  return { add, mul, div, inverse, expTable, logTable };
})();
/* Умножение полиномов в GF */
function rsPolyMul(p1, p2) {
  const res = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gf.mul(p1[i], p2[j]);
    }
  }
  return res;
}
/* Генерирующий полином Рида-Соломона */
function rsGeneratePoly(nsym) {
  let gen = [1];
  for (let i = 0; i < nsym; i++) {
    gen = rsPolyMul(gen, [1, gf.expTable[i]]);
  }
  return gen;
}
/* Кодировка сообщения */
function rsEncodeMsg(msg, nsym) {
  const gen = rsGeneratePoly(nsym);
  let msgOut = msg.concat(new Array(nsym).fill(0));
  for (let i = 0; i < msg.length; i++) {
    const coef = msgOut[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msgOut[i + j] ^= gf.mul(gen[j], coef);
      }
    }
  }
  return msg.concat(msgOut.slice(msg.length));
}
/* Вычисление синдромов ошибки */
function rsCalcSyndromes(msg, nsym) {
  let synd = [];
  for (let i = 0; i < nsym; i++) {
    let s = 0;
    for (let j = 0; j < msg.length; j++) {
      s ^= gf.mul(msg[j], gf.expTable[(i * j) % 255]);
    }
    synd.push(s);
  }
  return synd;
}
/* Проверка синдромов на наличие ошибок */
function rsCheckSyndromes(synd) {
  return synd.every(v => v === 0);
}
/* Алгоритм Берлекэмпа-Месси для вычисления локатора ошибок */
function rsBerlekampMassey(synd) {
  if (rsCheckSyndromes(synd)) return [1];
  let errLoc = [1];
  let oldLoc = [1];
  for (let i = 0; i < synd.length; i++) {
    let delta = synd[i];
    for (let j = 1; j < errLoc.length; j++) {
      delta ^= gf.mul(errLoc[errLoc.length - 1 - j], synd[i - j]);
    }
    oldLoc.push(0);
    if (delta !== 0) {
      if (oldLoc.length > errLoc.length) {
        const newLoc = oldLoc.map(x => gf.mul(x, gf.div(1, delta)));
        oldLoc = errLoc.map(x => gf.mul(x, delta));
        errLoc = newLoc;
      }
      for (let j = 0; j < oldLoc.length; j++) {
        errLoc[errLoc.length - 1 - j] ^= gf.mul(delta, oldLoc[oldLoc.length - 1 - j]);
      }
    }
  }
  return errLoc;
}
/* Поиск позиций ошибок по локатору ошибок */
function rsFindErrors(errLoc, msgLen) {
  if (errLoc.length === 1) return [];
  const errs = errLoc.length - 1;
  let errPos = [];
  for (let i = 0; i < msgLen; i++) {
    let sum = 0;
    for (let j = 0; j < errLoc.length; j++) {
      sum ^= gf.mul(errLoc[j], gf.expTable[((255 - i) * j) % 255]);
    }
    if (sum === 0) errPos.push(msgLen - 1 - i);
  }
  if (errPos.length !== errs) {
    console.warn(`Предупреждение: число ошибок (${errPos.length}) не совпадает с локатором (${errs})`);
  }
  return errPos;
}
/* Вычисление производной локатора ошибок (нужно для алгоритма Форейна) */
function rsErrLocatorDerivative(errLoc) {
  let deriv = [];
  for (let i = 0; i < errLoc.length - 1; i++) {
    if (i % 2 === 0) continue; // члены с чётным индексом отсутствуют
    deriv.push(errLoc[i]);
  }
  return deriv;
}
/* Вычисление величин ошибок (алгоритм Форейна) */
function rsForney(errLoc, synd, errPos) {
  const errLocPrime = rsErrLocatorDerivative(errLoc);
  let errMag = new Array(errPos.length).fill(0);
  for (let i = 0; i < errPos.length; i++) {
    const xiInv = gf.expTable[(255 - errPos[i]) % 255];
    let numerator = 0;
    for (let j = 0; j < synd.length; j++) {
      numerator ^= gf.mul(synd[j], gf.expTable[((j + 1) * errPos[i]) % 255]);
    }
    let denominator = 0;
    for (let j = 0; j < errLocPrime.length; j++) {
      denominator ^= gf.mul(errLocPrime[j], gf.expTable[(j * errPos[i]) % 255]);
    }
    errMag[i] = gf.div(numerator, denominator);
  }
  return errMag;
}
/* Исправление ошибок по найденным позициям и величинам */
function rsCorrectErrorsWithMagnitude(msg, errPos, errMag) {
  const corrected = msg.slice();
  for (let i = 0; i < errPos.length; i++) {
    corrected[errPos[i]] ^= errMag[i];
  }
  return corrected;
}
/* Имитация помех в исходном сообщении */
function addNoise(buffer, errorRate, noiseType) {
  const corrupted = new Uint8Array(buffer);
  if (noiseType === "Случайные (равномерные)") {
    for (let i = 0; i < corrupted.length; i++) {
      if (Math.random() < errorRate / 100) corrupted[i] ^= 0xFF;
    }
  } else if (noiseType === "Импульсные (блоковые)") {
    if (errorRate > 0) {
      const blockSize = Math.min(3, corrupted.length);
      const start = Math.floor(Math.random() * (corrupted.length - blockSize));
      for (let i = start; i < start + blockSize; i++) {
        if (Math.random() < errorRate / 100) corrupted[i] ^= 0xFF;
      }
    }
  }
  return corrupted;
}
/* Преобразование массива в hex-строку */
function hexView(arr) {
    return Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join(' ');
}

/* Запуск алгоритма */
function runReedSolomon() {
  const inputStr = document.getElementById("inputText").value.trim();
  const nsym = 16; // число исправляющих символов
  const errorRate = parseFloat(document.getElementById("errorRate").value);
  const noiseType = document.getElementById("noiseType").value;
  const input = Array.from(inputStr).map(c => c.charCodeAt(0));
  const encoded = rsEncodeMsg(input, nsym);
  const corrupted = addNoise(encoded, errorRate, noiseType);
  const synd = rsCalcSyndromes(corrupted, nsym);
  const errLoc = rsBerlekampMassey(synd);
  const errPos = rsFindErrors(errLoc, corrupted.length);
  // При отсутствии ошибок выводим исходное
  if (errPos.length === 0) {
    const decodedStr = String.fromCharCode(...corrupted.slice(0, corrupted.length - nsym));
    document.getElementById("decodedText").textContent = decodedStr;
  }
  const errMag = rsForney(errLoc, synd, errPos);
  const decoded = rsCorrectErrorsWithMagnitude(corrupted, errPos, errMag);
  const decodedStr = String.fromCharCode(...decoded.slice(0, decoded.length - nsym));
  // Анализ
  const eff = Math.round((input.length-hammingDistance(input, decoded.slice(0, decoded.length - nsym)))/input.length*100); // Эффективность кодирования
  document.getElementById('efficiency').textContent = eff;
  const red = encoded.length-input.length; // Избыточность кодирования n-k
  document.getElementById('redundancy').textContent = red;
  const speed = (input.length/encoded.length).toFixed(2); // Кодовая скорость k/n
  document.getElementById('speed').textContent = speed;
  const compl = "O(n(n-k))"; // Вычислительная сложность
  document.getElementById('complexity').textContent = compl;
  document.getElementById("encodedText").textContent = hexView(encoded);
  document.getElementById("corruptedText").textContent = hexView(corrupted);
  document.getElementById("decodedText").textContent = decodedStr;
}
// Экспорт функции для вызова из UI
window.runReedSolomon = runReedSolomon;