class LogicLayer{
  constructor(physics){
    this.physics = physics;
    this.gates = [];
    this.sceneObjects = []; // {id, type, x, y, width, height, data}
    this.selectedObject = null;
    this.selectedObjects = new Set();
    this.isDragging = false;
    this.dragOffset = {x: 0, y: 0};
    this.groupDragStart = null; // {x,y}
    this.groupInitialPositions = null; // Map(obj -> {x,y})
    this._undoStack = [];
    this._undoLimit = 64;
    
    logger.logSystem('LogicLayer initialized', {
      physicsEngine: !!physics
    });
  }
  clear(){ 
    const previousGatesCount = this.gates.length;
    const previousBallsCount = this.physics.balls.length;
    const previousSceneObjectsCount = this.sceneObjects.length;
    
    this.gates.length = 0; 
    this.physics.balls.length = 0; 
    this.sceneObjects.length = 0;
    this.selectedObject = null;
    this.selectedObjects.clear();
    this.isDragging = false;
    this.physics.reset(); 
    
    logger.logSystem('Scene cleared', {
      previousGatesCount,
      previousBallsCount,
      previousSceneObjectsCount
    });
  }

  // ============== UNDO ==============
  _snapshot(){
    return {
      gates: JSON.parse(JSON.stringify(this.gates)),
      balls: JSON.parse(JSON.stringify(this.physics.balls)),
      sceneObjects: JSON.parse(JSON.stringify(this.sceneObjects))
    };
  }
  _restore(state){
    if (!state) return;
    this.gates = JSON.parse(JSON.stringify(state.gates));
    this.physics.balls = JSON.parse(JSON.stringify(state.balls));
    this.sceneObjects = JSON.parse(JSON.stringify(state.sceneObjects));
    this.selectObject(null);
    this.physics.reset();
  }
  pushUndo(){
    try{
      const snap = this._snapshot();
      this._undoStack.push(snap);
      if (this._undoStack.length > this._undoLimit) this._undoStack.shift();
      logger.logSystem('Undo snapshot pushed', { size: this._undoStack.length });
    }catch(err){ logger.logError(err, { action: 'pushUndo' }); }
  }
  undo(){
    if (!this._undoStack.length) return false;
    const prev = this._undoStack.pop();
    this._restore(prev);
    logger.logSystem('Undo applied', { remaining: this._undoStack.length });
    return true;
  }
  loadPreset(name){
    logger.logSystem('Loading preset', { presetName: name });
    
    // Полная очистка всех объектов
    this.clear();
    const p = Presets[name] ?? Presets.custom;
    
    // Загружаем объекты сцены из пресета
    for(const obj of p.sceneObjects||[]) {
      const newObj = this.addSceneObject(obj.type, obj.x, obj.y, obj.width, obj.height, obj.data);
      // Восстанавливаем поворот если он был сохранен
      if (obj.rotation !== undefined) {
        newObj.rotation = obj.rotation;
      }
    }
    
    this.physics.reset();
    
    logger.logSystem('Preset loaded', {
      presetName: name,
      ballsLoaded: 0,
      gatesLoaded: p.gates?.length || 0,
      sceneObjectsLoaded: p.sceneObjects?.length || 0
    });
  }

  // Методы для работы с объектами сцены
  addSceneObject(type, x, y, width = 40, height = 40, data = {}) {
    this.pushUndo();
    const id = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const obj = {
      id,
      type, // 'wall', 'input', 'output', 'gate'
      x, y, width, height,
      rotation: 0, // угол поворота в радианах
      data: { ...data }
    };
    // Автоприсвоение имени по умолчанию для входов/выходов
    if (type === 'input') {
      const nextIndex = this.sceneObjects.filter(o => o.type === 'input').length + 1;
      const base = 'Вход';
      const current = (obj.data.label || '').trim();
      obj.data.label = current && current !== base ? current : `${base}${nextIndex}`;
    } else if (type === 'output') {
      const nextIndex = this.sceneObjects.filter(o => o.type === 'output').length + 1;
      const base = 'Выход';
      const current = (obj.data.label || '').trim();
      obj.data.label = current && current !== base ? current : `${base}${nextIndex}`;
    }
    this.sceneObjects.push(obj);
    // Пересобираем события для физики, чтобы новые объекты сразу учитывались
    this.physics?.rebuildEvents?.();
    
    logger.logSystem('Scene object added', {
      id,
      type,
      position: { x, y },
      size: { width, height }
    });
    
    return obj;
  }

  getObjectById(id){
    return this.sceneObjects.find(o => o.id === id) || null;
  }

  getInputs(){
    return this.sceneObjects.filter(o => o.type === 'input');
  }

  renameObject(id, newLabel){
    const obj = this.getObjectById(id);
    if (!obj) return null;
    if (obj.type !== 'input' && obj.type !== 'output') return obj;
    const trimmed = String(newLabel ?? '').trim();
    obj.data = { ...(obj.data||{}), label: trimmed || obj.data.label };
    logger.logSystem('Object renamed', { id: obj.id, type: obj.type, label: obj.data.label });
    return obj;
  }

  removeSceneObject(id) {
    this.pushUndo();
    const index = this.sceneObjects.findIndex(obj => obj.id === id);
    if (index !== -1) {
      const obj = this.sceneObjects.splice(index, 1)[0];
      if (this.selectedObject?.id === id) {
        this.selectedObject = null;
      }
      // Удаление физических сегментов более не требуется: стены представлены только сценобъектами
      
      logger.logSystem('Scene object removed', {
        id,
        type: obj.type
      });
      // Пересобираем события
      this.physics?.rebuildEvents?.();
      
      return obj;
    }
    return null;
  }

  getObjectAt(x, y) {
    for (let i = this.sceneObjects.length - 1; i >= 0; i--) {
      const obj = this.sceneObjects[i];
      
      // Для всех объектов используем проверку с учетом поворота
      if (this.isPointInRotatedRect(x, y, obj)) {
        return obj;
      }
    }
    return null;
  }

  // Проверка попадания точки в повернутый прямоугольник
  isPointInRotatedRect(x, y, rect) {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    
    // Если угол поворота 0, используем простую проверку
    if (!rect.rotation || rect.rotation === 0) {
      return x >= rect.x && x <= rect.x + rect.width &&
             y >= rect.y && y <= rect.y + rect.height;
    }
    
    // Переводим координаты точки в локальную систему координат прямоугольника
    const localX = x - centerX;
    const localY = y - centerY;
    
    // Поворачиваем координаты обратно (относительно прямоугольника)
    const cos = Math.cos(-rect.rotation);
    const sin = Math.sin(-rect.rotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    
    // Проверяем попадание в локальных координатах
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    
    return rotatedX >= -halfWidth && rotatedX <= halfWidth &&
           rotatedY >= -halfHeight && rotatedY <= halfHeight;
  }

  selectObject(obj) {
    this.selectedObject = obj;
    this.selectedObjects.clear();
    if (obj) this.selectedObjects.add(obj);
    logger.logSystem('Object selected', {
      id: obj?.id,
      type: obj?.type
    });
  }

  // Multiple selection helpers
  isSelected(obj){ return this.selectedObjects.has(obj); }
  getSelection(){ return Array.from(this.selectedObjects); }
  getSelectionSize(){ return this.selectedObjects.size; }
  clearSelection(){ this.selectedObjects.clear(); this.selectedObject = null; }
  selectSingle(obj){ this.selectedObjects.clear(); if (obj){ this.selectedObjects.add(obj); this.selectedObject = obj; } else { this.selectedObject = null; } }
  toggleSelection(obj){
    if (!obj) return;
    if (this.selectedObjects.has(obj)){
      this.selectedObjects.delete(obj);
      if (this.selectedObject === obj){
        // Pick another as focused if available
        const first = this.selectedObjects.values().next().value || null;
        this.selectedObject = first || null;
      }
    } else {
      this.selectedObjects.add(obj);
      this.selectedObject = obj;
    }
    logger.logSystem('Selection toggled', {
      toggledId: obj.id,
      selectionSize: this.selectedObjects.size
    });
  }

  startDrag(obj, mouseX, mouseY) {
    if (!obj) return;
    // Ensure selection contains intended objects
    if (!this.selectedObjects.size || !this.selectedObjects.has(obj)){
      this.selectSingle(obj);
    }
    this.pushUndo();
    this.isDragging = true;
    if (this.selectedObjects.size > 1){
      // Group drag
      this.groupDragStart = { x: mouseX, y: mouseY };
      this.groupInitialPositions = new Map();
      for (const o of this.selectedObjects){
        this.groupInitialPositions.set(o, { x: o.x, y: o.y });
      }
      logger.logSystem('Group drag started', {
        selectionSize: this.selectedObjects.size
      });
    } else {
      // Single drag (legacy)
      this.dragOffset.x = mouseX - obj.x;
      this.dragOffset.y = mouseY - obj.y;
      logger.logSystem('Drag started', {
        objectId: obj.id,
        objectType: obj.type,
        offset: this.dragOffset
      });
    }
  }

  updateDrag(mouseX, mouseY) {
    if (!this.isDragging) return;
    const bounds = this.physics.bounds;
    if (this.groupInitialPositions && this.selectedObjects.size > 1 && this.groupDragStart){
      const dx = mouseX - this.groupDragStart.x;
      const dy = mouseY - this.groupDragStart.y;
      for (const o of this.selectedObjects){
        const p = this.groupInitialPositions.get(o);
        if (!p) continue;
        const newX = p.x + dx;
        const newY = p.y + dy;
        o.x = Math.max(0, Math.min(bounds.width - o.width, newX));
        o.y = Math.max(0, Math.min(bounds.height - o.height, newY));
      }
    } else if (this.selectedObject) {
      const newX = mouseX - this.dragOffset.x;
      const newY = mouseY - this.dragOffset.y;
      this.selectedObject.x = Math.max(0, Math.min(bounds.width - this.selectedObject.width, newX));
      this.selectedObject.y = Math.max(0, Math.min(bounds.height - this.selectedObject.height, newY));
    }
  }

  endDrag() {
    if (this.isDragging) {
      if (this.selectedObjects.size > 1) {
        logger.logSystem('Group drag ended', {
          selectionSize: this.selectedObjects.size
        });
      } else if (this.selectedObject) {
        logger.logSystem('Drag ended', {
          objectId: this.selectedObject.id,
          finalPosition: { x: this.selectedObject.x, y: this.selectedObject.y }
        });
      }
    }
    this.isDragging = false;
    this.dragOffset = {x: 0, y: 0};
    this.groupDragStart = null;
    this.groupInitialPositions = null;
    // После завершения перетаскивания – пересобрать события
    this.physics?.rebuildEvents?.();
  }

  // Поворот объекта
  rotateObject(obj, angle) {
    if (!obj) return;
    this.pushUndo();
    
    const oldRotation = obj.rotation;
    obj.rotation = (obj.rotation + angle) % (2 * Math.PI);
    
    logger.logSystem('Object rotated', {
      objectId: obj.id,
      objectType: obj.type,
      oldRotation: oldRotation,
      newRotation: obj.rotation,
      angleChange: angle
    });
    this.physics?.rebuildEvents?.();
  }

  // Получение позиции кнопки поворота для стены
  getRotationButtonPosition(wallObj) {
    const centerX = wallObj.x + wallObj.width / 2;
    const centerY = wallObj.y + wallObj.height / 2;
    const distance = 40; // расстояние от центра стены до кнопки поворота
    
    // Поворачиваем вектор (0, -distance) на угол стены
    const buttonX = centerX + Math.sin(wallObj.rotation) * distance;
    const buttonY = centerY - Math.cos(wallObj.rotation) * distance;
    
    return { x: buttonX, y: buttonY };
  }

  // Получение позиции кнопки масштабирования для стены
  getScaleButtonPosition(wallObj) {
    const centerX = wallObj.x + wallObj.width / 2;
    const centerY = wallObj.y + wallObj.height / 2;
    const distance = 40; // расстояние от центра стены до кнопки
    
    // Поворачиваем вектор (0, distance) на угол стены (противоположная сторона от кнопки поворота)
    const buttonX = centerX - Math.sin(wallObj.rotation) * distance;
    const buttonY = centerY + Math.cos(wallObj.rotation) * distance;
    
    return { x: buttonX, y: buttonY };
  }

  // Получение позиции кнопки поворота для входа/выхода
  getIORotationButtonPosition(ioObj) {
    const centerX = ioObj.x + ioObj.width / 2;
    const centerY = ioObj.y + ioObj.height / 2;
    const distance = Math.max(ioObj.width, ioObj.height) / 2 + 25; // расстояние от центра
    
    return { x: centerX, y: centerY - distance };
  }

  // Проверка попадания в кнопку поворота
  isRotationButtonHit(x, y, obj) {
    // Выход не имеет кнопки поворота
    if (obj.type === 'output') return false;
    
    const buttonPos = obj.type === 'wall' 
      ? this.getRotationButtonPosition(obj)
      : this.getIORotationButtonPosition(obj);
    const buttonRadius = 12;
    
    const dx = x - buttonPos.x;
    const dy = y - buttonPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= buttonRadius;
  }

  // Проверка попадания в кнопку масштабирования
  isScaleButtonHit(x, y, wallObj) {
    const buttonPos = this.getScaleButtonPosition(wallObj);
    const buttonRadius = 12;
    
    const dx = x - buttonPos.x;
    const dy = y - buttonPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= buttonRadius;
  }

  // Масштабирование объекта
  scaleObject(obj, scaleFactor) {
    if (!obj) return;
    this.pushUndo();
    
    const oldWidth = obj.width;
    const oldHeight = obj.height;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    
    // Применяем масштаб с ограничениями
    obj.width = Math.max(10, Math.min(800, obj.width * scaleFactor));
    obj.height = Math.max(10, Math.min(800, obj.height * scaleFactor));
    
    // Перемещаем объект так, чтобы центр остался на месте
    obj.x = centerX - obj.width / 2;
    obj.y = centerY - obj.height / 2;
    
    logger.logSystem('Object scaled', {
      objectId: obj.id,
      objectType: obj.type,
      oldSize: { width: oldWidth, height: oldHeight },
      newSize: { width: obj.width, height: obj.height },
      scaleFactor
    });
    this.physics?.rebuildEvents?.();
  }

  // Создание шарика во входе
  spawnBallAtInput(inputObj) {
    if (inputObj.type !== 'input') return null;
    
    const speed = 180;
    const rotation = inputObj.rotation || 0;
    
    // Направление движения зависит от угла поворота входа
    // 0° = вправо, 90° = вниз, 180° = влево, 270° = вверх
    const vx = Math.cos(rotation) * speed;
    const vy = Math.sin(rotation) * speed;
    
    const ballData = {
      x: inputObj.x + inputObj.width / 2,
      y: inputObj.y + inputObj.height / 2,
      vx,
      vy,
      r: 24,
      color: '#7cf29a'
    };
    
    const ball = this.physics.addBall(ballData);
    
    logger.logSystem('Ball spawned at input', {
      inputId: inputObj.id,
      inputLabel: inputObj.data.label,
      ballId: ball.id,
      position: { x: ball.x, y: ball.y },
      velocity: { vx: ball.vx, vy: ball.vy },
      rotation: rotation
    });
    
    return ball;
  }

  // Автоматическое создание шариков во всех входах
  spawnBallsAtAllInputs() {
    const inputObjects = this.sceneObjects.filter(obj => obj.type === 'input');
    const spawnedBalls = [];
    
    for (const inputObj of inputObjects) {
      const ball = this.spawnBallAtInput(inputObj);
      if (ball) spawnedBalls.push(ball);
    }
    
    return spawnedBalls;
  }

  // Создание шариков только в выбранных входах (по id)
  spawnBallsAtInputs(inputIds = []){
    const ids = new Set(inputIds);
    const inputs = this.sceneObjects.filter(o => o.type === 'input' && ids.has(o.id));
    const spawnedBalls = [];
    for (const inputObj of inputs){
      const ball = this.spawnBallAtInput(inputObj);
      if (ball) spawnedBalls.push(ball);
    }
    return spawnedBalls;
  }
}

const Presets = {
  custom: {
    balls:[],
    gates:[],
    sceneObjects:[]
  },
  gate_and: {
    bounds: {
      x: 0,
      y: 0,
      width: 1778,
      height: 1000
    },
    balls: [],
    gates: [],
    sceneObjects: [
      {"id": "obj_1760995283411_oml9og9e1", "type": "input", "x": 223.92986825879396, "y": 294.0249997510651, "width": 60, "height": 60, "rotation": 0, "data": {"label": "1"}},
      {"id": "obj_1760995283411_1ejcodxh0", "type": "input", "x": 516.0146107794179, "y": 0.034750101017131385, "width": 60, "height": 60, "rotation": 1.5707963267948966, "data": {"label": "2"}},
      {"id": "obj_1760995283411_ptljiskz0", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283412_0ahtglis7", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283412_i6y9nbf5e", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283412_szq08jlt8", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283413_s7ifr4vhu", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283413_pfn0ugf3t", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283413_67wyeqfmw", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283413_c0765ljbn", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283414_oxdlivky3", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283414_z352necke", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283414_jdhlgu6gm", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283414_f100j3nzf", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283415_iv3nd00s7", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283415_693ss5j9v", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283415_565g67ezk", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283415_72yals1qt", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283415_g7i4um6aw", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283416_9zacqvlp5", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283416_qu4ygsj38", "type": "wall", "x": null, "y": null, "width": 10, "height": 10, "rotation": null, "data": {}},
      {"id": "obj_1760995283416_alifskath", "type": "wall", "x": 613.964934129397, "y": 627.9064999219163, "width": 180, "height": 10, "rotation": 0, "data": {}},
      {"id": "obj_1760995283416_un7hcpjca", "type": "wall", "x": 72.66953673969687, "y": 275.0554821448677, "width": 430.7232658461228, "height": 11.9645351623923, "rotation": 0, "data": {}},
      {"id": "obj_1760995283417_x53rcbh2s", "type": "wall", "x": 737.9717524931253, "y": 390.07600017391064, "width": 10, "height": 120, "rotation": 0, "data": {}},
      {"id": "obj_1760995283417_rcp8qk4fd", "type": "wall", "x": 574, "y": 240.0049993750781, "width": 120, "height": 10, "rotation": 0.6897251183871714, "data": {}},
      {"id": "obj_1760995283417_2j6r3hkmq", "type": "wall", "x": 438.6352797640918, "y": 593.7331100051346, "width": 90.77814306987622, "height": 10.433281047962701, "rotation": 0.6355014278868235, "data": {}},
      {"id": "obj_1760995283417_dtdz4hbyv", "type": "wall", "x": 740, "y": 502.00224971878515, "width": 260, "height": 10, "rotation": 0, "data": {}},
      {"id": "obj_1760995283418_b6ps59ahu", "type": "wall", "x": 740, "y": 627.9965004374453, "width": 260, "height": 10, "rotation": 0, "data": {}},
      {"id": "obj_1760995283418_l7fxbk26e", "type": "output", "x": 988, "y": 304.0044994375703, "width": 60, "height": 60, "rotation": 0, "data": {"label": "0"}},
      {"id": "obj_1760995283418_zh4j2qm6s", "type": "output", "x": 524, "y": 619.9950006249219, "width": 60, "height": 60, "rotation": 0, "data": {"label": "0"}},
      {"id": "obj_1760995283419_o63uznixy", "type": "output", "x": 940, "y": 539.9987501562305, "width": 60, "height": 60, "rotation": 0, "data": {"label": "1"}},
      {"id": "obj_1760995283419_y853ibxv2", "type": "wall", "x": 362.89606270918944, "y": 129.17285614006352, "width": 279.7271413493388, "height": 10, "rotation": -1.5636499235038193, "data": {}},
      {"id": "obj_1760995283419_3mm5stdpt", "type": "wall", "x": 495.01237345331833, "y": 101.98662667166604, "width": 197.97525309336334, "height": 10, "rotation": -1.5707963267948966, "data": {}},
      {"id": "obj_1760995283420_mql6nqllm", "type": "wall", "x": 76, "y": 374.9525059367579, "width": 382, "height": 10, "rotation": 3.141592653589793, "data": {}},
      {"id": "obj_1760995283420_1r6e0i3iw", "type": "wall", "x": 356.01174853143357, "y": 466.94100737407825, "width": 187.97650293713286, "height": 10, "rotation": -1.5707963267948966, "data": {}},
      {"id": "obj_1760995283420_5vh97op1d", "type": "wall", "x": 20.006749156355454, "y": 322.95900512435946, "width": 107.98650168728909, "height": 10, "rotation": -1.5707963267948966, "data": {}},
      {"id": "obj_1760995283421_jyillbdb1", "type": "wall", "x": 736, "y": 386.9510061242345, "width": 332, "height": 10, "rotation": 3.141592653589793, "data": {}},
      {"id": "obj_1760995283421_f79cnrjgn", "type": "wall", "x": 937.001145474987, "y": 564.9287589051369, "width": 135.997709050026, "height": 10, "rotation": 1.556089666579257, "data": {}},
      {"id": "obj_1760995306014_l8lmttlb5", "type": "output", "x": 688, "y": 219.9687539057618, "width": 60, "height": 60, "rotation": 0, "data": {"label": "trash"}},
      {"id": "obj_1760995313963_30aptj2he", "type": "wall", "x": 761.9966675368614, "y": 267.96587926509187, "width": 300.00666492627704, "height": 10, "rotation": 0.006665734711714678, "data": {}},
      {"id": "obj_1760995318174_gcpj845ct", "type": "wall", "x": 734.0037495313086, "y": 226.97100362454694, "width": 59.99250093738283, "height": 10, "rotation": 1.5707963267948966, "data": {}},
      {"id": "obj_1760995322037_uuhe9lw6k", "type": "wall", "x": 643.9889745533652, "y": 233.97012873390827, "width": 66.02205089326955, "height": 10, "rotation": 1.5404987824728857, "data": {}},
      {"id": "obj_1760995353847_bfea0a2rm", "type": "wall", "x": 670, "y": 192.97525309336334, "width": 98, "height": 10, "rotation": 0, "data": {}},
      {"id": "obj_1760995364755_oyyefs3w5", "type": "wall", "x": 1002.0004311705541, "y": 327.9583802024747, "width": 129.99913765889175, "height": 10, "rotation": 1.5554110023924936, "data": {}}
    ],
    timing: {
      step: 0.016666666666666666
    }
  },
  gate_or: {
    bounds: {
      x: 0,
      y: 0,
      width: 1778,
      height: 1000
    },
    balls: [],
    gates: [],
    sceneObjects: [
      {"id": "obj_1760995540616_ylozlbvug","type": "input","x": 462,"y": 363.9507561554806,"width": 60,"height": 60,"rotation": 0,"data": {"label": "1"}},
      {"id": "obj_1760995545600_4alkr49hf","type": "output","x": 998,"y": 361.9510061242345,"width": 60,"height": 60,"rotation": 0,"data": {"label": "1"}},
      {"id": "obj_1760995549059_9olshlahx","type": "input","x": 716,"y": 61.98850143732034,"width": 60,"height": 60,"rotation": 1.5707963267948966,"data": {"label": "2"}},
      {"id": "obj_1760995578924_sw789s90y","type": "wall","x": 464,"y": 344.9562554680665,"width": 242,"height": 10,"rotation": 0,"data": {}},
      {"id": "obj_1760995613615_u9q3v08k0","type": "wall","x": 666.8311675401092,"y": 198.97450318710162,"width": 110.33766491978162,"height": 10,"rotation": 0.8109711577489565,"data": {}},
      {"id": "obj_1760995617468_s9dria7kz","type": "wall","x": 607.9874930801936,"y": 252.96775403074616,"width": 172.02501383961263,"height": 10,"rotation": -1.5940508550105685,"data": {}},
      {"id": "obj_1760995621679_wo5mnv63h","type": "wall","x": 786.1892197140062,"y": 154.98000249968754,"width": 107.62156057198766,"height": 10,"rotation": 0.8379190737890286,"data": {}},
      {"id": "obj_1760995636489_5rexr5llq","type": "wall","x": 779.8369845136345,"y": 318.9595050618673,"width": 96.32603097273086,"height": 10,"rotation": 0.8440919205720392,"data": {}},
      {"id": "obj_1760995654394_u1c4kjj4d","type": "wall","x": 449.99841812097384,"y": 439.944381952256,"width": 632.0031637580523,"height": 10,"rotation": -0.003164150882133945,"data": {}},
      {"id": "obj_1760995655822_rv30yyp1k","type": "wall","x": 1018.007999000125,"y": 374.9525059367579,"width": 127.98400199975003,"height": 10,"rotation": -1.5707963267948966,"data": {}},
      {"id": "obj_1760995659707_ovckimgzd","type": "wall","x": 935.4110205955108,"y": 275.96487939007625,"width": 151.1779588089786,"height": 10,"rotation": -2.6602467239352148,"data": {}},
      {"id": "obj_1760995721127_fot8yeucg","type": "wall","x": 402.00624921884764,"y": 394.95000624921886,"width": 99.98750156230471,"height": 10,"rotation": -1.5707963267948966,"data": {}},
      {"id": "obj_1760995724901_ez6o0p8fx","type": "wall","x": 621.9994268519318,"y": 95.98737657792776,"width": 122.00114629613624,"height": 10,"rotation": -1.587190349732602,"data": {}},
      {"id": "obj_1760995728974_m00d30d1n","type": "wall","x": 682,"y": 34.995000624921886,"width": 124,"height": 10,"rotation": 0,"data": {}},
      {"id": "obj_1760995737566_2aej5izg4","type": "wall","x": 762.9924997658252,"y": 80.98925134358205,"width": 80.01500046834974,"height": 10,"rotation": -1.5957942434616679,"data": {}},
      {"id": "obj_1760995748497_k6qboqj4h","type": "wall","x": 869.6614100061006,"y": 214.97250343707037,"width": 82.6771799877988,"height": 10,"rotation": -2.580485555740733,"data": {}}
    ],
    timing: {
      step: 0.016666666666666666
    }
  }
};
window.LogicLayer = LogicLayer;
window.Presets = Presets;


