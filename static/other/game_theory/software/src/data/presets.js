/**
 * Каталог предустановленных биматриц для лабораторной работы.
 */
(() => {

const BASE_PRESETS = {
  prisoners: {
    label: "Дилемма заключённого (2×2)",
    rows: 2,
    cols: 2,
    matrix: [
      [
        { u1: 3, u2: 3 },
        { u1: 0, u2: 5 },
      ],
      [
        { u1: 5, u2: 0 },
        { u1: 1, u2: 1 },
      ],
    ],
  },
  stagHunt: {
    label: "Охота на оленя (2×2)",
    rows: 2,
    cols: 2,
    matrix: [
      [
        { u1: 4, u2: 4 },
        { u1: 0, u2: 3 },
      ],
      [
        { u1: 3, u2: 0 },
        { u1: 3, u2: 3 },
      ],
    ],
  },
  battleSexes: {
    label: "Битва полов (2×2)",
    rows: 2,
    cols: 2,
    matrix: [
      [
        { u1: 2, u2: 1 },
        { u1: 0, u2: 0 },
      ],
      [
        { u1: 0, u2: 0 },
        { u1: 1, u2: 2 },
      ],
    ],
  },
  twoCafes: {
    label: "Дилемма двух кафе (3×3)",
    rows: 3,
    cols: 3,
    matrix: [
      [
        { u1: 3, u2: 3 },
        { u1: 2, u2: 2 },
        { u1: 1, u2: 1 },
      ],
      [
        { u1: 2, u2: 2 },
        { u1: 4, u2: 4 },
        { u1: 2, u2: 2 },
      ],
      [
        { u1: 1, u2: 1 },
        { u1: 2, u2: 2 },
        { u1: 3, u2: 3 },
      ],
    ],
  },
  cournot: {
    label: "Дуополия Курно (5×5)",
    rows: 5,
    cols: 5,
    matrix: buildCournotMatrix(),
  },
};

function getPresetOptions() {
  return Object.entries(BASE_PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label,
  }));
}

function getPresetById(id) {
  const preset = BASE_PRESETS[id];
  if (!preset) return null;

  return {
    rows: preset.rows,
    cols: preset.cols,
    matrix: cloneMatrix(preset.matrix),
  };
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.map((cell) => ({ ...cell })));
}

function buildCournotMatrix() {
  const a = 10;
  const b = 1;
  const c = 2;
  const levels = [1, 2, 3, 4, 5];

  return levels.map((q1) =>
    levels.map((q2) => {
      const price = a - b * (q1 + q2);
      const u1 = (price - c) * q1;
      const u2 = (price - c) * q2;

      return {
        u1: roundToTwo(u1),
        u2: roundToTwo(u2),
      };
    })
  );
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

window.GTLabPresets = {
  getPresetOptions,
  getPresetById,
};
})();
