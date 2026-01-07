/* ====== App ====== */
(function(){
  const els={
    canvas:document.getElementById('canvas'),
    step:document.getElementById('step'),
    part:document.getElementById('part'),
    delta:document.getElementById('delta'),
    sizeInfo:document.getElementById('sizeInfo'),

    startBtn:document.getElementById('startBtn'),
    stopBtn:document.getElementById('stopBtn'),
    stepBtn:document.getElementById('stepBtn'),
    backBtn:document.getElementById('backBtn'),
    resetBtn:document.getElementById('resetBtn'),
    themeBtn:(document.getElementById('themeBtn')||document.getElementById('themeToggle')),

    speed:document.getElementById('speed'), speedOut:document.getElementById('speedOut'),
    wInput:document.getElementById('wInput'), hInput:document.getElementById('hInput'), resizeBtn:document.getElementById('resizeBtn'),
    scale:document.getElementById('scale'), scaleOut:document.getElementById('scaleOut'),

    ruleSelect:document.getElementById('ruleSelect'),
    customRow:document.getElementById('customRow'),
    customInp:document.getElementById('customInp'),
    loadCustom:document.getElementById('loadCustom'),

    preset:document.getElementById('preset'),
    applyPreset:document.getElementById('applyPreset'),

    exportBtn:document.getElementById('exportBtn'),

    visualCheckBtn:document.getElementById('visualCheckBtn'),
    vcStatus:document.getElementById('vcStatus'),

    toast:document.getElementById('toast'),
  };

  // состояние
  let grid=new Grid(parseInt(els.wInput.value,10),parseInt(els.hInput.value,10));
  let rule=buildCritters();
  let engine=new MargolusEngine(grid,rule);
  let renderer=new Renderer(els.canvas,grid,parseInt(els.scale.value,10));

  let running=false, lastTs=0, accum=0;
  let runTime=0;
  let initialGrid=null;
  let snapshotGeneral=grid.clone();      // общий снимок для Δ-панели
  let visualCheck=false, snapshotVC=null; // режим визуальной проверки и его снимок

  function toast(msg,type='ok'){
    const t=els.toast;
    t.textContent=msg;
    t.className='toast '+(type==='ok'?'ok':'warn');
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),1400);
  }

  function refreshInfo(){
    const d = visualCheck && snapshotVC ? grid.hamming(snapshotVC) : grid.hamming(snapshotGeneral);
    els.delta.textContent = d;
    els.sizeInfo.textContent = grid.w+'×'+grid.h;
    els.step.textContent = engine.stepCount;
    els.part.textContent = engine.partition===0?'A':'B';
    els.speedOut.textContent = els.speed.value;
    els.scaleOut.textContent = els.scale.value;
    if(els.timer) els.timer.textContent = runTime.toFixed(1)+' с';
    els.vcStatus.textContent = visualCheck ? 'режим ВКЛ' : 'режим ВЫКЛ';
  }

  function draw(){
    if(visualCheck && snapshotVC){ renderer.drawDiff(snapshotVC); }
    else { renderer.drawNormal(); }
    refreshInfo();
  }

  // рисование мышью — точно под курсором
  (function attachPainting(){
    let drawing=false, erase=false;
    function getCell(ev){
      const rect=els.canvas.getBoundingClientRect();
      const sx = els.canvas.width / rect.width;
      const sy = els.canvas.height / rect.height;
      const px = (ev.clientX - rect.left) * sx;
      const py = (ev.clientY - rect.top) * sy;
      const x = Math.floor(px / renderer.scale);
      const y = Math.floor(py / renderer.scale);
      return [Math.max(0,Math.min(grid.w-1,x)), Math.max(0,Math.min(grid.h-1,y))];
    }
    els.canvas.addEventListener('mousedown',ev=>{
      drawing=true;
      erase=(ev.button===2||ev.altKey);
      const [x,y]=getCell(ev);
      grid.set(x,y, erase?0:1);
      draw();
    });
    els.canvas.addEventListener('mousemove',ev=>{
      if(!drawing)return;
      const [x,y]=getCell(ev);
      grid.set(x,y, erase?0:1);
      draw();
    });
    window.addEventListener('mouseup',()=>drawing=false);
    els.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  })();

  // цикл
  function frame(ts){
    if(!lastTs) lastTs=ts;
    const period = 1000/Math.max(1,parseInt(els.speed.value,10));
    if(running){
      const dt=ts-lastTs;
      runTime+=dt/1000;
      accum+=dt;
      while(accum >= period){ engine.stepForward(); accum -= period; }
      draw();
    }
    lastTs = ts;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // управление
  els.startBtn.onclick=()=>{if(!initialGrid)initialGrid=grid.clone();running=true;};
  els.stopBtn.onclick  = ()=>{ running=false; };
  els.stepBtn.onclick  = ()=>{ running=false; engine.stepForward(); draw(); };
  els.backBtn.onclick=()=>{
    running=false;
    if(engine.stepCount>0){
      engine.stepBackward();
      draw();
    } else {
      toast('Нельзя сделать шаг назад — шаг = 0','warn');
    }
  };
  els.resetBtn.onclick=()=>{
    running=false;
    if(initialGrid){grid=initialGrid.clone();}
    engine=new MargolusEngine(grid,rule);
    renderer=new Renderer(els.canvas,grid,parseInt(els.scale.value,10));
    engine.partition=0;
    engine.stepCount=0;
    runTime=0;
    if(els.timer)els.timer.textContent='0.0 с';
    snapshotGeneral=grid.clone();
    if(visualCheck)snapshotVC=grid.clone();
    draw();
  };

  els.speed.oninput = ()=> els.speedOut.textContent = els.speed.value;
  els.scale.oninput = ()=>{ renderer.setScale(parseInt(els.scale.value,10)); draw(); };

  // изменение размеров
  els.resizeBtn.onclick = ()=>{
    let w=parseInt(els.wInput.value,10)||80, h=parseInt(els.hInput.value,10)||60;
    if(w%2)w--; if(h%2)h--;
    const old=grid.clone();
    grid=new Grid(w,h);
    const ox=Math.floor((grid.w-old.w)/2), oy=Math.floor((grid.h-old.h)/2);
    for(let y=0;y<old.h;y++)
      for(let x=0;x<old.w;x++){
        const nx=x+ox, ny=y+oy;
        if(nx>=0&&nx<grid.w&&ny>=0&&ny<grid.h) grid.set(nx,ny,old.get(x,y));
      }
    engine=new MargolusEngine(grid,rule);
    renderer=new Renderer(els.canvas,grid,parseInt(els.scale.value,10));
    snapshotGeneral=grid.clone();
    if(visualCheck)snapshotVC=grid.clone();
    initialGrid=grid.clone();
    draw();
  };

  // правила
  els.ruleSelect.onchange = ()=>{
    const v=els.ruleSelect.value;
    try{
      if(v==='critters'){ rule=buildCritters(); engine.setRule(rule); els.customRow.style.display='none'; }
      else if(v==='rotations'){ rule=ROTATIONS.slice(); engine.setRule(rule); els.customRow.style.display='none'; }
      else if(v==='identity'){ rule=IDENTITY.slice(); engine.setRule(rule); els.customRow.style.display='none'; }
      else { els.customRow.style.display='flex'; }
    }catch(e){ alert('Ошибка правила: '+e.message); }
  };
  els.loadCustom.onclick = ()=>{
    try{
      const parts=els.customInp.value.split(',').map(s=>parseInt(s.trim(),10));
      if(parts.length!==16 || new Set(parts).size!==16 || parts.some(n=>!(Number.isInteger(n)&&n>=0&&n<=15)))
        throw new Error('нужна перестановка 0..15');
      engine.setRule(parts); rule=parts.slice();
    }catch(err){ alert('Ошибка: '+err.message); }
  };

  // предустановки
  function applyPreset(){
    const v=els.preset.value;
    if(v==='random') presetRandom(grid,.28);
    else if(v==='blockGas') presetBlockGas(grid);
    else if(v==='gliders') presetGliders(grid);
    else if(v==='checker') presetCheckerboard(grid);
    else if(v==='crittersPattern') presetCrittersPattern(grid);
    else presetBlank(grid);
    snapshotGeneral=grid.clone();
    if(visualCheck)snapshotVC=grid.clone();
    initialGrid=grid.clone();
    draw();
  }
  els.applyPreset.onclick = applyPreset;

  // экспорт
  els.exportBtn && (els.exportBtn.onclick = ()=>{
    const link=document.createElement('a');
    link.download='revca_snapshot.png';
    link.href = els.canvas.toDataURL && els.canvas.toDataURL('image/png');
    if(link.href){
      link.click();
      toast('PNG-снимок сохранён','ok');
    } else {
      toast('Ошибка: невозможно получить изображение с canvas','warn');
    }
  });

  // тема
  if(els.themeBtn){ els.themeBtn.onclick = ()=>{ document.body.classList.toggle('light'); draw(); }; }

  // ВИЗУАЛЬНАЯ ПРОВЕРКА
  if(els.visualCheckBtn){
    els.visualCheckBtn.onclick = ()=>{
      if(!visualCheck){
        snapshotVC = grid.clone();
        visualCheck = true;
        els.visualCheckBtn.textContent = 'Выйти из проверки';
        toast('Режим визуальной проверки: ВКЛ (снимок сохранён)','ok');
      } else {
        visualCheck = false;
        snapshotVC = null;
        els.visualCheckBtn.textContent = 'Проверить (визуально)';
        toast('Режим визуальной проверки: ВЫКЛ','ok');
      }
      draw();
    };
  }

  applyPreset();
})();
