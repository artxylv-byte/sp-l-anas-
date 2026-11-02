// Port Solara – a procedurally built coastal city with day/night cycle.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

export const BLOCK = 56, ROAD = 14, N = 8, CELL = BLOCK + ROAD, HALF = (N * CELL) / 2;
export const SIDEWALK = 3.2, CURB = 0.18;
export const BEACH_X = HALF + ROAD / 2 + 18;
export const roadLine = (i) => -HALF + i * CELL; // centre line of road i (0..N)

const PASTELS = ['#f4d6c6', '#c9e4de', '#f7e1a1', '#e8b4bc', '#b8d8eb', '#f1efe9', '#d9c7f0', '#ffd0a8', '#bfe3c0', '#f6c4d8'];

function boxUV(g, w, h, d, tile = 14) {
  // BoxGeometry face order: +x,-x,+y,-y,+z,-z (4 verts each)
  const uv = g.attributes.uv;
  const faces = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (!faces[f]) { uv.setXY(i, 0.02, 0.02); continue; }
    uv.setXY(i, uv.getX(i) * faces[f][0] / tile, uv.getY(i) * faces[f][1] / tile);
  }
}
function colorize(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export class World {
  constructor(scene, renderer, quality) {
    this.scene = scene; this.renderer = renderer; this.q = quality;
    this.colliders = []; // {minX,maxX,minZ,maxZ,h}
    this.blocks = []; // {x0,x1,z0,z1,type}
    this.emissives = []; // materials whose emissiveIntensity follows night
    this.time = 18.2; // hours – start at golden hour
    this.timeSpeed = 1 / 60; // game hours per real second (1 day = 24 min)
    this.places = {};
    this.build();
  }

  build() {
    const s = this.scene;
    const r = TX.rng(2026);
    // ---------- lighting
    this.hemi = new THREE.HemisphereLight('#bcd7ff', '#5a4a3a', 0.8); s.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    this.sun.castShadow = this.q.shadows;
    const sz = this.q.high ? 70 : 45;
    Object.assign(this.sun.shadow.camera, { left: -sz, right: sz, top: sz, bottom: -sz, near: 1, far: 600 });
    this.sun.shadow.mapSize.set(this.q.high ? 2048 : 1024, this.q.high ? 2048 : 1024);
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    s.add(this.sun); s.add(this.sun.target);

    // ---------- sky
    this.sky = new Sky(); this.sky.scale.setScalar(4000); s.add(this.sky);
    const su = this.sky.material.uniforms;
    su.turbidity.value = 5; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    this.envSky = new Sky(); this.envSky.scale.setScalar(1000);
    this.envScene = new THREE.Scene(); this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.lastEnvSun = -999;
    s.fog = new THREE.Fog('#c9d8e8', 220, this.q.high ? 900 : 520);

    // ---------- ground
    const grassT = TX.grassTexture(); grassT.repeat.set(400, 400);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.receiveShadow = true; s.add(ground);

    // beach + ocean (east side)
    const sandT = TX.sandTexture(); sandT.repeat.set(60, 160);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(220, 1600), new THREE.MeshStandardMaterial({ map: sandT, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.rotation.y = 0.022; sand.position.set(BEACH_X + 110, -0.02 - 110 * 0.022, 0); sand.receiveShadow = true;
    s.add(sand);
    // a flat promenade strip so the beach starts at road level
    const prom = new THREE.Mesh(new THREE.PlaneGeometry(18, 1600), new THREE.MeshStandardMaterial({ map: sandT, roughness: 1 }));
    prom.rotation.x = -Math.PI / 2; prom.position.set(HALF + ROAD / 2 + 9, 0.0, 0); prom.receiveShadow = true; s.add(prom);
    const wn = TX.waterNormalTexture(); wn.repeat.set(60, 60);
    this.waterNormal = wn;
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshPhysicalMaterial({
      color: '#1d6f8f', roughness: 0.06, metalness: 0.0, normalMap: wn, normalScale: new THREE.Vector2(0.5, 0.5),
      transparent: true, opacity: 0.92, clearcoat: 0.6,
    }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.set(HALF + 1560, -0.6, 0); s.add(this.water);

    // distant hills (west / north / south)
    const hillMat = new THREE.MeshStandardMaterial({ color: '#6f8a5a', roughness: 1, flatShading: true });
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.5 + (i / 22) * Math.PI * 1.1 - 0.05;
      const d = 900 + r() * 300;
      const h = new THREE.Mesh(new THREE.ConeGeometry(120 + r() * 160, 60 + r() * 140, 7), hillMat);
      h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.add(h);
    }

    // ---------- roads
    const roadT = TX.roadTexture(); roadT.repeat.set(1, (N * CELL + ROAD) / 14);
    const roadM = new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const roadTz = roadT.clone(); roadTz.needsUpdate = true; roadTz.repeat.set(1, (N * CELL + ROAD) / 14);
    const asph = TX.asphaltTexture(); asph.repeat.set(2, 2);
    const interM = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.92 });
    const len = N * CELL + ROAD;
    const roadGeos = [], interGeos = [];
    for (let i = 0; i <= N; i++) {
      const x = roadLine(i);
      const g1 = new THREE.PlaneGeometry(ROAD, len); g1.rotateX(-Math.PI / 2); g1.translate(x, 0.02, 0); roadGeos.push(g1);
      const g2 = new THREE.PlaneGeometry(ROAD, len); g2.rotateX(-Math.PI / 2); g2.rotateY(Math.PI / 2); g2.translate(0, 0.025, x); roadGeos.push(g2);
      for (let j = 0; j <= N; j++) {
        const g = new THREE.PlaneGeometry(ROAD, ROAD); g.rotateX(-Math.PI / 2); g.translate(x, 0.035, roadLine(j)); interGeos.push(g);
      }
    }
    const roads = new THREE.Mesh(mergeGeometries(roadGeos), roadM); roads.receiveShadow = true; s.add(roads);
    const inter = new THREE.Mesh(mergeGeometries(interGeos), interM); inter.receiveShadow = true; s.add(inter);
    // crosswalk stripes
    const cwGeos = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const cx = roadLine(i), cz = roadLine(j);
      for (let k = -5; k <= 5; k++) {
        for (const [dx, dz, rot] of [[0, ROAD / 2 + 1.2, 0], [0, -ROAD / 2 - 1.2, 0], [ROAD / 2 + 1.2, 0, 1], [-ROAD / 2 - 1.2, 0, 1]]) {
          const g = new THREE.PlaneGeometry(0.6, 2.2); g.rotateX(-Math.PI / 2);
          if (rot) g.rotateY(Math.PI / 2);
          g.translate(cx + dx + (rot ? 0 : k * 1.15), 0.045, cz + dz + (rot ? k * 1.15 : 0));
          cwGeos.push(g);
        }
      }
    }
    const cw = new THREE.Mesh(mergeGeometries(cwGeos), new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.8 }));
    cw.receiveShadow = true; s.add(cw);

    // ---------- blocks
    const concT = TX.concreteTexture(); concT.repeat.set(BLOCK / 3, BLOCK / 3);
    const walkM = new THREE.MeshStandardMaterial({ map: concT, roughness: 0.95 });
    const parkGrassT = TX.grassTexture().clone(); parkGrassT.needsUpdate = true; parkGrassT.repeat.set(16, 16);
    const parkM = new THREE.MeshStandardMaterial({ map: parkGrassT, roughness: 1 });
    const facadeM = new THREE.MeshStandardMaterial({
      map: TX.facadeTexture(false), vertexColors: true, roughness: 0.75,
      emissiveMap: TX.facadeTexture(true), emissive: '#ffffff', emissiveIntensity: 0,
    });
    const glassM = new THREE.MeshStandardMaterial({
      map: TX.glassTowerTexture(false), vertexColors: true, roughness: 0.25, metalness: 0.5,
      emissiveMap: TX.glassTowerTexture(true), emissive: '#ffffff', emissiveIntensity: 0,
    });
    this.emissives.push([facadeM, 1.2], [glassM, 1.0]);
    const roofM = new THREE.MeshStandardMaterial({ color: '#8d8d8d', roughness: 0.9 });
    const facG = [], glsG = [], roofG = [], walkG = [], parkG = [];
    const center = (N - 1) / 2;
    const palms = [], trees = [], lamps = [];
    const signs = [];

    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = roadLine(i) + ROAD / 2, x1 = roadLine(i + 1) - ROAD / 2;
      const z0 = roadLine(j) + ROAD / 2, z1 = roadLine(j + 1) - ROAD / 2;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const dist = Math.max(Math.abs(i - center), Math.abs(j - center));
      let type = dist <= 1 ? 'downtown' : dist <= 2.5 ? 'mid' : 'low';
      if ((i === 2 && j === 5) || (i === 5 && j === 2) || (i === 0 && j === 0)) type = 'park';
      if (i === N - 1) type = 'beachfront';
      this.blocks.push({ x0, x1, z0, z1, type, i, j });
      // sidewalk slab
      const sw = new THREE.BoxGeometry(BLOCK, CURB, BLOCK); sw.translate(cx, CURB / 2, cz);
      walkG.push(sw);
      // lamps along the curb
      for (let k = 0; k < 3; k++) {
        const t = -BLOCK / 2 + 6 + k * ((BLOCK - 12) / 2);
        lamps.push([cx + t, z0 + 0.8, 0], [cx + t, z1 - 0.8, Math.PI], [x0 + 0.8, cz + t, Math.PI / 2], [x1 - 0.8, cz + t, -Math.PI / 2]);
      }
      if (type === 'park') {
        const pg = new THREE.PlaneGeometry(BLOCK - SIDEWALK * 2, BLOCK - SIDEWALK * 2); pg.rotateX(-Math.PI / 2); pg.translate(cx, CURB + 0.01, cz); parkG.push(pg);
        for (let k = 0; k < 18; k++) trees.push([cx + (r() - 0.5) * (BLOCK - 12), cz + (r() - 0.5) * (BLOCK - 12), 0.8 + r() * 0.6]);
        // fountain
        const f1 = new THREE.CylinderGeometry(4, 4.4, 0.7, 28); f1.translate(cx, CURB + 0.35, cz); roofG.push(f1);
        this.colliders.push({ minX: cx - 4.2, maxX: cx + 4.2, minZ: cz - 4.2, maxZ: cz + 4.2, h: 0.9 });
        const wat = new THREE.Mesh(new THREE.CircleGeometry(3.7, 28), this.water.material);
        wat.rotation.x = -Math.PI / 2; wat.position.set(cx, CURB + 0.62, cz); s.add(wat);
        continue;
      }
      // lots
      const inset = SIDEWALK;
      const ax0 = x0 + inset, ax1 = x1 - inset, az0 = z0 + inset, az1 = z1 - inset;
      const W = ax1 - ax0;
      let lots;
      if (type === 'downtown') lots = r() < 0.5 ? [[0, 0, 1, 1]] : [[0, 0, 0.5, 1], [0.5, 0, 1, 1]];
      else if (type === 'beachfront') lots = [[0, 0, 1, 0.3], [0, 0.35, 1, 0.65], [0, 0.7, 1, 1]];
      else lots = [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
      for (const [u0, v0, u1, v1] of lots) {
        const g = type === 'downtown' ? 2.5 : 1.5;
        let bx0 = ax0 + u0 * W + g, bx1 = ax0 + u1 * W - g, bz0 = az0 + v0 * W + g, bz1 = az0 + v1 * W - g;
        if (type === 'beachfront') { bx1 = bx0 + (bx1 - bx0) * 0.7; }
        const bw = bx1 - bx0, bd = bz1 - bz0;
        let h;
        if (type === 'downtown') h = 45 + r() * 95;
        else if (type === 'mid') h = 12 + r() * 30;
        else if (type === 'beachfront') h = 8 + r() * 14;
        else h = 7 + r() * 12;
        h = Math.round(h / 3.5) * 3.5;
        const glass = type === 'downtown' && r() < 0.7;
        const color = glass ? ['#cfe3f5', '#bcd3e8', '#e2eef6', '#a9c2d9'][Math.floor(r() * 4)] : PASTELS[Math.floor(r() * PASTELS.length)];
        const bg = new THREE.BoxGeometry(bw, h, bd); boxUV(bg, bw, h, bd, glass ? 16 : 14);
        bg.translate((bx0 + bx1) / 2, CURB + h / 2, (bz0 + bz1) / 2); colorize(bg, color);
        (glass ? glsG : facG).push(bg);
        this.colliders.push({ minX: bx0, maxX: bx1, minZ: bz0, maxZ: bz1, h: h + CURB });
        // roof details
        const rr = new THREE.BoxGeometry(bw + 0.6, 0.6, bd + 0.6); rr.translate((bx0 + bx1) / 2, CURB + h + 0.3, (bz0 + bz1) / 2); roofG.push(rr);
        for (let k = 0; k < 3; k++) {
          const ux = bx0 + 2 + r() * (bw - 4), uz = bz0 + 2 + r() * (bd - 4);
          const ac = new THREE.BoxGeometry(2 + r() * 2, 1.2 + r(), 2 + r() * 2); ac.translate(ux, CURB + h + 1.1, uz); roofG.push(ac);
        }
        if (type === 'downtown' && glass && r() < 0.6) {
          const sp = new THREE.CylinderGeometry(0.15, 0.4, 14, 6); sp.translate((bx0 + bx1) / 2, CURB + h + 7, (bz0 + bz1) / 2); roofG.push(sp);
        }
        if (type === 'beachfront' || (type === 'low' && r() < 0.25)) {
          const names = ['MOTEL', 'DINER', 'SURF', 'TACOS', 'ARCADE', 'HOTEL', 'GELATO', 'RADIO'];
          const cols = ['#ff4fa3', '#40e0ff', '#ffd23f', '#7cff6b', '#ff7a3d'];
          signs.push({ text: names[Math.floor(r() * names.length)], color: cols[Math.floor(r() * cols.length)], x: bx1 + 0.05, y: CURB + Math.min(h - 2, 6), z: (bz0 + bz1) / 2, ry: Math.PI / 2, faceEast: true });
        }
      }
      if (type === 'beachfront' || type === 'low') {
        for (let k = 0; k < 4; k++) palms.push([x0 + 1.5 + r() * 0.5, z0 + 5 + k * 15, 0.85 + r() * 0.35]);
      }
    }
    // promenade palms
    for (let z = -HALF; z <= HALF; z += 16) palms.push([HALF + ROAD / 2 + 4, z + 4, 0.9 + r() * 0.4], [HALF + ROAD / 2 + 15, z + 12, 0.9 + r() * 0.4]);

    const addMerged = (geos, mat, shadow = true) => {
      if (!geos.length) return null;
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.castShadow = shadow; m.receiveShadow = true; s.add(m); return m;
    };
    addMerged(walkG, walkM, false);
    addMerged(parkG, parkM, false);
    this.facadeMesh = addMerged(facG, facadeM);
    this.glassMesh = addMerged(glsG, glassM);
    addMerged(roofG, roofM);

    // neon signs
    for (const sg of signs) {
      const m = new THREE.MeshStandardMaterial({ map: TX.signTexture(sg.text, sg.color), transparent: true, emissive: '#ffffff', emissiveMap: TX.signTexture(sg.text, sg.color), emissiveIntensity: 0.4, roughness: 0.5 });
      this.emissives.push([m, 3.0, 0.4]);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), m);
      p.position.set(sg.x + 0.05, sg.y, sg.z); p.rotation.y = sg.ry; s.add(p);
    }

    this.buildProps(palms, trees, lamps);
    this.buildPlaces();
  }

  buildProps(palms, trees, lamps) {
    const s = this.scene;
    const dummy = new THREE.Object3D();
    // ---- palm tree: curved trunk + fronds
    const trunkGeos = [];
    for (let k = 0; k < 8; k++) {
      const g = new THREE.CylinderGeometry(0.17 - k * 0.008, 0.2 - k * 0.008, 1.2, 8); g.translate(Math.pow(k / 8, 2) * 1.2, 0.6 + k * 1.15, 0); trunkGeos.push(g);
      const ring = new THREE.TorusGeometry(0.19 - k * 0.008, 0.03, 4, 8); ring.rotateX(Math.PI / 2); ring.translate(Math.pow(k / 8, 2) * 1.2, 0.05 + k * 1.15, 0); trunkGeos.push(ring);
    }
    const trunk = mergeGeometries(trunkGeos.map((g) => g.toNonIndexed()));
    const frondGeos = [];
    for (let k = 0; k < 9; k++) {
      const g = new THREE.PlaneGeometry(1.4, 4.2, 1, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 2.1; p.setXYZ(i, p.getX(i), y, -0.08 * y * y); }
      g.rotateX(-Math.PI / 2 + 0.25 + (k % 2) * 0.25);
      g.rotateY((k / 9) * Math.PI * 2);
      g.translate(1.2, 9.3, 0);
      frondGeos.push(g);
    }
    const fronds = mergeGeometries(frondGeos);
    fronds.computeVertexNormals();
    const trunkM = new THREE.MeshStandardMaterial({ color: '#8a6f52', roughness: 1 });
    const leafM = new THREE.MeshStandardMaterial({ map: TX.leafTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8, color: '#cfe8a8' });
    const tI = new THREE.InstancedMesh(trunk, trunkM, palms.length);
    const fI = new THREE.InstancedMesh(fronds, leafM, palms.length);
    palms.forEach(([x, z, sc], i) => {
      dummy.position.set(x, CURB, z); dummy.rotation.set(0, (i * 2.3) % 6.28, 0); dummy.scale.setScalar(sc); dummy.updateMatrix();
      tI.setMatrixAt(i, dummy.matrix); fI.setMatrixAt(i, dummy.matrix);
      this.colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, h: 9, small: true });
    });
    for (const m of [tI, fI]) { m.castShadow = true; m.receiveShadow = true; s.add(m); }

    // ---- park trees
    const tTrunk = new THREE.CylinderGeometry(0.18, 0.28, 3, 7); tTrunk.translate(0, 1.5, 0);
    const tTop = new THREE.IcosahedronGeometry(2.4, 1); tTop.translate(0, 4.6, 0);
    const ti = new THREE.InstancedMesh(tTrunk, trunkM, trees.length);
    const ci = new THREE.InstancedMesh(tTop, new THREE.MeshStandardMaterial({ color: '#4f7f36', roughness: 0.9, flatShading: true }), trees.length);
    const col = new THREE.Color();
    trees.forEach(([x, z, sc], i) => {
      dummy.position.set(x, CURB, z); dummy.rotation.set(0, i, 0); dummy.scale.setScalar(sc); dummy.updateMatrix();
      ti.setMatrixAt(i, dummy.matrix); ci.setMatrixAt(i, dummy.matrix);
      ci.setColorAt(i, col.setHSL(0.24 + (i % 5) * 0.02, 0.45, 0.32 + (i % 3) * 0.04));
      this.colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, h: 6, small: true });
    });
    for (const m of [ti, ci]) { m.castShadow = true; m.receiveShadow = true; s.add(m); }

    // ---- street lamps
    const pole = new THREE.CylinderGeometry(0.08, 0.12, 6, 8); pole.translate(0, 3, 0);
    const arm = new THREE.BoxGeometry(0.1, 0.1, 1.6); arm.translate(0, 6, 0.75);
    const poleG = mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()]);
    const headG = new THREE.BoxGeometry(0.45, 0.15, 0.8); headG.translate(0, 5.9, 1.5);
    const poleM = new THREE.MeshStandardMaterial({ color: '#3a3f44', metalness: 0.6, roughness: 0.5 });
    const bulbM = new THREE.MeshStandardMaterial({ color: '#fff7e0', emissive: '#ffd89a', emissiveIntensity: 0 });
    this.emissives.push([bulbM, 4.0]);
    const pI = new THREE.InstancedMesh(poleG, poleM, lamps.length);
    const hI = new THREE.InstancedMesh(headG, bulbM, lamps.length);
    lamps.forEach(([x, z, ry], i) => {
      dummy.position.set(x, CURB, z); dummy.rotation.set(0, ry + Math.PI, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      pI.setMatrixAt(i, dummy.matrix); hI.setMatrixAt(i, dummy.matrix);
    });
    pI.castShadow = true; s.add(pI); s.add(hI);
  }

  buildPlaces() {
    // Clothing store + jobs board near the spawn point
    const s = this.scene;
    const b = this.blocks.find((bl) => bl.i === 4 && bl.j === 4);
    const spawn = new THREE.Vector3(roadLine(4) + ROAD / 2 + 1.6, CURB, roadLine(4) + ROAD / 2 + 20);
    this.places.spawn = spawn;
    this.places.spawn2 = spawn.clone().add(new THREE.Vector3(0, 0, 3));
    const mk = (name, color, pos, label) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0)); s.add(ring);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: TX.signTexture(label, color, 'rgba(10,10,20,0.75)'), transparent: true }));
      sign.position.copy(pos).add(new THREE.Vector3(0, 3.0, 0)); s.add(sign);
      this.places[name] = { pos: pos.clone(), ring, sign, color };
    };
    mk('store', '#ff4fa3', new THREE.Vector3(spawn.x + 0.2, CURB, spawn.z + 10), 'THREADS');
    mk('jobs', '#ffd23f', new THREE.Vector3(spawn.x + 0.2, CURB, spawn.z - 8), 'JOBS');
    this.places.storeBlock = b;
  }

  isNight() { const t = this.time; return t < 6.3 || t > 19.4; }

  groundHeight(x, z) {
    for (const b of this.blocks) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return CURB;
    if (x > BEACH_X) return Math.max(-1.1, -(x - BEACH_X) * 0.022);
    return 0;
  }

  update(dt, focus, camera) {
    this.time = (this.time + dt * this.timeSpeed) % 24;
    const t = this.time;
    // sun path: rises 6:00 east (+x, towards the ocean), sets 20:00 west
    const dayT = (t - 6) / 14; // 0..1 across the day
    const elev = Math.sin(dayT * Math.PI) * 62 - (dayT < 0 || dayT > 1 ? 20 : 0);
    const az = 90 - dayT * 180; // degrees
    const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(az);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    // sky uniform: sun position
    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    const day = THREE.MathUtils.smoothstep(elev, -6, 10);
    const golden = 1 - THREE.MathUtils.smoothstep(elev, 4, 30);
    this.dayAmount = day;
    // moon when night
    const lightDir = day > 0.05 ? sunDir : new THREE.Vector3(-0.3, 0.8, 0.4).normalize();
    this.sun.position.copy(focus).addScaledVector(lightDir, 250);
    this.sun.target.position.copy(focus);
    this.sun.intensity = day > 0.05 ? 3.0 * day : 0.9;
    this.sun.color.set(day > 0.05 ? new THREE.Color('#fff4e3').lerp(new THREE.Color('#ff9a4a'), golden * 0.85) : new THREE.Color('#8fa8ff'));
    this.hemi.intensity = 0.9 + 0.2 * day;
    this.hemi.color.set(new THREE.Color('#5a6aa0').lerp(new THREE.Color('#bcd7ff'), day));
    this.hemi.groundColor.set(new THREE.Color('#3a3040').lerp(new THREE.Color('#6a5a4a'), day));
    const fogCol = new THREE.Color('#0a0f1e').lerp(new THREE.Color('#a9bfd8').lerp(new THREE.Color('#e8a07a'), golden * 0.6), day);
    this.scene.fog.color.copy(fogCol);
    this.scene.background = fogCol;
    this.sky.visible = day > 0.01;
    const night = 1 - day;
    for (const [m, k, base = 0] of this.emissives) m.emissiveIntensity = base + night * k;
    this.renderer.toneMappingExposure = 0.5 + 0.12 * day + night * 0.3;
    // env map refresh (reflections on cars / glass)
    if (Math.abs(elev - this.lastEnvSun) > 3) {
      this.lastEnvSun = elev;
      const u = this.envSky.material.uniforms;
      u.sunPosition.value.copy(sunDir); u.turbidity.value = 5; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
      if (this.envRT) this.envRT.dispose();
      this.envRT = this.pmrem.fromScene(this.envScene, 0.02);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = Math.max(0.08, day * 0.9);
    }
    // water
    this.waterNormal.offset.x += dt * 0.012; this.waterNormal.offset.y += dt * 0.007;
    // markers
    for (const k of ['store', 'jobs']) {
      const p = this.places[k]; if (!p) continue;
      p.ring.rotation.y += dt; p.ring.material.opacity = 0.25 + Math.sin(performance.now() / 300) * 0.1;
      if (camera) p.sign.quaternion.copy(camera.quaternion);
    }
  }
}
