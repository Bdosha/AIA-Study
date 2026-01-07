// Правила клеточного автомата

/** Простейшее правило: состояние не меняется. */
export const TrivialRule = { next(alive, n) { return !!alive; } };

/**
 * Разбирает DSL формата B{nums}/S{nums} (порядок не важен, регистр не важен).
 * Пример: "B3/S23"
 * @returns {{births:number[], survives:number[]}|null}
 */
export function parseLifeDSL(dsl) {
  if (!dsl || typeof dsl !== 'string') return null;
  const upper = dsl.toUpperCase();
  // Разрешаем форматы:
  //  - B3/S23 (классика, одноцифровые)
  //  - B3,10,12 / S2,12 (через запятые)
  //  - B: 3 10 12 / S: 2 12 (через пробелы, двоеточие/без него)
  // Нормализуем разделители в запятые внутри каждого блока B/S
  const parts = upper.split('/').map(p => p.trim());
  let births = [], survives = [];
  for (let p of parts) {
    if (!p) continue;
    // вытаскиваем тип секции и хвост
    let kind = null; let tail = '';
    if (p.startsWith('B')) { kind = 'B'; tail = p.slice(1); }
    else if (p.startsWith('S')) { kind = 'S'; tail = p.slice(1); }
    else continue;
    // допускаем опциональное двоеточие
    tail = tail.replace(/^\s*:\s*/, '');
    // Поддерживаем варианты:
    //  - без разделителей: "23" (классика) или одиночные многозначные "10"/"11"/"12"
    //  - с разделителями (пробел/запятая/другое): извлекаем целые числа
    let nums = [];
    if (/^\d+$/.test(tail)) {
      // Хвост состоит только из цифр.
      // Спец‑случай: одиночные многозначные 10/11/12 — трактуем как одно число.
      if (tail === '10' || tail === '11' || tail === '12') {
        nums = [parseInt(tail, 10)];
      } else {
        // Классический слитный формат: каждая цифра отдельно (например, "23" => [2,3])
        nums = tail.split('').map(x => parseInt(x, 10));
      }
    } else {
      // поддержка многозначных: режем по нецифровым разделителям
      nums = tail.split(/[^\d]+/).filter(Boolean).map(x => parseInt(x, 10));
    }
    if (kind === 'B') births = nums.filter(Number.isFinite);
    else survives = nums.filter(Number.isFinite);
  }
  if (births.length === 0 && survives.length === 0) return null;
  return { births, survives };
}

/**
 * Создаёт 2-состояний rule из DSL (B/S) с ограничением maxN.
 * @param {string} dsl
 * @param {number} maxN
 * @returns {{next(alive:number, n:number): boolean}|null}
 */
export function lifeFromDSL(dsl, maxN) {
  const parsed = parseLifeDSL(dsl);
  if (!parsed) return null;
  const births = new Set(parsed.births.filter(n => n >= 0 && n <= maxN));
  const survives = new Set(parsed.survives.filter(n => n >= 0 && n <= maxN));
  return {
    next(alive, n) {
      if (!alive) return births.has(n);
      return survives.has(n);
    }
  };
}

/**
 * Базовый тоталистический каркас (2 состояния).
 * @param {{births?:number[], survives?:number[], states?:number}} opts
 */
export function totalistic({ births = [], survives = [], states = 2 } = {}) {
  const b = new Set(births);
  const s = new Set(survives);
  return {
    next(alive, n) {
      if (!alive) return b.has(n);
      return s.has(n);
    }
  };
}

/** Реестр правил. */
export const Rules = {
  maxNeighborsFor(kernel) {
    return kernel === 'edge-3' ? 3 : 12;
  },
  makeLife(dsl, kernel) {
    const maxN = this.maxNeighborsFor(kernel);
    return lifeFromDSL(dsl, maxN);
  },
  makeTotalistic(opts) {
    return totalistic(opts);
  }
};
