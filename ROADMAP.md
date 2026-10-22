# Roadmap

What is already in the game, then the work that is still only written down. The next steps are ordered from the smallest build to the largest. Design notes stay in their own files. This list is the order to build them.

## Already in the game

- Flight, extract questions, and a shrink on the first two correct answers. The third answer destroys the rock with an explosion, then the crystals pop out one at a time. You pick them up by flying over them.
- Five asteroid pictures. Each picture drops its own mineral. Size and a hard question change how many crystals fall. Rarer pictures spawn less often. See `ASTEROID_TYPE.md`.
- The extract pad names the rock, uses one pixel face, and a click outside it returns to flight. Hovering a rock shows one star or three.
- Hotbar, cargo on C, drag between them, and a name when you hover a slot. A held stack follows the cursor until it is placed.
- Fabrication on F. Immediate Fabrication is Prism glass and the Fabrication bench. The bench, worn in the hull panel, opens the rest. See `STATIONS.md`.
- One count recipe each for Slate, Virid, and Glint, behind the Fabrication bench. Slate wire, Virid foil, and a Glint gem can be stored. They have no use.
- The hull panel stays on screen in flight, on the left edge. It holds the layer jumper, the fabrication bench, and the layer compass. The compass is a line for this layer, with the ship as a dot and the layer number in bold beside it. Q and E need the jumper installed there.
- Bow plating in that panel. One worn slot. A rock hit does less damage, and that piece can be raised from level 1 to 3. A worn part lights up, and an empty slot stays dim. The other three armor slots are still waiting. See `HULL.md`.
- Launch fades through black, asteroids, stars, then the ship and HUD. The ship draws a little larger, with nearest-neighbor pixels so the hull lines stay put while it moves.
- Pilot name on the title screen and at the top right. Assemblies can be saved for a signed-in account, or kept on this browser. See the home menu.
- A hull breach plays the explosion first. Game over then appears, centered, in red, with the cause under the title.
- Live ships on one seed. Shots, shrinks, ore pickups, and a drill while extracting are visible to the other pilot. A crafted weapon can hit the other ship.
- Toasts drop in at the top in neon blue. The bottom hint is a larger neon-green line that types itself out. The first "hold W" and "open cargo" lines from `TUTORIAL.md` are in.
- When the hotbar fills, one toast says to press C. The first rock stays the bottom hint, and the first breach stays the game-over line.
- Ore and weapon slots show a picture instead of the two-letter mark. Each ore is a smaller copy of its asteroid picture. Weapons reuse the bullet images already in the game. Alloys and abilities still use the two-letter mark. See `FABRICATOR_ICONS.md`.
- Alien parts can be stored: Spark gland, Grip fiber, Hull shard, Cold lamp, Servo joint, Spike crystal, Alien chart, and Alien core. Each has a picture taken from the alien that drops it. The Core cannon is made at the bench from one Alien core, two Belt iron, and one Prism glass, and that recipe stays hidden until a core is in the hold. The main star's name comes from the seed and is shared by every cluster. Its arc stays on the flight view. While the sun is up, one alien can leave the lair on the arrival layer. Three hits break it, and a Core cannon hit counts as two. The part falls beside the wreck. See `ALIENS.md`.
- A flight can be saved from the pause menu onto this browser, with no account. The title lists those flights, and Continue launches the same belt. See the home menu.
- Milestones. Odd feats, not one per fabrication and not the basic goals. Each one toasts once at the top. A saved flight keeps them. See `MILESTONES.md`.
- The fabrication card follows the cursor and sits above the bay, instead of inside the scrolling panel.
- Layer stars sit in the belt. The first pass through a halo shakes loose one mote of that star's dust. Rays are not built yet. See `STARS.md`.

## Next, easiest first

1. **Free combat commands from `FREE_COMBAT.md`.** Shift dash and hold-Space block, while extract and fabrication stay available. An alien can already be in the belt. Dash and block are the next fight tools. No zoom, no slow motion.
2. **The duel version in `ALIEN_COMBAT.md`.** Zoom, slow motion, Incoming or Open locked when the question appears. Only after free combat is already understandable.
3. **The rest of star dust and light rays from `STARS.md`.** One halo mote is already in. Still to build: the drifting cloud, the beams, and one bench recipe that spends Pale dust. Hand recipes stay ore only.
4. **One more carried station from `STATIONS.md`.** A new hull part that reveals one new recipe list. Not a floating base.
5. **The floating station frame from `CONSTRUCT.md`.** One anchor on the layer where you place it, plus walls that snap end to end. No fueling dock, gunship, or mega drill yet. The station does not change layer.
6. **The costly rooms in `CONSTRUCT.md`.** Fueling dock, gunship, mega drill, layer extension, ore vault, and beacon. Each one is a long recipe. Build them only after the frame can hold a joint.
7. **One small planet from `PLANETS.md`.** The smallest size, about five large asteroids across. The ship can dig a tunnel with a question. A ground base waits until a tunnel exists. Great and vast planets come after the small one works.
8. **The rest of the space objects from `SPACE_OBJECT.md`.** The lair is on the arrival layer, and debris, the ion stream, the prism ring, the comet, and the stronghold can already be found. Still to build: the nebula, the black hole, and the relay buoy. Do not start that set before the planet dig is understandable.

## Leave for later

- A second crafting grid. Recipes stay counts.
- Timed extract questions. The belt stays untimed.
- Sharing cargo or hull between pilots. Live play shares the world actions above, not inventories.
- The old right-side macOS-style dock. The hotbar on the right is the selector.
- A custom From address on the welcome mail. The confirm-signup template is in `supabase/templates/confirmation.html`. The built-in sender stays Supabase's until SMTP is added.
