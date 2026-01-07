/* =====================================
 * Import / Export JSON + presets
 * ===================================== */
export const Presets = {
  empty(g){ g.clear(); },
  random(g, p=0.32){ g.random(p); },
  oscillator_like(g){ g.clear(); const q=(g.w/2)|0, r=(g.h/2)|0; [[0,0],[1,0],[0,1],[1,1]].forEach(([dq,dr])=>g.set(q+dq,r+dr,1)); },
  glider_like(g){ g.clear(); const q=(g.w/2)|0, r=(g.h/2)|0; [[0,0],[1,0],[2,0],[0,1],[1,2]].forEach(([dq,dr])=>g.set(q+dq,r+dr,1)); }
};

export function exportJSON(grid, rules, kernel, bounds){
  return JSON.stringify({
    w:grid.w, h:grid.h, rule:rules.text, kernel, bounds, cells:[...grid.a]
  }, null, 2);
}

export function importJSON(obj, grid, rules, setKernel, setBounds){
  const { w, h, rule, kernel, bounds, cells } = obj;
  if(typeof w!== 'number' || typeof h!=='number') throw new Error('Некорректный размер поля');
  grid.resize(w,h);
  if(Array.isArray(cells) && cells.length===w*h) grid.a.set(cells.map(x=>x?1:0));
  if(rule) rules.set(rule);
  if(kernel) setKernel(kernel);
  if(bounds) setBounds(bounds);
}