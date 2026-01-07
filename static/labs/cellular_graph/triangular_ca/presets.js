// Пресеты начальной конфигурации поля

/** Список предустановленных конфигураций поля. */
export const PRESETS = [
	{ name: 'Random 30', w: 100, h: 80, kernel: 'edge-3', ruleDSL: 'B3/S23', seed: 'random', p: 0.30 },
	{ name: 'Random 45', w: 100, h: 80, kernel: 'moore-12', ruleDSL: 'B3/S23', seed: 'random', p: 0.45 },
	{ name: 'Lines', w: 100, h: 80, kernel: 'edge-3', ruleDSL: 'B3/S23', seed: 'lines' },
	{ name: 'Triangles', w: 100, h: 80, kernel: 'edge-3', ruleDSL: 'B3/S0123', seed: 'triangles' },
	{ name: 'Учебный 20×20', w: 20, h: 20, kernel: 'edge-3', ruleDSL: 'B3/S23', seed: 'pattern', pattern: [ [10,10], [10,11], [11,10], [12,12] ] }
];

/**
 * Заполняет буфер состояния по выбранному пресету.
 * @param {{seed:string, p?:number, pattern?:number[][]}} preset
 * @param {import('./grid-tri').TriGrid} grid
 * @param {Uint8Array} buffer
 */
export function seedBuffer(preset, grid, buffer) {
	buffer.fill(0);
	switch (preset.seed) {
		case 'random': {
			const p = preset.p ?? 0.3;
			for (let i = 0; i < buffer.length; i++) buffer[i] = Math.random() < p ? 1 : 0;
			break;
		}
		case 'lines': {
			for (let r = 0; r < grid.h; r++) {
				const on = (r % 3) === 0;
				for (let c = 0; c < grid.w; c++) buffer[r * grid.w + c] = on ? 1 : 0;
			}
			break;
		}
		case 'triangles': {
			for (let r = 0; r < grid.h; r++) {
				for (let c = 0; c < grid.w; c++) {
					const orientUp = ((r + c) & 1) === 0;
					buffer[r * grid.w + c] = orientUp && ((r + c) % 4 === 0) ? 1 : 0;
				}
			}
			break;
		}
		case 'pattern': {
			for (const [r, c] of preset.pattern || []) {
				if (r >= 0 && r < grid.h && c >= 0 && c < grid.w) buffer[r * grid.w + c] = 1;
			}
			break;
		}
	}
}
