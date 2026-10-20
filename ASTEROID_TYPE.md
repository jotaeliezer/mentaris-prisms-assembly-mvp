# Asteroid types

The picture on the rock is the ore. A pale rock drops Pale ore. A glint rock drops Glint ore. Question difficulty and rock size change how many crystals fall, not which mineral it is.

This matches the Minecraft ladder in spirit: coal is everywhere, diamond is rare. The names are Mentaris names. The five pictures already in the game are the five types. No new asteroid art is required for this.

## The ladder

Weights are out of 100. They are the chance a new rock is that type.

| Picture | Rock | Mineral | Weight | Minecraft sense |
| --- | --- | --- | --- | --- |
| asteroid1 | Pale rock | Pale ore | 48 | Coal. The common cyan crystal. Hand recipes use it. |
| asteroid2 | Slate rock | Slate ore | 26 | Copper. Blue-grey, a step up from pale. Not in a recipe yet. |
| asteroid3 | Amber rock | Amber ore | 14 | Iron. The warm crystal recipes already ask for. |
| asteroid4 | Virid rock | Virid ore | 8 | Gold. Green, uncommon. Not in a recipe yet. |
| asteroid6 | Glint rock | Glint ore | 4 | Diamond. Bright and rare. |

Sprite order in the game is asteroid1, asteroid2, asteroid3, asteroid4, asteroid6. There is no asteroid5.

## How many drop

Size is the rock's `size`, about 120 to 190.

| Size | Band |
| --- | --- |
| under 145 | 1 |
| 145 to 169 | 2 |
| 170 and up | 3 |

A hard question adds 1.

- Pale and slate cap at 4.
- Amber uses that same band and cap.
- Virid caps at 3.
- Glint ignores the size band. An easy glint rock drops 1. A hard glint rock drops 2.

The crystal on the ground is still `mineral.png`, tinted for the mineral. Pale is cyan, slate is blue-grey, amber is orange, virid is green, glint is bright gold.

## What this does not change

- The question on the rock is still easy or hard on its own. A glint rock can ask an easy question. It still drops Glint ore, just one crystal.
- Alien parts in `FREE_COMBAT.md` are not these ores. Aliens do not drop Pale, Slate, Amber, Virid, or Glint.
- Slate, Virid, and Glint can be picked up and stored. The fabrication bench turns two Slate ore into a Slate plate, two Virid ore into a Virid wire, and one Glint ore into a Glint lens.
