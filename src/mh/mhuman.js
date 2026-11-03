// Realistic characters built from CC0 MakeHuman assets: morphable body, photographic skin,
// eyes, eyebrows, eyelashes, hair and fitted clothing on a 163-bone skeleton.
import * as THREE from 'three';
import { pack, arr } from './pack.js';
import * as MM from './materials.js';
import { MHAnimator } from './animator.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const DM = 0.1; // asset units are decimetres

// ---------------------------------------------------------------- shared decoded data
let SH = null;
function shared() {
  if (SH) return SH;
  const m = pack().m;
  const basePos = arr(m.base.pos);
  const rmap = arr(m.base.render.map), ruv = arr(m.base.render.uv), ridx = arr(m.base.render.index);
  const T = {};
  for (const [k, t] of Object.entries(m.targets)) T[k] = { idx: arr(t.idx), d: arr(t.d), s: t.scale };
  const bones = m.skeleton;
  const boneIndex = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  SH = {
    m, basePos, rmap, ruv, ridx, T, bones, boneIndex,
    wIdx: arr(m.weights.idx), wW: arr(m.weights.w),
    proxies: new Map(), nBase: m.base.nVerts,
  };
  return SH;
}
function proxy(name) {
  const s = shared();
  if (s.proxies.has(name)) return s.proxies.get(name);
  const d = s.m.proxies[name];
  if (!d) return null;
  const p = {
    name, d, n: d.nVerts, ref: arr(d.ref), w: arr(d.w), off: arr(d.off),
    map: arr(d.map), uv: arr(d.uv), index: arr(d.index), del: arr(d.delete),
  };
  s.proxies.set(name, p);
  return p;
}
export function proxyNames() { return Object.keys(shared().m.proxies); }

function addTarget(pos, t, w) {
  if (!t || !w) return;
  const k = t.s * w, idx = t.idx, d = t.d;
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i] * 3, j = i * 3;
    pos[v] += d[j] * k; pos[v + 1] += d[j + 1] * k; pos[v + 2] += d[j + 2] * k;
  }
}

// ---------------------------------------------------------------- appearance → shape
export function morphPositions(look) {
  const s = shared();
  const pos = new Float32Array(s.basePos);
  const g = look.gender === 'female' ? 'female' : 'male';
  addTarget(pos, s.T[g + '.base'], 1);
  const two = (key, v) => {
    const t = ((v ?? 0.5) - 0.5) * 2;
    if (t > 0) addTarget(pos, s.T[key + '+'], t); else if (t < 0) addTarget(pos, s.T[key + '-'], -t);
  };
  two(g + '.muscle', look.muscle);
  two(g + '.weight', look.build);
  const hAvg = g === 'male' ? 178 : 165;
  two(g + '.height', 0.5 + Math.max(-1, Math.min(1, ((look.height || hAvg) - hAvg) / 25)) * 0.5);
  for (const [k, key] of [['nose', 'noseSize'], ['noseW', 'noseWidth'], ['eyes', 'eyeSize'], ['lips', 'lips'], ['jaw', 'jaw'], ['chin', 'chin'],
    ['cheek', 'cheekbones'], ['face', 'faceWidth'], ['fat', 'faceFat'], ['shoulders', 'shoulders']]) two('face.' + k, look[key]);
  return pos;
}

function jointPos(pos, list) {
  let x = 0, y = 0, z = 0;
  for (const v of list) { x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; }
  const n = list.length || 1;
  return new THREE.Vector3(x / n, y / n, z / n);
}

// blend the base-mesh skin weights of a proxy vertex's 3 reference vertices
function proxyWeights(p, s) {
  const n = p.n;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const acc = new Map();
  for (let i = 0; i < n; i++) {
    acc.clear();
    for (let k = 0; k < 3; k++) {
      const v = p.ref[i * 3 + k], wk = p.w[i * 3 + k];
      if (wk <= 0) continue;
      for (let j = 0; j < 4; j++) {
        const ww = s.wW[v * 4 + j];
        if (!ww) continue;
        const b = s.wIdx[v * 4 + j];
        acc.set(b, (acc.get(b) || 0) + (ww / 255) * wk);
      }
    }
    const ent = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    let tot = 0; for (const e of ent) tot += e[1];
    for (let j = 0; j < ent.length; j++) { si[i * 4 + j] = ent[j][0]; sw[i * 4 + j] = ent[j][1] / (tot || 1); }
    if (!ent.length) { si[i * 4] = s.boneIndex.head; sw[i * 4] = 1; }
  }
  return { si, sw };
}

function fitProxy(p, pos) {
  const out = new Float32Array(p.n * 3);
  for (let i = 0; i < p.n; i++) {
    let x = p.off[i * 3], y = p.off[i * 3 + 1], z = p.off[i * 3 + 2];
    for (let k = 0; k < 3; k++) {
      const v = p.ref[i * 3 + k], wk = p.w[i * 3 + k];
      x += pos[v * 3] * wk; y += pos[v * 3 + 1] * wk; z += pos[v * 3 + 2] * wk;
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  return out;
}

// smooth normals at the source-vertex level so UV seams don't show
function vertexNormals(srcPos, nSrc, map, index) {
  const nrm = new Float32Array(nSrc * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    const ia = map[index[i]], ib = map[index[i + 1]], ic = map[index[i + 2]];
    a.fromArray(srcPos, ia * 3); b.fromArray(srcPos, ib * 3); c.fromArray(srcPos, ic * 3);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    for (const v of [ia, ib, ic]) { nrm[v * 3] += e1.x; nrm[v * 3 + 1] += e1.y; nrm[v * 3 + 2] += e1.z; }
  }
  for (let v = 0; v < nSrc; v++) {
    const l = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) || 1;
    nrm[v * 3] /= l; nrm[v * 3 + 1] /= l; nrm[v * 3 + 2] /= l;
  }
  return nrm;
}

function buildGeometry(srcPos, nSrc, map, uv, index, si, sw) {
  const n = map.length;
  const nrmSrc = vertexNormals(srcPos, nSrc, map, index);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const v = map[i];
    P[i * 3] = srcPos[v * 3]; P[i * 3 + 1] = srcPos[v * 3 + 1]; P[i * 3 + 2] = srcPos[v * 3 + 2];
    N[i * 3] = nrmSrc[v * 3]; N[i * 3 + 1] = nrmSrc[v * 3 + 1]; N[i * 3 + 2] = nrmSrc[v * 3 + 2];
    for (let j = 0; j < 4; j++) { SI[i * 4 + j] = si[v * 4 + j]; SW[i * 4 + j] = sw[v * 4 + j]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

// ---------------------------------------------------------------- skin tone helpers
const SKIN_REF = { light: new THREE.Color('#e7b99c'), medium: new THREE.Color('#c79673'), dark: new THREE.Color('#6a4432') };
function skinFor(hex) {
  const c = new THREE.Color(hex || '#e7b99c');
  const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  const tone = l > 0.62 ? 'light' : l > 0.4 ? 'medium' : 'dark';
  const ref = SKIN_REF[tone];
  const tint = new THREE.Color(Math.min(1.35, c.r / ref.r), Math.min(1.35, c.g / ref.g), Math.min(1.35, c.b / ref.b));
  tint.lerp(new THREE.Color(1, 1, 1), 0.25);
  return { tone, tint };
}

// ---------------------------------------------------------------- Human
export class MHuman {
  constructor(look, { detail = 'high' } = {}) {
    this.detail = detail;
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ'; // yaw first, then tipping over (falls) about the body's own axis
    this.anim = { speed: 0, air: false, sit: false, lookAt: null, lookAtCamera: false, turn: 0 };
    this.setAppearance(look);
  }

  dispose() {
    this.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material && !o.material.userData.shared) o.material.dispose(); } });
    if (this.skeleton) this.skeleton.dispose();
    this.root.clear();
  }

  setAppearance(look) {
    const t0 = performance.now();
    this.look = { ...look };
    this.dispose();
    this.build();
    this.buildTime = performance.now() - t0;
  }

  build() {
    const s = shared(), L = this.look;
    const pos = morphPositions(L);
    // the rig stays detached from the (possibly moved/rotated) root while the skeleton is bound,
    // so the bind pose never includes the character's position in the world
    const rig = (this.rig = new THREE.Group());

    // ---- outfit selection
    const female = L.gender === 'female';
    const worn = [];
    const want = (name, kind, color, layer) => { const p = name && name !== 'none' ? proxy(name) : null; if (p) worn.push({ p, kind, color, layer }); };
    want(L.bottom, 'cloth', L.bottomColor, 1);
    want(L.top, 'cloth', L.topColor, 2);
    want(L.shoes, 'cloth', L.shoesColor, 0);
    if (L.hat && L.hat !== 'none') want(L.hat, 'cloth', L.hatColor, 3);

    // ---- skeleton
    const bones = [];
    const heads = s.bones.map((b) => jointPos(pos, b.head));
    for (let i = 0; i < s.bones.length; i++) {
      const b = new THREE.Bone(); b.name = s.bones[i].name;
      const par = s.bones[i].parent;
      if (par >= 0) { b.position.copy(heads[i]).sub(heads[par]); bones[par].add(b); } else { b.position.copy(heads[i]); rig.add(b); }
      bones.push(b);
    }
    this.bones = Object.fromEntries(bones.map((b) => [b.name, b]));
    this.heads = Object.fromEntries(s.bones.map((b, i) => [b.name, heads[i]]));
    this.tails = Object.fromEntries(s.bones.map((b) => [b.name, jointPos(pos, b.tail)]));
    rig.updateMatrixWorld(true);
    const skeleton = (this.skeleton = new THREE.Skeleton(bones));
    const cullSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 11); // generous bounds (asset units) so off-screen people are skipped
    const addSkinned = (geo, mat, { shadow = true, order = 0, small = false } = {}) => {
      const m = new THREE.SkinnedMesh(geo, mat);
      m.castShadow = shadow; m.receiveShadow = true; m.renderOrder = order;
      m.frustumCulled = true; m.boundingSphere = cullSphere.clone();
      m.userData.small = small;
      rig.add(m); m.bind(skeleton, new THREE.Matrix4());
      return m;
    };

    // ---- body (hide skin under clothes)
    const del = new Uint8Array(s.nBase);
    for (const w of worn) for (const v of w.p.del) del[v] = 1;
    const idx = [];
    for (let i = 0; i < s.ridx.length; i += 3) {
      const a = s.rmap[s.ridx[i]], b = s.rmap[s.ridx[i + 1]], c = s.rmap[s.ridx[i + 2]];
      if (!del[a] && !del[b] && !del[c]) idx.push(s.ridx[i], s.ridx[i + 1], s.ridx[i + 2]);
    }
    const bodyIndex = new Uint32Array(idx);
    const { tone, tint } = skinFor(L.skin);
    const skinInfo = s.m.skins[tone + (female ? '_female' : '_male')];
    const bodyW = { si: new Uint16Array(s.wIdx), sw: Float32Array.from(s.wW, (v) => v / 255) };
    const bodyGeo = buildGeometry(pos, s.nBase, s.rmap, s.ruv, bodyIndex, bodyW.si, bodyW.sw);
    const cheap = this.detail === 'low';
    this.skinMat = MM.skinMaterial(skinInfo, tint, !cheap, cheap);
    addSkinned(bodyGeo, this.skinMat);

    // ---- proxies
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < s.rmap.length; i++) { const y = pos[s.rmap[i] * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const bodyTop = maxY;
    this.surfaces = [pos];
    const addProxy = (p, mat, opts = {}) => {
      const fp = fitProxy(p, pos);
      if (opts.surface) this.surfaces.push(fp);
      const wts = opts.weights || proxyWeights(p, s);
      const geo = buildGeometry(fp, p.n, p.map, p.uv, p.index, wts.si, wts.sw);
      if (opts.ground) for (let i = 0; i < p.n; i++) minY = Math.min(minY, fp[i * 3 + 1]);
      return addSkinned(geo, mat, opts);
    };
    // eyes: force each eyeball onto its eye bone so the eyes can look around
    {
      const p = proxy('eyes');
      const fp = fitProxy(p, pos);
      const si = new Uint16Array(p.n * 4), sw = new Float32Array(p.n * 4);
      for (let i = 0; i < p.n; i++) { si[i * 4] = s.boneIndex[fp[i * 3] > 0 ? 'eye.L' : 'eye.R']; sw[i * 4] = 1; }
      const eyeName = s.m.eyes[L.eyes] ? L.eyes : 'brown';
      const em = addProxy(p, MM.eyeMaterial(s.m.eyes[eyeName], cheap), { weights: { si, sw }, shadow: false, small: true });
      // eyeballs are spheres: use radial normals (robust against flipped faces)
      const ga = em.geometry.attributes.position, na = em.geometry.attributes.normal;
      const cL = this.heads['eye.L'], cR = this.heads['eye.R'], tmp = new THREE.Vector3();
      for (let i = 0; i < ga.count; i++) {
        tmp.fromBufferAttribute(ga, i);
        tmp.sub(tmp.x > 0 ? cL : cR).normalize();
        na.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
    }
    const hairCol = new THREE.Color(L.hairColor || '#3a2a1f');
    const brow = proxy(L.browStyle || (female ? 'eyebrow010' : 'eyebrow002')) || proxy('eyebrow001');
    addProxy(brow, MM.cardMaterial(brow.d.tex, hairCol.clone().multiplyScalar(0.75), { alphaTest: 0.35, aniso: 0, cheap }), { shadow: false, order: 2, small: true });
    const lash = proxy(female ? 'eyelashes03' : 'eyelashes01') || proxy('eyelashes01');
    addProxy(lash, MM.cardMaterial(lash.d.tex, '#120c0a', { alphaTest: 0.35, aniso: 0, cheap }), { shadow: false, order: 3, small: true });
    if (L.hairStyle && L.hairStyle !== 'bald') {
      const hp = proxy(L.hairStyle);
      if (hp) addProxy(hp, MM.cardMaterial(hp.d.tex, hairCol, { alphaTest: 0.42, cheap }), { shadow: true, order: 4 });
    }
    for (const w of worn) {
      const mat = MM.clothMaterial(w.p.d.tex, w.p.d.normal, w.color && w.color !== 'original' ? w.color : null, { layer: w.layer, cheap });
      addProxy(w.p, mat, { ground: w.p.name.startsWith('shoes'), order: 1 + w.layer, surface: w.layer >= 1 && w.layer <= 2 });
    }

    // ---- scale to the chosen height, feet on the ground
    const hDm = bodyTop - Math.min(minY, ...[]);
    const want_h = (L.height || (female ? 165 : 178)) / 10;
    const sc = (want_h / Math.max(1, bodyTop - minY)) * DM;
    rig.scale.setScalar(sc);
    rig.position.y = -minY * sc;
    void hDm;
    this.scale = sc;
    this.eyeY = (this.heads['eye.L'].y - minY) * sc; // eye height above the feet (m): people look each other in the eye
    this.buildAccessories(pos);
    this.root.add(rig);
    this.animator = new MHAnimator(this);
  }

  // ---------------------------------------------------------------- accessories (rigid, on bones)
  onBone(name, obj, at) {
    const b = this.bones[name]; if (!b) return;
    const h = this.heads[name];
    obj.position.set(at.x - h.x, at.y - h.y, at.z - h.z);
    b.add(obj);
  }

  buildAccessories() {
    const L = this.look;
    const metal = (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.22, clearcoat: 0.3 });
    // wrists: watch on the left, bracelet on the right
    for (const [on, sd, color, kind] of [[L.watch, 'L', L.watchColor || '#1a1a1a', 'watch'], [L.bracelet, 'R', L.braceletColor || '#cfd2d6', 'bracelet']]) {
      if (!on) continue;
      const w = this.heads['wrist.' + sd], e = this.heads['lowerarm01.' + sd];
      if (!w || !e) continue;
      const dir = w.clone().sub(e).normalize();
      const c = w.clone().addScaledVector(dir, -0.18);
      const g = new THREE.Group();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const rad = 0.29;
      if (kind === 'watch') {
        const band = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.045, 10, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
        band.rotation.x = Math.PI / 2; band.scale.set(1, 1.15, 2.2); g.add(band);
        const face = new THREE.Group();
        const out = new THREE.Vector3(sd === 'L' ? 1 : -1, 0, 0);
        face.position.copy(out.clone().multiplyScalar(rad + 0.05));
        face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
        face.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 28), metal('#b9bec4')));
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.02, 28), new THREE.MeshPhysicalMaterial({ color: '#0b141c', roughness: 0.05, clearcoat: 1 }));
        glass.position.y = 0.045; face.add(glass);
        const fq = new THREE.Group(); fq.add(face); fq.quaternion.copy(g.quaternion).invert(); g.add(fq);
      } else {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rad + 0.02, 0.02, 8, 40), color === '#a3242c' ? new THREE.MeshStandardMaterial({ color, roughness: 0.8 }) : metal(color));
        ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1.15, 1); g.add(ring);
      }
      this.onBone('lowerarm02.' + sd, g, c);
    }
    // outermost body/clothing radius around the neck axis at a given height and angle
    const outer = (cx, cz, y, ang, dy = 0.12, da = 0.22) => {
      let best = 0;
      for (const P of this.surfaces) {
        for (let i = 0; i < P.length; i += 3) {
          const py = P[i + 1]; if (Math.abs(py - y) > dy) continue;
          const dx = P[i] - cx, dz = P[i + 2] - cz;
          const a2 = Math.atan2(dx, dz); let d = a2 - ang; d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) > da) continue;
          const r = Math.hypot(dx, dz); if (r > best && r < 2.2) best = r;
        }
      }
      return best;
    };
    if (L.necklace) {
      const nb = this.heads['neck01'], ch = this.heads['spine01'];
      if (nb && ch) {
        const pts = [];
        const cx = nb.x, cz = nb.z - 0.1;
        for (let i = 0; i < 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          const fr = (Math.cos(a) + 1) / 2;
          const y = nb.y - 0.15 - fr * fr * 0.7;
          const r = Math.max(0.45, outer(cx, cz, y, a)) + 0.035;
          pts.push(new THREE.Vector3(cx + Math.sin(a) * r, y, cz + Math.cos(a) * r));
        }
        const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.009, 5, true), metal(L.necklaceColor || '#d4a940'));
        this.onBone('spine01', chain, new THREE.Vector3(0, 0, 0));
        const cross = new THREE.Group(), cm = metal(L.necklaceColor || '#d4a940');
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.02), cm), hz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.02), cm);
        hz.position.y = 0.04; cross.add(v, hz);
        const yP = nb.y - 0.98;
        this.onBone('spine01', cross, new THREE.Vector3(nb.x, yP, cz + outer(cx, cz, yP, 0, 0.15, 0.12) + 0.045));
      }
    }
    if (L.earrings) {
      for (const sd of ['L', 'R']) {
        const e = this.heads['eye.' + sd], hd = this.heads['head'];
        if (!e || !hd) continue;
        const p = new THREE.Vector3(e.x * 2.15, e.y - 0.48, hd.z - 0.05);
        this.onBone('head', new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), metal(L.earringColor || '#cfd2d6')), p);
      }
    }
    if (L.glasses) {
      const fm = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.25, clearcoat: 0.6 });
      const lm = new THREE.MeshPhysicalMaterial({ color: '#222a33', transparent: true, opacity: 0.25, roughness: 0.02, depthWrite: false });
      const g = new THREE.Group();
      for (const sd of ['L', 'R']) {
        const e = this.heads['eye.' + sd]; if (!e) continue;
        const c = new THREE.Vector3(e.x, e.y - 0.01, e.z + 0.23);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 32), fm); rim.scale.set(1.15, 0.82, 1); rim.position.copy(c); g.add(rim);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), lm); lens.scale.set(1.15, 0.82, 1); lens.position.copy(c); lens.renderOrder = 6; g.add(lens);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 1.0), fm); armL.position.set(e.x * 1.95, e.y + 0.03, e.z - 0.27); g.add(armL);
      }
      const eL = this.heads['eye.L'], eR = this.heads['eye.R'];
      if (eL && eR) { const br = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(eL.x - eR.x) * 0.35, 0.025, 0.025), fm); br.position.set(0, eL.y + 0.02, eL.z + 0.25); g.add(br); }
      const hd = this.heads['head'];
      g.position.set(-hd.x, -hd.y, -hd.z);
      this.bones.head.add(g);
    }
  }

  update(dt, camera) { if (this.animator) this.animator.update(dt, camera); }
}

// Cheap copy of an existing character (shares geometry + materials, own skeleton + animation).
// Used for pedestrians so the city fills up quickly.
export function cloneHuman(src) {
  const root = cloneSkinned(src.root);
  const h = { root, look: src.look, heads: src.heads, tails: src.tails, scale: src.scale, eyeY: src.eyeY, bones: {},
    anim: { speed: 0, air: false, sit: false, lookAt: null, lookAtCamera: false, turn: 0 } };
  root.traverse((o) => { if (o.isBone) h.bones[o.name] = o; });
  h.animator = new MHAnimator(h);
  h.update = (dt, cam) => h.animator.update(dt, cam);
  return h;
}
