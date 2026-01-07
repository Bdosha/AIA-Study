// scripts/ui/components/blochView.js
// Сфера Блоха с подписями осей (+X/−X, +Y/−Y, +Z/−Z) и метками X, Y, Z.
// Совместимо со старым кодом: экспортируется drawBlochSphere(canvas, v).

export function drawBlochSphere(canvas, v = { x: 0, y: 0, z: 1 }) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Размеры канваса берём как есть (как у тебя было)
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.42;

  // Фон
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, W, H);

  // ---- Сфера и сетка ----
  // внешняя окружность
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // экватор (видимая + скрытая часть пунктиром)
  ctx.setLineDash([]);
  ctx.beginPath();
  ellipse(ctx, cx, cy, R, R * 0.35);
  ctx.stroke();

  // лёгкая «долгота»/«широта» для объёма
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (const a of [-Math.PI / 4, Math.PI / 4]) {
    ctx.beginPath();
    ellipseRot(ctx, cx, cy, R, R * 0.35, a);
    ctx.stroke();
  }
  for (const f of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ellipse(ctx, cx, cy, R, R * Math.cos(Math.asin(f)));
    ctx.stroke();
  }

  // ---- Оси ----
  // Z (вертикальная)
  ctx.strokeStyle = 'rgba(34,139,34,0.9)'; // зелёная
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  line(ctx, cx, cy + R, cx, cy - R);
  arrow(ctx, cx, cy, cx, cy - R, 'rgba(34,139,34,0.9)');
  arrow(ctx, cx, cy, cx, cy + R, 'rgba(34,139,34,0.6)');

  // X (горизонтальная)
  ctx.strokeStyle = 'rgba(220,20,60,0.9)'; // красная
  line(ctx, cx - R, cy, cx + R, cy);
  arrow(ctx, cx, cy, cx + R, cy, 'rgba(220,20,60,0.9)');
  arrow(ctx, cx, cy, cx - R, cy, 'rgba(220,20,60,0.6)');

  // Y (наклонённая «в глубину»)
  ctx.strokeStyle = 'rgba(30,144,255,0.9)'; // синяя
  const ydx = R * 0.75, ydy = R * 0.35;
  line(ctx, cx - ydx, cy + ydy, cx + ydx, cy - ydy);
  arrow(ctx, cx, cy, cx + ydx, cy - ydy, 'rgba(30,144,255,0.9)');
  arrow(ctx, cx, cy, cx - ydx, cy + ydy, 'rgba(30,144,255,0.6)');

  // ---- Подписи осей ----
  ctx.save();
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0.5;
  ctx.shadowOffsetY = 0.5;

  // X подписи
  ctx.fillStyle = 'rgba(220,20,60,0.95)';
  ctx.fillText('+X', cx + R + 12, cy);
  ctx.fillStyle = 'rgba(220,20,60,0.7)';
  ctx.fillText('−X', cx - R - 12, cy);

  // Y подписи
  ctx.fillStyle = 'rgba(30,144,255,0.95)';
  ctx.fillText('+Y', cx + ydx + 14, cy - ydy);
  ctx.fillStyle = 'rgba(30,144,255,0.7)';
  ctx.fillText('−Y', cx - ydx - 14, cy + ydy);

  // Z подписи
  ctx.fillStyle = 'rgba(34,139,34,0.95)';
  ctx.fillText('+Z', cx, cy - R - 12);
  ctx.fillStyle = 'rgba(34,139,34,0.7)';
  ctx.fillText('−Z', cx, cy + R + 12);

  // центральные метки X/Y/Z
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = 'bold 13px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('X', cx + R * 0.55, cy + 14);
  ctx.fillText('Y', cx - 10, cy - R * 0.35 - 10);
  ctx.fillText('Z', cx + 10, cy - R * 0.55 - 4);
  ctx.restore();

  // ---- Вектор состояния ----
  // проекция 3D->2D (упрощённая: y даёт вертикальный сдвиг вниз)
  const end = projectVector(v, R, cx, cy);
  ctx.strokeStyle = '#e6f3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.fillStyle = '#e6f3ff';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // пунктир до проекции на XZ
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  const pXZ = { x: cx + (v.x * R), y: cy - (v.z * R) };
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(pXZ.x, pXZ.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/* ===== helpers ===== */

function ellipse(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.restore();
  ctx.stroke();
}

function ellipseRot(ctx, x, y, rx, ry, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.restore();
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function arrow(ctx, x1, y1, x2, y2, color) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const L = 8;
  ctx.save();
  ctx.strokeStyle = color || ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(ang - Math.PI / 7), y2 - L * Math.sin(ang - Math.PI / 7));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(ang + Math.PI / 7), y2 - L * Math.sin(ang + Math.PI / 7));
  ctx.stroke();
  ctx.restore();
}

function projectVector(v, R, cx, cy) {
  // Ортографическая проекция: x — вправо, z — вверх, y — «в глубину» (даёт наклон вниз)
  const x = v?.x ?? 0;
  const y = v?.y ?? 0;
  const z = v?.z ?? 1;
  const px = cx + x * R;
  const py = cy - z * R + (-y) * (R * 0.35);
  return { x: px, y: py };
}

export default { drawBlochSphere };
