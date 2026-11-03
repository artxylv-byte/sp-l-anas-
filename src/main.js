import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { Human, DEFAULTS, OPTIONS, PALETTES, randomAppearance, sanitize } from './character.js';
import { World, CURB, HALF, N, ROAD, BLOCK, CELL, EMB_X, RIVER_X, FAR_X, FAR_END, BRIDGES, TRAM_Z, roadLine, locationAt } from './world.js';
import { Car, Traffic, carFleet, stepCars } from './vehicles.js';
import { Population } from './npcs.js';
import { Props } from './props.js';
import { buildApartment } from './interiors.js';
import { Resident } from './residents.js';
import { Input } from './input.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ps_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ps_' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const euro = (v) => '€' + Math.round(v).toLocaleString('lv-LV');

// ------------------------------------------------------------------ renderer / quality
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const QUALITIES = ['low', 'high', 'ultra'];
let qualityName = store.get('quality', isTouch ? 'low' : 'high');
if (!QUALITIES.includes(qualityName)) qualityName = 'high';
const L3 = (lo, hi, ul) => (qualityName === 'low' ? lo : qualityName === 'high' ? hi : ul);
const Q = { name: qualityName, high: qualityName !== 'low', ultra: qualityName === 'ultra', shadows: true,
  peds: L3(9, 18, 24), pedVariants: L3(4, 7, 9), groups: L3(3, 6, 7), sitters: L3(3, 7, 9), cars: L3(12, 20, 24) };

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// dynamic resolution: the render scale drops when the frame rate does, and recovers when there's headroom
const dyn = { base: Math.min(devicePixelRatio, L3(1, 1.75, 2)), scale: 1, t: 0, frames: 0, cool: 3, fixed: /fixedres/.test(location.search) };
renderer.setPixelRatio(dyn.base);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = Q.high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.25, 5000);
const input = new Input(canvas);

// ------------------------------------------------------------------ appearances
const looks = {
  arturs: sanitize(store.get('look2_arturs', {}), DEFAULTS.arturs),
  paula: sanitize(store.get('look2_paula', {}), DEFAULTS.paula),
};
looks.arturs.name = 'Arturs'; looks.paula.name = 'Paula';
const saveLook = (who) => store.set('look2_' + who, looks[who]);

// ------------------------------------------------------------------ studio scene
const studio = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(32, 1, 0.05, 100), who: 'arturs', yaw: 0.35, target: new THREE.Vector3(0, 1.0, 0), dist: 4.6, wantDist: 4.6, wantY: 1.0, spin: false, from: 'title' };
{
  const s = studio.scene;
  const bgC = document.createElement('canvas'); bgC.width = 4; bgC.height = 256;
  const bx = bgC.getContext('2d'); const g = bx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1b1530'); g.addColorStop(0.55, '#3a2848'); g.addColorStop(0.8, '#7a3d5c'); g.addColorStop(1, '#2a1a2a');
  bx.fillStyle = g; bx.fillRect(0, 0, 4, 256);
  const bgT = new THREE.CanvasTexture(bgC); bgT.colorSpace = THREE.SRGBColorSpace;
  s.background = bgT;
  const flC = document.createElement('canvas'); flC.width = flC.height = 256;
  const fx = flC.getContext('2d'); const rg = fx.createRadialGradient(128, 128, 10, 128, 128, 128);
  rg.addColorStop(0, '#5a4a66'); rg.addColorStop(0.6, '#3a2c44'); rg.addColorStop(1, 'rgba(30,20,40,0)');
  fx.fillStyle = rg; fx.fillRect(0, 0, 256, 256);
  const fT = new THREE.CanvasTexture(flC); fT.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ map: fT, transparent: true, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.012, 8, 80), new THREE.MeshBasicMaterial({ color: '#ff4fa3' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; s.add(ring);
  s.add(new THREE.HemisphereLight('#c8d8ff', '#4a3040', 0.9));
  const key = new THREE.DirectionalLight('#fff1e0', 2.6); key.position.set(2.5, 4, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -0.5 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  s.add(key);
  const rim = new THREE.DirectionalLight('#ff7ac0', 2.2); rim.position.set(-3, 3, -3); s.add(rim);
  const rim2 = new THREE.DirectionalLight('#60d8ff', 1.4); rim2.position.set(3, 2, -3); s.add(rim2);
  const fill = new THREE.PointLight('#ffffff', 2.5, 8); fill.position.set(0, 1.6, 2.5); s.add(fill);
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.background = new THREE.Color('#665577');
  studio.scene.environment = pm.fromScene(envScene).texture; studio.scene.environmentIntensity = 0.35;
  studio.human = new Human(looks.arturs);
  s.add(studio.human.root);
}

// ------------------------------------------------------------------ game world
let world, traffic, peds, props, fleet, composer, bloom, gtao, grade;
const game = { started: false, paused: false, active: 'arturs', money: store.get('money', 0), cars: [], pickups: [], mission: null, camYaw: 0, camPitch: 0.25, lastLook: 0, toastT: 0, timeMode: 0, shake: 0, locT: 0, mmT: 0, lightT: 0, obstacles: [] };

const APT_STYLE = {
  arturs: { floor: '#8a6444', wall: '#e9e6e1', accent: '#2f3e52', door: '#2b2b2b', rug: '#2b2f36', rug2: '#7f8fa6', sofa: '#3b3f45', pillow: '#d22d3d',
    furniture: '#5a4030', cabinet: '#2c2f33', counter: '#e8e6e1', chair: '#1a1a1a', duvet: '#3a4a66', desk: true, seed: 11 },
  paula: { floor: '#b89470', wall: '#f3eee6', accent: '#a8b8a0', door: '#e9e1d4', rug: '#efe6d6', rug2: '#c9a27a', sofa: '#e6dccb', pillow: '#c98378',
    furniture: '#c8a27a', cabinet: '#f3efe8', counter: '#2b2b2b', chair: '#d8c3a5', duvet: '#f2c7cf', desk: false, seed: 23 },
};
const otherOf = (who) => (who === 'arturs' ? 'paula' : 'arturs');
const poss = (name) => (/s$/i.test(name) ? name + "'" : name + "'s"); // Arturs' / Paula's

// Arturs and Paula notice how tall the other one is (their customised heights)
function heightTalk(speaker, listener) {
  const d = looks[listener.who].height - looks[speaker.who].height, n = looks[listener.who].name;
  if (d >= 8) return [`${n}! Did you grow again? I have to look up at you 😄`, 'Stop growing, my neck hurts from looking up! 😄', `Hey, tall ${n}! 👋`];
  if (d <= -8) return [`Oh hi ${n}! Almost didn't see you down there 😄`, `Hey ${n}! Need me to reach the top shelf for you? 😄`];
  return [`Hey ${n}! Wait… are we exactly the same height? 😄`];
}
function sendHome(P) {
  if (P.car) exitCar(P);
  const home = game.homes[P.who];
  P.resident = new Resident(P, home.apt, {
    onGreet: () => {
      const visitor = game.players[game.active], opts = heightTalk(P, visitor);
      say(P, Math.random() < 0.6 ? opts[Math.floor(Math.random() * opts.length)] : `Sveiki, ${looks[visitor.who].name}! 👋`, 2.8);
    },
  });
  P.resident.place();
}

function fade(on) { $('fade').style.opacity = on ? 1 : 0; }
function teleport(P, pos, yaw) {
  if (game.switching) return;
  game.switching = true; fade(true);
  setTimeout(() => {
    P.pos.copy(pos); P.pos.y = world.groundHeight(pos.x, pos.z); P.vel.set(0, 0, 0); P.yaw = yaw; P.grounded = true;
    game.camYaw = yaw; game.camPitch = 0.22;
    updateCamera(0.016, true);
    fade(false); game.switching = false;
  }, 380);
}

// ---- speech bubbles above people's heads
const bubbles = [];
function say(ent, text, secs = 2.6) {
  for (const b of bubbles.filter((b) => b.ent === ent)) { b.el.remove(); bubbles.splice(bubbles.indexOf(b), 1); }
  const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text;
  $('bubbles').appendChild(el);
  bubbles.push({ el, ent, t: secs });
}
function updateBubbles(dt) {
  const v = new THREE.Vector3();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.t -= dt;
    if (b.t <= 0) { b.el.remove(); bubbles.splice(i, 1); continue; }
    const pos = b.ent.pos, hum = b.ent.h || b.ent.human, hgt = (b.ent.h ? b.ent.h.look.height : looks[b.ent.who].height) || 170;
    const low = hum.anim.sit ? 0.45 : hum.anim.down ? hgt / 100 - 0.25 : 0;
    v.set(pos.x, pos.y + hgt / 100 * 1.08 - low, pos.z).project(camera);
    const far = camera.position.distanceTo(pos) > 45 || (b.ent.h && !b.ent.h.root.visible);
    const vis = !far && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    b.el.style.display = vis ? 'block' : 'none';
    b.el.style.left = ((v.x + 1) / 2) * innerWidth + 'px'; b.el.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
    b.el.style.opacity = Math.min(1, b.t * 3);
  }
}

function makePlayer(who, pos) {
  const h = new Human(looks[who]);
  return { who, human: h, pos: pos.clone(), vel: new THREE.Vector3(), yaw: Math.PI, grounded: true, car: null, resident: null,
    tilt: 0, tiltTo: 0, downT: 0, getupT: 0, stepOff: 0, coyote: 0, jumpBuf: 0, punchCD: 0, punchHit: 0, lookT: 0, lookEnt: null, landT: 0, landAmt: 0, lean: 0, prevSpeed: 0 };
}
// eye position of anybody (players or pedestrians), lower when sitting
const _eye = new THREE.Vector3();
function eyeOf(ent) {
  if (ent.h) return peds.headOf(ent);
  return _eye.set(ent.pos.x, ent.pos.y + (ent.human.eyeY || 1.6) - (ent.human.anim.sit ? 0.45 : 0), ent.pos.z);
}

// colour grading + vignette, applied after tone mapping (sRGB)
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.3 }, uSat: { value: 1.08 }, uWarm: { value: 0 }, uContrast: { value: 1.04 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uSat, uWarm, uContrast; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = (c.rgb - 0.5) * uContrast + 0.5;
      c.rgb += vec3(0.025, 0.008, -0.02) * uWarm * l + vec3(-0.008, 0.0, 0.014) * (1.0 - l);
      vec2 d = vUv - 0.5; c.rgb *= 1.0 - uVig * dot(d, d) * 1.5;
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
    }`,
};
function setupComposer(scene) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }); // MSAA
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  if (Q.ultra) { gtao = new GTAOPass(scene, camera, size.x, size.y); gtao.blendIntensity = 0.85; composer.addPass(gtao); }
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.4, 0.97);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight);
}
function applyResolution() {
  const pr = dyn.base * dyn.scale;
  renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); }
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
function adaptResolution(raw) {
  if (dyn.fixed) return;
  dyn.t += raw; dyn.frames++;
  if (dyn.t < 1.2) return;
  const fps = dyn.frames / dyn.t; dyn.t = 0; dyn.frames = 0;
  if (dyn.cool > 0) { dyn.cool--; return; }
  let s = dyn.scale;
  if (fps < 45) s = Math.max(0.5, s - 0.12); else if (fps < 54) s = Math.max(0.5, s - 0.06); else if (fps > 58.5) s = Math.min(1, s + 0.04);
  if (Math.abs(s - dyn.scale) > 0.001) { dyn.scale = s; applyResolution(); dyn.cool = 1; }
}

function buildGame() {
  const scene = (game.scene = new THREE.Scene());
  world = new World(scene, renderer, Q);
  const sp = world.places.spawn;
  game.players = { arturs: makePlayer('arturs', sp), paula: makePlayer('paula', sp) };
  for (const p of Object.values(game.players)) scene.add(p.human.root);
  game.players.arturs.yaw = game.players.paula.yaw = world.places.spawnYaw; // looking west along Brīvības iela
  // each character has their own apartment (rooms live away from the city; the street doors lead inside)
  game.homes = {
    arturs: { apt: buildApartment(scene, new THREE.Vector3(1800, 0, -1800), APT_STYLE.arturs), door: world.places.homeArturs },
    paula: { apt: buildApartment(scene, new THREE.Vector3(1800, 0, -1740), APT_STYLE.paula), door: world.places.homePaula },
  };
  for (const hm of Object.values(game.homes)) world.addInterior(hm.apt);
  // a small pool of point lights: the room lamps indoors, the nearest street lanterns outdoors at night
  game.lights = Array.from({ length: Q.high ? 3 : 2 }, () => { const l = new THREE.PointLight('#ffd9a8', 0, 18, 1.5); scene.add(l); return l; });
  game.headlight = new THREE.SpotLight('#fff3dc', 0, 75, 0.55, 0.5, 1.3);
  scene.add(game.headlight, game.headlight.target);
  sendHome(game.players.paula); // the character you are not playing is at home
  // cars parked along Brīvības iela outside home
  const parked = [['sports', '#9e3039'], ['suv', '#141414'], ['sedan', '#2e86de'], ['hatch', '#f1f1f1']];
  parked.forEach(([t, c], k) => game.cars.push(new Car(scene, t, c, new THREE.Vector3(sp.x - 34 + k * 7.5, 0, roadLine(4) + ROAD / 2 - 1.6), Math.PI / 2)));
  traffic = new Traffic(scene, world, Q.cars, world.tramLines);
  game.cars.push(...traffic.cars);
  fleet = carFleet(scene);
  peds = new Population(scene, world, { walkers: Q.peds, variants: Q.pedVariants, groups: Q.groups, sitters: Q.sitters, shadows: Q.high, focus: sp, say, range: L3(60, 85, 100) });
  props = new Props(scene, world, sp);
  // cash pickups (euro notes)
  const cashM = new THREE.MeshStandardMaterial({ color: '#4fd06b', emissive: '#2fa04b', emissiveIntensity: 0.6, roughness: 0.4 });
  for (let k = 0; k < 30; k++) {
    const m = new THREE.Group();
    m.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.08), cashM));
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20), new THREE.MeshBasicMaterial({ color: '#7cff6b', transparent: true, opacity: 0.35 }));
    glow.position.y = -0.55; m.add(glow);
    scene.add(m);
    const pk = { m, active: true, t: 0 };
    placePickup(pk);
    game.pickups.push(pk);
  }
  game.beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  game.beacon.visible = false; scene.add(game.beacon);
  if (Q.high) setupComposer(scene);
  drawStaticMap();
  game.camYaw = world.places.spawnYaw;
}

function placePickup(pk) {
  const b = world.blocks[Math.floor(Math.random() * world.blocks.length)];
  const side = Math.floor(Math.random() * 4), t = Math.random();
  const x = side < 2 ? b.x0 + 1.5 + t * (BLOCK - 3) : side === 2 ? b.x0 + 1.5 : b.x1 - 1.5;
  const z = side >= 2 ? b.z0 + 1.5 + t * (BLOCK - 3) : side === 0 ? b.z0 + 1.5 : b.z1 - 1.5;
  pk.m.position.set(x, CURB + 0.8, z); pk.m.visible = true; pk.active = true;
}

// ------------------------------------------------------------------ minimap
const mm = $('minimap'), mmx = mm.getContext('2d');
let staticMap; const MAP_PX = 1.2, MAP_X0 = -HALF - 60, MAP_Z0 = -HALF - 60, MAP_W = FAR_END + 40 - MAP_X0, MAP_H = 2 * HALF + 120;
function drawStaticMap() {
  staticMap = document.createElement('canvas'); staticMap.width = Math.ceil(MAP_W * MAP_PX); staticMap.height = Math.ceil(MAP_H * MAP_PX);
  const x = staticMap.getContext('2d');
  const PX = (v) => (v - MAP_X0) * MAP_PX, PZ = (v) => (v - MAP_Z0) * MAP_PX, S = (v) => v * MAP_PX;
  x.fillStyle = '#4c6b3a'; x.fillRect(0, 0, staticMap.width, staticMap.height);
  x.fillStyle = '#a59f94'; x.fillRect(PX(EMB_X), 0, S(RIVER_X - EMB_X), staticMap.height); x.fillRect(PX(FAR_X), 0, S(22), staticMap.height);
  x.fillStyle = '#2a6f8f'; x.fillRect(PX(RIVER_X), 0, S(FAR_X - RIVER_X), staticMap.height);
  x.fillStyle = '#2b2e35';
  for (const b of BRIDGES) x.fillRect(PX(RIVER_X - 2), PZ(b.z - b.w), S(FAR_X - RIVER_X + 4), S(b.w * 2));
  x.fillRect(PX(FAR_X + 22), 0, S(14), staticMap.height);
  for (let i = 0; i <= N; i++) { const r = roadLine(i); x.fillRect(PX(r - ROAD / 2), PZ(-HALF - ROAD / 2), S(ROAD), S(N * CELL + ROAD)); x.fillRect(PX(-HALF - ROAD / 2), PZ(r - ROAD / 2), S(N * CELL + ROAD), S(ROAD)); }
  for (const b of world.blocks) { x.fillStyle = b.park ? '#5f9a46' : b.i >= 6 ? '#9a8f86' : '#8b8f99'; x.fillRect(PX(b.x0), PZ(b.z0), S(b.x1 - b.x0), S(b.z1 - b.z0)); }
  x.fillStyle = '#b7ad9f'; const p = world.plaza; x.fillRect(PX(p.x0), PZ(p.z0), S(p.x1 - p.x0), S(p.z1 - p.z0));
  x.strokeStyle = '#2a6f8f'; x.lineWidth = S(8.8);
  for (const b of world.blocks) if (b.canal) { x.beginPath(); for (let z = b.z0 + 3.2; z <= b.z1 - 3.2; z += 2) { const cx = world.canalX(b, z); z === b.z0 + 3.2 ? x.moveTo(PX(cx), PZ(z)) : x.lineTo(PX(cx), PZ(z)); } x.stroke(); }
  x.strokeStyle = 'rgba(200,16,46,0.7)'; x.lineWidth = S(1.4); x.beginPath(); x.moveTo(PX(-HALF), PZ(TRAM_Z)); x.lineTo(PX(HALF), PZ(TRAM_Z)); x.stroke();
  x.fillStyle = '#c3c6cf';
  for (const c of world.colliders) if (!c.small && c.minX < FAR_END && c.minY === undefined) x.fillRect(PX(c.minX), PZ(c.minZ), S(c.maxX - c.minX), S(c.maxZ - c.minZ));
}
function drawMinimap(focus, heading) {
  const S = mm.width, R = 110; // metres visible radius
  const inside = world.interiorAt(focus.x, focus.z);
  if (inside) {
    mmx.save(); mmx.clearRect(0, 0, S, S);
    mmx.beginPath(); mmx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); mmx.clip();
    mmx.fillStyle = '#2b2530'; mmx.fillRect(0, 0, S, S);
    const who = Object.keys(game.homes).find((w) => game.homes[w].apt.bounds === inside);
    mmx.fillStyle = '#fff'; mmx.font = 'bold 34px Segoe UI, Arial'; mmx.textAlign = 'center';
    mmx.fillText('HOME', S / 2, S / 2 - 6);
    mmx.font = '26px Segoe UI, Arial'; mmx.fillStyle = who === 'arturs' ? '#4da3ff' : '#ff7ac0';
    mmx.fillText(poss(looks[who].name) + ' apartment', S / 2, S / 2 + 30);
    mmx.restore();
    return;
  }
  const k = S / 2 / R;
  mmx.save();
  mmx.clearRect(0, 0, S, S);
  mmx.beginPath(); mmx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); mmx.clip();
  mmx.fillStyle = '#4c6b3a'; mmx.fillRect(0, 0, S, S);
  mmx.translate(S / 2, S / 2);
  mmx.rotate(heading + Math.PI);
  mmx.scale(-k / MAP_PX, k / MAP_PX);
  mmx.translate(-(focus.x - MAP_X0) * MAP_PX, -(focus.z - MAP_Z0) * MAP_PX);
  mmx.drawImage(staticMap, 0, 0);
  const dot = (p, col, r) => { mmx.fillStyle = col; mmx.beginPath(); mmx.arc((p.x - MAP_X0) * MAP_PX, (p.z - MAP_Z0) * MAP_PX, r * MAP_PX / k, 0, Math.PI * 2); mmx.fill(); };
  for (const pk of game.pickups) if (pk.active) dot(pk.m.position, '#7cff6b', 3);
  dot(world.places.store.pos, '#ff4fa3', 7); dot(world.places.jobs.pos, '#ffd23f', 7);
  dot(world.places.homeArturs.pos, '#4da3ff', 7); dot(world.places.homePaula.pos, '#ff7ac0', 7);
  if (game.mission) dot(game.mission.dest, '#ffd23f', 9);
  mmx.restore();
  // player arrow
  mmx.save(); mmx.translate(S / 2, S / 2);
  const P = game.players[game.active];
  const yaw = P.car ? P.car.yaw : P.yaw;
  mmx.rotate(-(yaw - heading));
  mmx.fillStyle = '#fff'; mmx.strokeStyle = '#000'; mmx.lineWidth = 3;
  mmx.beginPath(); mmx.moveTo(0, -14); mmx.lineTo(10, 12); mmx.lineTo(0, 6); mmx.lineTo(-10, 12); mmx.closePath(); mmx.stroke(); mmx.fill();
  mmx.restore();
  if (game.mission) {
    const d = game.mission.dest.clone().sub(focus);
    if (d.length() > R) {
      const ang = Math.atan2(d.x, d.z) - heading;
      mmx.fillStyle = '#ffd23f';
      mmx.beginPath(); mmx.arc(S / 2 - Math.sin(ang) * (S / 2 - 14), S / 2 - Math.cos(ang) * (S / 2 - 14), 9, 0, Math.PI * 2); mmx.fill();
    }
  }
}

// ------------------------------------------------------------------ helpers
function toast(msg, t = 2.2) { const el = $('toast'); el.innerHTML = msg; el.style.opacity = 1; game.toastT = t; }
function setPrompt(html) { const el = $('prompt'); if (!html) el.classList.add('hidden'); else { el.innerHTML = html; el.classList.remove('hidden'); } }
function addMoney(v) { game.money += v; store.set('money', game.money); }
const key = (k) => (input.isTouch ? '' : `<kbd>${k}</kbd>`);

function collidePerson(pos, r = 0.35) {
  for (const b of world.query(pos.x, pos.z, r + 0.6)) {
    if (pos.y > b.h - 0.3) continue;
    if (b.minY !== undefined && pos.y + 1.0 < b.minY) continue; // ceilings
    const qx = Math.max(b.minX, Math.min(pos.x, b.maxX)), qz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - qx, dz = pos.z - qz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-6) { pos.x = b.minX - r; continue; }
      const d = Math.sqrt(d2), push = r - d; pos.x += (dx / d) * push; pos.z += (dz / d) * push;
    }
  }
  for (const c of game.cars) {
    const rx = pos.x - c.pos.x, rz = pos.z - c.pos.z;
    if (rx * rx + rz * rz > (c.T.L / 2 + 1.5) ** 2 || pos.y > c.pos.y + 2.4) continue;
    const f = c.fwd, along = rx * f.x + rz * f.z, side = rx * f.z - rz * f.x;
    const hl = c.T.L / 2 + r, hw = c.T.W / 2 + r;
    if (Math.abs(along) < hl && Math.abs(side) < hw) {
      const px = hl - Math.abs(along), pz = hw - Math.abs(side);
      if (px < pz) { pos.x += f.x * Math.sign(along) * px; pos.z += f.z * Math.sign(along) * px; }
      else { pos.x += f.z * Math.sign(side) * pz; pos.z -= f.x * Math.sign(side) * pz; }
    }
  }
}

function rayBoxes(o, d, maxT) {
  let best = maxT;
  for (const b of world.query(o.x + d.x * maxT / 2, o.z + d.z * maxT / 2, maxT / 2 + 1)) {
    if (b.small) continue;
    let t0 = 0, t1 = best;
    for (const [oo, dd, mn, mx] of [[o.x, d.x, b.minX, b.maxX], [o.y, d.y, b.minY || 0, b.h], [o.z, d.z, b.minZ, b.maxZ]]) {
      if (Math.abs(dd) < 1e-6) { if (oo < mn || oo > mx) { t0 = 1; t1 = 0; break; } continue; }
      let a = (mn - oo) / dd, c = (mx - oo) / dd; if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) break;
    }
    if (t0 <= t1 && t0 < best) best = t0;
  }
  return best;
}

// ------------------------------------------------------------------ gameplay update
function enterCar(P, car) {
  if (car.driver === 'ai' && car.ai) car.ai = null;
  car.driver = P.who; P.car = car; car.sleeping = false;
  car.body.add(P.human.root);
  P.human.root.position.set(car.T.W / 2 - 0.62, car.T.ground - 0.08, -car.T.L * 0.06);
  P.human.root.rotation.set(0, 0, 0);
  P.human.anim.sit = true; P.human.anim.lookAt = null;
  toast('');
}
function exitCar(P) {
  const car = P.car; if (!car) return;
  car.driver = null; Object.assign(car.ctrl, { throttle: 0, brake: 0, steer: 0, handbrake: false }); car.speed *= 0.3;
  P.car = null; P.human.anim.sit = false;
  game.scene.add(P.human.root);
  const f = car.fwd;
  P.pos.set(car.pos.x + f.z * (car.T.W / 2 + 0.7), 0, car.pos.z - f.x * (car.T.W / 2 + 0.7)); P.pos.y = world.groundHeight(P.pos.x, P.pos.z);
  P.yaw = car.yaw; P.vel.set(0, 0, 0);
  collidePerson(P.pos);
}

function switchCharacter() {
  if (game.switching) return;
  game.switching = true; fade(true);
  setTimeout(() => {
    sendHome(game.players[game.active]);
    game.active = otherOf(game.active);
    const P = game.players[game.active];
    const R = P.resident;
    // if they were sitting, stand up in front of the seat
    if (R && R.mode === 'act' && R.spot.pose === 'sit' && R.spot.pathW.length) P.pos.copy(R.spot.pathW[R.spot.pathW.length - 1]);
    P.resident = null;
    Object.assign(P.human.anim, { sit: false, wave: false, talk: 0, lookAt: null, speed: 0, down: 0, crouch: 0 });
    P.vel.set(0, 0, 0); P.grounded = true; P.downT = P.getupT = 0; P.tilt = P.tiltTo = 0;
    game.camYaw = P.yaw; game.camPitch = 0.22;
    $('hName').textContent = looks[game.active].name.toUpperCase();
    updateCamera(0.016, true);
    toast(looks[game.active].name, 1.4);
    fade(false); game.switching = false;
  }, 380);
}

function startMission() {
  const P = game.players[game.active];
  const here = P.car ? P.car.pos : P.pos;
  let dest, tries = 0;
  do {
    const i = Math.floor(Math.random() * (N + 1)), j = Math.floor(Math.random() * N);
    dest = new THREE.Vector3(roadLine(i) + (Math.random() < 0.5 ? 1 : -1) * (ROAD / 2 + 1.5), CURB, roadLine(j) + CELL / 2);
  } while (dest.distanceTo(here) < 220 && ++tries < 50);
  const dist = dest.distanceTo(here);
  const loc = locationAt(dest.x, dest.z);
  game.mission = { dest, where: loc.street || loc.district, time: Math.round(dist / 9 + 30), reward: Math.round(dist * 1.5 / 10) * 10 + 200 };
  game.beacon.position.set(dest.x, 30, dest.z); game.beacon.visible = true;
  toast('DELIVERY JOB', 1.6);
}

// knocked over by a car (players get back up, nobody gets badly hurt)
function knockPlayer(P, vx, vz, power) {
  const thrown = Math.atan2(vx, vz), rel = wrapA(thrown - P.yaw);
  if (Math.abs(rel) < Math.PI / 2) { P.yaw = thrown; P.tiltTo = Math.PI / 2; } else { P.yaw = thrown + Math.PI; P.tiltTo = -Math.PI / 2; }
  P.vel.set(vx, Math.min(5, 0.6 + power * 0.2), vz); P.grounded = false;
  P.downT = 1.8 + Math.min(2, power * 0.1); P.getupT = 0;
  Object.assign(P.human.anim, { down: 1, crouch: 0, speed: 0, lookAt: null });
  game.shake = Math.max(game.shake, 0.6);
  say(P, ['Ai!', 'Au!', 'Ouch!'][Math.floor(Math.random() * 3)], 1.6);
}
function checkPlayerHit(P) {
  if (P.car || P.downT > 0 || P.getupT > 0 || P.resident) return;
  for (const c of game.cars) {
    const rx = P.pos.x - c.pos.x, rz = P.pos.z - c.pos.z;
    if (rx * rx + rz * rz > (c.T.L / 2 + 1.2) ** 2 || P.pos.y > c.pos.y + 1.6) continue;
    const along = rx * c.fwd.x + rz * c.fwd.z, side = rx * c.fwd.z - rz * c.fwd.x;
    if (Math.abs(along) > c.T.L / 2 + 0.45 || Math.abs(side) > c.T.W / 2 + 0.45) continue;
    const rvx = c.vel.x - P.vel.x, rvz = c.vel.z - P.vel.z, sp = Math.hypot(rvx, rvz);
    if (sp < 4.5) continue;
    knockPlayer(P, rvx * 0.7, rvz * 0.7, sp);
    c.vel.multiplyScalar(0.92);
    return;
  }
}
// throw a punch: a little aim assist turns you towards the closest person in front
function startPunch(P) {
  P.punchCD = 0.55; P.human.anim.punchT = 0.42; P.punchHit = 0.15;
  let best = null, bd = 2.3;
  for (const n of peds.list) {
    if (!n.h.root.visible || n.state === 'down' || n.state === 'getup') continue;
    const dx = n.pos.x - P.pos.x, dz = n.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < bd && Math.abs(wrapA(Math.atan2(dx, dz) - P.yaw)) < 1.2) { bd = d; best = n; }
  }
  if (best) P.yaw = Math.atan2(best.pos.x - P.pos.x, best.pos.z - P.pos.z);
}
function landPunch(P) {
  const n = peds.punch(P.pos, P.yaw);
  if (n) { game.shake = Math.max(game.shake, 0.2); P.lookEnt = null; return; }
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  for (const p of props.list) { // punch a cone or a box across the street
    const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < 1.3 && (dx * fx + dz * fz) / (d || 1) > 0.5 && p.K.light) { props.hitBy(p, fx * 4, fz * 4, 3); break; }
  }
}

function updatePlayer(dt) {
  const P = game.players[game.active];
  const look = input.consumeLook();
  if (look.x || look.y) game.lastLook = performance.now();
  const sens = input.isTouch ? 0.0042 : 0.0026;
  game.camYaw -= look.x * sens;
  game.camPitch = THREE.MathUtils.clamp(game.camPitch + look.y * sens, -0.35, 1.2);
  const mv = input.move();
  const tb = input.touchBtns;

  if (input.hit('Tab', 'KeyQ', 'btn:switch')) switchCharacter();
  if (input.hit('Escape', 'KeyP', 'btn:pause')) { pauseGame(true); return; }

  if (P.car) {
    const car = P.car;
    car.drive(dt, { throttle: Math.max(0, mv.y), brake: Math.max(0, -mv.y) + (tb.brake ? 1 : 0), steer: -mv.x, handbrake: input.down('Space') || tb.jump });
    if (input.hit('KeyF', 'btn:car') && Math.abs(car.speed) < 8) exitCar(P);
    setPrompt(null);
    return;
  }
  // knocked down: lie there for a moment, then get back up
  if (P.downT > 0) {
    P.vel.y -= 18 * dt; P.pos.addScaledVector(P.vel, dt); collidePerson(P.pos);
    const gh = world.groundHeight(P.pos.x, P.pos.z);
    if (P.pos.y <= gh) { P.pos.y = gh; P.vel.y = 0; const f = Math.exp(-5 * dt); P.vel.x *= f; P.vel.z *= f; P.downT -= dt; }
    if (P.downT <= 0) { P.getupT = 1.3; P.human.anim.down = 0; P.tiltTo = 0; P.vel.set(0, 0, 0); }
    setPrompt(null); return;
  }
  if (P.getupT > 0) {
    P.getupT -= dt; const u = 1 - P.getupT / 1.3;
    P.human.anim.crouch = P.getupT <= 0 ? 0 : u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45);
    setPrompt(null); return;
  }
  // on foot
  const fwd = new THREE.Vector3(Math.sin(game.camYaw), 0, Math.cos(game.camYaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const dir = fwd.multiplyScalar(mv.y).addScaledVector(right, mv.x);
  const mag = Math.min(1, dir.length());
  const sprint = input.down('ShiftLeft', 'ShiftRight') || tb.sprint || (input.isTouch && mag > 0.95);
  const speed = mag * (sprint ? 6.2 : 2.4) * (P.punchHit > 0 || P.human.anim.punchT > 0.2 ? 0.3 : 1);
  const yaw0 = P.yaw;
  if (mag > 0.05) {
    dir.normalize();
    P.yaw += wrapA(Math.atan2(dir.x, dir.z) - P.yaw) * Math.min(1, dt * 10);
  }
  const k = Math.min(1, dt * (P.grounded ? 10 : 2));
  P.vel.x += (dir.x * speed - P.vel.x) * k;
  P.vel.z += (dir.z * speed - P.vel.z) * k;
  // jumping: a little forgiveness before landing (buffer) and after leaving a ledge (coyote time);
  // let go of jump early for a shorter hop
  P.coyote = P.grounded ? 0.12 : Math.max(0, P.coyote - dt);
  P.jumpBuf = input.hit('Space', 'btn:jump') ? 0.15 : Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && P.coyote > 0) { P.vel.y = 5.6; P.grounded = false; P.coyote = 0; P.jumpBuf = 0; P.jumping = true; }
  const holding = input.down('Space') || tb.jump;
  P.vel.y -= (P.jumping && P.vel.y > 0 && !holding ? 36 : 18) * dt;
  const wasGrounded = P.grounded, prevY = P.pos.y;
  P.pos.addScaledVector(P.vel, dt);
  collidePerson(P.pos);
  const gh = world.groundHeight(P.pos.x, P.pos.z), vy = P.vel.y;
  if (P.pos.y <= gh + 0.02 || (P.grounded && P.pos.y - gh < 0.3)) { P.pos.y = gh; P.vel.y = Math.max(0, P.vel.y); P.grounded = P.vel.y <= 0.01; }
  else P.grounded = false;
  if (P.grounded) P.jumping = false;
  if (!wasGrounded && P.grounded && vy < -3) { P.landT = 0.22; P.landAmt = Math.min(0.55, -vy * 0.06); } // landing crouch
  if (wasGrounded && P.grounded) { const dy = P.pos.y - prevY; if (Math.abs(dy) > 0.02 && Math.abs(dy) < 0.45) P.stepOff -= dy; } // smooth kerb steps
  if (P.landT > 0) { P.landT -= dt; P.human.anim.crouch = P.landAmt * Math.max(0, P.landT / 0.22); } else P.human.anim.crouch = 0;
  // body language: lean into acceleration and turns
  const hs = Math.hypot(P.vel.x, P.vel.z);
  P.lean = damp(P.lean, THREE.MathUtils.clamp((hs - P.prevSpeed) / Math.max(dt, 1e-3) * 0.05, -0.25, 0.45), 6, dt);
  P.prevSpeed = hs; P.human.anim.lean = P.lean; P.human.anim.turn = THREE.MathUtils.clamp(wrapA(P.yaw - yaw0) / Math.max(dt, 1e-3), -3, 3);
  // fists
  P.punchCD = Math.max(0, P.punchCD - dt);
  if (P.punchCD <= 0 && input.hit('KeyR', 'mouse:left', 'btn:punch')) startPunch(P);
  if (P.punchHit > 0) { P.punchHit -= dt; if (P.punchHit <= 0) landPunch(P); }

  // interactions
  let prompt = null;
  let nearCar = null, nd = 4.8;
  for (const c of game.cars) { if (c.T.tram) continue; const d = c.pos.distanceTo(P.pos); if (d < nd && !Object.values(game.players).some((o) => o.car === c)) { nd = d; nearCar = c; } }
  if (nearCar) { prompt = `${key('F')} Get in car`; if (input.hit('KeyF', 'btn:car')) { enterCar(P, nearCar); setPrompt(null); return; } }
  const near = (p) => p.pos.distanceTo(P.pos) < 2.0;
  const use = () => input.hit('KeyE', 'btn:interact');
  if (near(world.places.store)) { prompt = `${key('E')} Change clothes at STILS`; if (use()) { openStudio('game'); return; } }
  if (near(world.places.jobs)) {
    prompt = game.mission ? 'Job already active' : `${key('E')} Take a delivery job`;
    if (!game.mission && use()) startMission();
  }
  for (const [who, hm] of Object.entries(game.homes)) {
    if (hm.door.pos.distanceTo(P.pos) < 1.8) {
      prompt = `${key('E')} ${who === P.who ? 'Go home' : `Visit ${poss(looks[who].name)} apartment`}`;
      if (use()) { teleport(P, hm.apt.entry, Math.PI); setPrompt(null); return; }
    }
  }
  const inside = world.interiorAt(P.pos.x, P.pos.z);
  if (inside) {
    const hm = Object.values(game.homes).find((h) => h.apt.bounds === inside);
    if (hm.apt.exit.distanceTo(P.pos) < 1.3) { prompt = `${key('E')} Go outside`; if (use()) { teleport(P, hm.door.pos, hm.door.yaw); setPrompt(null); return; } }
    else if (hm.apt.wardrobe.distanceTo(P.pos) < 1.5) { prompt = `${key('E')} Open the wardrobe`; if (use()) { openStudio('game'); return; } }
  }
  // talk to the other character, or say hi to people in the street
  const other = game.players[otherOf(P.who)];
  if (!prompt && other.resident && other.pos.distanceTo(P.pos) < 2.6) {
    prompt = `${key('E')} Talk to ${looks[other.who].name}`;
    if (use()) {
      other.resident.waveT = 2.2;
      const lines = [...heightTalk(other, P), `Hey ${looks[P.who].name}! What's up?`, 'Want to hang out later?', 'I was just chilling here 😄', 'Nice outfit today!', 'Grab something from the fridge if you want!'];
      say(other, lines[Math.floor(Math.random() * lines.length)], 3);
      P.lookEnt = other; P.lookT = 3.5;
    }
  }
  if (!prompt && !inside) {
    const n = peds.nearest(P.pos, 2.4);
    if (n) { prompt = `${key('E')} Say hi`; if (use()) { say(P, Math.random() < 0.5 ? 'Sveiki!' : 'Hi!', 1.4); say(n, peds.greet(n, P), 2.8); P.lookEnt = n; P.lookT = 3; } }
  }
  setPrompt(prompt);
}

function updateCharacters(dt) {
  const active = game.players[game.active];
  for (const P of Object.values(game.players)) {
    const h = P.human;
    if (P.car) { h.anim.speed = 0; h.anim.sit = true; h.update(dt); continue; }
    if (P.resident) P.resident.update(dt, active.car ? null : active);
    else {
      h.anim.speed = P.downT > 0 || P.getupT > 0 ? 0 : Math.hypot(P.vel.x, P.vel.z); h.anim.air = !P.grounded;
      // look people in the eye: whoever you're talking to, or someone close in front of you
      if (P.lookT > 0) P.lookT -= dt; else P.lookEnt = null;
      let tgt = null;
      if (P.downT <= 0 && P.getupT <= 0) {
        if (P.lookEnt) tgt = eyeOf(P.lookEnt);
        else {
          const other = game.players[otherOf(P.who)];
          const n = peds.nearest(P.pos, 3.2);
          const inFront = (e) => Math.abs(wrapA(Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z) - P.yaw)) < 1.3;
          if (other.resident && other.pos.distanceTo(P.pos) < 3.5 && inFront(other)) tgt = eyeOf(other);
          else if (n && inFront(n)) tgt = eyeOf(n);
        }
      }
      h.anim.lookAt = tgt ? (P.lookVec ||= new THREE.Vector3()).copy(tgt) : null;
    }
    P.stepOff = damp(P.stepOff, 0, 12, dt);
    P.tilt = damp(P.tilt, P.tiltTo, P.getupT > 0 ? 4.5 : 9, dt);
    h.root.position.set(P.pos.x, P.pos.y + P.stepOff + 0.13 * Math.abs(Math.sin(P.tilt)), P.pos.z);
    h.root.rotation.set(P.tilt, P.yaw, 0);
    h.update(dt);
  }
}

const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
function updateCamera(dt, snap = false) {
  const P = game.players[game.active];
  const inCar = !!P.car;
  const lying = P.downT > 0 || P.getupT > 0;
  const fh = lying ? 0.7 : 1.55 * (looks[P.who].height / 177);
  const focus = inCar ? P.car.pos.clone().add(new THREE.Vector3(0, 1.4, 0)) : P.pos.clone().add(new THREE.Vector3(0, fh, 0));
  if (inCar && performance.now() - game.lastLook > 1500 && Math.abs(P.car.speed) > 2) {
    // follow the direction of travel (so the camera swings round nicely in a drift)
    const v = P.car.vel, head = P.car.speed >= 0 ? Math.atan2(v.x, v.z) : P.car.yaw;
    const want = Math.abs(wrapA(head - P.car.yaw)) < 1.2 ? head : P.car.yaw;
    game.camYaw += wrapA(want - game.camYaw) * Math.min(1, dt * 2.5);
    game.camPitch += (0.18 - game.camPitch) * Math.min(1, dt * 2);
  }
  const indoor = !inCar && world.interiorAt(P.pos.x, P.pos.z);
  if (indoor) game.camPitch = Math.min(game.camPitch, 0.6);
  const dist = inCar ? 7.5 + Math.min(3, Math.abs(P.car.speed) * 0.06) : indoor ? 2.7 : 3.6;
  const dir = new THREE.Vector3(-Math.sin(game.camYaw) * Math.cos(game.camPitch), Math.sin(game.camPitch), -Math.cos(game.camYaw) * Math.cos(game.camPitch));
  const t = rayBoxes(focus, dir, dist);
  const want = focus.clone().addScaledVector(dir, Math.max(0.6, t - 0.3));
  want.y = Math.max(want.y, world.groundHeight(want.x, want.z) + 0.3);
  if (indoor) want.y = Math.min(want.y, indoor.y + 2.6);
  const far = camTarget.distanceTo(focus) > 30;
  const k = snap ? 1 : Math.min(1, dt * (far ? 3 : 14));
  camTarget.lerp(focus, k); camPos.lerp(want, snap ? 1 : Math.min(1, dt * (far ? 3 : 18)));
  if (!far && !snap) camPos.copy(camTarget).addScaledVector(dir, Math.max(0.6, t - 0.3));
  camera.position.copy(camPos);
  // camera shake after crashes and hits
  if (game.shake > 0.001) {
    const s = game.shake, tt = performance.now() / 1000;
    camera.position.x += Math.sin(tt * 61) * s * 0.12; camera.position.y += Math.sin(tt * 47 + 1) * s * 0.1; camera.position.z += Math.sin(tt * 53 + 2) * s * 0.12;
    game.shake = Math.max(0, game.shake - dt * 2.2);
  }
  camera.lookAt(camTarget.x, camTarget.y + (inCar ? 0.6 : 0.1), camTarget.z);
  const fov = inCar ? 62 + Math.min(14, Math.abs(P.car.speed) * 0.35) : 60;
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
}

// street lanterns near you light up the street at night (a few real lights), the car's headlights too
function updateLights(dt, focus, inApt, night) {
  const L = game.lights;
  if (inApt) {
    const hm = Object.values(game.homes).find((h) => h.apt.bounds === inApt);
    L.forEach((l, i) => { if (i < 2) { l.position.copy(hm.apt.lights[i]); l.intensity = 7 + night * 5; l.distance = 12; l.color.set('#ffd9a8'); } else l.intensity = 0; });
  } else if (night > 0.2) {
    game.lightT -= dt;
    if (game.lightT <= 0) {
      game.lightT = 0.3;
      const heads = world.lampHeads, best = [];
      for (const p of heads) {
        const d = (p.x - focus.x) ** 2 + (p.z - focus.z) ** 2;
        if (best.length < L.length || d < best[best.length - 1][0]) { best.push([d, p]); best.sort((a, b) => a[0] - b[0]); if (best.length > L.length) best.pop(); }
      }
      L.forEach((l, i) => { if (best[i]) l.position.copy(best[i][1]); });
    }
    L.forEach((l) => { l.intensity = night * 28; l.distance = 20; l.color.set('#ffcf8f'); });
  } else L.forEach((l) => (l.intensity = 0));
  const P = game.players[game.active], hl = game.headlight;
  if (P.car && night > 0.25 && !P.car.T.tram) {
    const c = P.car;
    hl.position.set(c.pos.x + c.fwd.x * c.T.L * 0.5, c.pos.y + 0.75, c.pos.z + c.fwd.z * c.T.L * 0.5);
    hl.target.position.set(c.pos.x + c.fwd.x * 26, c.pos.y, c.pos.z + c.fwd.z * 26);
    hl.intensity = night * 260;
  } else hl.intensity = 0;
}

function updateGame(dt) {
  updatePlayer(dt);
  if (!game.started || state !== 'play') return;
  const P = game.players[game.active];
  // traffic, then one physics step for every vehicle
  const obstacles = game.obstacles; obstacles.length = 0;
  for (const c of game.cars) obstacles.push(c);
  for (const p of Object.values(game.players)) if (!p.car && !p.resident) obstacles.push(p.pos);
  for (const n of peds.list) if (n.h.root.visible && (n.state === 'walk' || n.state === 'flee' || n.state === 'down' || n.state === 'getup')) obstacles.push(n.pos);
  traffic.update(dt, obstacles);
  stepCars(dt, game.cars, world);
  checkPlayerHit(P);
  if (P.car && P.car.impact > 1.5) game.shake = Math.max(game.shake, Math.min(1, P.car.impact * 0.08));
  for (const c of game.cars) c.impact = 0;
  const focus = P.car ? P.car.pos : P.pos;
  peds.update(dt, focus, game.cars, P.car ? null : P, camera);
  const people = game.people || (game.people = []); people.length = 0;
  if (!P.car) people.push(P);
  for (const n of peds.list) if ((n.state === 'walk' || n.state === 'flee') && n.h.root.visible && n.pos.distanceTo(focus) < 50) people.push(n);
  props.update(dt, focus, game.cars, people, camera);
  updateCharacters(dt);
  const inApt = world.interiorAt(focus.x, focus.z);
  world.indoor = !!inApt;
  world.update(dt, focus, camera);
  for (const hm of Object.values(game.homes)) hm.apt.update(dt, world.dayAmount);
  const night = 1 - world.dayAmount;
  updateLights(dt, focus, inApt, night);
  updateBubbles(dt);
  // pickups
  const now = performance.now() / 1000;
  for (const pk of game.pickups) {
    if (!pk.active) { pk.t -= dt; if (pk.t <= 0) placePickup(pk); continue; }
    pk.m.rotation.y = now * 2; pk.m.children[0].position.y = Math.sin(now * 3) * 0.1;
    if (pk.m.position.distanceTo(focus) < (P.car ? 3.2 : 1.6)) { pk.active = false; pk.m.visible = false; pk.t = 60; addMoney(100); toast('+€100', 1); }
  }
  // mission
  if (game.mission) {
    const m = game.mission;
    m.time -= dt;
    const d = m.dest.distanceTo(focus);
    $('mission').innerHTML = `Deliver the package to <b>${m.where}</b> · <b>${Math.round(d)} m</b> · ⏱ <b>${Math.max(0, Math.ceil(m.time))}s</b> · reward ${euro(m.reward)}`;
    $('mission').classList.remove('hidden');
    game.beacon.material.opacity = 0.2 + Math.sin(now * 4) * 0.08;
    if (d < 7) { addMoney(m.reward); toast(`DELIVERED! +${euro(m.reward)}`, 2.5); game.mission = null; game.beacon.visible = false; }
    else if (m.time <= 0) { toast('JOB FAILED – out of time', 2.5); game.mission = null; game.beacon.visible = false; }
  } else $('mission').classList.add('hidden');
  updateCamera(dt);
  fleet.update(camera, renderer.getDrawingBufferSize(_dbs).y, night, dt);
  // HUD
  $('hMoney').textContent = euro(game.money);
  const hh = Math.floor(world.time), mi = Math.floor((world.time % 1) * 60);
  $('hClock').textContent = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  if ((game.locT -= dt) <= 0) {
    game.locT = 0.4;
    const loc = inApt ? { street: null, district: poss(looks[Object.keys(game.homes).find((w) => game.homes[w].apt.bounds === inApt)].name) + ' apartment' } : locationAt(focus.x, focus.z);
    $('hLoc').textContent = '📍 ' + (loc.street ? `${loc.street} · ${loc.district}` : loc.district);
  }
  const sp = $('speedo');
  if (P.car) { sp.classList.remove('hidden'); sp.innerHTML = `${Math.round(Math.abs(P.car.speed) * 3.6)}<small>km/h</small>`; } else sp.classList.add('hidden');
  if (game.toastT > 0) { game.toastT -= dt; if (game.toastT <= 0) $('toast').style.opacity = 0; }
  if ((game.mmT -= dt) <= 0) { game.mmT = 1 / 30; drawMinimap(focus, game.camYaw); }
  if (grade) { grade.uniforms.uWarm.value = world.golden * world.dayAmount; bloom.strength = 0.2 + night * 0.25; }
}
const _dbs = new THREE.Vector2();

// ------------------------------------------------------------------ studio UI
const pct = (v) => `${Math.round(v * 100)}%`;
const CATS = {
  Body: [
    ['choice', 'Body type', 'gender', [['male', 'Masculine'], ['female', 'Feminine']]],
    ['slider', 'Height', 'height', 145, 205, 1, (v) => `${Math.round(v)} cm`],
    ['slider', 'Body build', 'build', 0, 1, 0.01, (v) => (v < 0.3 ? 'Slim' : v < 0.65 ? 'Average' : 'Broad')],
    ['slider', 'Muscle', 'muscle', 0, 1, 0.01, pct],
    ['slider', 'Shoulder shape', 'shoulders', 0, 1, 0.01, pct],
    ['color', 'Skin tone', 'skin', PALETTES.skin],
  ],
  Face: [
    ['choice', 'Eye colour', 'eyes', OPTIONS.eyes],
    ['slider', 'Eye size', 'eyeSize', 0, 1, 0.01, pct],
    ['slider', 'Face width', 'faceWidth', 0, 1, 0.01, pct],
    ['slider', 'Face fullness', 'faceFat', 0, 1, 0.01, pct],
    ['slider', 'Jaw width', 'jaw', 0, 1, 0.01, pct],
    ['slider', 'Chin', 'chin', 0, 1, 0.01, pct],
    ['slider', 'Cheekbones', 'cheekbones', 0, 1, 0.01, pct],
    ['slider', 'Nose size', 'noseSize', 0, 1, 0.01, pct],
    ['slider', 'Nose width', 'noseWidth', 0, 1, 0.01, pct],
    ['slider', 'Lips', 'lips', 0, 1, 0.01, pct],
    ['choice', 'Eyebrows', 'browStyle', OPTIONS.browStyle],
  ],
  Hair: [
    ['choice', 'Haircut / hairstyle', 'hairStyle', OPTIONS.hairStyle],
    ['color', 'Hair colour (also eyebrows)', 'hairColor', PALETTES.hair],
    ['choice', 'Headwear', 'hat', OPTIONS.hat],
  ],
  Clothes: [
    ['note', 'Mix and match: any top works with any bottoms and shoes. "Orig" keeps the real fabric photo; any colour re-dyes it.'],
    ['choice', 'Top', 'top', OPTIONS.top],
    ['color', 'Top colour', 'topColor', PALETTES.cloth],
    ['choice', 'Bottoms', 'bottom', OPTIONS.bottom],
    ['color', 'Bottoms colour', 'bottomColor', PALETTES.cloth],
    ['choice', 'Shoes', 'shoes', OPTIONS.shoes],
    ['color', 'Shoe colour', 'shoesColor', PALETTES.cloth],
  ],
  Extras: [
    ['toggle', 'Watch', 'watch', 'watchColor'],
    ['toggle', 'Necklace (cross)', 'necklace', 'necklaceColor'],
    ['toggle', 'Bracelet', 'bracelet', 'braceletColor'],
    ['toggle', 'Earrings', 'earrings', 'earringColor'],
    ['toggle', 'Glasses', 'glasses', null],
  ],
};
let curCat = 'Body';
let rebuildQueued = false;
function queueRebuild() {
  if (rebuildQueued) return; rebuildQueued = true;
  requestAnimationFrame(() => { rebuildQueued = false; studio.human.setAppearance(looks[studio.who]); saveLook(studio.who); });
}
function renderCats() {
  const c = $('cats'); c.innerHTML = '';
  for (const name of Object.keys(CATS)) {
    const b = document.createElement('button'); b.textContent = name; if (name === curCat) b.className = 'on';
    b.onclick = () => { curCat = name; renderCats(); renderControls(); if (name === 'Face' || name === 'Hair') focusCam('face'); else focusCam('body'); };
    c.appendChild(b);
  }
}
function renderControls() {
  const box = $('controls'); box.innerHTML = '';
  const L = looks[studio.who];
  for (const def of CATS[curCat]) {
    const [type, label, key] = def;
    const ctl = document.createElement('div'); ctl.className = 'ctl';
    if (type === 'note') { ctl.innerHTML = `<p class="note">${label}</p>`; box.appendChild(ctl); continue; }
    if (type === 'slider') {
      const [, , , min, max, step, fmt] = def;
      ctl.innerHTML = `<label>${label}<b>${fmt(L[key])}</b></label><input type="range" min="${min}" max="${max}" step="${step}" value="${L[key]}">`;
      const inp = ctl.querySelector('input'), out = ctl.querySelector('b');
      inp.oninput = () => { L[key] = parseFloat(inp.value); out.textContent = fmt(L[key]); queueRebuild(); };
    } else if (type === 'choice') {
      const opts = def[3];
      ctl.innerHTML = `<label>${label}</label><div class="chips"></div>`;
      const chips = ctl.querySelector('.chips');
      for (const [id, name] of opts) {
        const b = document.createElement('button'); b.textContent = name; if (L[key] === id) b.className = 'on';
        b.onclick = () => { L[key] = id; queueRebuild(); renderControls(); };
        chips.appendChild(b);
      }
    } else if (type === 'color') {
      ctl.innerHTML = `<label>${label}</label><div class="sw"></div>`;
      ctl.querySelector('.sw').appendChild(swatches(def[3], L, key));
    } else if (type === 'toggle') {
      const colKey = def[3];
      ctl.innerHTML = `<div class="tog"><span class="t">${label}</span><button class="switch ${L[key] ? 'on' : ''}"></button></div>`;
      ctl.querySelector('.switch').onclick = () => { L[key] = !L[key]; queueRebuild(); renderControls(); };
      if (colKey && L[key]) { const w = document.createElement('div'); w.className = 'sw'; w.style.marginTop = '8px'; w.appendChild(swatches(PALETTES.metal, L, colKey)); ctl.appendChild(w); }
    }
    box.appendChild(ctl);
  }
}
function swatches(pal, L, key) {
  const frag = document.createDocumentFragment();
  for (const c of pal) {
    const b = document.createElement('button');
    if (c === 'original') { b.textContent = 'Orig'; b.title = 'Original fabric'; b.style.cssText = 'width:auto;padding:0 8px;border-radius:14px;font-size:11px;background:linear-gradient(135deg,#7a8fb0,#c9b38f)'; }
    else b.style.background = c;
    if ((L[key] || '').toLowerCase() === c.toLowerCase()) b.className = 'on';
    b.onclick = () => { L[key] = c; queueRebuild(); renderControls(); };
    frag.appendChild(b);
  }
  const pick = document.createElement('input'); pick.type = 'color'; pick.value = /^#/.test(L[key] || '') ? L[key] : '#ffffff'; pick.title = 'Custom colour';
  pick.oninput = () => { L[key] = pick.value; queueRebuild(); };
  pick.onchange = () => renderControls();
  frag.appendChild(pick);
  return frag;
}
function selectWho(who) {
  studio.who = who;
  for (const b of document.querySelectorAll('.who button')) b.classList.toggle('on', b.dataset.who === who);
  $('pName').firstChild.textContent = looks[who].name;
  studio.human.setAppearance(looks[who]);
  renderControls();
}
function focusCam(mode) {
  const h = looks[studio.who].height / 177;
  const portrait = innerWidth <= 820 && innerHeight > innerWidth;
  if (mode === 'face') { studio.wantDist = portrait ? 1.6 : 1.05; studio.wantY = 1.62 * h; } else { studio.wantDist = portrait ? 8.5 : 4.6; studio.wantY = 0.95 * h; }
}
for (const b of document.querySelectorAll('.who button')) b.onclick = () => selectWho(b.dataset.who);
$('camBody').onclick = () => focusCam('body');
$('camFace').onclick = () => focusCam('face');
$('camSpin').onclick = () => (studio.spin = !studio.spin);
$('bRandom').onclick = () => {
  const L = looks[studio.who];
  const r = randomAppearance(Math.random, L.gender);
  Object.assign(L, r, { name: L.name, gender: L.gender, height: L.height });
  queueRebuild(); renderControls();
};
$('bReset').onclick = () => { looks[studio.who] = { ...DEFAULTS[studio.who] }; queueRebuild(); renderControls(); };
$('bDone').onclick = () => { if (studio.from === 'game') closeStudio(); else startGame(); };

// studio drag rotate / zoom
{
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { if (state === 'studio') { drag = { x: e.clientX, y: e.clientY }; studio.spin = false; } });
  addEventListener('pointerup', () => (drag = null));
  addEventListener('pointermove', (e) => {
    if (!drag || state !== 'studio') return;
    studio.yaw += (e.clientX - drag.x) * 0.01;
    studio.wantY = THREE.MathUtils.clamp(studio.wantY + (e.clientY - drag.y) * 0.003, 0.2, 2.0);
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', (e) => { if (state === 'studio') studio.wantDist = THREE.MathUtils.clamp(studio.wantDist * (1 + e.deltaY * 0.001), 0.7, 6); }, { passive: true });
  let pinch = null;
  canvas.addEventListener('touchstart', (e) => { if (state === 'studio' && e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); });
  canvas.addEventListener('touchmove', (e) => {
    if (state !== 'studio' || e.touches.length !== 2 || !pinch) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    studio.wantDist = THREE.MathUtils.clamp(studio.wantDist * (pinch / d), 0.7, 6); pinch = d;
  });
}

function updateStudio(dt) {
  if (studio.spin) studio.yaw += dt * 0.6;
  studio.dist += (studio.wantDist - studio.dist) * Math.min(1, dt * 6);
  studio.target.y += (studio.wantY - studio.target.y) * Math.min(1, dt * 6);
  studio.human.root.rotation.y = studio.yaw;
  studio.human.anim.speed = 0; studio.human.anim.sit = false; studio.human.anim.air = false;
  studio.human.anim.lookAtCamera = true;
  studio.human.update(dt, studio.cam);
  const wide = innerWidth > 820;
  const portrait = !wide && innerHeight > innerWidth;
  studio.cam.aspect = innerWidth / innerHeight;
  studio.cam.position.set(0, studio.target.y + 0.05, studio.dist);
  studio.cam.lookAt(0, studio.target.y, 0);
  // shift the view so the character is not hidden behind the options panel
  const offX = portrait ? 0 : wide ? 200 : innerWidth * 0.24;
  const offY = portrait ? innerHeight * 0.25 : 0;
  studio.cam.setViewOffset(innerWidth, innerHeight, offX, offY, innerWidth, innerHeight);
  studio.cam.updateProjectionMatrix();
}


// ------------------------------------------------------------------ state machine
let state = 'loading';
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setState(s) {
  state = s;
  show('title', s === 'title'); show('studio', s === 'studio'); show('hud', s === 'play' || s === 'pause');
  show('touch', s === 'play' && input.isTouch); show('pause', s === 'pause');
  input.enabled = s === 'play';
  if (s !== 'play' && document.pointerLockElement) document.exitPointerLock();
}
function openStudio(from) {
  studio.from = from;
  $('bDone').textContent = from === 'game' ? 'Done' : 'Play';
  selectWho(from === 'game' ? game.active : studio.who);
  renderCats(); focusCam('body');
  setState('studio');
}
function closeStudio() {
  for (const who of ['arturs', 'paula']) game.players[who].human.setAppearance(looks[who]);
  const P = game.players[game.active];
  if (P.car) P.human.anim.sit = true;
  setState('play');
}
function startGame() {
  if (!game.started) {
    $('loading').classList.remove('hidden'); $('loading').textContent = 'BUILDING RĪGA…';
    setTimeout(async () => {
      buildGame(); game.started = true;
      $('hName').textContent = looks[game.active].name.toUpperCase();
      for (const who of ['arturs', 'paula']) game.players[who].human.setAppearance(looks[who]);
      world.update(0, game.players[game.active].pos, camera);
      updateCamera(0.016, true);
      // compile every shader up front so nothing stutters the first time it appears
      try { $('loading').textContent = 'PREPARING SHADERS…'; await renderer.compileAsync(game.scene, camera); } catch { /* compiled on first use instead */ }
      $('loading').classList.add('hidden');
      setState('play');
      toast('Laipni lūdzam Rīgā! · Welcome to Riga', 3);
    }, 30);
    return;
  }
  closeStudio();
}
function pauseGame(on) { setState(on ? 'pause' : 'play'); }
const QUALITY_LABEL = { low: 'Low (faster)', high: 'High', ultra: 'Ultra (ambient occlusion)' };
$('bPlay').onclick = startGame;
$('bStudio').onclick = () => openStudio('title');
$('bQuality').textContent = `Graphics: ${QUALITY_LABEL[qualityName]}`;
$('bQuality').onclick = () => { store.set('quality', QUALITIES[(QUALITIES.indexOf(qualityName) + 1) % QUALITIES.length]); location.reload(); };
$('pResume').onclick = () => pauseGame(false);
$('pWardrobe').onclick = () => openStudio('game');
$('pSwitch').onclick = () => { switchCharacter(); pauseGame(false); };
$('pQuit').onclick = () => setState('title');
$('hSwitch').onclick = () => switchCharacter();
const timeModes = [['normal', 1 / 60], ['fast', 1 / 10], ['frozen', 0]];
$('pTime').onclick = () => { game.timeMode = (game.timeMode + 1) % 3; world.timeSpeed = timeModes[game.timeMode][1]; $('pTime').textContent = 'Time: ' + timeModes[game.timeMode][0]; };
addEventListener('keydown', (e) => { if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) pauseGame(false); });
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  // Esc releases the mouse first – treat that as "pause", like most PC games
  if (!document.pointerLockElement && wasLocked && state === 'play') pauseGame(true);
  wasLocked = !!document.pointerLockElement;
});

addEventListener('resize', applyResolution);

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta(), dt = Math.min(0.05, raw);
  if (state === 'studio') {
    updateStudio(dt);
    renderer.toneMappingExposure = 1.0;
    renderer.render(studio.scene, studio.cam);
  } else if (game.started && (state === 'play' || state === 'pause' || state === 'title')) {
    if (state === 'play') { updateGame(dt); adaptResolution(raw); }
    else if (state === 'title') {
      // title: slow cinematic orbit
      game.camYaw += dt * 0.05; updateCamera(dt);
      world.update(dt, game.players[game.active].pos, camera);
      fleet.update(camera, renderer.getDrawingBufferSize(_dbs).y, 1 - world.dayAmount, dt);
    }
    if (composer) composer.render(); else renderer.render(game.scene, camera);
  } else if (state === 'title') {
    // title before the world exists: show the studio scene with the character slowly spinning
    studio.yaw += dt * 0.3; updateStudio(dt); renderer.toneMappingExposure = 1.0; renderer.render(studio.scene, studio.cam);
  }
  input.endFrame();
}

// boot
selectWho('arturs'); renderCats();
setState('title');
$('loading').classList.add('hidden');
frame();

// PWA offline support
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__ps = { snap: () => updateCamera(0.016, true), sim: (secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) { updateGame(dt); input.endFrame(); } }, game, get world() { return world; }, get peds() { return peds; }, get traffic() { return traffic; }, get props() { return props; }, get fleet() { return fleet; }, looks, camera, studio, renderer, Q, dyn };
