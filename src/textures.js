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
