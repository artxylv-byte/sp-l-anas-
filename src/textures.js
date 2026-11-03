// Procedurally generated textures (no external image files needed, so the game
// works fully offline on PC and Android).
import * as THREE from 'three';

const cache = new Map();

export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 1000003) / 1000003;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function noise(ctx, w, h, amount, r, alpha = 1) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
    if (alpha !== 1) d[i + 3] *= alpha;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- Hair ----------
export function hairTexture(ragged = false) {
  return cached('hair' + ragged, () => {
    const W = 256, H = 512;
    const [c, x] = makeCanvas(W, H);
    const r = rng(7);
    if (!ragged) { x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, W, H); }
    for (let i = 0; i < 1400; i++) {
      const px = r() * W;
      const b = 120 + r() * 135;
      x.strokeStyle = `rgb(${b},${b},${b})`;
      x.lineWidth = 0.6 + r() * 1.6;
      const end = ragged ? H * (0.72 + r() * 0.28) : H;
      x.beginPath();
      x.moveTo(px, 0);
      const wob = (r() - 0.5) * 10;
      x.bezierCurveTo(px + wob, end * 0.3, px - wob, end * 0.7, px + wob * 0.5, end);
      x.stroke();
    }
    if (ragged) {
      // fill the core so the sheet is not see-through near the top
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(190,190,190,1)');
      g.addColorStop(0.6, 'rgba(190,190,190,0.9)');
      g.addColorStop(0.75, 'rgba(190,190,190,0)');
      x.globalCompositeOperation = 'destination-over';
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-over';
    }
    const t = toTex(c);
    return t;
  });
}

// ---------- Fabrics ----------
export function fabricTexture(kind) {
  return cached('fab-' + kind, () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    const r = rng(kind.length * 31 + 3);
    x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, S, S);
    if (kind === 'denim') {
      x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, S, S);
      for (let i = -S; i < S * 2; i += 3) {
        x.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.35})`;
        x.lineWidth = 1;
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke();
      }
      noise(x, S, S, 40, r);
    } else if (kind === 'knit') {
      for (let i = 0; i < S; i += 6) {
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(i, 0, 2, S);
      }
      noise(x, S, S, 18, r);
    } else if (kind === 'puffer') {
      for (let y = 0; y < S; y += 32) {
        const g = x.createLinearGradient(0, y, 0, y + 32);
        g.addColorStop(0, '#9a9a9a'); g.addColorStop(0.5, '#f4f4f4'); g.addColorStop(1, '#9a9a9a');
        x.fillStyle = g; x.fillRect(0, y, S, 32);
      }
    } else if (kind === 'leather') {
      noise(x, S, S, 30, r);
      for (let i = 0; i < 300; i++) {
        x.strokeStyle = 'rgba(0,0,0,0.06)';
        x.beginPath(); const px = r() * S, py = r() * S;
        x.moveTo(px, py); x.lineTo(px + r() * 12, py + r() * 4); x.stroke();
      }
    } else {
      // cotton / jersey
      for (let y = 0; y < S; y += 2) {
        x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`; x.fillRect(0, y, S, 1);
      }
      noise(x, S, S, 22, r);
    }
    return toTex(c);
  });
}

export function laceTexture() {
  return cached('lace', () => {
    const W = 256, H = 256;
    const [c, x] = makeCanvas(W, H);
    x.clearRect(0, 0, W, H);
    // solid body
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H * 0.8);
    // floral cut-outs in a band near the hem
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) {
      const cx = i * 32 + 16, cy = H * 0.7;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        x.beginPath(); x.arc(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 3.6, 0, Math.PI * 2); x.fill();
      }
      x.beginPath(); x.arc(cx, cy, 2.2, 0, Math.PI * 2); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    // scalloped hem
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      x.beginPath(); x.arc(i * 32 + 16, H * 0.8, 16, 0, Math.PI); x.fill();
    }
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) {
      x.beginPath(); x.arc(i * 32 + 16, H * 0.86, 4, 0, Math.PI * 2); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    const t = toTex(c);
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

export function printTexture() {
  return cached('print', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    x.clearRect(0, 0, S, S);
    x.fillStyle = '#f5f5f5';
    // original graphic: a sun over waves + "SOLARA"
    x.beginPath(); x.arc(128, 110, 46, Math.PI, 0); x.fill();
    x.lineWidth = 9; x.strokeStyle = '#f5f5f5'; x.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      for (let i = 0; i <= 40; i++) {
        const px = 60 + i * 3.4, py = 128 + k * 16 + Math.sin(i * 0.5) * 5;
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    }
    x.font = 'bold 40px Arial, sans-serif'; x.textAlign = 'center';
    x.fillText('SOLARA', 128, 220);
    const t = toTex(c, { repeat: false });
    return t;
  });
}

export function irisTexture(hex) {
  return cached('iris' + hex, () => {
    const S = 128;
    const [c, x] = makeCanvas(S, S);
    const col = new THREE.Color(hex);
    const dark = col.clone().multiplyScalar(0.45);
    const light = col.clone().lerp(new THREE.Color('#ffffff'), 0.25);
    x.fillStyle = '#' + dark.getHexString(); x.fillRect(0, 0, S, S);
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 62);
    g.addColorStop(0, '#' + light.getHexString());
    g.addColorStop(0.75, '#' + col.getHexString());
    g.addColorStop(1, '#' + dark.getHexString());
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
    const r = rng(11);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      x.strokeStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`;
      x.beginPath(); x.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20);
      x.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); x.stroke();
    }
    x.fillStyle = '#050505'; x.beginPath(); x.arc(64, 64, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(48, 46, 9, 0, Math.PI * 2); x.fill();
    return toTex(c, { repeat: false });
  });
}

// ---------- World ----------
export function facadeTexture(lit = false) {
  return cached('facade' + lit, () => {
    const S = 512; // one tile = 14m x 14m, 4 x 4 windows
    const [c, x] = makeCanvas(S, S);
    const r = rng(lit ? 99 : 5);
    x.fillStyle = lit ? '#000' : '#ffffff'; x.fillRect(0, 0, S, S);
    if (!lit) noise(x, S, S, 14, r);
    const cell = S / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const px = i * cell + cell * 0.18, py = j * cell + cell * 0.22;
      const w = cell * 0.64, h = cell * 0.56;
      if (lit) {
        if (r() < 0.45) {
          const warm = r();
          x.fillStyle = warm < 0.7 ? `rgb(255,${200 + r() * 40},${120 + r() * 60})` : 'rgb(170,210,255)';
          x.fillRect(px, py, w, h);
        }
      } else {
        x.fillStyle = '#9a9a9a'; x.fillRect(px - 4, py - 4, w + 8, h + 8);
        const g = x.createLinearGradient(px, py, px + w, py + h);
        g.addColorStop(0, '#2c3e52'); g.addColorStop(0.5, '#5a7896'); g.addColorStop(1, '#22303f');
        x.fillStyle = g; x.fillRect(px, py, w, h);
        x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(px + w / 2 - 1, py, 2, h);
        x.fillStyle = '#d8d8d8'; x.fillRect(px - 6, py + h + 4, w + 12, 6);
      }
    }
    return toTex(c);
  });
}

export function glassTowerTexture(lit = false) {
  return cached('glass' + lit, () => {
    const S = 512;
    const [c, x] = makeCanvas(S, S);
    const r = rng(lit ? 41 : 42);
    if (lit) { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); }
    const cols = 8, rows = 4;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const w = S / cols, h = S / rows;
      if (lit) {
        if (r() < 0.35) { x.fillStyle = `rgb(255,${215 + r() * 30},${160 + r() * 50})`; x.fillRect(i * w + 2, j * h + 4, w - 4, h - 8); }
      } else {
        const b = 150 + r() * 70;
        const g = x.createLinearGradient(0, j * h, 0, j * h + h);
        g.addColorStop(0, `rgb(${b * 0.75},${b * 0.9},${b})`);
        g.addColorStop(1, `rgb(${b * 0.55},${b * 0.7},${b * 0.85})`);
        x.fillStyle = g; x.fillRect(i * w, j * h, w, h);
      }
    }
    if (!lit) {
      x.fillStyle = '#e8edf2';
      for (let i = 0; i <= cols; i++) x.fillRect(i * (S / cols) - 2, 0, 4, S);
      for (let j = 0; j <= rows; j++) x.fillRect(0, j * (S / rows) - 3, S, 6);
    }
    return toTex(c);
  });
}

export function roadTexture() {
  return cached('road', () => {
    const W = 512, H = 512; // width = 14m road, length = 14m
    const [c, x] = makeCanvas(W, H);
    const r = rng(3);
    x.fillStyle = '#3a3c40'; x.fillRect(0, 0, W, H);
    noise(x, W, H, 26, r);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
      x.beginPath(); x.ellipse(r() * W, r() * H, 10 + r() * 40, 5 + r() * 20, r() * 3, 0, Math.PI * 2); x.fill();
    }
    const m = W / 14;
    x.fillStyle = '#e2c040';
    x.fillRect(W / 2 - 0.25 * m, 0, 0.12 * m, H);
    x.fillRect(W / 2 + 0.13 * m, 0, 0.12 * m, H);
    x.fillStyle = '#e8e8e8';
    for (const lx of [-3.5, 3.5]) {
      for (let y = 0; y < H; y += H / 2) x.fillRect(W / 2 + lx * m - 0.07 * m, y, 0.14 * m, H / 4);
    }
    for (const lx of [-6.4, 6.4]) x.fillRect(W / 2 + lx * m - 0.08 * m, 0, 0.16 * m, H);
    return toTex(c);
  });
}

export function asphaltTexture() {
  return cached('asphalt', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    x.fillStyle = '#3a3c40'; x.fillRect(0, 0, S, S);
    noise(x, S, S, 26, rng(8));
    return toTex(c);
  });
}

export function concreteTexture() {
  return cached('concrete', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    x.fillStyle = '#b9b5ad'; x.fillRect(0, 0, S, S);
    noise(x, S, S, 22, rng(4));
    x.strokeStyle = 'rgba(60,60,60,0.35)'; x.lineWidth = 2;
    for (let i = 0; i <= S; i += S / 2) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
    }
    return toTex(c);
  });
}

export function grassTexture() {
  return cached('grass', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    const r = rng(12);
    x.fillStyle = '#5d8a3a'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) {
      const g = 90 + r() * 80;
      x.fillStyle = `rgba(${g * 0.5},${g},${g * 0.3},0.5)`;
      x.fillRect(r() * S, r() * S, 1, 2 + r() * 3);
    }
    return toTex(c);
  });
}

export function sandTexture() {
  return cached('sand', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    x.fillStyle = '#e6d3a8'; x.fillRect(0, 0, S, S);
    noise(x, S, S, 30, rng(13));
    return toTex(c);
  });
}

export function leafTexture() {
  return cached('leaf', () => {
    const W = 128, H = 512;
    const [c, x] = makeCanvas(W, H);
    x.clearRect(0, 0, W, H);
    x.strokeStyle = '#4b6b2a'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    const r = rng(21);
    for (let y = 10; y < H - 10; y += 9) {
      const len = Math.sin((y / H) * Math.PI) * (W / 2 - 4);
      const g = 110 + r() * 60;
      x.strokeStyle = `rgb(${g * 0.45},${g},${g * 0.3})`; x.lineWidth = 4;
      x.beginPath(); x.moveTo(W / 2, y); x.lineTo(W / 2 - len, y + 22); x.stroke();
      x.beginPath(); x.moveTo(W / 2, y); x.lineTo(W / 2 + len, y + 22); x.stroke();
    }
    const t = toTex(c, { repeat: false });
    return t;
  });
}

export function waterNormalTexture() {
  return cached('waternormal', () => {
    const S = 256;
    const h = new Float32Array(S * S);
    const r = rng(77);
    const waves = [];
    for (let i = 0; i < 14; i++) waves.push([Math.floor(1 + r() * 6), Math.floor(1 + r() * 6) * (r() < 0.5 ? -1 : 1), r() * 6.28, 0.3 + r()]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0;
      for (const [a, b, p, amp] of waves) v += Math.sin(((x * a + y * b) / S) * Math.PI * 2 + p) * amp / (a + Math.abs(b));
      h[y * S + x] = v;
    }
    const [c, ctx] = makeCanvas(S, S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)];
      const dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
      const n = new THREE.Vector3(-dx * 2.5, -dy * 2.5, 1).normalize();
      const i = (y * S + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return toTex(c, { srgb: false });
  });
}

export function signTexture(text, color, bg = 'rgba(0,0,0,0)') {
  return cached('sign' + text + color, () => {
    const W = 512, H = 128;
    const [c, x] = makeCanvas(W, H);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.font = 'bold 84px "Trebuchet MS", Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 18;
    x.fillStyle = color; x.fillText(text, W / 2, H / 2 + 4);
    x.fillStyle = '#ffffff'; x.shadowBlur = 0; x.globalAlpha = 0.55; x.fillText(text, W / 2, H / 2 + 4);
    return toTex(c, { repeat: false });
  });
}

// ---------- Rīga ----------
function roundRect(x, px, py, w, h, rad) {
  rad = Math.min(rad, w / 2, h / 2);
  x.beginPath();
  x.moveTo(px + rad, py); x.lineTo(px + w - rad, py); x.quadraticCurveTo(px + w, py, px + w, py + rad);
  x.lineTo(px + w, py + h - rad); x.quadraticCurveTo(px + w, py + h, px + w - rad, py + h);
  x.lineTo(px + rad, py + h); x.quadraticCurveTo(px, py + h, px, py + h - rad);
  x.lineTo(px, py + rad); x.quadraticCurveTo(px, py, px + rad, py);
  x.closePath();
}

// Art Nouveau (Jugendstil) apartment house facade: one tile = 14 m wide × 28 m tall,
// shop windows on the ground floor, tall (some arched) windows with stucco surrounds above.
export function artFacadeTexture(lit = false) {
  return cached('art' + lit, () => {
    const W = 512, H = 1024, mx = W / 14, my = H / 28;
    const [c, x] = makeCanvas(W, H);
    const r = rng(lit ? 61 : 60);
    const Y = (m) => H - m * my;
    x.fillStyle = lit ? '#000' : '#ffffff'; x.fillRect(0, 0, W, H);
    if (!lit) noise(x, W, H, 10, r);
    const gf = 4.4, fh = 3.35;
    for (let k = 0; k < 3; k++) { // ground-floor shops
      const cx = (k + 0.5) * (14 / 3);
      if (lit) { if (r() < 0.85) { x.fillStyle = `rgb(255,${185 + r() * 45},${110 + r() * 60})`; x.fillRect((cx - 1.7) * mx, Y(3.6), 3.4 * mx, 3.0 * my); } continue; }
      x.fillStyle = '#4e463e'; x.fillRect((cx - 1.85) * mx, Y(3.75), 3.7 * mx, 3.3 * my);
      const g = x.createLinearGradient(0, Y(3.6), 0, Y(0.6)); g.addColorStop(0, '#26303b'); g.addColorStop(1, '#4a5865');
      x.fillStyle = g; x.fillRect((cx - 1.7) * mx, Y(3.6), 3.4 * mx, 3.0 * my);
      x.fillStyle = 'rgba(255,255,255,0.13)'; x.fillRect((cx - 1.7) * mx, Y(3.6), 3.4 * mx, 0.45 * my);
      x.fillStyle = 'rgba(220,220,220,0.6)'; x.fillRect((cx - 0.03) * mx, Y(3.6), 0.06 * mx, 3.0 * my);
    }
    if (!lit) {
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, Y(0.6), W, 0.6 * my);
      x.fillStyle = 'rgba(0,0,0,0.13)'; x.fillRect(0, Y(gf + 0.1), W, 0.4 * my);
      x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(0, Y(gf + 0.1) - 3, W, 3);
      for (const px of [0, 7, 14]) { x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(px * mx - 9, 0, 18, Y(gf + 0.3)); }
    }
    for (let f = 0; f < 7; f++) {
      const y0 = gf + 0.3 + f * fh;
      for (let k = 0; k < 4; k++) {
        const cx = (k + 0.5) * 3.5, w = 1.3, h = 2.15, wy = y0 + 0.7;
        if (lit) {
          if (r() < 0.4) { x.fillStyle = r() < 0.78 ? `rgb(255,${195 + r() * 45},${120 + r() * 70})` : 'rgb(170,205,255)'; x.fillRect((cx - w / 2) * mx, Y(wy + h), w * mx, h * my); }
          continue;
        }
        x.fillStyle = 'rgba(0,0,0,0.13)'; x.fillRect((cx - w / 2 - 0.2) * mx, Y(wy + h + 0.28), (w + 0.4) * mx, (h + 0.5) * my);
        x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect((cx - w / 2 - 0.13) * mx, Y(wy + h + 0.2), (w + 0.26) * mx, (h + 0.33) * my);
        const g = x.createLinearGradient(0, Y(wy + h), 0, Y(wy)); g.addColorStop(0, '#1f2b36'); g.addColorStop(1, '#4b6175');
        x.fillStyle = g;
        if (f % 3 === 1) {
          x.beginPath(); x.moveTo((cx - w / 2) * mx, Y(wy)); x.lineTo((cx - w / 2) * mx, Y(wy + h - w / 2));
          x.arc(cx * mx, Y(wy + h - w / 2), (w / 2) * mx, Math.PI, 0); x.lineTo((cx + w / 2) * mx, Y(wy)); x.closePath(); x.fill();
        } else x.fillRect((cx - w / 2) * mx, Y(wy + h), w * mx, h * my);
        x.fillStyle = 'rgba(236,236,236,0.8)'; x.fillRect((cx - 0.03) * mx, Y(wy + h - 0.1), 0.06 * mx, (h - 0.1) * my); x.fillRect((cx - w / 2) * mx, Y(wy + h * 0.72), w * mx, 0.06 * my);
        x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect((cx - w / 2 - 0.22) * mx, Y(wy), (w + 0.44) * mx, 0.13 * my);
        if (f % 2 === 0) { x.fillStyle = 'rgba(0,0,0,0.14)'; x.beginPath(); x.arc(cx * mx, Y(wy + h + 0.6), 0.24 * mx, 0, Math.PI * 2); x.fill(); }
        if (f === 2 && k % 2 === 0) { x.fillStyle = 'rgba(40,40,40,0.55)'; x.fillRect((cx - w / 2 - 0.3) * mx, Y(wy + 0.95), (w + 0.6) * mx, 0.07 * my); for (let b = 0; b < 7; b++) x.fillRect((cx - w / 2 - 0.25 + b * 0.31) * mx, Y(wy + 0.95), 2, 0.9 * my); }
      }
      if (!lit) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(0, Y(y0), W, 0.14 * my); }
    }
    return toTex(c);
  });
}

// Old Town (Vecrīga) merchant house facade: smaller white-framed windows, arched doors below.
export function oldFacadeTexture(lit = false) {
  return cached('oldfac' + lit, () => {
    const W = 512, H = 1024, mx = W / 14, my = H / 28;
    const [c, x] = makeCanvas(W, H);
    const r = rng(lit ? 71 : 70);
    const Y = (m) => H - m * my;
    x.fillStyle = lit ? '#000' : '#ffffff'; x.fillRect(0, 0, W, H);
    if (!lit) noise(x, W, H, 16, r);
    for (let k = 0; k < 4; k++) { // ground floor: arched doors / small shop windows
      const cx = (k + 0.5) * 3.5;
      if (lit) { if (r() < 0.6) { x.fillStyle = `rgb(255,${180 + r() * 40},${100 + r() * 60})`; x.fillRect((cx - 0.8) * mx, Y(2.9), 1.6 * mx, 2.4 * my); } continue; }
      x.fillStyle = k % 2 ? '#3a2a20' : '#2c3640';
      x.beginPath(); x.moveTo((cx - 0.8) * mx, Y(0.2)); x.lineTo((cx - 0.8) * mx, Y(2.3)); x.arc(cx * mx, Y(2.3), 0.8 * mx, Math.PI, 0); x.lineTo((cx + 0.8) * mx, Y(0.2)); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 4; x.stroke();
    }
    if (!lit) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, Y(0.45), W, 0.45 * my); x.fillStyle = 'rgba(0,0,0,0.1)'; x.fillRect(0, Y(3.6), W, 0.25 * my); }
    for (let f = 0; f < 8; f++) {
      const wy = 4.3 + f * 3.0;
      for (let k = 0; k < 4; k++) {
        const cx = (k + 0.5) * 3.5, w = 1.05, h = 1.55;
        if (lit) { if (r() < 0.38) { x.fillStyle = `rgb(255,${190 + r() * 50},${110 + r() * 70})`; x.fillRect((cx - w / 2) * mx, Y(wy + h), w * mx, h * my); } continue; }
        x.fillStyle = '#f6f3ec'; x.fillRect((cx - w / 2 - 0.12) * mx, Y(wy + h + 0.12), (w + 0.24) * mx, (h + 0.24) * my);
        const g = x.createLinearGradient(0, Y(wy + h), 0, Y(wy)); g.addColorStop(0, '#202a33'); g.addColorStop(1, '#46586a');
        x.fillStyle = g; x.fillRect((cx - w / 2) * mx, Y(wy + h), w * mx, h * my);
        x.fillStyle = '#f6f3ec'; x.fillRect((cx - 0.025) * mx, Y(wy + h), 0.05 * mx, h * my); x.fillRect((cx - w / 2) * mx, Y(wy + h * 0.6), w * mx, 0.05 * my);
        x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect((cx - w / 2 - 0.15) * mx, Y(wy - 0.05), (w + 0.3) * mx, 0.1 * my);
      }
    }
    return toTex(c);
  });
}

export function cobbleTexture() {
  return cached('cobble', () => {
    const S = 512;
    const [c, x] = makeCanvas(S, S);
    const r = rng(17);
    x.fillStyle = '#34312d'; x.fillRect(0, 0, S, S);
    const rows = 22, h = S / rows;
    for (let j = 0; j < rows; j++) {
      let px = (j % 2) * h * 0.5;
      const stones = [];
      while (px < S) { const w = h * (0.85 + r() * 0.5); stones.push([px, w]); px += w; }
      for (const [sx, w] of stones) {
        const g = 92 + r() * 58, t = r() * 16;
        for (const off of sx + w > S ? [0, -S] : [0]) {
          x.fillStyle = `rgb(${g + t},${g + t * 0.55},${g - t * 0.2})`;
          roundRect(x, sx + off + 1.5, j * h + 1.5, w - 3, h - 3, 5); x.fill();
          x.fillStyle = 'rgba(255,255,255,0.09)'; roundRect(x, sx + off + 3, j * h + 3, w - 8, (h - 6) * 0.4, 3); x.fill();
        }
      }
    }
    return toTex(c);
  });
}

export function pavingTexture() {
  return cached('paving', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    const r = rng(23);
    x.fillStyle = '#8f8a83'; x.fillRect(0, 0, S, S);
    const n = 4, q = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const g = 168 + r() * 30;
      x.fillStyle = `rgb(${g},${g - 4},${g - 10})`; x.fillRect(i * q + 2, j * q + 2, q - 4, q - 4);
    }
    noise(x, S, S, 16, r);
    return toTex(c);
  });
}

// soft cumulus layer (tileable value-noise fbm)
export function cloudTexture() {
  return cached('clouds', () => {
    const S = 256;
    const [c, x] = makeCanvas(S, S);
    const r = rng(91);
    const octs = [[4, 0.5], [8, 0.26], [16, 0.14], [32, 0.1]].map(([n, a]) => [n, a, Float32Array.from({ length: n * n }, () => r())]);
    const sm = (t) => t * t * (3 - 2 * t);
    const img = x.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let X = 0; X < S; X++) {
      let v = 0;
      for (const [n, a, g] of octs) {
        const fx = (X / S) * n, fy = (y / S) * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
        const at = (i, j) => g[(j % n) * n + (i % n)];
        v += a * ((at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty);
      }
      const al = Math.max(0, Math.min(1, (v - 0.5) / 0.22));
      const i = (y * S + X) * 4, sh = 205 + 50 * al;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = sh; img.data[i + 3] = al * 235;
    }
    x.putImageData(img, 0, 0);
    return toTex(c);
  });
}

// warm pool of light on the ground under a street lamp
export function poolTexture() {
  return cached('pool', () => {
    const S = 128;
    const [c, x] = makeCanvas(S, S);
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,214,150,0.9)'); g.addColorStop(0.45, 'rgba(255,200,130,0.35)'); g.addColorStop(1, 'rgba(255,190,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return toTex(c, { repeat: false });
  });
}

// all the Latvian shop signs in one texture (one row each) so every sign in the city is one draw call
export const SHOP_SIGNS = ['KAFEJNĪCA', 'APTIEKA', 'MAIZNĪCA', 'VEIKALS', 'RESTORĀNS', 'VIESNĪCA', 'GRĀMATNĪCA', 'ZIEDI',
  'SALDĒJUMS', 'PICĒRIJA', 'SUVENĪRI', 'OPTIKA', 'KONDITOREJA', 'FRIZIERIS', 'APAVI', 'ANTIKVARIĀTS'];
export function signAtlas() {
  return cached('signatlas', () => {
    const W = 1024, RH = 128, H = RH * SHOP_SIGNS.length;
    const [c, x] = makeCanvas(W, H);
    const panels = [['#1f3b2f', '#e8d39a'], ['#5c1a22', '#f3e6c8'], ['#1d2a44', '#ffffff'], ['#151515', '#d4a940'], ['#efe6d2', '#5c1a22'], ['#2b2b2b', '#9fe0ff']];
    SHOP_SIGNS.forEach((t, k) => {
      const [bg, fg] = panels[k % panels.length];
      x.fillStyle = bg; roundRect(x, 6, k * RH + 8, W - 12, RH - 16, 18); x.fill();
      x.strokeStyle = fg; x.lineWidth = 4; roundRect(x, 16, k * RH + 18, W - 32, RH - 36, 12); x.stroke();
      x.font = `bold ${t.length > 10 ? 64 : 76}px Georgia, "Times New Roman", serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
      x.fillText(t, W / 2, k * RH + RH / 2 + 4);
    });
    return toTex(c, { repeat: false });
  });
}
