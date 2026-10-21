# Alien combat

One alien at a time. The fight uses the same math question as extraction. The view zooms in a little, and the ship, the alien, and any shots move in slow motion. The question itself stays at full speed, so typing does not feel heavy.

This is the flow. It is not built yet. Aliens stay out of the belt until a spawn clock exists.

## When a fight starts

A spawn clock, decided later, puts one alien near the ship. A second alien does not appear until this one is gone.

The alien closes to a set range and the fight opens.

- Flight controls lock. Cargo, fabrication, and layer jump wait.
- The camera eases in, the way an extract frames the ship and the rock, until both the ship and the alien are in view.
- Ship, alien, and projectile motion run at a slow scale. The numpad does not.

If another pilot is in the session, they see the alien and the slowed ship. They do not get the question. Only the pilot the alien approached fights it.

## One question, one committed action

Each question is a short one. Smaller numbers than a hard extract. The belt stays untimed, so the question has no countdown. "Faster" means a shorter problem, not a clock.

When the question appears, the alien has already chosen what it is doing. That choice does not change while the player is typing.

- **Incoming.** The alien is firing. The question is labeled Incoming.
- **Open.** The alien is not firing. The question is labeled Open.

A correct answer answers that label, and only that label.

### Incoming, answered correctly

The ship defends.

- If the ship is carrying a crafted weapon, it fires one intercept. In slow motion the alien shot and the ship's shot meet and cancel.
- If the ship is not carrying a crafted weapon, the ship dodges. The alien shot passes through the space the ship just left.

The defense is not a coin flip. A carried weapon intercepts. No weapon dodges.

### Open, answered correctly

The ship fires at the alien. The shot is the duel gun, not the Arc missile, so it does not friendly-fire another pilot. Three correct shots break the alien, the same count as three extracts on a rock.

### Answered wrong

- Incoming: the alien shot hits the hull. One rock-sized bump, not a kill by itself.
- Open: the ship's shot misses. The next question is Incoming, so ignoring the alien lets it fire.

Esc during Incoming counts as a wrong answer. Esc during Open closes the fight and the alien breaks off.

## When it ends

The alien breaks after three hits, or it breaks off. The zoom eases back, slow motion ends, and flight controls return.

A broken alien does not drop Pale ore or Amber ore. It drops the part named for that picture in `ALIENS.md`. The ship picks that part up like a mineral. The Core cannon, made at the Fabrication bench, spends an Alien core. The same drops apply if the free-roam fight in `FREE_COMBAT.md` is the one that gets built.

The spawn clock may bring another alien later. Never two at once.

## What this does not include

- No second question UI. The extract numpad is the combat numpad.
- No timer on the question in this version.
- No Pale ore or Amber ore from an alien. The drop is the part named in `ALIENS.md`.
- No alien on screen until the spawn clock is actually built.
