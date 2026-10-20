# Free combat

The ship stays in the belt. The player blocks, dashes, and shoots when they choose. Fabrication and asteroid extraction stay available the whole time. There is no zoom-in duel and no locked controls.

`ALIEN_COMBAT.md` is the other version: one alien, a math question, slow motion. This file is the free-roaming version. Neither is built. Aliens stay off the belt until a spawn clock exists.

## What the player can do at once

- Fly, including reverse and the layer jumper when it is carried.
- Extract a rock with the usual question. The extract zoom is only for that rock. It is not a combat zoom.
- Open cargo with C and fabrication with F.
- Fight an alien without leaving the belt.

A hull drawer on R is still only a plan in `HULL.md`. Free combat does not use R.

## Commands

These are the intended binds. They are not in the game yet.

| Action | Control | What it does |
| --- | --- | --- |
| Shoot | Left click with a weapon selected | Fires that weapon. The Arc missile and Pulse lance already work this way against rocks. Against an alien, the same shot can hit the alien. |
| Dash | Shift | A short burst along the ship's aim. It spends a brief moment where an alien shot can miss. It does not open a question. |
| Block | Hold Space | The ship holds a guard in front of the nose. An alien shot that arrives while the guard is up is stopped. The guard drops when Space is released. It does not stop an asteroid bump. |

Shooting, dashing, and blocking do not pause extraction. If a question numpad is open, those combat keys wait until the extract closes, so a digit is never also a dash.

## Aliens in the belt

More than one alien can be in the belt. They fly and shoot on their own. The player is not pulled into a turn.

An alien shot that is not dashed through and not blocked hits the hull for one rock-sized bump. A shot the player lands on an alien counts toward breaking it. Three hits break it, the same count as three extracts on a rock.

## What a broken alien drops

A broken alien does not drop Pale ore or Amber ore. Those stay on the rocks.

It drops one alien part, picked from this list:

| Part | What it is for |
| --- | --- |
| Alien core | The main part for a strong weapon. A strong weapon recipe needs a core plus materials the bench already uses. |
| Hull shard | A plating part. It can feed a later hull recipe. It is not worn by itself. |
| Spark gland | A charge part for a strong energy weapon. |

The part falls beside the wreck, the same way a mineral falls beside a rock. The ship flies over it to pick it up. It then sits in the hotbar or cargo.

Strong weapons are not on the hand list. They wait on the Fabrication bench, the same way the current weapons do, and they also spend at least one alien part. Without a core, gland, or shard, the strong recipe stays hidden.

The exact weapon list is not chosen yet. The rule is the part: alien loot is for manufacturing, not a second stack of ore.

## What this version leaves alone

- The duel in `ALIEN_COMBAT.md` can still be the version that uses a math question, a zoom, and slow motion. Free combat does not.
- No new question during a dogfight.
- No friendly-fire change. A crafted weapon can still hit another pilot, as it does now.
- No alien on screen until the spawn clock is built.
