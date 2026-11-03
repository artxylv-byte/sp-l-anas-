// City population: realistic pedestrians that keep the streets around the player busy,
// small groups chatting, people relaxing on benches, and friendly greetings.
import * as THREE from 'three';
import { Human, cloneHuman, randomAppearance } from './character.js';
import { CURB, HALF, ROAD } from './world.js';

export const GREETINGS = ['Hey there!', 'Hi! Nice day, right?', 'Hello! 👋', 'Love the outfit!', 'Have you been down to the beach yet?',
  'Careful with the traffic out here!', 'Good to see you!', 'The sunset here is unreal.', 'Hey! Do you live around here?',
  'What a beautiful city.', 'Have a great day!', 'Oh hi! I think I know you…'];

const _v = new THREE.Vector3();

export class Population {
  constructor(scene, world, { walkers = 18, variants = 6, groups = 6, sitters = 6, shadows = true, focus }) {
    this.scene = scene; this.world = world; this.list = [];
    // a few unique people are built once; everybody else is a cheap clone of one of them
    this.variants = [];
    for (let i = 0; i < variants; i++) this.variants.push(new Human(randomAppearance(Math.random, i % 2 ? 'female' : 'male'), { detail: 'low' }));
    let vi = 0;
    const make = (kind) => {
      const h = cloneHuman(this.variants[vi++ % this.variants.length]);
      const small = [];
      h.root.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; if (o.userData.small) small.push(o); } });
      scene.add(h.root);
      const n = { kind, h, pos: new THREE.Vector3(), yaw: Math.random() * 6.28, speed: 1.1 + Math.random() * 0.45, dodge: 0, dodgeDir: new THREE.Vector3(), greetT: 0, small, lookT: 0, head: new THREE.Vector3() };
      this.list.push(n);
      return n;
    };
    const f = focus || new THREE.Vector3();
    for (let k = 0; k < walkers; k++) this.placeWalker(make('walk'), f, 8, 110);
    for (const sp of this.groupSpots(f, groups)) {
      const m = Math.random() < 0.4 ? 3 : 2, members = [];
      for (let j = 0; j < m; j++) {
        const n = make('stand');
        const a = (j / m) * Math.PI * 2 + Math.random() * 0.4;
        n.pos.set(sp.x + Math.cos(a) * 0.72, sp.y, sp.z + Math.sin(a) * 0.72);
        n.yaw = Math.atan2(sp.x - n.pos.x, sp.z - n.pos.z);
        n.group = members; n.h.anim.talk = 0.4 + Math.random() * 0.5;
        members.push(n);
      }
    }
    const benches = [...world.benches].sort((p, q) => p.pos.distanceTo(f) - q.pos.distanceTo(f));
    for (const b of benches.slice(0, sitters)) {
      const n = make('sit');
      n.pos.copy(b.pos); n.yaw = b.yaw; n.h.anim.sit = true;
    }
  }

  // candidate spots for chatting groups: sidewalk corners, park plazas and the promenade near the player
  groupSpots(focus, count) {
    const c = [];
    for (const b of this.world.blocks) {
      if (b.type === 'park') {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
        c.push(new THREE.Vector3(cx + 11, CURB, cz + 4), new THREE.Vector3(cx - 10, CURB, cz - 6));
      } else {
        c.push(new THREE.Vector3(b.x0 + 2.2, CURB, b.z0 + 2.2), new THREE.Vector3(b.x1 - 2.2, CURB, b.z1 - 2.2));
      }
    }
    for (let z = -HALF + 33; z < HALF; z += 52) c.push(new THREE.Vector3(HALF + ROAD / 2 + 6, 0, z));
    c.sort((a, b) => a.distanceTo(focus) - b.distanceTo(focus));
    const near = c.slice(0, count * 3).filter((p) => p.distanceTo(focus) > 6);
    const out = [];
    while (out.length < count && near.length) out.push(near.splice(Math.floor(Math.random() * near.length), 1)[0]);
    return out;
  }

  // put a walker on the sidewalk loop of a block at a suitable distance (preferably out of view)
  placeWalker(n, focus, minD, maxD, camDir = null) {
    const blocks = this.world.blocks;
    let b = null, best = -1e9;
    for (let tries = 0; tries < 24; tries++) {
      const c = blocks[Math.floor(Math.random() * blocks.length)];
      const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
      const d = Math.hypot(cx - focus.x, cz - focus.z);
      if (d < minD - 30 || d > maxD + 30) continue;
      let score = Math.random();
      if (camDir) { const dot = ((cx - focus.x) * camDir.x + (cz - focus.z) * camDir.z) / (d || 1); score -= dot; }
      if (score > best) { best = score; b = c; }
    }
    if (!b) b = blocks[Math.floor(Math.random() * blocks.length)];
    const inset = 1.6;
    const corners = [
      new THREE.Vector3(b.x0 + inset, CURB, b.z0 + inset), new THREE.Vector3(b.x1 - inset, CURB, b.z0 + inset),
      new THREE.Vector3(b.x1 - inset, CURB, b.z1 - inset), new THREE.Vector3(b.x0 + inset, CURB, b.z1 - inset),
    ];
    if (Math.random() < 0.5) corners.reverse();
    const start = Math.floor(Math.random() * 4);
    n.corners = corners; n.idx = (start + 1) % 4;
    n.pos.copy(corners[start]).lerp(corners[(start + 1) % 4], Math.random());
  }

  nearest(pos, maxD) {
    let best = null, bd = maxD;
    for (const n of this.list) { const d = n.pos.distanceTo(pos); if (d < bd && n.h.root.visible) { bd = d; best = n; } }
    return best;
  }
  greet(n) {
    n.greetT = 2.8;
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }
  headOf(n) { return n.head.set(n.pos.x, n.pos.y + (n.h.look.height || 170) / 100 * 0.94, n.pos.z); }

  update(dt, focus, cars, player, camera) {
    const camDir = camera ? camera.getWorldDirection(_v).clone() : null;
    const playerHead = player ? player.pos.clone().add(new THREE.Vector3(0, 1.6, 0)) : null;
    for (const p of this.list) {
      let d = p.pos.distanceTo(focus);
      if (p.kind === 'walk' && d > 140) { this.placeWalker(p, focus, 50, 115, camDir); d = p.pos.distanceTo(focus); }
      const vis = d < 150;
      p.h.root.visible = vis;
      if (!vis) continue;
      for (const m of p.small) m.visible = d < 22; // eyes, brows and lashes only matter up close
      const a = p.h.anim;
      if (p.greetT > 0) {
        // stop, face the player and wave
        p.greetT -= dt;
        a.speed = 0; a.wave = p.greetT > 0.7;
        if (player) {
          let dy = Math.atan2(player.pos.x - p.pos.x, player.pos.z - p.pos.z) - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          if (p.kind !== 'sit') p.yaw += dy * Math.min(1, dt * 6);
        }
      } else if (p.kind === 'walk') {
        a.wave = false;
        const target = p.corners[p.idx];
        const to = target.clone().sub(p.pos); to.y = 0;
        if (to.length() < 0.4) p.idx = (p.idx + 1) % 4;
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
        let dy = want - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        p.yaw += dy * Math.min(1, dt * 8);
        a.speed = speed;
      } else {
        a.speed = 0; a.wave = false;
      }
      // who to look at: the player when close, otherwise the person you're talking with
      if (playerHead && d < 5) a.lookAt = playerHead;
      else if (p.group) {
        p.lookT -= dt;
        if (p.lookT <= 0 || !a.lookAt) {
          p.lookT = 2 + Math.random() * 4;
          const others = p.group.filter((o) => o !== p);
          a.lookAt = others.length ? this.headOf(others[Math.floor(Math.random() * others.length)]).clone() : null;
        }
      } else a.lookAt = null;
      p.h.root.position.copy(p.pos);
      p.h.root.rotation.y = p.yaw;
      p.h.update(dt);
    }
  }
}
