/*
 * Класс DataManager — отвечает за импорт и экспорт данных.
 * Поддерживает форматы JSON и CSV, а также загрузку файлов пользователем.
 */
export class DataManager {
  /* Экспортирует объект в JSON-файл. */
  exportJSON(obj, name) {
    if (!obj) return;
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    this.download(blob, name);
  }

  /* Экспортирует битовую последовательность в CSV-файл. */
  exportCSV(bits, name) {
    if (!Array.isArray(bits) || bits.length === 0) return;
    const csv = bits.map((b) => b.toString()).join("\n");
    this.download(new Blob([csv], { type: "text/csv" }), name);
  }

  /* Импортирует JSON-файл пользователя. */
  async importJSON() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(JSON.parse(reader.result));
          } catch {
            resolve(null);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  /* Создаёт временную ссылку и инициирует загрузку файла. */
  download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }
}
