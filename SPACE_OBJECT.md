# Space objects

Large things that occupy a layer besides asteroids, planets, and stars. The ship can fly among them. Some pull, some hide the way back, some can be looted.

This is a plan. Nothing here is built.

Planets are `PLANETS.md`. Stars, star dust, and light rays are `STARS.md`. The floating station is `CONSTRUCT.md`. The wormhole that leaves a cluster is already in the game. It is a gate, not one of the objects below.

`DESIGN.md` section 11 already names nebulas that blind a trajectory, other planets, and bright stars. This file says how the nebula behaves, and what else belongs in that same family.

## Black hole

A black hole is a dark core with a dim ring. It stays fixed on its layer. It is rare: most layers have none, and a layer never has two.

It pulls things toward the core slowly and weakly.

- At the outer rim the pull is a drift. A ship that keeps thrusting away, with W, leaves it.
- Closer in, the pull is stronger, still slow enough that thrusting away works. Stopping is what gets a ship dragged inward.
- Asteroids and loose minerals inside the rim drift toward the core. They are not deleted the moment they enter the rim.
- A station, a planet, and a star are never placed inside the rim, and the pull does not move them.

If the ship reaches the core, the hole spits it back out at the rim, on the same layer, and the hull takes one hard hit. It does not change the ship's layer, does not take the cargo, and does not end the session. The way out is always to fly away before that.

The pull does not affect a ship on another layer. An extension room that happens to share the x and y is on a different layer and is left alone.

## Nebula

A nebula is a cloud. It takes up a lot of space: wider than a vast planet, and tall enough that flying around it is a real trip. It stays on its layer. It does not move.

It behaves like a cloud bank, not like a wall.

- The ship can fly in front of it. In front, the ship draws over the cloud and looks normal.
- The ship can fly behind it. Behind, the cloud draws over the ship. The ship is dimmer, and the belt behind the cloud is dimmer too.
- Crossing the cloud swaps that depth. Entering from the near side puts the ship in front. Pushing through the thick middle puts the ship behind. Coming back through the middle puts the ship in front again. No extra key.

Getting lost means losing the visual track, not losing control.

- While the ship is inside, the path it just flew fades quickly, so the wake cannot be followed back out by eye.
- Stars and asteroids on the far side of the cloud are hidden or barely there.
- The layer map, if it is installed, fogs the cloud's region. The ship's own marker stays.
- Thrust, turn, and the layer jumper still work. The nebula does not spin the ship, does not take materials, and does not move the ship to a random point.

A nebula can hide a stronghold or a star on its far side. That is a reason to go through, not a trap that ends the flight.

## Abandoned alien stronghold

A stronghold is a ruined alien post, already empty of a fight. It sits fixed on one layer. It is larger than a large asteroid and smaller than a small planet. The ship docks by flying into an open bay. There is no question to enter.

What can be looted is alien-related only. It does not drop Pale, Slate, Amber, Virid, or Glint, and it does not drop star dust.

| Loot | What it is |
| --- | --- |
| Alien core | The same part a broken alien drops in `FREE_COMBAT.md`. Used in the heaviest weapon and room recipes. |
| Hull shard | The same part. A hull or armor ingredient. |
| Spark gland | The same part. A gunship and energy-weapon ingredient. |
| Alien chart | A one-use note. Shows the layer and the direction of another stronghold, or of a black hole, in this cluster. |
| Cold lamp | A small alien light. A fabrication ingredient for the beacon and for night-bright hull work. It is not a weapon. |

Each container in the ruin holds one of those, once. A second pilot on the same seed finds it already taken if the first pilot took it. The ruin stays. It does not respawn a full set of loot on a timer in the first version.

The stronghold is abandoned, so it does not shoot. A later alien spawn clock may still send an alien near it. The building itself stays quiet. Looting does not open the zoom duel in `ALIEN_COMBAT.md`.

## What else belongs here

These are the other objects worth having in the same set. Each one is fixed on a layer, or crosses a layer on a path, and each one does one job.

| Object | What it does |
| --- | --- |
| Comet | A small bright body that crosses the layer on a long arc, then is gone. Its tail leaves a line of dust the ship can fly through once. That dust is comet dust, a fourth dust, used like cinder dust in `STARS.md`. It is not a star, and it does not stay. |
| Debris field | A wide scatter of broken hull plates. Smaller than a nebula. Flying through it can bump the ship, lightly, more than once. Plates can be collected as salvage, a common construction material that is weaker than ore and cannot replace an alloy. |
| Ion stream | A long river of pale current, thinner than a nebula and much longer than a light ray. While the ship is in it, the stream pushes one direction. Thrust still wins if the pilot flies against it. It does not hide the belt. |
| Relay buoy | A dead marker with a faint blink. Flying close to it points a heading toward the nearest wormhole, stronghold, or planet on that layer. It is not loot. One use per visit, then it rests. |
| Prism ring | A thin ring of light in open space, with nothing in the middle. Flying through the ring once grants a single soft ray, from `STARS.md`. The ring then goes dark until it rests. It is not a wormhole and does not change layer. |

That is the full set for this plan: black hole, nebula, stronghold, comet, debris field, ion stream, relay buoy, prism ring.

## How rare

Rarity is per layer, rolled when that layer is first filled, from the same kind of seed the belt already uses.

| Object | How often |
| --- | --- |
| Nebula | The common large object. Many layers have one. Some have two, far apart. |
| Debris field | Common. Often near a nebula's edge. |
| Ion stream | Common. One is enough on a layer. |
| Relay buoy | Uncommon. A trail of them is how a pilot finds a gate or a ruin. |
| Prism ring | Uncommon. |
| Comet | Uncommon. It is an event on a timer, not a fixed landmark. |
| Stronghold | Rare. A few in a cluster, not one on every layer. |
| Black hole | The rarest. Some clusters may have only one. |

None of these spawn on top of the ship. None of them cover the wormhole. A black hole's rim must not cover a planet or a station anchor.

## What this is not

- Not planets, stars, or asteroids. Those have their own files.
- Not the cluster wormhole. A black hole does not advance the cluster. A prism ring does not either.
- Not a damage zone the pilot cannot leave. The black hole can be flown out of. The nebula can be flown out of. The ion stream can be flown against.
- Not a second combat mode. Strongholds are looted, not sieges.
- Not built yet. No pull, no cloud depth, and no ruin.
