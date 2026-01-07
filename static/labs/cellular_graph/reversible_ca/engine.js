/* ====== CORE ====== */
class Grid{
  constructor(w=80,h=60){this.resize(w,h);}
  resize(w,h){this.w=(w%2===0)?w:w-1;this.h=(h%2===0)?h:h-1;this.cells=new Uint8Array(this.w*this.h);}
  idx(x,y){x=(x%this.w+this.w)%this.w;y=(y%this.h+this.h)%this.h;return y*this.w+x;}
  get(x,y){return this.cells[this.idx(x,y)];}
  set(x,y,v){this.cells[this.idx(x,y)]=v?1:0;}
  clear(){this.cells.fill(0);}
  clone(){const g=new Grid(this.w,this.h);g.cells.set(this.cells);return g;}
  hamming(other){let d=0;for(let i=0;i<this.cells.length;i++) if(this.cells[i]!==other.cells[i]) d++;return d;}
  density(){let s=0;for(let i=0;i<this.cells.length;i++) s+=this.cells[i];return s/this.cells.length;}
}
class MargolusEngine{
  constructor(grid,map16){this.grid=grid;this.setRule(map16);this.partition=0;this.stepCount=0;}
  setRule(map16){if(!Array.isArray(map16)||map16.length!==16)throw new Error('Нужна перестановка 0..15');const s=new Set(map16);if(s.size!==16||Math.min(...map16)!==0||Math.max(...map16)!==15)throw new Error('Перестановка 0..15, все уникальны');this.map16=Int8Array.from(map16);this.inv16=new Int8Array(16);for(let i=0;i<16;i++)this.inv16[this.map16[i]]=i;}
  _pack(x,y){const a=this.grid.get(x,y),b=this.grid.get(x+1,y),c=this.grid.get(x,y+1),d=this.grid.get(x+1,y+1);return (a)|(b<<1)|(c<<2)|(d<<3);}
  _unpack(x,y,b){this.grid.set(x,y,b&1);this.grid.set(x+1,y,(b>>1)&1);this.grid.set(x,y+1,(b>>2)&1);this.grid.set(x+1,y+1,(b>>3)&1);}
  _forEachBlock(p,fn){const x0=p?1:0,y0=p?1:0;for(let y=y0;y<this.grid.h;y+=2){for(let x=x0;x<this.grid.w;x+=2){fn(x,y)}}}
  stepForward(){const p=this.partition,ups=[];this._forEachBlock(p,(x,y)=>{const c=this._pack(x,y);ups.push([x,y,this.map16[c]])});for(const[u,v,b]of ups)this._unpack(u,v,b);this.partition=1-this.partition;this.stepCount++;}
  stepBackward(){this.partition=1-this.partition;const p=this.partition,ups=[];this._forEachBlock(p,(x,y)=>{const c=this._pack(x,y);ups.push([x,y,this.inv16[c]])});for(const[u,v,b]of ups)this._unpack(u,v,b);this.stepCount=Math.max(0,this.stepCount-1);}
}
function rotate180(code){const a=(code&1)?1:0,b=(code&2)?1:0,c=(code&4)?1:0,d=(code&8)?1:0;return (d)|(c<<1)|(b<<2)|(a<<3);}
function invert4(code){return (~code)&0b1111;}
function buildCritters(){const map=new Array(16);for(let code=0;code<16;code++){const ones=((code&1)+((code>>1)&1)+((code>>2)&1)+((code>>3)&1));let out=code;if(ones!==2)out=invert4(out);if(ones===3)out=rotate180(out);map[code]=out;}if(new Set(map).size!==16)throw new Error('Critters не биективно');return map;}
const ROTATIONS=[0,2,8,12,1,10,9,11,4,6,5,14,3,7,13,15];
const IDENTITY=Array.from({length:16},(_,i)=>i);

/* ====== Renderer (обычный и дифф) ====== */
class Renderer{
  constructor(canvas,grid,scale=8){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.grid=grid;this.scale=scale;this._resize();}
  setScale(s){this.scale=s;this._resize();}
  _resize(){this.canvas.width=this.grid.w*this.scale;this.canvas.height=this.grid.h*this.scale;}
  drawNormal(){
    const ctx=this.ctx,g=this.grid,s=this.scale;
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--canvas').trim()||'#000';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--cell').trim()||'#9ee';
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++) if(g.get(x,y)) ctx.fillRect(x*s,y*s,s,s);
  }
  drawDiff(snapshot){
    const ctx=this.ctx,g=this.grid,s=this.scale;
    const bg=getComputedStyle(document.body).getPropertyValue('--canvas').trim()||'#000';
    const cx=getComputedStyle(document.body).getPropertyValue('--context').trim()||'#5a6272';
    const df=getComputedStyle(document.body).getPropertyValue('--diff').trim()||'#ff6b6b';
    ctx.fillStyle=bg; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    // контекст — текущее поле серым
    ctx.fillStyle=cx;
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++) if(g.get(x,y)) ctx.fillRect(x*s,y*s,s,s);
    // отличия — красным
    ctx.fillStyle=df;
    for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++) if(g.get(x,y)!==snapshot.get(x,y)) ctx.fillRect(x*s,y*s,s,s);
  }
}