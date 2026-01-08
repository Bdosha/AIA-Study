/*** РАССТОЯНИЕ ХЭММИНГА ***/
function hammingDistance(text, decoded) {
  if (text.length !== decoded.length) {
    throw new Error('Длины строк должны совпадать для вычисления расстояния Хэмминга');
  }
  let distance = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== decoded[i]) distance++;
  }
  return distance;
}