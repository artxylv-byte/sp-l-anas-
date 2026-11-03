// "Off-duty" life for the character you are not playing: they stay in their apartment and go
// about their day (sofa + TV, window, kitchen, desk / mirror) and greet you when you visit.
import * as THREE from 'three';

export class Resident {
  constructor(P, apt, { onGreet } = {}) {
    this.P = P; this.apt = apt; this.onGreet = onGreet;
    this.mode = 'act'; this.spot = null; this.next = null; this.t = 0; this.path = []; this.greeted = false;
    this.head = new THREE.Vector3();
  }

  place(spot) {
    const s = spot || this.apt.spots[Math.floor(Math.random() * this.apt.spots.length)];
    this.spot = s; this.mode = 'act'; this.t = 12 + Math.random() * 16; this.path = [];
    this.P.pos.copy(s.world); this.P.pos.y = this.apt.origin.y;
    this.P.yaw = s.yaw; this.P.vel.set(0, 0, 0);
  }

  update(dt, visitor) {
    const P = this.P, a = P.human.anim;
    if (this.mode === 'act') {
      a.sit = this.spot.pose === 'sit'; a.speed = 0; a.talk = this.spot.gesture ? 0.55 : 0; a.wave = false;
      a.lookAt = this.spot.lookW;
      this.t -= dt;
      if (this.t <= 0) {
        const others = this.apt.spots.filter((s) => s !== this.spot);
        this.next = others[Math.floor(Math.random() * others.length)];
        this.path = [...this.spot.pathW.slice().reverse(), this.apt.hub, ...this.next.pathW, this.next.world].map((v) => v.clone());
        this.mode = 'walk'; a.sit = false;
      }
    } else {
      a.sit = false; a.talk = 0;
      const tgt = this.path[0];
      const to = tgt.clone().sub(P.pos); to.y = 0;
      const dist = to.length();
      if (dist < 0.12) {
        this.path.shift();
        if (!this.path.length) { this.spot = this.next; P.pos.copy(this.spot.world); P.yaw = this.spot.yaw; this.mode = 'act'; this.t = 14 + Math.random() * 20; }
      } else {
        let dy = Math.atan2(to.x, to.z) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        P.yaw += dy * Math.min(1, dt * 7);
        P.pos.addScaledVector(to.normalize(), Math.min(dist, 1.15 * dt));
        a.speed = 1.15; a.lookAt = null;
      }
      P.vel.set(0, 0, 0);
    }
    P.pos.y = this.apt.origin.y;
    // a visitor in the apartment gets noticed and greeted – looking them in the eye, up or down
    // depending on who is taller (and whether one of them is sitting)
    if (visitor) {
      const d = visitor.pos.distanceTo(P.pos);
      if (d < 4.5) {
        a.lookAt = this.head.set(visitor.pos.x, visitor.pos.y + (visitor.human.eyeY || 1.6), visitor.pos.z);
        if (!this.greeted) { this.greeted = true; this.waveT = 2.2; if (this.onGreet) this.onGreet(); }
        // standing and chatting: turn to face the visitor
        if (d < 2.8 && this.mode === 'act' && this.spot.pose !== 'sit') {
          let dy = Math.atan2(visitor.pos.x - P.pos.x, visitor.pos.z - P.pos.z) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          P.yaw += dy * Math.min(1, dt * 4);
        }
      } else if (d > 7) this.greeted = false;
    }
    if (this.waveT > 0) { this.waveT -= dt; a.wave = this.waveT > 0.6 && this.mode === 'act'; }
  }
}
