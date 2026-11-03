// Physically based materials for the photographic MakeHuman assets:
// skin with subsurface-scattering approximation and micro pores, glossy eyes,
// recolourable hair/eyebrows/eyelashes (alpha cards) and recolourable fabrics.
import * as THREE from 'three';
import { texture } from './pack.js';
import { rng } from '../textures.js';

let poreTex = null;
function pores() {
  if (poreTex) return poreTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'); const r = rng(31);
  x.fillStyle = 'rgb(150,150,150)'; x.fillRect(0, 0, S, S);
  const img = x.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 26; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < 1400; i++) {
    const px = r() * S, py = r() * S, rad = 0.7 + r() * 1.4;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      const g = x.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad * 1.6);
      g.addColorStop(0, 'rgba(50,50,50,0.7)'); g.addColorStop(1, 'rgba(50,50,50,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px + dx, py + dy, rad * 1.6, 0, Math.PI * 2); x.fill();
    }
  }
  poreTex = new THREE.CanvasTexture(c);
  poreTex.wrapS = poreTex.wrapT = THREE.RepeatWrapping;
  return poreTex;
}

const TRI = /* glsl */`
  varying vec3 vObjPos; varying vec3 vObjNrm;
  float triSample(sampler2D t, vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
    return texture2D(t, p.yz).r * w.x + texture2D(t, p.zx).r * w.y + texture2D(t, p.xy).r * w.z;
  }
  vec3 bumpNormal(vec3 n, float h, float strength) {
    vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
    float dhdx = dFdx(h) * strength, dhdy = dFdy(h) * strength;
    vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
    float det = dot(dpdx, r1);
    return normalize(abs(det) * n - sign(det) * (dhdx * r1 + dhdy * r2));
  }
`;
function addObjVaryings(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos; varying vec3 vObjNrm;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position; vObjNrm = normal;');
}

let sss = null;
function sssChunk() {
  if (sss) return sss;
  sss = 'uniform vec3 uSSS;\n' + THREE.ShaderChunk.lights_physical_pars_fragment.replace(
    'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    `reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
     #ifdef SKIN_SSS
       float wrapNL = saturate( ( dot( geometryNormal, directLight.direction ) + 0.5 ) / 1.5 );
       reflectedLight.directDiffuse += max( wrapNL - dotNL, 0.0 ) * directLight.color * material.diffuseColor * uSSS;
     #endif`);
  return sss;
}

export function skinMaterial(skinInfo, tint, detail = true) {
  const u = { uSSS: { value: new THREE.Color(0.9, 0.3, 0.2).multiplyScalar(0.5) }, uPores: { value: pores() }, uDetail: { value: detail ? 1 : 0 } };
  const m = new THREE.MeshPhysicalMaterial({
    map: texture(skinInfo), color: tint, roughness: 0.55, metalness: 0,
    sheen: 0.22, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ff9f8a'), specularIntensity: 0.42,
  });
  m.defines = { SKIN_SSS: '' };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    addObjVaryings(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uPores; uniform float uDetail;\n' + TRI)
      .replace('#include <lights_physical_pars_fragment>', sssChunk())
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float pore = triSample(uPores, vObjPos * 3.5, vObjNrm);
        roughnessFactor *= 0.92 + 0.16 * pore;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float fade = clamp(1.0 - length(vViewPosition) / 3.0, 0.0, 1.0) * uDetail;
          normal = bumpNormal(normal, triSample(uPores, vObjPos * 3.5, vObjNrm), 0.00035 * fade);
        }`);
  };
  m.customProgramCacheKey = () => 'mh-skin';
  return m;
}

export function eyeMaterial(info) {
  // the eye texture's transparent part is the cornea shell: cut it out so the iris shows through
  return new THREE.MeshPhysicalMaterial({ map: texture(info), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 0.6, alphaTest: 0.2, side: THREE.DoubleSide });
}

// Alpha-card material for hair / brows / lashes. Textures hold luminance + alpha, colour comes from `color`.
export function cardMaterial(info, color, { alphaTest = 0.45, aniso = 0.6, rough = 0.48 } = {}) {
  // texture luminance is stored in sRGB; colours are linear → compare in linear space
  const meanLin = Math.pow(Math.max(0.2, info?.meanLum || 0.5), 2.2);
  const c = new THREE.Color(color).multiplyScalar(0.8 / meanLin);
  const m = new THREE.MeshPhysicalMaterial({
    map: texture(info), color: c, alphaTest, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: rough, metalness: 0, anisotropy: aniso, sheen: 0.25, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(color).multiplyScalar(1.5), specularIntensity: 0.5,
  });
  return m;
}

// Fabric with an optional "recolour" that keeps the texture's shading but changes the hue.
export function clothMaterial(info, normalInfo, recolor, { layer = 0 } = {}) {
  const u = {
    uRecolor: { value: new THREE.Color(recolor || '#ffffff') },
    uAmt: { value: recolor ? 1 : 0 },
    uMean: { value: Math.pow(info?.meanLum || 0.5, 2.2) },
  };
  const m = new THREE.MeshPhysicalMaterial({
    map: texture(info), normalMap: normalInfo ? texture(normalInfo, { srgb: false }) : null,
    roughness: 0.82, metalness: 0, side: THREE.DoubleSide,
    sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(recolor || '#ffffff').lerp(new THREE.Color('#ffffff'), 0.5),
    specularIntensity: 0.35, alphaTest: info?.alpha ? 0.5 : 0,
    polygonOffset: layer !== 0, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2,
  });
  if (normalInfo) m.normalScale.set(0.8, 0.8);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRecolor; uniform float uAmt; uniform float uMean;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          // keep the fabric's shading/detail but compress its contrast so light colours stay clean
          float rel = clamp(lum / max(uMean, 0.02), 0.0, 2.5);
          vec3 rc = uRecolor * mix(1.0, rel, 0.55) * 0.92;
          diffuseColor.rgb = mix(diffuseColor.rgb, rc, uAmt);
        }`);
  };
  m.customProgramCacheKey = () => 'mh-cloth';
  return m;
}
