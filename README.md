# Mentaris: Prisms of Assembly

A browser flight game. The math question is the control: you type an answer to fire. This repository is a new game. It does not modify [Mentaris - The Arith Belt](https://github.com/jotaeliezer/Mentaris--The-Arith-Belt).

Design notes live in `DESIGN.md`. Build phases live in `PLAN.md`. Copied sprites are listed in `ASSETS.md`.

## Run

From this folder:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually [http://127.0.0.1:5173/](http://127.0.0.1:5173/)).

Production build and local preview:

```bash
npm run build
npm run preview
```

The main path is the Vite app under `src/`. The older `python3 -m http.server` + `js/` canvas build is obsolete for day-to-day play.

## How to play

- Mouse aims the nose. On a touch screen, hold a finger where you want the nose to point and the scout thrusts that way.
- `W` or `Up` thrusts. `A` / `D` or `Left` / `Right` strafe. `S` or `Down` brakes and reverses.
- Choose Addition Drift or Subtraction Rift. Each mission uses only that operation. The world seed (letters, digits, and dashes) builds the same belt every time. Answer 5 rocks. The wormhole stays locked until the quota is met.
- With enough ore, flying into the open wormhole spends ore and jumps to the next cluster. The cost grows with how far the gate sits from where you started. A return wormhole at the destination is free. Without enough ore, reaching the gate clears the mission instead.
- `Q` drops a layer and `E` rises a layer. Layers are numbered from -250 to 250, and layer 0 is the middle. Q and E move to the neighbour and stop at the ends. The shift plays a short up or down animation. Layers do not change the mission's operation. Starting a mission, and arriving in a new cluster through a wormhole, places the ship at a seeded spot inside the belt (the same 180px edge inset as a scattered rock). The same seed always picks the same spot, and the rocks around the ship follow it.
- The belt is a large scrolling field and nothing is timed. Fly close to an asteroid to see its difficulty: one green star is easier, three amber stars are harder. The question stays hidden until you click that rock.
- Click to aim. A dashed arc shows the path. Type the answer. A correct number fires a missile that arcs into the rock.
- Open belt is practice with both operations and no wormhole. `Enter` on the title starts Addition Drift.
- A solved rock drops ore. Hard rocks drop more. Fly over the ore before it fades. Cargo is lost if the hull hits zero; banking it in fabrication keeps it.
- Bumping an asteroid costs hull. `F` opens fabrication: bank cargo, a faster drive, a sturdier hull, a math hint, or a Sector map (3 banked ore, one-shot). Ore stays in this browser session only.
- `Backspace` erases a digit. `Esc` clears the number and the aim.
- `P` pauses. `M` mutes. `Enter` launches from the title.

## Live session

Open Settings on the home menu, or the gear at the top left during flight.

- **Host** makes a 6-character code. That code is the world seed, so everyone in the session gets the same belt and layers.
- **Join** with the host's code. Launch the same mission (Addition Drift, Subtraction Rift, or Open belt) so the rocks line up. Joining during a flight rebuilds the belt from that code.
- Other ships on your layer appear with a tag such as `P2`, and drop off when that player leaves. Ships on another layer stay hidden.
- Copy sits next to the code in flight, with the number of players connected.
- Each player's rocks, missiles, and ore stay on their own ship. Only the ships move together.

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, Host and Join stay off and the game keeps working alone. See `.env.example`.

## Privacy

No account, no name field, and no analytics. Tags in a live session are `P1`, `P2`, and so on, generated in the browser. The optional Supabase client is bundled with the app and connects only when the public URL and anon key are set. It sends ship position, rotation, layer, and that tag. It does not load a third-party font or a script from a CDN. Sprites are served from this project. Without those env vars, the game never contacts Supabase.

## Stack

Vite, Phaser 3, and React 18 overlays. Live sessions use `@supabase/supabase-js` Realtime when the public env vars are set. Game logic and rendering live under `src/`; React mounts the HUD, title, and fabrication UI on top of the Phaser canvas.
