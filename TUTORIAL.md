# Tutorial flow

The tutorial is shown the way Minecraft shows one. The player is already in the world. Nothing pauses the flight for a lesson, and there is no card stack to click through. A short line appears when the player has just done the thing that makes the next step possible. It names the thing and the key. Then it gets out of the way.

This file is the flow. The craft toasts are the first piece that is actually on screen. The rest of the beats are the order to build later. There is no achievements file in this repo.

## How a beat is shown

- One toast at a time, up to three if several arrive together. They sit at the lower right, above the hotbar, in a dark panel with a hard edge.
- The line is one sentence. It names the unlocked thing, then the key. Example: `Prism glass can be fabricated. Press F.`
- A beat shows once. Doing the same collection again does not repeat it.
- The toast does not take focus, does not open a menu, and does not freeze the ship.
- If the player is in extract, the toast waits on the same queue and is still there when they finish the problem.
- The hint line at the bottom can repeat the current goal in quieter words. It is not a second tutorial.

## Order

The player learns by doing these, in this order. A later beat does not appear before the earlier one has happened.

1. **Launch.** The title is the only full-screen lesson. Launch drops the ship into the belt. The ship is hidden until then.
2. **Fly.** The first seconds of flight are enough. W builds speed and the exhaust grows. S reverses. The mouse aims. No toast for this unless the ship has not moved after a long idle, and even then it is one line: `Hold W to fly.`
3. **Touch a rock.** The bump is the lesson. The sky-blue rim is the rock you are aimed at. No separate "watch out" speech before the first hit.
4. **Extract.** The first time a rock is in range, the hint says to click it. The numpad is the lesson. A correct answer leaves the mineral beside the rock. It does not enter the hotbar by itself.
5. **Collect.** Flying onto the mineral puts it in the hotbar. That is the first inventory beat. The toast names what you picked up only by unlocking a recipe, not by listing every pebble.
6. **Fabricate.** The first time the hotbar and cargo can pay for a recipe, the toast names that recipe and says `Press F.` Opening fabrication with F completes the beat. The bay is the recipe list. There is no crafting grid.
7. **Cargo.** The first time the hotbar is full, or the first time the player presses C, the hint says cargo is beside the hotbar. Dragging a stack is the lesson. Click still picks up and places.
8. **Jumper.** When the player can afford the layer jumper, that toast is the layer lesson. Q and E stay locked until the jumper is carried. The toast does not explain all 501 layers.
9. **Breach.** The first hull breach is the lesson for dropped stacks. The respawn line already says to fly back and pick them up. No extra toast on top of game over.

## What not to do

- No commander portrait and no typewriter. Those belong to Mentaris: The Arith Belt.
- No modal that must be dismissed before the ship moves.
- No achievement list yet. When one is written, each achievement should use this same toast, not a separate screen.
- Do not toast a recipe the player could already afford on an earlier pickup.
