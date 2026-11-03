// Character appearance model + options. Rendering uses realistic CC0 MakeHuman assets (see src/mh/).
export { MHuman as Human, cloneHuman } from './mh/mhuman.js';

export const OPTIONS = {
  hairStyle: [['short02', 'Short textured'], ['short04', 'Short crop'], ['short03', 'Side part'], ['short01', 'Slicked back'],
    ['afro01', 'Afro'], ['bob02', 'Bob'], ['bob01', 'Long bob'], ['long01', 'Long'], ['ponytail01', 'Ponytail'], ['braid01', 'Braid'], ['bald', 'Bald']],
  browStyle: Array.from({ length: 12 }, (_, i) => ['eyebrow' + String(i + 1).padStart(3, '0'), 'Style ' + (i + 1)]),
  eyes: [['darkbrown', 'Dark brown'], ['brownlight', 'Hazel'], ['green', 'Green'], ['bluegreen', 'Blue-green'], ['blue', 'Blue'],
    ['deepblue', 'Deep blue'], ['lightblue', 'Light blue'], ['grey', 'Grey'], ['ice', 'Ice']],
  top: [['male_casualsuit04.top', 'T-shirt'], ['male_casualsuit06.top', 'White T-shirt'], ['male_casualsuit02.top', 'Long-sleeve logo top'],
    ['female_casualsuit01.top', 'Fitted T-shirt'], ['female_casualsuit02.top', 'Short-sleeve logo tee'], ['male_casualsuit01.top', 'Button shirt'],
    ['male_casualsuit03.top', 'Striped shirt'], ['female_elegantsuit01.top', 'Striped blouse'], ['male_casualsuit05.top', 'Jacket over shirt'],
    ['male_elegantsuit01.top', 'Suit jacket'], ['male_worksuit01.top', 'Work shirt'], ['female_sportsuit01.top', 'Sports top']],
  bottom: [['male_casualsuit02.bottom', 'Jeans'], ['male_casualsuit01.bottom', 'Dark jeans'], ['female_casualsuit01.bottom', 'Skinny jeans'],
    ['male_elegantsuit01.bottom', 'Suit trousers'], ['male_worksuit01.bottom', 'Overalls'], ['female_casualsuit02.bottom', 'Denim shorts'],
    ['female_elegantsuit01.bottom', 'Skirt'], ['female_sportsuit01.bottom', 'Leggings']],
  shoes: [['shoes05', 'White sneakers'], ['shoes06', 'Blue sneakers'], ['shoes02', 'Retro sneakers'], ['shoes01', 'Brown shoes'],
    ['shoes04', 'Tan shoes'], ['shoes03', 'Black dress shoes']],
  hat: [['none', 'None'], ['fedora', 'Fedora']],
};

export const PALETTES = {
  skin: ['#fbe0cf', '#f1c9ae', '#e7b99c', '#d9a07a', '#c79673', '#a86c45', '#8a5432', '#6a4432', '#4a2a17'],
  hair: ['#0f0c0b', '#2a1c14', '#3a2a1f', '#5a3d27', '#8b6b4c', '#b08a5e', '#d8bc85', '#ece0b8', '#8c3b1e', '#b5532a', '#9a9a9a', '#e8e8e8', '#d65a9a', '#3d6fd6', '#2fa36b'],
  // 'original' keeps the garment's own photo texture
  cloth: ['original', '#111111', '#2b2b2b', '#5a5a5a', '#9a9a9a', '#f3f3f3', '#efe8da', '#c9b38f', '#7a5a3a', '#3b4a2a',
    '#1e2a4a', '#3d6fd6', '#7fb2e6', '#a3242c', '#e0524d', '#f2a3b8', '#8a5ab8', '#f2c94c', '#2fa36b'],
  metal: ['#d4a940', '#cfd2d6', '#b87333', '#1a1a1a', '#a3242c', '#3d6fd6'],
};

export const DEFAULTS = {
  arturs: {
    name: 'Arturs', gender: 'male', height: 181, build: 0.72, muscle: 0.35, shoulders: 0.55,
    skin: '#efc4a8', eyes: 'darkbrown', hairStyle: 'short02', hairColor: '#3a2a1f', browStyle: 'eyebrow002',
    faceWidth: 0.55, faceFat: 0.65, jaw: 0.5, chin: 0.45, cheekbones: 0.45, noseSize: 0.5, noseWidth: 0.5, lips: 0.5, eyeSize: 0.5,
    top: 'male_casualsuit04.top', topColor: '#161616', bottom: 'male_casualsuit02.bottom', bottomColor: '#1a1a1a',
    shoes: 'shoes06', shoesColor: '#1d1d1d', hat: 'none', hatColor: 'original',
    watch: true, watchColor: '#1a1a1a', necklace: false, necklaceColor: '#cfd2d6', bracelet: true, braceletColor: '#a3242c',
    glasses: false, earrings: false, earringColor: '#cfd2d6',
  },
  paula: {
    name: 'Paula', gender: 'female', height: 166, build: 0.42, muscle: 0.15, shoulders: 0.4,
    skin: '#f1c9ae', eyes: 'darkbrown', hairStyle: 'long01', hairColor: '#8b6b4c', browStyle: 'eyebrow010',
    faceWidth: 0.45, faceFat: 0.45, jaw: 0.45, chin: 0.5, cheekbones: 0.55, noseSize: 0.45, noseWidth: 0.45, lips: 0.6, eyeSize: 0.55,
    top: 'female_casualsuit01.top', topColor: '#121212', bottom: 'female_casualsuit01.bottom', bottomColor: '#efe8da',
    shoes: 'shoes05', shoesColor: 'original', hat: 'none', hatColor: 'original',
    watch: false, watchColor: '#cfd2d6', necklace: true, necklaceColor: '#d4a940', bracelet: true, braceletColor: '#cfd2d6',
    glasses: false, earrings: true, earringColor: '#cfd2d6',
  },
};

const valid = (list, v) => list.some(([id]) => id === v);
// make an older / partial save safe to use with the current option lists
export function sanitize(look, base) {
  const out = { ...base, ...look };
  for (const k of ['hairStyle', 'browStyle', 'eyes', 'top', 'bottom', 'shoes', 'hat']) if (!valid(OPTIONS[k], out[k])) out[k] = base[k];
  return out;
}

export function randomAppearance(r = Math.random, gender) {
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const g = gender || (r() < 0.5 ? 'male' : 'female');
  const f = g === 'female';
  const hairM = ['short01', 'short02', 'short03', 'short04', 'afro01', 'short02', 'bald'];
  const hairF = ['long01', 'bob01', 'bob02', 'ponytail01', 'braid01', 'afro01', 'long01'];
  const topsM = ['male_casualsuit01.top', 'male_casualsuit02.top', 'male_casualsuit03.top', 'male_casualsuit04.top', 'male_casualsuit05.top', 'male_casualsuit06.top', 'male_elegantsuit01.top'];
  const topsF = ['female_casualsuit01.top', 'female_casualsuit02.top', 'female_elegantsuit01.top', 'male_casualsuit06.top', 'male_casualsuit04.top'];
  const botM = ['male_casualsuit02.bottom', 'male_casualsuit01.bottom', 'male_elegantsuit01.bottom'];
  const botF = ['female_casualsuit01.bottom', 'female_casualsuit02.bottom', 'female_elegantsuit01.bottom', 'female_sportsuit01.bottom'];
  const col = () => (r() < 0.45 ? 'original' : pick(PALETTES.cloth.slice(1)));
  return {
    ...DEFAULTS[f ? 'paula' : 'arturs'],
    name: 'NPC', gender: g,
    height: f ? 155 + r() * 20 : 166 + r() * 22,
    build: 0.2 + r() * 0.65, muscle: r() * 0.7, shoulders: 0.3 + r() * 0.5,
    skin: pick(PALETTES.skin), eyes: pick(OPTIONS.eyes)[0],
    hairStyle: pick(f ? hairF : hairM), hairColor: pick(PALETTES.hair.slice(0, 11)), browStyle: pick(OPTIONS.browStyle)[0],
    faceWidth: 0.3 + r() * 0.4, faceFat: 0.2 + r() * 0.6, jaw: 0.3 + r() * 0.4, chin: 0.3 + r() * 0.4, cheekbones: 0.3 + r() * 0.4,
    noseSize: 0.3 + r() * 0.4, noseWidth: 0.3 + r() * 0.4, lips: 0.3 + r() * 0.4, eyeSize: 0.4 + r() * 0.2,
    top: pick(f ? topsF : topsM), topColor: col(), bottom: pick(f ? botF : botM), bottomColor: col(),
    shoes: pick(OPTIONS.shoes)[0], shoesColor: 'original', hat: r() < 0.08 ? 'fedora' : 'none', hatColor: 'original',
    watch: r() < 0.3, necklace: f && r() < 0.3, bracelet: r() < 0.2, glasses: r() < 0.15, earrings: f && r() < 0.5,
  };
}
