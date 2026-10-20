# Roadmap

What is already in the game, then the work that is still only written down. The next steps are ordered from the smallest build to the largest. Design notes stay in their own files. This list is the order to build them.

## Already in the game

- Flight, extract questions, shrink, and ore you pick up by flying over it.
- Five asteroid pictures. Each picture drops its own mineral. Size and a hard question change the count. Rarer pictures spawn less often. See `ASTEROID_TYPE.md`.
- Hotbar, cargo on C, drag between them, and a name when you hover a slot.
- Fabrication on F. Prism glass and the Fabrication bench are hand recipes. Carrying the bench, in the hull panel, opens the rest. See `STATIONS.md`.
- Hull panel on R for the layer jumper and the fabrication bench. Q and E need the jumper installed there.
- Launch fades through black, asteroids, stars, then the ship and HUD.
- Pilot name on the title screen and at the top right.
- Live ships on one seed. Shots, shrinks, ore pickups, and a drill while extracting are visible to the other pilot. A crafted weapon can hit the other ship.
- One-line craft toasts, plus the first "hold W" and "open cargo" lines from `TUTORIAL.md`.

## Next, easiest first

1. **Finish the tutorial lines in `TUTORIAL.md`.** Still missing: the first rock hint is only the bottom hint, not a toast; a full hotbar does not yet say to press C; the first hull breach does not get its own toast. Each one is a single sentence on the toast queue.
2. **Recipes for Slate, Virid, and Glint.** They can be stored and have no use. One count recipe each, behind the bench, is enough. Do not invent a second bench.
3. **Hull pieces from `HULL.md`.** R already opens a panel, but only for the jumper and the bench. The four worn slots, their one stat each, and levels 1 to 3 are not built. Bow plating is the smallest first slot.
4. **Icons from `FABRICATOR_ICONS.md`.** Generate one transparent PNG per item, using `ART_STYLE.md`, and show it in the slot instead of the two-letter mark. Do them in ladder order: Pale, Slate, Amber, Virid, Glint, then the bench and the jumper.
5. **Alien parts, still with no alien on screen.** Add Alien core, Hull shard, and Spark gland as items, and one strong weapon whose recipe spends a core. The spawn clock stays off. `FREE_COMBAT.md` and `ALIEN_COMBAT.md` both use these drops.
6. **Free combat commands from `FREE_COMBAT.md`.** Shift dash and hold-Space block, while extract and fabrication stay available. No question, no zoom, no slow motion.
7. **One alien in the belt.** A spawn clock, one alien at a time, three hits to break, and the part drop from step 5. Free combat is the first fight. The zoom duel in `ALIEN_COMBAT.md` is a later alternate, not a second alien.
8. **The duel version.** Zoom, slow motion of the ship and alien, Incoming or Open locked when the question appears. Only after free combat is already understandable.
9. **More stations.** `STATIONS.md` stops at one bench. A later station is a new carried part that reveals one new list. Not before the alien parts have a home.
10. **Achievements.** There is no achievements file. When there is one, each achievement uses the same toast as `TUTORIAL.md`.

## Leave for later

- A second crafting grid. Recipes stay counts.
- Timed extract questions. The belt stays untimed.
- Sharing cargo or hull between pilots. Live play shares the world actions above, not inventories.
- The old right-side macOS-style dock in the first draft of this file. The hotbar on the right is the selector.
