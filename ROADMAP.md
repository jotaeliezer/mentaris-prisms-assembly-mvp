# Roadmap

What is already in the game, then the work that is still only written down. The next steps are ordered from the smallest build to the largest. Design notes stay in their own files. This list is the order to build them.

## Already in the game

- Flight, extract questions, and a shrink on the first two correct answers. The third answer destroys the rock with an explosion, then the crystals pop out one at a time. You pick them up by flying over them.
- Five asteroid pictures. Each picture drops its own mineral. Size and a hard question change how many crystals fall. Rarer pictures spawn less often. See `ASTEROID_TYPE.md`.
- The extract pad names the rock, uses one pixel face, and a click outside it returns to flight. Hovering a rock shows one star or three.
- Hotbar, cargo on C, drag between them, and a name when you hover a slot. A held stack follows the cursor until it is placed.
- Fabrication on F. Prism glass and the Fabrication bench are hand recipes. The bench, worn in the hull panel, opens the rest. See `STATIONS.md`.
- Hull panel on R for the layer jumper, the fabrication bench, and the layer compass. The compass is a line for this layer, with the ship as a dot and the layer number in bold beside it. Q and E need the jumper installed there.
- Launch fades through black, asteroids, stars, then the ship and HUD. The ship draws a little larger, with nearest-neighbor pixels so the hull lines stay put while it moves.
- Pilot name on the title screen and at the top right. Assemblies can be saved for a signed-in account, or kept on this browser. See the home menu.
- A hull breach plays the explosion first. Game over then appears, centered, in red, with the cause under the title.
- Live ships on one seed. Shots, shrinks, ore pickups, and a drill while extracting are visible to the other pilot. A crafted weapon can hit the other ship.
- Toasts drop in at the top in neon blue. The bottom hint is a larger neon-green line that types itself out. The first "hold W" and "open cargo" lines from `TUTORIAL.md` are in.

## Next, easiest first

1. **The full-hotbar line from `TUTORIAL.md`.** When the hotbar fills, one toast says to press C. The first rock stays the bottom hint, and the first breach stays the game-over line. Do not add a second speech on top of those.
2. **One recipe each for Slate, Virid, and Glint.** They can be stored and have no use. One count recipe each, behind the bench, is enough. Do not invent a second bench.
3. **Ore and weapon icons from `FABRICATOR_ICONS.md`.** Ores are smaller copies of the matching asteroid picture. Weapons reuse the bullet images already in the game. Show those in the slot instead of the two-letter mark. Leave alloys and abilities for a later pass.
4. **Bow plating from `HULL.md`.** R already opens. Add one worn slot, one stat (less damage from a rock), and levels 1 to 3 for that slot only. The other three armor slots wait.
5. **Alien parts, still with no alien on screen.** Add Alien core, Hull shard, and Spark gland as items, and one strong weapon whose recipe spends a core. `FREE_COMBAT.md` and `ALIEN_COMBAT.md` both use these drops. The spawn clock stays off.
6. **Free combat commands from `FREE_COMBAT.md`.** Shift dash and hold-Space block, while extract and fabrication stay available. No alien yet, no zoom, no slow motion.
7. **One alien in the belt.** A spawn clock, one alien at a time, three hits to break, and the part drop from step 5. Free combat is the first fight.
8. **The duel version in `ALIEN_COMBAT.md`.** Zoom, slow motion, Incoming or Open locked when the question appears. Only after free combat is already understandable.
9. **Star dust and light rays from `STARS.md`.** These are pickups, like ore: fly to a star, fly through the dust or the beam, and store the item. They do not build a station. Hand recipes stay ore only. The first use is one bench recipe that spends Pale dust.
10. **One more carried station from `STATIONS.md`.** A new hull part that reveals one new recipe list. Not a floating base. Not before the alien parts have a home.
11. **Achievements.** There is no achievements file. Write one, and show each achievement with the same top toast as `TUTORIAL.md`.
12. **The floating station frame from `CONSTRUCT.md`.** One anchor on the layer where you place it, plus walls that snap end to end. No fueling dock, gunship, or mega drill yet. The station does not change layer.
13. **The costly rooms in `CONSTRUCT.md`.** Fueling dock, gunship, mega drill, layer extension, ore vault, and beacon. Each one is a long recipe. Build them only after the frame can hold a joint.
14. **One small planet from `PLANETS.md`.** The smallest size, about five large asteroids across. The ship can dig a tunnel with a question. A ground base waits until a tunnel exists. Great and vast planets come after the small one works.
15. **Space objects from `SPACE_OBJECT.md`.** Start with the nebula: a large cloud the ship can fly in front of and behind. Then the black hole, the abandoned stronghold, and the smaller objects (comet, debris, ion stream, relay buoy, prism ring). This is the largest set. Do not start it before the planet dig is understandable.

## Leave for later

- A second crafting grid. Recipes stay counts.
- Timed extract questions. The belt stays untimed.
- Sharing cargo or hull between pilots. Live play shares the world actions above, not inventories.
- The old right-side macOS-style dock. The hotbar on the right is the selector.
- A custom From address on the welcome mail. The confirm-signup template is in `supabase/templates/confirmation.html`. The built-in sender stays Supabase's until SMTP is added.
