function drawAutomatonDiagram() {
    const canvas = document.getElementById('automatonCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    const stateRadius = Math.floor(Math.min(width, height) * 0.13);
    const cx = width / 2;
    const cy = height / 2;
    const triangleR = Math.min(width, height) / 2 - stateRadius - 9;

    const states = automaton.states;
    const baseAngle = -Math.PI / 2;
    const step = (2 * Math.PI) / states.length;
    const statePositions = {};
    for (let i = 0; i < states.length; i++) {
        const angle = baseAngle + i * step;
        let x = cx + triangleR * Math.cos(angle);
        let y = cy + triangleR * Math.sin(angle);

        if (states[i] === "q3") x -= 60;
        if (states[i] === "q1") x += 60;

        statePositions[states[i]] = { x: x, y: y };
    }

    // Стартовая стрелка
    const initial = statePositions[automaton.initialState];
    if (initial) {
        ctx.save();
        ctx.strokeStyle = "#4a9eff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(initial.x, initial.y - stateRadius * 1.6);
        ctx.lineTo(initial.x, initial.y - stateRadius);
        ctx.stroke();
        ctx.fillStyle = "#4a9eff";
        ctx.beginPath();
        ctx.moveTo(initial.x, initial.y - stateRadius);
        ctx.lineTo(initial.x - 8, initial.y - stateRadius - 13);
        ctx.lineTo(initial.x + 8, initial.y - stateRadius - 13);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Группировка переходов для отрисовки и отладка
    const groupedTransitions = {};
    for (const [from, transitionMap] of Object.entries(automaton.transitions)) {
        for (const [symbol, to] of Object.entries(transitionMap)) {
            if (!to) continue;
            // Лог группировки
            console.log(`[group] from:${from} symbol:${symbol} to:${to}`);
            if (!groupedTransitions[from]) groupedTransitions[from] = {};
            if (!groupedTransitions[from][to]) groupedTransitions[from][to] = [];
            groupedTransitions[from][to].push(symbol);
        }
    }

    // Рисуем переходы
    for (const [from, tos] of Object.entries(groupedTransitions)) {
        for (const [to, symbols] of Object.entries(tos)) {
            console.log(`Drawing ${from}->${to} by [${symbols.join(', ')}]`);
            if (!statePositions[from] || !statePositions[to]) {
                console.log(`Coords missing for ${from} or ${to}`);
                continue;
            }

            ctx.save();
            ctx.strokeStyle = "#4a9eff";
            ctx.lineWidth = 2;

            const fromPos = statePositions[from];
            const toPos = statePositions[to];

            if (from === to) {
                // Самопетля сбоку
                const loopX = fromPos.x + stateRadius * 1.1;
                const loopY = fromPos.y - stateRadius * 0.7;
                ctx.beginPath();
                ctx.arc(loopX, loopY, stateRadius / 1.5, Math.PI * .1, Math.PI * 2.15);
                ctx.stroke();

                ctx.fillStyle = "#4a9eff";
                ctx.font = "bold 12px Arial";
                ctx.textAlign = "center";
                ctx.fillText(symbols.join(", "), loopX, loopY - stateRadius / 1.1);
            } else {
                // Кривая между двумя состояниями
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const angle = Math.atan2(dy, dx);

                const startX = fromPos.x + stateRadius * Math.cos(angle);
                const startY = fromPos.y + stateRadius * Math.sin(angle);
                const endX = toPos.x - stateRadius * Math.cos(angle);
                const endY = toPos.y - stateRadius * Math.sin(angle);

                const mx = (startX + endX) / 2;
                const my = (startY + endY) / 2;
                const offsetX = mx + 24 * Math.cos(angle + Math.PI / 2);
                const offsetY = my + 24 * Math.sin(angle + Math.PI / 2);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(offsetX, offsetY, endX, endY);
                ctx.stroke();

                // Стрелка
                const arrAngle = Math.atan2(endY - offsetY, endX - offsetX);
                ctx.fillStyle = "#4a9eff";
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - 12 * Math.cos(arrAngle - Math.PI / 8), endY - 12 * Math.sin(arrAngle - Math.PI / 8));
                ctx.lineTo(endX - 12 * Math.cos(arrAngle + Math.PI / 8), endY - 12 * Math.sin(arrAngle + Math.PI / 8));
                ctx.closePath();
                ctx.fill();

                // Подпись
                ctx.fillStyle = "#4a9eff";
                ctx.font = "bold 12px Arial";
                ctx.textAlign = "center";
                if (from === "q1" && to === "q3") {
                    ctx.fillText(symbols.join(", "), offsetX, offsetY + 6);
                } else {
                    ctx.fillText(symbols.join(", "), offsetX, offsetY - 8);
                }

            }
            ctx.restore();
        }
    }

    // Рисуем состояния
    for (const [state, pos] of Object.entries(statePositions)) {
        ctx.save();

        ctx.fillStyle = "#1a3a52";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, stateRadius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = automaton.acceptingStates.includes(state) ? "#00ff41" : "#4a9eff";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, stateRadius, 0, 2 * Math.PI);
        ctx.stroke();

        if (automaton.acceptingStates.includes(state)) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, stateRadius - 7, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(state, pos.x, pos.y);

        ctx.restore();
    }
}














