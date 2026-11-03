// Procedural animation for the MakeHuman default skeleton: walk/run gait cycles, idle breathing
// and weight shift, jumping, sitting (driving), head + eye tracking with saccades, and blinking.
import * as THREE from 'three';

const bump = (p, c, w) => { const d = Math.atan2(Math.sin(p - c), Math.cos(p - c)); return Math.exp(-((d / w) ** 2)); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();

export class MHAnimator {
  constructor(h) {
    this.h = h;
    const B = (n) => h.bones[n];
    this.b = {
      hips: B('root'), s5: B('spine05'), s4: B('spine04'), s3: B('spine03'), s2: B('spine02'), s1: B('spine01'),
      neck: B('neck01'), neck2: B('neck02'), head: B('head'), jaw: B('jaw'),
      eyeL: B('eye.L'), eyeR: B('eye.R'), lidL: B('orbicularis03.L'), lidR: B('orbicularis03.R'), lidLL: B('orbicularis04.L'), lidLR: B('orbicularis04.R'),
    };
    for (const s of ['L', 'R']) {
      Object.assign(this.b, {
        ['clav' + s]: B('clavicle.' + s), ['arm' + s]: B('upperarm01.' + s), ['fore' + s]: B('lowerarm01.' + s), ['hand' + s]: B('wrist.' + s),
        ['thigh' + s]: B('upperleg01.' + s), ['shin' + s]: B('lowerleg01.' + s), ['foot' + s]: B('foot.' + s),
      });
    }
    this.hipsRest = this.b.hips.position.clone();
    // the rig's bind pose has the arms raised in an A-pose: measure it so we can lower them
    this.armBind = {}; this.foreFix = {}; this.flexAxis = {};
    for (const [s, sd] of [['L', 1], ['R', -1]]) {
      const a = h.heads['upperarm01.' + s], e = h.heads['lowerarm01.' + s], w = h.heads['wrist.' + s];
      const up = e.clone().sub(a).normalize(), fo = w.clone().sub(e).normalize();
      this.armBind[s] = Math.atan2(sd * up.x, -up.y);
      // the bind pose has bent elbows: this rotation straightens the forearm along the upper arm
      this.foreFix[s] = new THREE.Quaternion().setFromUnitVectors(fo, up);
      // elbow flex axis (perpendicular to the arm, bends the forearm forward)
      const ax = up.clone().cross(new THREE.Vector3(0, 0, 1)).normalize();
      const test = up.clone().applyAxisAngle(ax, 0.3);
      this.flexAxis[s] = test.z > up.z ? ax : ax.negate();
    }
    this._q = new THREE.Quaternion();
    this.t = Math.random() * 100;
    this.phase = Math.random() * Math.PI * 2;
    this.walk = 0; this.run = 0; this.air = 0; this.sit = 0;
    this.blinkT = 1 + Math.random() * 3; this.blink = 0;
    this.sacT = 0; this.sac = new THREE.Vector2(); this.eye = new THREE.Vector2();
    this.idleLook = new THREE.Vector2(); this.idleLookT = 0; this.cy = 0; this.cp = 0;
  }

  update(dt, camera) {
    const h = this.h, a = h.anim, b = this.b;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const k = 1 / h.scale; // metres → rig units
    const speed = a.sit ? 0 : a.speed || 0;
    this.walk = damp(this.walk, Math.min(1, speed / 1.3), 8, dt);
    this.run = damp(this.run, Math.min(1, Math.max(0, (speed - 2.6) / 2.6)), 6, dt);
    this.air = damp(this.air, a.air ? 1 : 0, 10, dt);
    this.sit = damp(this.sit, a.sit ? 1 : 0, 8, dt);
    const stride = 1.3 + this.run * 1.3;
    if (speed > 0.05) this.phase += (Math.PI * 2 * speed / stride) * dt;
    const p = this.phase, t = this.t;
    const W = this.walk * (1 - this.air) * (1 - this.sit), R = this.run * W;
    const idle = (1 - this.walk) * (1 - this.sit) * (1 - this.air);
    const sitT = this.sit;
    const ws = Math.sin(t * 0.45) * idle; // idle weight shift
    const breathe = Math.sin(t * 1.55) * 0.5 + 0.5;

    // ---------------- legs (gait curves)
    const leg = (s, ph, relax) => {
      const thigh = -(0.42 + 0.3 * R) * Math.cos(ph) * W - 0.12 * R;
      const knee = (0.07 + 0.18 * bump(ph, 0.35, 0.45) + (0.95 + 0.75 * R) * bump(ph, 3.9, 0.95)) * W;
      const foot = (-0.16 * bump(ph, 0, 0.45) + (0.38 + 0.2 * R) * bump(ph, Math.PI * 0.95, 0.5) - 0.12 * bump(ph, 4.4, 0.6)) * W;
      const r = Math.max(0, relax) * 0.08;
      b['thigh' + s].rotation.set(thigh - r * 0.6 - sitT * 1.5 - this.air * 0.65, 0, (s === 'L' ? 1 : -1) * sitT * 0.08);
      b['shin' + s].rotation.set(knee + r + sitT * 1.45 + this.air * 1.0, 0, 0);
      b['foot' + s].rotation.set(foot - r * 0.3 - sitT * 0.15 + this.air * 0.25, 0, 0);
    };
    leg('L', p, ws); leg('R', p + Math.PI, -ws);

    // ---------------- pelvis & spine
    const bob = (-0.022 * Math.cos(2 * p) * (1 - R) + 0.035 * Math.abs(Math.sin(p)) * R - 0.025 * R) * W;
    b.hips.position.set(this.hipsRest.x + (0.012 * Math.sin(p) * W * (1 - R) + 0.01 * ws) * k,
      this.hipsRest.y + (bob - sitT * 0.42 - this.air * 0.05 - Math.abs(ws) * 0.006) * k,
      this.hipsRest.z - sitT * 0.05 * k);
    b.hips.rotation.set(0.03 * R + sitT * 0.05, -0.11 * Math.cos(p) * W, 0.035 * Math.sin(p) * W * (1 - R) + 0.02 * ws);
    const lean = (a.lean || 0) * 0.3;
    b.s5.rotation.set(0.02 * R + lean - sitT * 0.04, 0.03 * Math.cos(p) * W, -0.012 * ws - (a.turn || 0) * 0.04 * W);
    b.s4.rotation.set(0.02 * R, 0.03 * Math.cos(p) * W, 0);
    b.s3.rotation.set(0.04 * R + 0.008 * breathe * idle, 0.04 * Math.cos(p) * W, 0.01 * ws);
    b.s2.rotation.set(0.05 * R - 0.012 * breathe * idle, 0.04 * Math.cos(p) * W, 0);
    b.s1.rotation.set(0.04 * R - 0.008 * breathe * idle + 0.015 * W, 0.03 * Math.cos(p) * W, 0);

    // ---------------- arms (lower them from the bind A-pose, then swing; optional wave / talking gestures)
    this.waveAmt = damp(this.waveAmt || 0, a.wave ? 1 : 0, 7, dt);
    this.talkAmt = damp(this.talkAmt || 0, a.talk || 0, 3, dt);
    const seed = (this.seed ??= Math.random() * 10);
    const arm = (s, sd, ph) => {
      const swing = (0.32 + 0.45 * R) * Math.cos(ph) * W;
      const rest = 0.11 + 0.02 * breathe * idle + this.air * 0.4 + R * 0.06 - sitT * 0.02;
      b['clav' + s].rotation.set(0, 0, sd * (-0.02 * breathe * idle));
      let rx = -0.02 + swing - sitT * 0.85 - this.air * 0.35 + 0.03 * Math.sin(t * 0.9 + sd) * idle;
      let rz = -sd * (this.armBind[s] - rest);
      let flex = 0.22 + 0.22 * Math.max(0, -Math.cos(ph)) * W + 1.25 * R + sitT * 0.55 + this.air * 0.5;
      // talking: hands move while chatting
      const tk = this.talkAmt * Math.max(0, Math.sin(t * 1.9 + seed + sd * 1.7)) * (1 - sitT * 0.5);
      rx -= tk * 0.22; flex += tk * 0.75;
      // waving with the right hand
      const wv = s === 'R' ? this.waveAmt : 0;
      if (wv > 0.001) {
        rx += (-1.45 - rx) * wv;
        rz += (-sd * (this.armBind[s] - 0.5) - rz) * wv;
        flex += (1.45 + 0.4 * Math.sin(t * 11) - flex) * wv;
      }
      b['arm' + s].rotation.set(rx, sd * (0.05 + 0.08 * R), rz);
      b['fore' + s].quaternion.setFromAxisAngle(this.flexAxis[s], flex).multiply(this.foreFix[s]);
      b['hand' + s].rotation.set(-0.05 - 0.15 * R - tk * 0.3, 0, sd * (0.05 + 0.1 * R));
    };
    arm('L', 1, p + Math.PI); arm('R', -1, p);

    // ---------------- head & eyes
    let tgtYaw = 0, tgtPitch = 0, has = false;
    const target = a.lookAt || (camera && a.lookAtCamera ? camera.position : null);
    if (target) {
      b.head.updateWorldMatrix(true, false);
      _m.copy(b.head.matrixWorld).invert();
      _v.copy(target).applyMatrix4(_m);
      const yaw = Math.atan2(_v.x, _v.z), pitch = Math.atan2(_v.y - 0.8, Math.hypot(_v.x, _v.z));
      if (Math.abs(yaw) < 1.6) { tgtYaw = yaw; tgtPitch = -pitch; has = true; }
    }
    this.idleLookT -= dt;
    if (this.idleLookT <= 0) { this.idleLookT = 2 + Math.random() * 4; this.idleLook.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.25); }
    if (!has) { tgtYaw = this.idleLook.x * idle; tgtPitch = this.idleLook.y * idle; }
    const hy = THREE.MathUtils.clamp(tgtYaw * 0.65, -0.75, 0.75), hp = THREE.MathUtils.clamp(tgtPitch * 0.5, -0.35, 0.35);
    this.cy = damp(this.cy, hy, 5, dt); this.cp = damp(this.cp, hp, 5, dt);
    b.neck.rotation.set(this.cp * 0.4 - 0.05 * R, this.cy * 0.4, 0);
    b.head.rotation.set(this.cp * 0.6 + 0.04 * R - sitT * 0.04, this.cy * 0.6, 0);
    this.sacT -= dt;
    if (this.sacT <= 0) { this.sacT = 0.4 + Math.random() * 1.8; this.sac.set((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05); }
    const ey = THREE.MathUtils.clamp(tgtYaw - this.cy, -0.4, 0.4) + this.sac.x, ep = THREE.MathUtils.clamp(-(tgtPitch - this.cp), -0.3, 0.3) + this.sac.y;
    this.eye.x = damp(this.eye.x, ey, 18, dt); this.eye.y = damp(this.eye.y, ep, 18, dt);
    for (const e of [b.eyeL, b.eyeR]) if (e) e.rotation.set(-this.eye.y, this.eye.x, 0, 'YXZ');

    // ---------------- blinking (upper lids follow the gaze a little)
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkT = 2 + Math.random() * 4.5; this.blink = 1; }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 7);
    const bl = Math.sin(this.blink * Math.PI);
    const lid = 0.55 * bl + Math.max(0, -this.eye.y) * 0.4;
    for (const l of [b.lidL, b.lidR]) if (l) l.rotation.x = lid;
    for (const l of [b.lidLL, b.lidLR]) if (l) l.rotation.x = -0.12 * bl;
  }
}
