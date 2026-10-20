# Hull improvements

The R key opens a hull drawer on the bottom left, the way C opens cargo on the bottom right. The drawer is where hull pieces are worn and improved. This is a plan, not a build. Do not add the key, the slots, or the levels until this plan is accepted.

## What is in the game now

The hull is a single number. Colliding with an asteroid takes 14 points, and reaching 0 is a hull breach: the ship drops what it was carrying and waits for respawn.

Fabrication is a list of counts. Results go to the hotbar, then the cargo. There is no place to wear a part, and nothing on the ship can be improved after it is made. `STATIONS.md` describes a fabrication bench that unlocks more counts. That bench is also not built yet.

## The drawer

R toggles the drawer while flying. Esc closes it. It sits on the bottom left and uses the same slot size as the hotbar, so it reads as a panel sliding out of the bar rather than a new screen.

Keep four fixed slots, in this order:

1. Bow plating
2. Hull plating
3. Shield
4. Thruster housing

Each slot holds one piece. The piece is made in the fabrication bay as a count recipe, then moved from the hotbar or cargo into the slot, the same click-to-pick-up used by cargo. A filled slot can be clicked back into the hotbar or cargo. Closing the drawer returns a held piece to the slot it came from.

Empty slots show the slot name. Filled slots show the piece and its level.

## What a piece does

One slot, one stat.

| Slot | Stat |
| --- | --- |
| Bow plating | Less damage from hitting an asteroid |
| Hull plating | A higher hull maximum |
| Shield | A short period after a hit where the next hit is ignored |
| Thruster housing | A higher top speed |

The numbers stay small. A level 1 piece is a modest change. Do not add a second stat to a piece.

## Leveling

Each worn piece has one level, from 1 to 3. Leveling is a count of materials, the way a recipe is a count, not a grid and not a random roll.

- The level button sits on the filled slot.
- Paying the count raises that piece by one level and spends the materials from the hotbar, then the cargo.
- Level 3 is the cap. The button goes away.
- The piece keeps its level when it is taken off and put back on.
- A hull breach drops the worn pieces with everything else. Their levels stay on the dropped stacks. Picking one up and wearing it again restores the level.

Choose the material counts when the real recipes are chosen. Until then, do not invent a long cost. A placeholder of a few Pale ore is enough to test the button, and it should be labeled as a stand-in.

## What to leave out

- Do not build this in the same change as the plan.
- No enchantment table minigame, no random modifier, and no second track of bonuses.
- No extra slots beyond the four above.
- The drawer does not require the fabrication bench. A piece you can already make can be worn. A later station can gate a piece’s recipe, following `STATIONS.md`, without gating the drawer itself.
- No always-on layer number, and no new number on the top-left hull bar beyond the hull it already shows. The layer compass is the exception: once that piece is worn, its diagram shows the layer number in bold to the left of the layer line.
