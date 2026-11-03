// Rīga – a compact, drivable version of Latvia's capital: Vecrīga (the Old Town) with its church spires
// and gabled merchant houses, the Art Nouveau centre, the canal park ring with the Freedom Monument,
// the Daugava embankment with the Stone Bridge and the cable-stayed bridge to Pārdaugava, the Central
// Market hangars, the Academy of Sciences, the TV tower, trams, and a full day/night cycle.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

export const BLOCK = 56, ROAD = 14, N = 8, CELL = BLOCK + ROAD, HALF = (N * CELL) / 2;
export const SIDEWALK = 3.2, CURB = 0.18;
export const roadLine = (i) => -HALF + i * CELL; // centre line of road i (0..N)
export const EMB_X = HALF + ROAD / 2; // 11. novembra krastmala promenade starts here
export const RIVER_X = EMB_X + 26; // quay wall of the Daugava
export const FAR_X = RIVER_X + 230; // Pārdaugava (left bank)
export const FAR_END = FAR_X + 240;
export const WATER_Y = -1.7;
export const TRAM_Z = roadLine(2);
const OLD_X = roadLine(6); // Vecrīga lies between Aspazijas bulvāris and the river
const CANAL_Y = -0.85, CANAL_HW = 4.4;
export const BRIDGES = [
  { z: roadLine(4), w: 10, peak: 3.4, ramp: 0.16, name: 'Akmens tilts' },
  { z: roadLine(7), w: 11, peak: 7, ramp: 0.26, name: 'Vanšu tilts' },
];
const B0 = RIVER_X - 2, B1 = FAR_X + 2;
const sm01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function deckY(b, x) { const L = (B1 - B0) * b.ramp; return b.peak * sm01((x - B0) / L) * sm01((B1 - x) / L); }

// ---- street names (north–south roads by index; east–west roads are named differently in the Old Town)
const NS_NAMES = ['Stabu iela', 'Ģertrūdes iela', 'Lāčplēša iela', 'Dzirnavu iela', 'Elizabetes iela', 'Raiņa bulvāris', 'Aspazijas bulvāris', 'Smilšu iela', '11. novembra krastmala'];
const EW_CENTRE = ['Maskavas iela', 'Gogoļa iela', 'Krišjāņa Barona iela', 'Tērbatas iela', 'Brīvības iela', 'Krišjāņa Valdemāra iela', 'Hanzas iela', 'Kronvalda bulvāris', 'Pētersalas iela'];
const EW_OLD = ['Krasta iela', 'Gogoļa iela', '13. janvāra iela', 'Audēju iela', 'Kaļķu iela', 'Jauniela', 'Jēkaba iela', 'Pils iela', 'Citadeles iela'];
export function locationAt(x, z) {
  for (const b of BRIDGES) if (x > B0 && x < B1 && Math.abs(z - b.z) < b.w + 1) return { street: b.name, district: 'Daugava' };
  if (x >= FAR_X) return { street: Math.abs(x - (FAR_X + 29)) < 7 ? 'Kuģu iela' : null, district: 'Pārdaugava' };
  if (x > RIVER_X) return { street: null, district: 'Daugava' };
  if (x > EMB_X) return { street: '11. novembra krastmala', district: 'Krastmala' };
  const i = Math.max(0, Math.min(N, Math.round((x + HALF) / CELL))), j = Math.max(0, Math.min(N, Math.round((z + HALF) / CELL)));
  const onNS = Math.abs(x - roadLine(i)) < ROAD / 2, onEW = Math.abs(z - roadLine(j)) < ROAD / 2;
  const old = x > OLD_X;
  const district = old ? (z < TRAM_Z ? 'Maskavas forštate' : 'Vecrīga') : x > roadLine(5) ? 'Bastejkalns' : 'Centrs';
  let street = null;
  const dNS = Math.abs(x - roadLine(i)), dEW = Math.abs(z - roadLine(j)), near = ROAD / 2 + SIDEWALK + 0.5;
  const ew = () => (j === 4 && x > roadLine(5) && x < roadLine(6) ? 'Brīvības laukums' : (old ? EW_OLD : EW_CENTRE)[j]);
  if (onEW) street = ew();
  else if (onNS) street = NS_NAMES[i];
  else if (dEW < near && dEW <= dNS) street = ew(); // on the sidewalk
  else if (dNS < near) street = NS_NAMES[i];
  return { street, district };
}

// ---------------------------------------------------------------- geometry helpers
// facade UVs: one tile = 14 m wide × th m tall (Art Nouveau / Old Town tiles are 28 m with shops at the bottom)
function facadeUV(g, w, h, d, v0 = 0, th = 28) {
  const uv = g.attributes.uv;
  const faces = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (!faces[f]) { uv.setXY(i, 0.004, 0.998); continue; }
    uv.setXY(i, (uv.getX(i) * faces[f][0]) / 14, v0 + (uv.getY(i) * faces[f][1]) / th);
  }
}
function colorize(g, color) {
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const flat = (g) => (g.index ? g.toNonIndexed() : g);
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
function geo(pos, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function scaleUV(g, k) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; }
function flatPlane(x0, x1, z0, z1, y, tile) { // horizontal rectangle with UVs in metres / tile
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / tile, (uv.getY(i) * (z1 - z0)) / tile);
  return g;
}
// triangular gable prism, ridge along local z: front/back triangles + the two roof slopes
function gablePrism(w, d, rh) {
  const hw = w / 2, hd = d / 2;
  const caps = [-hw, 0, hd, hw, 0, hd, 0, rh, hd, hw, 0, -hd, -hw, 0, -hd, 0, rh, -hd];
  const slopes = [-hw, 0, -hd, -hw, 0, hd, 0, rh, hd, -hw, 0, -hd, 0, rh, hd, 0, rh, -hd,
    hw, 0, hd, hw, 0, -hd, 0, rh, -hd, hw, 0, hd, 0, rh, -hd, 0, rh, hd];
  return { caps, slopes };
}
function place(g, x, y, z, ry = 0) { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }

// vertex-coloured building kit (roofs, trims, landmarks): merged into a few meshes at the end
class Kit {
  constructor() { this.lists = { plain: [], glass: [], gold: [] }; }
  add(list, g, color) {
    g = flat(g); g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    colorize(g, color);
    this.lists[list].push(g);
    return g;
  }
  box(list, color, w, h, d, x, y, z, ry = 0) { return this.add(list, place(new THREE.BoxGeometry(w, h, d), x, y, z, ry), color); }
  cyl(list, color, rt, rb, h, seg, x, y, z) { return this.add(list, place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z), color); }
  cone(list, color, r, h, seg, x, y, z) { return this.add(list, place(new THREE.ConeGeometry(r, h, seg), x, y, z), color); }
  sphere(list, color, r, x, y, z, sy = 1) { const g = new THREE.SphereGeometry(r, 14, 10); g.scale(1, sy, 1); return this.add(list, place(g, x, y, z), color); }
  gable(list, color, w, d, rh, x, y, z, ry = 0) { const p = gablePrism(w, d, rh); return this.add(list, place(geo([...p.caps, ...p.slopes]), x, y, z, ry), color); }
  // hip / mansard roof: a 4-sided frustum (top = k × base)
  hip(list, color, w, d, rh, k, x, y, z) {
    const g = new THREE.CylinderGeometry(k, 1, rh, 4, 1); g.rotateY(Math.PI / 4);
    g.scale(w / Math.SQRT2, 1, d / Math.SQRT2);
    const f = flat(g); f.computeVertexNormals();
    return this.add(list, place(f, x, y + rh / 2, z), color);
  }
  mesh(scene, list, mat, shadow = true) {
    if (!this.lists[list].length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.lists[list]), mat);
    m.castShadow = shadow; m.receiveShadow = true; scene.add(m);
    return m;
  }
}

const ART_COLORS = ['#e8dcc8', '#d9c4a5', '#cdbba8', '#b9c6cc', '#e5cbb9', '#cfd8c4', '#efe8dc', '#d9b98d', '#c9aba2', '#a9bccb', '#ddd3c0', '#c4b49a'];
const OLD_COLORS = ['#f1e4c9', '#e8c98c', '#da9470', '#f3ede3', '#c8d6b6', '#e9baa6', '#d8c7a2', '#b9c6cd', '#e6d4b2', '#f0d27a'];
const ART_ROOFS = ['#474c52', '#3f4448', '#4e6c63', '#8a3d2c', '#555a60'];
const OLD_ROOFS = ['#9c4632', '#8a3a2a', '#a8553a', '#7a3b2b', '#93412f'];
const BRICK = '#9a4a33', COPPER = '#5d9a82', SPIRE = '#2d4640', WHITE = '#ece6da', GOLD = '#d4a940';

function blockType(i, j) {
  if (i === 5) return j === 0 ? 'low' : 'park';
  if (i >= 6) {
    if (j <= 1) return i === 7 ? 'market' : j === 0 ? 'academy' : 'low';
    return { '7,7': 'castle', '6,5': 'dom', '6,3': 'peter', '7,4': 'townhall', '6,6': 'powder', '6,4': 'cat', '7,6': 'brothers' }[i + ',' + j] || 'old';
  }
  if (i === 2 && j === 4) return 'esplanade';
  if ((i === 1 && j === 2) || (i === 0 && j === 6)) return 'park';
  if (i === 3 && j === 6) return 'tower';
  return 'art';
}

// ---------------------------------------------------------------- World
export class World {
  constructor(scene, renderer, quality) {
    this.scene = scene; this.renderer = renderer; this.q = quality;
    this.colliders = []; // {minX,maxX,minZ,maxZ,h,(minY),(small)}
    this.blocks = []; // {x0,x1,z0,z1,cx,cz,type,i,j,park,canal}
    this.emissives = []; // [material, nightIntensity, base]
    this.time = 18.6; // golden hour: the sun sets over the Daugava
    this.timeSpeed = 1 / 60; // game hours per real second (1 day = 24 min)
    this.places = {};
    this.interiors = []; this.benches = []; this.hangouts = []; this.lampHeads = [];
    this.tramLines = [{ z: TRAM_Z, x0: roadLine(0) + 12, x1: roadLine(N) - 12, stops: [1, 3, 5, 7].map((i) => roadLine(i) + CELL / 2 + 10) }];
    this.blockedEdges = new Set(['5,4|6,4', '6,4|5,4']); // the Freedom Monument plaza is pedestrian
    this.grid = null;
    this.build();
  }
  blockedEdge(a, b) { return this.blockedEdges.has(a[0] + ',' + a[1] + '|' + b[0] + ',' + b[1]); }

  build() {
    const s = this.scene;
    this.r = TX.rng(1201);
    // ---------- light, sky, fog
    this.hemi = new THREE.HemisphereLight('#bcd2f0', '#5a4f45', 0.8); s.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    this.sun.castShadow = this.q.shadows;
    const sz = this.q.high ? 70 : 45;
    Object.assign(this.sun.shadow.camera, { left: -sz, right: sz, top: sz, bottom: -sz, near: 1, far: 600 });
    const sm = this.q.ultra ? 4096 : this.q.high ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    s.add(this.sun); s.add(this.sun.target);
    this.sky = new Sky(); this.sky.scale.setScalar(4000); s.add(this.sky);
    const su = this.sky.material.uniforms;
    su.turbidity.value = 4; su.rayleigh.value = 1.6; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    this.envSky = new Sky(); this.envSky.scale.setScalar(1000);
    this.envScene = new THREE.Scene(); this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.lastEnvSun = -999;
    s.fog = new THREE.Fog('#c3cfdb', 240, this.q.high ? 1000 : 560);

    // ---------- materials
    const tex = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; };
    const M = (o) => new THREE.MeshStandardMaterial(o);
    this.mats = {
      park: M({ map: tex(TX.grassTexture(), 1, 1), roughness: 1, color: '#c9e6a8' }),
      paving: M({ map: tex(TX.pavingTexture(), 1, 1), roughness: 0.9 }),
      walk: M({ map: tex(TX.concreteTexture(), 1, 1), roughness: 0.95 }),
      road: M({ map: TX.roadTexture(), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
      asph: M({ map: tex(TX.asphaltTexture(), 2, 2), roughness: 0.92 }),
      cobble: M({ map: tex(TX.cobbleTexture(), 4, 4), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
      plain: M({ vertexColors: true, roughness: 0.82, metalness: 0.02 }),
      glass: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.55, clearcoat: 0.5 }),
      gold: M({ color: GOLD, metalness: 1, roughness: 0.28 }),
      water: new THREE.MeshPhysicalMaterial({ color: '#2b5866', roughness: 0.08, metalness: 0, normalMap: tex(TX.waterNormalTexture(), 70, 70), normalScale: new THREE.Vector2(0.45, 0.45), transparent: true, opacity: 0.94, clearcoat: 0.6 }),
    };
    this.waterNormal = this.mats.water.normalMap;
    const facMat = (map, emis, k) => { const m = M({ map, vertexColors: true, roughness: 0.78, emissiveMap: emis, emissive: '#ffffff', emissiveIntensity: 0 }); this.emissives.push([m, k]); return m; };
    this.mats.art = facMat(TX.artFacadeTexture(false), TX.artFacadeTexture(true), 1.25);
    this.mats.old = facMat(TX.oldFacadeTexture(false), TX.oldFacadeTexture(true), 1.25);
    this.mats.tower = facMat(TX.glassTowerTexture(false), TX.glassTowerTexture(true), 1.0);
    this.mats.tower.roughness = 0.3; this.mats.tower.metalness = 0.45;
    this.F = { art: [], old: [], tower: [] };
    this.G = { walk: [], lawn: [], pave: [], water: [] };
    this.K = new Kit();
    this.lamps = []; this.trees = []; this.signs = [];

    this.buildGround();
    this.buildRoads();
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) this.buildBlock(i, j);
    this.buildPlaza();
    this.buildRiver();
    this.buildFarBank();
    this.buildTram();
    this.buildLandmarksFar();
    // merge everything into a handful of draw calls
    const merge = (list, mat, shadow = true) => {
      if (!list.length) return null;
      const m = new THREE.Mesh(mergeGeometries(list.map((g) => { const f = flat(g); f.clearGroups(); return f; })), mat);
      m.castShadow = shadow; m.receiveShadow = true; s.add(m); return m;
    };
    merge(this.F.art, this.mats.art); merge(this.F.old, this.mats.old); merge(this.F.tower, this.mats.tower);
    merge(this.G.walk, this.mats.walk, false); merge(this.G.lawn, this.mats.park, false); merge(this.G.pave, this.mats.paving, false);
    merge(this.G.water, this.mats.water, false);
    this.K.mesh(s, 'plain', this.mats.plain); this.K.mesh(s, 'glass', this.mats.glass); this.K.mesh(s, 'gold', this.mats.gold, false);
    this.buildSigns();
    this.buildTrees();
    this.buildLamps();
    this.buildSkyExtras();
    this.buildPlaces();
    // invisible walls around the playable area
    const X0 = -HALF - 40, X1 = FAR_END, Z0 = -HALF - 40, Z1 = HALF + 40;
    for (const c of [[X0 - 2, X0, Z0, Z1], [X1, X1 + 2, Z0, Z1], [X0, X1, Z0 - 2, Z0], [X0, X1, Z1, Z1 + 2]]) this.colliders.push({ minX: c[0], maxX: c[1], minZ: c[2], maxZ: c[3], h: 60, small: true, bound: true });
  }

  // ---------------------------------------------------------------- ground, roads
  buildGround() {
    const E = 2600, cx0 = -HALF - ROAD / 2, cz1 = HALF + ROAD / 2;
    // grass everywhere except the city grid (roads + blocks cover it) and the river
    const grass = TX.grassTexture();
    for (const [x0, x1, z0, z1] of [[-E, cx0, -E, E], [cx0, RIVER_X, cz1, E], [cx0, RIVER_X, -E, -cz1], [FAR_X, E, -E, E]]) {
      const t = grass.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 7, (z1 - z0) / 7);
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, -0.06, (z0 + z1) / 2);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); m.receiveShadow = true; this.scene.add(m);
    }
    this.G_emb = flatPlane(EMB_X, RIVER_X, -cz1, cz1, 0.0, 4); // the embankment promenade
  }

  buildRoads() {
    const s = this.scene;
    const asph = [], cob = [], inter = [], interC = [], cw = [];
    const old = (x) => x > OLD_X + 1 && x < roadLine(N) - 1;
    const seg = (cx, cz, alongX, len, list) => {
      const g = new THREE.PlaneGeometry(ROAD, len); g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) * len) / 14);
      if (alongX) g.rotateY(Math.PI / 2);
      g.translate(cx, 0.02, cz); list.push(g);
    };
    const L = CELL - ROAD;
    for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) seg(roadLine(i), roadLine(j) + CELL / 2, false, L, old(roadLine(i)) ? cob : asph);
    for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) {
      if (j === 4 && i === 5) continue; // Freedom Monument plaza
      seg(roadLine(i) + CELL / 2, roadLine(j), true, L, old(roadLine(i) + CELL / 2) ? cob : asph);
    }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = roadLine(i), z = roadLine(j);
      const g = new THREE.PlaneGeometry(ROAD, ROAD); g.rotateX(-Math.PI / 2); g.translate(x, 0.035, z);
      (old(x) ? interC : inter).push(g);
      if (old(x)) continue;
      for (let k = -5; k <= 5; k++) for (const [dx, dz, rot] of [[0, ROAD / 2 + 1.2, 0], [0, -ROAD / 2 - 1.2, 0], [ROAD / 2 + 1.2, 0, 1], [-ROAD / 2 - 1.2, 0, 1]]) {
        if (j === 4 && ((i === 5 && dx > 0) || (i === 6 && dx < 0))) continue;
        const c = new THREE.PlaneGeometry(0.6, 2.2); c.rotateX(-Math.PI / 2); if (rot) c.rotateY(Math.PI / 2);
        c.translate(x + dx + (rot ? 0 : k * 1.15), 0.045, z + dz + (rot ? k * 1.15 : 0)); cw.push(c);
      }
    }
    const add = (list, mat) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list), mat); m.receiveShadow = true; s.add(m); };
    add(asph, this.mats.road); add(cob, this.mats.cobble); add(inter, this.mats.asph); add(interC, this.mats.cobble);
    add(cw, new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.8 }));
  }

  // ---------------------------------------------------------------- city blocks
  buildBlock(i, j) {
    const x0 = roadLine(i) + ROAD / 2, x1 = roadLine(i + 1) - ROAD / 2, z0 = roadLine(j) + ROAD / 2, z1 = roadLine(j + 1) - ROAD / 2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const type = blockType(i, j);
    const b = { x0, x1, z0, z1, cx, cz, type, i, j, park: type === 'park' || type === 'esplanade' };
    this.blocks.push(b);
    // sidewalk slab (canal parks get banks with the canal cut out)
    if (i === 5 && b.park) this.canalPark(b);
    else { const g = new THREE.BoxGeometry(BLOCK, CURB, BLOCK); scaleUV(g, 14); g.translate(cx, CURB / 2, cz); this.G.walk.push(g); }
    for (let k = 0; k < 3; k++) {
      const t = -BLOCK / 2 + 8 + k * ((BLOCK - 16) / 2);
      this.lamps.push([cx + t, z0 + 0.6, 0, CURB], [cx + t, z1 - 0.6, Math.PI, CURB], [x0 + 0.6, cz + t, Math.PI / 2, CURB], [x1 - 0.6, cz + t, -Math.PI / 2, CURB]);
    }
    const lot = { x0: x0 + SIDEWALK, x1: x1 - SIDEWALK, z0: z0 + SIDEWALK, z1: z1 - SIDEWALK };
    switch (type) {
      case 'park': if (i !== 5) this.park(b, lot); break;
      case 'esplanade': this.park(b, lot); this.orthodoxCathedral(cx, cz); break;
      case 'art': this.perimeter(b, lot, 'art'); break;
      case 'tower': this.perimeter(b, lot, 'art'); this.glassTower(cx, cz, 18, 70, '#b9cbd8'); break;
      case 'old': case 'brothers': this.perimeter(b, lot, 'old', type === 'brothers'); break;
      case 'low': this.perimeter(b, lot, 'low'); break;
      case 'cat': this.perimeter(b, lot, 'old', false, true); break;
      case 'peter': this.perimeter(b, lot, 'old', false, false, ['-z']); this.square(lot.x0, lot.x1, lot.z0 + 11, lot.z1); this.stPeter(cx, cz + 6); break;
      case 'dom': this.perimeter(b, lot, 'old', false, false, ['+z']); this.square(lot.x0, lot.x1, lot.z0, lot.z1 - 11); this.dom(cx - 2, cz - 6); break;
      case 'townhall': this.townHall(b, lot); break;
      case 'powder': this.perimeter(b, lot, 'old', false, false, ['-z', '+z', '+x']); this.square(lot.x0, lot.x1 - 11, lot.z0 + 11, lot.z1 - 11); this.powderTower(lot.x0 + 8, cz); break;
      case 'castle': this.castle(lot); break;
      case 'market': this.market(lot); break;
      case 'academy': this.square(lot.x0, lot.x1, lot.z0, lot.z1); this.academy(cx, cz); break;
    }
  }

  square(x0, x1, z0, z1) { this.G.pave.push(flatPlane(x0, x1, z0, z1, CURB + 0.01, 4)); }

  park(b, lot) {
    const r = this.r;
    this.G.lawn.push(flatPlane(lot.x0, lot.x1, lot.z0, lot.z1, CURB + 0.01, 3.1));
    if (b.type === 'esplanade') this.hangouts.push(new THREE.Vector3(b.cx + 14, CURB, b.cz - 14));
    else {
      // fountain in the middle, benches facing it
      this.K.cyl('plain', '#9d968c', 4, 4.4, 0.7, 28, b.cx, CURB + 0.35, b.cz);
      this.colliders.push({ minX: b.cx - 4.2, maxX: b.cx + 4.2, minZ: b.cz - 4.2, maxZ: b.cz + 4.2, h: 0.9 });
      const w = new THREE.CircleGeometry(3.7, 28); w.rotateX(-Math.PI / 2); w.translate(b.cx, CURB + 0.62, b.cz); this.G.water.push(w);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, x = b.cx + Math.cos(a) * 7.6, z = b.cz + Math.sin(a) * 7.6; this.benches.push({ pos: new THREE.Vector3(x, CURB, z), yaw: Math.atan2(b.cx - x, b.cz - z) }); }
      this.hangouts.push(new THREE.Vector3(b.cx + 11, CURB, b.cz + 4), new THREE.Vector3(b.cx - 10, CURB, b.cz - 6));
    }
    for (let k = 0; k < 16; k++) {
      const x = b.cx + (r() - 0.5) * (BLOCK - 14), z = b.cz + (r() - 0.5) * (BLOCK - 14);
      if (Math.hypot(x - b.cx, z - b.cz) < 11) continue;
      if (b.type === 'esplanade' && Math.abs(x - b.cx) < 18 && Math.abs(z - b.cz) < 12) continue;
      this.trees.push([x, CURB, z, 0.8 + r() * 0.5, r() < 0.25 ? 1 : 0]);
    }
  }

  // the Riga city canal winds through Bastejkalns: x of the canal centre line at z inside block b
  canalX(b, z) { const t = (z - (b.z0 + SIDEWALK)) / (BLOCK - 2 * SIDEWALK); return b.cx - 8 + (b.j % 2 ? -7 : 7) * Math.sin(Math.PI * Math.max(0, Math.min(1, t))); }
  canalPark(b) {
    const r = this.r, K = this.K;
    b.canal = true;
    const za = b.z0 + SIDEWALK, zb = b.z1 - SIDEWALK, n = 14;
    // the sidewalks along the two streets bridge the canal
    for (const z of [b.z0 + SIDEWALK / 2, b.z1 - SIDEWALK / 2]) { const g = new THREE.BoxGeometry(BLOCK, CURB, SIDEWALK); scaleUV(g, 14); g.translate(b.cx, CURB / 2, z); this.G.walk.push(g); }
    // two banks: shapes with a winding inner edge, extruded down to form the canal walls
    for (const side of [-1, 1]) {
      const sh = new THREE.Shape();
      const outer = side < 0 ? b.x0 : b.x1;
      sh.moveTo(outer, za);
      for (let k = 0; k <= n; k++) { const z = za + ((zb - za) * k) / n; sh.lineTo(this.canalX(b, z) + side * CANAL_HW, z); }
      sh.lineTo(outer, zb);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: CURB - CANAL_Y + 0.8, bevelEnabled: false, curveSegments: 1 });
      scaleUV(g, 0.25);
      g.rotateX(Math.PI / 2); g.translate(0, CURB, 0); // shape (x, y) → world (x, z); extrusion goes down
      this.G.walk.push(g);
      const top = new THREE.ShapeGeometry(sh); scaleUV(top, 1 / 3.1);
      top.rotateX(Math.PI / 2); top.translate(0, CURB + 0.012, 0);
      const ix = top.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; }
      top.computeVertexNormals();
      this.G.lawn.push(top);
    }
    const wg = new THREE.PlaneGeometry(26, zb - za); wg.rotateX(-Math.PI / 2); wg.translate(b.cx - 8, CANAL_Y, (za + zb) / 2); this.G.water.push(wg);
    for (const side of [-1, 1]) {
      for (let k = 0; k < n; k++) {
        const zA = za + ((zb - za) * k) / n, zB = za + ((zb - za) * (k + 1)) / n;
        const xA = this.canalX(b, zA) + side * (CANAL_HW + 0.1), xB = this.canalX(b, zB) + side * (CANAL_HW + 0.1);
        this.colliders.push({ minX: Math.min(xA, xB) - 0.15, maxX: Math.max(xA, xB) + 0.15, minZ: zA, maxZ: zB, h: CURB + 1, small: true });
        const len = Math.hypot(xB - xA, zB - zA), ang = Math.atan2(xB - xA, zB - zA);
        K.box('plain', '#2a2f2c', 0.06, 0.06, len, (xA + xB) / 2, CURB + 1.0, (zA + zB) / 2, ang);
        K.box('plain', '#2a2f2c', 0.07, 1.0, 0.07, xA, CURB + 0.5, zA);
      }
    }
    for (const z of [za + 0.1, zb - 0.1]) this.colliders.push({ minX: this.canalX(b, z) - CANAL_HW, maxX: this.canalX(b, z) + CANAL_HW, minZ: z - 0.15, maxZ: z + 0.15, h: CURB + 1, small: true });
    for (let k = 0; k < 14; k++) {
      const z = za + 4 + r() * (zb - za - 8), cxz = this.canalX(b, z);
      const west = r() < 0.5;
      const x = west ? b.x0 + SIDEWALK + 2 + r() * Math.max(1, cxz - CANAL_HW - b.x0 - SIDEWALK - 5) : cxz + CANAL_HW + 3 + r() * Math.max(1, b.x1 - SIDEWALK - cxz - CANAL_HW - 6);
      this.trees.push([x, CURB, z, 0.85 + r() * 0.5, r() < 0.3 ? 1 : 0]);
    }
    for (const z of [b.cz - 10, b.cz + 12]) this.benches.push({ pos: new THREE.Vector3(b.x1 - SIDEWALK - 3, CURB, z), yaw: -Math.PI / 2 });
    this.hangouts.push(new THREE.Vector3(b.cx + 14, CURB, b.cz + (b.j % 2 ? 4 : -4)));
  }
  inCanal(x, z) {
    if (x < roadLine(5) + ROAD / 2 || x > roadLine(6) - ROAD / 2) return false;
    const b = this.blockAtIJ(5, Math.floor((z + HALF) / CELL));
    if (!b || !b.canal || z < b.z0 + SIDEWALK || z > b.z1 - SIDEWALK) return false;
    return Math.abs(x - this.canalX(b, z)) < CANAL_HW;
  }
  blockAtIJ(i, j) { return i >= 0 && j >= 0 && i < N && j < N ? this.blocks[i * N + j] : null; }

  // perimeter block: a ring of houses along the streets around a courtyard (Riga's typical city block)
  perimeter(b, lot, style, brothers = false, cat = false, only = null) {
    const r = this.r;
    const D = style === 'art' ? 13 : style === 'low' ? 10 : 11;
    const split = (len) => {
      const [mn, mx] = style === 'art' ? [11, 18] : style === 'low' ? [9, 14] : [6, 10];
      const out = []; let t = 0;
      while (len - t > mx + mn) { const w = mn + r() * (mx - mn); out.push([t, t + w]); t += w; }
      const rest = len - t; if (rest > mx) out.push([t, t + rest / 2], [t + rest / 2, len]); else out.push([t, len]);
      return out;
    };
    const has = (f) => !only || only.includes(f);
    const rows = [];
    if (has('-z')) rows.push({ face: '-z', a0: lot.x0, a1: lot.x1, f: lot.z0 });
    if (has('+z')) rows.push({ face: '+z', a0: lot.x0, a1: lot.x1, f: lot.z1 });
    const zA = has('-z') ? lot.z0 + D : lot.z0, zB = has('+z') ? lot.z1 - D : lot.z1;
    if (has('-x')) rows.push({ face: '-x', a0: zA, a1: zB, f: lot.x0 });
    if (has('+x')) rows.push({ face: '+x', a0: zA, a1: zB, f: lot.x1 });
    let n = 0;
    for (const row of rows) {
      const pieces = split(row.a1 - row.a0);
      pieces.forEach(([p0, p1], k) => {
        const a = row.a0 + p0, c = row.a0 + p1;
        let bx0, bx1, bz0, bz1;
        if (row.face === '-z') { bx0 = a; bx1 = c; bz0 = row.f; bz1 = row.f + D; }
        else if (row.face === '+z') { bx0 = a; bx1 = c; bz0 = row.f - D; bz1 = row.f; }
        else if (row.face === '-x') { bz0 = a; bz1 = c; bx0 = row.f; bx1 = row.f + D; }
        else { bz0 = a; bz1 = c; bx0 = row.f - D; bx1 = row.f; }
        const corner = (row.face === '-z' || row.face === '+z') && (k === 0 || k === pieces.length - 1);
        const bd = { x0: bx0, x1: bx1, z0: bz0, z1: bz1, face: row.face, corner, cornerAt: corner ? (k === 0 ? 0 : 1) : -1 };
        if (style === 'art') { bd.h = 17 + r() * 7.5; bd.color = ART_COLORS[Math.floor(r() * ART_COLORS.length)]; this.artHouse(bd); }
        else if (style === 'low') { bd.h = 6.5 + r() * 4; bd.color = ['#d8c49a', '#b9c7a5', '#c99f7f', '#a7b5c0', '#e0d6c0'][Math.floor(r() * 5)]; this.oldHouse(bd, 0.45); }
        else {
          bd.h = 10 + r() * 7; bd.color = OLD_COLORS[Math.floor(r() * OLD_COLORS.length)];
          if (brothers && row.face === '-z' && k < 3) { bd.color = ['#f3ede3', '#e8cf8e', '#bccfa6'][k]; bd.h = [12.5, 14.5, 11][k]; bd.stepped = k === 0; } // the Three Brothers
          else bd.stepped = r() < 0.18;
          if (cat && row.face === '+z' && k === 0) { bd.color = '#e8c25a'; bd.h = 14; bd.cat = true; }
          this.oldHouse(bd, 0.6 + r() * 0.25);
        }
        if ((n++ % 3 === 1 || r() < 0.2) && !bd.cat) this.signs.push(bd);
      });
    }
    this.hangouts.push(new THREE.Vector3(b.x0 + 2.2, CURB, b.z0 + 2.2), new THREE.Vector3(b.x1 - 2.2, CURB, b.z1 - 2.2));
  }
  wall(list, x0, x1, z0, z1, y0, h, color, v0 = 0, collide = true, th = 28) {
    const w = x1 - x0, d = z1 - z0;
    const g = new THREE.BoxGeometry(w, h, d); facadeUV(g, w, h, d, v0, th); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
    colorize(g, color); list.push(g);
    if (collide) this.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, h: y0 + h });
  }
  artHouse(bd) {
    const r = this.r, K = this.K;
    const { x0, x1, z0, z1, h, color } = bd;
    this.wall(this.F.art, x0, x1, z0, z1, CURB, h, color);
    const top = CURB + h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.box('plain', shade(color, 0.88), x1 - x0 + 0.5, 0.5, z1 - z0 + 0.5, cx, top - 0.05, cz);
    K.hip('plain', ART_ROOFS[Math.floor(r() * ART_ROOFS.length)], x1 - x0 + 0.1, z1 - z0 + 0.1, 2.4 + r() * 1.8, 0.62, cx, top + 0.2, cz);
    const dx = bd.face === '-x' ? -1 : bd.face === '+x' ? 1 : 0, dz = bd.face === '-z' ? -1 : bd.face === '+z' ? 1 : 0;
    // bay window (erker) on the street facade
    const yb = CURB + 4.9, hb = h - 7;
    if (r() < 0.55 && hb > 4) {
      const w = 3.6, fx = dx ? (dx < 0 ? x0 : x1) : cx, fz = dz ? (dz < 0 ? z0 : z1) : cz;
      const ex0 = dx ? Math.min(fx, fx + dx * 0.9) : fx - w / 2, ex1 = dx ? Math.max(fx, fx + dx * 0.9) : fx + w / 2;
      const ez0 = dz ? Math.min(fz, fz + dz * 0.9) : fz - w / 2, ez1 = dz ? Math.max(fz, fz + dz * 0.9) : fz + w / 2;
      this.wall(this.F.art, ex0, ex1, ez0, ez1, yb, hb, color, (yb - CURB) / 28, false);
      K.box('plain', shade(color, 0.8), ex1 - ex0 + 0.3, 0.35, ez1 - ez0 + 0.3, (ex0 + ex1) / 2, yb + hb + 0.17, (ez0 + ez1) / 2);
    }
    // corner turret with a copper dome or a slate spire
    if (bd.corner && r() < 0.55) {
      const px = bd.cornerAt === 0 ? x0 : x1, pz = dz < 0 ? z0 : z1;
      const tH = h - 3, cap = r() < 0.5 ? COPPER : '#3f4549';
      K.cyl('plain', color, 2.4, 2.4, tH, 12, px, CURB + 3 + tH / 2, pz);
      if (r() < 0.5) { K.sphere('plain', cap, 2.6, px, CURB + 3 + tH + 0.4, pz, 1.1); K.cone('plain', cap, 0.25, 3, 6, px, CURB + 3 + tH + 4, pz); }
      else K.cone('plain', cap, 2.7, 7, 12, px, CURB + 3 + tH + 3.5, pz);
    }
    if (r() < 0.06) this.flag(dx ? (dx < 0 ? x0 : x1) : cx + 3, CURB + 9, dz ? (dz < 0 ? z0 : z1) : cz + 3, dx, dz);
  }
  oldHouse(bd, steep) {
    const K = this.K, list = this.F.old;
    const { x0, x1, z0, z1, h, color, face } = bd;
    this.wall(list, x0, x1, z0, z1, CURB, h, color);
    const top = CURB + h, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const along = face === '-z' || face === '+z'; // the gable faces the street
    const w = along ? x1 - x0 : z1 - z0, d = along ? z1 - z0 : x1 - x0, rh = w * steep;
    const p = gablePrism(w, d, rh);
    const roof = OLD_ROOFS[Math.floor(this.r() * OLD_ROOFS.length)];
    const capUV = [];
    for (let k = 0; k < p.caps.length; k += 3) capUV.push((p.caps[k] + w / 2) / 14, (h + p.caps[k + 1]) / 28);
    const caps = geo(p.caps, capUV); colorize(caps, color); place(caps, cx, top, cz, along ? 0 : Math.PI / 2); list.push(caps);
    K.add('plain', place(geo(p.slopes), cx, top, cz, along ? 0 : Math.PI / 2), roof);
    if (bd.stepped) { // stepped Hanseatic gable on the street side
      const sg = face === '-z' || face === '-x' ? -1 : 1;
      for (let k = 0; k < 4; k++) {
        const ww = w * (1 - k * 0.24), hh = rh * 0.27, y = top + k * hh + hh / 2;
        if (along) K.box('plain', color, ww, hh, 0.5, cx, y, (sg < 0 ? z0 : z1) + sg * 0.25);
        else K.box('plain', color, 0.5, hh, ww, (sg < 0 ? x0 : x1) + sg * 0.25, y, cz);
      }
    }
    if (bd.cat) { // the Cat House: two pointed turrets topped with black cats
      for (const t of [-1, 1]) {
        const px = cx + t * (x1 - x0) * 0.42, pz = z1;
        K.cyl('plain', color, 1.3, 1.3, 4, 10, px, top + 1, pz);
        K.cone('plain', '#3a3a3a', 1.6, 4.5, 10, px, top + 5.2, pz);
        K.box('plain', '#121212', 0.35, 0.45, 0.8, px, top + 7.6, pz, t * 0.6);
        K.box('plain', '#121212', 0.3, 0.3, 0.3, px, top + 7.95, pz + 0.3, t * 0.6);
      }
    }
  }
  flag(x, y, z, dx, dz) { // Latvian flag (carmine–white–carmine) on a pole sticking out of a facade
    const K = this.K;
    K.box('plain', '#2a2a2a', dx ? 2.8 : 0.06, 0.06, dz ? 2.8 : 0.06, x + dx * 0.7, y, z + dz * 0.7);
    [['#9e3039', 0.4, 0.2], ['#ffffff', 0.2, 0.5], ['#9e3039', 0.4, 0.8]].forEach(([col, hh, off]) => {
      K.box('plain', col, dx ? 1.7 : 0.03, hh, dz ? 1.7 : 0.03, x + dx * 1.3, y - off, z + dz * 1.3);
    });
  }

  // ---------------------------------------------------------------- landmarks
  collider(x0, x1, z0, z1, h) { this.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, h }); }
  stPeter(cx, cz) { // St. Peter's Church: brick nave and the tall green-black baroque spire
    const K = this.K, y0 = CURB;
    K.box('plain', BRICK, 32, 17, 18, cx - 7, y0 + 8.5, cz); this.collider(cx - 23, cx + 9, cz - 9, cz + 9, y0 + 17);
    K.gable('plain', '#6b3527', 18, 32, 11, cx - 7, y0 + 17, cz, Math.PI / 2);
    for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) K.box('plain', '#2b3036', 1.4, 7, 0.1, cx - 19 + k * 6, y0 + 8, cz + sd * 9.05);
    const tx = cx + 14;
    K.box('plain', BRICK, 11, 40, 11, tx, y0 + 20, cz); this.collider(tx - 5.5, tx + 5.5, cz - 5.5, cz + 5.5, y0 + 40);
    K.box('plain', '#2b3036', 3, 7, 0.1, tx, y0 + 30, cz - 5.55); K.box('plain', '#2b3036', 0.1, 7, 3, tx + 5.55, y0 + 30, cz);
    let y = y0 + 40;
    K.cyl('plain', SPIRE, 4.2, 5.4, 7, 8, tx, y + 3.5, cz); y += 7;
    K.sphere('plain', SPIRE, 4.5, tx, y + 2.5, cz, 0.75); y += 5;
    K.cyl('plain', SPIRE, 2.3, 2.7, 6, 8, tx, y + 3, cz); y += 6;
    K.sphere('plain', SPIRE, 2.9, tx, y + 1.8, cz, 0.75); y += 3.6;
    K.cyl('plain', SPIRE, 1.5, 1.7, 4, 8, tx, y + 2, cz); y += 4;
    K.cone('plain', SPIRE, 1.6, 26, 8, tx, y + 13, cz); y += 26;
    K.sphere('gold', GOLD, 0.45, tx, y + 0.3, cz); K.box('gold', GOLD, 0.2, 1.2, 1.1, tx, y + 1.3, cz); // the golden rooster
    this.hangouts.push(new THREE.Vector3(cx - 10, CURB, cz + 14));
  }
  dom(cx, cz) { // Riga Cathedral (Doms)
    const K = this.K, y0 = CURB;
    K.box('plain', BRICK, 34, 19, 20, cx - 6, y0 + 9.5, cz); this.collider(cx - 23, cx + 11, cz - 10, cz + 10, y0 + 19);
    K.gable('plain', '#7a3a2b', 20, 34, 12, cx - 6, y0 + 19, cz, Math.PI / 2);
    for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) K.box('plain', '#2b3036', 1.6, 8, 0.1, cx - 19 + k * 6.5, y0 + 9, cz + sd * 10.05);
    const tx = cx + 16;
    K.box('plain', BRICK, 12, 34, 12, tx, y0 + 17, cz); this.collider(tx - 6, tx + 6, cz - 6, cz + 6, y0 + 34);
    let y = y0 + 34;
    K.cyl('plain', COPPER, 5.2, 6.2, 4, 8, tx, y + 2, cz); y += 4;
    K.sphere('plain', COPPER, 5.7, tx, y + 2.4, cz, 0.75); y += 5.5;
    K.cyl('plain', COPPER, 2.6, 3, 5, 8, tx, y + 2.5, cz); y += 5;
    K.sphere('plain', COPPER, 3, tx, y + 1.5, cz, 0.7); y += 3;
    K.cone('plain', COPPER, 1.2, 14, 8, tx, y + 7, cz); y += 14;
    K.box('gold', GOLD, 0.2, 1.2, 1.1, tx, y + 0.6, cz);
    this.benches.push({ pos: new THREE.Vector3(cx - 12, CURB, cz - 15), yaw: 0 }, { pos: new THREE.Vector3(cx + 2, CURB, cz - 15), yaw: 0 });
    this.hangouts.push(new THREE.Vector3(cx - 5, CURB, cz - 16));
  }
  townHall(b, lot) { // Town Hall Square: the House of the Blackheads (stepped gable) faces the Town Hall
    const K = this.K, y0 = CURB;
    this.square(lot.x0 + 11, lot.x1, lot.z0, lot.z1);
    const bx = b.cx - 6, fz = lot.z1 - 14; // Blackheads House on the north side, facade facing the square (−z)
    K.box('plain', '#a6402f', 17, 14, 14, bx, y0 + 7, fz + 7); this.collider(bx - 8.5, bx + 8.5, fz, fz + 14, y0 + 14);
    [17, 14, 11, 8, 5].forEach((w, k) => {
      const y = y0 + 14 + k * 2.6;
      K.box('plain', '#a6402f', w, 2.6, 1.2, bx, y + 1.3, fz + 0.6);
      K.box('plain', '#f2ede2', w + 0.2, 0.25, 1.4, bx, y + 0.12, fz + 0.6);
      for (const sd of [-1, 1]) K.cone('gold', GOLD, 0.25, 1.4, 6, bx + sd * (w / 2 - 0.3), y + 3.2, fz + 0.6);
    });
    K.gable('plain', '#7a3a2b', 17, 13, 12, bx, y0 + 14, fz + 7.5);
    K.cone('plain', '#2e3b38', 0.7, 5, 8, bx, y0 + 27 + 2.5, fz + 0.6);
    const clock = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 20); clock.rotateX(Math.PI / 2); clock.translate(bx, y0 + 18.4, fz - 0.1); K.add('plain', clock, '#f2ede2');
    K.box('plain', '#1d1d1d', 0.1, 1.0, 0.1, bx, y0 + 18.7, fz - 0.22);
    for (let k = 0; k < 4; k++) for (let f = 0; f < 3; f++) K.box('plain', '#24303a', 1.6, 2.3, 0.1, bx - 5.6 + k * 3.7, y0 + 3 + f * 3.6, fz - 0.03);
    K.box('plain', '#f2ede2', 9, 13, 14, bx + 13, y0 + 6.5, fz + 7); this.collider(bx + 8.5, bx + 17.5, fz, fz + 14, y0 + 13); // Schwab House
    K.gable('plain', '#7a3a2b', 9, 14, 6, bx + 13, y0 + 13, fz + 7);
    for (let f = 0; f < 3; f++) for (let k = 0; k < 2; k++) K.box('plain', '#24303a', 1.5, 2.2, 0.1, bx + 11 + k * 4, y0 + 3 + f * 3.6, fz - 0.03);
    // Town Hall on the river side of the square
    const tx = lot.x1 - 7, tz = (lot.z0 + 2 + lot.z1 - 16) / 2;
    this.wall(this.F.art, tx - 7, tx + 7, lot.z0 + 2, lot.z1 - 16, y0, 15, WHITE);
    K.box('plain', '#cfc8ba', 15, 0.6, lot.z1 - lot.z0 - 17, tx, y0 + 15.2, tz);
    K.box('plain', WHITE, 5, 7, 5, tx, y0 + 18.5, tz);
    K.cone('plain', '#2e3b38', 2.2, 10, 8, tx, y0 + 27, tz);
    // Roland statue in the middle of the square
    const rx = b.cx - 2, rz = b.cz - 8;
    K.cyl('plain', '#b9b1a5', 0.9, 1.1, 3.4, 12, rx, y0 + 1.7, rz); K.cyl('plain', '#e9e4da', 0.45, 0.5, 2.2, 10, rx, y0 + 4.5, rz);
    K.sphere('plain', '#e9e4da', 0.32, rx, y0 + 5.8, rz); K.box('plain', '#d0d0d0', 0.08, 1.8, 0.08, rx + 0.5, y0 + 5.2, rz);
    this.collider(rx - 1, rx + 1, rz - 1, rz + 1, y0 + 6);
    this.benches.push({ pos: new THREE.Vector3(b.cx - 8, CURB, b.cz - 16), yaw: 0 }, { pos: new THREE.Vector3(b.cx + 4, CURB, b.cz - 16), yaw: 0 });
    this.hangouts.push(new THREE.Vector3(rx + 6, CURB, rz - 5));
    this.perimeter(b, lot, 'old', false, false, ['-x']); // houses close the east side of the square
  }
  powderTower(x, z) {
    const K = this.K;
    K.cyl('plain', '#a35a3c', 7, 7.4, 21, 20, x, CURB + 10.5, z); this.collider(x - 7, x + 7, z - 7, z + 7, CURB + 21);
    K.cone('plain', '#3b3530', 7.8, 9, 20, x, CURB + 25.5, z); K.cone('plain', '#3b3530', 0.4, 3, 6, x, CURB + 31, z);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; K.box('plain', '#2b3036', 0.9, 1.6, 0.1, x + Math.sin(a) * 7.25, CURB + 14, z + Math.cos(a) * 7.25, a); }
  }
  castle(lot) { // Riga Castle (residence of the President of Latvia)
    const K = this.K, y0 = CURB, D = 10;
    const wings = [[lot.x0, lot.x1, lot.z0, lot.z0 + D, 0], [lot.x0, lot.x1, lot.z1 - D, lot.z1, 0], [lot.x0, lot.x0 + D, lot.z0 + D, lot.z1 - D, 1], [lot.x1 - D, lot.x1, lot.z0 + D, lot.z1 - D, 1]];
    for (const [a0, a1, b0, b1, rot] of wings) {
      this.wall(this.F.old, a0, a1, b0, b1, y0, 13, '#efe8d8');
      K.gable('plain', '#93412f', rot ? a1 - a0 : b1 - b0, rot ? b1 - b0 : a1 - a0, 6, (a0 + a1) / 2, y0 + 13, (b0 + b1) / 2, rot ? 0 : Math.PI / 2);
    }
    const rx = lot.x0 + 3, rz = lot.z0 + 3; // round tower with a copper cone
    K.cyl('plain', '#efe8d8', 6.5, 6.5, 24, 20, rx, y0 + 12, rz); K.cone('plain', COPPER, 7.2, 12, 20, rx, y0 + 30, rz); this.collider(rx - 6.5, rx + 6.5, rz - 6.5, rz + 6.5, y0 + 24);
    const sx = lot.x1 - 4, sz = lot.z1 - 4; // square tower flying the national flag
    K.box('plain', '#efe8d8', 9, 30, 9, sx, y0 + 15, sz); K.cone('plain', '#33403c', 6.6, 12, 4, sx, y0 + 36, sz); this.collider(sx - 4.5, sx + 4.5, sz - 4.5, sz + 4.5, y0 + 30);
    K.box('plain', '#2a2a2a', 0.1, 6, 0.1, sx, y0 + 45, sz);
    [['#9e3039', 47.6, 0.6], ['#ffffff', 47.15, 0.3], ['#9e3039', 46.7, 0.6]].forEach(([col, y, hh]) => K.box('plain', col, 0.04, hh, 3, sx, y0 + y, sz + 1.5));
    this.square(lot.x0 + D, lot.x1 - D, lot.z0 + D, lot.z1 - D);
  }
  market(lot) { // Central Market: the famous Zeppelin hangars
    const K = this.K, y0 = CURB, Lh = lot.x1 - lot.x0 - 1, cx = (lot.x0 + lot.x1) / 2, R = 8;
    const n = Math.floor((lot.z1 - lot.z0) / 17.2);
    for (let k = 0; k < n; k++) {
      const z = lot.z0 + 8.6 + k * 17.2;
      K.box('plain', '#8f5a44', Lh, 2.6, 16, cx, y0 + 1.3, z);
      const shell = new THREE.CylinderGeometry(R, R, Lh, 24, 1, true, 0, Math.PI); shell.rotateZ(Math.PI / 2); shell.translate(cx, y0 + 2.6, z);
      K.add('plain', shell, '#a7adb1');
      for (const sd of [-1, 1]) {
        const end = new THREE.CircleGeometry(R, 24, 0, Math.PI); end.rotateY((sd * Math.PI) / 2); end.translate(cx + (sd * Lh) / 2, y0 + 2.6, z);
        K.add('glass', end, '#2c3c47');
        for (let a = 1; a < 6; a++) { const th = (a / 6) * Math.PI, hh = R * Math.sin(th); K.box('plain', '#6f767b', 0.15, hh, 0.15, cx + sd * (Lh / 2 + 0.05), y0 + 2.6 + hh / 2, z - R * Math.cos(th)); }
      }
      for (let a = 0; a < 7; a++) { const t = new THREE.TorusGeometry(R + 0.05, 0.14, 4, 20, Math.PI); t.rotateY(Math.PI / 2); t.translate(cx - Lh / 2 + 2 + (a * (Lh - 4)) / 6, y0 + 2.6, z); K.add('plain', t, '#7c8287'); }
      this.collider(lot.x0 + 0.5, lot.x1 - 0.5, z - 8, z + 8, y0 + 10.6);
    }
    this.hangouts.push(new THREE.Vector3(lot.x0 - 1.2, CURB, (lot.z0 + lot.z1) / 2));
  }
  academy(cx, cz) { // Latvian Academy of Sciences ("Stalin's birthday cake")
    const K = this.K;
    let y = CURB;
    for (const [w, h] of [[30, 20], [23, 18], [17, 16], [12.5, 14], [9, 9], [6, 6]]) {
      this.wall(this.F.old, cx - w / 2, cx + w / 2, cz - w / 2, cz + w / 2, y, h, '#d8c9a8', y > CURB ? 0.16 : 0, w > 25);
      K.box('plain', '#c3b391', w + 0.8, 0.8, w + 0.8, cx, y + h, cz);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cone('plain', '#c3b391', 0.5, 3, 6, cx + (sx * w) / 2, y + h + 1.9, cz + (sz * w) / 2);
      y += h;
    }
    K.cone('plain', '#d8c9a8', 2.2, 26, 8, cx, y + 13, cz);
  }
  orthodoxCathedral(cx, cz) { // Nativity of Christ Cathedral in Esplanāde, with its golden domes
    const K = this.K, y0 = CURB, Y = '#c9a066';
    K.box('plain', Y, 16, 15, 16, cx, y0 + 7.5, cz); this.collider(cx - 8, cx + 8, cz - 8, cz + 8, y0 + 15);
    K.cyl('plain', Y, 4.6, 4.6, 7, 16, cx, y0 + 18.5, cz); K.sphere('gold', GOLD, 4.9, cx, y0 + 22.5, cz, 1.25);
    K.box('gold', GOLD, 0.25, 3, 0.25, cx, y0 + 30, cz); K.box('gold', GOLD, 1.4, 0.25, 0.25, cx, y0 + 30.5, cz);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + sx * 5.5, z = cz + sz * 5.5;
      K.cyl('plain', Y, 1.7, 1.7, 4, 12, x, y0 + 17, z); K.sphere('gold', GOLD, 1.9, x, y0 + 19.6, z, 1.3); K.box('gold', GOLD, 0.15, 1.6, 0.15, x, y0 + 22.6, z);
    }
    const bx = cx + 13; // bell tower towards Brīvības iela
    K.box('plain', Y, 7, 22, 7, bx, y0 + 11, cz); this.collider(bx - 3.5, bx + 3.5, cz - 3.5, cz + 3.5, y0 + 22);
    K.cyl('plain', Y, 2.4, 2.6, 4, 12, bx, y0 + 24, cz); K.sphere('gold', GOLD, 2.6, bx, y0 + 27, cz, 1.3); K.box('gold', GOLD, 0.18, 2, 0.18, bx, y0 + 31, cz);
    for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) K.box('plain', '#2b3036', 1.3, 4, 0.1, cx - 4 + k * 4, y0 + 8, cz + sd * 8.05);
  }
  glassTower(cx, cz, w, h, color) {
    this.wall(this.F.tower, cx - w / 2, cx + w / 2, cz - w / 2, cz + w / 2, CURB, h, color, 0, true, 14);
    this.K.box('plain', '#7d868c', w + 0.6, 1.2, w + 0.6, cx, CURB + h + 0.6, cz);
  }

  // Freedom Monument (Brīvības piemineklis) on its plaza between the canal and the Old Town
  buildPlaza() {
    const K = this.K, x0 = roadLine(5) + ROAD / 2, x1 = roadLine(6) - ROAD / 2, z = roadLine(4);
    const g = new THREE.BoxGeometry(x1 - x0, CURB, ROAD); g.translate((x0 + x1) / 2, CURB / 2, z);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 4, (uv.getY(i) * ROAD) / 4);
    this.G.pave.push(g);
    this.plaza = { x0, x1, z0: z - ROAD / 2, z1: z + ROAD / 2 };
    const mx = x0 + 42, y0 = CURB, GR = '#9a8d85', TR = '#ddd2bd', CU = '#4f8f7a';
    K.box('plain', GR, 13, 0.8, 11, mx, y0 + 0.4, z); K.box('plain', GR, 9.5, 1, 8, mx, y0 + 1.3, z);
    K.box('plain', GR, 7, 7.5, 5.6, mx, y0 + 5.5, z);
    for (const sd of [-1, 1]) K.box('plain', '#8a7d76', 1.8, 4.5, 1.6, mx + sd * 4.3, y0 + 4, z + 2.3);
    const ob = new THREE.CylinderGeometry(1.25, 2.1, 21, 4, 1); ob.rotateY(Math.PI / 4); ob.scale(1, 1, 0.78); ob.translate(mx, y0 + 9.25 + 10.5, z); K.add('plain', ob, TR);
    const top = y0 + 30; // "Milda" holding up three golden stars
    K.cyl('plain', CU, 0.75, 1.05, 4.6, 10, mx, top + 2.3, z); K.sphere('plain', CU, 0.48, mx, top + 5.0, z);
    for (const sd of [-1, 1]) { const arm = new THREE.BoxGeometry(0.28, 2.4, 0.28); arm.rotateX(sd * 0.32); arm.translate(mx, top + 5.6, z + sd * 0.55); K.add('plain', arm, CU); }
    const star = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.28 : 0.62; if (k) star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    for (let k = 0; k < 3; k++) {
      const sg = new THREE.ExtrudeGeometry(star, { depth: 0.12, bevelEnabled: false }); sg.rotateY(Math.PI / 2);
      sg.translate(mx, top + 7.1 + (k === 1 ? 0.5 : 0), z + (k - 1) * 1.15); K.add('gold', sg, GOLD);
    }
    this.collider(mx - 6.5, mx + 6.5, z - 5.5, z + 5.5, y0 + 31);
    for (const sd of [-1, 1]) K.box('plain', '#7a2a35', 9, 0.35, 1, mx, y0 + 0.2, z + sd * 6.2); // flower beds
    this.hangouts.push(new THREE.Vector3(mx + 10, CURB, z - 4), new THREE.Vector3(mx - 12, CURB, z + 4));
    this.monument = new THREE.Vector3(mx, CURB, z);
  }

  // ---------------------------------------------------------------- the Daugava, quays and bridges
  buildRiver() {
    const K = this.K, Z = 2600;
    const wg = new THREE.PlaneGeometry(FAR_X - RIVER_X, Z * 2); wg.rotateX(-Math.PI / 2); wg.translate((RIVER_X + FAR_X) / 2, WATER_Y, 0);
    this.water = new THREE.Mesh(wg, this.mats.water); this.scene.add(this.water);
    this.G.pave.push(this.G_emb);
    K.box('plain', '#8e877d', 1.4, 3.2, Z * 2, RIVER_X + 0.6, -1.6, 0); K.box('plain', '#8e877d', 1.4, 3.2, Z * 2, FAR_X - 0.6, -1.6, 0);
    // railings along both quays, open where the bridges land
    const gaps = BRIDGES.map((b) => [b.z - b.w, b.z + b.w]).sort((a, b) => a[0] - b[0]);
    const zMin = -HALF - 40, zMax = HALF + 40, spans = [];
    let z = zMin;
    for (const [g0, g1] of gaps) { spans.push([z, g0]); z = g1; }
    spans.push([z, zMax]);
    for (const [a, c] of spans) for (const x of [RIVER_X - 0.25, FAR_X + 0.25]) {
      this.colliders.push({ minX: x - 0.2, maxX: x + 0.2, minZ: a, maxZ: c, h: 1.1, small: true });
      K.box('plain', '#2a2f2c', 0.08, 0.08, c - a, x, 1.05, (a + c) / 2);
      for (let p = a; p < c; p += 2.5) K.box('plain', '#2a2f2c', 0.07, 1.05, 0.07, x, 0.52, p);
    }
    const nearGap = (zz, m) => gaps.some(([g0, g1]) => zz > g0 - m && zz < g1 + m);
    for (let zz = zMin + 10; zz < zMax; zz += 26) if (!nearGap(zz, 6)) this.benches.push({ pos: new THREE.Vector3(RIVER_X - 3, 0, zz), yaw: Math.PI / 2 });
    let li = 0;
    for (let zz = zMin + 4; zz < zMax; zz += 12) {
      if (nearGap(zz, 4)) continue;
      this.trees.push([EMB_X + 6, 0, zz, 0.9 + this.r() * 0.4, 0], [EMB_X + 17, 0, zz + 6, 0.9 + this.r() * 0.4, 0]);
      if (li++ % 2 === 0) this.lamps.push([RIVER_X - 1.2, zz + 3, -Math.PI / 2, 0]);
    }
    for (let zz = zMin; zz < zMax; zz += 52) this.hangouts.push(new THREE.Vector3(EMB_X + 11, 0, zz + 7));
    for (const b of BRIDGES) this.bridge(b);
  }
  bridge(b) {
    const K = this.K, s = this.scene, n = 70;
    const road = [], ruv = [], walk = [], wuv = [], under = [];
    const xs = Array.from({ length: n + 1 }, (_, k) => B0 + ((B1 - B0) * k) / n);
    const quad = (arr, a, bb, c, d) => arr.push(...a, ...bb, ...c, ...a, ...c, ...d);
    for (let k = 0; k < n; k++) {
      const xa = xs[k], xb = xs[k + 1], ya = deckY(b, xa) + 0.03, yb = deckY(b, xb) + 0.03, va = (xa - B0) / 14, vb = (xb - B0) / 14;
      quad(road, [xa, ya, b.z + 7], [xb, yb, b.z + 7], [xb, yb, b.z - 7], [xa, ya, b.z - 7]);
      ruv.push(1, va, 1, vb, 0, vb, 1, va, 0, vb, 0, va);
      for (const sd of [-1, 1]) {
        const z0 = b.z + sd * 7, z1 = b.z + sd * b.w, zf = z1;
        if (sd > 0) quad(walk, [xa, ya, z1], [xb, yb, z1], [xb, yb, z0], [xa, ya, z0]); else quad(walk, [xa, ya, z0], [xb, yb, z0], [xb, yb, z1], [xa, ya, z1]);
        wuv.push(0, va, 1, vb, 1, vb, 0, va, 1, vb, 0, va);
        // fascia (outside) and the railing band (both sides)
        if (sd > 0) quad(under, [xa, ya - 1.5, zf], [xb, yb - 1.5, zf], [xb, yb, zf], [xa, ya, zf]); else quad(under, [xa, ya, zf], [xb, yb, zf], [xb, yb - 1.5, zf], [xa, ya - 1.5, zf]);
        const zr = zf - sd * 0.12;
        quad(under, [xa, ya + 0.95, zr], [xb, yb + 0.95, zr], [xb, yb + 1.1, zr], [xa, ya + 1.1, zr]);
        quad(under, [xa, ya + 1.1, zr], [xb, yb + 1.1, zr], [xb, yb + 0.95, zr], [xa, ya + 0.95, zr]);
      }
      quad(under, [xa, ya - 1.5, b.z - b.w], [xb, yb - 1.5, b.z - b.w], [xb, yb - 1.5, b.z + b.w], [xa, ya - 1.5, b.z + b.w]);
    }
    const rm = new THREE.Mesh(geo(road, ruv), this.mats.road); rm.receiveShadow = true; s.add(rm);
    const wm = new THREE.Mesh(geo(walk, wuv), this.mats.walk); wm.receiveShadow = true; s.add(wm);
    K.add('plain', geo(under), '#9a948b');
    for (let x = B0 + 1; x < B1; x += 3) for (const sd of [-1, 1]) K.box('plain', '#2a2f2c', 0.08, 1.0, 0.08, x, deckY(b, x) + 0.55, b.z + sd * (b.w - 0.12));
    for (let x = B0 + 12; x < B1 - 6; x += 30) for (const sd of [-1, 1]) this.lamps.push([x, b.z + sd * (b.w - 0.6), sd > 0 ? Math.PI : 0, deckY(b, x)]);
    for (let x = RIVER_X + 22; x < FAR_X - 15; x += 38) { const y = deckY(b, x) - 1.5; K.box('plain', '#8e877d', 3, y - WATER_Y + 1, b.w * 2 - 3, x, (y + WATER_Y - 1) / 2, b.z); }
    for (const sd of [-1, 1]) {
      const zc = b.z + sd * (b.w + 0.15);
      this.colliders.push({ minX: RIVER_X - 1, maxX: FAR_X + 1, minZ: zc - 0.15, maxZ: zc + 0.15, h: b.peak + 1.2, small: true });
    }
    if (b.name === 'Vanšu tilts') { // a single pylon on the left bank, cables fanning out to the deck
      const px = FAR_X + 12, top = 72;
      K.box('plain', '#d9d6cf', 3.2, top, 4, px, top / 2, b.z); this.collider(px - 1.6, px + 1.6, b.z - 2, b.z + 2, top);
      const pts = [];
      for (let k = 1; k <= 14; k++) { const x = px - 12 - k * 13; pts.push(px, top - 2 - k * 0.6, b.z, x, deckY(b, x) + 0.6, b.z); }
      for (let k = 1; k <= 6; k++) pts.push(px, top - 4 - k * 1.2, b.z, px + 45, 2 + k * 0.8, b.z);
      K.box('plain', '#bdb6ab', 4, 8, 6, px + 46, 4, b.z); this.collider(px + 44, px + 48, b.z - 3, b.z + 3, 8);
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      s.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: '#cfd3d6' })));
    }
  }

  buildFarBank() {
    const K = this.K, r = this.r, s = this.scene, X = FAR_X;
    this.G.pave.push(flatPlane(X, X + 22, -HALF - 40, HALF + 40, 0.0, 4));
    const asph = [flatPlane(X + 22, X + 36, -HALF - 40, HALF + 40, 0.02, 14)];
    for (const b of BRIDGES) asph.push(flatPlane(X, X + 22, b.z - 7, b.z + 7, 0.012, 14));
    const am = new THREE.Mesh(mergeGeometries(asph), this.mats.asph); am.receiveShadow = true; s.add(am);
    for (let z = -HALF - 30; z < HALF + 40; z += 30) {
      if (BRIDGES.some((b) => Math.abs(z - b.z) < b.w + 3)) continue;
      this.benches.push({ pos: new THREE.Vector3(X + 3, 0, z), yaw: -Math.PI / 2 }); // the classic view of the Old Town skyline
      this.lamps.push([X + 1.2, z + 10, Math.PI / 2, 0]);
      this.trees.push([X + 40 + r() * 6, 0, z + r() * 10, 1 + r() * 0.4, r() < 0.3 ? 1 : 0]);
    }
    for (let z = -HALF; z < HALF; z += 60) this.hangouts.push(new THREE.Vector3(X + 12, 0, z + 15));
    // National Library of Latvia ("Castle of Light")
    const lx = X + 82, lz = -55;
    for (let k = 0; k < 9; k++) {
      const len = 78 - k * 8, wid = 34 - k * 3.4, h = 5.2;
      K.box('glass', k % 2 ? '#3d5a66' : '#46646f', wid, h, len, lx, CURB + k * h + h / 2, lz);
      K.box('plain', '#e9ecef', wid + 0.3, 0.35, len + 0.3, lx, CURB + (k + 1) * h, lz);
    }
    K.box('glass', '#4f7380', 2, 6, 6, lx, CURB + 9 * 5.2 + 3, lz);
    this.collider(lx - 17, lx + 17, lz - 39, lz + 39, 50);
    // Saules Akmens tower
    const tx = X + 70, tz = 104;
    this.wall(this.F.tower, tx - 13, tx + 13, tz - 11, tz + 11, 0, 66, '#a9c0d0', 0, true, 14);
    K.gable('glass', '#6d8ea3', 26, 22, 14, tx, 66, tz);
    // old wooden houses of Ķīpsala and Āgenskalns
    for (let k = 0; k < 16; k++) {
      const x = X + 60 + r() * 150, z = (r() < 0.5 ? -1 : 1) * (150 + r() * 120);
      const w = 8 + r() * 5, d = 9 + r() * 4, h = 5 + r() * 4;
      this.oldHouse({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, color: ['#7f9a74', '#b39462', '#a35a43', '#6f8aa1', '#d6c08f'][k % 5], face: '-x' }, 0.5);
    }
    for (let k = 0; k < 60; k++) {
      const x = X + 45 + r() * 190, z = (r() - 0.5) * (2 * HALF + 60);
      if (Math.abs(x - lx) < 24 && Math.abs(z - lz) < 46) continue;
      if (Math.abs(x - tx) < 18 && Math.abs(z - tz) < 16) continue;
      if (Math.abs(z - BRIDGES[1].z) < 8 && x < X + 62) continue;
      this.trees.push([x, 0, z, 0.9 + r() * 0.6, r() < 0.3 ? 1 : 0]);
    }
  }

  // tram line: rails, overhead wires, poles and stops
  buildTram() {
    const K = this.K;
    const x0 = -HALF - ROAD / 2, x1 = HALF + ROAD / 2, len = x1 - x0, z = TRAM_Z;
    const rails = [];
    for (const t of [-1.25, 1.25]) for (const g of [-0.72, 0.72]) { const p = new THREE.PlaneGeometry(len, 0.12); p.rotateX(-Math.PI / 2); p.translate(0, 0.05, z + t + g); rails.push(p); }
    const rm = new THREE.Mesh(mergeGeometries(rails), new THREE.MeshStandardMaterial({ color: '#7a7f86', metalness: 0.8, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    rm.receiveShadow = true; this.scene.add(rm);
    for (const t of [-1.25, 1.25]) K.box('plain', '#1d1d1d', len, 0.03, 0.03, 0, 5.5, z + t);
    for (let x = x0 + 8; x < x1; x += 35) {
      for (const sd of [-1, 1]) K.cyl('plain', '#26302b', 0.1, 0.13, 6.4, 6, x, 3.2, z + sd * 7.4);
      K.box('plain', '#1d1d1d', 0.04, 0.04, 14.8, x, 6.0, z);
    }
    for (const sx of this.tramLines[0].stops) for (const sd of [-1, 1]) {
      const sz = z + sd * 8.9;
      K.box('glass', '#7fa3b3', 3.6, 2.3, 0.06, sx, CURB + 1.2, sz + sd * 0.7);
      K.box('plain', '#2b3a33', 3.9, 0.12, 1.7, sx, CURB + 2.45, sz);
      K.box('plain', '#2b3a33', 0.08, 2.4, 0.08, sx - 1.8, CURB + 1.2, sz - sd * 0.6); K.box('plain', '#2b3a33', 0.08, 2.4, 0.08, sx + 1.8, CURB + 1.2, sz - sd * 0.6);
      K.box('plain', '#c8102e', 0.5, 0.5, 0.05, sx + 2.4, CURB + 2.6, sz - sd * 0.6);
    }
  }

  // far landmarks: the TV tower on Zaķusala and the suburbs on the horizon
  buildLandmarksFar() {
    const K = this.K, r = this.r;
    const tx = RIVER_X + 120, tz = -760;
    const isl = new THREE.CylinderGeometry(70, 76, 2.6, 24); isl.translate(tx, WATER_Y, tz); this.G.lawn.push(scaleUV(isl, 20));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const top = new THREE.Vector3(tx + Math.cos(a) * 3, 110, tz + Math.sin(a) * 3), bot = new THREE.Vector3(tx + Math.cos(a) * 24, 0, tz + Math.sin(a) * 24);
      const g = new THREE.CylinderGeometry(2, 2.8, top.distanceTo(bot), 8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()));
      g.translate((top.x + bot.x) / 2, (top.y + bot.y) / 2, (top.z + bot.z) / 2); K.add('plain', g, '#b8b8b2');
    }
    K.cyl('plain', '#d9d9d4', 9, 7, 12, 16, tx, 116, tz);
    for (let k = 0; k < 8; k++) K.cyl('plain', k % 2 ? '#ffffff' : '#c8102e', 1.6 - k * 0.12, 1.7 - k * 0.12, 10, 8, tx, 127 + k * 10, tz);
    // horizon: Soviet-era housing estates and lower suburbs
    const boxes = [];
    for (let k = 0; k < 340; k++) {
      const a = r() * Math.PI * 2, d = 520 + r() * 640, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (x > RIVER_X - 40 && x < FAR_X + 60) continue;
      if (x > FAR_X + 60 && x < FAR_END + 40 && Math.abs(z) < HALF + 60) continue;
      const big = r() < 0.35, w = big ? 14 + r() * 50 : 10 + r() * 16, h = big ? 26 + r() * 18 : 7 + r() * 10;
      boxes.push([x, z, w, big ? 13 : w * 0.8, h, r() * Math.PI, big ? ['#d8d4cb', '#cfd3d6', '#e2dccf'][k % 3] : ['#b3a58d', '#9aa59a', '#c4b9a5'][k % 3]]);
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), boxes.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    boxes.forEach(([x, z, w, dd, h, ry, col], i) => { d.position.set(x, h / 2, z); d.rotation.set(0, ry, 0); d.scale.set(w, h, dd); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(col)); });
    this.scene.add(im);
  }

  // ---------------------------------------------------------------- signs, trees, lamps, sky extras
  buildSigns() {
    const rows = TX.SHOP_SIGNS.length, list = [], r = this.r;
    for (const bd of this.signs) {
      const row = Math.floor(r() * rows);
      const w = Math.min(4.6, (bd.face === '-z' || bd.face === '+z' ? bd.x1 - bd.x0 : bd.z1 - bd.z0) - 1);
      if (w < 2.4) continue;
      const g = new THREE.PlaneGeometry(w, w / 8);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / rows);
      const cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2, y = CURB + 3.95;
      if (bd.face === '-z') place(g, cx, y, bd.z0 - 0.07, Math.PI);
      else if (bd.face === '+z') place(g, cx, y, bd.z1 + 0.07, 0);
      else if (bd.face === '-x') place(g, bd.x0 - 0.07, y, cz, -Math.PI / 2);
      else place(g, bd.x1 + 0.07, y, cz, Math.PI / 2);
      list.push(g);
    }
    if (!list.length) return;
    const atlas = TX.signAtlas();
    const m = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: '#ffffff', emissiveIntensity: 0.1, roughness: 0.6 });
    this.emissives.push([m, 1.6, 0.1]);
    this.scene.add(new THREE.Mesh(mergeGeometries(list), m));
  }

  buildTrees() {
    // linden (rounded crown) and birch (white trunk, light narrow crown)
    const d = new THREE.Object3D(), col = new THREE.Color();
    const kinds = [
      { trunk: new THREE.CylinderGeometry(0.18, 0.28, 3.2, 7).translate(0, 1.6, 0), crown: new THREE.IcosahedronGeometry(2.6, 1).scale(1, 1.15, 1).translate(0, 5.4, 0), tc: '#5e4a3a', cc: [0.24, 0.42, 0.3] },
      { trunk: new THREE.CylinderGeometry(0.12, 0.18, 4.2, 7).translate(0, 2.1, 0), crown: new THREE.IcosahedronGeometry(1.8, 1).scale(1, 1.7, 1).translate(0, 6.2, 0), tc: '#e8e4dc', cc: [0.22, 0.5, 0.42] },
    ];
    kinds.forEach((k, ki) => {
      const list = this.trees.filter((t) => t[4] === ki);
      if (!list.length) return;
      const ti = new THREE.InstancedMesh(k.trunk, new THREE.MeshStandardMaterial({ color: k.tc, roughness: 0.95 }), list.length);
      const ci = new THREE.InstancedMesh(k.crown, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), list.length);
      list.forEach(([x, y, z, sc], i) => {
        d.position.set(x, y, z); d.rotation.set(0, i * 1.7, 0); d.scale.setScalar(sc); d.updateMatrix();
        ti.setMatrixAt(i, d.matrix); ci.setMatrixAt(i, d.matrix);
        ci.setColorAt(i, col.setHSL(k.cc[0] + (i % 5) * 0.012, k.cc[1], k.cc[2] + (i % 3) * 0.035));
        this.colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, h: 6, small: true });
      });
      for (const m of [ti, ci]) { m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
    });
  }

  buildLamps() {
    // historic lanterns: dark pole + glowing lantern head; warm pools of light on the ground at night
    const d = new THREE.Object3D();
    const pole = mergeGeometries([new THREE.CylinderGeometry(0.07, 0.11, 4.2, 6, 1, true).translate(0, 2.1, 0).toNonIndexed(), new THREE.ConeGeometry(0.3, 0.3, 4, 1, true).translate(0, 4.95, 0).toNonIndexed()]);
    const head = new THREE.CylinderGeometry(0.2, 0.14, 0.6, 6, 1, true).translate(0, 4.5, 0);
    const poleM = new THREE.MeshStandardMaterial({ color: '#1f2a26', metalness: 0.5, roughness: 0.5 });
    const bulbM = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf8a', emissiveIntensity: 0 });
    this.emissives.push([bulbM, 4.0, 0.05]);
    const n = this.lamps.length;
    const pI = new THREE.InstancedMesh(pole, poleM, n), hI = new THREE.InstancedMesh(head, bulbM, n);
    const pool = new THREE.PlaneGeometry(9, 9); pool.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({ map: TX.poolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const oI = new THREE.InstancedMesh(pool, this.poolMat, n);
    this.lamps.forEach(([x, z, ry, y], i) => {
      d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.setScalar(1); d.updateMatrix();
      pI.setMatrixAt(i, d.matrix); hI.setMatrixAt(i, d.matrix);
      d.position.set(x, y + 0.07, z); d.updateMatrix(); oI.setMatrixAt(i, d.matrix);
      this.lampHeads.push(new THREE.Vector3(x, y + 4.5, z));
    });
    pI.castShadow = true; this.scene.add(pI); this.scene.add(hI); this.scene.add(oI);
    oI.frustumCulled = false; this.poolMesh = oI;
  }

  buildSkyExtras() {
    // drifting clouds, stars and the moon
    const ct = TX.cloudTexture().clone(); ct.needsUpdate = true; ct.repeat.set(5, 5);
    this.cloudMat = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    const cg = new THREE.PlaneGeometry(9000, 9000); cg.rotateX(Math.PI / 2);
    this.clouds = new THREE.Mesh(cg, this.cloudMat); this.clouds.position.y = 650; this.clouds.renderOrder = -1; this.scene.add(this.clouds);
    this.wind = new THREE.Vector2();
    const sp = [], r = this.r;
    for (let k = 0; k < 1400; k++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * q * 2600, Math.abs(u) * 2600 + 60, Math.sin(a) * q * 2600); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(38, 20, 14), new THREE.MeshBasicMaterial({ color: '#f1f0e6', fog: false, transparent: true, opacity: 0 }));
    this.scene.add(this.moon);
  }

  buildPlaces() {
    const s = this.scene;
    // Arturs lives on Brīvības iela, Paula right across the street; looking west you see the Freedom Monument
    const spawn = new THREE.Vector3(roadLine(4) + 46, CURB, roadLine(4) + ROAD / 2 + 1.6);
    this.places.spawn = spawn; this.places.spawnYaw = Math.PI / 2;
    const mk = (name, color, pos, label) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0)); s.add(ring);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: TX.signTexture(label, color, 'rgba(10,10,20,0.75)'), transparent: true }));
      sign.position.copy(pos).add(new THREE.Vector3(0, 3.0, 0)); s.add(sign);
      this.places[name] = { pos: pos.clone(), ring, sign, color };
    };
    const fz = roadLine(4) + ROAD / 2 + SIDEWALK; // south facade of Arturs' block
    mk('store', '#ff4fa3', new THREE.Vector3(spawn.x + 11, CURB, spawn.z), 'STILS');
    mk('jobs', '#ffd23f', new THREE.Vector3(spawn.x - 22, CURB, spawn.z), 'DARBS');
    this.homeDoor(spawn.x - 10, fz, Math.PI, '#4da3ff', 'ARTURS');
    this.homeDoor(spawn.x, -fz, 0, '#ff7ac0', 'PAULA');
    mk('homeArturs', '#4da3ff', new THREE.Vector3(spawn.x - 10, CURB, fz - 0.95), 'ARTURS');
    mk('homePaula', '#ff7ac0', new THREE.Vector3(spawn.x, CURB, -fz + 0.95), 'PAULA');
    this.places.homeArturs.yaw = Math.PI; this.places.homePaula.yaw = 0; // facing out of the door
    for (const k of ['homeArturs', 'homePaula']) this.places[k].sign.visible = false;
    this.buildBenches();
  }

  homeDoor(x, z, yaw, color, label) {
    const g = new THREE.Group();
    g.position.set(x, CURB, z); g.rotation.y = yaw;
    const dark = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.5, metalness: 0.4 });
    const add = (gg, m, px, py, pz) => { const o = new THREE.Mesh(gg, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(1.7, 2.75, 0.18), dark, 0, 1.375, 0);
    add(new THREE.BoxGeometry(1.25, 2.3, 0.06), new THREE.MeshPhysicalMaterial({ color: '#16202a', roughness: 0.08, metalness: 0.3 }), 0, 1.15, 0.08);
    add(new THREE.BoxGeometry(0.04, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: '#c9c9c9', metalness: 1, roughness: 0.3 }), 0.45, 1.1, 0.14);
    add(new THREE.BoxGeometry(2.3, 0.1, 1.3), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), 0, 2.95, 0.6);
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff7e0', emissive: '#ffd89a', emissiveIntensity: 0.6 });
    this.emissives.push([lamp, 2.5, 0.6]);
    add(new THREE.BoxGeometry(0.16, 0.24, 0.1), lamp, -1.05, 2.1, 0.12);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: TX.signTexture(label, color, 'rgba(10,10,20,0.85)'), emissive: '#ffffff', emissiveMap: TX.signTexture(label, color, 'rgba(10,10,20,0.85)'), emissiveIntensity: 0.6 }));
    plate.position.set(0, 3.3, 0.12); g.add(plate);
    this.scene.add(g);
  }

  buildBenches() {
    const spots = this.benches;
    const wood = [], metal = [];
    const bx = (arr, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); arr.push(g); };
    for (let i = 0; i < 4; i++) bx(wood, 1.8, 0.04, 0.1, 0, 0.45, 0.17 - i * 0.12);
    for (let i = 0; i < 3; i++) bx(wood, 1.8, 0.09, 0.03, 0, 0.62 + i * 0.13, -0.26 - i * 0.02);
    for (const x of [-0.78, 0.78]) { bx(metal, 0.05, 0.45, 0.05, x, 0.225, 0.16); bx(metal, 0.05, 0.85, 0.05, x, 0.425, -0.25); bx(metal, 0.05, 0.05, 0.48, x, 0.43, -0.04); }
    const woodM = new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 0.75 });
    const metalM = new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.4, metalness: 0.7 });
    const dummy = new THREE.Object3D();
    for (const [geos, m] of [[wood, woodM], [metal, metalM]]) {
      const inst = new THREE.InstancedMesh(mergeGeometries(geos), m, spots.length);
      spots.forEach((sp, i) => { dummy.position.copy(sp.pos); dummy.rotation.set(0, sp.yaw, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
      inst.castShadow = true; inst.receiveShadow = true; this.scene.add(inst);
    }
    for (const sp of spots) this.colliders.push({ minX: sp.pos.x - 0.6, maxX: sp.pos.x + 0.6, minZ: sp.pos.z - 0.6, maxZ: sp.pos.z + 0.6, h: sp.pos.y + 0.9, small: true, bench: true });
  }

  // ---------------------------------------------------------------- queries
  addInterior(apt) {
    this.interiors.push(apt.bounds);
    for (const c of apt.colliders) this.colliders.push(c);
    this.grid = null;
  }
  interiorAt(x, z) {
    for (const it of this.interiors) if (x > it.minX && x < it.maxX && z > it.minZ && z < it.maxZ) return it;
    return null;
  }
  // colliders near a point (uniform grid, built lazily); the returned array is reused
  query(x, z, r) {
    const S = 24;
    if (!this.grid) {
      this.grid = new Map(); this._qid = 0; this._out = [];
      for (const c of this.colliders) {
        for (let i = Math.floor(c.minX / S); i <= Math.floor(c.maxX / S); i++) for (let j = Math.floor(c.minZ / S); j <= Math.floor(c.maxZ / S); j++) {
          const k = i * 100003 + j; let cell = this.grid.get(k); if (!cell) this.grid.set(k, (cell = [])); cell.push(c);
        }
      }
    }
    const out = this._out; out.length = 0; const id = ++this._qid;
    for (let i = Math.floor((x - r) / S); i <= Math.floor((x + r) / S); i++) for (let j = Math.floor((z - r) / S); j <= Math.floor((z + r) / S); j++) {
      const cell = this.grid.get(i * 100003 + j); if (!cell) continue;
      for (const c of cell) if (c._q !== id) { c._q = id; out.push(c); }
    }
    return out;
  }
  isNight() { const t = this.time; return t < 6.3 || t > 19.4; }

  groundHeight(x, z) {
    for (const it of this.interiors) if (x > it.minX - 0.5 && x < it.maxX + 0.5 && z > it.minZ - 0.5 && z < it.maxZ + 0.5) return it.y;
    if (x > B0 && x < B1) {
      for (const b of BRIDGES) if (Math.abs(z - b.z) < b.w + 0.4) return deckY(b, x);
      if (x > RIVER_X && x < FAR_X) return WATER_Y;
    }
    if (x >= EMB_X) return 0;
    const p = this.plaza; if (p && x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return CURB;
    if (x < -HALF - ROAD / 2 || z < -HALF - ROAD / 2 || z > HALF + ROAD / 2) return 0;
    const b = this.blockAtIJ(Math.floor((x + HALF) / CELL), Math.floor((z + HALF) / CELL));
    if (b && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return b.canal && this.inCanal(x, z) ? CANAL_Y : CURB;
    return 0;
  }
  // tyre grip of the surface (cobbles and grass are slipperier than asphalt)
  surfaceAt(x, z) {
    if (x >= FAR_X + 36 || x < -HALF - ROAD / 2 || z < -HALF - ROAD / 2 || z > HALF + ROAD / 2) return 0.78;
    if (x >= EMB_X) return 1;
    const b = this.blockAtIJ(Math.floor((x + HALF) / CELL), Math.floor((z + HALF) / CELL));
    if (b && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return b.park ? 0.8 : 1;
    return x > OLD_X + ROAD / 2 ? 0.9 : 1;
  }

  update(dt, focus, camera) {
    this.time = (this.time + dt * this.timeSpeed) % 24;
    const t = this.time;
    // the sun rises in the east (−x) and sets in the west, over the Daugava (+x)
    const dayT = (t - 6) / 14;
    const elev = Math.sin(dayT * Math.PI) * 55 - (dayT < 0 || dayT > 1 ? 20 : 0);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(-90 - dayT * 180));
    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    const day = THREE.MathUtils.smoothstep(elev, -6, 10);
    const golden = 1 - THREE.MathUtils.smoothstep(elev, 4, 30);
    this.dayAmount = day; this.golden = golden;
    const moonDir = new THREE.Vector3(0.35, 0.75, 0.45).normalize();
    const lightDir = day > 0.05 ? sunDir : moonDir;
    this.sun.position.copy(focus).addScaledVector(lightDir, 250);
    this.sun.target.position.copy(focus);
    this.sun.intensity = day > 0.05 ? 3.0 * day : 0.8;
    this.sun.color.set(day > 0.05 ? new THREE.Color('#fff4e3').lerp(new THREE.Color('#ff9a4a'), golden * 0.85) : new THREE.Color('#8fa8ff'));
    this.hemi.intensity = (0.85 + 0.25 * day) * (this.indoor ? 0.32 : 1);
    this.hemi.color.set(new THREE.Color('#56669c').lerp(new THREE.Color('#bcd2f0'), day));
    this.hemi.groundColor.set(new THREE.Color('#383040').lerp(new THREE.Color('#6a5e50'), day));
    const fogCol = new THREE.Color('#0a0f1e').lerp(new THREE.Color('#b3c3d6').lerp(new THREE.Color('#e3a07c'), golden * 0.6), day);
    this.scene.fog.color.copy(fogCol);
    this.scene.background = fogCol;
    this.sky.visible = day > 0.01;
    const night = 1 - day;
    for (const [m, k, base = 0] of this.emissives) m.emissiveIntensity = base + night * k;
    this.renderer.toneMappingExposure = 0.5 + 0.12 * day + night * 0.3;
    if (Math.abs(elev - this.lastEnvSun) > 3) {
      this.lastEnvSun = elev;
      const u = this.envSky.material.uniforms;
      u.sunPosition.value.copy(sunDir); u.turbidity.value = 4; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
      if (this.envRT) this.envRT.dispose();
      this.envRT = this.pmrem.fromScene(this.envScene, 0.02);
      this.scene.environment = this.envRT.texture;
    }
    this.scene.environmentIntensity = Math.max(0.08, day * 0.9) * (this.indoor ? 0.25 : 1);
    this.waterNormal.offset.x += dt * 0.01; this.waterNormal.offset.y += dt * 0.016; // the river flows north
    // clouds stay put in the world while drifting with the wind; stars, moon, lamp light pools
    this.wind.x += dt * 0.0012; this.wind.y += dt * 0.0005;
    this.clouds.position.set(focus.x, 650, focus.z);
    this.cloudMat.map.offset.set(this.wind.x + focus.x / 1800, this.wind.y + focus.z / 1800);
    this.cloudMat.color.copy(new THREE.Color('#2a3142').lerp(new THREE.Color('#ffffff').lerp(new THREE.Color('#ffb48a'), golden * 0.7), day));
    this.cloudMat.opacity = 0.55 + 0.35 * day;
    this.starMat.opacity = Math.max(0, night - 0.3) * 1.3;
    this.stars.position.set(focus.x, 0, focus.z);
    this.moon.material.opacity = Math.max(0, night - 0.2);
    this.moon.position.copy(focus).addScaledVector(moonDir, 2300);
    this.poolMat.opacity = Math.max(0, night - 0.15) * 0.55;
    for (const k of ['store', 'jobs', 'homeArturs', 'homePaula']) {
      const p = this.places[k]; if (!p) continue;
      p.ring.rotation.y += dt; p.ring.material.opacity = 0.25 + Math.sin(performance.now() / 300) * 0.1;
      if (camera) p.sign.quaternion.copy(camera.quaternion);
    }
  }
}
