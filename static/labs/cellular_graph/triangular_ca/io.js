// Импорт/экспорт и шаринг состояния

export const IO = {
	/**
	 * Экспортирует текущее состояние в JSON-строку.
	 * @param {{grid:{w:number,h:number,wrapMode:string}, buffer:Uint8Array, meta:any}} param0
	 */
	exportJSON({ grid, buffer, meta }) {
		const payload = {
			grid: { w: grid.w, h: grid.h, wrapMode: grid.wrapMode },
			buffer: Array.from(buffer),
			meta
		};
		return JSON.stringify(payload);
	},
	/**
	 * Импортирует состояние из JSON-строки.
	 * @throws {Error} при неверном формате
	 * @returns {{gridParams:{w:number,h:number,wrapMode:string}, buffer:Uint8Array, meta:any}}
	 */
	importJSON(text) {
		let data;
		try { data = JSON.parse(text); } catch (e) { throw new Error('Неверный JSON'); }
		if (!data || !data.grid || !data.buffer || !Array.isArray(data.buffer)) throw new Error('Отсутствуют обязательные поля');
		const { w, h, wrapMode } = data.grid;
		if (!(Number.isInteger(w) && w > 0 && Number.isInteger(h) && h > 0)) throw new Error('Некорректные размеры решётки');
		const buf = new Uint8Array(data.buffer.map(v => (v ? 1 : 0)));
		if (buf.length !== w * h) throw new Error('Длина буфера не совпадает с размерами');
		return { gridParams: { w, h, wrapMode: wrapMode || 'toroidal' }, buffer: buf, meta: data.meta || {} };
	},
	/**
	 * Кодирует JSON в location.hash и возвращает итоговую ссылку.
	 * @param {string} jsonText
	 * @returns {string}
	 */
	shareToHash(jsonText) {
		const code = btoa(unescape(encodeURIComponent(jsonText)));
		location.hash = code;
		return location.href;
	},
	/**
	 * Пытается восстановить состояние из location.hash.
	 * @returns {ReturnType<IO['importJSON']>|null}
	 */
	tryImportFromHash() {
		const hash = location.hash.replace(/^#/, '');
		if (!hash) return null;
		try {
			const json = decodeURIComponent(escape(atob(hash)));
			return this.importJSON(json);
		} catch (e) {
			console.warn('Не удалось распарсить hash:', e);
			return null;
		}
	}
};
