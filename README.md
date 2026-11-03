# Rīga – Arturs & Paula

An open-world 3D city game set in **Riga, Latvia**, made for a school project. It has two playable characters you can switch between, **Arturs** and **Paula**, and both can be fully customised.
It runs on **Windows 10/11 PCs** and **Android phones** (and anything else with a modern browser).

## Features
- **Riga.** A compact, drivable version of Latvia's capital (scaled down, not a street-accurate map):
  - **Vecrīga (the Old Town):**
    - cobbled streets lined with colourful gabled merchant houses, some with stepped Hanseatic gables;
    - St. Peter's Church with its tall spire and golden rooster, and Riga Cathedral (Doms);
    - Town Hall Square with the House of the Blackheads and the Roland statue;
    - the Three Brothers, the Cat House with its black cats, the Powder Tower, and Riga Castle flying the Latvian flag.
  - **The Freedom Monument** (Milda holding up three golden stars), on its plaza between the Old Town and the winding **city canal** in Bastejkalns park.
  - **The Art Nouveau centre:** blocks of Jugendstil apartment houses with bay windows, corner turrets and copper domes, plus the Orthodox Nativity Cathedral with its golden domes in Esplanāde park.
  - **The Daugava:**
    - the 11. novembra krastmala embankment promenade;
    - the **Stone Bridge** (Akmens tilts) and the cable-stayed **Vanšu bridge**, both drivable, leading to **Pārdaugava**;
    - on the far bank: the National Library ("Castle of Light"), the Saules Akmens tower, and the classic view back at the skyline.
  - **More landmarks:** the Central Market's Zeppelin hangars, the Academy of Sciences, and the TV tower on Zaķusala.
  - **Trams** run along 13. janvāra / Krišjāņa Barona iela, with overhead wires and stops.
  - **Latvian touches:** shop signs in Latvian (KAFEJNĪCA, APTIEKA, MAIZNĪCA…), linden and birch trees, historic lanterns, Latvian number plates, euros, and real Riga street names. The HUD shows where you are (e.g. *Kaļķu iela · Vecrīga*).
- **Two playable characters.** Switch between Arturs and Paula at any time with Tab or the SWITCH button.
- **Realistic people.** The characters are built from **MakeHuman** models: photographic skin, real eyes, eyelashes, eyebrows, hair and fabric textures on a 163-bone skeleton. They walk, run, breathe, blink and follow you with their eyes. All of these assets are free and public domain (CC0); see *Credits* below.
- **They notice each other's height.** People look each other in the eye: a tall character looks down, a shorter one looks up, and someone sitting is looked down at. Arturs and Paula comment on the height difference ("Did you grow again? I have to look up at you 😄"), and so do people in the street. Taller people also take longer steps.
- **Character Studio.** Customise every part of each character:
  - **Body:** body type, height (145–205 cm), build, muscle, shoulder shape, skin tone
  - **Face:** eye colour (9 colours), eye size, face width and fullness, jaw, chin, cheekbones, nose size and width, lips, 12 eyebrow styles
  - **Hair:** 10 hairstyles (short, crop, side part, slicked back, afro, bob, long bob, long, ponytail, braid) or bald, any hair colour, a fedora
  - **Mix-and-match clothing:** any of 12 tops (T-shirts, shirts, blouse, jacket over shirt, suit jacket and more) with any of 8 bottoms (jeans, skinny jeans, suit trousers, overalls, shorts, skirt, leggings) and 6 pairs of shoes. Each piece keeps its original fabric photo ("Orig") or can be re-dyed in any colour.
  - **Extras:** watch, cross necklace, bracelet, earrings, glasses
  - Looks are saved automatically. You can also change clothes in-game at the **STILS** clothing shop.
  - Body-shape sliders for chest size are intentionally not included, because the characters are based on real people.
- **Their own homes.** Arturs and Paula live across Brīvības iela from each other (blue and pink doors, also on the minimap). The character you're *not* playing is at home living their life, with their full customised look: watching TV, cooking, looking out of the window, or at a gaming desk (Arturs) or vanity mirror (Paula). Walk in through their door to visit them. They'll greet you, turn to face you, and you can talk to them.
- **A living city:** pedestrians walk the sidewalks around you, people chat in small groups, others relax on benches. They glance at you as you pass, keep their personal space, and you can press **E** to say hi (*Sveiki!*).
- **Physics:**
  - **Cars** use a tyre-grip model with weight transfer, so they have proper acceleration, braking, understeer and oversteer. Use the handbrake (Space) to drift, leaving skid marks and tyre smoke.
  - **Suspension** makes cars lean in corners, dip when braking and bounce over kerbs.
  - **Crashes** push and spin cars realistically. Hit a traffic car hard enough and it spins away.
  - **Props:** traffic cones, bins, boxes and footballs fly, tumble and roll when you drive or walk into them (kick the footballs!).
  - **Jumping** feels better: a jump buffer, a short "coyote time" after stepping off a ledge, short hops when you tap jump, a landing crouch, and smooth kerb steps.
- **Rough-and-tumble (GTA style, no gore).** You can punch pedestrians (R or left click) or knock them over with a car. They fall to the ground, lie dazed for a moment, then get back up limping (hurt leg) or holding their arm (hurt arm) and run away. People nearby run off too. There is no blood and nobody dies. Arturs and Paula can't be hurt by each other.
- **Day/night cycle:** a real sky with drifting clouds, the sun setting over the Daugava, stars and the moon at night, shadows, and lit windows and shop signs. Street lanterns cast pools of light (the nearest ones really light up the street), and your car's headlights light the road.
- **Things to do:** collect cash drops (€100 each), take delivery jobs from the **DARBS** marker (race against the clock to a named street), and use the minimap.

## Graphics settings and performance
Choose on the title screen (**Graphics:** button):
- **Low (faster):** the default on phones. Fewer people and cars, smaller shadows, no post-processing.
- **High:** the default on PCs.
  - MSAA anti-aliasing, bloom, colour grading with a vignette, and soft shadows.
  - Street-lamp lights at night.
- **Ultra:** like High, plus ambient occlusion (soft contact shadows), 4096 px shadows, and more people and traffic.

Optimisations:
- **Dynamic resolution:** if the frame rate drops, the game renders at a slightly lower resolution until it recovers.
- **Cars:** all cars of one model are drawn together (instancing), so the whole traffic takes a handful of draw calls.
- **The city** is merged into a few large meshes.
- **Pedestrians:**
  - They use cheaper materials.
  - Only nearby people cast shadows, and far-away people animate at a lower rate.
  - People further away than about 85 m aren't drawn.
- **Collisions** use a spatial grid.
- **Shaders** are compiled before the game starts, so there are no hitches the first time something appears.

## Controls
| Action | PC | Phone |
|---|---|---|
| Move | WASD / arrows | left thumb (joystick) |
| Look | mouse (click to lock) | drag with right thumb |
| Sprint | Shift | RUN (or push the stick all the way) |
| Jump / handbrake | Space | JUMP |
| Punch | R / left click | PUNCH |
| Enter / exit car | F | CAR |
| Interact (doors, wardrobe, shop, jobs, say hi) | E | USE |
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

## Building from source
```bash
npm install
npm run build      # -> dist/index.html (one self-contained file, characters included)
npm run dev        # rebuild on every change
```
The code is in `src/`:
- `mh/` – realistic characters: body shaping, clothing/hair fitting, skin/eye/hair/fabric materials, animation
- `character.js` – appearance options, Arturs' and Paula's defaults, random pedestrians
- `world.js` – Riga: streets, buildings, landmarks, the river and bridges, sky and day/night cycle
- `vehicles.js` – instanced car and tram models, driving physics, skid marks and smoke, traffic and trams
- `props.js` – cones, bins, boxes and footballs that can be knocked around
- `npcs.js` – pedestrians, chatting groups, bench sitters, greetings, knock-downs and injuries
- `interiors.js` – the two furnished apartments
- `residents.js` – what the off-duty character does at home
- `main.js` – game loop, graphics settings, Character Studio UI, HUD, missions
- `input.js` – keyboard, mouse and touch

The character data in `assets/mh/` was generated once with `tools/build_mh_assets.py` (see the comments at the top of that file for the two free sources). You only need to rerun it if you want to add more MakeHuman clothes or hairstyles.

## Credits
- Human models, skins, eyes, eyebrows, eyelashes, hairstyles and clothing: **MakeHuman** (https://github.com/makehumancommunity/makehuman), released as **CC0 1.0** (public domain). Only the official MakeHuman system assets are used.
- 3D engine: [three.js](https://threejs.org) (MIT).
- Everything else (the city, cars, trams, textures, code) is made for this project. Riga's landmarks are simplified, hand-built impressions, not copies of real 3D scans.
