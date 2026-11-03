// Pedestrians walking around the sidewalks of city blocks.
import * as THREE from 'three';
import { Human, cloneHuman, randomAppearance } from './character.js';
import { CURB } from './world.js';

export class Pedestrians {
  constructor(scene, world, count) {
    this.list = [];
    const blocks = world.blocks;
    const variants = [], nVar = Math.min(6, count);
    for (let k = 0; k < count; k++) {
      const b = blocks[Math.floor(Math.random() * blocks.length)];
      const inset = 1.6;
      const corners = [
        new THREE.Vector3(b.x0 + inset, CURB, b.z0 + inset), new THREE.Vector3(b.x1 - inset, CURB, b.z0 + inset),
        new THREE.Vector3(b.x1 - inset, CURB, b.z1 - inset), new THREE.Vector3(b.x0 + inset, CURB, b.z1 - inset),
      ];
      if (Math.random() < 0.5) corners.reverse();
      // a handful of unique people are built once and then cloned (fast to load, shared GPU memory)
      if (!variants[k % nVar]) variants[k % nVar] = new Human(randomAppearance(Math.random, k % 2 ? 'female' : 'male'), { detail: 'low' });
      const h = cloneHuman(variants[k % nVar]);
      const start = Math.floor(Math.random() * 4);
      const ped = { h, corners, idx: (start + 1) % 4, pos: corners[start].clone().lerp(corners[(start + 1) % 4], Math.random()), yaw: 0, speed: 1.2 + Math.random() * 0.4, dodge: 0, dodgeDir: new THREE.Vector3() };
      scene.add(h.root);
      this.list.push(ped);
    }
  }
  update(dt, focus, cars) {
    for (const p of this.list) {
      const far = p.pos.distanceToSquared(focus) > 160 * 160;
      p.h.root.visible = !far;
      const target = p.corners[p.idx];
      const to = target.clone().sub(p.pos); to.y = 0;
      if (to.length() < 0.4) { p.idx = (p.idx + 1) % 4; continue; }
      // dodge fast cars
      if (p.dodge <= 0) {
        for (const c of cars) {
          if (Math.abs(c.speed) < 4) continue;
          const rel = p.pos.clone().sub(c.pos); rel.y = 0;
          if (rel.length() < 7 && rel.dot(c.forward) > 0) {
            const side = new THREE.Vector3(c.forward.z, 0, -c.forward.x);
            p.dodgeDir.copy(side.multiplyScalar(Math.sign(rel.dot(side)) || 1));
            p.dodge = 0.8; break;
          }
        }
      }
      let speed = p.speed, dir;
      if (p.dodge > 0) { p.dodge -= dt; dir = p.dodgeDir; speed = 5; } else dir = to.normalize();
      p.pos.addScaledVector(dir, speed * dt);
      const want = Math.atan2(dir.x, dir.z);
      let d = want - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      p.yaw += d * Math.min(1, dt * 8);
      if (!far) {
        p.h.root.position.copy(p.pos);
        p.h.root.rotation.y = p.yaw;
        p.h.anim.speed = speed;
        p.h.update(dt);
      }
    }
  }
}
