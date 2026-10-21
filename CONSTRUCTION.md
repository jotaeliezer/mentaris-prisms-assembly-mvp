# Construction

This file is the only spec for strength, edges, joins, and recipes. [`CONSTRUCT.md`](CONSTRUCT.md) points here.

A piece is fabricated into cargo or the hotbar. That craft spends the recipe. A click in space then places one piece from the selected hotbar slot. Placement does not spend the ores again.

## How the player builds

Placement is Minecraft-style.

1. Fabricate the piece. It goes into cargo or the hotbar.
2. Scroll the hotbar to select that stack.
3. The cursor is a crosshair.
4. Click in space. One piece leaves the selected hotbar slot and stays where it was put.

Empty space is legal. A click that joins nothing still places the piece, with `connections: []`.

Nearby edges snap. Ends are tip points, so the snap is tip to tip. Two tips under 28 apart snap together, and that same distance marks a tip as taken. There is no 260 ship search.

The first successful place is the station anchor on the current layer. Later places must be on that same layer. The station does not change layer. In this pass the extension does not appear on another layer.

The player can build freely. The station may branch. It is not one corridor.

## Shared measures

- Span stays 110. Half a span is 55.
- Ends are tip points.
- Snap and taken are tip distance under 28.
- No 260 ship search.

## Piece fields

A placed piece stores:

- `uid`
- `id`
- `x`
- `y`
- `rot`
- `layer`
- `strength`
- `connections`

`id` is the recipe id in the tables below. `layer` is the anchor layer. `connections` is the list of other piece uids joined to this one. `strength` starts at the value in the tables.

A hit reduces strength. The piece is removed at 0.

## Edges

Tips are written in local space, then turned by `rot`.

- **Wall.** A thin bar. Two tips at ±span/2 along `rot`.
- **Panel.** A quadrilateral plane (a wide flat quad). Four edge midpoints: (±span/2, 0) and (0, ±22) in local space. The long tips sit at ±55. The short tips sit 22 to either side, not at half a span.
- **Corner.** Two ends: one along `rot`, one perpendicular to `rot`.
- **Every other module, including satellite and beacon.** Two opposite tips at ±span/2 along `rot`.

## Joins

- A wall connects only to a wall or a panel.
- A panel connects only to a wall or a panel.
- Any other piece may connect to any piece that exposes an end.
- A hit records both uids. Each piece's `connections` list gains the other's `uid`.
- A miss still places, with `connections: []`.

## Bench gate

A recipe with `station: 'bench'` opens only while the Fabrication bench is carried in a hull slot. `recipeOpen` checks that with `hullHas`. A recipe with no `station` field is open in the hand.

`station: 'bench'`: wall, panel, and the six rooms — dock, gunship, drill, extension, vault, beacon.

No `station` field, so they can be crafted by hand: corner, bunker, telescope, and satellite.

## Once, at place time only

Place once: satellite, dock, gunship, drill, extension, vault, beacon.

May repeat: wall, panel, corner, bunker, telescope.

Crafting does not enforce once. A once-piece can be fabricated again. The limit applies when the piece is placed.

## Recipes

Cost ids are the hold ids: `pale` (Pale ore), `slate` (Slate ore), `amber` (Amber ore), `virid` (Virid ore), `glint` (Glint ore), `glass` (Prism glass), `iron` (Belt iron), `resin` (Amber resin), `filament` (Void filament), `gland` (Spark gland), `core` (Alien core). `wall` and `panel` are crafted first, then spent by the assembled recipes.

### Wall and panel

Both are repeatable, and both use the bench.

| Id | What it is | Cost | Station | Place | Strength |
| --- | --- | --- | --- | --- | --- |
| `wall` | A thin bar. The straight connector. | 4 Pale + 2 Slate | `bench` | repeatable | 6 |
| `panel` | A quadrilateral plane (a wide flat quad). | 2 Pale + 4 Slate | `bench` | repeatable | 8 |

### Assembled pieces

These ten recipes keep the material tails below and add the wall and panel counts on the same line.

| Id | What it is | Edges | What it can join | Cost | Station | Place | Strength |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `corner` | A turn, so the build can branch off a straight run. | One end along `rot`, one end perpendicular to `rot`. | Any piece that exposes an end. | 4 pale + 2 slate + 1 wall + 1 panel | none | repeatable | 8 |
| `bunker` | A closed room on the station. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 8 pale + 4 slate + 2 wall + 1 panel | none | repeatable | 14 |
| `telescope` | A scope pointed along the belt. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 6 pale + 2 slate + 1 wall + 1 panel | none | repeatable | 8 |
| `satellite` | A small dish. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 6 pale + 4 slate + 1 wall + 1 panel | none | once, place time only | 8 |
| `dock` | A fueling dock. Refueling is a later job. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 40 pale + 24 slate + 16 amber + 8 glass + 4 iron + 2 wall + 2 panel | `bench` | once, place time only | 20 |
| `gunship` | A turret housing fixed to the station. Firing is a later job. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 30 pale + 20 amber + 10 virid + 6 iron + 4 filament + 1 gland + 2 wall + 1 panel | `bench` | once, place time only | 16 |
| `drill` | A drill head fixed to the station. Shorter questions are a later job. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 36 pale + 18 slate + 12 amber + 8 virid + 4 glint + 6 iron + 1 core + 2 wall + 2 panel | `bench` | once, place time only | 18 |
| `extension` | An extension module. It stays on the anchor layer in this pass. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 28 pale + 16 slate + 12 amber + 6 virid + 4 glass + 4 resin + 2 wall + 1 panel | `bench` | once, place time only | 12 |
| `vault` | A heavy store room. Storing ore outside the cargo is a later job. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 24 pale + 16 amber + 8 virid + 4 glint + 8 iron + 2 wall + 2 panel | `bench` | once, place time only | 16 |
| `beacon` | A lamp. Beacon sight is a later job. | Two opposite tips at ±span/2 along `rot`. | Any piece that exposes an end. | 20 pale + 10 slate + 6 amber + 4 glass + 1 wall + 1 panel | `bench` | once, place time only | 8 |

Corner, bunker, telescope, and satellite have no `station` field.

## Later, not this pass

This pass places the pieces, joins them, and tracks strength. Full room jobs wait:

- Fuel, on the dock.
- Turret fire, on the gunship.
- Shorter questions, on the drill.
- Vault storage outside the cargo.
- Beacon sight.

The extension does not appear on another layer in this pass.
