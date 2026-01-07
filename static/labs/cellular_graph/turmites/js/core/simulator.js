import { Grid } from './grid.js';
import { RuleSet } from './ruleset.js';
import { Ant } from './ant.js';

export class Simulator{
  constructor(){
    this.running = false;
    this.speed = 10;
    this._accum = 0;
    this.steps = 0;
    this._timeMs = 0;

    this.maxAnts = 16;
    this.antPalette = [
      '#ffcc00','#ff6a6a','#6aa9ff','#5fd38d',
      '#f78fb3','#ffd866','#9aedfe','#a879ff',
      '#ffa600','#00d2ff','#ff4d4d','#4dff88',
      '#c792ea','#82aaff','#ffcb6b','#7fdbca'
    ];

    this.configure({ width: 120, height: 80, rule: 'RL', ants: 1 });
  }

  // ВАЖНО: поддержка spawn (авто-спавн из пресета)
  configure({ width, height, rule, ants, spawn = [] }){
    this.width = width|0;
    this.height = height|0;
    this.rules = new RuleSet(rule);
    this.ruleString = this.rules.ruleString;
    this.grid = new Grid(this.width, this.height, this.rules.states);

    // Инициализация муравьёв
    this.ants = [];
    const cx = Math.floor(this.width/2);
    const cy = Math.floor(this.height/2);

    if (Array.isArray(spawn) && spawn.length){
      const count = Math.min(this.maxAnts, spawn.length);
      for (let i=0;i<count;i++){
        const s = spawn[i];
        const color = this.antPalette[i % this.antPalette.length];
        const x = cx + (s.dx|0);
        const y = cy + (s.dy|0);
        const dir = (s.dir|0) % 4;
        this.ants.push(new Ant(x, y, dir, color));
      }
    } else {
      const count = Math.max(1, Math.min(this.maxAnts, ants|0));
      for (let i=0;i<count;i++){
        const dx = (i % 5) - 2;
        const dy = Math.floor(i/5) - 1;
        const color = this.antPalette[i % this.antPalette.length];
        this.ants.push(new Ant(cx+dx, cy+dy, 0, color));
      }
    }

    this.steps = 0;
    this._timeMs = 0;
    this._accum = 0;
  }

  get antsCount(){ return this.ants.length; }
  setSpeed(stepsPerSecond){ this.speed = Math.max(1, stepsPerSecond|0); }
  start(){ if(this.running) return; this.running = true; }
  stop(){ if(!this.running) return; this.running = false; }

  step(){
    for (const ant of this.ants){ ant.step(this.grid, this.rules); }
    this.steps += 1;
    return true;
  }

  update(dt){
    if(!this.running) return;
    this._accum += dt;
    this._timeMs += dt * 1000;
    const stepInterval = 1 / this.speed;
    while(this._accum >= stepInterval){
      this.step();
      this._accum -= stepInterval;
    }
  }

  formattedTime(){
    const totalSec = Math.floor(this._timeMs / 1000);
    const mm = String(Math.floor(totalSec/60)).padStart(2,'0');
    const ss = String(totalSec%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }

  snapshot(){
    return {
      grid: this.grid.snapshot(),
      ants: this.ants.map(a=>({x:a.x, y:a.y, dir:a.dir, color:a.color}))
    };
  }

  addAntAt(x,y){
    if(this.ants.length >= this.maxAnts) return false;
    const color = this.antPalette[this.ants.length % this.antPalette.length];
    this.ants.push(new Ant(x,y,0,color));
    return true;
  }

  removeAntAt(x,y){
    for (let i=0;i<this.ants.length;i++){
      const a = this.ants[i];
      if(a.x === x && a.y === y){
        this.ants.splice(i,1);
        return true;
      }
    }
    return false;
  }
}
