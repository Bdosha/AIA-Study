// js/ntm/HabrNTM.js
// Реализация шагов NTM: чтение (2), erase+add запись (3–4), адресация (5–9).
// Формулы и нумерация — по статье Хабра «Объяснение нейронных машин Тьюринга».  [oai_citation:1‡Habr](https://habr.com/ru/articles/327614/?utm_source=chatgpt.com)

const eps = 1e-12;

function dot(u, v){ let s=0; for(let i=0;i<u.length;i++) s+=u[i]*v[i]; return s; }
function norm(u){ return Math.sqrt(dot(u,u)) + eps; }
function cosine(u, v){ return dot(u,v) / (norm(u)*norm(v)); }         // (6)
function softmax(arr){
  const m = Math.max(...arr);
  const ex = arr.map(x=>Math.exp(x-m)); const s = ex.reduce((a,b)=>a+b,0)+eps;
  return ex.map(x=>x/s);
}
// one-hot эмбеддинг символов в первые 3 колонки, остальное нули
export function symToVec(ch, cols){
  const v = new Array(cols).fill(0);
  if (ch === '0') v[0] = 1; else if (ch === '1') v[1] = 1; else v[2]=1;
  return v;
}
export function sigmoid(x){ return 1/(1+Math.exp(-x)); }
export function bce(p, y){
  let s = 0;
  for(let j=0;j<p.length;j++){
    const pj = Math.min(1-eps, Math.max(eps, p[j]));
    s += - (y[j]*Math.log(pj) + (1-y[j])*Math.log(1-pj));
  }
  return s / p.length;
}

// (5) content addressing
function w_content(M, k, beta){
  const sims = M.map(row => beta * cosine(k, row));
  return softmax(sims);
}
// (7) interpolation
function interpolate(wc, wprev, g){
  const out = new Array(wc.length);
  for (let i=0;i<wc.length;i++) out[i] = g*wc[i] + (1-g)*(wprev[i] ?? 0);
  return out;
}
// (8) circular convolution shift
function circConv(wg, s){
  const R = wg.length, out = new Array(R).fill(0);
  // s длины 3: [pL, p0, pR] → смещения -1,0,+1
  const offs = [-1, 0, +1];
  for(let i=0;i<R;i++){
    let acc = 0;
    for(let j=0;j<3;j++){
      const idx = (i - offs[j]) % R; const jj = idx<0 ? idx+R : idx;
      acc += wg[jj] * (s[j] ?? 0);
    }
    out[i]=acc;
  }
  return out;
}
// (9) sharpening
function sharpen(wt, gamma){
  const p = wt.map(x => Math.pow(Math.max(x,0), gamma));
  const s = p.reduce((a,b)=>a+b,0) + eps;
  return p.map(x => x/s);
}
// (2) read
function read(M, w){
  const C = M[0]?.length ?? 0, r = new Array(C).fill(0);
  for(let i=0;i<M.length;i++){
    const wi = w[i] ?? 0, row = M[i];
    for(let j=0;j<C;j++) r[j] += wi * row[j];
  }
  return r;
}
// (3) erase: M⊙(1 - w e^T)
function erase(Mprev, w, e){
  const R=Mprev.length, C=Mprev[0].length;
  const out = Array.from({length:R}, ()=> new Array(C).fill(0));
  for(let i=0;i<R;i++){
    const wi = w[i] ?? 0;
    for(let j=0;j<C;j++) out[i][j] = Mprev[i][j] * (1 - wi * e[j]);
  }
  return out;
}
// (4) add: + w a^T
function add_(Merased, w, a){
  const R=Merased.length, C=Merased[0].length;
  const out = Array.from({length:R}, ()=> new Array(C).fill(0));
  for(let i=0;i<R;i++){
    const wi = w[i] ?? 0;
    for(let j=0;j<C;j++) out[i][j] = Merased[i][j] + wi * a[j];
  }
  return out;
}

export default class HabrNTM {
  constructor(rows=64, cols=16){
    this.rows = rows; this.cols = cols;
    this.M = Array.from({length:rows}, ()=> Array(cols).fill(0));  // M_0=0
    this.wprev = Array(rows).fill(1/rows); // равномерно
    this.params = { beta:5, g:0.9, gamma:2.0, eraseVal:0.3, shift:[0,1,0] };
    this.lastW = this.wprev.slice();
    this.lossHistory = [];
  }

  setParams({beta, g, gamma, eraseVal, shift}={}){
    if (beta  != null) this.params.beta = +beta;
    if (g     != null) this.params.g = +g;
    if (gamma != null) this.params.gamma = Math.max(1, +gamma);
    if (eraseVal != null) this.params.eraseVal = Math.max(0, Math.min(1, +eraseVal));
    if (shift != null){
      const s = shift.slice(0,3).map(Number);
      const sum = s.reduce((a,b)=>a+b,0) || 1;
      this.params.shift = s.map(x=> x/sum); // нормировка
    }
  }

  step(sym){
    // ключ k_t — one-hot из символа
    const k = symToVec(sym, this.cols);

    // адресация: (5)→(7)→(8)→(9)
    const wc  = w_content(this.M, k, this.params.beta);
    const wg  = interpolate(wc, this.wprev, this.params.g);
    const wtd = circConv(wg, this.params.shift);
    const w   = sharpen(wtd, this.params.gamma);

    // запись: (3) erase → (4) add
    const e = new Array(this.cols).fill(this.params.eraseVal);
    const a = k.slice();
    const Merase = erase(this.M, w, e);
    const Mnew   = add_(Merase, w, a);

    // чтение: (2); прогноз σ(r) и BCE
    const r = read(Mnew, w);
    const p = r.map(sigmoid);
    const y = k;
    const loss = bce(p, y);

    // обновления состояния
    this.M = Mnew;
    this.wprev = w;
    this.lastW = w;
    this.lossHistory.push(loss);
    if (this.lossHistory.length > 1000) this.lossHistory.shift();

    return { w, loss };
  }

  reset(rows=this.rows, cols=this.cols){
    this.rows=rows; this.cols=cols;
    this.M = Array.from({length:rows}, ()=> Array(cols).fill(0));
    this.wprev = Array(rows).fill(1/rows);
    this.lastW = this.wprev.slice();
    this.lossHistory.length = 0;
  }
}