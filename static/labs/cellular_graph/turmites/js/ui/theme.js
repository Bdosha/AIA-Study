export class ThemeManager{
  constructor(defaultTheme='dark'){
    this.key = 'turmites_theme';
    const saved = localStorage.getItem(this.key);
    this.theme = (saved === 'dark' || saved === 'light') ? saved : defaultTheme;
  }
  setTheme(t){ if(t!=='dark'&&t!=='light')return; this.theme=t; localStorage.setItem(this.key,t); this.applyToDocument(); }
  toggle(){ this.setTheme(this.theme==='dark'?'light':'dark'); }
  applyToDocument(){ document.body.setAttribute('data-theme', this.theme); }
  bindSelect(selectEl){ if(!selectEl) return; selectEl.value=this.theme; selectEl.addEventListener('change', ()=> this.setTheme(selectEl.value)); }
}
