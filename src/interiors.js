// Furnished apartments (one per playable character). Each apartment is an enclosed room placed
// away from the city; the street door teleports you inside. Rooms provide colliders, a floor,
// a city view outside the windows, warm lights and "activity spots" for the resident character.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rng } from './textures.js';

const W = 12, D = 10, H = 2.9; // room size (m)

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

function woodTex(base, seed) {
  return canvasTex(512, 512, (x, w, h) => {
    const r = rng(seed);
    const c = new THREE.Color(base);
    for (let i = 0; i < 8; i++) {
      const k = 0.85 + r() * 0.3;
      x.fillStyle = `rgb(${c.r * 255 * k | 0},${c.g * 255 * k | 0},${c.b * 255 * k | 0})`;
      x.fillRect(0, i * 64, w, 64);
      for (let g = 0; g < 40; g++) {
        x.strokeStyle = `rgba(40,25,10,${0.05 + r() * 0.08})`; x.lineWidth = 1 + r() * 2;
        x.beginPath(); const y = i * 64 + r() * 64; x.moveTo(0, y);
        for (let s = 0; s <= 8; s++) x.lineTo(s * 64, y + Math.sin(s + r() * 6) * 3);
        x.stroke();
      }
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i * 64 + 62, w, 2);
      const off = r() * w; x.fillRect(off, i * 64, 2, 64);
    }
  }, [W / 2.4, D / 2.4]);
}
function paintTex(hex) {
  return canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = hex; x.fillRect(0, 0, w, h);
    const r = rng(9);
    const img = x.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 8; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    x.putImageData(img, 0, 0);
  }, [4, 2]);
}
function rugTex(a, b) {
  return canvasTex(256, 192, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    x.strokeStyle = b; x.lineWidth = 6; x.strokeRect(12, 12, w - 24, h - 24);
    x.lineWidth = 2; x.strokeRect(24, 24, w - 48, h - 48);
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(w / 2, h / 2, 12 + i * 12, 0, Math.PI * 2); x.stroke(); }
  });
}
// original abstract wall art
function artTex(kind, seed) {
  return canvasTex(256, 320, (x, w, h) => {
    const r = rng(seed);
    if (kind === 'sunset') {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b1f5c'); g.addColorStop(0.5, '#ff6f61'); g.addColorStop(1, '#ffd27f');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffe6a8'; x.beginPath(); x.arc(w / 2, h * 0.62, 50, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1d2b4f'; x.fillRect(0, h * 0.7, w, h * 0.3);
      for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(255,220,160,${0.3 - i * 0.04})`; x.fillRect(w * 0.3, h * 0.72 + i * 10, w * 0.4, 3); }
    } else if (kind === 'waves') {
      x.fillStyle = '#f2ede4'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 9; k++) {
        x.strokeStyle = ['#1f6f8b', '#99c1b9', '#f2a65a'][k % 3]; x.lineWidth = 9;
        x.beginPath(); for (let i = 0; i <= 32; i++) { const px = (i / 32) * w, py = 40 + k * 30 + Math.sin(i * 0.6 + k) * 10; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      }
    } else {
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { x.fillStyle = ['#ff4fa3', '#40e0ff', '#ffd23f', '#7cff6b', '#ffffff'][i % 5]; const s = 20 + r() * 70; x.globalAlpha = 0.85; x.fillRect(r() * (w - s), r() * (h - s), s, s * (0.3 + r())); }
      x.globalAlpha = 1;
    }
  });
}
function skylineTex(night) {
  return canvasTex(1024, 512, (x, w, h) => {
    const r = rng(night ? 77 : 78);
    const g = x.createLinearGradient(0, 0, 0, h);
    if (night) { g.addColorStop(0, '#05070f'); g.addColorStop(0.7, '#1a1f3a'); g.addColorStop(1, '#3a2a40'); }
    else { g.addColorStop(0, '#5f9bd8'); g.addColorStop(0.65, '#bcd8ef'); g.addColorStop(1, '#f2d9c0'); }
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 3; layer++) {
      let px = 0;
      while (px < w) {
        const bw = 30 + r() * 70, bh = 80 + r() * (220 - layer * 50) + layer * 20;
        const by = h - bh + layer * 30;
        const shade = night ? 12 + layer * 10 : 150 - layer * 30;
        x.fillStyle = night ? `rgb(${shade},${shade},${shade + 12})` : `rgb(${shade + 20},${shade + 30},${shade + 45})`;
        x.fillRect(px, by, bw, h - by);
        for (let wy = by + 8; wy < h - 6; wy += 12) for (let wx = px + 5; wx < px + bw - 6; wx += 10) {
          if (night ? r() < 0.4 : r() < 0.15) { x.fillStyle = night ? (r() < 0.8 ? '#ffd890' : '#a8d8ff') : 'rgba(255,255,255,0.35)'; x.fillRect(wx, wy, 5, 7); }
        }
        px += bw + 2 + r() * 10;
      }
    }
  });
}

const box = (w, h, d, r = 0.02) => (r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d));

export function buildApartment(scene, origin, style) {
  const g = new THREE.Group();
  g.position.copy(origin);
  scene.add(g);
  const colliders = [];
  const solid = (minX, maxX, minZ, maxZ, h = H) => colliders.push({ minX: origin.x + minX, maxX: origin.x + maxX, minZ: origin.z + minZ, maxZ: origin.z + maxZ, h: origin.y + h, minY: origin.y });
  const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
  const add = (geo, m, x, y, z, ry = 0, { cast = true } = {}) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = cast; o.receiveShadow = true; g.add(o); return o; };

  // ---- shell
  const floor = add(new THREE.PlaneGeometry(W, D), mat({ map: woodTex(style.floor, style.seed), roughness: 0.55 }), 0, 0.001, 0, 0, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  const wallM = mat({ map: paintTex(style.wall), roughness: 0.92 });
  const accentM = mat({ map: paintTex(style.accent), roughness: 0.92 });
  const T = 0.2;
  add(box(T, H, D + T * 2, 0), accentM, -W / 2 - T / 2, H / 2, 0); // west (TV wall)
  add(box(T, H, D + T * 2, 0), wallM, W / 2 + T / 2, H / 2, 0); // east (kitchen)
  add(box(W, H, T, 0), wallM, 0, H / 2, D / 2 + T / 2); // south (door wall)
  // north wall with three big windows
  add(box(W, 0.8, T, 0), wallM, 0, 0.4, -D / 2 - T / 2);
  add(box(W, 0.5, T, 0), wallM, 0, H - 0.25, -D / 2 - T / 2);
  for (const x of [-5.75, -1.75, 1.75, 5.75]) add(box(x === -5.75 || x === 5.75 ? 0.5 : 0.5, 1.6, T, 0), wallM, x, 1.6, -D / 2 - T / 2);
  const frameM = mat({ color: '#2a2a2e', roughness: 0.4, metalness: 0.5 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#cfe3f0', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, depthWrite: false });
  for (const cx of [-3.5, 0, 3.5]) {
    add(new THREE.PlaneGeometry(3, 1.6), glassM, cx, 1.6, -D / 2 - 0.02, 0, { cast: false });
    add(box(3, 0.05, 0.08, 0), frameM, cx, 0.82, -D / 2); add(box(3, 0.05, 0.08, 0), frameM, cx, 2.38, -D / 2);
    add(box(0.05, 1.6, 0.08, 0), frameM, cx, 1.6, -D / 2);
  }
  add(box(W, 0.2, D + T * 2, 0), mat({ color: '#f4f2ee', roughness: 0.95 }), 0, H + 0.1, 0); // ceiling
  // baseboards
  const bbM = mat({ color: '#f0ece6' });
  add(box(W, 0.1, 0.03, 0), bbM, 0, 0.05, D / 2 - 0.015, 0, { cast: false });
  add(box(0.03, 0.1, D, 0), bbM, -W / 2 + 0.015, 0.05, 0, 0, { cast: false });
  add(box(0.03, 0.1, D, 0), bbM, W / 2 - 0.015, 0.05, 0, 0, { cast: false });
  // ceiling lights (emissive discs)
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff7e0', emissive: '#ffe8b0', emissiveIntensity: 2.2 });
  for (const [x, z] of [[-3, 0], [2.5, 0], [3.5, -3.5], [-3.5, 3.5]]) { const l = add(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 24), lampM, x, H - 0.015, z, 0, { cast: false }); void l; }
  solid(-W / 2 - 0.4, -W / 2, -D / 2 - 0.4, D / 2 + 0.4); solid(W / 2, W / 2 + 0.4, -D / 2 - 0.4, D / 2 + 0.4);
  solid(-W / 2 - 0.4, W / 2 + 0.4, D / 2, D / 2 + 0.4); solid(-W / 2 - 0.4, W / 2 + 0.4, -D / 2 - 0.4, -D / 2);
  colliders.push({ minX: origin.x - W / 2, maxX: origin.x + W / 2, minZ: origin.z - D / 2, maxZ: origin.z + D / 2, minY: origin.y + H - 0.05, h: origin.y + H + 0.4, ceiling: true });

  // ---- view outside the windows (day + night skyline blended by time of day)
  const dayView = new THREE.MeshBasicMaterial({ map: skylineTex(false), fog: false });
  const nightView = new THREE.MeshBasicMaterial({ map: skylineTex(true), transparent: true, opacity: 0, fog: false, depthWrite: false });
  const v1 = add(new THREE.PlaneGeometry(60, 30), dayView, 0, 6, -D / 2 - 14, 0, { cast: false }); v1.receiveShadow = false;
  const v2 = add(new THREE.PlaneGeometry(60, 30), nightView, 0, 6, -D / 2 - 13.9, 0, { cast: false }); v2.receiveShadow = false;

  // ---- door
  const doorM = mat({ color: style.door, roughness: 0.55 });
  add(box(1.05, 2.15, 0.06, 0.01), doorM, 4.5, 1.075, D / 2 - 0.03);
  add(box(0.05, 0.05, 0.12, 0.01), mat({ color: '#c9c9c9', metalness: 1, roughness: 0.3 }), 4.1, 1.05, D / 2 - 0.09);
  add(box(1.25, 2.3, 0.04, 0), mat({ color: '#e9e5de' }), 4.5, 1.15, D / 2 - 0.005, 0, { cast: false });

  // ---- living area: rug, sofa, coffee table, TV, lamp
  const rug = add(new THREE.PlaneGeometry(3.2, 2.4), mat({ map: rugTex(style.rug, style.rug2), roughness: 1 }), -3.6, 0.004, 0, 0, { cast: false });
  rug.rotation.x = -Math.PI / 2; rug.rotation.z = Math.PI / 2;
  const sofaM = mat({ color: style.sofa, roughness: 0.95 });
  const sofa = new THREE.Group(); sofa.position.set(-2.4, 0, 0); sofa.rotation.y = -Math.PI / 2; g.add(sofa);
  const sAdd = (geo, x, y, z) => { const o = new THREE.Mesh(geo, sofaM); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; sofa.add(o); };
  sAdd(box(2.3, 0.3, 0.9, 0.06), 0, 0.22, 0);
  sAdd(box(1.08, 0.16, 0.72, 0.07), -0.55, 0.45, 0.07); sAdd(box(1.08, 0.16, 0.72, 0.07), 0.55, 0.45, 0.07);
  sAdd(box(1.08, 0.48, 0.2, 0.08), -0.55, 0.68, -0.33); sAdd(box(1.08, 0.48, 0.2, 0.08), 0.55, 0.68, -0.33);
  sAdd(box(0.2, 0.6, 0.9, 0.07), -1.2, 0.38, 0); sAdd(box(0.2, 0.6, 0.9, 0.07), 1.2, 0.38, 0);
  const pillowM = mat({ color: style.pillow, roughness: 0.95 });
  const p1 = new THREE.Mesh(box(0.42, 0.4, 0.14, 0.06), pillowM); p1.position.set(-0.85, 0.72, -0.15); p1.rotation.z = 0.2; sofa.add(p1);
  const p2 = p1.clone(); p2.position.x = 0.85; p2.rotation.z = -0.2; sofa.add(p2);
  solid(-2.9, -1.9, -1.3, 1.3, 0.8);
  const woodM = mat({ map: woodTex(style.furniture, style.seed + 3), roughness: 0.5 });
  add(box(0.6, 0.05, 1.1, 0.015), woodM, -3.8, 0.42, 0);
  for (const [x, z] of [[-4.05, -0.5], [-3.55, -0.5], [-4.05, 0.5], [-3.55, 0.5]]) add(box(0.04, 0.4, 0.04, 0), woodM, x, 0.2, z);
  add(box(0.3, 0.06, 0.22, 0.01), mat({ color: '#c94f4f' }), -3.8, 0.47, 0.2); // book on the table
  solid(-4.1, -3.5, -0.55, 0.55, 0.45);
  add(box(0.45, 0.5, 2.0, 0.02), woodM, -5.75, 0.25, 0);
  solid(-6, -5.5, -1.05, 1.05, 0.5);
  add(box(0.06, 0.92, 1.6, 0.01), mat({ color: '#0d0d0f', roughness: 0.3, metalness: 0.4 }), -5.94, 1.35, 0);
  // animated TV picture
  const tvC = document.createElement('canvas'); tvC.width = 160; tvC.height = 90;
  const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace;
  const screen = add(new THREE.PlaneGeometry(1.52, 0.86), new THREE.MeshBasicMaterial({ map: tvT, toneMapped: false }), -5.905, 1.35, 0, Math.PI / 2, { cast: false });
  void screen;
  const lampShadeM = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd59a', emissiveIntensity: 1.5, side: THREE.DoubleSide });
  add(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), mat({ color: '#222', metalness: 0.8, roughness: 0.3 }), -1.7, 0.75, -1.7);
  add(new THREE.CylinderGeometry(0.18, 0.25, 0.3, 24, 1, true), lampShadeM, -1.7, 1.55, -1.7, 0, { cast: false });
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 20), mat({ color: '#222' }), -1.7, 0.015, -1.7);

  // ---- kitchen (east wall)
  const cabM = mat({ color: style.cabinet, roughness: 0.6 });
  const topM = mat({ color: style.counter, roughness: 0.35 });
  add(box(0.62, 0.86, 5.2, 0.01), cabM, 5.69, 0.43, -1.6);
  add(box(0.66, 0.04, 5.24, 0.005), topM, 5.67, 0.88, -1.6);
  add(box(0.36, 0.7, 4.2, 0.01), cabM, 5.82, 1.85, -1.1);
  for (let i = 0; i < 6; i++) add(box(0.01, 0.02, 0.18, 0), mat({ color: '#bbb', metalness: 1, roughness: 0.3 }), 5.375, 0.75, -3.9 + i * 0.9, 0, { cast: false });
  add(box(0.42, 0.02, 0.6, 0.01), mat({ color: '#9aa0a6', metalness: 1, roughness: 0.2 }), 5.62, 0.905, -0.4, 0, { cast: false }); // sink
  add(box(0.5, 0.012, 0.6, 0.005), mat({ color: '#0b0b0b', roughness: 0.2 }), 5.62, 0.905, -2.6, 0, { cast: false }); // hob
  add(box(0.72, 1.85, 0.72, 0.03), mat({ color: '#d9dcdf', metalness: 0.6, roughness: 0.35 }), 5.62, 0.925, -4.55);
  solid(5.05, 6, -4.3, 1.05, 0.9); solid(5.2, 6, -5, -4.15, 1.9);
  // dining table + chairs
  add(box(1.2, 0.04, 0.8, 0.01), woodM, 2.2, 0.75, 1.6);
  for (const [x, z] of [[1.7, 1.3], [2.7, 1.3], [1.7, 1.9], [2.7, 1.9]]) add(box(0.04, 0.73, 0.04, 0), woodM, x, 0.365, z);
  for (const z of [0.9, 2.3]) {
    const ch = new THREE.Group(); ch.position.set(2.2, 0, z); ch.rotation.y = z > 1.6 ? Math.PI : 0; g.add(ch);
    const cm = mat({ color: style.chair, roughness: 0.7 });
    for (const [geo, x, y, zz] of [[box(0.44, 0.05, 0.44, 0.01), 0, 0.45, 0], [box(0.44, 0.45, 0.04, 0.01), 0, 0.7, -0.2]]) { const o = new THREE.Mesh(geo, cm); o.position.set(x, y, zz); o.castShadow = true; ch.add(o); }
    for (const [x, zz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) { const o = new THREE.Mesh(box(0.03, 0.45, 0.03, 0), cm); o.position.set(x, 0.225, zz); ch.add(o); }
  }
  solid(1.6, 2.8, 1.2, 2.0, 0.8);

  // ---- bed by the window
  add(box(1.75, 0.32, 2.15, 0.03), woodM, 3.4, 0.16, -3.9);
  add(box(1.62, 0.24, 2.02, 0.06), mat({ color: '#f5f3ef', roughness: 0.9 }), 3.4, 0.44, -3.9);
  add(box(1.66, 0.09, 1.45, 0.04), mat({ color: style.duvet, roughness: 0.95 }), 3.4, 0.6, -3.55);
  for (const x of [3.0, 3.8]) add(box(0.62, 0.14, 0.38, 0.06), mat({ color: '#ffffff', roughness: 0.95 }), x, 0.63, -4.62);
  add(box(1.75, 1.0, 0.08, 0.03), sofaM, 3.4, 0.7, -4.93);
  add(box(0.45, 0.5, 0.4, 0.02), woodM, 2.15, 0.25, -4.7);
  add(new THREE.SphereGeometry(0.12, 16, 12), lampShadeM, 2.15, 0.65, -4.7, 0, { cast: false });
  solid(2.5, 4.3, -5, -2.8, 0.7); solid(1.9, 2.4, -5, -4.45, 0.5);

  // ---- wardrobe
  add(box(1.3, 2.2, 0.6, 0.02), woodM, 1.9, 1.1, D / 2 - 0.32);
  add(box(0.01, 0.4, 0.02, 0), mat({ color: '#d8d8d8', metalness: 1 }), 1.9, 1.1, D / 2 - 0.62, 0, { cast: false });
  solid(1.2, 2.6, D / 2 - 0.65, D / 2, 2.2);

  // ---- personal corner
  const spots = [];
  if (style.desk) {
    // gaming desk with two monitors
    add(box(1.7, 0.04, 0.72, 0.01), mat({ color: '#141414', roughness: 0.5 }), -3.5, 0.74, D / 2 - 0.4);
    for (const x of [-4.25, -2.75]) add(box(0.05, 0.72, 0.6, 0), mat({ color: '#141414' }), x, 0.36, D / 2 - 0.4);
    const monM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#3a8dff', emissiveIntensity: 0.9 });
    const mon2 = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff4fa3', emissiveIntensity: 0.7 });
    add(box(0.62, 0.36, 0.03, 0.01), monM, -3.85, 1.1, D / 2 - 0.2, 0.15);
    add(box(0.62, 0.36, 0.03, 0.01), mon2, -3.15, 1.1, D / 2 - 0.2, -0.15);
    add(box(0.45, 0.02, 0.15, 0.005), mat({ color: '#222' }), -3.5, 0.77, D / 2 - 0.55);
    const chair = new THREE.Group(); chair.position.set(-3.5, 0, D / 2 - 1.1); g.add(chair);
    const cm = mat({ color: '#1a1a1a', roughness: 0.5 }), cr = mat({ color: '#d22d3d', roughness: 0.6 });
    for (const [geo, m, y, z] of [[box(0.5, 0.08, 0.5, 0.03), cm, 0.48, 0], [box(0.5, 0.7, 0.08, 0.04), cr, 0.9, -0.22], [new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), cm, 0.23, 0]]) { const o = new THREE.Mesh(geo, m); o.position.set(0, y, z); o.castShadow = true; chair.add(o); }
    solid(-4.35, -2.65, D / 2 - 0.8, D / 2, 0.8);
    spots.push({ name: 'desk', pos: new THREE.Vector3(-3.5, 0, D / 2 - 1.1), yaw: 0, pose: 'sit', look: new THREE.Vector3(-3.5, 1.1, D / 2), path: [[-1.2, 3.0], [-3.5, 3.0]] });
    // posters
    add(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: artTex('neon', 4) }), -5.89, 1.7, -3.2, Math.PI / 2, { cast: false });
  } else {
    // vanity with round mirror
    add(box(1.2, 0.04, 0.5, 0.01), mat({ color: '#f3efe8', roughness: 0.5 }), -3.5, 0.76, D / 2 - 0.3);
    for (const x of [-4.05, -2.95]) add(box(0.04, 0.74, 0.04, 0), mat({ color: '#d4a940', metalness: 1, roughness: 0.3 }), x, 0.37, D / 2 - 0.3);
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 40), mat({ color: '#d4a940', metalness: 1, roughness: 0.25 }), -3.5, 1.55, D / 2 - 0.03).rotation.x = Math.PI / 2;
    const mirror = add(new THREE.CircleGeometry(0.39, 40), new THREE.MeshPhysicalMaterial({ color: '#dfe8ee', metalness: 1, roughness: 0.05 }), -3.5, 1.55, D / 2 - 0.05, Math.PI, { cast: false });
    void mirror;
    for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10), mat({ color: ['#f2a3b8', '#d4a940', '#ffffff', '#8a5ab8'][i] }), -3.85 + i * 0.12, 0.83, D / 2 - 0.3, 0, { cast: false });
    solid(-4.15, -2.85, D / 2 - 0.6, D / 2, 0.8);
    spots.push({ name: 'mirror', pos: new THREE.Vector3(-3.5, 0, D / 2 - 0.95), yaw: 0, pose: 'stand', look: new THREE.Vector3(-3.5, 1.55, D / 2), gesture: true, path: [[-1.2, 3.0], [-3.5, 3.0]] });
    add(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ map: artTex('waves', 5) }), -5.89, 1.7, -3.2, Math.PI / 2, { cast: false });
  }
  add(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshStandardMaterial({ map: artTex('sunset', 3) }), 0.0, 1.6, D / 2 - 0.01, Math.PI, { cast: false });
  // plants
  const potM = mat({ color: '#e8e2d8', roughness: 0.7 }), leafM = mat({ color: '#3f7a3a', roughness: 0.8, side: THREE.DoubleSide });
  for (const [x, z, s] of [[-5.4, -4.4, 1.2], [-1.0, 4.4, 1.0], [0.6, -4.5, 0.9], [5.4, 3.6, 1.1]]) {
    add(new THREE.CylinderGeometry(0.2 * s, 0.16 * s, 0.4 * s, 16), potM, x, 0.2 * s, z);
    const r = rng(Math.round(x * 13 + z * 7));
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), leafM);
      const a = (i / 9) * Math.PI * 2;
      leaf.scale.set(0.07 * s, 0.32 * s, 0.025 * s);
      leaf.position.set(x + Math.cos(a) * 0.12 * s, (0.62 + r() * 0.35) * s, z + Math.sin(a) * 0.12 * s);
      leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      leaf.castShadow = true; g.add(leaf);
    }
    solid(x - 0.25 * s, x + 0.25 * s, z - 0.25 * s, z + 0.25 * s, 0.8);
  }

  // ---- activity spots for the resident (local coords; paths go via the open centre of the room)
  spots.push(
    { name: 'sofa', pos: new THREE.Vector3(-2.3, 0, 0.45), yaw: -Math.PI / 2, pose: 'sit', look: new THREE.Vector3(-5.9, 1.3, 0), path: [[-0.8, 1.9], [-3.1, 1.9], [-3.1, 0.45]] },
    { name: 'window', pos: new THREE.Vector3(-0.3, 0, -4.2), yaw: Math.PI, pose: 'stand', look: new THREE.Vector3(-0.3, 1.6, -20), path: [[0.2, -2.0]] },
    { name: 'kitchen', pos: new THREE.Vector3(4.65, 0, -1.4), yaw: Math.PI / 2, pose: 'stand', look: new THREE.Vector3(5.7, 0.95, -1.4), gesture: true, path: [[3.8, -0.4]] },
  );
  for (const s of spots) { s.world = s.pos.clone().add(origin); s.lookW = s.look.clone().add(origin); s.pathW = (s.path || []).map(([x, z]) => new THREE.Vector3(x, 0, z).add(origin)); }

  const hub = new THREE.Vector3(0.6, 0, 1.0).add(origin);
  const apt = {
    group: g, colliders, spots, hub, origin: origin.clone(),
    bounds: { minX: origin.x - W / 2, maxX: origin.x + W / 2, minZ: origin.z - D / 2, maxZ: origin.z + D / 2, y: origin.y },
    entry: new THREE.Vector3(4.5, 0, D / 2 - 0.9).add(origin), // where you appear when coming in
    exit: new THREE.Vector3(4.5, 0, D / 2 - 0.45).add(origin),
    wardrobe: new THREE.Vector3(1.9, 0, D / 2 - 1.0).add(origin),
    lights: [new THREE.Vector3(-3, H - 0.4, 0).add(origin), new THREE.Vector3(2.8, H - 0.4, -1.5).add(origin)],
    update(dt, dayAmount) {
      nightView.opacity = 1 - dayAmount;
      // simple animated TV picture
      apt.tvT = (apt.tvT || 0) + dt;
      if ((apt.tvF = (apt.tvF || 0) + dt) > 0.12) {
        apt.tvF = 0;
        const x = tvC.getContext('2d'), t = apt.tvT;
        const gr = x.createLinearGradient(0, 0, 160, 90);
        gr.addColorStop(0, `hsl(${(t * 20) % 360},70%,45%)`); gr.addColorStop(1, `hsl(${(t * 20 + 120) % 360},70%,30%)`);
        x.fillStyle = gr; x.fillRect(0, 0, 160, 90);
        x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(80 + Math.sin(t) * 40, 50 + Math.cos(t * 1.3) * 15, 12, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 74, 160, 16);
        tvT.needsUpdate = true;
      }
    },
  };
  return apt;
}
