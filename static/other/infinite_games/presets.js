(function (root) {
  'use strict';

  const PRESETS = [
    {
      id: 'sniper',
      name: 'Игра снайпера и наблюдателя',
      expr: 'x*(1-y) + (1-x)*y - (x-y)^2',
      bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      x0: 0.1,
      y0: 0.9,
      alpha: 0.04,
      eps: 0.00001,
      maxIter: 500,
      gridDensity: 61,
      importantX: [0, 0.5, 1],
      importantY: [0, 0.5, 1],
      expected: {
        hasPureSaddle: true,
        price: 0.25,
        saddleSet: [
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 }
        ]
      }
    },
    {
      id: 'bimatrix',
      name: 'Биматричная игра с непрерывными стратегиями',
      expr: 'x*y - x^2 - y^2',
      bounds: { xMin: 0, xMax: 2, yMin: 0, yMax: 2 },
      x0: 0.5,
      y0: 0.5,
      alpha: 0.05,
      eps: 0.0001,
      maxIter: 600,
      gridDensity: 81,
      importantX: [0, 1, 2],
      importantY: [0, 1, 2],
      expected: {
        hasPureSaddle: true,
        price: -3,
        saddleSet: [{ x: 2, y: 1 }]
      }
    },
    {
      id: 'pursuit',
      name: 'Игра преследования на отрезке',
      expr: '-abs(x-y)',
      bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 },
      x0: 2,
      y0: 8,
      alpha: 0.15,
      eps: 0.0001,
      maxIter: 600,
      gridDensity: 81,
      importantX: [0, 5, 10],
      importantY: [0, 5, 10],
      expected: {
        hasPureSaddle: false,
        lower: -5,
        upper: 0,
        gap: 5
      }
    },
    {
      id: 'convex-concave',
      name: 'Выпукло-вогнутая функция',
      expr: 'x^2 - y^2',
      bounds: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
      x0: 0.8,
      y0: 0.8,
      alpha: 0.04,
      eps: 0.00001,
      maxIter: 600,
      gridDensity: 81,
      importantX: [-1, 0, 1],
      importantY: [-1, 0, 1],
      expected: {
        hasPureSaddle: true,
        price: 0,
        saddleSet: [{ x: 0, y: 0 }]
      }
    },
    {
      id: 'shops',
      name: 'Размещение конкурирующих магазинов',
      expr: '(x+y)/2 - abs(x-y)',
      bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      x0: 0.6,
      y0: 0.4,
      alpha: 0.04,
      eps: 0.0001,
      maxIter: 600,
      gridDensity: 81,
      importantX: [0, 0.25, 0.5, 1],
      importantY: [0, 0.25, 0.5, 1],
      expected: {
        hasPureSaddle: false,
        lower: -0.125,
        upper: 0,
        gap: 0.125
      }
    }
  ];

  function clonePreset(preset) {
    return JSON.parse(JSON.stringify(preset));
  }

  function getPresetById(id) {
    return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
  }

  root.GamePresets = {
    PRESETS,
    clonePreset,
    getPresetById
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.GamePresets;
  }
})(typeof window !== 'undefined' ? window : globalThis);
