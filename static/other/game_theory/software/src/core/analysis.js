/**
 * Набор чистых вычислительных функций для анализа неантагонистической игры.
 * Функции не работают с DOM и могут проверяться отдельно от UI.
 */
(() => {

const EPSILON = 1e-9;

function computeBestResponses(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;

  const player1ByColumn = Array.from({ length: cols }, () => []);
  const player2ByRow = Array.from({ length: rows }, () => []);

  for (let col = 0; col < cols; col += 1) {
    let maxU1 = -Infinity;

    for (let row = 0; row < rows; row += 1) {
      maxU1 = Math.max(maxU1, matrix[row][col].u1);
    }

    for (let row = 0; row < rows; row += 1) {
      if (almostEqual(matrix[row][col].u1, maxU1)) {
        player1ByColumn[col].push(row);
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    let maxU2 = -Infinity;

    for (let col = 0; col < cols; col += 1) {
      maxU2 = Math.max(maxU2, matrix[row][col].u2);
    }

    for (let col = 0; col < cols; col += 1) {
      if (almostEqual(matrix[row][col].u2, maxU2)) {
        player2ByRow[row].push(col);
      }
    }
  }

  return { player1ByColumn, player2ByRow };
}

function findPureNash(bestResponses) {
  const pairs = [];

  bestResponses.player1ByColumn.forEach((rows, col) => {
    rows.forEach((row) => {
      if (bestResponses.player2ByRow[row].includes(col)) {
        pairs.push([row, col]);
      }
    });
  });

  return pairs;
}

function computeParetoSet(matrix) {
  const paretoSet = new Set();

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[0].length; col += 1) {
      if (!isDominated(matrix, row, col)) {
        paretoSet.add(pairKey(row, col));
      }
    }
  }

  return paretoSet;
}

function computeDilemmaIndicator(matrix, nashPairs) {
  if (nashPairs.length === 0) {
    return {
      isDilemma: false,
      explanation: "Равновесия Нэша не обнаружены.",
    };
  }

  const allDominated = nashPairs.every(([row, col]) => isDominated(matrix, row, col));

  return {
    isDilemma: allDominated,
    explanation: allDominated
      ? "Все равновесия Нэша Парето-доминируются другими исходами."
      : "Есть равновесие Нэша, которое не Парето-доминируется.",
  };
}

function computeMixedStrategy2x2(matrix) {
  if (matrix.length !== 2 || matrix[0].length !== 2) {
    return null;
  }

  const a = matrix[0][0].u1;
  const b = matrix[0][1].u1;
  const c = matrix[1][0].u1;
  const d = matrix[1][1].u1;

  const a2 = matrix[0][0].u2;
  const b2 = matrix[0][1].u2;
  const c2 = matrix[1][0].u2;
  const d2 = matrix[1][1].u2;

  const qDenominator = a - b - c + d;
  const pDenominator = a2 - c2 - b2 + d2;

  if (almostEqual(qDenominator, 0) || almostEqual(pDenominator, 0)) {
    return null;
  }

  const q = (d - b) / qDenominator;
  const p = (d2 - c2) / pDenominator;

  if (p < -EPSILON || p > 1 + EPSILON || q < -EPSILON || q > 1 + EPSILON) {
    return null;
  }

  const boundedP = clampProbability(p);
  const boundedQ = clampProbability(q);

  const expectedU1 =
    boundedP * boundedQ * a +
    boundedP * (1 - boundedQ) * b +
    (1 - boundedP) * boundedQ * c +
    (1 - boundedP) * (1 - boundedQ) * d;

  const expectedU2 =
    boundedP * boundedQ * a2 +
    boundedP * (1 - boundedQ) * b2 +
    (1 - boundedP) * boundedQ * c2 +
    (1 - boundedP) * (1 - boundedQ) * d2;

  return {
    p: boundedP,
    q: boundedQ,
    expectedU1,
    expectedU2,
  };
}

function formatOutcome(row, col) {
  return `(i${row + 1}, j${col + 1})`;
}

function pairKey(row, col) {
  return `${row},${col}`;
}

function isDominated(matrix, targetRow, targetCol) {
  const current = matrix[targetRow][targetCol];

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[0].length; col += 1) {
      if (row === targetRow && col === targetCol) {
        continue;
      }

      const candidate = matrix[row][col];
      const noWorse = candidate.u1 >= current.u1 && candidate.u2 >= current.u2;
      const strictlyBetter = candidate.u1 > current.u1 || candidate.u2 > current.u2;

      if (noWorse && strictlyBetter) {
        return true;
      }
    }
  }

  return false;
}

function clampProbability(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function almostEqual(a, b) {
  return Math.abs(a - b) <= EPSILON;
}

window.GTLabAnalysis = {
  computeBestResponses,
  findPureNash,
  computeParetoSet,
  computeDilemmaIndicator,
  computeMixedStrategy2x2,
  formatOutcome,
  pairKey,
};
})();
