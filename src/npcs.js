// City population: pedestrians who keep the streets around the player busy, small groups chatting,
// people relaxing on benches, friendly greetings (mostly in Latvian), personal space, and physical
// reactions – a car or a punch knocks them down, they lie dazed, get back up limping or holding an arm,
// and run off. Nothing gory: no blood, nobody dies.
import * as THREE from 'three';
import { Human, cloneHuman, randomAppearance } from './character.js';
import { CURB } from './world.js';

export const GREETINGS = ['Sveiki! 👋', 'Labdien!', 'Čau! Kā iet?', 'Jauku dienu!', 'Sveiks! Forši izskaties!', 'Hi! Nice day, right?',
  'Vai jau biji Vecrīgā?', 'Uzmanīgi uz ielas!', 'Rīga ir skaista, vai ne?', 'Love the outfit!', 'Oh hi! I think I know you…', 'Labvakar! 🙂'];
const TALL = ["Wow, you're tall! 😄", "How's the weather up there? 😄", 'Do you play basketball?', 'Tu esi garš! 😄'];
const SHORT = ['Oh hey, I almost missed you there 😄', 'Hi! 👋 Love your energy!'];
const OUCH = ['Ai!', 'Ei! Ko tu dari?!', 'Palīgā!', 'Ak vai…', 'Ouch!', 'Hey! What was that for?!', 'Mana kāja!', 'Au!'];
const BUMP = ['Ei! Uzmanīgāk!', 'Watch it!', 'Skaties, kur ej!', 'Hey!'];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const _v = new THREE.Vector3(), _e = new THREE.Vector3();

export class Population {
  constructor(scene, world, { walkers = 18, variants = 6, groups = 6, sitters = 6, shadows = true, focus, say, range = 85 }) {
    this.scene = scene; this.world = world; this.list = []; this.shadows = shadows; this.say = say || (() => {});
    this.range = range; // people further away than this aren't drawn (walkers respawn inside it)
    // a few unique people are built once; everybody else is a cheap clone of one of them
    this.variants = [];
    for (let i = 0; i < variants; i++) this.variants.push(new Human(randomAppearance(Math.random, i % 2 ? 'female' : 'male'), { detail: 'low' }));
    let vi = 0;
    const make = (kind) => {
      const h = cloneHuman(this.variants[vi++ % this.variants.length]);
      const small = [], meshes = [];
      h.root.traverse((o) => { if (o.isMesh) { meshes.push(o); o.castShadow = false; if (o.userData.small) small.push(o); } });
      scene.add(h.root);
      const n = { kind, state: kind, h, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: Math.random() * 6.28, speed: 1.1 + Math.random() * 0.45,
        dodge: 0, dodgeDir: new THREE.Vector3(), greetT: 0, small, meshes, shadow: false, lookT: 0, head: new THREE.Vector3(), threat: new THREE.Vector3(),
        t: 0, tilt: 0, tiltTo: 0, hits: 0, lod: Math.floor(Math.random() * 4), lodAcc: 0, bumpT: 0 };
      this.list.push(n);
      return n;
    };
    const f = focus || new THREE.Vector3();
    for (let k = 0; k < walkers; k++) this.placeWalker(make('walk'), f, 8, this.range - 10);
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

  // spots for chatting groups near the player: squares, parks, the embankment, sidewalk corners
  groupSpots(focus, count) {
    const c = this.world.hangouts.slice().sort((a, b) => a.distanceTo(focus) - b.distanceTo(focus));
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
      const d = Math.hypot(c.cx - focus.x, c.cz - focus.z);
      if (d < minD - 30 || d > maxD + 30) continue;
      let score = Math.random();
      if (camDir) score -= ((c.cx - focus.x) * camDir.x + (c.cz - focus.z) * camDir.z) / (d || 1);
      if (score > best) { best = score; b = c; }
    }
    if (!b) b = blocks[Math.floor(Math.random() * blocks.length)];
    this.walkLoop(n, b, Math.floor(Math.random() * 4), Math.random());
    // a fresh person: no injuries
    Object.assign(n.h.anim, { limp: 0, armHurt: 0, down: 0, crouch: 0, sit: false, wave: false });
    n.hits = 0; n.state = 'walk'; n.kind = 'walk'; n.group = null; n.tilt = n.tiltTo = 0;
  }
  walkLoop(n, b, start, t) {
    const inset = 1.6;
    const corners = [
      new THREE.Vector3(b.x0 + inset, CURB, b.z0 + inset), new THREE.Vector3(b.x1 - inset, CURB, b.z0 + inset),
      new THREE.Vector3(b.x1 - inset, CURB, b.z1 - inset), new THREE.Vector3(b.x0 + inset, CURB, b.z1 - inset),
    ];
    if (Math.random() < 0.5) corners.reverse();
    n.corners = corners; n.idx = (start + 1) % 4;
    if (t !== null) n.pos.copy(corners[start]).lerp(corners[(start + 1) % 4], t);
  }
  // after running off: rejoin the sidewalk of the nearest block
  rejoin(n) {
    let best = null, bd = 1e9;
    for (const b of this.world.blocks) { const d = Math.hypot(b.cx - n.pos.x, b.cz - n.pos.z); if (d < bd) { bd = d; best = b; } }
    this.walkLoop(n, best, 0, null);
    let ci = 0, cd = 1e9; n.corners.forEach((c, i) => { const d = c.distanceTo(n.pos); if (d < cd) { cd = d; ci = i; } });
    n.idx = ci; n.kind = 'walk'; n.state = 'walk'; n.group = null; n.h.anim.sit = false;
  }

  nearest(pos, maxD) {
    let best = null, bd = maxD;
    for (const n of this.list) { const d = n.pos.distanceTo(pos); if (d < bd && n.h.root.visible && (n.state === 'walk' || n.state === 'stand' || n.state === 'sit')) { bd = d; best = n; } }
    return best;
  }
  greet(n, player) {
    n.greetT = 2.8;
    const ph = player ? player.human.look.height : 175, nh = n.h.look.height || 172;
    if (ph - nh > 14 && Math.random() < 0.5) return TALL[Math.floor(Math.random() * TALL.length)];
    if (nh - ph > 14 && Math.random() < 0.5) return SHORT[Math.floor(Math.random() * SHORT.length)];
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  }
  // eye position (people look each other in the eye, whatever their heights)
  headOf(n) { return n.head.set(n.pos.x, n.pos.y + (n.h.eyeY || 1.6) - (n.h.anim.sit ? 0.45 : 0), n.pos.z); }

  // ---------------------------------------------------------------- knock-downs
  knock(n, vx, vz, power, from) {
    const a = n.h.anim;
    const thrown = Math.atan2(vx, vz);
    const rel = wrap(thrown - n.yaw);
    n.vel.set(vx, Math.min(5, 0.6 + power * 0.22), vz);
    // thrown the way they face → they fall forwards; otherwise they turn to the hit and fall backwards
    if (Math.abs(rel) < Math.PI / 2) { n.yaw = thrown; n.tiltTo = Math.PI / 2; } else { n.yaw = thrown + Math.PI; n.tiltTo = -Math.PI / 2; }
    this.clearFall(n);
    n.state = 'down'; n.kind = n.kind === 'stand' || n.kind === 'sit' ? 'walk' : n.kind;
    if (n.group) { n.group.splice(n.group.indexOf(n), 1); n.group = null; }
    n.t = 1.6 + Math.min(4, power * 0.25) + Math.random();
    Object.assign(a, { sit: false, wave: false, talk: 0, lookAt: null, speed: 0, down: 1, crouch: 0 });
    n.greetT = 0; n.threat.copy(from);
    // the harder the hit, the worse the injury
    if (power > 9 || (power > 5 && Math.random() < 0.5)) { a.limp = 1; a.limpSide = Math.random() < 0.5 ? 'L' : 'R'; }
    else if (power > 5 || n.hits >= 2) { a.armHurt = 1; a.armHurtSide = Math.random() < 0.5 ? 'L' : 'R'; }
    this.say(n, OUCH[Math.floor(Math.random() * OUCH.length)], 2.2);
    this.panic(n.pos, 14, from, n);
  }
  // fall into open space, not into a wall: try the other way round, then sideways
  clearFall(n) {
    const free = (yaw, tilt) => {
      const s = Math.sign(tilt), hx = Math.sin(yaw) * s, hz = Math.cos(yaw) * s; // where the head ends up
      for (const k of [0.6, 1.2, 1.8]) {
        const x = n.pos.x + hx * k, z = n.pos.z + hz * k;
        for (const b of this.world.query(x, z, 0.3)) {
          if (b.bound || n.pos.y > b.h - 0.3 || (b.minY !== undefined && b.minY > 2)) continue;
          if (x > b.minX - 0.25 && x < b.maxX + 0.25 && z > b.minZ - 0.25 && z < b.maxZ + 0.25) return false;
        }
      }
      return true;
    };
    for (const [dy, flip] of [[0, false], [0, true], [Math.PI / 2, false], [-Math.PI / 2, false]]) {
      const yaw = n.yaw + dy, tilt = flip ? -n.tiltTo : n.tiltTo;
      if (free(yaw, tilt)) { n.yaw = yaw; n.tiltTo = tilt; if (dy || flip) { const sp = Math.hypot(n.vel.x, n.vel.z); const s = Math.sign(tilt); n.vel.x = Math.sin(yaw) * s * sp; n.vel.z = Math.cos(yaw) * s * sp; } return; }
    }
  }
  // everybody nearby runs away from trouble
  panic(pos, radius, from, except) {
    for (const o of this.list) {
      if (o === except || o.state === 'down' || o.state === 'getup' || !o.h.root.visible) continue;
      if (o.pos.distanceTo(pos) > radius) continue;
      this.flee(o, from, 4 + Math.random() * 4);
    }
  }
  flee(n, from, secs) {
    if (n.group) { n.group.splice(n.group.indexOf(n), 1); n.group = null; }
    Object.assign(n.h.anim, { sit: false, talk: 0, wave: false });
    n.state = 'flee'; n.t = secs; n.threat.copy(from); n.greetT = 0;
  }
  // the player throws a punch: the first person in front within reach goes down
  punch(pos, yaw) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let best = null, bd = 1.45;
    for (const n of this.list) {
      if (!n.h.root.visible || n.state === 'down' || n.state === 'getup') continue;
      const dx = n.pos.x - pos.x, dz = n.pos.z - pos.z, d = Math.hypot(dx, dz);
      if (d > bd || (dx * fx + dz * fz) / (d || 1) < 0.5) continue;
      best = n; bd = d;
    }
    if (!best) return null;
    best.hits++;
    const power = best.hits >= 2 ? 6.5 : 3.5;
    this.knock(best, fx * power * 0.55, fz * power * 0.55, power, pos);
    return best;
  }

  update(dt, focus, cars, player, camera) {
    const camDir = camera ? camera.getWorldDirection(_v).clone() : null;
    const eye = player ? _e.set(player.pos.x, player.pos.y + (player.human.eyeY || 1.6), player.pos.z) : null;
    const pSpeed = player ? Math.hypot(player.vel.x, player.vel.z) : 0;
    const world = this.world;
    for (const p of this.list) {
      let d = p.pos.distanceTo(focus);
      if (p.kind === 'walk' && d > this.range + 8) { this.placeWalker(p, focus, this.range * 0.45, this.range - 8, camDir); d = p.pos.distanceTo(focus); }
      const vis = d < this.range;
      p.h.root.visible = vis;
      if (!vis) continue;
      for (const m of p.small) m.visible = d < 22; // eyes, brows and lashes only matter up close
      const sh = this.shadows && d < 32; // only nearby people cast shadows
      if (sh !== p.shadow) { p.shadow = sh; for (const m of p.meshes) if (!m.userData.small) m.castShadow = sh; }
      const a = p.h.anim;
      a.speed = 0;
      // ---- cars: knocked flying, or run over while lying on the road
      for (const c of cars) {
        const rx = p.pos.x - c.pos.x, rz = p.pos.z - c.pos.z;
        if (rx * rx + rz * rz > (c.T.L / 2 + 1.5) ** 2) continue;
        const along = rx * c.fwd.x + rz * c.fwd.z, side = rx * c.fwd.z - rz * c.fwd.x;
        const hl = c.T.L / 2 + 0.3, hw = c.T.W / 2 + 0.3;
        if (Math.abs(along) > hl || Math.abs(side) > hw || p.pos.y > c.pos.y + 1.5) continue;
        const rvx = c.vel.x - p.vel.x, rvz = c.vel.z - p.vel.z, sp = Math.hypot(rvx, rvz);
        if (p.state === 'down') {
          if (sp > 2 && !(p.overT > 0)) { // wheels go over them: the car bumps, they stay down longer
            p.overT = 0.7; p.t += 1.5; c.heaveV += Math.min(2.2, sp * 0.18); c.pitchV -= 0.4;
            if (!a.limp) { a.limp = 1; a.limpSide = Math.random() < 0.5 ? 'L' : 'R'; }
            if (c.driver && c.driver !== 'ai') this.panic(p.pos, 18, c.pos, p);
          }
          continue;
        }
        if (sp > 3 && p.state !== 'getup') {
          const lx = c.fwd.z, lz = -c.fwd.x, push = Math.sign(side || 1) * sp * 0.25;
          this.knock(p, rvx * 0.8 + lx * push, rvz * 0.8 + lz * push, sp, c.pos);
          c.vel.multiplyScalar(0.93); c.impact = Math.max(c.impact, 1 + sp * 0.05);
          break;
        }
        // slow cars just nudge people out of the way
        if (hl - Math.abs(along) < hw - Math.abs(side)) { const k = (hl - Math.abs(along)) * Math.sign(along || 1); p.pos.x += c.fwd.x * k; p.pos.z += c.fwd.z * k; }
        else { const k = (hw - Math.abs(side)) * Math.sign(side || 1); p.pos.x += c.fwd.z * k; p.pos.z -= c.fwd.x * k; }
      }
      if (p.overT > 0) p.overT -= dt;
      // ---- state machine
      if (p.state === 'down') {
        p.vel.y -= 18 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const gy = world.groundHeight(p.pos.x, p.pos.z);
        if (p.pos.y <= gy) { p.pos.y = gy; p.vel.y = p.vel.y < -3 ? -p.vel.y * 0.25 : 0; const f = Math.exp(-5 * dt); p.vel.x *= f; p.vel.z *= f; }
        this.collide(p, 0.3);
        p.t -= dt;
        if (p.t <= 0 && p.pos.y - gy < 0.05) { p.state = 'getup'; p.t = 0; p.vel.set(0, 0, 0); }
        a.down = 1;
      } else if (p.state === 'getup') {
        p.t += dt;
        const u = p.t / 1.3;
        a.down = 0; p.tiltTo = 0;
        a.crouch = u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45);
        p.pos.y = world.groundHeight(p.pos.x, p.pos.z);
        if (u >= 1) { a.crouch = 0; this.flee(p, p.threat, 5 + Math.random() * 3); }
      } else if (p.state === 'flee') {
        p.t -= dt;
        let dx = p.pos.x - p.threat.x, dz = p.pos.z - p.threat.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        const speed = a.limp > 0.5 ? 1.4 : 4.6;
        p.yaw = wrap(p.yaw + wrap(Math.atan2(dx, dz) - p.yaw) * Math.min(1, dt * 6));
        p.pos.x += Math.sin(p.yaw) * speed * dt; p.pos.z += Math.cos(p.yaw) * speed * dt;
        p.pos.y = world.groundHeight(p.pos.x, p.pos.z);
        this.collide(p, 0.3);
        a.speed = speed; a.lookAt = null;
        if (p.t <= 0) this.rejoin(p);
      } else if (p.greetT > 0) {
        // stop, face the player and wave
        p.greetT -= dt;
        a.wave = p.greetT > 0.7;
        if (player && p.state !== 'sit') p.yaw += wrap(Math.atan2(player.pos.x - p.pos.x, player.pos.z - p.pos.z) - p.yaw) * Math.min(1, dt * 6);
      } else if (p.state === 'walk') {
        a.wave = false;
        const target = p.corners[p.idx];
        const tx = target.x - p.pos.x, tz = target.z - p.pos.z, tl = Math.hypot(tx, tz);
        if (tl < 0.4) p.idx = (p.idx + 1) % 4;
        if (p.dodge <= 0) {
          for (const c of cars) {
            const sp = Math.hypot(c.vel.x, c.vel.z);
            if (sp < 4) continue;
            const rx = p.pos.x - c.pos.x, rz = p.pos.z - c.pos.z;
            if (rx * rx + rz * rz < 36 && (rx * c.vel.x + rz * c.vel.z) > 0 && Math.random() < 0.6) {
              const sx = c.fwd.z, sz = -c.fwd.x, sg = Math.sign(rx * sx + rz * sz) || 1;
              p.dodgeDir.set(sx * sg, 0, sz * sg); p.dodge = 0.7; break;
            }
          }
        }
        let speed = p.speed * (a.limp > 0.5 ? 0.55 : 1), dx, dz;
        if (p.dodge > 0) { p.dodge -= dt; dx = p.dodgeDir.x; dz = p.dodgeDir.z; speed = 4.5; } else { dx = tx / (tl || 1); dz = tz / (tl || 1); }
        p.pos.x += dx * speed * dt; p.pos.z += dz * speed * dt;
        p.pos.y = world.groundHeight(p.pos.x, p.pos.z);
        p.yaw += wrap(Math.atan2(dx, dz) - p.yaw) * Math.min(1, dt * 8);
        a.speed = speed;
      } else a.wave = false;
      // ---- personal space: the player bumps into people (and sprinting into them knocks them over)
      if (player && p.state !== 'down') {
        const dx = p.pos.x - player.pos.x, dz = p.pos.z - player.pos.z, dd = Math.hypot(dx, dz);
        if (dd < 0.6 && dd > 0.001 && Math.abs(p.pos.y - player.pos.y) < 1) {
          const push = (0.6 - dd) / 2;
          if (p.state !== 'sit') { p.pos.x += (dx / dd) * push; p.pos.z += (dz / dd) * push; }
          player.pos.x -= (dx / dd) * push; player.pos.z -= (dz / dd) * push;
          if (pSpeed > 5.5 && p.state !== 'sit' && p.state !== 'getup') this.knock(p, (dx / dd) * 2.5, (dz / dd) * 2.5, 3, player.pos);
          else if (pSpeed > 1 && !(p.bumpT > 0)) { p.bumpT = 4; this.say(p, BUMP[Math.floor(Math.random() * BUMP.length)], 1.6); }
        }
      }
      if (p.bumpT > 0) p.bumpT -= dt;
      // ---- who to look at: the player's eyes when close, otherwise the people they're talking with
      if (p.state === 'down' || p.state === 'flee') { /* busy */ }
      else if (eye && d < 5) a.lookAt = eye;
      else if (p.group) {
        p.lookT -= dt;
        if (p.lookT <= 0 || !a.lookAt) {
          p.lookT = 2 + Math.random() * 4;
          const others = p.group.filter((o) => o !== p);
          a.lookAt = others.length ? this.headOf(others[Math.floor(Math.random() * others.length)]).clone() : null;
        }
      } else a.lookAt = null;
      // ---- body: falling over pivots about the feet
      p.tilt = damp(p.tilt, p.tiltTo, p.state === 'getup' ? 4.5 : 9, dt);
      p.h.root.position.set(p.pos.x, p.pos.y + 0.13 * Math.abs(Math.sin(p.tilt)), p.pos.z);
      p.h.root.rotation.set(p.tilt, p.yaw, 0);
      // animation level of detail: far away people animate at a lower rate
      p.lodAcc += dt;
      const every = d < 30 ? 1 : d < 70 ? 2 : 4;
      if (++p.lod % every === 0) { p.h.update(p.lodAcc); p.lodAcc = 0; }
    }
    // walkers keep a little distance from each other
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const A = L[i]; if (A.state !== 'walk' || !A.h.root.visible) continue;
      for (let j = i + 1; j < L.length; j++) {
        const B = L[j]; if (B.state !== 'walk') continue;
        const dx = A.pos.x - B.pos.x, dz = A.pos.z - B.pos.z, dd = dx * dx + dz * dz;
        if (dd < 0.36 && dd > 1e-6) { const l = Math.sqrt(dd), k = (0.6 - l) / 2 / l; A.pos.x += dx * k; A.pos.z += dz * k; B.pos.x -= dx * k; B.pos.z -= dz * k; }
      }
    }
  }
  // keep people out of walls, trees and benches
  collide(p, r) {
    for (const b of this.world.query(p.pos.x, p.pos.z, r + 0.5)) {
      if (p.pos.y > b.h - 0.3 || (b.minY !== undefined && p.pos.y + 1 < b.minY)) continue;
      const qx = Math.max(b.minX, Math.min(p.pos.x, b.maxX)), qz = Math.max(b.minZ, Math.min(p.pos.z, b.maxZ));
      const dx = p.pos.x - qx, dz = p.pos.z - qz, d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.pos.x += dx * k; p.pos.z += dz * k; p.vel.x *= 0.5; p.vel.z *= 0.5; }
    }
  }
}
