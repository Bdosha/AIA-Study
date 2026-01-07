// Удалить: import { logger } from './logger.js';

class PhysicsEngine {
  constructor(){
    this.bounds = { x:0, y:0, width:1280, height:720 };
    this.balls = []; // {id,x,y,vx,vy,r,m,color}
    this.time = 0;
    this.stepCount = 0;
    this.dt = 1/60; // seconds per tick (sim time)
    this.running = false;
    this.speedScale = 1; // realtime multiplier
    this._accum = 0; // for fixed-timestep integration
    this.listeners = new Set();
    this.logic = null; // Ссылка на логический слой для доступа к объектам сцены
    // Очередь событий столкновений (минимум по времени)
    this._eventQueue = []; // {time, type:'ball-ball'|'bound', aIndex, bIndex?, axis?}
    // Версии для инвалидации событий
    this._ballVersion = [];
    this.debug = false;
    
    // logger.logSystem('PhysicsEngine initialized', {
    //   bounds: this.bounds,
    //   dt: this.dt,
    //   initialSpeedScale: this.speedScale
    // });
  }

  setDebug(flag){
    this.debug = !!flag;
    if (typeof window !== 'undefined') window.PHYS_DEBUG = !!flag;
  }

  setLogicLayer(logic) {
    this.logic = logic;
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Логический слой подключён', {logic, time: this.time});
    // logger.logSystem('Logic layer connected to physics', {
    //   logicLayer: !!logic
    // });
  }

  // Публичный метод: пересобрать очередь событий (например, после изменения объектов сцены)
  rebuildEvents(){
    this._rebuildEventQueue();
  }

  onEvent(cb){ this.listeners.add(cb); if (this.debug || window.PHYS_DEBUG) logger.logDebug('Listener added for events', {count: this.listeners.size}); return ()=>this.listeners.delete(cb); }
  emit(event){
    for(const cb of this.listeners) cb(event);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('emit event', {...event});
  }

  reset(){
    const previousTime = this.time;
    const previousStepCount = this.stepCount;
    this.time = 0; this.stepCount = 0; this._accum = 0;
    this._eventQueue.length = 0;
    this._ballVersion = [];
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('PhysicsEngine reset', {previousTime, previousStepCount, ballsCount: this.balls.length});
    // logger.logPhysics('Physics reset', {
    //   previousTime,
    //   previousStepCount,
    //   ballsCount: this.balls.length
    // });
  }

  addBall(ball){
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('addBall called', {...ball});
    const id = ball.id ?? `b${this.balls.length+1}`;
    const r = {
      id, x:ball.x, y:ball.y, vx:ball.vx, vy:ball.vy,
      r:ball.r??8, m:ball.m??1, color:ball.color??'#7cf29a',
      x0:ball.x, y0:ball.y, vx0:ball.vx, vy0:ball.vy,
      glow:false, glowStartTime:0, removeAt:null,
      _lastCollision: null, _currentInputId: null,
      _mayBounce: true // ФЛАГ: можно ли отразиться
    };
    this.balls.push(r); 
    this._ballVersion.push(0);
    
    // logger.logPhysics('Ball added', {
    //   id: r.id,
    //   position: { x: r.x, y: r.y },
    //   velocity: { vx: r.vx, vy: r.vy },
    //   radius: r.r,
    //   color: r.color
    // });
    
    // Планируем события для нового шара, если симуляция уже идет или очередь существует
    try {
      this._scheduleForBall(this.balls.length - 1, true);
      this._heapify();
    } catch(_){}
    
    return r;
  }

  setBounds(w,h){ 
    const oldBounds = { ...this.bounds };
    this.bounds.width = w; 
    this.bounds.height = h; 
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('setBounds update', {oldBounds, newBounds: this.bounds});
    // logger.logPhysics('Bounds updated', {
    //   oldBounds,
    //   newBounds: this.bounds
    // });
    // Перестроить очередь событий, так как изменились границы
    if (this.running) this._rebuildEventQueue();
  }

  // Проверка столкновения шарика с объектом сцены
  checkSceneObjectCollision(ball) {
    if (!this.logic) return null;
    
    for (const obj of this.logic.sceneObjects) {
      // Для всех объектов используем обработку с учетом поворота
      const collision = this.checkRotatedRectCollision(ball, obj);
      if (collision) {
        return collision;
      }
    }
    return null;
  }

  // Проверка столкновения с повернутым прямоугольником (стена, вход, выход)
  checkRotatedRectCollision(ball, rect) {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    
    // Переводим координаты шарика в локальную систему координат прямоугольника
    const localX = ball.x - centerX;
    const localY = ball.y - centerY;
    
    // Поворачиваем координаты обратно (относительно прямоугольника)
    const rotation = rect.rotation || 0;
    const cosL = Math.cos(-rotation);
    const sinL = Math.sin(-rotation);
    const rotatedX = localX * cosL - localY * sinL;
    const rotatedY = localX * sinL + localY * cosL;
    
    // Проверяем столкновение в локальных координатах
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    
    const closestX = Math.max(-halfWidth, Math.min(rotatedX, halfWidth));
    const closestY = Math.max(-halfHeight, Math.min(rotatedY, halfHeight));
    
    const dx = rotatedX - closestX;
    const dy = rotatedY - closestY;
    const distance = Math.hypot(dx, dy);
    
    if (distance < ball.r) {
      // Если distance == 0, центр шарика совпал с ближайшей точкой — нужно выбрать устойчивую нормаль
      let localNormalX = 0, localNormalY = 0;
      if (distance === 0) {
        // Найдём ближайшую грань прямоугольника в локальных координатах
        const distLeft = Math.abs(rotatedX - (-halfWidth));
        const distRight = Math.abs(halfWidth - rotatedX);
        const distTop = Math.abs(rotatedY - (-halfHeight));
        const distBottom = Math.abs(halfHeight - rotatedY);
        const minEdge = Math.min(distLeft, distRight, distTop, distBottom);
        if (minEdge === distLeft)      { localNormalX = -1; localNormalY = 0; }
        else if (minEdge === distRight){ localNormalX =  1; localNormalY = 0; }
        else if (minEdge === distTop)  { localNormalX =  0; localNormalY = -1; }
        else                           { localNormalX =  0; localNormalY =  1; }
      } else {
        localNormalX = dx / distance;
        localNormalY = dy / distance;
      }

      // Поворачиваем нормаль обратно в глобальные координаты
      const cosW = Math.cos(rotation);
      const sinW = Math.sin(rotation);
      const globalNormalX = localNormalX * cosW - localNormalY * sinW;
      const globalNormalY = localNormalX * sinW + localNormalY * cosW;

      // Вернём расстояние и нормаль в глобальной системе
      return {
        object: rect,
        distance,
        dx: globalNormalX * distance,
        dy: globalNormalY * distance,
        normalX: globalNormalX,
        normalY: globalNormalY
      };
    }
    
    return null;
  }

  // Обработка взаимодействия с объектами сцены
  handleSceneObjectInteraction(ball, collision) {
    if (!collision) return false;
    
    const obj = collision.object;
    
    switch (obj.type) {
      case 'wall':
        // ЛОГ ВЫЗОВА
        logger.logPhysics('Call handleWallBounce', { ball: {id: ball.id, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy}, wall: {id: obj.id, x: obj.x, y: obj.y, w: obj.width, h: obj.height} });
        // Отскок от стены
        this.handleWallBounce(ball, obj, collision);
        this.emit({
          kind: 'sceneObject',
          ball: ball.id,
          object: obj.id,
          type: 'wall_bounce',
          t: this.time
        });
        return true;
        
      case 'output':
        // Перемещаем шарик в центр выхода и останавливаем
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        ball.x = centerX;
        ball.y = centerY;
        ball.vx = 0;
        ball.vy = 0;
        // Включаем свечение и планируем удаление через 6 секунд сим-времени
        ball.glow = true;
        ball.glowStartTime = this.time;
        ball.removeAt = this.time + 6;
        this.emit({
          kind: 'sceneObject',
          ball: ball.id,
          object: obj.id,
          type: 'output_capture',
          objectLabel: obj.data?.label,
          t: this.time
        });
        return true;
        
      case 'input':
        // Эмитим событие входа ТОЛЬКО при первом заходе (edge-triggered)
        if (ball._currentInputId !== obj.id) {
          ball._currentInputId = obj.id;
          this.emit({
            kind: 'sceneObject',
            ball: ball.id,
            object: obj.id,
            type: 'input_pass',
            objectLabel: obj.data?.label,
            t: this.time
          });
        }
        return true; // Обработано
        
      default:
        return false;
    }
  }

  // Обработка отскока от стены
  handleWallBounce(ball, wall, collision) {
    let nx, ny;
    // Если коллизия уже содержит нормаль — используем её (унифицируем обработку)
    if (collision.normalX !== undefined && collision.normalY !== undefined) {
      nx = collision.normalX;
      ny = collision.normalY;
    } else {
      // Иначе пытаемся восстановить нормаль из dx/dy (локальные или глобальные координаты)
      let dx = collision.dx ?? 0;
      let dy = collision.dy ?? 0;
      let distance = Math.hypot(dx, dy);
      if (distance === 0) {
        // Центр шарика совпал с ближайшей точкой — выбираем нормаль по ближайшей грани
        // Попробуем использовать геометрию wall если доступна
        if (wall && wall.width !== undefined && wall.height !== undefined) {
          const left = Math.abs(ball.x - wall.x);
          const right = Math.abs((wall.x + wall.width) - ball.x);
          const top = Math.abs(ball.y - wall.y);
          const bottom = Math.abs((wall.y + wall.height) - ball.y);
          const minEdge = Math.min(left, right, top, bottom);
          if (minEdge === left)      { nx = -1; ny = 0; }
          else if (minEdge === right){ nx = 1; ny = 0; }
          else if (minEdge === top)  { nx = 0; ny = -1; }
          else                       { nx = 0; ny = 1; }
        } else {
          // Fallback: используем направление от ближай точки по dx/dy знаку
          nx = dx === 0 ? 1 : Math.sign(dx);
          ny = dy === 0 ? 0 : Math.sign(dy);
        }
      } else {
        nx = dx / distance;
        ny = dy / distance;
      }
    }
    
    // Нормализуем нормаль на всякий случай
    const nlen = Math.hypot(nx, ny);
    if (nlen > 0) {
      nx /= nlen;
      ny /= nlen;
    }
    // ЛОГ ДО ДЕПЕНЕТРАЦИИ
    logger.logPhysics('Before depenetration', { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, nx, ny, overlap: ball.r - (collision.distance || 0) });
    // Сначала устраняем проникновение
    const overlap = Math.max(0, ball.r - (collision.distance || 0));
    if (overlap > 0) {
      const SEP_EPS = 1.0;
      ball.x += nx * (overlap + SEP_EPS);
      ball.y += ny * (overlap + SEP_EPS);
    }
    // ЛОГ ПОСЛЕ ДЕПЕНЕТРАЦИИ
    logger.logPhysics('After depenetration', { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });

    if (!ball._mayBounce) return false;

    // Проверка направления движения
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) return false;
    // ЛОГ ПЕРЕД ОТРАЖЕНИЕМ
    logger.logPhysics('Before reflect velocity', { vn, nx, ny, vx: ball.vx, vy: ball.vy });
    // Отражаем скорость
    ball.vx = ball.vx - 2 * vn * nx;
    ball.vy = ball.vy - 2 * vn * ny;
    ball._mayBounce = false;
    // ЛОГ ПОСЛЕ ОТРАЖЕНИЯ
    logger.logPhysics('After reflect velocity', { vx: ball.vx, vy: ball.vy });
    return true;
  }

  tick(){
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] tick() start. stepCount='+this.stepCount+' queueLen='+this._eventQueue.length+' balls='+this.balls.length);
    const dt = this.dt;
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Tick start', {time: this.time, eventQueueLen: this._eventQueue.length, step: this.stepCount});
    let remaining = dt;
    const EPS = 1e-6;
    // --- SUB-STEPPING для защиты от tunneling ---
    const maxSubStep = (this.balls[0]?.r||8) / 3; // 1/3 радиуса первого шара или 8
    while (remaining > 0) {
      const next = this._peekNextEvent();
      const targetTime = this.time + remaining;
      const nextTime = next ? next.time : Infinity;
      let advanceTo = Math.min(targetTime, nextTime);
      let advanceDt = Math.max(0, advanceTo - this.time);
      // Разбиваем шаг, если слишком длинный
      if (advanceDt > maxSubStep) {
        advanceDt = maxSubStep;
        advanceTo = this.time + advanceDt;
        if (this.debug || window.PHYS_DEBUG) logger.logDebug('Substep enforced', {advanceDt, advanceTo, maxSubStep});
      }
      if (advanceDt > 0) {
        for (const b of this.balls) { b.x += b.vx * advanceDt; b.y += b.vy * advanceDt; }
        this.time += advanceDt;
        remaining -= advanceDt;
      }
      // --- остальной обработчик tick ---
      // Если событие наступило в этом окне — обработаем его
      if (next && next.time - this.time <= EPS) {
        this._popNextEvent();
        // Проверим валидность по версиям
        if (!this._isEventValid(next)) { continue; }
        if (next.type === 'bound') {
          const bi = next.aIndex; const b = this.balls[bi];
          if (!b) { continue; }
          // Отражение от границ с использованием формулы отражения v' = v - 2(v·n)n
          const { x, y, width, height } = this.bounds;
          const SEP_EPS = 0.01;
          if (next.axis === 'x') {
            // Определяем нормаль по направлению скорости
            const nx = b.vx < 0 ? 1 : -1;
            const vn = b.vx * nx;
            b.vx = b.vx - 2 * vn * nx;
            // Кламп с небольшим сдвигом для депенетрации
            const minX = x + b.r + SEP_EPS;
            const maxX = x + width - b.r - SEP_EPS;
            b.x = Math.max(minX, Math.min(maxX, b.x));
            this.emit({kind:'wall', ball:b.id, axis:'x', t:this.time});
          } else {
            const ny = b.vy < 0 ? 1 : -1;
            const vn = b.vy * ny;
            b.vy = b.vy - 2 * vn * ny;
            const minY = y + b.r + SEP_EPS;
            const maxY = y + height - b.r - SEP_EPS;
            b.y = Math.max(minY, Math.min(maxY, b.y));
            this.emit({kind:'wall', ball:b.id, axis:'y', t:this.time});
          }
          this._bumpVersion(bi);
          this._scheduleForBall(bi, true);
        } else if (next.type === 'ball-ball') {
          const ai = next.aIndex, bi = next.bIndex; const a = this.balls[ai], b = this.balls[bi];
          if (!a || !b) { continue; }
          // Упругое столкновение двух шаров
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist, ny = dy / dist;
          // Позиционная коррекция при остаточном пересечении
          const desired = a.r + b.r;
          const overlap = desired - dist;
          if (overlap > 0) {
            const corr = (overlap + 1e-4) * 0.5;
            a.x -= nx * corr; a.y -= ny * corr;
            b.x += nx * corr; b.y += ny * corr;
          }
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const vn = rvx*nx + rvy*ny;
          if (vn < 0) {
            const m1 = a.m, m2 = b.m;
              const impulse = (2*vn)/(m1+m2);
              a.vx += impulse*m2*nx; a.vy += impulse*m2*ny;
              b.vx -= impulse*m1*nx; b.vy -= impulse*m1*ny;
              this.emit({kind:'ball', a:a.id, b:b.id, t:this.time});
            }
          this._bumpVersion(ai); this._bumpVersion(bi);
          this._scheduleForBall(ai, true); this._scheduleForBall(bi, true);
        } else if (next.type === 'wall') {
          const bi = next.aIndex;
          const b = this.balls[bi];
          const wall = this.logic.sceneObjects[next.objIndex];
          if (!b || !wall) { continue; }
          // Сильная депенетрация: вычисляем фактическое перекрытие и выталкиваем наружу
          const cx = wall.x + wall.width / 2, cy = wall.y + wall.height / 2;
          const angle = -(wall.rotation || 0);
          const cosLw = Math.cos(angle), sinLw = Math.sin(angle);
          const xp = (b.x - cx) * cosLw - (b.y - cy) * sinLw;
          const yp = (b.x - cx) * sinLw + (b.y - cy) * cosLw;
          const halfW = wall.width / 2, halfH = wall.height / 2;
          const closestX = Math.max(-halfW, Math.min(xp, halfW));
          const closestY = Math.max(-halfH, Math.min(yp, halfH));
          const dx = xp - closestX, dy = yp - closestY;
          let dist = Math.hypot(dx, dy);
          let nx = next.normX, ny = next.normY;
          if (dist > 1e-9) {
            // нормаль по направлению из ближайшей точки к центру шара
            const nlx = dx / dist, nly = dy / dist;
            const cosWw = Math.cos(wall.rotation || 0), sinWw = Math.sin(wall.rotation || 0);
            nx = nlx * cosWw - nly * sinWw;
            ny = nlx * sinWw + nly * cosWw;
          }
          // нормализация
          const nlen = Math.hypot(nx, ny) || 1;
          nx /= nlen; ny /= nlen;
          const overlap = Math.max(0, b.r - (dist || 0));
          if (overlap > 0) {
            const SEP_EPS = 0.75;
            b.x += nx * (overlap + SEP_EPS);
            b.y += ny * (overlap + SEP_EPS);
          } else {
            // небольшой вынос на случай численной погрешности
            const SEP_EPS = 0.25;
            b.x += nx * SEP_EPS;
            b.y += ny * SEP_EPS;
          }
          // Отражение только если движемся внутрь
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx = b.vx - 2 * vn * nx;
            b.vy = b.vy - 2 * vn * ny;
          }
          // --- Внутри обработки wall event ---
          // После вычисления overlap/nx/ny и обычной депенетрации:
          const cx_force = wall.x + wall.width / 2, cy_force = wall.y + wall.height / 2;
          const angle_force = -(wall.rotation || 0);
          const cosL_force = Math.cos(angle_force), sinL_force = Math.sin(angle_force);
          const xp_force = (b.x - cx_force) * cosL_force - (b.y - cy_force) * sinL_force;
          const yp_force = (b.x - cx_force) * sinL_force + (b.y - cy_force) * cosL_force;
          const halfW_force = wall.width / 2, halfH_force = wall.height / 2;
          const closestX_force = Math.max(-halfW_force, Math.min(xp_force, halfW_force));
          const closestY_force = Math.max(-halfH_force, Math.min(yp_force, halfH_force));
          const dx_force = xp_force - closestX_force, dy_force = yp_force - closestY_force;
          const dist_force = Math.hypot(dx_force, dy_force);
          if (dist_force < (b.r - 1e-4)) {
            if (this.debug || window.PHYS_DEBUG) logger.logDebug('FORCE depenetration (still inside wall after bounce)', {bId: b.id, wallId: wall.id, dist_force, r: b.r, dx_force, dy_force, pos: {x: b.x, y: b.y}});
            let nlx_force = dx_force / (dist_force || 1), nly_force = dy_force / (dist_force || 1);
            const cosW_force = Math.cos(wall.rotation || 0), sinW_force = Math.sin(wall.rotation || 0);
            let nx2_force = nlx_force * cosW_force - nly_force * sinW_force, ny2_force = nlx_force * sinW_force + nly_force * cosW_force;
            const nlen2_force = Math.hypot(nx2_force, ny2_force) || 1;
            nx2_force /= nlen2_force; ny2_force /= nlen2_force;
            const overlap2_force = b.r - (dist_force || 0) + 1e-3;
            b.x += nx2_force * overlap2_force;
            b.y += ny2_force * overlap2_force;
            if (this.debug || window.PHYS_DEBUG) logger.logDebug('AFTER force depenetration', {bId: b.id, nx2_force, ny2_force, overlap2_force, newX: b.x, newY: b.y});
          }
          this.emit({kind:'sceneObject', ball: b.id, object: wall.id, type: 'wall_bounce', t: this.time});
          this._bumpVersion(bi);
          this._scheduleForBall(bi, true);
          continue;
        } else if (next.type === 'output') {
          const bi = next.aIndex;
          const b = this.balls[bi];
          const output = this.logic.sceneObjects[next.objIndex];
          if (!b || !output) { continue; }
          // Перемещаем шарик в центр выхода и останавливаем
          const centerX = output.x + output.width / 2;
          const centerY = output.y + output.height / 2;
          b.x = centerX;
          b.y = centerY;
          b.vx = 0;
          b.vy = 0;
          b.glow = true;
          b.glowStartTime = this.time;
          b.removeAt = this.time + 6;
          this.emit({
            kind: 'sceneObject',
            ball: b.id,
            object: output.id,
            type: 'output_capture',
            objectLabel: output.data?.label,
            t: this.time
          });
          this._bumpVersion(bi);
          this._scheduleForBall(bi, true);
          continue;
        } else if (next.type === 'input') {
          const bi = next.aIndex;
          const b = this.balls[bi];
          const input = this.logic.sceneObjects[next.objIndex];
          if (!b || !input) { continue; }
          // Эмитим событие входа ТОЛЬКО при первом заходе (edge-triggered)
          if (b._currentInputId !== input.id) {
            b._currentInputId = input.id;
            this.emit({
              kind: 'sceneObject',
              ball: b.id,
              object: input.id,
              type: 'input_pass',
              objectLabel: input.data?.label,
              t: this.time
            });
          }
          this._bumpVersion(bi);
          this._scheduleForBall(bi, true);
          continue;
        }
        // Живых проверок сцен-объектов нет в детерминированной модели; все взаимодействия идут через очередь событий
      } else {
        // Нет событий в интервале — выйдем
        break;
      }
    }
    // Удаляем шары, у которых истек таймер removeAt
    if (this.balls.length){
      const before = this.balls.length;
      this.balls = this.balls.filter(b => !(b.removeAt !== null && this.time >= b.removeAt));
      const removed = before - this.balls.length;
      if (removed > 0){
        // logger.logPhysics('Balls removed after output timeout', { removed, time: this.time });
        // После удаления индексы изменились — перестроим версии и очередь событий
        this._ballVersion = this.balls.map(()=>0);
        this._rebuildEventQueue();
      }
    }
    this.stepCount++;
    // Поддерживаем свежесть очереди при длительных интервалах между событиями
    if (!this._eventQueue.length || (this._eventQueue[0].time - this.time) > 0.25) {
      this._heapify();
    }
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] tick() end. stepCount='+this.stepCount+' queueLen='+this._eventQueue.length+' balls='+this.balls.length);
  }

  run(onFrame){
    if (!this.running) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] run(): запуск симуляции. stepCount='+this.stepCount+' balls='+this.balls.length);
    }
    if (this.running) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] run(): уже работает. stepCount='+this.stepCount);
      return;
    }
    this.running = true;
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] run(): running стал true. stepCount='+this.stepCount);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Physics simulation started', {
      speedScale: this.speedScale,
      dt: this.dt,
      ballsCount: this.balls.length
    });
    // logger.logPhysics('Physics simulation started', {
    //   speedScale: this.speedScale,
    //   dt: this.dt,
    //   ballsCount: this.balls.length
    // });
    
    // Перестраиваем очередь событий на старте
    this._rebuildEventQueue();
    let last = performance.now(); let fpsTimer = 0; let frames = 0;
    const loop = (now)=>{
      if (!this.running) {
        if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] loop(): принудительный выход по running=false. stepCount='+this.stepCount);
        return;
      }
      try {
        if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] loop() start. time='+this.time+' stepCount='+this.stepCount);
        const realDt = Math.min(0.1, (now - last)/1000); last = now;
        this._accum += realDt * this.speedScale;
        if (this.debug || window.PHYS_DEBUG) logger.logDebug('Animation frame', {realDt, accum: this._accum, loopTime: now});
        while (this._accum >= this.dt){
          if (this.debug || window.PHYS_DEBUG) logger.logDebug('Tick loop', {accum: this._accum, dt: this.dt});
          this.tick(); this._accum -= this.dt;
        }
        frames++; fpsTimer += realDt; if (fpsTimer >= 0.5){ try { onFrame?.({fps: Math.round(frames/fpsTimer)}); } catch(e){ logger.logError(e, { where: 'onFrame(fps)' }); } fpsTimer=0; frames=0; }
        try { onFrame?.({}); } catch(e){ logger.logError(e, { where: 'onFrame(update)' }); }
        if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] loop() end. time='+this.time+' stepCount='+this.stepCount+' running='+this.running);
      } catch (e) {
        logger.logError(e, { where: 'PhysicsEngine.loop' });
      } finally {
        if (this.running) this._raf = requestAnimationFrame(loop);
      }
    };
    // Немедленно выполнить один шаг цикла для мгновенного старта
    loop.call(this, performance.now());
    // Продолжить цикл через requestAnimationFrame с сохранением контекста
    this._raf = requestAnimationFrame((now)=>loop.call(this, now));
  }
  pause(){
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('[DEBUG INVESTIGATION] pause(): ставим running в false (stepCount='+this.stepCount+')');
    if (this.running) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('Physics simulation paused', {finalTime: this.time, stepCount: this.stepCount});
      // logger.logPhysics('Physics simulation paused', {
      //   finalTime: this.time,
      //   finalStepCount: this.stepCount
      // });
    }
    this.running = false; 
    if (this._raf) cancelAnimationFrame(this._raf); 
  }
}
window.PhysicsEngine = PhysicsEngine;

// ======= Служебные методы планирования событий =======
PhysicsEngine.prototype._rebuildEventQueue = function(){
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Rebuilding event queue', {ballCount: this.balls.length, eventQueueLen: this._eventQueue.length, ballVersions: this._ballVersion});
  this._eventQueue.length = 0;
  // Обновить версии на случай несоответствий длины
  if (this._ballVersion.length !== this.balls.length) {
    this._ballVersion = this.balls.map(()=>0);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Ball versions array resized', {ballVersions: this._ballVersion});
  }
  for (let i=0;i<this.balls.length;i++){
    this._scheduleForBall(i, false);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Scheduled events for ball', {i, ball: this.balls[i]});
  }
  this._heapify();
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Event queue after rebuild', {eventQueue: [...this._eventQueue]});
};

// === Новый универсальный расчет столкновения шара с прямоугольником (wall/output/input) ===
PhysicsEngine.prototype._computeBallRectCollisionEvent = function(ballIndex, obj, objIndex) {
  const ball = this.balls[ballIndex];
  if (!ball || (ball.vx === 0 && ball.vy === 0)) return null;
  // DEBUG - исходное состояние
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION start', {ballIndex, objIndex, bx: ball.x, by: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r, wall: {x: obj.x, y: obj.y, w: obj.width, h: obj.height, angle: obj.rotation}});
  const cx = obj.x + obj.width / 2, cy = obj.y + obj.height / 2;
  const angle = -(obj.rotation || 0);
  const cosL = Math.cos(angle), sinL = Math.sin(angle);
  const xp = (ball.x - cx) * cosL - (ball.y - cy) * sinL;
  const yp = (ball.x - cx) * sinL + (ball.y - cy) * cosL;
  const vxp = ball.vx * cosL - ball.vy * sinL;
  const vyp = ball.vx * sinL + ball.vy * cosL;
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION local coords', {xp, yp, vxp, vyp, angle, cos: cosL, sin: sinL});
  const halfW = obj.width / 2;
  const halfH = obj.height / 2;
  const r = ball.r;

  let minT = Infinity;
  let normalLocal = null;

  // Сначала проверяем реально ли уже внутри (мгновенная коллизия)
  {
    const closestX = Math.max(-halfW, Math.min(xp, halfW));
    const closestY = Math.max(-halfH, Math.min(yp, halfH));
    const dx = xp - closestX;
    const dy = yp - closestY;
    const dist = Math.hypot(dx, dy);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION closest/local', {closestX, closestY, dx, dy, dist, halfW, halfH});
    // Требуем заметного перекрытия, чтобы избежать ложных срабатываний, и движение внутрь
    if (dist < r - 0.25) {
      let nlx, nly;
      // Пропускаем повторные input-события, если уже внутри этого входа
      if (!(obj.type === 'input' && ball._currentInputId === obj.id)) {
        if (dist === 0) {
          // выбрать нормаль по ближайшей стороне
          const distLeft = Math.abs(xp - (-halfW));
          const distRight = Math.abs(halfW - xp);
          const distTop = Math.abs(yp - (-halfH));
          const distBottom = Math.abs(halfH - yp);
          const minEdge = Math.min(distLeft, distRight, distTop, distBottom);
          if (minEdge === distLeft)      { nlx = -1; nly = 0; }
          else if (minEdge === distRight){ nlx =  1; nly = 0; }
          else if (minEdge === distTop)  { nlx =  0; nly = -1; }
          else                           { nlx =  0; nly =  1; }
        } else {
          nlx = dx / (dist || 1); nly = dy / (dist || 1);
        }
        const normX = nlx * cosL - nly * sinL;
        const normY = nlx * sinL + nly * cosL;
        // Только если движемся внутрь поверхности
        const vn = ball.vx * normX + ball.vy * normY;
        if (vn < 0) {
          return {
            time: this.time + 1e-9,
            type: obj.type,
            aIndex: ballIndex,
            objIndex,
            vA: this._ballVersion[ballIndex],
            normX, normY
          };
        }
      }
    }
  }

  // Проверка столкновений со сторонами (учёт радиуса через сдвиг плоскостей на r)
  // Вертикальные стороны: x = -halfW - r и x = +halfW + r, при |y(t)| <= halfH + eps
  const EPS_PROJ = 1e-3;
  if (vxp !== 0) {
    const txL = ((-halfW - r) - xp) / vxp;
    const yL = yp + vyp * txL;
    if (txL > 1e-9 && Math.abs(yL) <= (halfH + EPS_PROJ)) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION vertical sides', {vxp, txL: ((-halfW - r) - xp) / vxp, txR: ((halfW + r) - xp) / vxp});
      if (txL < minT) { minT = txL; normalLocal = {x:-1, y:0}; }
    }
    const txR = ((halfW + r) - xp) / vxp;
    const yR = yp + vyp * txR;
    if (txR > 1e-9 && Math.abs(yR) <= (halfH + EPS_PROJ)) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION vertical sides', {vxp, txL: ((-halfW - r) - xp) / vxp, txR: ((halfW + r) - xp) / vxp});
      if (txR < minT) { minT = txR; normalLocal = {x:1, y:0}; }
    }
  }
  // Горизонтальные стороны: y = -halfH - r и y = +halfH + r, при |x(t)| <= halfW + eps
  if (vyp !== 0) {
    const tyT = ((-halfH - r) - yp) / vyp;
    const xT = xp + vxp * tyT;
    if (tyT > 1e-9 && Math.abs(xT) <= (halfW + EPS_PROJ)) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION horizontal sides', {vyp, tyT: ((-halfH - r) - yp) / vyp, tyB: ((halfH + r) - yp) / vyp});
      if (tyT < minT) { minT = tyT; normalLocal = {x:0, y:-1}; }
    }
    const tyB = ((halfH + r) - yp) / vyp;
    const xB = xp + vxp * tyB;
    if (tyB > 1e-9 && Math.abs(xB) <= (halfW + EPS_PROJ)) {
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION horizontal sides', {vyp, tyT: ((-halfH - r) - yp) / vyp, tyB: ((halfH + r) - yp) / vyp});
      if (tyB < minT) { minT = tyB; normalLocal = {x:0, y:1}; }
    }
  }

  // Проверка столкновений с углами (четыре четверть-круга радиуса r вокруг углов прямоугольника)
  const testCorner = (cxLocal, cyLocal) => {
    const dx0 = xp - cxLocal;
    const dy0 = yp - cyLocal;
    const A = vxp*vxp + vyp*vyp;
    const B = 2*(dx0*vxp + dy0*vyp);
    const C = dx0*dx0 + dy0*dy0 - r*r;
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION testCorner', {cxLocal, cyLocal});
    if (A <= 1e-12) return; // нет относительного движения
    const disc = B*B - 4*A*C;
    if (disc < 0) return;
    const sqrtD = Math.sqrt(disc);
    const t1 = (-B - sqrtD) / (2*A);
    const t2 = (-B + sqrtD) / (2*A);
    const t = t1 > 1e-9 ? t1 : (t2 > 1e-9 ? t2 : null);
    if (t === null) return;
    if (t < minT) {
      minT = t;
      const xct = xp + vxp * t - cxLocal;
      const yct = yp + vyp * t - cyLocal;
      const len = Math.hypot(xct, yct) || 1;
      normalLocal = { x: xct/len, y: yct/len };
    }
  };

  testCorner(-halfW, -halfH);
  testCorner( halfW, -halfH);
  testCorner(-halfW,  halfH);
  testCorner( halfW,  halfH);

  if (!isFinite(minT) || minT === Infinity || !normalLocal) return null;
  // Переводим нормаль обратно в глобальные координаты
  const cosW = Math.cos(obj.rotation || 0), sinW = Math.sin(obj.rotation || 0);
  const normX = normalLocal.x * cosW - normalLocal.y * sinW;
  const normY = normalLocal.x * sinW + normalLocal.y * cosW;
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('RECT_COLLISION EVENT', {minT, normalLocal, normX, normY, ballIdx: ballIndex, objIndex});
  return {
    time: this.time + minT,
    type: obj.type, // 'wall' | 'output' | 'input'
    aIndex: ballIndex,
    objIndex,
    vA: this._ballVersion[ballIndex],
    normX, normY
  };
};

PhysicsEngine.prototype._scheduleForBall = function(i, includeLower){
  const a = this.balls[i]; if (!a) return;
  // Столкновения с границами
  const boundEvent = this._computeBallBoundsEvent(i);
  if (boundEvent) this._pushEvent(boundEvent);
  // Столкновения шар-шар (только для пар i < j, чтобы избежать дубликатов)
  for (let j=i+1; j<this.balls.length; j++){
    const bbEvent = this._computeBallBallEvent(i, j);
    if (bbEvent) this._pushEvent(bbEvent);
    if (this.debug || window.PHYS_DEBUG) logger.logDebug('Scheduled ball-ball event', {i, j, event: bbEvent});
  }
  // Дополнительно: при изменении состояния шара важно пересчитать пары с индексами < i,
  // иначе события i<->j (где j<i) могут остаться только в невалидном виде после изменения j
  if (includeLower) {
    for (let j=0; j<i; j++){
      const bbEvent2 = this._computeBallBallEvent(j, i);
      if (bbEvent2) this._pushEvent(bbEvent2);
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('Scheduled ball-ball event (lower)', {i, j, event: bbEvent2});
    }
  }
  // ===== Новое: события с прямоугольниками стены/выходы =====
  if(this.logic && this.logic.sceneObjects) {
    for(let wi=0; wi<this.logic.sceneObjects.length; wi++) {
      const obj = this.logic.sceneObjects[wi];
      if(obj.type !== 'wall' && obj.type !== 'output' && obj.type !== 'input') continue;
      const rectEv = this._computeBallRectCollisionEvent(i, obj, wi);
      if (rectEv) this._pushEvent(rectEv);
      if (this.debug || window.PHYS_DEBUG) logger.logDebug('Scheduled rect collision event', {ball: i, objIndex: wi, obj, event: rectEv});
    }
  }
};

PhysicsEngine.prototype._computeBallBoundsEvent = function(i){
  const b = this.balls[i]; if (!b) return null;
  const {x,y,width,height} = this.bounds;
  let tMin = Infinity; let axis = null;
  const SEP = 0.25;
  if (b.x - b.r < x) { tMin = 1e-9; axis = 'x'; }
  if (b.x + b.r > x + width) { tMin = 1e-9; axis = 'x'; }
  if (b.y - b.r < y) { tMin = 1e-9; axis = 'y'; }
  if (b.y + b.r > y + height) { tMin = 1e-9; axis = 'y'; }
  if (b.vx < 0) { const t = (x + b.r + SEP - b.x) / b.vx; if (t > 1e-9 && t < tMin) { tMin = t; axis = 'x'; } }
  if (b.vx > 0) { const t = (x + width - b.r - SEP - b.x) / b.vx; if (t > 1e-9 && t < tMin) { tMin = t; axis = 'x'; } }
  if (b.vy < 0) { const t = (y + b.r + SEP - b.y) / b.vy; if (t > 1e-9 && t < tMin) { tMin = t; axis = 'y'; } }
  if (b.vy > 0) { const t = (y + height - b.r - SEP - b.y) / b.vy; if (t > 1e-9 && t < tMin) { tMin = t; axis = 'y'; } }
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Compute bounds event', {i, b, tMin, axis});
  if (!axis || !isFinite(tMin)) return null;
  return { time: this.time + tMin, type: 'bound', aIndex: i, axis, vA: this._ballVersion[i] };
};

PhysicsEngine.prototype._computeBallBallEvent = function(i, j){
  const a = this.balls[i], b = this.balls[j]; if (!a || !b) return null;
  const rx = b.x - a.x, ry = b.y - a.y;
  const vx = b.vx - a.vx, vy = b.vy - a.vy;
  const r = a.r + b.r;
  const A = vx*vx + vy*vy;
  const B = 2*(rx*vx + ry*vy);
  const C = rx*rx + ry*ry - r*r;
  if (A <= 1e-12) return null; // нет относительного движения
  const disc = B*B - 4*A*C;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = (-B - sqrtD) / (2*A);
  const t2 = (-B + sqrtD) / (2*A);
  let t = null;
  if (t1 > 1e-9) t = t1; else if (t2 > 1e-9) t = t2; else return null;
  return { time: this.time + t, type: 'ball-ball', aIndex: i, bIndex: j, vA: this._ballVersion[i], vB: this._ballVersion[j] };
};

PhysicsEngine.prototype._pushEvent = function(ev){
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Push event', {...ev});
  this._eventQueue.push(ev);
  // вставка без строгой кучи: дешевый heapify периодически
  if ((this._eventQueue.length & (this._eventQueue.length-1)) === 0) this._heapify();
};

PhysicsEngine.prototype._heapify = function(){
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Heapify event queue', {queueLen: this._eventQueue.length});
  // простая сортировка по времени
  this._eventQueue.sort((a,b)=> a.time - b.time);
};

PhysicsEngine.prototype._peekNextEvent = function(){
  if (!this._eventQueue.length) return null;
  return this._eventQueue[0];
};

PhysicsEngine.prototype._popNextEvent = function(){
  if (!this._eventQueue.length) return null;
  return this._eventQueue.shift();
};

PhysicsEngine.prototype._isEventValid = function(ev){
  let valid = false;
  if (ev.type === 'bound') {
    valid = ev.vA === this._ballVersion[ev.aIndex];
  }
  if (ev.type === 'ball-ball') {
    valid = ev.vA === this._ballVersion[ev.aIndex] && ev.vB === this._ballVersion[ev.bIndex];
  }
  if (ev.type === 'wall' || ev.type === 'output' || ev.type === 'input') {
    valid = ev.vA === this._ballVersion[ev.aIndex];
  }
  if (this.debug || window.PHYS_DEBUG) logger.logDebug('Event validation', {...ev, valid});
  return valid;
};

PhysicsEngine.prototype._bumpVersion = function(i){
  this._ballVersion[i] = (this._ballVersion[i]||0) + 1;
};

