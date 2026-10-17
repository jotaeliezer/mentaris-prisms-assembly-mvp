# Mentaris: Prisms of Assembly

A browser flight game. The math question is the control: you type an answer to fire. This repository is a new game. It does not modify [Mentaris - The Arith Belt](https://github.com/jotaeliezer/Mentaris--The-Arith-Belt).

Design notes live in `DESIGN.md`. Build phases live in `PLAN.md`. Copied sprites are listed in `ASSETS.md`.

## Run

From this folder:

```bash
python3 -m http.server 41731
```

Open [http://127.0.0.1:41731/](http://127.0.0.1:41731/).

The page uses ES modules, so open it through that local server. Do not open `index.html` as a file.

## How to play

- Mouse aims the nose. On a touch screen, hold a finger where you want the nose to point and the scout thrusts that way.
- `W` or `Up` thrusts. `A` / `D` or `Left` / `Right` strafe. `S` or `Down` brakes.
- Fly close to an asteroid. The nearest sum or difference lights up. Type that answer with the number keys. A correct number fires a missile and breaks the asteroid.
- `Backspace` erases a digit. `Esc` clears the whole number.
- `P` pauses. `M` mutes. `Enter` launches from the title.

## Privacy

No account, no name field, no analytics, and no third-party fonts, scripts, or CDNs. Sprites and code are served from this folder.

## Stack

Plain HTML, CSS, and JavaScript on a canvas. No build step.
