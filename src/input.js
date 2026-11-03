// Keyboard + mouse (PC) and virtual joystick / buttons (Android & touch screens).
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // one-shot presses this frame
    this.look = { x: 0, y: 0 };
    this.stick = { x: 0, y: 0 };
    this.touchBtns = { sprint: false, jump: false, brake: false };
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.enabled = false;

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // mouse look: pointer-lock when available, otherwise drag
    let dragging = false;
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.isTouch) return;
      dragging = true;
      if (canvas.requestPointerLock && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    addEventListener('mouseup', () => (dragging = false));
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === canvas || dragging) { this.look.x += e.movementX; this.look.y += e.movementY; }
    });
    this.setupTouch();
  }

  setupTouch() {
    const zone = document.getElementById('touch');
    if (!this.isTouch) { zone.style.display = 'none'; return; }
    const base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob');
    let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
    const R = 55;
    zone.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.target.closest('.tbtn')) continue;
        if (t.clientX < innerWidth * 0.45 && stickId === null) {
          stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          base.style.display = 'block'; base.style.left = sx - 65 + 'px'; base.style.top = sy - 65 + 'px';
          knob.style.transform = 'translate(0px,0px)';
        } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          this.stick.x = dx / R; this.stick.y = dy / R;
          knob.style.transform = `translate(${dx}px,${dy}px)`;
        } else if (t.identifier === lookId) {
          this.look.x += (t.clientX - lx) * 1.6; this.look.y += (t.clientY - ly) * 1.6; lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.stick.x = this.stick.y = 0; base.style.display = 'none'; }
        if (t.identifier === lookId) lookId = null;
      }
    };
    zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
    for (const b of document.querySelectorAll('.tbtn')) {
      const name = b.dataset.btn;
      b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.touchBtns[name] = true; this.pressed.add('btn:' + name); b.classList.add('on'); }, { passive: false });
      b.addEventListener('touchend', (e) => { e.preventDefault(); this.touchBtns[name] = false; b.classList.remove('on'); });
    }
  }

  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }

  // movement vector: x = right, y = forward
  move() {
    let x = 0, y = 0;
    if (this.down('KeyW', 'ArrowUp')) y += 1;
    if (this.down('KeyS', 'ArrowDown')) y -= 1;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    x += this.stick.x; y -= this.stick.y;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  consumeLook() { const l = { ...this.look }; this.look.x = this.look.y = 0; return l; }
  endFrame() { this.pressed.clear(); }
}
