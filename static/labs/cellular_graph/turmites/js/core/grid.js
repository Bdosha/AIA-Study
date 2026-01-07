export class Grid{
  constructor(width, height, states=2){
    this.width = width|0;
    this.height = height|0;
    this.states = Math.max(2, states|0);
    this.cells = new Uint8Array(this.width * this.height);
  }
  index(x, y){
    x = (x % this.width + this.width) % this.width;
    y = (y % this.height + this.height) % this.height;
    return y * this.width + x;
  }
  get(x, y){ return this.cells[this.index(x,y)]; }
  set(x, y, v){ this.cells[this.index(x,y)] = v % this.states; }
  clear(){ this.cells.fill(0); }
  snapshot(){ return { width:this.width, height:this.height, cells:this.cells, states:this.states }; }
}
