import { ThemeManager } from './ui/theme.js';
import { UIController } from './ui/uiController.js';
import { Simulator } from './core/simulator.js';
import { Renderer } from './render/renderer.js';

const canvas = document.getElementById('viewport');
const themeSelect = document.getElementById('themeSelect');

const theme = new ThemeManager('dark');
theme.applyToDocument();
theme.bindSelect(themeSelect);

const sim = new Simulator();
const renderer = new Renderer(canvas);

const ui = new UIController({ sim, renderer, theme });
ui.init();
