/* Таблица трассировки метода подмножеств */
export class SubsetTable {
  constructor(tableEl) { this.tableEl = tableEl; this.i = 0; }
  clear() { this.tableEl.querySelector("tbody").innerHTML = ""; this.i = 0; }
  addRow(I, sym, J) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${++this.i}</td><td>{${[...I].join(",")}}</td><td>${sym}</td><td>{${[...J].join(",")}}</td>`;
    this.tableEl.querySelector("tbody").appendChild(tr);
  }
}