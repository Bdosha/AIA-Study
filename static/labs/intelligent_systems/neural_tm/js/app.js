// ====== Самодостаточная NTM (формулы Хабра) + Лента + RuleTable + Пресеты + красивый график ======
(function(){

// ---------- utils ----------
const eps = 1e-12;
function dot(u, v){ let s=0; for(let i=0;i<u.length;i++) s+=u[i]*v[i]; return s; }
function norm(u){ return Math.sqrt(dot(u,u)) + eps; }
function cosine(u, v){ return dot(u,v) / (norm(u)*norm(v)); }
function softmax(arr){
  const m = Math.max(...arr);
  const ex = arr.map(x=>Math.exp(x-m)); const s = ex.reduce((a,b)=>a+b,0)+eps;
  return ex.map(x=>x/s);
}
function sigmoid(x){ return 1/(1+Math.exp(-x)); }
function bce(p, y){
  let s = 0;
  for(let j=0;j<p.length;j++){
    const pj = Math.min(1-eps, Math.max(eps, p[j]));
    s += - (y[j]*Math.log(pj) + (1-y[j])*Math.log(1-pj));
  }
  return s / p.length;
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// one-hot из символа в первые 3 колонки
function symToVec(ch, cols){
  const v = new Array(cols).fill(0);
  if (ch === '0') v[0] = 1; else if (ch === '1') v[1] = 1; else v[2] = 1; // #/λ → «прочее»
  return v;
}
function vecToSym(v){
  const i = [0,1,2].reduce((m,j)=> v[j]>v[m]?j:m,0);
  return i===0 ? '0' : i===1 ? '1' : '#';
}

// ---------- ядро NTM по формулам (2–9) ----------
class HabrNTM {
  constructor(rows=64, cols=16){
    this.rows = rows; this.cols = cols;
    this.M = Array.from({length:rows}, ()=> Array(cols).fill(0));  // M_0 = 0
    this.wprev = Array(rows).fill(1/rows); // равномерно
    this.params = { beta:5, g:0.9, gamma:2.0, eraseVal:0.3, shift:[0,1,0] };
    this.lastW = this.wprev.slice();
    this.lossHistory = [];
  }
  setParams({beta, g, gamma, eraseVal, shift}={}){
    if (beta  != null) this.params.beta = +beta;
    if (g     != null) this.params.g = +g;
    if (gamma != null) this.params.gamma = Math.max(1, +gamma);
    if (eraseVal != null) this.params.eraseVal = clamp(+eraseVal, 0, 1);
    if (shift != null){
      const s = shift.slice(0,3).map(Number);
      const sum = s.reduce((a,b)=>a+b,0) || 1;
      this.params.shift = s.map(x=> x/sum); // нормировка
    }
  }
  _w_content(M, k, beta){
    const sims = M.map(row => beta * cosine(k, row));   // (5)(6)
    return softmax(sims);
  }
  _interpolate(wc, wprev, g){                           // (7)
    const out = new Array(wc.length);
    for (let i=0;i<wc.length;i++) out[i] = g*wc[i] + (1-g)*(wprev[i] ?? 0);
    return out;
  }
  _circConv(wg, s){                                     // (8) сдвиг {-1,0,+1}
    const R = wg.length, out = new Array(R).fill(0), offs = [-1,0,+1];
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
  _sharpen(wt, gamma){                                  // (9)
    const p = wt.map(x => Math.pow(Math.max(x,0), gamma));
    const s = p.reduce((a,b)=>a+b,0) + eps;
    return p.map(x => x/s);
  }
  _read(M, w){                                          // (2)
    const C = M[0]?.length ?? 0, r = new Array(C).fill(0);
    for(let i=0;i<M.length;i++){
      const wi = w[i] ?? 0, row = M[i];
      for(let j=0;j<C;j++) r[j] += wi * row[j];
    }
    return r;
  }
  _erase(Mprev, w, e){                                  // (3)
    const R=Mprev.length, C=Mprev[0].length;
    const out = Array.from({length:R}, ()=> new Array(C).fill(0));
    for(let i=0;i<R;i++){
      const wi = w[i] ?? 0;
      for(let j=0;j<C;j++) out[i][j] = Mprev[i][j] * (1 - wi * e[j]);
    }
    return out;
  }
  _add(Merased, w, a){                                  // (4)
    const R=Merased.length, C=Merased[0].length;
    const out = Array.from({length:R}, ()=> new Array(C).fill(0));
    for(let i=0;i<R;i++){
      const wi = w[i] ?? 0;
      for(let j=0;j<C;j++) out[i][j] = Merased[i][j] + wi * a[j];
    }
    return out;
  }
  // обучающий шаг (запись) + BCE
  stepWrite(sym){
    const k = symToVec(sym, this.cols);
    const wc  = this._w_content(this.M, k, this.params.beta);
    const wg  = this._interpolate(wc, this.wprev, this.params.g);
    const wtd = this._circConv(wg, this.params.shift);
    const w   = this._sharpen(wtd, this.params.gamma);
    const e = new Array(this.cols).fill(this.params.eraseVal);
    const a = k.slice();
    const Merase = this._erase(this.M, w, e);
    const Mnew   = this._add(Merase, w, a);
    const r = this._read(Mnew, w);
    const p = r.map(sigmoid);
    const y = k;
    const loss = bce(p, y);
    this.M = Mnew; this.wprev = w; this.lastW = w;
    this.lossHistory.push(loss); if (this.lossHistory.length>1000) this.lossHistory.shift();
    return { w, loss };
  }
  // предсказание без изменения памяти
  predict(sym){
    const k = symToVec(sym, this.cols);
    const wc  = this._w_content(this.M, k, this.params.beta);
    const wg  = this._interpolate(wc, this.wprev, this.params.g);
    const wtd = this._circConv(wg, this.params.shift);
    const w   = this._sharpen(wtd, this.params.gamma);
    const r = this._read(this.M, w);
    const p = r.map(sigmoid);
    this.lastW = w;
    return { w, p, sym: vecToSym(p) };
  }
  reset(rows=this.rows, cols=this.cols){
    this.rows=rows; this.cols=cols;
    this.M = Array.from({length:rows}, ()=> Array(cols).fill(0));
    this.wprev = Array(rows).fill(1/rows);
    this.lastW = this.wprev.slice();
    this.lossHistory.length = 0;
  }
}

// ---------- лента ----------
const BLANK = 'λ';
class Tape{
  constructor(){ this.arr=[BLANK]; this.pos=0; }
  setWord(str){ this.arr = (str||"").split(''); if (!this.arr.length) this.arr=[BLANK]; this.pos=0; }
  read(){ return this.arr[this.pos] ?? BLANK; }
  write(ch){ this.arr[this.pos] = ch; }
  right(){ this.pos++; }
  left(){ this.pos = Math.max(0, this.pos-1); }
  reset(){ this.pos=0; }
}

// ---------- RuleTable ----------
const ACTIONS = [
  { code:'noop',           label:'ничего' },
  { code:'right',          label:'вправо' },
  { code:'left',           label:'влево' },
  { code:'save',           label:'сохранить (в память)' },
  { code:'predict',        label:'прочитать из памяти → на ленту' },
  { code:'save_right',     label:'сохранить и вправо' },
  { code:'save_left',      label:'сохранить и влево' },
  { code:'predict_right',  label:'прочитать → вправо' },
  { code:'predict_left',   label:'прочитать → влево' },
];
const ELSE_SPECIAL = [
  { code:'continue', label:'продолжить' },
  { code:'halt',     label:'остановиться' },
];
class RuleTable {
  constructor(host){
    this.host = host;
    this.rules = [];
    this.onChange = null;
    this.applyPreset('copy');
    this.render();
  }
  getRules(){ return this.rules.map(r=>({...r})); }
  addRule(){ this.rules.push({when:'*', then:'noop', elseAct:'continue'}); this.render(); this._changed(); }
  applyPreset(name){
    if (name === 'copy'){
      this.rules = [
        { when:'0', then:'save_right', elseAct:'continue' },
        { when:'1', then:'save_right', elseAct:'continue' },
        { when:'#', then:'save_right', elseAct:'continue' },
        { when:'λ', then:'noop',       elseAct:'halt'     },
      ];
    } else if (name === 'reverse'){
      this.rules = [
        { when:'0', then:'save_left', elseAct:'continue' },
        { when:'1', then:'save_left', elseAct:'continue' },
        { when:'#', then:'save_left', elseAct:'continue' },
        { when:'λ', then:'noop',      elseAct:'halt'     },
      ];
    } else if (name === 'predict'){
      this.rules = [
        { when:'λ', then:'noop',           elseAct:'halt'     },
        { when:'*', then:'predict_right',  elseAct:'continue' },
      ];
    } else if (name === 'echo'){
      this.rules = [
        { when:'0', then:'predict_right', elseAct:'continue' },
        { when:'1', then:'predict_right', elseAct:'continue' },
        { when:'#', then:'predict_right', elseAct:'continue' },
        { when:'λ', then:'noop',          elseAct:'halt'     },
      ];
    } else if (name === 'learn'){
      this.rules = [
        { when:'*', then:'save_right', elseAct:'continue' },
        { when:'λ', then:'noop',       elseAct:'halt'     },
      ];
    } else if (name === 'zigzag'){
      this.rules = [
        { when:'0', then:'save_right',    elseAct:'continue' },
        { when:'1', then:'save_left',     elseAct:'continue' },
        { when:'#', then:'predict_right', elseAct:'continue' },
        { when:'λ', then:'noop',          elseAct:'halt'     },
      ];
    } else {
      return;
    }
    this.render(); this._changed();
  }
  render(){
    if (!this.host) return;
    this.host.innerHTML = "";
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="width:120px">Если (элемент)</th>
        <th style="width:220px">То (действие)</th>
        <th style="width:220px">Иначе</th>
        <th>Действия</th>
      </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const optsWhen = ['0','1','#','λ','*'];
    const mkSelect = (items, value) => {
      const s = document.createElement("select");
      items.forEach(({code,label})=>{
        const o = document.createElement("option"); o.value=code; o.textContent=label; s.appendChild(o);
      });
      s.value = value; return s;
    };
    const ACTIONS_UI = ACTIONS.map(a=>({code:a.code,label:a.label}));
    const ELSE_UI = [...ELSE_SPECIAL, ...ACTIONS_UI];

    const redraw = () => {
      tbody.innerHTML = "";
      this.rules.forEach((r, idx) => {
        const tr = document.createElement("tr");

        const tdWhen = document.createElement("td");
        const sWhen = document.createElement("select");
        optsWhen.forEach(x=>{ const o=document.createElement("option"); o.value=x; o.textContent=x; sWhen.appendChild(o); });
        sWhen.value = r.when; sWhen.addEventListener("change", ()=>{ r.when = sWhen.value; this._changed(); });
        tdWhen.appendChild(sWhen);

        const tdThen = document.createElement("td");
        const sThen = mkSelect(ACTIONS_UI, r.then || 'noop');
        sThen.addEventListener("change", ()=>{ r.then = sThen.value; this._changed(); });
        tdThen.appendChild(sThen);

        const tdElse = document.createElement("td");
        const sElse = mkSelect(ELSE_UI, r.elseAct || 'continue');
        sElse.addEventListener("change", ()=>{ r.elseAct = sElse.value; this._changed(); });
        tdElse.appendChild(sElse);

        const tdAct = document.createElement("td");
        tdAct.className = "row-actions";
        const up = document.createElement("button"); up.className="btn btn-outline"; up.textContent="↑";
        const dn = document.createElement("button"); dn.className="btn btn-outline"; dn.textContent="↓";
        const del= document.createElement("button"); del.className="btn btn-outline"; del.textContent="Удалить";
        up.addEventListener("click", ()=>{ if (idx>0){ const t=this.rules[idx-1]; this.rules[idx-1]=this.rules[idx]; this.rules[idx]=t; redraw(); this._changed(); } });
        dn.addEventListener("click", ()=>{ if (idx<this.rules.length-1){ const t=this.rules[idx+1]; this.rules[idx+1]=this.rules[idx]; this.rules[idx]=t; redraw(); this._changed(); } });
        del.addEventListener("click", ()=>{ this.rules.splice(idx,1); redraw(); this._changed(); });
        tdAct.appendChild(up); tdAct.appendChild(dn); tdAct.appendChild(del);

        tr.appendChild(tdWhen); tr.appendChild(tdThen); tr.appendChild(tdElse); tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
    };

    table.appendChild(tbody);
    this.host.appendChild(table);
    redraw();
  }
  _changed(){ if (typeof this.onChange === 'function') this.onChange(this.getRules()); }
}

// ---------- DOM ----------
const els = {
  tapeViewport: document.getElementById("tapeViewport"),
  wordInput: document.getElementById("wordInput"),
  placeWord: document.getElementById("placeWord"),
  clearTape: document.getElementById("clearTape"),
  runBtn: document.getElementById("runBtn"),
  stepBtn: document.getElementById("stepBtn"),
  stopBtn: document.getElementById("stopBtn"),
  resetBtn: document.getElementById("resetBtn"),
  stepsInfo: document.getElementById("stepsInfo"),
  lossInfo: document.getElementById("lossInfo"),
  memHeatmap: document.getElementById("memHeatmap"),
  weights: document.getElementById("weights"),
  lossChart: document.getElementById("lossChart"),
  beta: document.getElementById("beta"),
  gate: document.getElementById("gate"),
  gamma: document.getElementById("gamma"),
  erase: document.getElementById("erase"),
  shiftL: document.getElementById("shiftL"),
  shiftC: document.getElementById("shiftC"),
  shiftR: document.getElementById("shiftR"),
  applyParams: document.getElementById("applyParams"),
  dimInfo: document.getElementById("dimInfo"),
  clearCache: document.getElementById("clearCache"),
  ruleTableHost: document.getElementById("ruleTableHost"),
  addRule: document.getElementById("addRule"),
  presetCopy: document.getElementById("presetCopy"),
  presetReverse: document.getElementById("presetReverse"),
  presetPredict: document.getElementById("presetPredict"),
  presetEcho: document.getElementById("presetEcho"),
  presetLearn: document.getElementById("presetLearn"),
  presetZigZag: document.getElementById("presetZigZag"),
  lossShowRaw: document.getElementById("lossShowRaw"),
  lossShowEMA: document.getElementById("lossShowEMA"),
  log: document.getElementById("log"),
};

// ---------- init ----------
const tape = new Tape();
const ntm  = new HabrNTM(64, 16);
const rtable = new RuleTable(els.ruleTableHost);

// ---------- draw ----------
function drawTape(){
  const host = els.tapeViewport; if (!host) return;
  host.innerHTML = "";
  const maxLen = Math.max(tape.arr.length, 40);
  for (let i=0;i<maxLen;i++){
    const ch = tape.arr[i] ?? BLANK;
    const d = document.createElement("div");
    d.className = "tcell" + (i===tape.pos ? " active":"");
    d.textContent = ch;
    host.appendChild(d);
  }
  const cells = host.children;
  if (cells[tape.pos]){ const c=cells[tape.pos]; const left=Math.max(0, c.offsetLeft - host.clientWidth/2 + c.clientWidth/2); host.scrollLeft = left; }
}
function drawHeatmap(){
  const cvs = els.memHeatmap; if (!cvs) return;
  const ctx = cvs.getContext("2d"); const w=cvs.width, h=cvs.height;
  const R = ntm.rows, C = ntm.cols, cw = w/C, ch = h/R;
  ctx.clearRect(0,0,w,h);
  for(let i=0;i<R;i++){
    for(let j=0;j<C;j++){
      const v = ntm.M[i][j]; const col = Math.floor(255*Math.max(0,Math.min(1,v)));
      ctx.fillStyle = `rgb(${col},${col},${col})`;
      ctx.fillRect(j*cw, i*ch, Math.ceil(cw), Math.ceil(ch));
    }
  }
  ctx.strokeStyle="#4ea0ff"; ctx.strokeRect(0,0,w,h);
}
function drawWeights(){
  const cvs = els.weights; if (!cvs) return;
  const ctx = cvs.getContext("2d"); const w=cvs.width, h=cvs.height;
  ctx.clearRect(0,0,w,h);
  const wv = ntm.lastW || []; if (!wv.length) return;
  const R = wv.length, bw = w / R;
  for(let i=0;i<R;i++){
    const v = Math.max(0, Math.min(1, wv[i])); const c = Math.floor(255*v);
    ctx.fillStyle = `rgb(${c},${c},${c})`;
    ctx.fillRect(i*bw, 0, Math.ceil(bw), h);
  }
  ctx.strokeStyle="#4ea0ff"; ctx.strokeRect(0,0,w,h);
}

// ----- «красивый» график Loss -----
let _hoverIdx = -1;
let _emaVal = 0;
const lossHist = [];
const emaHist  = [];

function _niceCeil(x){
  if (!isFinite(x) || x<=0) return 1;
  const k = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / k;
  const step = (m<=1)?1:(m<=2)?2:(m<=5)?5:10;
  return step * k;
}

function drawLoss(){
  const cvs = els.lossChart; if (!cvs) return;
  const ctx = cvs.getContext("2d");

  // HiDPI подготовка (однократно)
  if (!cvs.__dpiHandled){
    const dpr = window.devicePixelRatio || 1;
    cvs.__bW = cvs.width; cvs.__bH = cvs.height;
    cvs.width = Math.round(cvs.__bW * dpr);
    cvs.height = Math.round(cvs.__bH * dpr);
    cvs.style.width = cvs.__bW + "px";
    cvs.style.height = cvs.__bH + "px";
    ctx.scale(dpr, dpr);
    cvs.__dpiHandled = true;
  }

  const W = cvs.__bW || cvs.width, H = cvs.__bH || cvs.height;
  ctx.clearRect(0,0,W,H);

  const showRaw = !!els.lossShowRaw?.checked;
  const showEMA = !!els.lossShowEMA?.checked;
  if (!lossHist.length && !emaHist.length) return;

  // область графика
  const padL = 36, padR = 12, padT = 8, padB = 22;
  const gw = W - padL - padR, gh = H - padT - padB;

  // масштаб
  const L = Math.max(lossHist.length, emaHist.length);
  const seriesY = [];
  if (showRaw) seriesY.push(...lossHist);
  if (showEMA) seriesY.push(...emaHist);
  const yMax = _niceCeil(Math.max(1e-6, ...seriesY));
  const yMin = 0;

  // сетка
  ctx.strokeStyle = "#2a3144"; ctx.lineWidth = 1;
  ctx.beginPath();
  const hLines = 4;
  for (let i=0;i<=hLines;i++){
    const y = padT + (gh*i/hLines);
    ctx.moveTo(padL, y); ctx.lineTo(padL+gw, y);
  }
  ctx.stroke();

  // рамка
  ctx.strokeStyle = "#3a435a";
  ctx.strokeRect(padL, padT, gw, gh);

  // подписи Y
  ctx.fillStyle = "#9aa4be"; ctx.font = "10px ui-sans-serif";
  for (let i=0;i<=hLines;i++){
    const v = yMax * (1 - i/hLines);
    const y = padT + (gh*i/hLines);
    ctx.fillText(v.toFixed(3), 4, y+3);
  }

  const toX = (i, n) => padL + (n<=1?0 : (gw * i/(n-1)));
  const toY = v => padT + gh - ( (v - yMin) / (yMax - yMin) ) * gh;

  // RAW линия
  if (showRaw && lossHist.length){
    ctx.beginPath();
    for (let i=0;i<lossHist.length;i++){
      const x = toX(i, lossHist.length), y = toY(lossHist[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = "#7aa0ff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // EMA + заливка
  if (showEMA && emaHist.length){
    const grad = ctx.createLinearGradient(0, padT, 0, padT+gh);
    grad.addColorStop(0, "rgba(103,255,155,0.25)");
    grad.addColorStop(1, "rgba(103,255,155,0.03)");

    ctx.beginPath();
    for (let i=0;i<emaHist.length;i++){
      const x = toX(i, emaHist.length), y = toY(emaHist[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.lineTo(toX(emaHist.length-1, emaHist.length), padT+gh);
    ctx.lineTo(toX(0, emaHist.length), padT+gh);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    for (let i=0;i<emaHist.length;i++){
      const x = toX(i, emaHist.length), y = toY(emaHist[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = "#67ff9b";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // hover-линия и тултип
  const n = showEMA && emaHist.length ? emaHist.length : lossHist.length;
  if (_hoverIdx>=0 && n>0){
    const idx = Math.max(0, Math.min(n-1, _hoverIdx));
    const x = toX(idx, n);
    ctx.strokeStyle = "#4ea0ff55"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT+gh); ctx.stroke();

    const yVal = (showEMA && emaHist[idx]!=null) ? emaHist[idx]
                  : (showRaw && lossHist[idx]!=null) ? lossHist[idx]
                  : null;
    if (yVal!=null){
      const y = toY(yVal);
      ctx.fillStyle = "#67ff9b"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();

      const label = `t=${idx}  loss=${yVal.toFixed(5)}`;
      const tw = ctx.measureText(label).width + 10, th = 16;
      let bx = x+8, by = y-22; if (bx+tw > padL+gw) bx = x - tw - 8; if (by<th) by = y+8;
      ctx.fillStyle = "#0e1422"; ctx.strokeStyle = "#3a435a";
      ctx.fillRect(bx, by, tw, th); ctx.strokeRect(bx, by, tw, th);
      ctx.fillStyle = "#cfe0ff"; ctx.fillText(label, bx+5, by+11);
    }
  }
}

// ---------- цикл ----------
let t = 0, timer = null, speed = 20; // шаг/сек
let lastLoss = 0;

function onTick(res){
  t++; els.stepsInfo.textContent = `Шагов: ${t}`;

  if (typeof res.loss === 'number'){
    lossHist.push(res.loss);
    _emaVal = 0.9*_emaVal + 0.1*res.loss;   // EMA (β=0.9)
    emaHist.push(_emaVal);

    const LIM = 2000;
    if (lossHist.length > LIM){ lossHist.shift(); }
    if (emaHist.length  > LIM){ emaHist.shift(); }

    els.lossInfo.textContent = `Loss: ${res.loss.toFixed(4)}`;
  }

  drawTape(); drawHeatmap(); drawWeights(); drawLoss();
  if (res.halt){ stop(); }
}

function pickRule(sym, rules){
  for (let i=0;i<rules.length;i++){
    const r = rules[i];
    if (r.when === '*' || r.when === sym){
      return { idx:i, action:r.then };
    } else if (r.elseAct && r.elseAct !== 'continue'){
      return { idx:i, action:r.elseAct };
    }
  }
  return { idx:-1, action:'right' };
}

function execAction(act, sym){
  switch(act){
    case 'noop':     return { loss: lastLoss };
    case 'right':    tape.right(); return { loss: lastLoss };
    case 'left':     tape.left();  return { loss: lastLoss };

    case 'save': {
      const res = ntm.stepWrite(sym);
      lastLoss = res.loss;
      return res;
    }
    case 'save_right': {
      const r = ntm.stepWrite(sym);
      lastLoss = r.loss; tape.right();
      return r;
    }
    case 'save_left': {
      const r = ntm.stepWrite(sym);
      lastLoss = r.loss; tape.left();
      return r;
    }

    case 'predict': {
      const r = ntm.predict(sym);
      tape.write(r.sym);
      return { loss: lastLoss };
    }
    case 'predict_right': {
      const r = ntm.predict(sym);
      tape.write(r.sym); tape.right();
      return { loss: lastLoss };
    }
    case 'predict_left': {
      const r = ntm.predict(sym);
      tape.write(r.sym); tape.left();
      return { loss: lastLoss };
    }

    case 'halt': return { loss: lastLoss, halt:true };
    default: return { loss: lastLoss };
  }
}

function stepOnce(){
  const sym = tape.read();
  const rules = rtable.getRules();
  const fired = pickRule(sym, rules);
  const res = execAction(fired.action, sym);
  onTick(res);
}
function start(){
  if (timer) return;
  const loop = ()=>{ stepOnce(); timer = setTimeout(loop, 1000/speed); };
  loop();
}
function stop(){ if (timer){ clearTimeout(timer); timer=null; } }
function resetAll(){
  stop(); t=0; lossHist.length=0; emaHist.length=0; _emaVal=0; lastLoss=0;
  ntm.reset(); tape.reset();
  els.stepsInfo.textContent="Шагов: 0"; els.lossInfo.textContent="Loss: 0.00";
  drawTape(); drawHeatmap(); drawWeights(); drawLoss();
}

// ---------- обработчики ----------
els.placeWord?.addEventListener("click", ()=>{ tape.setWord(els.wordInput.value||""); drawTape(); });
els.clearTape?.addEventListener("click", ()=>{ tape.setWord(""); drawTape(); });
els.runBtn?.addEventListener("click", start);
els.stepBtn?.addEventListener("click", stepOnce);
els.stopBtn?.addEventListener("click", stop);
els.resetBtn?.addEventListener("click", resetAll);
els.applyParams?.addEventListener("click", ()=>{
  ntm.setParams({
    beta: +els.beta.value, g: +els.gate.value, gamma: +els.gamma.value, eraseVal: +els.erase.value,
    shift: [+els.shiftL.value, +els.shiftC.value, +els.shiftR.value],
  });
});
els.clearCache?.addEventListener("click", ()=>{ try{localStorage.clear();}catch{} location.reload(); });

els.addRule?.addEventListener("click", ()=> rtable.addRule());
els.presetCopy?.addEventListener("click", ()=> rtable.applyPreset('copy'));
els.presetReverse?.addEventListener("click", ()=> rtable.applyPreset('reverse'));
els.presetPredict?.addEventListener("click", ()=> rtable.applyPreset('predict'));
els.presetEcho?.addEventListener("click", ()=> rtable.applyPreset('echo'));
els.presetLearn?.addEventListener("click", ()=> rtable.applyPreset('learn'));
els.presetZigZag?.addEventListener("click", ()=> rtable.applyPreset('zigzag'));

// hover на графике + переключатели слоёв
if (els.lossChart){
  const rectOf = el => el.getBoundingClientRect();
  els.lossChart.addEventListener("mousemove", (e)=>{
    const rect = rectOf(els.lossChart);
    const W = (els.lossChart.__bW || els.lossChart.width);
    const padL = 36, padR = 12;
    const gw = W - padL - padR;
    const x = e.clientX - rect.left;
    const cssW = rect.width;
    const ratio = gw / cssW;
    const xGraph = (x * ratio) - padL;
    const n = Math.max(lossHist.length, emaHist.length);
    if (xGraph >= 0 && n>1){
      _hoverIdx = Math.round( xGraph / (gw/(n-1)) );
    } else {
      _hoverIdx = -1;
    }
    drawLoss();
  });
  els.lossChart.addEventListener("mouseleave", ()=>{ _hoverIdx = -1; drawLoss(); });
}
els.lossShowRaw?.addEventListener("change", drawLoss);
els.lossShowEMA?.addEventListener("change", drawLoss);

// ---------- BOOT ----------
(function boot(){
  tape.setWord("0101#");
  drawTape(); drawHeatmap(); drawWeights(); drawLoss();
  if (els.dimInfo) els.dimInfo.textContent = `N×M: ${ntm.rows}×${ntm.cols}`;
})();
})();