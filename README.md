# Port Solara – Arturs & Paula

An open-world 3D city game made for a school project. It has two playable characters you can switch between, **Arturs** and **Paula**, and both can be fully customised.
It runs on **Windows 10/11 PCs** and **Android phones** (and anything else with a modern browser).

## Features
- **Two playable characters.** Switch between Arturs and Paula at any time with Tab or the SWITCH button. The other one stays where you left them in the world.
- **Realistic people.** The characters are built from **MakeHuman** models: photographic skin, real eyes, eyelashes, eyebrows, hair and fabric textures on a 163-bone skeleton. They walk, run, breathe, blink and follow you with their eyes. All of these assets are free and public domain (CC0); see *Credits* below.
- **Character Studio.** Customise every part of each character:
  - **Body:** body type, height (145–205 cm), build, muscle, shoulder shape, skin tone
  - **Face:** eye colour (9 colours), eye size, face width and fullness, jaw, chin, cheekbones, nose size and width, lips, 12 eyebrow styles
  - **Hair:** 10 hairstyles (short, crop, side part, slicked back, afro, bob, long bob, long, ponytail, braid) or bald, any hair colour, a fedora
  - **Mix-and-match clothing:** any of 12 tops (T-shirts, shirts, blouse, jacket over shirt, suit jacket and more) with any of 8 bottoms (jeans, skinny jeans, suit trousers, overalls, shorts, skirt, leggings) and 6 pairs of shoes. Each piece keeps its original fabric photo ("Orig") or can be re-dyed in any colour.
  - **Extras:** watch, cross necklace, bracelet, earrings, glasses
  - Looks are saved automatically. You can also change clothes in-game at the **THREADS** clothing store.
- **Their own homes.** Arturs and Paula live in apartments across the street from each other (blue and pink doors, also on the minimap). The character you're *not* playing is at home living their life, with their full customised look: watching TV on the sofa, cooking, looking out of the window, or at a gaming desk (Arturs) or vanity mirror (Paula). Walk in through their door to visit them. They'll greet you, and you can talk to them. Pressing **Tab** sends your current character home and puts you in control of the other one in their apartment. Each apartment has a wardrobe where you can change clothes.
- **A living city:** realistic pedestrians walk the sidewalks around you, people chat in small groups, others relax on park and beach benches. They glance at you when you walk past, and you can press **E** to say hi (they wave back with a speech bubble).
- **Port Solara city:** a downtown with glass towers, pastel neighbourhoods, parks, a beach promenade with palm trees, the ocean, and neon signs.
- **Day/night cycle:** a real sky, a moving sun, shadows, building windows that light up at night, street lamps, car headlights and bloom.
- **Cars:** get into any car (parked or in traffic) and drive it. Traffic drives around the city and pedestrians walk the sidewalks.
- **Things to do:** collect cash drops ($100 each), take delivery jobs from the **JOBS** marker (race against the clock), and use the minimap.

## Controls
| Action | PC | Phone |
|---|---|---|
| Move | WASD / arrows | left thumb (joystick) |
| Look | mouse (click to lock) | drag with right thumb |
| Sprint | Shift | RUN (or push the stick all the way) |
| Jump / handbrake | Space | JUMP |
| Enter / exit car | F | CAR |
| Interact (doors, wardrobe, store, jobs, say hi) | E | USE |
| Switch character | Tab / Q | SWITCH |
| Pause | Esc / P | II |

## How to play it

### Windows 10/11 (easiest)
1. Download `dist/index.html` from this repository.
2. Double-click it. It opens in Edge or Chrome and works offline. It is a single file with no install and no internet needed.

### Android
1. Put the game online for free with GitHub Pages: in the repository go to **Settings → Pages → Source: GitHub Actions**, then merge into `main`. The included workflow (`.github/workflows/pages.yml`) builds and publishes it.
2. Open the Pages link in **Chrome** on the phone, then tap **⋮ → Add to Home screen / Install app**.
   It then opens full-screen like a normal app and works offline.

(On Windows you can also install the Pages link as an app with Edge or Chrome: **⋯ → Apps → Install**.)

The game picks **Low graphics** automatically on phones. You can toggle High/Low on the title screen.

## Building from source
```bash
npm install
npm run build      # -> dist/index.html (one self-contained file, characters included)
npm run dev        # rebuild on every change
```
The code is in `src/`:
- `mh/` – realistic characters: body shaping, clothing/hair fitting, skin/eye/hair/fabric materials, animation
- `character.js` – appearance options, Arturs' and Paula's defaults, random pedestrians
- `world.js` – the city, sky, ocean and day/night cycle
- `vehicles.js` – car models, driving and traffic
- `npcs.js` – pedestrians, chatting groups, bench sitters, greetings
- `interiors.js` – the two furnished apartments
- `residents.js` – what the off-duty character does at home
- `main.js` – game loop, Character Studio UI, HUD, missions
- `input.js` – keyboard, mouse and touch

The character data in `assets/mh/` was generated once with `tools/build_mh_assets.py` (see the comments at the top of that file for the two free sources). You only need to rerun it if you want to add more MakeHuman clothes or hairstyles.

## Credits
- Human models, skins, eyes, eyebrows, eyelashes, hairstyles and clothing: **MakeHuman** (https://github.com/makehumancommunity/makehuman), released as **CC0 1.0** (public domain). Only the official MakeHuman system assets are used.
- 3D engine: [three.js](https://threejs.org) (MIT).
- Everything else (city, cars, textures, code) is made for this project.
