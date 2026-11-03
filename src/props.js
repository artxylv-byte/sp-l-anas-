// Small physics props around Riga: traffic cones, litter bins, cardboard boxes and footballs.
// Cars and people knock them over; they tumble, slide and roll, then quietly reset when nobody is looking.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CURB, roadLine, EMB_X, FAR_X, HALF } from './world.js';

const KINDS = {
  cone: { r: 0.22, h: 0.72, bounce: 0.3, topple: true, light: true },
  bin: { r: 0.3, h: 0.95, bounce: 0.15, topple: true, light: false },
  box: { r: 0.3, h: 0.44, bounce: 0.2, topple: true, light: true },
  ball: { r: 0.11, h: 0.22, bounce: 0.7, ball: true, light: true },
};

function painted(g, color) {
  g = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  return g;
}
function geometryFor(kind) {
  if (kind === 'cone') {
    return mergeGeometries([
      painted(new THREE.BoxGeometry(0.42, 0.04, 0.42).translate(0, 0.02, 0), '#151515'),
      painted(new THREE.ConeGeometry(0.17, 0.68, 14).translate(0, 0.38, 0), '#ff5a1a'),
      painted(new THREE.CylinderGeometry(0.098, 0.122, 0.1, 14).translate(0, 0.42, 0), '#f4f4f4'),
    ]);
  }
  if (kind === 'bin') {
    return mergeGeometries([
      painted(new THREE.CylinderGeometry(0.27, 0.24, 0.86, 14).translate(0, 0.43, 0), '#2f4a3a'),
      painted(new THREE.CylinderGeometry(0.29, 0.29, 0.09, 14).translate(0, 0.9, 0), '#3d5c4a'),
      painted(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12).translate(0, 0.95, 0), '#111111'),
    ]);
  }
  if (kind === 'box') {
    return mergeGeometries([
      painted(new THREE.BoxGeometry(0.55, 0.44, 0.45).translate(0, 0.22, 0), '#b08a5a'),
      painted(new THREE.BoxGeometry(0.56, 0.02, 0.08).translate(0, 0.445, 0), '#d8c9a8'),
    ]);
  }
  // football: black patches where the 12 pentagons sit (icosahedron vertices)
  const g = new THREE.SphereGeometry(0.11, 16, 12).toNonIndexed();
  const ico = new THREE.IcosahedronGeometry(1, 0), dirs = [];
  const ip = ico.attributes.position;
  for (let i = 0; i < ip.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ip, i).normalize(); if (!dirs.some((d) => d.distanceTo(v) < 1e-3)) dirs.push(v); }
  const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) { // colour per face so the patches stay crisp
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, i + k)); v.normalize();
    const dark = dirs.some((d) => d.dot(v) > 0.93) ? 0.04 : 0.92;
    for (let k = 0; k < 3; k++) col.set([dark, dark, dark], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv');
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0), AXX = new THREE.Vector3(1, 0, 0);

export class Props {
  constructor(scene, world, spawn) {
    this.world = world; this.list = [];
    const add = (kind, x, y, z, yaw = Math.random() * 6.28) => this.list.push({ kind, K: KINDS[kind], home: { x, y, z, yaw }, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), yaw, tilt: 0, tiltVel: 0, fallYaw: 0, spin: 0, spinVel: 0, q: new THREE.Quaternion(), awake: false, moved: false, fallen: false });
    // roadworks: cones along the kerb near home, by the Old Town and on the embankment
    for (let k = 0; k < 8; k++) add('cone', spawn.x - 26 + k * 2.6, 0.02, roadLine(4) - 5.6);
    for (let k = 0; k < 6; k++) add('cone', roadLine(7) + 5.6, 0.02, roadLine(3) + 14 + k * 2.6);
    for (let k = 0; k < 6; k++) add('cone', roadLine(2) - 5.6, 0.02, roadLine(5) + 20 + k * 2.6);
    for (let k = 0; k < 5; k++) add('cone', roadLine(8) - 5.6, 0.02, roadLine(1) + 18 + k * 2.6);
    // litter bins on the sidewalks and the promenade
    for (const b of world.blocks) {
      if (b.type === 'market' || b.type === 'castle') continue;
      add('bin', b.x0 + 0.75, CURB, b.z0 + 4.5, 0);
    }
    for (let z = -HALF + 30; z < HALF; z += 60) add('bin', EMB_X + 2, 0, z, 0);
    // cardboard boxes by the clothes shop and crates at the market
    const st = world.places.store.pos;
    for (const [dx, dy, dz] of [[2.2, 0, 1.0], [2.8, 0, 1.1], [2.5, 0.44, 1.05], [3.4, 0, 0.6]]) add('box', st.x + dx, CURB + dy, st.z + dz);
    const mk = world.blocks.find((b) => b.type === 'market');
    if (mk) for (let k = 0; k < 8; k++) add('box', mk.x0 + 1.2, CURB + (k % 2 ? 0.44 : 0), mk.z0 + 10 + Math.floor(k / 2) * 3.5);
    // footballs in the parks and on the riverside lawns
    for (const b of world.blocks) if (b.park) add('ball', b.cx + 14, CURB + 0.11, b.cz + 6);
    for (let k = 0; k < 6; k++) add('ball', FAR_X + 60 + k * 18, 0.11, -200 + k * 70);
    // one instanced mesh per kind
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    this.meshes = {};
    for (const kind of Object.keys(KINDS)) {
      const items = this.list.filter((p) => p.kind === kind);
      const m = new THREE.InstancedMesh(geometryFor(kind), mat, Math.max(1, items.length));
      m.count = items.length; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      items.forEach((p, i) => { p.idx = i; p.mesh = m; this.write(p); });
      scene.add(m); this.meshes[kind] = m;
    }
  }

  write(p) {
    const K = p.K;
    if (K.ball) _q.copy(p.q);
    else if (p.fallen) _q.setFromAxisAngle(UP, p.fallYaw).multiply(_q2.setFromAxisAngle(AXX, p.tilt)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, p.spin));
    else _q.setFromAxisAngle(UP, p.yaw);
    _p.copy(p.pos); if (K.ball) _p.y -= K.r; else if (p.fallen) _p.y += K.r * Math.sin(p.tilt);
    p.mesh.setMatrixAt(p.idx, _m.compose(_p, _q, _s));
    p.mesh.instanceMatrix.needsUpdate = true;
  }

  // something pushes the prop: a car (strong, knocks it flying) or a person (kick)
  hitBy(p, vx, vz, power) {
    const K = p.K, sp = Math.hypot(vx, vz);
    p.awake = true; p.moved = true;
    if (K.ball) { p.vel.set(vx, Math.min(6, 1 + sp * 0.35), vz); return; }
    p.vel.set(vx, Math.min(4.5, power > 3 ? 0.8 + power * 0.18 : 0), vz);
    if (K.topple && (power > 3 || (K.light && power > 1.2))) {
      if (!p.fallen) { p.fallen = true; p.fallYaw = Math.atan2(vx, vz); p.tilt = 0.05; p.spin = p.yaw - p.fallYaw; }
      p.tiltVel = Math.max(p.tiltVel, 3 + power * 0.5); p.spinVel = (Math.random() - 0.5) * power;
    }
  }

  update(dt, focus, cars, people, camera) {
    const world = this.world;
    for (const p of this.list) {
      const K = p.K;
      // cars plough through
      for (const c of cars) {
        const rx = p.pos.x - c.pos.x, rz = p.pos.z - c.pos.z;
        if (rx * rx + rz * rz > (c.T.L / 2 + 1) ** 2) continue;
        const along = rx * c.fwd.x + rz * c.fwd.z, side = rx * c.fwd.z - rz * c.fwd.x;
        const hl = c.T.L / 2 + K.r, hw = c.T.W / 2 + K.r;
        if (Math.abs(along) > hl || Math.abs(side) > hw || p.pos.y > c.pos.y + 1.6) continue;
        const sp = Math.hypot(c.vel.x, c.vel.z);
        // push out of the car's footprint along the shallower side
        const lx = c.fwd.z, lz = -c.fwd.x;
        if (hl - Math.abs(along) < hw - Math.abs(side)) { const k = (hl - Math.abs(along)) * Math.sign(along || 1); p.pos.x += c.fwd.x * k; p.pos.z += c.fwd.z * k; }
        else { const k = (hw - Math.abs(side)) * Math.sign(side || 1); p.pos.x += lx * k; p.pos.z += lz * k; }
        if (sp > 0.4) {
          const scatter = Math.sign(side || 1) * sp * 0.25;
          this.hitBy(p, c.vel.x * 1.15 + lx * scatter, c.vel.z * 1.15 + lz * scatter, sp);
          if (!K.light) { c.vel.multiplyScalar(0.97); c.impact = Math.max(c.impact, 0.6); }
        } else p.awake = true;
      }
      // people walk into things and kick footballs
      for (const o of people) {
        const dx = p.pos.x - o.pos.x, dz = p.pos.z - o.pos.z, R = K.r + 0.28;
        const d2 = dx * dx + dz * dz;
        if (d2 > R * R || o.pos.y > p.pos.y + K.h || p.pos.y > o.pos.y + 1.2) continue;
        const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d;
        const sp = Math.hypot(o.vel.x, o.vel.z), toward = o.vel.x * nx + o.vel.z * nz;
        p.pos.x = o.pos.x + nx * R; p.pos.z = o.pos.z + nz * R; p.moved = true;
        if (toward > 0.3 && K.ball) this.hitBy(p, nx * (1.6 + sp * 1.5) + o.vel.x * 0.4, nz * (1.6 + sp * 1.5) + o.vel.z * 0.4, sp);
        else if (toward > 0.3 && K.light) this.hitBy(p, nx * sp * 0.7, nz * sp * 0.7, sp > 4.5 ? 2 : 0.5);
        else this.write(p); // nudged aside
      }
      if (!p.awake) continue;
      // integrate: gravity, bounces, friction, toppling, rolling
      p.vel.y -= 9.81 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const gy = world.groundHeight(p.pos.x, p.pos.z) + (K.ball ? K.r : 0);
      let ground = false;
      if (p.pos.y <= gy) {
        p.pos.y = gy; ground = true;
        p.vel.y = p.vel.y < -1.2 ? -p.vel.y * K.bounce : 0;
        const f = Math.exp(-(K.ball ? 0.7 : p.fallen ? 3 : 6) * dt);
        p.vel.x *= f; p.vel.z *= f;
      }
      for (const b of world.query(p.pos.x, p.pos.z, 1)) { // bounce off walls, kerbs of buildings, benches
        if (p.pos.y > b.h || (b.minY !== undefined && b.minY > 2)) continue;
        const qx = Math.max(b.minX, Math.min(p.pos.x, b.maxX)), qz = Math.max(b.minZ, Math.min(p.pos.z, b.maxZ));
        const dx = p.pos.x - qx, dz = p.pos.z - qz, d = Math.hypot(dx, dz);
        if (d >= K.r || d < 1e-5) continue;
        const nx = dx / d, nz = dz / d, vn = p.vel.x * nx + p.vel.z * nz;
        p.pos.x += nx * (K.r - d); p.pos.z += nz * (K.r - d);
        if (vn < 0) { p.vel.x -= (1 + K.bounce) * vn * nx; p.vel.z -= (1 + K.bounce) * vn * nz; }
      }
      if (p.fallen) {
        p.tiltVel += 14 * Math.sin(p.tilt) * dt;
        p.tilt += p.tiltVel * dt;
        if (p.tilt >= Math.PI / 2) { p.tilt = Math.PI / 2; p.tiltVel = Math.abs(p.tiltVel) > 1 ? -p.tiltVel * 0.25 : 0; }
        p.spin += p.spinVel * dt; p.spinVel *= Math.exp(-2 * dt);
      }
      const hs = Math.hypot(p.vel.x, p.vel.z);
      if (K.ball && hs > 0.01) { // roll without slipping
        _p.set(p.vel.z, 0, -p.vel.x).normalize();
        p.q.premultiply(_q2.setFromAxisAngle(_p, (hs / K.r) * dt));
      }
      this.write(p);
      if (ground && hs < 0.05 && Math.abs(p.vel.y) < 0.05 && Math.abs(p.tiltVel) < 0.05) { p.vel.set(0, 0, 0); p.awake = false; }
    }
    // tidy up: props that were knocked around go back home once they're far away and out of view
    if (camera && (this.tidy = (this.tidy || 0) + dt) > 1) {
      this.tidy = 0;
      camera.updateMatrixWorld();
      _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
      for (const p of this.list) {
        if (!p.moved || p.awake) continue;
        _p.copy(p.pos);
        if (_p.distanceTo(focus) < 70 || _fr.containsPoint(_p)) continue;
        Object.assign(p, { moved: false, fallen: false, tilt: 0, tiltVel: 0, spin: 0, spinVel: 0, yaw: p.home.yaw });
        p.pos.set(p.home.x, p.home.y, p.home.z); p.vel.set(0, 0, 0); p.q.identity();
        this.write(p);
      }
    }
  }
}
