# Port Solara – Arturs & Paula

An open-world 3D city game made for a school project. It has two playable characters you can switch between, **Arturs** and **Paula**, and both can be fully customised.
It runs on **Windows 10/11 PCs** and **Android phones** (and anything else with a modern browser).

## Features
- **Two playable characters.** Switch between Arturs and Paula at any time with Tab or the SWITCH button. The other one stays where you left them in the world.
- **Character Studio.** Customise every part of each character:
  - **Body:** height (145–205 cm), build, muscle, shoulder width, skin tone, body type
  - **Face:** eye colour, eye size, nose size, eyebrows, lip colour, facial hair
  - **Hair:** 11 haircuts/hairstyles (buzz, crop, quiff, curly, afro, bob, long, wavy, ponytail, bun, bald), any hair colour, caps and beanies
  - **Layered clothing:** an inner top (T-shirt, graphic tee, long sleeve, tank, lace top, button shirt) is worn *at the same time* as an outer layer (hoodie, open zip hoodie, bomber, denim jacket, leather jacket, puffer vest). Separate bottoms and shoes. Every item comes in any colour.
  - **Extras:** watch, cross necklace, bracelet, earrings, glasses
  - Looks are saved automatically. You can also change clothes in-game at the **THREADS** clothing store.
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
| Interact (store, jobs) | E | USE |
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
npm run build      # -> dist/index.html (one self-contained file)
npm run dev        # rebuild on every change
```
The code is in `src/`:
- `character.js` – procedural 3D humans, hair and clothing layers, animation
- `world.js` – the city, sky, ocean and day/night cycle
- `vehicles.js` – car models, driving and traffic
- `npcs.js` – pedestrians
- `main.js` – game loop, Character Studio UI, HUD, missions
- `input.js` – keyboard, mouse and touch

Built with [three.js](https://threejs.org). All textures are generated in code, so there are no image files to download.
