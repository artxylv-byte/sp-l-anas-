// Vehicles: lightweight instanced models (a handful of draw calls for all the traffic), tyre-grip
// driving physics with weight transfer, drifting, suspension and crashes, skid marks + tyre smoke,
// the city traffic AI and Riga's trams.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { N, CELL, HALF, ROAD, roadLine } from './world.js';

const G = 9.81;
const clamp = THREE.MathUtils.clamp;

// body shape, then physics: mass (kg), engine power (W), top speed (m/s), tyre grip (friction coefficient),
// driven axles, centre-of-gravity height (m), strongest launch acceleration (m/s²), cornering stiffness (per rad)
const TYPES = {
  sedan: { L: 4.6, W: 1.86, belt: 0.92, roof: 1.42, hood: 1.15, trunk: 0.95, ground: 0.32, wheel: 0.34, mass: 1450, power: 130e3, vmax: 52, grip: 1.08, drive: 'rwd', cgH: 0.52, launch: 6.5, corner: 11 },
  sports: { L: 4.45, W: 1.95, belt: 0.82, roof: 1.2, hood: 1.35, trunk: 1.05, ground: 0.26, wheel: 0.34, mass: 1350, power: 270e3, vmax: 68, grip: 1.18, drive: 'rwd', cgH: 0.44, launch: 9, corner: 12 },
  suv: { L: 4.85, W: 2.0, belt: 1.12, roof: 1.82, hood: 1.0, trunk: 0.45, ground: 0.42, wheel: 0.4, mass: 2100, power: 200e3, vmax: 46, grip: 1.0, drive: 'awd', cgH: 0.72, launch: 6, corner: 10 },
  hatch: { L: 4.0, W: 1.8, belt: 0.92, roof: 1.5, hood: 0.95, trunk: 0.35, ground: 0.3, wheel: 0.32, mass: 1150, power: 95e3, vmax: 47, grip: 1.05, drive: 'fwd', cgH: 0.5, launch: 6, corner: 11 },
  // Riga's low-floor trams run on rails (kinematic, never pushed around)
  tram: { L: 24, W: 2.4, ground: 0.38, wheel: 0, mass: 38000, power: 0, vmax: 14, grip: 1, drive: 'awd', cgH: 1.2, launch: 1.2, corner: 10, tram: true },
};
export const CAR_TYPES = Object.keys(TYPES).filter((t) => !TYPES[t].tram);
export const CAR_COLORS = ['#c0392b', '#f2f2f2', '#141414', '#2c3e50', '#7f8c8d', '#c8c8c8', '#1e3a5f', '#5a5a5a', '#8e2b2b', '#2e86de', '#d9d4c7', '#16a085', '#f2f2f2', '#141414', '#c8c8c8'];

// ---------------------------------------------------------------- geometry (built once per type)
const flat = (g) => (g.index ? g.toNonIndexed() : g);
function extrudeGeo(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return toCreasedNormals(g, 0.45); // smooth along the curves, crisp at panel edges
}
function boxGeo(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return flat(g); }
function bar(x0, y0, x1, y1, z, t = 0.05) { // thin rod between two points of the side view
  const len = Math.hypot(x1 - x0, y1 - y0), g = new THREE.BoxGeometry(t, len, t);
  g.rotateZ(-Math.atan2(x1 - x0, y1 - y0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return flat(g);
}
function paint(g, color, glow = 0) {
  const c = new THREE.Color(color), n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(col, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n).fill(glow), 1));
  return g;
}
function merged(list) {
  const g = mergeGeometries(list.map((x) => { const y = flat(x); y.clearGroups(); return y; }));
  g.rotateY(-Math.PI / 2); // modelled along +x → the car faces +z
  return g;
}
// Latvian number plate: white with the blue EU "LV" strip
function plate(list, x, y, dir) {
  list.push(paint(boxGeo(0.03, 0.11, 0.52, x, y, 0), '#eeeeee'));
  list.push(paint(boxGeo(0.035, 0.11, 0.07, x + dir * 0.002, y, 0.225 * dir), '#1d3fae'));
}

const partCache = {};
function carParts(type) {
  if (partCache[type]) return partCache[type];
  if (type === 'tram') return (partCache[type] = tramParts());
  const T = TYPES[type];
  const { L, W, belt, roof, ground, wheel } = T;
  const hx = L / 2, wb = L * 0.31;
  const body = [], glass = [], detail = [];
  // lower body with wheel arches
  const s = new THREE.Shape();
  s.moveTo(-hx, ground + 0.08);
  s.lineTo(-hx + 0.1, ground);
  s.lineTo(-wb - wheel - 0.1, ground);
  s.absarc(-wb, ground, wheel + 0.1, Math.PI, 0, true);
  s.lineTo(wb - wheel - 0.1, ground);
  s.absarc(wb, ground, wheel + 0.1, Math.PI, 0, true);
  s.lineTo(hx - 0.1, ground);
  s.quadraticCurveTo(hx + 0.05, ground + 0.05, hx, ground + 0.32);
  s.quadraticCurveTo(hx - 0.05, belt - 0.12, hx - 0.35, belt - 0.05);
  s.lineTo(hx - T.hood, belt);
  s.lineTo(-hx + T.trunk, belt + 0.02);
  s.quadraticCurveTo(-hx + 0.1, belt, -hx, belt - 0.15);
  s.lineTo(-hx, ground + 0.08);
  const bevel = 0.07;
  body.push(extrudeGeo(s, W - bevel * 2, bevel));
  // greenhouse (glass)
  const hatchback = type === 'suv' || type === 'hatch';
  const c = new THREE.Shape();
  const fA = hx - T.hood, rA = -hx + T.trunk;
  c.moveTo(rA - 0.05, belt);
  c.lineTo(fA + 0.05, belt);
  c.quadraticCurveTo(fA - 0.25, roof - 0.05, fA - 0.75, roof);
  c.lineTo(rA + (hatchback ? 0.15 : 0.55), roof);
  c.quadraticCurveTo(rA + 0.05, roof - 0.1, rA - 0.05, belt);
  glass.push(extrudeGeo(c, W - 0.36, 0.05));
  // roof panel, B-pillars and mirrors in the body colour
  const rf = new THREE.Shape();
  const r0 = rA + (hatchback ? 0.2 : 0.6), r1 = fA - 0.8;
  rf.moveTo(r0, roof - 0.02); rf.lineTo(r1, roof - 0.02); rf.lineTo(r1 - 0.05, roof + 0.03); rf.lineTo(r0 + 0.05, roof + 0.03);
  body.push(extrudeGeo(rf, W - 0.34, 0.03));
  body.push(boxGeo(0.12, roof - belt, W - 0.3, (r0 + r1) / 2 + 0.1, (roof + belt) / 2, 0));
  for (const z of [-1, 1]) body.push(boxGeo(0.18, 0.12, 0.2, fA - 0.15, belt + 0.12, z * (W / 2 + 0.05)));
  // trim, grille, lights (glow 1 = headlight, 2 = tail/brake light) and plates
  detail.push(paint(boxGeo(wb * 2 - wheel * 2 - 0.3, 0.12, W + 0.02, 0, ground + 0.12, 0), '#1a1a1a'));
  detail.push(paint(boxGeo(0.05, 0.16, W * 0.5, hx + 0.03, ground + 0.32, 0), '#151515'));
  for (const z of [-1, 1]) {
    detail.push(paint(boxGeo(0.1, 0.12, 0.42, hx + 0.0, belt - 0.22, z * (W / 2 - 0.32)), '#ffffff', 1));
    detail.push(paint(boxGeo(0.1, 0.12, 0.45, -hx - 0.04, belt - 0.2, z * (W / 2 - 0.3)), '#7a0000', 2));
  }
  plate(detail, hx + 0.07, ground + 0.16, 1);
  plate(detail, -hx - 0.085, belt - 0.42, -1);
  return (partCache[type] = { body: merged(body), glass: merged(glass), detail: merged(detail) });
}

function tramParts() {
  const T = TYPES.tram, L = T.L, W = T.W, g0 = T.ground, top = 3.25, hb = top - g0 - 0.2;
  const body = [], glass = [], detail = [];
  const shell = new RoundedBoxGeometry(L, hb, W, 3, 0.24); shell.translate(0, g0 + hb / 2, 0); body.push(shell);
  glass.push(boxGeo(L - 1.4, 1.15, W + 0.03, 0, g0 + 1.75, 0));
  for (const sd of [-1, 1]) glass.push(boxGeo(0.06, 1.35, W - 0.5, sd * (L / 2 + 0.01), g0 + 1.8, 0));
  // livery: carmine lower band, dark skirt, articulation joints
  detail.push(paint(boxGeo(L + 0.03, 0.6, W + 0.03, 0, g0 + 0.45, 0), '#9e1b2a'));
  detail.push(paint(boxGeo(L - 0.5, 0.24, W - 0.12, 0, g0 - 0.06, 0), '#161616'));
  for (const x of [-L / 6, L / 6]) detail.push(paint(boxGeo(0.32, hb - 0.25, W + 0.05, x, g0 + hb / 2, 0), '#2b2b2b'));
  for (const x of [-L / 3, 0, L / 3]) detail.push(paint(boxGeo(2.6, 0.32, 1.5, x, top - 0.02, 0), '#8a8f96'));
  // pantograph reaching the overhead wire at 5.5 m
  for (const z of [-0.45, 0.45]) {
    detail.push(paint(bar(-0.9, top + 0.15, 0.2, top + 1.25, z), '#3a3a3a'));
    detail.push(paint(bar(0.2, top + 1.25, -0.2, 5.45, z), '#3a3a3a'));
  }
  detail.push(paint(boxGeo(0.12, 0.06, 1.5, -0.2, 5.45, 0), '#3a3a3a'));
  // destination displays + lights at both ends (the tram drives either way)
  for (const sd of [-1, 1]) {
    detail.push(paint(boxGeo(0.05, 0.28, 1.4, sd * (L / 2 + 0.03), top - 0.45, 0), '#ffb020', 1));
    for (const z of [-0.8, 0.8]) {
      detail.push(paint(boxGeo(0.08, 0.14, 0.3, sd * (L / 2 + 0.02), g0 + 0.95, z), '#ffffff', 1));
      detail.push(paint(boxGeo(0.08, 0.1, 0.16, sd * (L / 2 + 0.02), g0 + 1.15, z * 1.05), '#7a0000', 2));
    }
  }
  return { body: merged(body), glass: merged(glass), detail: merged(detail) };
}

let wheelGeo = null;
function wheelGeometry() { // unit radius, axle along x; tyre (uv left) + alloy rim (uv right)
  if (wheelGeo) return wheelGeo;
  const prof = [[0.62, -0.38], [0.86, -0.4], [0.96, -0.34], [1, -0.2], [1, 0.2], [0.96, 0.34], [0.86, 0.4], [0.62, 0.38]].map(([r, y]) => new THREE.Vector2(r, y));
  const parts = [[new THREE.LatheGeometry(prof, 24), 0.25], [new THREE.CylinderGeometry(0.62, 0.62, 0.7, 20, 1), 0.75], [new THREE.CylinderGeometry(0.15, 0.17, 0.82, 10, 1), 0.75]];
  for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(0.13, 0.78, 1.16); sp.rotateY((k / 5) * Math.PI); parts.push([sp, 0.75]); }
  wheelGeo = mergeGeometries(parts.map(([g, u]) => {
    const f = flat(g); f.clearGroups();
    const uv = f.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u, 0.5);
    return f;
  }));
  wheelGeo.rotateZ(Math.PI / 2);
  return wheelGeo;
}
function wheelMaterial() {
  const col = new THREE.DataTexture(new Uint8Array([24, 24, 24, 255, 196, 200, 206, 255]), 2, 1);
  col.colorSpace = THREE.SRGBColorSpace; col.needsUpdate = true;
  const orm = new THREE.DataTexture(new Uint8Array([255, 235, 0, 255, 255, 70, 230, 255]), 2, 1); orm.needsUpdate = true; // G roughness, B metalness
  return new THREE.MeshStandardMaterial({ map: col, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
}

let _beamTex;
function beamTexture() {
  if (_beamTex) return _beamTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 256, 10, 64, 200, 230);
  gr.addColorStop(0, 'rgba(255,240,200,0.7)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = gr; x.beginPath(); x.moveTo(44, 256); x.lineTo(84, 256); x.lineTo(128, 0); x.lineTo(0, 0); x.fill();
  return (_beamTex = new THREE.CanvasTexture(c));
}
function beamGeometry() { // headlight pool on the road, narrow end at the bumper
  const g = new THREE.PlaneGeometry(7, 13); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  g.translate(0, 0, 6.5);
  return g;
}

// ---------------------------------------------------------------- materials
const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0d141c', metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.82 });
const lightUniform = { value: new THREE.Vector3(0.3, 0.4, 2.4) }; // headlights, tail lights, extra brake glow
const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
detailMat.onBeforeCompile = (sh) => {
  sh.uniforms.uGlow = lightUniform;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aGlow; attribute float aBrake; varying float vGlow; varying float vBrake;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow; vBrake = aBrake;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uGlow; varying float vGlow; varying float vBrake;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if ( vGlow > 0.5 ) {
        if ( vGlow < 1.5 ) totalEmissiveRadiance += vec3( 1.0, 0.93, 0.8 ) * uGlow.x;
        else totalEmissiveRadiance += vec3( 1.0, 0.06, 0.04 ) * ( uGlow.y + vBrake * uGlow.z );
      }`);
};
detailMat.customProgramCacheKey = () => 'car-detail';
const beamMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });

// ---------------------------------------------------------------- skid marks + tyre smoke
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _pm = new THREE.Matrix4();
const _fr = new THREE.Frustum(), _sph = new THREE.Sphere();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);

class Skids {
  constructor(scene, max = 700) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#080808', transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.InstancedMesh(g, mat, max);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.i = 0; this.max = max;
    scene.add(this.mesh);
  }
  add(a, x, y, z) {
    const dx = x - a.x, dz = z - a.z, len = Math.hypot(dx, dz);
    if (len < 0.05 || len > 3) return;
    _q.setFromAxisAngle(AY, Math.atan2(dx, dz));
    _m.compose(_p.set((a.x + x) / 2, Math.max(a.y, y) + 0.05, (a.z + z) / 2), _q, _s.set(0.22, 1, len + 0.05));
    this.mesh.setMatrixAt(this.i, _m);
    this.i = (this.i + 1) % this.max; this.mesh.count = Math.min(this.max, this.mesh.count + 1);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class Smoke {
  constructor(scene, max = 160) {
    this.max = max; this.next = 0;
    this.parts = Array.from({ length: max }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, a: 0 }));
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.alpha = new Float32Array(max); this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#d9d9d9') }, uScale: { value: 500 } },
      vertexShader: `attribute float aAlpha; attribute float aSize; uniform float uScale; varying float vA;
        void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 2;
    this.active = 0;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vz, amt) {
    const p = this.parts[this.next]; this.next = (this.next + 1) % this.max;
    Object.assign(p, { life: 1, x, y, z, vx: vx + (Math.random() - 0.5) * 1.2, vy: 0.5 + Math.random() * 0.6, vz: vz + (Math.random() - 0.5) * 1.2, s: 0.6 + Math.random() * 0.4, a: 0.32 * Math.min(1, amt) });
    this.active = 2.5;
  }
  update(dt, camera, pxH, light) {
    if (this.active <= 0) { this.points.visible = false; return; }
    this.active -= dt; this.points.visible = true;
    this.mat.uniforms.uScale.value = pxH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.mat.uniforms.uColor.value.setScalar(0.25 + 0.6 * light);
    const drag = Math.exp(-2.2 * dt);
    for (let i = 0; i < this.max; i++) {
      const p = this.parts[i];
      if (p.life > 0) {
        p.life -= dt * 0.65; p.vx *= drag; p.vz *= drag;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.s += dt * 2.4;
      }
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.alpha[i] = Math.max(0, p.life) * p.a; this.size[i] = p.s;
    }
    const at = this.points.geometry.attributes;
    at.position.needsUpdate = at.aAlpha.needsUpdate = at.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- fleet renderer
// Every car of a type shares three instanced meshes (paint, glass, details) and all wheels share one,
// so the whole traffic costs a few draw calls. Only cars near or inside the view are drawn.
class Fleet {
  constructor(scene) {
    this.scene = scene; this.cars = []; this.meshes = []; this.dirty = true;
    this.skids = new Skids(scene); this.smoke = new Smoke(scene);
    this.camPos = new THREE.Vector3();
  }
  add(car) { this.cars.push(car); this.dirty = true; }
  build() {
    for (const m of this.meshes) { this.scene.remove(m); m.dispose(); }
    this.meshes = []; this.types = {};
    const mk = (geo, mat, n, shadow) => {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
      m.castShadow = shadow; m.receiveShadow = true; m.count = 0;
      this.scene.add(m); this.meshes.push(m);
      return m;
    };
    for (const type of Object.keys(TYPES)) {
      const n = this.cars.filter((c) => c.type === type).length;
      if (!n) continue;
      const P = carParts(type);
      const det = P.detail.clone();
      det.setAttribute('aBrake', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
      this.types[type] = { body: mk(P.body, bodyMat, n, true), glass: mk(P.glass, glassMat, n, true), detail: mk(det, detailMat, n, false) };
      this.types[type].body.setColorAt(0, new THREE.Color());
    }
    this.wheels = mk(wheelGeometry(), this.wheelMat ||= wheelMaterial(), this.cars.filter((c) => c.T.wheel > 0).length * 4, true);
    beamMat.map = beamTexture();
    this.beams = mk(beamGeometry(), beamMat, this.cars.length, false);
    this.beams.receiveShadow = false;
    this.dirty = false;
  }
  update(camera, pxH, night, dt) {
    if (this.dirty) this.build();
    camera.updateMatrixWorld();
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
    const cp = camera.position; this.camPos.copy(cp);
    for (const t of Object.values(this.types)) t.body.count = t.glass.count = t.detail.count = 0;
    let nw = 0, nb = 0;
    for (const c of this.cars) {
      const dx = c.pos.x - cp.x, dz = c.pos.z - cp.z, d2 = dx * dx + dz * dz;
      if (d2 > 460 * 460) continue;
      _sph.center.set(c.pos.x, c.pos.y + 1, c.pos.z); _sph.radius = c.T.L * 0.5 + 1.2;
      if (d2 > 28 * 28 && !_fr.intersectsSphere(_sph)) continue; // nearby cars still cast their shadows
      const M = this.types[c.type], i = M.body.count;
      M.body.count++; M.glass.count++; M.detail.count++;
      _m.multiplyMatrices(c.group.matrix, c.body.matrix);
      M.body.setMatrixAt(i, _m); M.glass.setMatrixAt(i, _m); M.detail.setMatrixAt(i, _m);
      M.body.setColorAt(i, c.paint);
      M.detail.geometry.attributes.aBrake.array[i] = c.brakeLight;
      if (c.T.wheel > 0) for (let w = 0; w < 4; w++) { c.wheelMatrix(w, _m2); this.wheels.setMatrixAt(nw++, _m2); }
      if (night > 0.05) { _m2.multiplyMatrices(c.group.matrix, c.beamLocal); this.beams.setMatrixAt(nb++, _m2); }
    }
    for (const t of Object.values(this.types)) {
      for (const m of [t.body, t.glass, t.detail]) m.instanceMatrix.needsUpdate = true;
      t.body.instanceColor.needsUpdate = true;
      t.detail.geometry.attributes.aBrake.needsUpdate = true;
    }
    this.wheels.count = nw; this.wheels.instanceMatrix.needsUpdate = true;
    this.beams.count = nb; this.beams.instanceMatrix.needsUpdate = true;
    beamMat.opacity = night * 0.5;
    lightUniform.value.set(0.3 + night * 3, 0.4 + night * 1.4, 2.2 + night * 1.2);
    this.smoke.update(dt, camera, pxH, 1 - night * 0.7);
  }
}
const fleets = new WeakMap();
export function carFleet(scene) {
  let f = fleets.get(scene);
  if (!f) { f = new Fleet(scene); fleets.set(scene, f); }
  return f;
}

// tyre force limited by the friction circle and by what would stop the axle sliding this substep
const _f = [0, 0];
function grip(fx, fy, cap, vLat, mass, h) {
  const t = Math.hypot(fx, fy);
  if (t > cap) { const k = cap / t; fx *= k; fy *= k; }
  const lim = (mass * Math.abs(vLat)) / h;
  if (Math.abs(fy) > lim) fy = Math.sign(fy) * lim;
  _f[0] = fx; _f[1] = fy;
  return _f;
}
// a resisting force (brakes, rolling) that never pushes the wheel backwards
const oppose = (F, speed, mass, h) => -Math.sign(speed) * Math.min(F, (mass * Math.abs(speed)) / h);

// collision circles along the body (centre offsets in metres)
function circlesOf(T) {
  const n = Math.max(3, Math.ceil(T.L / T.W));
  return Array.from({ length: n }, (_, i) => (i / (n - 1) - 0.5) * (T.L - T.W));
}

// ---------------------------------------------------------------- Car
export class Car {
  constructor(scene, type, color, pos, yaw) {
    const T = (this.T = TYPES[type]);
    this.type = type; this.color = color; this.paint = new THREE.Color(color);
    this.pos = pos.clone(); this.yaw = yaw;
    this.vel = new THREE.Vector3(); this.yawRate = 0;
    this.fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    this.steer = 0; this.spinF = 0; this.spinR = 0;
    this.ctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.accX = 0; this.accY = 0; this.brakeLight = 0; this.impact = 0; this.sleeping = false;
    this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0; this.bodyY = 0; this.heaveV = 0;
    this.gh = [0, 0, 0, 0]; this.surface = 1; this.ready = false;
    this.slideR = 0; this.lockR = false; this.burn = false;
    this.wb = T.L * 0.31; this.a = this.wb * 0.94; this.b = this.wb * 1.06; // centre of gravity → axles
    this.halfTrack = T.W / 2 - 0.16;
    this.inertia = T.mass * this.a * this.b * 1.15; // yaw moment of inertia
    this.drag = T.power ? T.power / T.vmax ** 3 : 0;
    this.circ = circlesOf(T); this.rad = T.W / 2;
    this.beamLocal = new THREE.Matrix4().makeTranslation(0, 0.06, T.L / 2 - 0.3);
    this.driver = null; this.ai = null;
    this.group = new THREE.Group(); this.body = new THREE.Group(); this.group.add(this.body);
    this.group.position.copy(this.pos); this.group.rotation.y = yaw;
    scene.add(this.group);
    this.fleet = carFleet(scene); this.fleet.add(this);
    this.skid = [null, null, null, null];
  }

  get forward() { return this.fwd.clone(); }
  get speed() { return this.vel.x * this.fwd.x + this.vel.z * this.fwd.z; }
  set speed(v) { this.vel.set(this.fwd.x * v, 0, this.fwd.z * v); this.sleeping = false; }
  get dynamic() { return !this.T.tram && (this.driver !== 'ai' || !!(this.ai && this.ai.stun > 0)); }
  get parked() { return !this.driver || !!(this.ai && this.ai.stun > 0); }

  // player input (applied by the physics step)
  drive(dt, input) { Object.assign(this.ctrl, input); if (input.throttle || input.brake || input.steer) this.sleeping = false; }

  integrate(dt, world) {
    if (this.sleeping) return;
    const n = Math.min(8, Math.max(1, Math.ceil(dt * 120)));
    const h = dt / n;
    const cand = world.query(this.pos.x, this.pos.z, this.T.L * 0.5 + 2 + this.vel.length() * dt);
    for (let i = 0; i < n; i++) { this.step(h); this.collideWorld(cand); }
    this.fwd.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    // a parked car that has come to rest sleeps until something bumps into it
    if (this.parked && Math.abs(this.yawRate) < 0.02 && this.vel.lengthSq() < 0.02) { this.vel.set(0, 0, 0); this.yawRate = 0; this.sleeping = true; }
  }

  // bicycle model: one tyre force per axle from its slip angle, weight transfer, friction circle
  step(h) {
    const T = this.T, m = T.mass, c = this.ctrl, parked = this.parked;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const u = this.vel.x * sy + this.vel.z * cy; // forward speed
    const v = this.vel.x * cy - this.vel.z * sy; // sideways speed (+ = sliding to the left)
    const r = this.yawRate;
    const thr = parked ? 0 : c.throttle, brk = parked ? 0 : c.brake, hand = parked || c.handbrake;
    // steering: less lock at speed, plus a little automatic counter-steer while the car slides
    let tgt = parked ? 0 : (c.steer * 0.6) / (1 + Math.abs(u) / 17);
    if (!parked && u > 4) tgt += Math.atan2(v, u) * 0.5;
    tgt = clamp(tgt, -0.65, 0.65);
    this.steer += clamp(tgt - this.steer, -3.5 * h, 3.5 * h);
    // axle loads with weight transfer (accelerating loads the rear, braking loads the front)
    const wbase = this.a + this.b;
    const Nf = clamp((m * (G * this.b - this.accX * T.cgH)) / wbase, 0.2 * m * G, 0.8 * m * G), Nr = m * G - Nf;
    const mf = Nf / G, mr = Nr / G;
    const mu = T.grip * this.surface;
    // engine (traction-limited at launch, power-limited at speed), reverse gear, brakes
    let drive = 0, bF = 0, bR = 0;
    if (thr > 0) {
      if (u > -0.8) drive = thr * Math.min(m * T.launch, T.power / Math.max(3, u));
      else { bF += thr * m * 5.5; bR += thr * m * 3; }
    }
    if (brk > 0) {
      if (u > 0.8) { bF += brk * m * 5.5; bR += brk * m * 3; }
      else if (u > -11) drive -= brk * Math.min(m * 3.5, 45e3 / Math.max(3, -u));
    }
    if (parked) { bF += m * 4; bR += m * 4; }
    if (hand) bR += m * 7;
    const rollC = (thr > 0 || drive < 0 ? 0.015 : 0.06) * (this.surface < 1 ? 4 : 1); // rolling resistance + engine braking
    const df = T.drive === 'fwd' ? 1 : T.drive === 'awd' ? 0.4 : 0;
    const d = this.steer, cd = Math.cos(d), sd = Math.sin(d);
    // front axle (steered)
    const vfa = v + this.a * r;
    const ufw = u * cd + vfa * sd, vfw = -u * sd + vfa * cd;
    let F = grip(drive * df + oppose(bF + rollC * Nf, ufw, mf, h), -T.corner * Nf * Math.atan2(vfw, Math.max(Math.abs(ufw), 2)), mu * Nf, vfw, mf, h);
    const fxF = F[0], fyF = F[1];
    // rear axle
    const vra = v - this.b * r;
    const capR = mu * Nr * (hand ? 0.5 : 1);
    const driveR = drive * (1 - df);
    F = grip(driveR + oppose(bR + rollC * Nr, u, mr, h), -T.corner * Nr * Math.atan2(vra, Math.max(Math.abs(u), 2)), capR, vra, mr, h);
    const fxR = F[0], fyR = F[1];
    // what the tyres are doing (for skid marks and smoke)
    this.slideR = Math.abs(vra); this.lockR = hand && Math.abs(u) > 2;
    this.burn = Math.abs(driveR) > capR * 0.97 && Math.abs(u) < 14 && thr > 0;
    // forces in the car frame → world
    const fxFb = fxF * cd - fyF * sd, fyFb = fxF * sd + fyF * cd;
    const FX = fxFb + fxR - this.drag * u * Math.abs(u), FY = fyFb + fyR;
    const tau = this.a * fyFb - this.b * fyR;
    const ax = FX / m, ay = FY / m;
    this.vel.x += (ax * sy + ay * cy) * h;
    this.vel.z += (ax * cy - ay * sy) * h;
    this.yawRate += (tau / this.inertia) * h;
    this.yaw += this.yawRate * h;
    this.pos.x += this.vel.x * h; this.pos.z += this.vel.z * h;
    const k = Math.min(1, h * 7);
    this.accX += (ax - this.accX) * k; this.accY += (ay - this.accY) * k;
    this.brakeLight = !parked && ((brk > 0 && u > 0.8) || (thr > 0 && u < -0.8)) ? 1 : 0;
  }

  // impulse at a contact point (r = contact − centre) against something immovable
  hit(rx, rz, nx, nz, e, muC) {
    const m = this.T.mass, I = this.inertia, w = this.yawRate;
    const vpx = this.vel.x + w * rz, vpz = this.vel.z - w * rx;
    const vn = vpx * nx + vpz * nz;
    if (vn >= 0) return;
    const rn = rz * nx - rx * nz;
    const j = (-(1 + e) * vn) / (1 / m + (rn * rn) / I);
    this.vel.x += (j * nx) / m; this.vel.z += (j * nz) / m; this.yawRate += (j * rn) / I;
    const tx = vpx - vn * nx, tz = vpz - vn * nz, tl = Math.hypot(tx, tz);
    if (tl > 1e-3) {
      const ux = tx / tl, uz = tz / tl, rt = rz * ux - rx * uz;
      const jt = Math.min(muC * j, tl / (1 / m + (rt * rt) / I));
      this.vel.x -= (jt * ux) / m; this.vel.z -= (jt * uz) / m; this.yawRate -= (jt * rt) / I;
    }
    this.impact = Math.max(this.impact, j / m);
  }

  collideWorld(cand) {
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw), rad = this.rad;
    for (const off of this.circ) {
      for (const b of cand) {
        if (b.minY !== undefined && b.minY > 2) continue;
        const cx = this.pos.x + sy * off, cz = this.pos.z + cy * off;
        const qx = clamp(cx, b.minX, b.maxX), qz = clamp(cz, b.minZ, b.maxZ);
        let nx = cx - qx, nz = cz - qz, d = Math.hypot(nx, nz);
        if (d >= rad) continue;
        if (d < 1e-4) { // centre inside the box: leave through the nearest face
          const dl = cx - b.minX, dr = b.maxX - cx, dn = cz - b.minZ, ds = b.maxZ - cz, mn = Math.min(dl, dr, dn, ds);
          nx = mn === dl ? -1 : mn === dr ? 1 : 0; nz = nx ? 0 : mn === dn ? -1 : 1; d = -mn;
        } else { nx /= d; nz /= d; }
        const pen = rad - d;
        this.pos.x += nx * pen; this.pos.z += nz * pen;
        this.hit(qx - this.pos.x, qz - this.pos.z, nx, nz, 0.15, 0.3);
      }
    }
  }

  // ground contact, suspension (pitch / roll / bounce), wheel spin and transforms for rendering
  post(dt, world) {
    const T = this.T;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.fwd.set(sy, 0, cy);
    this.surface = world.surfaceAt(this.pos.x, this.pos.z);
    const u = this.vel.x * sy + this.vel.z * cy, speed = Math.abs(u);
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const sx = (i % 2 === 0 ? 1 : -1) * this.halfTrack, sz = i < 2 ? this.wb : -this.wb;
      const g = Math.max(world.groundHeight(this.pos.x + cy * sx + sy * sz, this.pos.z - sy * sx + cy * sz), -2);
      if (this.ready && g - this.gh[i] > 0.07 && speed > 2.5) { // a wheel hits a kerb: jolt
        if (i < 2) this.pitchV -= Math.min(1.2, speed * 0.06); else this.pitchV += Math.min(0.8, speed * 0.04);
        this.heaveV += Math.min(1.4, speed * 0.08);
      }
      this.gh[i] = g; sum += g;
    }
    const base = sum / 4, gh = this.gh;
    if (!this.ready) { this.bodyY = base; this.ready = true; }
    const tPitch = -Math.atan2((gh[0] + gh[1] - gh[2] - gh[3]) / 2, 2 * this.wb);
    const tRoll = Math.atan2((gh[0] + gh[2] - gh[1] - gh[3]) / 2, 2 * this.halfTrack);
    const soft = T.tram ? 0.25 : 1;
    const pT = tPitch + clamp(-this.accX * 0.011 * soft, -0.07, 0.07), rT = tRoll + clamp(this.accY * 0.015 * soft, -0.09, 0.09);
    const dd = Math.min(dt, 0.034);
    this.pitchV += ((pT - this.pitch) * 110 - this.pitchV * 12) * dd; this.pitch += this.pitchV * dd;
    this.rollV += ((rT - this.roll) * 80 - this.rollV * 10) * dd; this.roll += this.rollV * dd;
    this.heaveV += ((base - this.bodyY) * 160 - this.heaveV * 16) * dd; this.bodyY += this.heaveV * dd;
    this.pos.y = base;
    this.group.position.copy(this.pos); this.group.rotation.set(0, this.yaw, 0); this.group.updateMatrix();
    this.body.position.set(0, this.bodyY - base, 0); this.body.rotation.set(this.pitch, 0, this.roll); this.body.updateMatrix();
    if (T.wheel) { this.spinF += (u / T.wheel) * dt; if (!this.lockR) this.spinR += (this.burn ? 3 : 1) * (u / T.wheel) * dt + (this.burn ? 25 * dt : 0); }
    if (this.dynamic && (speed > 1 || this.burn) && this.fleet.camPos.distanceToSquared(this.pos) < 140 * 140) this.effects(dt);
    else this.skid[2] = this.skid[3] = null;
  }

  // rubber on the road: rear wheels leave marks and smoke while sliding, locked or spinning
  effects(dt) {
    const fl = this.fleet;
    const slide = Math.max(0, this.slideR - 2) + (this.lockR ? 2.5 : 0) + (this.burn ? 3 : 0);
    for (const i of [2, 3]) {
      if (slide <= 0.3) { this.skid[i] = null; continue; }
      const sx = (i === 2 ? 1 : -1) * this.halfTrack, sz = -this.wb;
      const wx = this.pos.x + this.fwd.z * sx + this.fwd.x * sz, wz = this.pos.z - this.fwd.x * sx + this.fwd.z * sz, wy = this.gh[i];
      const last = this.skid[i];
      if (!last) this.skid[i] = new THREE.Vector3(wx, wy, wz);
      else if ((wx - last.x) ** 2 + (wz - last.z) ** 2 > 0.09) { fl.skids.add(last, wx, wy, wz); last.set(wx, wy, wz); }
      if (Math.random() < dt * 22 * Math.min(1.5, slide / 3)) fl.smoke.emit(wx, wy + 0.25, wz, this.vel.x * 0.35, this.vel.z * 0.35, slide / 4);
    }
  }

  wheelMatrix(i, out) {
    const T = this.T, front = i < 2;
    _p.set((i % 2 === 0 ? 1 : -1) * this.halfTrack, T.wheel + this.gh[i] - this.pos.y, front ? this.wb : -this.wb);
    _q.setFromAxisAngle(AY, front ? this.steer : 0);
    _q2.setFromAxisAngle(AX, front ? this.spinF : this.spinR);
    _q.multiply(_q2);
    return out.compose(_p, _q, _s.setScalar(T.wheel)).premultiply(this.group.matrix);
  }
}

// ---------------------------------------------------------------- car ↔ car contacts
function pushCar(c, jx, jz, rx, rz) {
  if (c.T.tram) return;
  const dv = Math.hypot(jx, jz) / c.T.mass;
  if (!c.dynamic) {
    if (dv < 1.8 || !c.ai) return; // a light touch: the driver carries on
    c.ai.stun = 2.5 + Math.random() * 2; // a real crash: the car spins away under physics
  }
  c.vel.x += jx / c.T.mass; c.vel.z += jz / c.T.mass; c.yawRate += (rz * jx - rx * jz) / c.inertia;
  c.impact = Math.max(c.impact, dv); c.sleeping = false;
}
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++) {
    const A = cars[i];
    for (let j = i + 1; j < cars.length; j++) {
      const B = cars[j];
      const dx = A.pos.x - B.pos.x, dz = A.pos.z - B.pos.z, lim = (A.T.L + B.T.L) * 0.5 + 0.3;
      if (dx * dx + dz * dz > lim * lim) continue;
      let best = 0, nx = 0, nz = 0, px = 0, pz = 0;
      for (const oa of A.circ) {
        const ax = A.pos.x + A.fwd.x * oa, az = A.pos.z + A.fwd.z * oa;
        for (const ob of B.circ) {
          const bx = B.pos.x + B.fwd.x * ob, bz = B.pos.z + B.fwd.z * ob;
          const ex = ax - bx, ez = az - bz, d = Math.hypot(ex, ez), pen = A.rad + B.rad - d;
          if (pen > best && d > 1e-4) {
            best = pen; nx = ex / d; nz = ez / d;
            px = (ax - nx * A.rad + bx + nx * B.rad) / 2; pz = (az - nz * A.rad + bz + nz * B.rad) / 2;
          }
        }
      }
      if (best <= 0) continue;
      // separate (trams don't budge)
      const wA = A.T.tram ? 0 : 1 / A.T.mass, wB = B.T.tram ? 0 : 1 / B.T.mass;
      if (wA + wB === 0) continue;
      const s = best / (wA + wB);
      A.pos.x += nx * s * wA; A.pos.z += nz * s * wA; B.pos.x -= nx * s * wB; B.pos.z -= nz * s * wB;
      A.sleeping = B.sleeping = false;
      if (!A.dynamic && !B.dynamic) continue;
      // bounce + scrape
      const rax = px - A.pos.x, raz = pz - A.pos.z, rbx = px - B.pos.x, rbz = pz - B.pos.z;
      const rvx = A.vel.x + A.yawRate * raz - B.vel.x - B.yawRate * rbz;
      const rvz = A.vel.z - A.yawRate * rax - B.vel.z + B.yawRate * rbx;
      const vn = rvx * nx + rvz * nz;
      if (vn >= 0) continue;
      const iIA = A.T.tram ? 0 : 1 / A.inertia, iIB = B.T.tram ? 0 : 1 / B.inertia;
      const ra = raz * nx - rax * nz, rb = rbz * nx - rbx * nz;
      const jn = (-(1 + 0.25) * vn) / (wA + wB + ra * ra * iIA + rb * rb * iIB);
      let jx = jn * nx, jz = jn * nz;
      const tx = rvx - vn * nx, tz = rvz - vn * nz, tl = Math.hypot(tx, tz);
      if (tl > 1e-3) { const jt = Math.min(0.3 * jn, tl / (wA + wB)); jx -= (jt * tx) / tl; jz -= (jt * tz) / tl; }
      pushCar(A, jx, jz, rax, raz);
      pushCar(B, -jx, -jz, rbx, rbz);
    }
  }
}

// one physics frame for every vehicle (AI cars and trams have already been moved by Traffic)
export function stepCars(dt, cars, world) {
  for (const c of cars) if (c.dynamic) c.integrate(dt, world);
  collideCars(cars);
  for (const c of cars) c.post(dt, world);
}

// ---------------------------------------------------------------- traffic AI
// Cars follow the road grid in the right-hand lane; trams shuttle along their line, stopping at stops.
const LANE = 3.45, TRACK = 1.25;
export class Traffic {
  constructor(scene, world, count, tramLines = []) {
    this.scene = scene; this.world = world; this.cars = []; this.trams = [];
    const types = ['sedan', 'hatch', 'sedan', 'suv', 'hatch', 'sports'];
    for (let k = 0; k < count; k++) {
      let from, to;
      do {
        const i = Math.floor(Math.random() * (N + 1)), j = Math.floor(Math.random() * N);
        const horiz = Math.random() < 0.5;
        from = horiz ? [j, i] : [i, j]; to = horiz ? [j + 1, i] : [i, j + 1];
      } while (world.blockedEdge(from, to));
      const car = new Car(scene, types[k % types.length], CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], new THREE.Vector3(), 0);
      car.driver = 'ai'; car.ai = { v: 0, stun: 0, phase: 'seg', cruise: 9 + Math.random() * 4 };
      this.setSegment(car, from, to, 0.1 + Math.random() * 0.8);
      car.ai.v = car.ai.cruise * 0.8;
      this.cars.push(car);
    }
    for (const line of tramLines) {
      for (const dir of [1, -1]) {
        const x = dir > 0 ? line.x0 + 30 : line.x1 - 30, z = line.z + dir * TRACK;
        const tram = new Car(scene, 'tram', '#f3f1ec', new THREE.Vector3(x, 0, z), dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        tram.driver = 'ai';
        tram.ai = { tram: true, dir, line, v: 0, wait: 2 + Math.random() * 3, skipX: null, cross: 1, zFrom: z, zTo: z };
        this.trams.push(tram); this.cars.push(tram);
      }
    }
  }
  node([i, j]) { return new THREE.Vector3(roadLine(i), 0, roadLine(j)); }
  setSegment(car, from, to, t = 0) {
    const A = this.node(from), Bn = this.node(to);
    const d = Bn.clone().sub(A).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x); // right-hand traffic
    Object.assign(car.ai, { from, to, d, start: A.clone().addScaledVector(d, ROAD * 0.7).addScaledVector(right, LANE), end: Bn.clone().addScaledVector(d, -ROAD * 0.7).addScaledVector(right, LANE) });
    if (t > 0) {
      car.pos.lerpVectors(car.ai.start, car.ai.end, t);
      car.yaw = Math.atan2(d.x, d.z); car.fwd.set(d.x, 0, d.z);
    }
  }
  pickNext(car) {
    const [i, j] = car.ai.to, [pi, pj] = car.ai.from;
    let opts = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a <= N && b <= N && !this.world.blockedEdge([i, j], [a, b]));
    if (opts.length > 1) opts = opts.filter(([a, b]) => !(a === pi && b === pj)); // no U-turns unless it's a dead end
    const straight = [i + (i - pi), j + (j - pj)];
    const pick = Math.random() < 0.55 && opts.some(([a, b]) => a === straight[0] && b === straight[1]) ? straight : opts[Math.floor(Math.random() * opts.length)];
    this.setSegment(car, car.ai.to, pick);
  }
  // after a crash: rejoin the road network at the nearest junction, heading roughly the same way
  recover(car) {
    const i = clamp(Math.round((car.pos.x + HALF) / CELL), 0, N), j = clamp(Math.round((car.pos.z + HALF) / CELL), 0, N);
    const opts = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a <= N && b <= N && !this.world.blockedEdge([i, j], [a, b]));
    let best = opts[0], bd = -2;
    for (const o of opts) { const dot = (o[0] - i) * car.fwd.x + (o[1] - j) * car.fwd.z; if (dot > bd) { bd = dot; best = o; } }
    this.setSegment(car, [i, j], best);
    car.ai.phase = 'turn'; car.ai.v = 0; car.ai.stun = 0;
  }
  update(dt, obstacles) {
    for (const car of this.cars) {
      if (car.driver !== 'ai' || !car.ai) continue;
      if (car.ai.tram) { this.tramUpdate(car, dt, obstacles); continue; }
      const ai = car.ai;
      if (ai.stun > 0) { ai.stun -= dt; if (ai.stun <= 0) { if (car.vel.length() < 1.5) this.recover(car); else ai.stun = 0.5; } continue; }
      const target = ai.phase === 'seg' ? ai.end : ai.start;
      const tx = target.x - car.pos.x, tz = target.z - car.pos.z, dist = Math.hypot(tx, tz);
      if (ai.phase === 'seg' && dist < 2.5) { this.pickNext(car); ai.phase = 'turn'; continue; }
      if (ai.phase === 'turn' && dist < 2.5) ai.phase = 'seg';
      let dy = Math.atan2(tx, tz) - car.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      // anything in front? (people, cars, and trams crossing the junction)
      let blocked = false;
      const fx = car.fwd.x, fz = car.fwd.z;
      for (const o of obstacles) {
        if (o === car || (o.T && o.T.tram)) continue;
        const op = o.pos || o;
        const rx = op.x - car.pos.x, rz = op.z - car.pos.z, ahead = rx * fx + rz * fz;
        if (ahead > 0 && ahead < 11 && Math.abs(rx * fz - rz * fx) < 2.2) { blocked = true; break; }
      }
      if (!blocked) {
        for (const t of this.trams) {
          for (const k of [4, 8]) {
            const px = car.pos.x + fx * k - t.pos.x, pz = car.pos.z + fz * k - t.pos.z;
            if (Math.abs(px * t.fwd.x + pz * t.fwd.z) < t.T.L / 2 + 3 && Math.abs(px * t.fwd.z - pz * t.fwd.x) < t.T.W / 2 + 1.5) blocked = true;
          }
        }
      }
      const want = blocked ? 0 : ai.phase === 'turn' ? 6 : ai.cruise;
      const prev = ai.v;
      ai.v += clamp(want - ai.v, -9 * dt, 3.5 * dt);
      car.brakeLight = want < ai.v - 0.3 ? 1 : 0;
      car.steer = clamp(dy * 1.6, -0.6, 0.6);
      car.yawRate = (ai.v * Math.tan(car.steer)) / (car.a + car.b);
      car.yaw += car.yawRate * dt;
      car.fwd.set(Math.sin(car.yaw), 0, Math.cos(car.yaw));
      car.vel.set(car.fwd.x * ai.v, 0, car.fwd.z * ai.v);
      car.pos.x += car.vel.x * dt; car.pos.z += car.vel.z * dt;
      car.accX += ((ai.v - prev) / Math.max(dt, 1e-3) - car.accX) * Math.min(1, dt * 6);
      car.accY = ai.v * car.yawRate;
    }
  }
  tramUpdate(t, dt, obstacles) {
    const ai = t.ai, L = ai.line;
    // stops: the next one ahead, and the end of the line
    const end = ai.dir > 0 ? L.x1 - t.pos.x : t.pos.x - L.x0;
    let dStop = end, isEnd = true;
    if (ai.skipX !== null && Math.abs(t.pos.x - ai.skipX) > 6) ai.skipX = null;
    for (const s of L.stops) {
      if (s === ai.skipX) continue;
      const d = (s - t.pos.x) * ai.dir;
      if (d > 0 && d < dStop) { dStop = d; isEnd = false; }
    }
    let want = Math.min(11, Math.sqrt(Math.max(0, 2 * 1.4 * (dStop - 1))));
    for (const o of obstacles) { // someone on the tracks ahead → wait
      if (o === t) continue;
      const op = o.pos || o;
      const ahead = (op.x - t.pos.x) * ai.dir;
      if (ahead > t.T.L / 2 && ahead < t.T.L / 2 + 13 && Math.abs(op.z - t.pos.z) < 1.9) { want = 0; break; }
    }
    if (ai.wait > 0) {
      ai.wait -= dt; want = 0;
      if (ai.wait <= 0 && ai.atEnd) { // change ends: the tram drives back on the other track via a crossover
        ai.atEnd = false; ai.dir = -ai.dir; t.yaw += Math.PI; t.fwd.set(Math.sin(t.yaw), 0, Math.cos(t.yaw));
        ai.cross = 0; ai.zFrom = t.pos.z; ai.zTo = L.z + ai.dir * TRACK;
      }
    } else if (dStop < 1.3 && ai.v < 0.4) {
      ai.wait = isEnd ? 9 : 7; ai.atEnd = isEnd;
      if (!isEnd) ai.skipX = L.stops.find((s) => Math.abs(s - t.pos.x) < 3) ?? null;
    }
    const prev = ai.v;
    ai.v += clamp(want - ai.v, -2.2 * dt, 1.1 * dt);
    const dx = ai.dir * ai.v * dt;
    t.pos.x += dx;
    let dz = 0;
    if (ai.cross < 1) {
      ai.cross = Math.min(1, ai.cross + Math.abs(dx) / 34);
      const s = ai.cross * ai.cross * (3 - 2 * ai.cross);
      dz = ai.zFrom + (ai.zTo - ai.zFrom) * s - t.pos.z;
    } else dz = ai.zTo - t.pos.z;
    t.pos.z += dz;
    t.yaw = (ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - ai.dir * Math.atan2(dz, Math.max(Math.abs(dx), 1e-4)) * (ai.cross < 1 && ai.v > 0.1 ? 1 : 0);
    t.fwd.set(Math.sin(t.yaw), 0, Math.cos(t.yaw));
    t.vel.set(dx / Math.max(dt, 1e-3), 0, dz / Math.max(dt, 1e-3)); t.yawRate = 0;
    t.brakeLight = want < ai.v - 0.3 ? 1 : 0;
    t.accX += ((ai.v - prev) / Math.max(dt, 1e-3) - t.accX) * Math.min(1, dt * 4); t.accY = 0;
  }
}
