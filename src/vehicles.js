// Cars: procedural models, arcade driving physics and simple traffic AI.
import * as THREE from 'three';
import { N, ROAD, roadLine } from './world.js';

const TYPES = {
  sedan: { L: 4.6, W: 1.86, belt: 0.92, roof: 1.42, hood: 1.15, trunk: 0.95, ground: 0.32, wheel: 0.34, max: 42, acc: 9 },
  sports: { L: 4.45, W: 1.95, belt: 0.82, roof: 1.2, hood: 1.35, trunk: 1.05, ground: 0.26, wheel: 0.34, max: 58, acc: 15 },
  suv: { L: 4.85, W: 2.0, belt: 1.12, roof: 1.82, hood: 1.0, trunk: 0.45, ground: 0.42, wheel: 0.4, max: 36, acc: 8 },
  hatch: { L: 4.0, W: 1.8, belt: 0.92, roof: 1.5, hood: 0.95, trunk: 0.35, ground: 0.3, wheel: 0.32, max: 38, acc: 8.5 },
};
export const CAR_COLORS = ['#c0392b', '#f2f2f2', '#141414', '#2c3e50', '#2e86de', '#f1c40f', '#7f8c8d', '#16a085', '#e67e22', '#8e44ad', '#ff6fa8', '#c8c8c8'];

const matCache = {};
function bodyMat(color) {
  return (matCache[color] ||= new THREE.MeshPhysicalMaterial({ color, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }));
}
const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0d141c', metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.82 });
const tireMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.9, roughness: 0.25 });
const trimMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 });
const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4d6', emissiveIntensity: 0.3 });
const tailMat = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff1a1a', emissiveIntensity: 0.4 });
export const carLightMats = { headMat, tailMat };

function extrude(shape, depth, bevel, mat) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildCarModel(type, color) {
  const T = TYPES[type];
  const g = new THREE.Group();
  const inner = new THREE.Group(); inner.rotation.y = -Math.PI / 2; g.add(inner); // build along +x, face +z
  const { L, W, belt, roof, ground, wheel } = T;
  const hx = L / 2, wb = L * 0.31; // wheel x positions ±wb
  // lower body with wheel arches
  const s = new THREE.Shape();
  s.moveTo(-hx, ground + 0.08);
  s.lineTo(-hx + 0.1, ground);
  // go forward along bottom: rear arch then front arch (draw arcs from right to left: we traverse +x, so arcs reversed)
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
  inner.add(extrude(s, W - bevel * 2, bevel, bodyMat(color)));
  // greenhouse (glass)
  const c = new THREE.Shape();
  const fA = hx - T.hood, rA = -hx + T.trunk;
  c.moveTo(rA - 0.05, belt);
  c.lineTo(fA + 0.05, belt);
  c.quadraticCurveTo(fA - 0.25, roof - 0.05, fA - 0.75, roof);
  c.lineTo(rA + (type === 'suv' || type === 'hatch' ? 0.15 : 0.55), roof);
  c.quadraticCurveTo(rA + 0.05, roof - 0.1, rA - 0.05, belt);
  inner.add(extrude(c, W - 0.36, 0.05, glassMat));
  // roof panel
  const rf = new THREE.Shape();
  const r0 = rA + (type === 'suv' || type === 'hatch' ? 0.2 : 0.6), r1 = fA - 0.8;
  rf.moveTo(r0, roof - 0.02); rf.lineTo(r1, roof - 0.02); rf.lineTo(r1 - 0.05, roof + 0.03); rf.lineTo(r0 + 0.05, roof + 0.03);
  inner.add(extrude(rf, W - 0.34, 0.03, bodyMat(color)));
  // B-pillar strip + side trims
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, roof - belt, W - 0.3), bodyMat(color));
  pillar.position.set((r0 + r1) / 2 + 0.1, (roof + belt) / 2, 0); inner.add(pillar);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(wb * 2 - wheel * 2 - 0.3, 0.12, W + 0.02), trimMat);
  skirt.position.set(0, ground + 0.12, 0); inner.add(skirt);
  // lights
  for (const z of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), headMat); hl.position.set(hx - 0.02, belt - 0.22, z * (W / 2 - 0.32)); inner.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), tailMat); tl.position.set(-hx + 0.0, belt - 0.2, z * (W / 2 - 0.3)); inner.add(tl);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.2), bodyMat(color)); mirror.position.set(fA - 0.15, belt + 0.12, z * (W / 2 + 0.05)); inner.add(mirror);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, W * 0.5), trimMat); grille.position.set(hx + 0.01, ground + 0.3, 0); inner.add(grille);
  // wheels
  const wheels = [];
  const tireG = new THREE.CylinderGeometry(wheel, wheel, 0.26, 24); tireG.rotateX(Math.PI / 2);
  const rimG = new THREE.CylinderGeometry(wheel * 0.62, wheel * 0.62, 0.27, 12); rimG.rotateX(Math.PI / 2);
  const spokeG = new THREE.BoxGeometry(wheel * 1.1, 0.06, 0.28);
  for (const [x, z] of [[wb, 1], [wb, -1], [-wb, 1], [-wb, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, wheel, z * (W / 2 - 0.16)); inner.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(tireG, tireMat); t.castShadow = true; spin.add(t);
    spin.add(new THREE.Mesh(rimG, rimMat));
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(spokeG, rimMat); sp.rotation.z = (k / 3) * Math.PI; spin.add(sp); }
    wheels.push({ pivot, spin, front: x > 0 });
  }
  // headlight beams (night)
  const beamTex = beamTexture();
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.05, hx + 4.4); g.add(beam);
  return { group: g, wheels, beam, T };
}

let _beam;
function beamTexture() {
  if (_beam) return _beam;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 256, 10, 64, 200, 220);
  gr.addColorStop(0, 'rgba(255,240,200,0.6)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = gr; x.beginPath(); x.moveTo(40, 256); x.lineTo(88, 256); x.lineTo(128, 0); x.lineTo(0, 0); x.fill();
  _beam = new THREE.CanvasTexture(c);
  _beam.rotation = 0;
  return _beam;
}

// ---------------------------------------------------------------- Car
export class Car {
  constructor(scene, type, color, pos, yaw) {
    const m = buildCarModel(type, color);
    Object.assign(this, m);
    this.type = type; this.color = color;
    this.pos = pos.clone(); this.yaw = yaw; this.speed = 0; this.steer = 0;
    this.radius = this.T.W * 0.55;
    this.driver = null; // 'player' | 'ai' | null
    this.ai = null;
    scene.add(this.group);
    this.sync(0);
  }

  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  drive(dt, input) {
    const T = this.T;
    const thr = input.throttle, brake = input.brake;
    if (thr > 0) this.speed += (this.speed < 0 ? T.acc * 2.2 : T.acc * (1 - this.speed / T.max)) * thr * dt;
    if (brake > 0) this.speed -= (this.speed > 0 ? T.acc * 2.5 : T.acc * 0.6) * brake * dt;
    if (this.speed < -12) this.speed = -12;
    if (!thr && !brake) this.speed *= 1 - 0.6 * dt;
    if (input.handbrake) this.speed *= 1 - 2.2 * dt;
    if (Math.abs(this.speed) < 0.05 && !thr && !brake) this.speed = 0;
    const steerTarget = input.steer * (0.55 - Math.min(0.32, Math.abs(this.speed) * 0.008));
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const wb = T.L * 0.62;
    const yawRate = (this.speed * Math.tan(this.steer)) / wb * (input.handbrake ? 1.5 : 1);
    this.yaw += yawRate * dt;
  }

  integrate(dt, world, cars) {
    const f = this.forward;
    this.pos.addScaledVector(f, this.speed * dt);
    // building collisions (two circles)
    let hit = false;
    for (const off of [this.T.L * 0.3, -this.T.L * 0.3]) {
      const c = this.pos.clone().addScaledVector(f, off);
      for (const b of world.colliders) {
        const qx = Math.max(b.minX, Math.min(c.x, b.maxX)), qz = Math.max(b.minZ, Math.min(c.z, b.maxZ));
        const dx = c.x - qx, dz = c.z - qz, d2 = dx * dx + dz * dz;
        if (d2 < this.radius * this.radius) {
          const d = Math.sqrt(d2) || 0.001, push = this.radius - d;
          this.pos.x += (dx / d) * push; this.pos.z += (dz / d) * push; hit = true;
        }
      }
    }
    for (const o of cars) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = (this.T.L + o.T.L) * 0.32;
      if (d < min && d > 0.001) {
        const push = (min - d) / 2;
        this.pos.x += (dx / d) * push; this.pos.z += (dz / d) * push;
        o.pos.x -= (dx / d) * push; o.pos.z -= (dz / d) * push;
        if (Math.abs(this.speed) > 3) { o.speed *= 0.5; hit = true; }
      }
    }
    if (hit) { this.lastHit = Math.abs(this.speed); this.speed *= -0.25; }
    // world bounds
    const lim = roadLine(N) + 130;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, roadLine(0) - 20, lim);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, roadLine(0) - 20, roadLine(N) + 20);
    this.pos.y = Math.max(world.groundHeight(this.pos.x, this.pos.z) * 0.6, -0.8);
    this.sync(dt);
  }

  sync(dt) {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    for (const w of this.wheels) {
      w.spin.rotation.z -= (this.speed * dt) / this.T.wheel;
      if (w.front) w.pivot.rotation.y = this.steer;
    }
  }
}

// ---------------------------------------------------------------- Traffic
// Cars follow the road grid, keeping to the right lane.
export class Traffic {
  constructor(scene, world, count) {
    this.scene = scene; this.world = world; this.cars = [];
    const types = ['sedan', 'sedan', 'hatch', 'suv', 'sports'];
    for (let k = 0; k < count; k++) {
      const i = Math.floor(Math.random() * (N + 1)), j = Math.floor(Math.random() * N);
      const horiz = Math.random() < 0.5;
      const from = horiz ? [j, i] : [i, j], to = horiz ? [j + 1, i] : [i, j + 1];
      const car = new Car(scene, types[k % types.length], CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], new THREE.Vector3(), 0);
      car.driver = 'ai';
      this.setSegment(car, from, to, Math.random());
      this.cars.push(car);
    }
  }
  node([i, j]) { return new THREE.Vector3(roadLine(i), 0, roadLine(j)); }
  setSegment(car, from, to, t = 0) {
    const A = this.node(from), Bn = this.node(to);
    const d = Bn.clone().sub(A).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x); // right-hand traffic
    const lane = 3.3;
    car.ai = { from, to, start: A.clone().addScaledVector(d, ROAD * 0.7).addScaledVector(right, lane), end: Bn.clone().addScaledVector(d, -ROAD * 0.7).addScaledVector(right, lane), d, phase: 'seg', cruise: 9 + Math.random() * 4 };
    if (t > 0) {
      car.pos.lerpVectors(car.ai.start, car.ai.end, t);
      car.yaw = Math.atan2(d.x, d.z);
    }
  }
  pickNext(car) {
    const [i, j] = car.ai.to, [pi, pj] = car.ai.from;
    const opts = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a <= N && b <= N && !(a === pi && b === pj));
    const straight = [i + (i - pi), j + (j - pj)];
    const pick = Math.random() < 0.55 && opts.some(([a, b]) => a === straight[0] && b === straight[1]) ? straight : opts[Math.floor(Math.random() * opts.length)];
    this.setSegment(car, car.ai.to, pick);
  }
  update(dt, obstacles) {
    for (const car of this.cars) {
      if (car.driver !== 'ai') continue;
      const ai = car.ai;
      const target = ai.phase === 'seg' ? ai.end : ai.start;
      const to = target.clone().sub(car.pos); to.y = 0;
      const dist = to.length();
      if (ai.phase === 'seg' && dist < 2.5) { this.pickNext(car); car.ai.phase = 'turn'; continue; }
      if (ai.phase === 'turn' && dist < 2.5) ai.phase = 'seg';
      const desired = Math.atan2(to.x, to.z);
      let dy = desired - car.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      // obstacle check ahead
      let blocked = false;
      const f = car.forward;
      for (const o of obstacles) {
        if (o === car) continue;
        const op = o.pos || o;
        const rel = new THREE.Vector3(op.x - car.pos.x, 0, op.z - car.pos.z);
        const ahead = rel.dot(f);
        if (ahead > 0 && ahead < 11 && Math.abs(rel.x * f.z - rel.z * f.x) < 2.2) { blocked = true; break; }
      }
      const want = blocked ? 0 : ai.phase === 'turn' ? 6 : ai.cruise;
      car.speed += THREE.MathUtils.clamp(want - car.speed, -14 * dt, 5 * dt);
      car.steer = THREE.MathUtils.clamp(dy * 1.6, -0.6, 0.6);
      const wb = car.T.L * 0.62;
      car.yaw += (car.speed * Math.tan(car.steer)) / wb * dt;
      car.pos.addScaledVector(car.forward, car.speed * dt);
      car.pos.y = 0;
      car.sync(dt);
    }
  }
}
