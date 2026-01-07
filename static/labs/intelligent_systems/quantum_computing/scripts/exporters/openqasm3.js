// scripts/exporters/openqasm3.js
// Простой экспорт в OpenQASM 3 для базовых вентилей; U_FULL/DIFFUSER пропускаем с комментарием.
export function exportOpenQASM3(circuit) {
  const n = circuit.qubits;
  const lines = [];
  lines.push('OPENQASM 3;');
  lines.push('include "stdgates.inc";');
  lines.push(`qubit[${n}] q;`);
  lines.push(`bit[${n}] c;`);
  lines.push('');

  const emit1 = (g, q) => lines.push(`${g} q[${q}];`);
  const emitCx = (c, t) => lines.push(`cx q[${c}], q[${t}];`);

  for (const layer of circuit.layers) {
    for (const el of layer) {
      switch (el.type) {
        case 'H': emit1('h', el.targets[0]); break;
        case 'X': emit1('x', el.targets[0]); break;
        case 'Y': emit1('y', el.targets[0]); break;
        case 'Z': emit1('z', el.targets[0]); break;
        case 'S': emit1('s', el.targets[0]); break;
        case 'T': emit1('t', el.targets[0]); break;
        case 'CNOT': emitCx(el.control, el.targets[0]); break;
        case 'MEASURE':
          lines.push(`c[${el.targets[0]}] = measure q[${el.targets[0]}];`);
          break;
        case 'MEASURE-ALL':
          for (let i = 0; i < n; i++) lines.push(`c[${i}] = measure q[${i}];`);
          break;
        case 'U_FULL':
          lines.push('// U_FULL (oracle) опущен в экспорте — добавьте реализацию/макрос вручную');
          break;
        case 'DIFFUSER':
          lines.push('// DIFFUSER опущен в экспорте — добавьте реализацию/макрос вручную');
          break;
        default:
          lines.push(`// [skip] ${el.type}`);
      }
    }
    lines.push(''); // разделим слои пустой строкой
  }
  return lines.join('\n');
}
