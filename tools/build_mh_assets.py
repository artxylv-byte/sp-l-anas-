#!/usr/bin/env python3
"""
Builds the compact character asset pack used by the game from CC0 MakeHuman data.

Sources (both CC0 assets, see https://github.com/makehumancommunity/makehuman LICENSE.ASSETS.md):
  * MakeHuman repository (base mesh, targets, default skeleton + weights):
      git clone --depth 1 https://github.com/makehumancommunity/makehuman
  * npm package "makehuman-data" (official system proxies: clothes, hair, eyes,
    eyebrows, eyelashes and skins converted to JSON/PNG):
      npm pack makehuman-data && tar xzf makehuman-data-*.tgz

Only official MakeHuman system assets (released CC0) are used.

Usage: python3 tools/build_mh_assets.py <makehuman repo dir> <makehuman-data package dir> <out dir>
"""
import json, os, sys, struct
import numpy as np
from PIL import Image, ImageFilter

MH = os.path.join(sys.argv[1], 'makehuman', 'data') + '/'
PK = os.path.join(sys.argv[2], 'public', 'data') + '/'
OUT = sys.argv[3].rstrip('/') + '/'
os.makedirs(OUT + 'tex', exist_ok=True)


class Pack:
    def __init__(self):
        self.buf = bytearray()

    def add(self, arr, dtype):
        a = np.ascontiguousarray(np.asarray(arr, dtype=dtype))
        while len(self.buf) % 4:
            self.buf.append(0)
        off = len(self.buf)
        self.buf += a.tobytes()
        return [off, int(a.size), np.dtype(dtype).name]


pack = Pack()
manifest = {'version': 1, 'unit': 'dm', 'license': 'CC0 1.0 (MakeHuman assets)'}

# ------------------------------------------------------------------ base mesh
V, VT, faces = [], [], []
group = None
for line in open(MH + '3dobjs/base.obj'):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '):
        VT.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('g '):
        group = line.split()[1].strip()
    elif line.startswith('f ') and group == 'body':
        toks = line.split()[1:]
        faces.append([(int(t.split('/')[0]) - 1, int(t.split('/')[1]) - 1) for t in toks])
V = np.array(V, dtype=np.float32)
VT = np.array(VT, dtype=np.float32)
print('base verts', len(V), 'body faces', len(faces))


def render_mesh(face_list, uvs):
    """face_list: [[(vertex, uvIndex), ...], ...] -> unique (v,uv) render vertices + triangle index"""
    key2r, rmap, ruv, idx = {}, [], [], []
    for f in face_list:
        rid = []
        for (v, t) in f:
            k = (v, t)
            if k not in key2r:
                key2r[k] = len(rmap)
                rmap.append(v)
                ruv.append(uvs[t])
            rid.append(key2r[k])
        for i in range(1, len(rid) - 1):
            idx += [rid[0], rid[i], rid[i + 1]]
    return np.array(rmap), np.array(ruv, dtype=np.float32), np.array(idx)


bmap, buv, bidx = render_mesh(faces, VT)
manifest['base'] = {
    'nVerts': int(len(V)),
    'pos': pack.add(V.reshape(-1), np.float32),
    'render': {'map': pack.add(bmap, np.uint16), 'uv': pack.add(buv.reshape(-1), np.float32),
               'index': pack.add(bidx, np.uint16 if len(bmap) < 65536 else np.uint32)},
}
print('body render verts', len(bmap), 'tris', len(bidx) // 3)

# ------------------------------------------------------------------ targets
def read_target(path):
    d = {}
    for line in open(path):
        if not line.strip() or line.startswith('#'):
            continue
        p = line.split()
        d[int(p[0])] = np.array([float(p[1]), float(p[2]), float(p[3])], dtype=np.float64)
    return d


def tsum(*items):
    out = {}
    for sign, t in items:
        for k, v in t.items():
            out[k] = out.get(k, 0) + sign * v
    return out


SC = 2e-4  # quantisation step (dm)


def store_target(t):
    keys = sorted(k for k, v in t.items() if np.abs(v).max() > SC * 0.5)
    deltas = np.array([t[k] for k in keys]).reshape(-1) if keys else np.zeros(0)
    q = np.clip(np.round(deltas / SC), -32767, 32767)
    return {'idx': pack.add(keys, np.uint16), 'd': pack.add(q, np.int16), 'scale': SC}


T = MH + 'targets/'
targets = {}
for g in ['female', 'male']:
    U = lambda m, w: read_target(T + f'macrodetails/universal-{g}-young-{m}muscle-{w}weight.target')
    avg = U('average', 'average')
    targets[g + '.base'] = store_target(tsum((1, read_target(T + f'macrodetails/caucasian-{g}-young.target')), (1, avg)))
    targets[g + '.muscle-'] = store_target(tsum((1, U('min', 'average')), (-1, avg)))
    targets[g + '.muscle+'] = store_target(tsum((1, U('max', 'average')), (-1, avg)))
    targets[g + '.weight-'] = store_target(tsum((1, U('average', 'min')), (-1, avg)))
    targets[g + '.weight+'] = store_target(tsum((1, U('average', 'max')), (-1, avg)))
    targets[g + '.height-'] = store_target(read_target(T + f'macrodetails/height/{g}-young-averagemuscle-averageweight-minheight.target'))
    targets[g + '.height+'] = store_target(read_target(T + f'macrodetails/height/{g}-young-averagemuscle-averageweight-maxheight.target'))

FACE = {
    'nose+': ['nose/nose-scale-vert-incr', 'nose/nose-scale-depth-incr'],
    'nose-': ['nose/nose-scale-vert-decr', 'nose/nose-scale-depth-decr'],
    'noseW+': ['nose/nose-scale-horiz-incr'], 'noseW-': ['nose/nose-scale-horiz-decr'],
    'eyes+': ['eyes/l-eye-scale-incr', 'eyes/r-eye-scale-incr'], 'eyes-': ['eyes/l-eye-scale-decr', 'eyes/r-eye-scale-decr'],
    'lips+': ['mouth/mouth-lowerlip-volume-incr', 'mouth/mouth-upperlip-volume-incr'],
    'lips-': ['mouth/mouth-lowerlip-volume-decr', 'mouth/mouth-upperlip-volume-decr'],
    'jaw+': ['chin/chin-width-incr'], 'jaw-': ['chin/chin-width-decr'],
    'chin+': ['chin/chin-prominent-incr'], 'chin-': ['chin/chin-prominent-decr'],
    'cheek+': ['cheek/l-cheek-bones-incr', 'cheek/r-cheek-bones-incr'], 'cheek-': ['cheek/l-cheek-bones-decr', 'cheek/r-cheek-bones-decr'],
    'face+': ['head/head-scale-horiz-incr'], 'face-': ['head/head-scale-horiz-decr'],
    'fat+': ['head/head-fat-incr'], 'fat-': ['head/head-fat-decr'],
    'shoulders+': ['torso/torso-vshape-incr'], 'shoulders-': ['torso/torso-vshape-decr'],
}
for k, files in FACE.items():
    targets['face.' + k] = store_target(tsum(*[(1, read_target(T + f + '.target')) for f in files]))
manifest['targets'] = targets
print('targets', len(targets))

# ------------------------------------------------------------------ skeleton + weights
sk = json.load(open(MH + 'rigs/default.mhskel'))
bones = sk['bones']
order, seen = [], set()


def visit(n):
    if n in seen:
        return
    p = bones[n]['parent']
    if p:
        visit(p)
    seen.add(n)
    order.append(n)


for n in bones:
    visit(n)
bidx_of = {n: i for i, n in enumerate(order)}
manifest['skeleton'] = [{'name': n, 'parent': bidx_of[bones[n]['parent']] if bones[n]['parent'] else -1,
                         'head': sk['joints'][bones[n]['head']], 'tail': sk['joints'][bones[n]['tail']]} for n in order]
W = json.load(open(MH + 'rigs/default_weights.mhw'))['weights']
per = [[] for _ in range(len(V))]
for bname, lst in W.items():
    if bname not in bidx_of:
        continue
    for v, w in lst:
        per[v].append((w, bidx_of[bname]))
wi = np.zeros((len(V), 4), np.uint8)
ww = np.zeros((len(V), 4), np.uint8)
for v, lst in enumerate(per):
    lst.sort(reverse=True)
    lst = lst[:4]
    tot = sum(w for w, _ in lst) or 1
    q = [int(round(w / tot * 255)) for w, _ in lst]
    if q:
        q[0] += 255 - sum(q)
    for k, (w, b) in enumerate(lst):
        wi[v, k] = b
        ww[v, k] = q[k]
    if not lst:
        wi[v, 0] = bidx_of['root']
        ww[v, 0] = 255
manifest['weights'] = {'idx': pack.add(wi.reshape(-1), np.uint8), 'w': pack.add(ww.reshape(-1), np.uint8)}
print('bones', len(order))

# ------------------------------------------------------------------ textures
tex_done = {}


def texture(path, kind='color', size=None):
    if not path or not os.path.exists(path):
        return None
    name = os.path.splitext(os.path.basename(path))[0]
    if name in tex_done:
        return tex_done[name]
    im = Image.open(path)
    has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if has_alpha else 'RGB')
    info = {'file': 'tex/' + name + '.webp', 'alpha': has_alpha}
    if size and im.size[0] < size:
        im = im.resize((size, size), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    if kind == 'gray':
        # hair: keep luminance + alpha so any hair colour can be applied in the shader
        rgb = np.asarray(im.convert('RGB'), np.float32)
        lum = rgb @ np.array([0.299, 0.587, 0.114])
        a = np.asarray(im)[:, :, 3] if has_alpha else np.full(lum.shape, 255)
        m = lum[a > 128].mean() if (a > 128).any() else lum.mean()
        info['meanLum'] = float(m / 255)
        g = np.clip(lum, 0, 255).astype(np.uint8)
        im = Image.merge('RGBA', [Image.fromarray(g)] * 3 + [Image.fromarray(a.astype(np.uint8))])
    elif kind == 'color':
        rgb = np.asarray(im.convert('RGB'), np.float32)
        info['meanLum'] = float((rgb @ np.array([0.299, 0.587, 0.114])).mean() / 255)
    q = 88 if kind != 'normal' else 92
    im.save(OUT + info['file'], 'WEBP', quality=q, method=6)
    tex_done[name] = info
    return info


# ------------------------------------------------------------------ proxies
def parse_faces(fa, nv):
    out, i = [], 0
    while i < len(fa):
        t = fa[i]; i += 1
        quad = t & 1
        n = 4 if quad else 3
        vs = fa[i:i + n]; i += n
        if t & 2: i += 1
        if t & 4: i += 1
        uv = None
        if t & 8:
            uv = fa[i:i + n]; i += n
        if t & 16: i += 1
        if t & 32: i += n
        if t & 64: i += 1
        if t & 128: i += n
        out.append(list(zip(vs, uv if uv else vs)))
    return out


def components(nv, flist):
    parent = list(range(nv))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for f in flist:
        a = find(f[0][0])
        for v, _ in f[1:]:
            b = find(v)
            if a != b:
                parent[b] = a
    return [find(v) for v in range(nv)]


proxies = {}


def add_proxy(cat, name, key=None, split=False, tex_kind='color'):
    d = json.load(open(PK + f'proxies/{cat}/{name}/{name}.json'))
    md = d['metadata']
    ref = np.array(d['ref_vIdxs'], np.int64)
    w = np.array(d['weights'], np.float32)
    off = np.array(d['offsets'], np.float32) * float(d.get('scale', 1.0))
    fit = (V[ref] * w[:, :, None]).sum(1) + off
    uvs = np.array(d['uvs'][0], np.float32).reshape(-1, 2)
    flist = parse_faces(d['faces'], len(ref))
    dele = np.nonzero(np.array(md.get('deleteVerts') or [False] * len(V), bool))[0]
    mat = d['materials'][0]
    base_dir = PK + f'proxies/{cat}/{name}/'
    diff = texture(base_dir + mat['mapDiffuse'], tex_kind) if mat.get('mapDiffuse') else None
    nrm = texture(base_dir + mat['mapNormal'], 'normal') if mat.get('mapNormal') else None
    common = {'ref': pack.add(ref.reshape(-1), np.uint16), 'w': pack.add(w.reshape(-1), np.float32),
              'off': pack.add(off.reshape(-1), np.float32), 'nVerts': int(len(ref)),
              'z': int(md.get('z_depth') or 0), 'tex': diff, 'normal': nrm, 'cat': cat}
    pieces = {'all': flist}
    if split:
        # split outfits into top / bottom by UV island (shirt, jacket, trousers are separate islands)
        nuv = len(uvs)
        par = list(range(nuv))

        def find(x):
            while par[x] != x:
                par[x] = par[par[x]]
                x = par[x]
            return x
        for f in flist:
            a0 = find(f[0][1])
            for _, t in f[1:]:
                b0 = find(t)
                if a0 != b0:
                    par[b0] = a0
        isl = {}
        for f in flist:
            isl.setdefault(find(f[0][1]), []).append(f)
        pieces = {'top': [], 'bottom': []}
        for fs in isl.values():
            ys = np.array([fit[[v for v, _ in f]][:, 1].mean() for f in fs])
            pieces['top' if ys.mean() > SPLIT_Y else 'bottom'] += fs
        # give each deleted body vertex to the piece that actually covers it
        pv = {k: fit[sorted({v for f in fl for v, _ in f})] for k, fl in pieces.items() if fl}
        dist = {k: np.min(np.linalg.norm(V[dele][:, None, :] - P[None, :, :], axis=2), axis=1) for k, P in pv.items()}
    for pname, fl in pieces.items():
        if not fl:
            continue
        rmap, ruv, ridx = render_mesh(fl, uvs)
        if split:
            other = 'bottom' if pname == 'top' else 'top'
            dv = dele[dist[pname] <= dist[other]] if other in dist else dele
        else:
            dv = dele
        entry = dict(common)
        entry.update({'map': pack.add(rmap, np.uint16), 'uv': pack.add(ruv.reshape(-1), np.float32),
                      'index': pack.add(ridx, np.uint16), 'delete': pack.add(dv, np.uint16)})
        proxies[(key or name) + ('' if pname == 'all' else '.' + pname)] = entry
    return fit


# hip/waist height in the base mesh (between the shirt and trouser components)
SPLIT_Y = float(V[:, 1].min() + (V[:, 1].max() - V[:, 1].min()) * 0.535)
print('split y', SPLIT_Y)

SUITS = ['male_casualsuit01', 'male_casualsuit02', 'male_casualsuit03', 'male_casualsuit04', 'male_casualsuit05',
         'male_casualsuit06', 'male_elegantsuit01', 'male_worksuit01', 'female_casualsuit01', 'female_casualsuit02',
         'female_elegantsuit01', 'female_sportsuit01']
for s in SUITS:
    add_proxy('clothes', s, split=True)
for s in ['shoes01', 'shoes02', 'shoes03', 'shoes04', 'shoes05', 'shoes06', 'fedora']:
    add_proxy('clothes', s)
for h in ['short01', 'short02', 'short03', 'short04', 'bob01', 'bob02', 'long01', 'ponytail01', 'Braid01', 'afro01']:
    add_proxy('hair', h, key=h.lower(), tex_kind='gray')
for e in ['eyebrow%03d' % i for i in range(1, 13)]:
    add_proxy('eyebrows', e, tex_kind='gray')
for e in ['Eyelashes01', 'eyelashes02', 'eyelashes03', 'eyelashes04']:
    add_proxy('eyelashes', e, key=e.lower(), tex_kind='gray')
add_proxy('eyes', 'HighPolyEyes', key='eyes')
manifest['proxies'] = proxies
print('proxies', len(proxies))

# eye colours, skins
eye_tex = {}
for c in ['brown', 'brownlight', 'blue', 'deepblue', 'lightblue', 'bluegreen', 'green', 'grey', 'ice']:
    eye_tex[c] = texture(PK + f'proxies/eyes/HighPolyEyes/textures/{c}_eye.png')
# a natural dark brown derived from the (reddish) brown eye texture
src = Image.open(OUT + eye_tex['brown']['file']).convert('RGBA')
ea = np.asarray(src).astype(np.float32) / 255
rgb = ea[:, :, :3]
sat = (rgb.max(2) - rgb.min(2)) / (rgb.max(2) + 1e-5)
mk = np.clip((sat - 0.25) / 0.25, 0, 1)[:, :, None]
lum = (rgb @ np.array([0.3, 0.59, 0.11]))[:, :, None]
br = np.clip(np.concatenate([lum * 1.15 + 0.04, lum * 0.78 + 0.02, lum * 0.5], axis=2), 0, 1)
Image.fromarray((np.concatenate([rgb * (1 - mk) + br * mk, ea[:, :, 3:4]], axis=2) * 255).astype(np.uint8), 'RGBA').save(OUT + 'tex/darkbrown_eye.webp', 'WEBP', quality=88, method=6)
eye_tex['darkbrown'] = {'file': 'tex/darkbrown_eye.webp', 'alpha': True}
manifest['eyes'] = eye_tex
skins = {}
for s, f in [('light_male', 'young_caucasian_male/textures/young_lightskinned_male_diffuse.png'),
             ('light_female', 'young_caucasian_female/textures/young_lightskinned_female_diffuse.png'),
             ('medium_male', 'young_asian_male/textures/young_lightskinned_male_diffuse3.png'),
             ('medium_female', 'young_asian_female/textures/young_lightskinned_female_diffuse3.png'),
             ('dark_male', 'young_african_male/textures/young_darkskinned_male_diffuse.png'),
             ('dark_female', 'young_african_female/textures/young_darkskinned_female_diffuse.png')]:
    p = PK + 'skins/' + f
    if not os.path.exists(p):
        alt = [x for x in os.listdir(os.path.dirname(p))]
        p = os.path.join(os.path.dirname(p), sorted(alt)[0])
    skins[s] = texture(p, 'color', size=1024)
manifest['skins'] = skins

open(OUT + 'pack.bin', 'wb').write(bytes(pack.buf))
json.dump(manifest, open(OUT + 'manifest.json', 'w'), separators=(',', ':'))
tot = sum(os.path.getsize(OUT + 'tex/' + f) for f in os.listdir(OUT + 'tex'))
print('pack.bin', len(pack.buf) // 1024, 'KB; textures', tot // 1024, 'KB in', len(os.listdir(OUT + 'tex')), 'files')
