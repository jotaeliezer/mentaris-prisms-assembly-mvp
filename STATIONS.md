# Stations

Fabrication stays a list of counts. There is no crafting grid. A station is the thing you build first, and building it is what unlocks the next list of recipes. That is the whole idea. It works the way a crafting table does: the table is an item you make, and only then can you make the things that need a table.

The Fabrication bench is in the game. By hand you can make Prism glass and the bench. Carrying the bench opens the rest of the bay. Losing the bench hides those recipes again. The notes below are the original plan for anything past that first bench. The jumper’s ingredients are still a stand-in.

## What is in the game now

The fabrication bay already shows every category at once. Each recipe is a count, such as `2 Pale ore`. Results go to the hotbar, then the cargo. Carrying the bench opens Belt iron, Amber resin, Void filament, Slate plate, Virid wire, and Glint lens. Those three are one count each: 2 Slate ore, 2 Virid ore, and 1 Glint ore.

Layer travel with Q and E is locked. It opens when the ship is carrying a **Layer jumper**. The jumper’s current recipe is **4 Pale ore**. That cost is temporary so the lock can be tested. The real ingredients are not chosen yet. The jumper is not used up when you change layer. If a hull breach drops it, layer travel locks again until you pick it up.

Do not add more gates, stations, or recipe chains until the jumper’s real cost is decided.

## How a station should work

1. A station is manufactured from a short count of materials you already have.
2. Once that station is in the hotbar or the cargo, the bay shows the recipes that require it. Before that, those recipes stay hidden.
3. The station is not placed on a grid, and it does not need power, fuel, or a multiblock frame.
4. Recipes under a station are still counts. Example: `Smelter: 6 Pale ore + 2 Amber ore`, then `Belt iron: 2 Pale ore + 1 Amber ore` only while you are carrying a smelter.
5. Losing the station on a hull breach hides its recipes again. Picking the station back up restores them. Nothing else about the world resets.

One station unlocks one group. Ship parts, alloys, weapons, and the jumper can each wait on their own station later. They should not all wait on the first one.

## First station, when we build it

Call it the **Fabrication bench**. It is the crafting table.

- Recipe: a small count of Pale ore. Decide the number when the jumper’s real recipe is chosen, so the two costs do not fight.
- Carrying the bench unlocks the alloy counts that are already in the bay (Prism glass, Belt iron, Amber resin, Void filament).
- Weapons, ship parts, HUD tools, and abilities stay as they are until a later station is actually needed.
- The jumper can move onto the bench, or onto a later station, when its real recipe exists. Until then it stays a direct count.

## What to leave out

- No shaped grid, and no “place the items in this pattern”.
- No station you have to fly into or dock with.
- No second inventory screen for the station. The existing bay is enough: locked recipes are absent, unlocked ones are buttons.
- No chain longer than station, then one list of results. If a result is itself a station, that is a later decision, not part of the first bench.
