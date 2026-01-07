// scripts/exporters/quil.js
// Экспорт в Quil (Rigetti) для базовых элементов; U_FULL/DIFFUSER опускаем с комментарием.
export function exportQuil(circuit) {
  const n = circuit.qubits;
  const lines = [];
  lines.push(`DECLARE ro BIT[${n}]`);
  lines.push('');

  const emit1 = (g, q) => lines.push(`${g.toUpperCase()} ${q}`);
  const emitCNOT = (c, t) => lines.push(`CNOT ${c} ${t}`);

  for (const layer of circuit.layers) {
    for (const el of layer) {
      switch (el.type) {
        case 'H': emit1('H', el.targets[0]); break;
        case 'X': emit1('X', el.targets[0]); break;
        case 'Y': emit1('Y', el.targets[0]); break;
        case 'Z': emit1('Z', el.targets[0]); break;
        case 'S': emit1('S', el.targets[0]); break;
        case 'T': emit1('T', el.targets[0]); break;
        case 'CNOT': emitCNOT(el.control, el.targets[0]); break;
        case 'MEASURE':
          lines.push(`MEASURE ${el.targets[0]} ro[${el.targets[0]}]`);
          break;
        case 'MEASURE-ALL':
          for (let i = 0; i < n; i++) lines.push(`MEASURE ${i} ro[${i}]`);
          break;
        case 'U_FULL':
          lines.push(`# U_FULL (oracle) пропущен в экспорте — добавьте вручную`);
          break;
        case 'DIFFUSER':
          lines.push(`# DIFFUSER пропущен в экспорте — добавьте вручную`);
          break;
        default:
          lines.push(`# [skip] ${el.type}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
