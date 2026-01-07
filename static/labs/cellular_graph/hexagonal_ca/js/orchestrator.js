/* =====================================
 * Bind UI ↔ logic: tools, brush size, kernel/bounds, rule chips, presets,
 * import/export, start/pause/step/N, grid resize (widthCells/heightCells),
 * no dead zones in segmented controls, safe BS chips
 * ===================================== */
import { HexGrid } from './grid.js';
import { Rules } from './rules.js';
import { Simulation } from './simulation.js';
import { Renderer } from './renderer.js';
import { Presets, exportJSON, importJSON } from './io.js';

const $  = (id)=>document.getElementById(id);
const qs = (sel)=>document.querySelector(sel);

export function attachUI(){
  // Core objects
  const canvas  = $('hexCanvas');
  const grid    = new HexGrid(80, 60);
  const rules   = new Rules('B2/S34');             // ← default rule changed
  const sim     = new Simulation(grid, rules);
  const renderer= new Renderer(canvas, grid);
  renderer.draw();

  // Stats & status
  const status=$('status'), stepsOut=$('stepsOut'), timeOut=$('timeOut'), aliveOut=$('aliveOut'), modeOut=$('modeOut');
  const updateStats=(dt)=>{ if(stepsOut) stepsOut.textContent=grid.generation; if(timeOut) timeOut.textContent=(dt/1000).toFixed(3); if(aliveOut) aliveOut.textContent=sim.alive; };
  const setStatus=t=>{ if(status) status.textContent=t; };
  const setMode=t=>{ if(modeOut) modeOut.textContent=`Режим: ${t}`; };

  // ---------- Segmented controls helpers (no dead zones) ----------
  function wireSegment(container, onSelect){
    if(!container) return;
    const buttons = Array.from(container.querySelectorAll('button'));
    const activate = (btn)=>{
      buttons.forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn);
    };
    container.addEventListener('click',(e)=>{
      let btn = e.target.closest('button');
      if(!btn){
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const idx = Math.max(0, Math.min(buttons.length-1, Math.floor(x/(rect.width/buttons.length))));
        btn = buttons[idx];
      }
      if(btn) activate(btn);
    });
    return { activateFirst:()=> buttons[0] && activate(buttons[0]) };
  }

  // Brush / eraser segment
  const toolSeg   = $('toolSeg');
  const brushSize = $('brushSize');
  wireSegment(toolSeg, (btn)=>{
    const tool = btn?.dataset.tool;
    renderer.setTool(tool==='eraser'?'eraser':'brush');
  })?.activateFirst();
  if(brushSize){
    brushSize.addEventListener('input', ()=>renderer.setBrushSize(+brushSize.value||1));
    renderer.setBrushSize(+brushSize.value||1);
  }

  // Optional: simulation segment (if exists in markup)
  const simSeg = $('simSeg'); // expects 4 buttons: start, stop, step, reset
  if(simSeg){
    const map = ['start','pause','step','reset'];
    wireSegment(simSeg, (btn)=>{
      const ix = Array.from(simSeg.querySelectorAll('button')).indexOf(btn);
      const act = map[ix] || 'noop';
      ({start, pause, step, reset}[act]||(()=>{}))();
    });
  }

  // Kernel & bounds
  const kernelSel=$('kernel');
  const boundsSel=$('bounds');
  const kernelMap={ edge6:6, vertex12:12, combined18:18 };
  const boundsMap={ toroidal:'toroidal', limited:'limited' };
  const applyKernel=()=>{ const k=kernelMap[kernelSel?.value]||6; sim.setKernel(k); setStatus(`Ядро: ${k}`); };
  const applyBounds=()=>{ const b=boundsMap[boundsSel?.value]||'toroidal'; sim.setBounds(b); setStatus(`Границы: ${b==='toroidal'?'тороидальные':'ограниченные'}`); };
  if(kernelSel) kernelSel.addEventListener('change', applyKernel);
  if(boundsSel) boundsSel.addEventListener('change', applyBounds);
  applyKernel(); applyBounds();

  // Rule chips B/S (0..18) — safe click (no ghost "0")
  const chipsB=$('chipsB'), chipsS=$('chipsS');
  function buildChips(container, maxN){
    if(!container) return;
    container.innerHTML='';
    for(let i=0;i<=maxN;i++){
      const el=document.createElement('button');
      el.className='chip'; el.type='button';
      el.textContent=String(i); el.dataset.n=String(i);
      container.appendChild(el);
    }
  }
  buildChips(chipsB,18); buildChips(chipsS,18);
  function syncChips(){
    const B=rules.b, S=rules.s;
    if(chipsB) chipsB.querySelectorAll('.chip').forEach(ch=>ch.classList.toggle('active', B.has(+ch.dataset.n)));
    if(chipsS) chipsS.querySelectorAll('.chip').forEach(ch=>ch.classList.toggle('active', S.has(+ch.dataset.n)));
  }
  function handleChip(container, setName){
    if(!container) return;
    // prevent focusing "0" when clicking empty slot
    container.addEventListener('mousedown',(e)=>{ if(!e.target.closest('.chip')) e.preventDefault(); });
    container.addEventListener('click',(e)=>{
      const b = e.target.closest('button.chip');
      if(!b) return;
      const n=+b.dataset.n;
      const B=new Set(rules.b), S=new Set(rules.s);
      const set=setName==='B'?B:S;
      set.has(n)?set.delete(n):set.add(n);
      rules.setFromSets(B,S);
      syncChips();
      setStatus(`Правило: ${rules.text}`);
    });
  }
  handleChip(chipsB,'B');
  handleChip(chipsS,'S');
  syncChips(); // reflect B2/S34 at start

  // Presets
  const presetSel=$('preset');
  const loadPresetBtn=$('loadPreset');
  if(loadPresetBtn){
    loadPresetBtn.addEventListener('click', ()=>{
      const v=presetSel?.value||'none'; if(v==='none') return;
      const act={ glider_like:Presets.glider_like, oscillator_like:Presets.oscillator_like }[v] || Presets.empty;
      act(grid); renderer.draw(); updateStats(0); setStatus('Пресет применён.');
    });
  }

  // Import / Export
  const btnImport=$('btnImport');
  const btnExport=$('btnExport');
  if(btnExport){
    btnExport.addEventListener('click', ()=>{
      const blob=new Blob([exportJSON(grid, rules, sim.kernel, sim.bounds)], {type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='hexlife.json'; a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  if(btnImport){
    btnImport.addEventListener('click', async()=>{
      const input=document.createElement('input'); input.type='file'; input.accept='application/json';
      input.onchange=async()=>{
        const f=input.files[0]; if(!f) return;
        try{
          const obj=JSON.parse(await f.text());
          importJSON(
            obj,
            grid,
            rules,
            (k)=>{ sim.setKernel(k); if(kernelSel){ kernelSel.value = {6:'edge6',12:'vertex12',18:'combined18'}[k]||'edge6'; } },
            (b)=>{ sim.setBounds(b); if(boundsSel){ boundsSel.value = (b==='limited')?'limited':'toroidal'; } }
          );
          renderer.draw(); syncChips(); updateStats(0); setStatus('Импортирован JSON.');
        }catch(err){ alert('Некорректный JSON'); }
      };
      input.click();
    });
  }

  // Simulation controls (Start/Pause/Step/Reset/Speed/N)
  const btnStart=qs('[data-act="start"]');
  const btnPause=qs('[data-act="pause"]');
  const btnStep =qs('[data-act="step"]');
  const btnReset=qs('[data-act="reset"]');
  const btnRandom=$('btnRandom');
  const btnClear =$('btnClear');
  const inpSpeed=$('speed');
  const inpN=$('nSteps');
  const btnDoN=$('doNSteps');

  const state={ running:false, last:0, acc:0, targetDt: 1000/Math.max(1,+((inpSpeed?.value)||10)) };
  function loop(ts){
    if(!state.running) return;
    if(!state.last) state.last=ts;
    let dt=ts-state.last; state.last=ts; state.acc+=dt;
    const t0=performance.now();
    while(state.acc>=state.targetDt){ sim.step(); state.acc-=state.targetDt; }
    const t1=performance.now();
    renderer.draw(); updateStats(t1-t0);
    requestAnimationFrame(loop);
  }
  function start(){ if(state.running) return; state.running=true; state.last=0; state.acc=0; setMode('запуск'); setStatus('Работает…'); requestAnimationFrame(loop); }
  function pause(){ state.running=false; setMode('пауза'); setStatus('Пауза.'); }
  function step(){ const t0=performance.now(); sim.step(); const t1=performance.now(); renderer.draw(); updateStats(t1-t0); setStatus('Шаг выполнен.'); }
  function reset(){ pause(); grid.clear(); renderer.draw(); updateStats(0); setStatus('Поле очищено.'); }

  if(btnStart) btnStart.addEventListener('click', start);
  if(btnPause) btnPause.addEventListener('click', pause);
  if(btnStep)  btnStep .addEventListener('click', step);
  if(btnReset) btnReset.addEventListener('click', reset);
  if(btnRandom) btnRandom.addEventListener('click', ()=>{ Presets.random(grid,0.32); renderer.draw(); updateStats(0); setStatus('Случайная инициализация.'); });
  if(btnClear)  btnClear .addEventListener('click',  ()=>{ Presets.empty(grid); renderer.draw(); updateStats(0); setStatus('Поле очищено.'); });
  if(inpSpeed)  inpSpeed.addEventListener('input', ()=>{ const v=Math.max(1,+inpSpeed.value); state.targetDt=1000/v; });
  if(btnDoN)    btnDoN  .addEventListener('click', ()=>{ const N=Math.max(1,+((inpN?.value)||1)); const t0=performance.now(); for(let i=0;i<N;i++) sim.step(); const t1=performance.now(); renderer.draw(); updateStats(t1-t0); setStatus(`Выполнено ${N} шаг(ов).`); });

  // Theme toggle
  document.querySelectorAll('#themeSeg button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#themeSeg button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.documentElement.classList.toggle('light', b.dataset.theme==='light');
    renderer.draw();
  }));

  // -------- Grid size (widthCells / heightCells) --------
  const wInput = $('widthCells');
  const hInput = $('heightCells');
  if(wInput) wInput.value = String(grid.w);
  if(hInput) hInput.value = String(grid.h);

  const clampAttr = (el, v)=>{
    if(!el) return v;
    const min = el.min? parseInt(el.min,10) : 5;
    const max = el.max? parseInt(el.max,10) : 400;
    return Math.max(min, Math.min(max, v|0));
  };

  function resizeGrid(){
    if(!wInput || !hInput) return;
    const newW = clampAttr(wInput, +wInput.value||0);
    const newH = clampAttr(hInput, +hInput.value||0);
    const wasRunning = state.running;
    if(wasRunning) pause();
    grid.resize(newW, newH);                       // ← in-place resize
    if(typeof renderer.centerOnGrid === 'function') renderer.centerOnGrid();
    else renderer.draw();
    updateStats(0);
    setStatus(`Размер поля: ${newW} × ${newH}`);
    if(wasRunning) start();
  }
  if(wInput) wInput.addEventListener('change', resizeGrid);
  if(hInput) hInput.addEventListener('change', resizeGrid);

  // finalize
  syncChips();
  setMode('пауза'); setStatus('Готово.');
}