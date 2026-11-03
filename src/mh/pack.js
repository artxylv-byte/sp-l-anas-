// Access to the embedded character asset pack (CC0 MakeHuman data converted by tools/build_mh_assets.py).
import * as THREE from 'three';

let P = null;
const TYPES = { float32: Float32Array, uint16: Uint16Array, int16: Int16Array, uint8: Uint8Array, uint32: Uint32Array, int32: Int32Array };

function b64ToBuffer(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

export function pack() {
  if (P) return P;
  const src = window.__MH_PACK__;
  if (!src) throw new Error('Character asset pack is missing');
  P = { m: src.m, bin: b64ToBuffer(src.bin), tex: src.tex, cache: new Map() };
  return P;
}

export function arr(desc) {
  const [off, len, dt] = desc;
  const T = TYPES[dt];
  return new T(pack().bin, off, len);
}

// Textures are embedded as data: URIs (works offline and from file://).
export function texture(info, { srgb = true } = {}) {
  if (!info) return null;
  const p = pack();
  const key = info.file + (srgb ? '' : ':lin');
  if (p.cache.has(key)) return p.cache.get(key);
  const t = new THREE.Texture();
  const img = new Image();
  img.onload = () => { t.image = img; t.needsUpdate = true; };
  img.src = p.tex[info.file];
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  p.cache.set(key, t);
  return t;
}
