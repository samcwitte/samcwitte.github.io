// The exploded board on the right: spreads the layers apart once the page
// loads, tilts the stack toward the mouse, and lifts/lights each LED the
// cursor passes over.
(() => {
    const stack = document.querySelector('.stack');
    if (!stack) return;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    // --- LEDs: a 16x16 grid of cells, one per footprint ---
    //
    // Like Blender's proportional editing: the cursor is the "selected" point
    // and every LED within RADIUS rises by a smooth falloff of its distance.

    const SIZE = 16;
    const RADIUS = 5.6;         // in LEDs (1 LED = 3 mm)

    const grid = stack.querySelector('.leds');
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.innerHTML = '<div class="led"></div>';
            grid.appendChild(cell);
            cells.push({ el: cell, r: r + 0.5, c: c + 0.5, w: 0 });
        }
    }

    // Blender's "Smooth" falloff: 1 at the centre, easing to 0 at the radius
    const falloff = (t) => (t >= 1 ? 0 : 1 - t * t * (3 - 2 * t));

    const focus = { r: 8, c: 8, amp: 0 };          // what's drawn
    const aim = { r: 8, c: 8, amp: 0 };            // where it's heading
    let hovering = false;
    let ledRaf = null;

    function drawLeds() {
        focus.r += (aim.r - focus.r) * 0.3;
        focus.c += (aim.c - focus.c) * 0.3;
        focus.amp += (aim.amp - focus.amp) * 0.12;

        const spin = performance.now() / 12;
        for (const led of cells) {
            const d = Math.hypot(led.r - focus.r, led.c - focus.c);
            const w = focus.amp * falloff(d / RADIUS);
            // rings of colour radiating out from the cursor
            if (w > 0) led.el.style.setProperty('--hue', Math.round(spin + d * 28) % 360);
            if (Math.abs(w - led.w) < 0.002) continue;
            led.w = w;
            led.el.style.setProperty('--w', w.toFixed(3));
        }

        const settled = Math.abs(aim.amp - focus.amp) < 0.002 &&
            Math.abs(aim.r - focus.r) < 0.01 && Math.abs(aim.c - focus.c) < 0.01;
        ledRaf = settled && focus.amp < 0.002 ? null : requestAnimationFrame(drawLeds);
    }

    const wakeLeds = () => { if (!ledRaf) ledRaf = requestAnimationFrame(drawLeds); };

    if (!reduceMotion) {
        grid.addEventListener('pointermove', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;
            // offsetX/Y are in the cell's own (untransformed) space
            const fx = Math.min(1, Math.max(0, e.offsetX / cell.offsetWidth));
            const fy = Math.min(1, Math.max(0, e.offsetY / cell.offsetHeight));
            aim.c = +cell.dataset.c + fx;
            aim.r = +cell.dataset.r + fy;
            aim.amp = 1;
            hovering = true;
            dismissHint();
            wakeLeds();
        });
        grid.addEventListener('pointerleave', () => { hovering = false; aim.amp = 0; wakeLeds(); });
    }

    // --- explode, then say hello by sweeping the falloff corner to corner ---

    function wave() {
        if (hovering) return;   // the cursor got there first
        const start = performance.now(), DURATION = 1600;
        Object.assign(focus, { r: -3, c: -3 });
        (function sweep(now) {
            if (hovering) return;
            const t = Math.min(1, (now - start) / DURATION);
            aim.r = aim.c = -3 + t * (SIZE + 6);
            aim.amp = t < 1 ? 1 : 0;
            wakeLeds();
            if (t < 1) requestAnimationFrame(sweep);
            else setTimeout(showHint, 600);
        })(start);
    }

    // --- hint: until someone hovers the board, say so, and let a "ghost"
    //     cursor tap a random spot every few seconds ---

    const figure = stack.closest('.board');
    const HINT_KEY = 'pcb-stack-hint-seen';
    let hintSeen = false;
    try { hintSeen = localStorage.getItem(HINT_KEY) === '1'; } catch (e) {}
    let ghostTimer = null;

    function ghostTap() {
        if (hovering) return;
        aim.r = focus.r = 3 + Math.random() * 10;
        aim.c = focus.c = 3 + Math.random() * 10;
        aim.amp = 0.7;
        wakeLeds();
        setTimeout(() => { if (!hovering) { aim.amp = 0; wakeLeds(); } }, 700);
    }

    function showHint() {
        if (hintSeen || hovering || !finePointer) return;
        figure.classList.add('show-hint');
        ghostTap();
        ghostTimer = setInterval(ghostTap, 3200);
    }

    function dismissHint() {
        if (hintSeen) return;
        hintSeen = true;
        clearInterval(ghostTimer);
        figure.classList.remove('show-hint');
        try { localStorage.setItem(HINT_KEY, '1'); } catch (e) {}
    }

    if (reduceMotion) {
        stack.classList.add('is-exploded');
    } else {
        // let the collapsed board paint first so the explode animates
        requestAnimationFrame(() => {
            setTimeout(() => stack.classList.add('is-exploded'), 400);
            setTimeout(wave, 1300);
        });
    }

    // --- tilt toward the mouse; the whole window is the trackpad ---

    if (reduceMotion || !finePointer) return;

    const MAX_TILT = 10; // degrees
    const EASE = 0.08;   // 0..1, lower is smoother

    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let raf = null;

    function onMove(e) {
        // -1..1 from the window's center
        target.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
        if (!raf) raf = requestAnimationFrame(step);
    }

    function onLeave() {
        target = { x: 0, y: 0 };
        if (!raf) raf = requestAnimationFrame(step);
    }

    function step() {
        current.x += (target.x - current.x) * EASE;
        current.y += (target.y - current.y) * EASE;

        stack.style.setProperty('--ry', (current.x * MAX_TILT).toFixed(2) + 'deg');
        stack.style.setProperty('--rx', (-current.y * MAX_TILT).toFixed(2) + 'deg');

        const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
        raf = settled ? null : requestAnimationFrame(step);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
})();
