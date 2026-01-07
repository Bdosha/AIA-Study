/*
 * Класс RandomnessAnalyzer — реализует статистические тесты оценки случайности.
 * Включает тест частоты, энтропию, тест серий и вычисление p-value.
 */
export class RandomnessAnalyzer {
  /* Вычисляет долю единиц в битовой последовательности. */
  propOnes(bits) {
    const valid = bits.filter((b) => b === 0 || b === 1);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((a, b) => a + b, 0);
    return sum / valid.length;
  }

  /* Вычисляет энтропию Шеннона (битовую меру случайности). */
  entropy(bits) {
    const valid = bits.filter((b) => b === 0 || b === 1);
    if (valid.length === 0) return 0;

    const p = this.propOnes(valid);
    if (p <= 0 || p >= 1) return 0;
    return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }

  /* Вычисляет среднюю длину серий одинаковых символов. */
  runs(bits) {
    const valid = bits.filter((b) => b === 0 || b === 1);
    const n = valid.length;
    if (n < 2) return 0;

    let runs = 1;
    for (let i = 1; i < n; i++) {
      if (valid[i] !== valid[i - 1]) runs++;
    }
    return n / runs;
  }

  /* Частотный тест: вычисление p-value по суммарному отклонению. */
  pValueFreq(bits) {
    const valid = bits.filter((b) => b === 0 || b === 1);
    const n = valid.length;
    if (n === 0) return 0;

    const s = valid.reduce((a, b) => a + (b ? 1 : -1), 0);
    const sobs = Math.abs(s) / Math.sqrt(n);
    return this.erfc(sobs / Math.SQRT2);
  }

  /* Комплементарная функция ошибок (используется при расчёте p-value). */
  erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const ans =
      t *
      Math.exp(
        -z * z -
          1.26551223 +
          t *
            (1.00002368 +
              t *
                (0.37409196 +
                  t *
                    (0.09678418 +
                      t *
                        (-0.18628806 +
                          t *
                            (0.27886807 +
                              t *
                                (-1.13520398 +
                                  t *
                                    (1.48851587 +
                                      t * (-0.82215223 + t * 0.17087277))))))))
      );
    return x >= 0 ? ans : 2 - ans;
  }

  /*
   * Возвращает сводный отчёт по всем метрикам.
   * @returns {Object} объект с полями propOnes, entropy, avgRunLen, pValueFreq
   */
  fullReport(bits) {
    return {
      propOnes: this.propOnes(bits),
      entropy: this.entropy(bits),
      avgRunLen: this.runs(bits),
      pValueFreq: this.pValueFreq(bits),
    };
  }
}
