# Planets

A layer can show a huge planet. The ship can dig through it, and the player can construct a base on it. A station floats in open space. A base sits on a planet. They are not the same build.

This is a plan. Nothing here is built.

`CONSTRUCT.md` is the floating station: walls and rooms with no ground, fixed on the layer where the first piece was placed. This file is the ground. `DESIGN.md` section 9 already says a player may build among asteroids or on other planets. The floating half of that sentence is the station. The planet half is here.

## Station and base

| | Station | Base |
| --- | --- | --- |
| Where | Open space on one layer | On a planet, on that planet's layer |
| Ground | None. It only looks like it hovers. | The planet surface, or a tunnel the ship has dug. |
| Travel | Never. Q and E move the ship. | Never. The planet does not change layer, and the base does not leave the planet. |

A pilot may own one station and one base. The station does not have to exist before the base, and the base does not replace the Fabrication bench.

## How big

Size is compared with a large asteroid. A large asteroid is one whose `size` is about 170 to 190, the top of the range in `ASTEROID_TYPE.md`. "Across" means the planet's width if those rocks were set edge to edge.

| Planet | Width | What it is for |
| --- | --- | --- |
| Small | About 5 large asteroids across | The smallest planet. Room for a short tunnel and a few base pieces. |
| Great | About 20 large asteroids across | Much larger. A long dig and a full base. |
| Vast | About 50 large asteroids across | Much larger again. A landmark. Flying around it takes a while. Digging across it is a project. |

Five is the floor. A planet is never a single rock, and never a cluster of rocks pretending to be round. It is one body.

There are three sizes only. Do not spawn a fourth.

## Where they sit

A planet is placed on one layer, at one x and y, and it stays there. It does not drift with the belt. It does not travel between layers.

Not every layer has one. A cluster should show a handful, spread far apart, never on top of the ship when a session starts. Two planets on the same layer must not touch. A planet must not cover the wormhole.

The painted disc blocks the ship. Flying into the edge stops the ship the way a rock's painted silhouette does, until that spot has been dug.

## Digging

Digging is how the ship gets inside.

1. Fly up to the painted edge.
2. Start a dig on that spot. The dig asks a question, the same kind of question as an asteroid extract. A correct answer opens a short tunnel the ship can fly into. A wrong answer does not open it.
3. From inside, the next dig continues the tunnel. Each step is another question.
4. The ship can turn, stop, and fly back out along the tunnel it opened.

A tunnel is a path, not a deleted planet. The rest of the disc stays solid. Other pilots on that layer see the same tunnel, because the planet is part of the shared layer, the way a shared asteroid shrinks for everyone.

What a dig drops:

- The common yield is the same minerals as the belt, in `ASTEROID_TYPE.md`. A dig drops more than one small rock: a small planet's dig drops like a large asteroid, and a vast planet's dig drops more than that.
- The picture of the planet does not have to match one asteroid picture. The mineral can vary by dig. Pale stays the common result. Glint stays rare.
- Star dust and light rays are not planet drops. Those come from stars, in `STARS.md`.

The mega drill on a station does not dig planets. Digging is done by the ship, at the wall, with a question.

## A base on a planet

Base pieces use the same joints as the station in `CONSTRUCT.md`: edge to edge, connected back to the first piece, no loose rooms in empty space. The differences are only where they may sit.

- The first piece is the base anchor. It has to be on dug ground or on the outer surface. It cannot float beside the planet.
- Later pieces stay on that ground. A wall follows the surface or a tunnel. It does not leave the planet and become a station.
- The anchor's layer is the planet's layer. The base cannot move to another layer. A layer extension, if one is ever placed on a base, shows a room on another layer at the same x and y, and the planet itself still does not move. That extension is as expensive as the station version.
- Rooms cost the same kind of long recipe as in `CONSTRUCT.md`: many ores, an alloy, and an alien part for a gunship or a mega drill. A planet room should cost at least that much. Add star dust or a light ray from `STARS.md` once those exist, on top of the ore cost, not instead of it.

The fueling dock, gunship, mega drill, ore vault, and beacon mean the same things they mean on a station. On a planet they are rooms in the ground, not machines hanging in open space.

A base is not a safe zone. `DESIGN.md` still applies: aliens can threaten it.

## What this is not

- Not a second belt of asteroids glued into a circle.
- Not a station. If it floats in open space, it belongs in `CONSTRUCT.md`.
- Not a voxel world. Tunnels are dug paths. Rooms still join edge to edge.
- Not a way to skip the question. Every dig step is still solved.
- Not built yet. No planet body, no dig, and no ground anchor.
