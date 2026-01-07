class Renderer {
  constructor(canvas, physics, logic){
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.physics = physics; this.logic = logic; this._lastFps = 0;
    this._wallPreview = null; // {x,y,width,height,rotation}
    
    logger.logSystem('Renderer initialized', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      contextType: '2d'
    });
    
    window.addEventListener('resize', ()=> this.resize());
    this.resize();
  }
  resize(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(640, Math.floor(rect.width * dpr));
    const h = Math.floor(w * 9/16);
    
    const oldSize = { width: this.canvas.width, height: this.canvas.height };
    this.canvas.width = w; this.canvas.height = h;
    this.physics.setBounds(w, h);
    
    logger.logSystem('Canvas resized', {
      devicePixelRatio: dpr,
      oldSize,
      newSize: { width: w, height: h },
      containerSize: { width: rect.width, height: rect.height }
    });
    
    this.renderOnce();
  }
  renderOnce(){
    const ctx = this.ctx; const {width,height} = this.canvas; ctx.clearRect(0,0,width,height);
    // background grid
    ctx.fillStyle = '#0b0f17'; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0;x<width;x+=40){ ctx.moveTo(x,0); ctx.lineTo(x,height); }
    for(let y=0;y<height;y+=40){ ctx.moveTo(0,y); ctx.lineTo(width,y); }
    ctx.stroke();

    // draw wall preview (translucent rotated rect)
    if (this._wallPreview){
      this.drawWallPreview(this._wallPreview);
    }

    // gates (visual only) - отключено, чтобы не отображались предустановленные гейты
    // for(const g of this.logic.gates){ this.drawGate(g); }

    // scene objects (rendered before balls so balls appear on top)
    for(const obj of this.logic.sceneObjects){
      if (!obj || !isFinite(obj.x) || !isFinite(obj.y) || !isFinite(obj.width) || !isFinite(obj.height)) {
        logger.logError(new Error('Invalid scene object'), { obj });
        continue;
      }
      this.drawSceneObject(obj);
    }
    // Добавляем второй проход для имен объектов
    for(const obj of this.logic.sceneObjects){
      if (!obj || !obj.data) continue;
      this.drawSceneObjectLabel(obj);
    }

    // после обычных объектов и ярлыков (до шаров): рисуем PREVIEW input/output если есть в UI
    let previewObj = null;
    // Попытка найти UI глобально (BBM или через window.UI)
    if (window.BBM && window.BBM.ui && window.BBM.ui._pendingPreview) previewObj = window.BBM.ui._pendingPreview;
    else if (window.UI && window.UI._pendingPreview) previewObj = window.UI._pendingPreview;
    if (previewObj) {
      this.drawPreviewIOObject(previewObj);
    }

    // balls (rendered last so they appear on top of outputs)
    for(const b of this.physics.balls){
      if (!b || !isFinite(b.x) || !isFinite(b.y) || !isFinite(b.r)) { logger.logError(new Error('Invalid ball'), { b }); continue; }
      // Свечение при попадании в выход: плавное затухание за 6 сек
      let alpha = 1;
      if (b.glow){
        const elapsed = Math.max(0, this.physics.time - (b.glowStartTime||0));
        const total = Math.max(0.0001, (b.removeAt|| (b.glowStartTime||0)+6) - (b.glowStartTime||0));
        alpha = Math.max(0, 1 - (elapsed/total));
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, alpha);
        ctx.shadowColor = b.color || '#7cf29a';
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = b.color || '#7cf29a';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      if (b.glow){ ctx.restore(); }
    }
  }
  drawGate(g){
    const ctx = this.ctx; ctx.save();
    ctx.translate(g.x, g.y); ctx.strokeStyle = '#9fb3ff'; ctx.lineWidth = 2; ctx.fillStyle = '#1a2240aa';
    ctx.beginPath(); ctx.rect(-40,-24,80,48); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9d4ff'; ctx.font = '12px Inter, system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(g.type, 0, 0);
    ctx.restore();
  }

  drawSceneObject(obj){
    const ctx = this.ctx;
    ctx.save();
    
    switch (obj.type) {
      case 'wall':
        // Рисуем повернутую стену
        this.drawRotatedWall(obj);
        break;
        
      case 'input':
        this.drawIOObject(obj, '#4ecdc4', '#26a69a', '→');
        break;
        
      case 'output':
        this.drawIOObject(obj, '#ffa726', '#ff9800', '⊗');
        break;
        
      default:
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeStyle = '#757575';
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
    
    ctx.restore();
  }

  drawIOObject(obj, fillColor, strokeColor, icon) {
    const ctx = this.ctx;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    
    ctx.save();
    
    // Перемещаем начало координат в центр объекта
    ctx.translate(centerX, centerY);
    
    // Поворачиваем на угол объекта
    ctx.rotate(obj.rotation || 0);
    
    // Выделение выбранного объекта (поддержка мультивыделения)
    if (this.logic.isSelected?.(obj)) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(-obj.width / 2 - 2, -obj.height / 2 - 2, obj.width + 4, obj.height + 4);
    }
    
    // Рисуем объект относительно центра
    ctx.fillStyle = fillColor;
    ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    // Иконка
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, -8);
    
    ctx.restore();
    
    // Рисуем кнопку поворота, если объект выделен (только для входа, не для выхода)
    if (this.logic.selectedObject === obj && obj.type === 'input') {
      this.drawIORotationButton(obj);
    }
  }

  drawPreviewIOObject(obj) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.42;
    let fill, stroke, icon;
    if (obj.type === 'input') {
      fill = '#4ecdc4'; stroke = '#26a69a'; icon = '→';
    } else if (obj.type === 'output') {
      fill = '#ffa726'; stroke = '#ff9800'; icon = '⊗';
    } else {
      fill = '#aaa'; stroke = '#888'; icon = '?';
    }
    // Теперь obj.x, obj.y — это центр!
    ctx.translate(obj.x, obj.y);
    ctx.fillStyle = fill;
    ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, -8);
    ctx.restore();
  }

  drawRotatedWall(obj) {
    const ctx = this.ctx;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    
    ctx.save();
    
    // Перемещаем начало координат в центр стены
    ctx.translate(centerX, centerY);
    
    // Поворачиваем на угол стены
    ctx.rotate(obj.rotation || 0);
    
    // Выделение выбранного объекта (поддержка мультивыделения)
    if (this.logic.isSelected?.(obj)) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(-obj.width / 2 - 2, -obj.height / 2 - 2, obj.width + 4, obj.height + 4);
    }
    
    // Рисуем стену относительно центра
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
    
    ctx.restore();
    
    // Рисуем кнопки поворота и масштабирования, если стена выделена
    if (this.logic.selectedObject === obj) {
      this.drawRotationButton(obj);
      this.drawScaleButton(obj);
    }
  }

  // Preview drawing for wall while dragging
  drawWallPreview(obj){
    const ctx = this.ctx;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(obj.rotation || 0);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
    ctx.restore();
  }

  setWallPreview(preview){
    this._wallPreview = preview; // object or null
  }

  drawRotationButton(wallObj) {
    const ctx = this.ctx;
    const buttonPos = this.logic.getRotationButtonPosition(wallObj);
    
    ctx.save();
    
    // Рисуем кнопку поворота
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(buttonPos.x, buttonPos.y, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Рисуем иконку поворота (стрелка по кругу)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', buttonPos.x, buttonPos.y);
    
    ctx.restore();
  }

  drawScaleButton(wallObj) {
    const ctx = this.ctx;
    const buttonPos = this.logic.getScaleButtonPosition(wallObj);
    
    ctx.save();
    
    // Рисуем кнопку масштабирования
    ctx.fillStyle = '#2196F3';
    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(buttonPos.x, buttonPos.y, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Рисуем иконку масштабирования (стрелки в разные стороны)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⇿', buttonPos.x, buttonPos.y);
    
    ctx.restore();
  }

  drawIORotationButton(ioObj) {
    const ctx = this.ctx;
    const buttonPos = this.logic.getIORotationButtonPosition(ioObj);
    
    ctx.save();
    
    // Рисуем кнопку поворота
    ctx.fillStyle = '#9C27B0';
    ctx.strokeStyle = '#6A1B9A';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(buttonPos.x, buttonPos.y, 12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Рисуем иконку поворота (стрелка по кругу)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', buttonPos.x, buttonPos.y);
    
    ctx.restore();
  }

  drawSceneObjectLabel(obj) {
    const ctx = this.ctx;
    // Координаты центра объекта
    const centerX = obj.x + obj.width/2;
    const centerY = obj.y + obj.height/2;
    if (obj.data && obj.data.label) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Позиция над объектом (+20px вниз за пределы объекта)
      const labelY = centerY + Math.max(obj.height, obj.width)/2 + 18;
      ctx.strokeStyle = '#000a';
      ctx.lineWidth = 4;
      ctx.strokeText(obj.data.label, centerX, labelY);
      ctx.fillText(obj.data.label, centerX, labelY);
      ctx.restore();
    }
  }
}
window.Renderer = Renderer;


