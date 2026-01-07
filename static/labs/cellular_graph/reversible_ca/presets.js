
function presetRandom(grid, d = .28) {
  grid.clear();
  const w = Math.max(2, Math.floor(grid.w * .6)),
        h = Math.max(2, Math.floor(grid.h * .6));
  const x0 = Math.floor((grid.w - w) / 2),
        y0 = Math.floor((grid.h - h) / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      grid.set(x0 + x, y0 + y, Math.random() < d ? 1 : 0);
}


function presetBlank(grid) {
  grid.clear();
}


function presetBlockGas(grid) {
  grid.clear();
  for (let y = 0; y < grid.h; y += 4) {
    for (let x = 0; x < grid.w; x += 4) {
      grid.set(x, y, 1);
      grid.set(x + 1, y + 1, 1);
      grid.set(x + 2, y + 2, 1);
      grid.set(x + 3, y + 3, 1);
    }
  }
}

function presetGliders(grid) {
  grid.clear();


  const shape1 = [
    [0,0],[2,0],[1,1],[0,2],[2,2]
  ];


  const shape2 = [
    [0,0],[1,1],[2,2],[3,3],[4,4],[5,5]
  ];


  const shape3 = [

    [0,1],[1,0],[1,1],[2,1],[1,2],

    [5,1],[6,0],[6,1],[7,1],[6,2]
  ];

  const shapes = [shape1, shape2, shape3];
  const offs = [
    [Math.floor(grid.w * 0.25), Math.floor(grid.h * 0.3)],
    [Math.floor(grid.w * 0.55), Math.floor(grid.h * 0.45)],
    [Math.floor(grid.w * 0.35), Math.floor(grid.h * 0.7)]
  ];

  for (let i = 0; i < shapes.length; i++) {
    for (const [dx, dy] of shapes[i]) {
      const x = (offs[i][0] + dx) % grid.w;
      const y = (offs[i][1] + dy) % grid.h;
      grid.set(x, y, 1);
    }
  }
}


function presetCheckerboard(grid) {
  grid.clear();
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if ((x + y) % 2 === 0) grid.set(x, y, 1);
    }
  }
}


function presetCrittersPattern(grid) {
  grid.clear();
  const patterns = [
    [[0,0],[1,0],[1,1],[2,1],[2,2]],
    [[5,5],[6,5],[6,6],[7,6],[7,7]],
    [[10,2],[11,2],[11,3],[12,3],[12,4]]
  ];
  for (const form of patterns) {
    for (const [dx, dy] of form) {
      const x = dx % grid.w, y = dy % grid.h;
      grid.set(x, y, 1);
    }
  }
}
