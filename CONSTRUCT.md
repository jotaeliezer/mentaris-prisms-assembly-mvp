# Construction

Players spend materials they have collected to place a floating station. The station does not fly away. It keeps one fixed spot in the belt. A base on the ground is a different build: that one sits on a planet, in `PLANETS.md`. Pieces connect to each other the way Minecraft blocks sit against blocks, except these pieces are walls and modules, not a cube grid you stack in every direction.

This is a plan. Nothing here is built.

`STATIONS.md` is the recipe rule: a count of materials, no crafting grid, and a carried Fabrication bench that unlocks harder recipes. `DESIGN.md` section 9 is the older base idea: a hub you choose a place for, paid for with asteroid materials, defensible but not safe. This file is how those two meet in the world.

## Two different builds

- **Fabrication** makes an item. The result goes to the hotbar, the cargo, or a hull slot. The Fabrication bench is this kind of build. It is already in the game.
- **Construction** places a piece in space. The piece stays where you put it. Walls, rooms, a fueling dock, a gunship, and a mega drill are this kind of build.

You fabricate the piece first, or you pay its material cost at the moment you place it. The first version should pay on placement, from the hotbar and then the cargo, the same way a recipe spends a count. There is still no shaped grid.

## The anchor

A base has one anchor. The anchor is a point on one layer: an x, a y, and a layer number. It does not drift with the asteroids.

The base is drawn as if it floats. There is no ground under it. Engines or a soft glow can sit on the underside so it reads as hovering. The anchor does not move when the ship bumps it, when the camera shakes, or when the layer transition plays. Leaving the layer and coming back puts the same pieces on the same anchor.

The player chooses the anchor by flying to an open patch and confirming the first piece. That first piece is the anchor. The layer they are on when they place it is the home layer. The station never changes layer. Q and E move the ship. They do not move the station.

Later pieces attach to the anchor or to a piece already attached. You cannot start a second base until this plan says so. One base per pilot is enough for the first version.

## Connecting pieces

Pieces join edge to edge. A wall snaps to the open end of another wall. A module snaps to a wall end or to the anchor. They do not stack upward into a tower of blocks, and they do not fill a volume. The picture is a flat chain of parts floating in the belt, the way a hallway is built by adding the next wall to the last one.

A piece that does not touch the anchor, or a chain that reaches the anchor, cannot be placed. Loose pieces in open space are not a base.

## Frame pieces

These are the cheap joints. They exist so the expensive rooms have something to connect to. Pale ore and Slate ore are enough.

| Piece | What it is | How it connects |
| --- | --- | --- |
| Wall | A straight section. The basic connector. | Snaps to the anchor or to the open end of a wall. |
| Corner | A turn, so the base is not one straight line. | Snaps to a wall end. |
| Bunker | A closed room. Stores a small overflow if the cargo is full. Not a safe zone. | Snaps to a wall end. |
| Telescope | Looks farther along the belt. A later use can highlight a distant rock of a chosen type. | Snaps to a wall end. |
| Satellite | A small dish off the anchor. A later use can mark the base on the layer map. | Snaps to the anchor only. One satellite. |

## Rooms and machines

These are the costly add-ons. Each one is a long count of different materials: several ores, at least one alloy, and, for the largest three, an alien part. They are not hand recipes. The Fabrication bench has to be installed, and the player still pays again when the piece is placed. One of each per base.

The numbers below are stand-ins so the cost feels heavy. Change them when the real recipes are chosen. Do not make them cheap.

| Piece | What it does | Stand-in cost |
| --- | --- | --- |
| Fueling dock | The ship can stop beside it and refill a fuel reserve. Flying then spends fuel instead of being free forever. Without the dock, flight stays as it is now. | 40 Pale, 24 Slate, 16 Amber, 8 Prism glass, 4 Belt iron |
| Gunship | A turret on a wall end. It fires at an alien that comes near the base. It is not a second player ship, and it does not follow the pilot. | 30 Pale, 20 Amber, 10 Virid, 6 Belt iron, 4 Void filament, 1 Spark gland |
| Mega drill | A drill head on a wall end. While the ship is at the base, a nearby rock of the chosen type can be extracted with a shorter question. The rock still has to be solved. The drill does not skip the math. | 36 Pale, 18 Slate, 12 Amber, 8 Virid, 4 Glint, 6 Belt iron, 1 Alien core |
| Layer extension | A shaft that shows a room on another layer. The home layer keeps the anchor. The extension is the only part that appears on the chosen layer, at the same x and y. | 28 Pale, 16 Slate, 12 Amber, 6 Virid, 4 Prism glass, 4 Amber resin |
| Ore vault | A room that holds a large store of ore outside the cargo. A hull breach does not drop what is inside the vault. What is still in the ship does drop. | 24 Pale, 16 Amber, 8 Virid, 4 Glint, 8 Belt iron |
| Beacon | A lamp on the anchor. Other pilots on the same layer can see the base from farther away. | 20 Pale, 10 Slate, 6 Amber, 4 Prism glass |

## Layer extensions

The station is built on one layer, and that layer is where it stays. It cannot travel between layers.

An extension is a piece of the station that is visible on a different layer. You place it from the home layer, and you pick which other layer it opens onto. Fly there with Q or E and the extension is at the same spot in the belt. The walls, the dock, the gunship, and the mega drill stay on the home layer unless that specific piece was the extension.

Each extension is one room on one other layer. A second layer needs a second extension, paid in full again. Extensions still have to connect back to the anchor on the home layer. They are not a second base.

## What the rooms cost

A room recipe uses many materials, not one stack of Pale ore. A typical room asks for:

- a large count of Pale ore
- a large count of at least one other common ore, Slate or Amber
- a smaller count of a rarer ore, Virid or Glint
- an alloy made at the bench, such as Prism glass, Belt iron, Amber resin, or Void filament
- an alien part for the gunship and the mega drill

If any one of those is missing, the piece cannot be placed. The ghost stays red. Nothing is spent until the place is confirmed.

## What the player does

1. Fly to a clear spot on the current layer.
2. Choose a piece they can afford.
3. The ghost of that piece sits on the nearest legal joint, or on empty space if this is the anchor.
4. Confirm. The materials are spent. The piece stays.
5. Fly away. The base remains at the anchor.

Fabrication on F, cargo on C, and extracting a rock all still work. Building does not open a duel and does not lock flight except for the moment of confirming a piece.

## What this is not

- Not a Minecraft world of stacked cubes. Joints are ends of walls, not every face of a block.
- Not a station you only carry. The Fabrication bench can stay in the hull slot. The floating base is a place.
- Not a dock you must enter before you can fabricate. `STATIONS.md` still says the bench is carried. Construction does not replace that.
- Not untouchable. `DESIGN.md` says aliens can still threaten a base. A bunker does not turn off damage.
- Not a station that changes layer. Only a paid extension shows on another layer. The anchor layer never moves.
- Not built yet. No place key, no ghost piece, and no saved anchor.
