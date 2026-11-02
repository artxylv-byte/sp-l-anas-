// Procedural, fully customisable 3D humans (body, face, hair, layered clothing).
import * as THREE from 'three';
import * as TX from './textures.js';

// ------------------------------------------------------------------ options
export const OPTIONS = {
  hairStyle: [['bald', 'Bald'], ['buzz', 'Buzz Cut'], ['crop', 'Short Crop'], ['quiff', 'Quiff'], ['curly', 'Curly Top'],
    ['afro', 'Afro'], ['bob', 'Bob'], ['long', 'Long Straight'], ['wavy', 'Long Wavy'], ['ponytail', 'Ponytail'], ['bun', 'Top Bun']],
  facialHair: [['none', 'None'], ['stubble', 'Stubble'], ['mustache', 'Mustache'], ['beard', 'Full Beard']],
  top: [['tshirt', 'T-Shirt'], ['tshirt_print', 'Graphic Tee'], ['longsleeve', 'Long Sleeve'], ['tank', 'Tank Top'],
    ['lace', 'Lace Top'], ['shirt', 'Button Shirt']],
  outer: [['none', 'None'], ['hoodie', 'Hoodie'], ['ziphoodie', 'Zip Hoodie (open)'], ['bomber', 'Bomber Jacket'],
    ['denim', 'Denim Jacket'], ['leather', 'Leather Jacket'], ['vest', 'Puffer Vest']],
  bottom: [['jeans', 'Jeans'], ['joggers', 'Joggers'], ['wide', 'Wide-Leg Pants'], ['cargo', 'Cargo Pants'],
    ['shorts', 'Shorts'], ['skirt', 'Skirt + Leggings'], ['leggings', 'Leggings']],
  shoes: [['sneakers', 'Sneakers'], ['hightops', 'High-Tops'], ['boots', 'Boots'], ['flats', 'Flats']],
  hat: [['none', 'None'], ['cap', 'Cap'], ['backcap', 'Cap (backwards)'], ['beanie', 'Beanie']],
};

export const PALETTES = {
  skin: ['#fbe0cf', '#f1c9ae', '#e9b796', '#d9a07a', '#c68a62', '#a86c45', '#8a5432', '#6b3e22', '#4a2a17'],
  eyes: ['#4a3020', '#6b4a2b', '#8a6a3a', '#3f6c3a', '#5f8a5a', '#3b6fa8', '#7aa7d6', '#6e7a80', '#2a1a10'],
  hair: ['#0f0c0b', '#2a1c14', '#3a2a1f', '#5a3d27', '#8b6b4c', '#b08a5e', '#d8bc85', '#ece0b8', '#8c3b1e',
    '#b5532a', '#9a9a9a', '#e8e8e8', '#d65a9a', '#3d6fd6', '#2fa36b'],
  cloth: ['#111111', '#2b2b2b', '#5a5a5a', '#9a9a9a', '#f3f3f3', '#e8e1d2', '#c9b38f', '#7a5a3a', '#3b4a2a',
    '#1e2a4a', '#3d6fd6', '#7fb2e6', '#a3242c', '#e0524d', '#f2a3b8', '#8a5ab8', '#f2c94c', '#2fa36b'],
  lips: ['#c98378', '#d58f86', '#b56a62', '#a35560', '#c25b6e', '#8e4a45'],
  metal: ['#d4a940', '#cfd2d6', '#b87333', '#1a1a1a', '#a3242c', '#3d6fd6'],
};

export const DEFAULTS = {
  arturs: {
    name: 'Arturs', gender: 'male', height: 181, build: 0.72, muscle: 0.35, shoulders: 0.55,
    skin: '#efc4a8', eyes: '#6b4a2b', eyeSize: 0.5, noseSize: 0.55, lipColor: '#c98378',
    hairStyle: 'crop', hairColor: '#3a2a1f', brows: 0.75, facialHair: 'none',
    top: 'tshirt_print', topColor: '#141414', outer: 'none', outerColor: '#2b2b2b',
    bottom: 'joggers', bottomColor: '#151515', shoes: 'sneakers', shoesColor: '#1b1b1b',
    hat: 'none', hatColor: '#222222',
    watch: true, watchColor: '#1a1a1a', necklace: false, necklaceColor: '#cfd2d6',
    bracelet: true, braceletColor: '#a3242c', glasses: false, earrings: false, earringColor: '#cfd2d6',
  },
  paula: {
    name: 'Paula', gender: 'female', height: 166, build: 0.42, muscle: 0.15, shoulders: 0.4,
    skin: '#f1c9ae', eyes: '#4a3020', eyeSize: 0.55, noseSize: 0.4, lipColor: '#c98378',
    hairStyle: 'long', hairColor: '#8b6b4c', brows: 0.55, facialHair: 'none',
    top: 'lace', topColor: '#111111', outer: 'none', outerColor: '#d9cbb8',
    bottom: 'wide', bottomColor: '#e8e1d2', shoes: 'sneakers', shoesColor: '#f3f3f3',
    hat: 'none', hatColor: '#eeeeee',
    watch: false, watchColor: '#cfd2d6', necklace: true, necklaceColor: '#d4a940',
    bracelet: true, braceletColor: '#cfd2d6', glasses: false, earrings: true, earringColor: '#cfd2d6',
  },
};

export function randomAppearance(r = Math.random, gender) {
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const g = gender || (r() < 0.5 ? 'male' : 'female');
  const f = g === 'female';
  const hairM = ['buzz', 'crop', 'quiff', 'curly', 'afro', 'bald', 'crop'];
  const hairF = ['long', 'wavy', 'ponytail', 'bun', 'bob', 'curly', 'long'];
  return {
    ...DEFAULTS[f ? 'paula' : 'arturs'],
    name: 'NPC', gender: g,
    height: f ? 155 + r() * 20 : 165 + r() * 25,
    build: 0.2 + r() * 0.7, muscle: r() * 0.6, shoulders: r(),
    skin: pick(PALETTES.skin), eyes: pick(PALETTES.eyes), eyeSize: r(), noseSize: r(),
    hairStyle: pick(f ? hairF : hairM), hairColor: pick(PALETTES.hair.slice(0, 11)),
    brows: 0.4 + r() * 0.5,
    facialHair: f ? 'none' : pick(['none', 'none', 'stubble', 'beard', 'mustache']),
    top: pick(OPTIONS.top)[0], topColor: pick(PALETTES.cloth),
    outer: r() < 0.5 ? 'none' : pick(OPTIONS.outer)[0], outerColor: pick(PALETTES.cloth),
    bottom: pick(OPTIONS.bottom)[0], bottomColor: pick(PALETTES.cloth),
    shoes: pick(OPTIONS.shoes)[0], shoesColor: pick(PALETTES.cloth),
    hat: r() < 0.2 ? pick(['cap', 'beanie', 'backcap']) : 'none', hatColor: pick(PALETTES.cloth),
    watch: r() < 0.3, necklace: r() < 0.2, bracelet: r() < 0.2, glasses: r() < 0.2, earrings: f && r() < 0.5,
  };
}

// ------------------------------------------------------------------ geometry helpers
const v2 = (x, y) => new THREE.Vector2(x, y);
const BASE_HEIGHT = 177; // cm of the un-scaled skeleton
const WX = 1.12, DZ = 0.7; // torso cross-section ellipse

function sampleProfile(ctrl) {
  const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => v2(r, y)));
  return curve.getSpacedPoints(160);
}
function rAtY(pts, y) {
  if (y <= pts[0].y) return pts[0].x;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (y >= a.y && y <= b.y) { const t = (y - a.y) / ((b.y - a.y) || 1); return a.x + (b.x - a.x) * t; }
  }
  return pts[pts.length - 1].x;
}

function bodyParams(a) {
  const f = a.gender === 'female';
  const b = a.build, m = a.muscle, sh = a.shoulders ?? 0.5;
  const ctrl = f
    ? [[0, -0.135], [0.112, -0.122], [0.17, -0.07], [0.18, -0.005], [0.168, 0.07], [0.136, 0.165], [0.14, 0.245],
      [0.156, 0.325], [0.152, 0.4], [0.146, 0.452], [0.108, 0.498], [0.055, 0.522], [0, 0.528]]
    : [[0, -0.135], [0.108, -0.122], [0.156, -0.07], [0.163, -0.005], [0.157, 0.07], [0.15, 0.165], [0.158, 0.245],
      [0.171, 0.325], [0.176, 0.4], [0.169, 0.452], [0.12, 0.498], [0.06, 0.522], [0, 0.528]];
  const k = 1 + (b - 0.5) * 0.26;
  const scaled = ctrl.map(([r, y]) => {
    let rr = r * k;
    if (y > 0.0 && y < 0.26) rr += (b - 0.5) * 0.035 * Math.sin(((y) / 0.26) * Math.PI);
    if (y > 0.28 && y < 0.47) rr += (m * (f ? 0.008 : 0.016) + (sh - 0.5) * 0.02) * Math.sin(((y - 0.28) / 0.19) * Math.PI);
    return [rr, y];
  });
  const prof = sampleProfile(scaled);
  const lk = 1 + (b - 0.5) * 0.3;
  const mk = 1 + m * 0.18;
  return {
    f, prof, b, m,
    bust: f ? 0.6 : 0,
    ru: (t) => (0.046 - 0.008 * t + 0.006 * Math.sin(t * Math.PI) * mk) * lk * (f ? 0.88 : 1) * mk,
    rf: (t) => (0.039 - 0.011 * t + 0.004 * Math.sin(t * Math.PI * 0.8)) * lk * (f ? 0.88 : 1) * (1 + m * 0.1),
    rt: (t) => (0.084 - 0.03 * t + (f ? 0.006 : 0)) * lk,
    rs: (t) => (0.05 + 0.012 * Math.sin(Math.min(1, t * 1.6) * Math.PI) - 0.017 * t) * lk,
    Lu: 0.29, Lf: 0.26, Lt: 0.45, Ls: 0.43,
  };
}

// torso-shaped lathe (body or garment)
function torsoGeo(B, y0, y1, off, { phiStart = 0, phiLength = Math.PI * 2, steps = 40, closeBottom = false, flare = 0, seg = 44 } = {}) {
  const pts = [];
  if (closeBottom) pts.push(v2(0.0005, y0 - 0.002));
  for (let i = 0; i <= steps; i++) {
    const y = y0 + (y1 - y0) * (i / steps);
    let r = rAtY(B.prof, y) + off;
    if (flare) r += flare * Math.max(0, 1 - (y - y0) / (y1 - y0)) ** 2;
    pts.push(v2(Math.max(r, 0.0005), y));
  }
  const g = new THREE.LatheGeometry(pts, seg, phiStart, phiLength);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    x *= WX; z *= DZ;
    if (B.bust && z > 0) {
      const lobe = Math.exp(-(((Math.abs(x) - 0.072) / 0.06) ** 2)) * Math.exp(-(((y - 0.33) / 0.065) ** 2));
      z += 0.03 * B.bust * lobe;
    }
    if (z < 0 && y < 0.05 && y > -0.13) z -= 0.014 * Math.exp(-(((y + 0.04) / 0.05) ** 2)); // seat
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// tapered limb hanging down from its pivot (y: 0 .. -L)
function limbGeo(L, rfn, { t0 = 0, t1 = 1, off = 0, capTop = true, capBot = true, seg = 20, zs = 1 } = {}) {
  const pts = [];
  const rb = rfn(t1) + off, rt = rfn(t0) + off;
  if (capBot) for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI / 2; pts.push(v2(Math.sin(a) * rb, -L * t1 - Math.cos(a) * rb * 0.7)); }
  const n = 18;
  for (let i = 0; i <= n; i++) { const t = t1 + (t0 - t1) * (i / n); pts.push(v2(Math.max(0.001, rfn(t) + off), -L * t)); }
  if (capTop) for (let k = 4; k >= 0; k--) { const a = (k / 5) * Math.PI / 2; pts.push(v2(Math.max(0.0005, Math.sin(a) * rt), -L * t0 + Math.cos(a) * rt * 0.7)); }
  const g = new THREE.LatheGeometry(pts, seg);
  if (zs !== 1) g.scale(1, 1, zs);
  g.computeVertexNormals();
  return g;
}

// parametric sheet helper fn(u,v) -> Vector3
function sheetGeo(fn, nu, nv) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    const p = fn(u, v);
    pos.push(p.x, p.y, p.z); uv.push(u * 2, 1 - v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function taperTube(points, rfn, seg = 24, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(seg, false);
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, P = curve.getPointAt(t), N = frames.normals[i], Bn = frames.binormals[i];
    const r = rfn(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a), sx = Math.sin(a);
      pos.push(P.x + r * (cx * N.x + sx * Bn.x), P.y + r * (cx * N.y + sx * Bn.y), P.z + r * (cx * N.z + sx * Bn.z));
      uv.push(j / radial, 1 - t);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Head ellipsoid (head-local, centre 0,0,0, face toward +z)
const HX = 0.074, HY = 0.112, HZ = 0.096;
function headDeform(x, y, z) {
  // x,y,z on unit sphere -> head shape
  let X = x * HX, Y = y * HY, Z = z * HZ;
  if (y < 0) { const k = 1 - 0.3 * Math.min(1, -y * 1.2); X *= k; Z *= 1 - 0.08 * -y; if (z > 0) Z += 0.006 * -y; }
  if (z > 0.3 && y > -0.2 && y < 0.5) Z *= 0.985;
  return [X, Y, Z];
}
function headGeo() {
  const g = new THREE.SphereGeometry(1, 48, 36);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [x, y, z] = headDeform(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
  g.computeVertexNormals();
  return g;
}
function headSurfaceZ(x, y) {
  // approximate z of face surface at head-local (x,y)
  const nx = x / HX, ny = y / HY; let k = 1;
  if (ny < 0) k = 1 - 0.3 * Math.min(1, -ny * 1.2);
  const nxx = nx / k;
  const s = 1 - nxx * nxx - ny * ny;
  return s > 0 ? Math.sqrt(s) * HZ * 0.985 : 0;
}

// Hair cap: sphere hugging the skull above a hairline
function hairCapGeo({ front = 0.5, side = 0.0, back = -0.45, vol = 1.08, top = 1.0, part = 0, fringe = 0 }) {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z);
    const fr = (Math.cos(a) + 1) / 2;
    const sd = Math.abs(Math.sin(a));
    let hl = back + (front - back) * fr - side * sd * sd;
    if (fringe && fr > 0.75) hl -= fringe * (fr - 0.75) * 4;
    if (y < hl) { y = hl; const k = Math.sqrt(Math.max(0, 1 - y * y)) / (Math.hypot(x, z) || 1); x *= k; z *= k; }
    let [X, Y, Z] = headDeform(x, y, z);
    const v = vol + (y > 0 ? (top - 1) * y * 0.4 : 0);
    X *= v; Z *= v; Y = Y * (y > 0 ? v * (1 + (top - 1) * 0.3) : vol);
    if (part && y > 0.6 && Math.abs(x) < 0.05 && z > -0.2) Y -= 0.003; // centre parting groove
    p.setXYZ(i, X, Y + 0.004, Z - 0.002);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ material cache
const matCache = new Map();
function getMat(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }

function fabricMat(color, kind = 'cotton', extra = {}) {
  const key = `fab|${color}|${kind}|${JSON.stringify(extra)}`;
  return getMat(key, () => {
    const map = kind === 'lace' ? TX.laceTexture() : TX.fabricTexture(kind);
    const m = new THREE.MeshStandardMaterial({
      color, map, roughness: kind === 'leather' ? 0.38 : kind === 'puffer' ? 0.55 : 0.88,
      metalness: 0, side: THREE.DoubleSide, ...extra,
    });
    if (kind === 'lace') { m.alphaTest = 0.5; }
    return m;
  });
}

// ------------------------------------------------------------------ Human
export class Human {
  constructor(appearance, { detail = 'high' } = {}) {
    this.detail = detail;
    this.root = new THREE.Group();
    this.phase = Math.random() * 10;
    this.idleT = Math.random() * 10;
    this.anim = { speed: 0, air: false, sit: false, wave: 0 };
    this.setAppearance(appearance);
  }

  dispose() {
    this.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    this.root.clear();
  }

  setAppearance(a) {
    this.a = { ...a };
    this.dispose();
    this.build();
  }

  _add(parent, geo, mat, { cast = true, pos, rot, scale } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast; m.receiveShadow = true;
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    parent.add(m);
    return m;
  }

  build() {
    const a = this.a, B = (this.B = bodyParams(a));
    const add = this._add.bind(this);
    const hi = this.detail === 'high';

    const skin = getMat('skin' + a.skin, () => new THREE.MeshPhysicalMaterial({
      color: a.skin, roughness: 0.52, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ff8a6a'),
    }));

    // --- skeleton
    const body = new THREE.Group(); // scaled by height
    const s = a.height / BASE_HEIGHT;
    body.scale.setScalar(s);
    this.root.add(body);
    this.body = body;
    const hipY = B.Lt + B.Ls + 0.08;
    const hips = new THREE.Group(); hips.position.y = hipY; body.add(hips);
    const spine = new THREE.Group(); hips.add(spine);
    const chest = new THREE.Group(); chest.position.y = 0.2; spine.add(chest); // upper body pivot
    const neck = new THREE.Group(); neck.position.y = 0.49 - 0.2; chest.add(neck);
    const head = new THREE.Group(); head.position.y = 0.115; neck.add(head);
    const shoulderX = rAtY(B.prof, 0.4) * WX + 0.008;
    const hipW = rAtY(B.prof, -0.005) * WX;
    const armOut = Math.max(0.05, Math.asin(Math.min(0.5, (hipW + 0.052 - shoulderX) / 0.5)));
    const mkArm = (side) => {
      const sh = new THREE.Group(); sh.position.set(side * shoulderX, 0.43 - 0.2, 0); chest.add(sh);
      sh.userData.restZ = side * armOut;
      const el = new THREE.Group(); el.position.y = -B.Lu; sh.add(el);
      const hand = new THREE.Group(); hand.position.y = -B.Lf; el.add(hand);
      return { sh, el, hand };
    };
    const mkLeg = (side) => {
      const th = new THREE.Group(); th.position.set(side * (B.f ? 0.088 : 0.086) * (1 + (B.b - 0.5) * 0.25), -0.03, 0); hips.add(th);
      const kn = new THREE.Group(); kn.position.y = -B.Lt; th.add(kn);
      const ft = new THREE.Group(); ft.position.y = -B.Ls; kn.add(ft);
      return { th, kn, ft };
    };
    const L = { arm: mkArm(1), leg: mkLeg(1) }, R = { arm: mkArm(-1), leg: mkLeg(-1) };
    this.sk = { hips, spine, chest, neck, head, L, R, hipY };

    // --- body skin
    // lower torso (pelvis) on hips, upper torso on chest pivot (two pieces overlapping at the waist)
    add(hips, torsoGeo(B, -0.135, 0.24, 0, { closeBottom: true }), skin);
    const up = torsoGeo(B, 0.15, 0.53, 0); up.translate(0, -0.2, 0); add(chest, up, skin);
    add(neck, limbGeo(0.13, () => (B.f ? 0.041 : 0.049) * (1 + (B.b - 0.5) * 0.2), { capBot: false, capTop: false }).translate(0, 0.11, 0), skin);
    for (const side of [L, R]) {
      add(side.arm.sh, limbGeo(B.Lu, B.ru), skin);
      add(side.arm.el, limbGeo(B.Lf, B.rf), skin);
      // hand
      const hs = B.f ? 0.9 : 1;
      add(side.arm.hand, new THREE.SphereGeometry(1, 16, 12), skin, { pos: [0, -0.05 * hs, 0.004], scale: [0.017 * hs, 0.05 * hs, 0.036 * hs] });
      add(side.arm.hand, new THREE.CapsuleGeometry(0.009 * hs, 0.03 * hs, 4, 8), skin, { pos: [0, -0.04 * hs, 0.034 * hs], rot: [0.5, 0, 0] });
      add(side.leg.th, limbGeo(B.Lt, B.rt, { zs: 0.95 }), skin);
      add(side.leg.kn, limbGeo(B.Ls, B.rs, { zs: 0.95 }), skin);
    }

    this.buildHead(head, skin, B, hi);
    this.buildClothes(B, { hips, chest, neck, head, L, R });
  }

  buildHead(head, skin, B, hi) {
    const a = this.a, add = this._add.bind(this);
    add(head, headGeo(), skin);
    // ears
    for (const sx of [1, -1]) add(head, new THREE.SphereGeometry(1, 12, 10), skin, { pos: [sx * 0.072, 0.0, -0.005], scale: [0.009, 0.023, 0.015] });
    // nose
    const ns = 0.7 + (a.noseSize ?? 0.5) * 0.3;
    const nz = headSurfaceZ(0, -0.012);
    add(head, new THREE.SphereGeometry(1, 16, 12), skin, { pos: [0, -0.004, nz - 0.006], scale: [0.0085 * ns, 0.026 * ns, 0.012 * ns], rot: [-0.3, 0, 0] });
    add(head, new THREE.SphereGeometry(1, 14, 10), skin, { pos: [0, -0.024, nz + 0.004], scale: [0.0095 * ns, 0.0085 * ns, 0.0085 * ns] });
    for (const sx of [1, -1]) add(head, new THREE.SphereGeometry(1, 10, 8), skin, { pos: [sx * 0.0085 * ns, -0.026, nz - 0.001], scale: [0.0065 * ns, 0.005 * ns, 0.006 * ns] });
    // lips
    const lipMat = getMat('lip' + a.lipColor, () => new THREE.MeshStandardMaterial({ color: a.lipColor, roughness: 0.45 }));
    const lz = headSurfaceZ(0, -0.048);
    const lw = B.f ? 0.019 : 0.021;
    add(head, new THREE.SphereGeometry(1, 16, 10), lipMat, { pos: [0, -0.0455, lz - 0.003], scale: [lw, 0.0034, 0.0065] });
    add(head, new THREE.SphereGeometry(1, 16, 10), lipMat, { pos: [0, -0.0515, lz - 0.004], scale: [lw * 0.88, B.f ? 0.0046 : 0.004, 0.0065] });
    // eyes
    const es = 0.9 + (a.eyeSize ?? 0.5) * 0.2;
    const white = getMat('eyewhite', () => new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.15 }));
    const irisMat = getMat('iris' + a.eyes, () => new THREE.MeshStandardMaterial({ map: TX.irisTexture(a.eyes), roughness: 0.1, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
    const browCol = new THREE.Color(a.hairColor).multiplyScalar(0.7);
    const browMat = getMat('brow' + browCol.getHexString(), () => new THREE.MeshStandardMaterial({ color: browCol, roughness: 0.9 }));
    const lash = getMat('lash', () => new THREE.MeshStandardMaterial({ color: '#120c08', roughness: 0.8 }));
    this.eyes = [];
    for (const sx of [1, -1]) {
      const ex = sx * 0.03, ey = 0.012;
      const ez = headSurfaceZ(ex, ey) - 0.0095;
      const eye = new THREE.Group(); eye.position.set(ex, ey, ez); head.add(eye);
      const er = 0.0112 * es;
      add(eye, new THREE.SphereGeometry(er, 20, 14), white, { cast: false });
      const iris = add(eye, new THREE.CircleGeometry(er * 0.55, 24), irisMat, { cast: false, pos: [0, 0, er * 0.985] });
      iris.scale.setScalar(1);
      // eyelids (skin) – upper lid covers top of eyeball, blinks
      const lid = add(eye, new THREE.SphereGeometry(er * 1.12, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), skin, { cast: false, rot: [-0.35, 0, 0] });
      add(eye, new THREE.SphereGeometry(er * 1.1, 20, 6, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), skin, { cast: false, rot: [0.25, 0, 0] });
      // lash line
      add(eye, new THREE.TorusGeometry(er * 1.1, 0.0011 * (B.f ? 1.6 : 1), 4, 20, Math.PI * 0.8), lash, { cast: false, rot: [0, 0, Math.PI * 0.1], pos: [0, 0.0012, 0.0015] }).rotation.set(-0.2, 0, Math.PI * 0.1);
      this.eyes.push({ lid, eye });
      // brow
      const bw = a.brows ?? 0.6;
      const brow = add(head, new THREE.CapsuleGeometry(0.0022 + bw * 0.0022, 0.022, 4, 8), browMat, { cast: false });
      brow.position.set(sx * 0.031, 0.033, headSurfaceZ(sx * 0.031, 0.033) + 0.001);
      brow.rotation.set(0, sx * 0.3, Math.PI / 2 + sx * (B.f ? 0.12 : 0.05));
      brow.scale.set(1, 1, 0.6);
    }
    this.buildHair(head, B);
    this.buildFacialHair(head, B);
  }

  buildHair(head, B) {
    const a = this.a, add = this._add.bind(this), st = a.hairStyle;
    if (st === 'bald') return;
    const col = new THREE.Color(a.hairColor).multiplyScalar(1.15);
    const hm = getMat('hair' + col.getHexString(), () => new THREE.MeshStandardMaterial({ color: col, map: TX.hairTexture(false), roughness: 0.62, side: THREE.DoubleSide }));
    const hs = getMat('hairS' + col.getHexString(), () => new THREE.MeshStandardMaterial({ color: col, map: TX.hairTexture(true), roughness: 0.62, side: THREE.DoubleSide, alphaTest: 0.35 }));
    const capOpts = {
      buzz: { front: 0.5, side: 0.05, back: -0.42, vol: 1.025 },
      crop: { front: 0.56, side: 0.12, back: -0.42, vol: 1.07, top: 1.1 },
      quiff: { front: 0.5, side: 0.1, back: -0.4, vol: 1.06 },
      curly: { front: 0.45, side: 0.1, back: -0.42, vol: 1.08 },
      afro: { front: 0.45, side: 0.0, back: -0.42, vol: 1.1 },
      bob: { front: 0.52, side: 0.45, back: -0.2, vol: 1.1, part: 1 },
      long: { front: 0.52, side: 0.45, back: -0.2, vol: 1.08, part: 1 },
      wavy: { front: 0.52, side: 0.45, back: -0.2, vol: 1.11, part: 1 },
      ponytail: { front: 0.55, side: 0.15, back: -0.4, vol: 1.05 },
      bun: { front: 0.55, side: 0.15, back: -0.4, vol: 1.05 },
    }[st];
    const hatOn = a.hat !== 'none';
    this.hairCap = add(head, hairCapGeo(capOpts), hm);
    if (st === 'quiff' && !hatOn) {
      add(head, new THREE.SphereGeometry(1, 20, 14), hm, { pos: [0, 0.085, 0.045], scale: [0.06, 0.04, 0.06], rot: [-0.5, 0, 0] });
    }
    if (st === 'crop' && !hatOn) {
      add(head, new THREE.SphereGeometry(1, 20, 14), hm, { pos: [0, 0.084, 0.03], scale: [0.06, 0.026, 0.05], rot: [-0.2, 0, 0] });
    }
    if (st === 'curly' && !hatOn) {
      const r = TX.rng(5);
      for (let i = 0; i < 46; i++) {
        const th = r() * Math.PI * 0.42, ph = r() * Math.PI * 2;
        const [x, y, z] = headDeform(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
        add(head, new THREE.IcosahedronGeometry(0.02 + r() * 0.008, 1), hm, { pos: [x * 1.12, y * 1.1, z * 1.12] });
      }
    }
    if (st === 'afro' && !hatOn) {
      add(head, new THREE.IcosahedronGeometry(1, 3), hm, { pos: [0, 0.04, -0.015], scale: [0.125, 0.12, 0.13] });
    }
    if (st === 'bun') add(head, new THREE.SphereGeometry(0.042, 18, 14), hm, { pos: [0, hatOn ? 0.04 : 0.105, -0.07] });
    if (st === 'ponytail') {
      const pts = [new THREE.Vector3(0, 0.05, -0.1), new THREE.Vector3(0, 0.02, -0.135), new THREE.Vector3(0, -0.08, -0.14), new THREE.Vector3(0, -0.2, -0.12), new THREE.Vector3(0, -0.28, -0.11)];
      this.pony = add(head, taperTube(pts, (t) => 0.02 + 0.016 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.8) - 0.012 * t), hm);
      add(head, new THREE.TorusGeometry(0.018, 0.005, 6, 14), getMat('band', () => new THREE.MeshStandardMaterial({ color: '#222' })), { pos: [0, 0.035, -0.125], rot: [1.2, 0, 0] });
    }
    if (st === 'bob' || st === 'long' || st === 'wavy') {
      const Lh = st === 'bob' ? 0.15 : 0.52;
      const wavy = st === 'wavy' ? 1 : 0;
      const vol = capOpts.vol;
      // back/side sheet
      const back = sheetGeo((u, v) => {
        const spread = st === 'bob' ? 4.2 - v * 0.2 : 4.0 - Math.min(1, v * 2.2) * 1.6;
        const th = Math.PI + (u - 0.5) * spread;
        const y = 0.075 - v * (Lh + 0.04);
        const grow = Math.min(1, v * 2.4);
        let rx = (HX * vol + 0.004) * Math.sqrt(Math.max(0.55, 1 - Math.max(0, y / HY) ** 2)) + grow * (st === 'bob' ? 0.014 : 0.05) + wavy * 0.012 * Math.sin(v * 18 + u * 6);
        let rz = (HZ * vol + 0.003) * Math.sqrt(Math.max(0.55, 1 - Math.max(0, y / HY) ** 2)) + grow * (st === 'bob' ? 0.012 : 0.045);
        const zoff = -grow * (st === 'bob' ? 0.004 : 0.035);
        const clump = 0.004 * Math.sin(u * 60) * v;
        return new THREE.Vector3(Math.sin(th) * (rx + clump), y, Math.cos(th) * (rz + clump) + zoff);
      }, 40, 24);
      add(head, back, hs);
      if (st !== 'bob') {
        // front curtains falling over the shoulders
        for (const sx of [1, -1]) {
          const path = [[0.07, 0.04, 0.03], [0.085, -0.06, 0.035], [0.11, -0.18, 0.1], [0.12, -0.3, 0.135], [0.12, -0.42, 0.13]];
          const curve = new THREE.CatmullRomCurve3(path.map(([x, y, z]) => new THREE.Vector3(x * sx, y, z)));
          const g = sheetGeo((u, v) => {
            const c = curve.getPointAt(v * 0.95);
            const w = 0.05 + v * 0.035;
            const d = new THREE.Vector3(1, 0, -1.1 + v * 0.8).normalize();
            const off = (u - 0.5) * w;
            return new THREE.Vector3(c.x + d.x * off * sx + wavy * 0.01 * Math.sin(v * 16) * sx, c.y, c.z + d.z * off + 0.004 * Math.sin(u * 30));
          }, 10, 20);
          add(head, g, hs);
        }
      }
    }
  }

  buildFacialHair(head, B) {
    const a = this.a, add = this._add.bind(this), fh = a.facialHair;
    if (!fh || fh === 'none') return;
    const col = new THREE.Color(a.hairColor).multiplyScalar(0.85);
    const m = getMat('fh' + fh + col.getHexString(), () => new THREE.MeshStandardMaterial({
      color: col, map: TX.hairTexture(false), roughness: 0.8, transparent: fh === 'stubble', opacity: fh === 'stubble' ? 0.45 : 1, depthWrite: fh !== 'stubble',
    }));
    if (fh === 'mustache') {
      const z = headSurfaceZ(0, -0.037);
      add(head, new THREE.CapsuleGeometry(0.0045, 0.03, 4, 8), m, { pos: [0, -0.037, z + 0.003], rot: [0, 0, Math.PI / 2] });
      return;
    }
    const g = new THREE.SphereGeometry(1, 40, 24, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.52, Math.PI * 0.48);
    const p = g.attributes.position;
    const vol = fh === 'beard' ? 1.09 : 1.012;
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = headDeform(p.getX(i), p.getY(i), p.getZ(i));
      p.setXYZ(i, x * vol, y * (fh === 'beard' ? 1.06 : 1.01), z * vol);
    }
    g.rotateY(-Math.PI / 2 + Math.PI); // sphere phi 0 is -x, rotate so arc faces +z
    g.computeVertexNormals();
    add(head, g, m, { cast: false });
  }

  buildClothes(B, S) {
    const a = this.a, add = this._add.bind(this);
    const arms = [S.L.arm, S.R.arm], legs = [S.L.leg, S.R.leg];
    let topOff = 0.009;

    // ---------------- bottoms
    const bk = a.bottom;
    const bKind = bk === 'jeans' ? 'denim' : (bk === 'leggings' || bk === 'skirt') ? 'knit' : 'cotton';
    const bm = bk === 'skirt' ? fabricMat('#1a1a1a', 'knit') : fabricMat(a.bottomColor, bKind);
    const pOff = { jeans: 0.01, joggers: 0.016, wide: 0.02, cargo: 0.018, shorts: 0.014, skirt: 0.004, leggings: 0.004 }[bk];
    add(S.hips, torsoGeo(B, -0.134, 0.085, pOff, { closeBottom: true }), bm);
    add(S.hips, torsoGeo(B, 0.06, 0.09, pOff + 0.006), fabricMat(bk === 'skirt' ? a.bottomColor : a.bottomColor, 'knit'));
    for (const lg of legs) {
      if (bk === 'shorts') {
        add(lg.th, limbGeo(B.Lt, (t) => B.rt(t) + 0.012 + t * 0.012, { t1: 0.55, off: pOff, capBot: false, zs: 0.95 }), bm);
        continue;
      }
      const thighR = bk === 'wide' ? (t) => B.rt(t) + 0.012 + t * 0.012 : B.rt;
      add(lg.th, limbGeo(B.Lt, thighR, { off: pOff, zs: 0.95 }), bm);
      let shinR = B.rs, sOff = pOff, t1 = 0.97;
      if (bk === 'wide') shinR = (t) => Math.max(B.rs(t) + 0.02, 0.07 + 0.035 * t);
      if (bk === 'joggers') shinR = (t) => (t > 0.9 ? B.rs(t) + 0.002 : B.rs(t) + 0.008 * (1 - t));
      if (bk === 'cargo') shinR = (t) => B.rs(t) + 0.006;
      if (bk === 'jeans') shinR = (t) => Math.max(B.rs(t), 0.05);
      add(lg.kn, limbGeo(B.Ls, shinR, { off: sOff, t1, capBot: bk === 'leggings' || bk === 'skirt' || bk === 'joggers', zs: 0.95 }), bm);
      if (bk === 'cargo') {
        const side = lg === S.L.leg ? 1 : -1;
        add(lg.th, new THREE.BoxGeometry(0.02, 0.1, 0.075), bm, { pos: [side * (B.rt(0.55) + pOff + 0.006), -B.Lt * 0.55, 0] });
      }
    }
    if (bk === 'skirt') {
      const g = torsoGeo(B, -0.27, 0.07, 0.02, { flare: 0.1, seg: 48 });
      add(S.hips, g, fabricMat(a.bottomColor, 'cotton'));
    }

    // ---------------- top (inner layer)
    const tk = a.top;
    const tKind = tk === 'lace' ? 'lace' : 'cotton';
    const tm = fabricMat(a.topColor, tKind);
    const yTop = 0.514;
    const tyb = { tshirt: -0.05, tshirt_print: -0.05, longsleeve: -0.05, tank: -0.04, lace: 0.0, shirt: -0.08 }[tk];
    topOff = tk === 'lace' ? 0.017 : 0.011;
    const outerOn = a.outer !== 'none';
    // lower part on hips, upper on chest (matching the body split)
    const yEnd = tk === 'tank' ? 0.47 : yTop;
    add(S.hips, torsoGeo(B, tyb, 0.22, topOff + 0.002, { flare: tk === 'lace' ? 0.008 : 0.004 }), tm);
    const tu = torsoGeo(B, 0.15, yEnd, topOff); tu.translate(0, -0.2, 0); add(S.chest, tu, tm);
    if (tk === 'tank') {
      for (const sx of [1, -1]) {
        add(S.chest, new THREE.BoxGeometry(0.035, 0.08, 0.012), tm, { pos: [sx * 0.085, 0.29, 0.07], rot: [-0.3, 0, 0] });
        add(S.chest, new THREE.BoxGeometry(0.035, 0.08, 0.012), tm, { pos: [sx * 0.085, 0.29, -0.07], rot: [0.3, 0, 0] });
      }
    }
    if (tk === 'tshirt_print') {
      const pg = torsoGeo(B, 0.24, 0.41, topOff + 0.0025, { phiStart: -0.62, phiLength: 1.24, steps: 12, seg: 16 });
      pg.translate(0, -0.2, 0);
      // remap uv to the patch
      const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
      add(S.chest, pg, getMat('printMat', () => new THREE.MeshStandardMaterial({ map: TX.printTexture(), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 })), { cast: false });
    }
    if (tk === 'shirt') {
      // collar + buttons
      add(S.chest, new THREE.TorusGeometry(0.075, 0.012, 8, 24, Math.PI * 1.5), tm, { pos: [0, 0.305, -0.005], rot: [Math.PI / 2 - 0.25, 0, Math.PI * 0.75] , scale: [1.05, 0.9, 1] });
      const btn = getMat('btn', () => new THREE.MeshStandardMaterial({ color: '#eee', roughness: 0.3 }));
      for (let i = 0; i < 5; i++) {
        const y = 0.45 - i * 0.09;
        const z = rAtY(B.prof, y) * DZ + topOff + 0.003 + (B.bust ? 0.012 * Math.exp(-(((y - 0.33) / 0.07) ** 2)) : 0);
        add(y > 0.2 ? S.chest : S.hips, new THREE.CylinderGeometry(0.005, 0.005, 0.002, 10), btn, { pos: [0, y > 0.2 ? y - 0.2 : y, z], rot: [Math.PI / 2, 0, 0], cast: false });
      }
    }
    // sleeves
    const sleeve = { tshirt: 0.48, tshirt_print: 0.48, longsleeve: 2, tank: 0, lace: 0.55, shirt: 2 }[tk];
    if (sleeve > 0 && !(outerOn && a.outer !== 'vest')) {
      for (const arm of arms) {
        const so = tk === 'lace' ? 0.016 : 0.01;
        add(arm.sh, limbGeo(B.Lu, (t) => B.ru(t) + so + 0.006 * t, { t1: Math.min(1, sleeve), capBot: sleeve > 1, off: 0 }), tm);
        if (sleeve > 1) add(arm.el, limbGeo(B.Lf, (t) => B.rf(t) + so + 0.003, { t1: 0.9, capBot: false }), tm);
      }
    }

    // ---------------- outer layer
    const ok = a.outer;
    if (ok !== 'none') {
      const oKind = ok === 'denim' ? 'denim' : ok === 'leather' ? 'leather' : ok === 'vest' ? 'puffer' : ok === 'bomber' ? 'cotton' : 'cotton';
      const om = fabricMat(a.outerColor, oKind);
      const rib = fabricMat(new THREE.Color(a.outerColor).multiplyScalar(0.8).getStyle(), 'knit');
      const oOff = topOff + (ok === 'vest' ? 0.04 : ok === 'hoodie' || ok === 'ziphoodie' ? 0.03 : 0.024);
      const gap = { hoodie: 0, ziphoodie: 0.55, bomber: 0.28, denim: 0.7, leather: 0.6, vest: 0 }[ok];
      const yb = { hoodie: -0.1, ziphoodie: -0.1, bomber: -0.05, denim: -0.05, leather: -0.06, vest: -0.07 }[ok];
      const phi = { phiStart: gap / 2, phiLength: Math.PI * 2 - gap };
      add(S.hips, torsoGeo(B, yb, 0.22, oOff + 0.003, { ...phi, flare: 0.006 }), om);
      const ou = torsoGeo(B, 0.15, ok === 'vest' ? 0.49 : 0.522, oOff, phi); ou.translate(0, -0.2, 0); add(S.chest, ou, om);
      if (ok === 'bomber' || ok === 'hoodie' || ok === 'ziphoodie') add(S.hips, torsoGeo(B, yb - 0.03, yb + 0.005, oOff - 0.004, phi), rib);
      if (ok === 'hoodie' || ok === 'ziphoodie') {
        // hood resting on the back + drawstrings
        add(S.chest, new THREE.TorusGeometry(0.095, 0.03, 10, 24, Math.PI * 1.25), om, { pos: [0, 0.33, -0.01], rot: [Math.PI / 2 + 0.2, 0, Math.PI * 1.375 - Math.PI / 2 + Math.PI] });
        add(S.chest, new THREE.SphereGeometry(1, 18, 12), om, { pos: [0, 0.33, -0.12], scale: [0.11, 0.07, 0.06] });
        const cord = getMat('cord', () => new THREE.MeshStandardMaterial({ color: '#ddd', roughness: 0.8 }));
        for (const sx of [1, -1]) add(S.chest, new THREE.CylinderGeometry(0.003, 0.003, 0.13, 6), cord, { pos: [sx * 0.035, 0.24, rAtY(B.prof, 0.42) * DZ + oOff + 0.01 + B.bust * 0.02] });
        if (ok === 'hoodie') {
          const pk = torsoGeo(B, 0.02, 0.14, oOff + 0.007, { phiStart: -0.75, phiLength: 1.5, steps: 8, seg: 16 });
          add(S.hips, pk, om);
        }
      }
      if (ok === 'denim' || ok === 'leather' || ok === 'bomber') {
        // collar
        add(S.chest, new THREE.TorusGeometry(0.085, ok === 'bomber' ? 0.012 : 0.018, 8, 28, Math.PI * 1.55), ok === 'bomber' ? rib : om,
          { pos: [0, 0.31, -0.005], rot: [Math.PI / 2 - 0.35, 0, Math.PI * 0.725], scale: [1.08, 0.95, 1] });
      }
      if (ok !== 'vest') {
        for (const arm of arms) {
          add(arm.sh, limbGeo(B.Lu, (t) => B.ru(t) + 0.024 + (ok === 'hoodie' || ok === 'ziphoodie' ? 0.008 : 0), { capBot: false }), om);
          add(arm.el, limbGeo(B.Lf, (t) => B.rf(t) + 0.024 + (ok === 'hoodie' ? 0.006 : 0) - t * 0.004, { t1: 0.88, capBot: false }), om);
          add(arm.el, limbGeo(B.Lf, (t) => B.rf(t) + 0.012, { t0: 0.86, t1: 0.95, capBot: false, capTop: false }), ok === 'bomber' || ok.includes('hoodie') ? rib : om);
        }
      } else {
        // vest: inner sleeves already hidden? show inner top sleeves
        if (sleeve > 0) for (const arm of arms) {
          add(arm.sh, limbGeo(B.Lu, (t) => B.ru(t) + 0.01 + 0.006 * t, { t1: Math.min(1, sleeve), capBot: sleeve > 1 }), tm);
          if (sleeve > 1) add(arm.el, limbGeo(B.Lf, (t) => B.rf(t) + 0.013, { t1: 0.9, capBot: false }), tm);
        }
      }
    }

    // ---------------- shoes
    const shm = getMat('shoe' + a.shoesColor + a.shoes, () => new THREE.MeshStandardMaterial({ color: a.shoesColor, roughness: a.shoes === 'boots' ? 0.6 : 0.5, map: TX.fabricTexture(a.shoes === 'boots' ? 'leather' : 'cotton') }));
    const sole = getMat('sole' + a.shoes, () => new THREE.MeshStandardMaterial({ color: a.shoes === 'boots' ? '#2a2018' : a.shoes === 'flats' ? '#3a3030' : '#f2f2f2', roughness: 0.7 }));
    for (const lg of legs) {
      const f = lg.ft, k = B.f ? 0.92 : 1;
      if (a.shoes === 'flats') {
        add(f, new THREE.SphereGeometry(1, 20, 14), shm, { pos: [0, -0.05, 0.05 * k], scale: [0.04 * k, 0.03, 0.115 * k] });
        add(f, new THREE.BoxGeometry(0.08 * k, 0.012, 0.24 * k), sole, { pos: [0, -0.072, 0.045 * k] });
        add(f, limbGeo(0.07, () => 0.035, { capBot: false, capTop: false }), getMat('skin' + a.skin, () => null) || shm);
        continue;
      }
      add(f, new THREE.SphereGeometry(1, 22, 16), shm, { pos: [0, -0.04, 0.05 * k], scale: [0.048 * k, 0.045, 0.13 * k] });
      add(f, new THREE.BoxGeometry(0.1 * k, 0.03, 0.27 * k), sole, { pos: [0, -0.068, 0.047 * k] });
      add(f, new THREE.SphereGeometry(1, 16, 10), sole, { pos: [0, -0.06, 0.16 * k], scale: [0.05 * k, 0.02, 0.05 * k] });
      const shaft = a.shoes === 'boots' ? 0.17 : a.shoes === 'hightops' ? 0.11 : 0.045;
      add(f, limbGeo(shaft, () => B.rs(1) + 0.012, { capBot: false, capTop: false }).translate(0, shaft - 0.02, 0), shm);
      if (a.shoes !== 'boots') {
        const lace = getMat('laces', () => new THREE.MeshStandardMaterial({ color: '#f4f4f4' }));
        for (let i = 0; i < 3; i++) add(f, new THREE.BoxGeometry(0.035, 0.004, 0.006), lace, { pos: [0, -0.002 - i * 0.006, 0.03 + i * 0.022], rot: [-0.7, 0, 0], cast: false });
      }
    }

    // ---------------- hat
    if (a.hat !== 'none') {
      const hm = fabricMat(a.hatColor, a.hat === 'beanie' ? 'knit' : 'cotton');
      const big = ['afro', 'curly'].includes(a.hairStyle) ? 1.1 : 1;
      if (a.hat === 'beanie') {
        add(S.head, new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, { pos: [0, 0.02, -0.004], scale: [HX * 1.2 * big, HY * 1.08, HZ * 1.16 * big] });
        add(S.head, new THREE.TorusGeometry(1, 0.11, 8, 28), hm, { pos: [0, 0.008, -0.004], rot: [Math.PI / 2 + 0.12, 0, 0], scale: [HX * 1.2 * big, HZ * 1.16 * big, 0.12] });
      } else {
        const back = a.hat === 'backcap' ? Math.PI : 0;
        const g = new THREE.Group(); g.rotation.y = back; S.head.add(g);
        add(g, new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, { pos: [0, 0.03, -0.003], scale: [HX * 1.17 * big, HY * 0.82, HZ * 1.13 * big], rot: [-0.12, 0, 0] });
        add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.006, 24, 1, false, -Math.PI / 2, Math.PI), hm, { pos: [0, 0.036, 0.085], rot: [0.18, 0, 0], scale: [1, 1, 0.95] });
        add(g, new THREE.SphereGeometry(0.008, 8, 6), hm, { pos: [0, 0.03 + HY * 0.82, -0.01] });
      }
      if (this.hairCap && ['curly', 'afro', 'quiff'].includes(a.hairStyle)) this.hairCap.scale.setScalar(0.98);
    }

    // ---------------- accessories
    const metal = (c) => getMat('metal' + c, () => new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.28 }));
    if (a.watch) {
      const arm = S.L.arm; const r = B.rf(0.9) + 0.006;
      const band = getMat('watchband' + a.watchColor, () => new THREE.MeshStandardMaterial({ color: a.watchColor, roughness: 0.5 }));
      add(arm.el, new THREE.TorusGeometry(r, 0.0065, 8, 20), band, { pos: [0, -B.Lf * 0.88, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.6] });
      add(arm.el, new THREE.CylinderGeometry(0.017, 0.017, 0.008, 20), metal('#9aa0a6'), { pos: [r + 0.003, -B.Lf * 0.88, 0], rot: [0, 0, Math.PI / 2] });
      add(arm.el, new THREE.CylinderGeometry(0.014, 0.014, 0.002, 20), getMat('watchface', () => new THREE.MeshStandardMaterial({ color: '#0c1a24', roughness: 0.1, metalness: 0.3 })), { pos: [r + 0.0075, -B.Lf * 0.88, 0], rot: [0, 0, Math.PI / 2] });
    }
    if (a.bracelet) {
      const arm = S.R.arm; const r = B.rf(0.92) + 0.005;
      add(arm.el, new THREE.TorusGeometry(r, 0.0028, 6, 20), metal(a.braceletColor), { pos: [0, -B.Lf * 0.9, 0], rot: [Math.PI / 2, 0, 0] });
    }
    if (a.necklace) {
      const z0 = (y) => rAtY(B.prof, y) * DZ + (a.outer !== 'none' && !['ziphoodie', 'denim', 'leather', 'bomber'].includes(a.outer) ? topOff + 0.035 : topOff) + 0.004 + B.bust * 0.03 * Math.exp(-(((y - 0.33) / 0.065) ** 2)) * 0;
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24) * Math.PI * 2;
        const fr = (Math.cos(t) + 1) / 2;
        const y = 0.52 - fr * fr * 0.1;
        const rx = 0.052 + fr * 0.03;
        const rz = (fr > 0.5 ? z0(y) : 0.05);
        pts.push(new THREE.Vector3(Math.sin(t) * rx, y - 0.2, Math.cos(t) > 0 ? Math.cos(t) * Math.max(rz, 0.05) : Math.cos(t) * 0.055));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      add(S.chest, new THREE.TubeGeometry(curve, 60, 0.0017, 5, true), metal(a.necklaceColor), { cast: false });
      const pz = z0(0.42) + 0.004;
      add(S.chest, new THREE.BoxGeometry(0.0055, 0.032, 0.003), metal(a.necklaceColor), { pos: [0, 0.405 - 0.2, pz], cast: false });
      add(S.chest, new THREE.BoxGeometry(0.02, 0.0055, 0.003), metal(a.necklaceColor), { pos: [0, 0.413 - 0.2, pz], cast: false });
    }
    if (a.glasses) {
      const fm = getMat('frames', () => new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.3 }));
      const lens = getMat('lens', () => new THREE.MeshPhysicalMaterial({ color: '#334', transparent: true, opacity: 0.35, roughness: 0.05 }));
      for (const sx of [1, -1]) {
        const z = headSurfaceZ(sx * 0.03, 0.012) + 0.012;
        add(S.head, new THREE.TorusGeometry(0.018, 0.0022, 6, 24), fm, { pos: [sx * 0.031, 0.012, z], scale: [1.1, 0.85, 1] });
        add(S.head, new THREE.CircleGeometry(0.018, 20), lens, { pos: [sx * 0.031, 0.012, z], scale: [1.1, 0.85, 1], cast: false });
        add(S.head, new THREE.BoxGeometry(0.003, 0.003, 0.1), fm, { pos: [sx * 0.073, 0.015, z - 0.05] });
      }
      add(S.head, new THREE.BoxGeometry(0.018, 0.003, 0.003), fm, { pos: [0, 0.016, headSurfaceZ(0, 0.016) + 0.01] });
    }
    if (a.earrings) {
      for (const sx of [1, -1]) add(S.head, new THREE.SphereGeometry(0.0045, 10, 8), metal(a.earringColor), { pos: [sx * 0.074, -0.022, 0.0] });
    }
  }

  // ------------------------------------------------------------------ animation
  update(dt) {
    const { speed, air, sit } = this.anim;
    const sk = this.sk; if (!sk) return;
    this.idleT += dt;
    const walk = Math.min(1, speed / 1.5);
    const run = Math.min(1, Math.max(0, (speed - 2.2) / 3));
    this.phase += dt * (speed > 0.05 ? 1.7 + speed * 1.15 : 0);
    const p = this.phase;
    const sw = Math.sin(p);
    const legAmp = 0.45 * walk + 0.35 * run;
    const armAmp = 0.35 * walk + 0.55 * run;
    const breathe = Math.sin(this.idleT * 1.6) * 0.01;

    let hipY = sk.hipY - Math.abs(Math.cos(p)) * 0.025 * walk - run * 0.03;
    for (const [side, sgn] of [[sk.L, 1], [sk.R, -1]]) {
      const ph = sgn > 0 ? p : p + Math.PI;
      const s1 = Math.sin(ph);
      let th = -s1 * legAmp, kn = Math.max(0, Math.cos(ph + 0.6)) * (0.55 * walk + 0.75 * run) + 0.04;
      let shX = s1 * armAmp, el = -(0.12 + 0.25 * walk + 0.9 * run) - Math.max(0, -s1) * 0.2 * walk;
      let shZ = side.arm.sh.userData.restZ + 0.02 * Math.sin(this.idleT * 1.6);
      if (air) { th = -0.6 + 0.2 * sgn; kn = 0.9; shX = -0.4; shZ = side.arm.sh.userData.restZ * 4; el = -0.6; }
      if (sit) { th = -1.45; kn = 1.4; shX = -0.75; el = -0.55; shZ = side.arm.sh.userData.restZ * 0.6; }
      side.leg.th.rotation.set(th, 0, sgn * 0.02);
      side.leg.kn.rotation.x = kn;
      side.leg.ft.rotation.x = sit ? 0.1 : -kn * 0.35 + Math.max(0, th) * 0.2;
      side.arm.sh.rotation.set(shX, 0, shZ);
      side.arm.el.rotation.x = el;
      side.arm.hand.rotation.set(0, 0, 0);
    }
    if (sit) hipY = sk.hipY - 0.42;
    sk.hips.position.y = hipY;
    sk.hips.rotation.y = sw * 0.08 * walk;
    sk.chest.rotation.y = -sw * 0.14 * walk;
    sk.chest.rotation.x = run * 0.18 + (air ? 0.1 : 0);
    sk.chest.scale.set(1 + breathe * 0.5, 1, 1 + breathe);
    sk.head.rotation.x = -run * 0.12;
    sk.head.rotation.y = speed < 0.1 ? Math.sin(this.idleT * 0.4) * 0.2 : 0;
    // blink
    const blink = (this.idleT % 4.2) < 0.12;
    for (const e of this.eyes || []) e.lid.rotation.x = blink ? 0.45 : -0.35;
    if (this.pony) this.pony.rotation.x = Math.sin(p * 2) * 0.06 * walk;
  }
}
