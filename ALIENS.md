# Aliens

Each picture is its own alien. Movement, the way it closes, the attack, and the drop are fixed to that picture. This is a plan. None of it is in the belt yet. The pictures can load, and aliens stay off the screen until a spawn clock exists.

Weights are out of 100. They are the chance a new alien is that type. Common fliers show up often. The brain and the saucer are rare.

Speed uses the same units as the ship. A new ship tops out at 430. A number under 430 is slower than that ship at full thrust. The dartwing's dive is the one move that is faster.

A shot that is not dashed through and not blocked hits for one rock-sized bump, 14 hull points, the same as an asteroid with no bow plating. Holding Space stops a shot. It does not stop a body. Bow plating only reduces asteroid bumps. It does not reduce an alien shot, a charge, or a touch.

Three hits from the player break any alien, the same count as three extracts on a rock. The saucer can also break by exploding when the ship flies into it.

A broken alien drops one item, always the item in its row. It does not drop Pale, Slate, Amber, Virid, or Glint. The part falls beside the wreck and is picked up like a mineral.

`FREE_COMBAT.md` and `ALIEN_COMBAT.md` still describe a random pick among Alien core, Hull shard, and Spark gland. This file replaces that pick: the picture decides the part. When a spawn clock is built, use the drop here.

## The eight

| Picture | Name | Weight | Move | Attack | Drop |
| --- | --- | --- | --- | --- | --- |
| alien_ET.png | Scout | 24 | Drift, then hold a gap | Slow green bolt | Spark gland |
| alien_spider.png | Spider | 18 | Skitter and turn | Touch, then pause | Grip fiber |
| alien_galaga.png | Dartwing | 16 | Curve, then one dive | Two bolts on the dive | Hull shard |
| alien_eye.png | Eye | 12 | Orbit at a long gap | Fast red beam | Cold lamp |
| alien_robot.png | Pincer | 10 | Strafe at a fixed range | One heavy bolt | Servo joint |
| alien_golem.png | Golem | 8 | Lumber, then a straight charge | The charge itself | Spike crystal |
| alien_saucer.png | Saucer | 7 | Slow hover, no chase | Bomb, or it explodes on contact | Alien chart |
| alien_brain.png | Brain | 5 | Hover, one slide if aimed at | A slow ring | Alien core |

## Scout

Picture `alien_ET.png`. Catalog keys `scout` and `alien_ET`. A small green body with a large dark head.

It drifts at 160. Once it has a clear line, it turns to face the ship and stops outside touch range. If the ship rushes in, it drifts back out to that same gap. It does not ram.

From the head, about every 2 seconds, it fires one slow green bolt. The bolt flies straight. A block stops it. A dash can leave its line.

Drop: 1 Spark gland. The gland is the charge part for a strong energy weapon at the Fabrication bench, and the gunship room in `CONSTRUCT.md` spends one.

## Spider

Picture `alien_spider.png`. A mechanical spider with a red eye and eight thin legs.

It skitters toward the ship at 300, under a stock ship's top speed, and it can turn while it comes. Between bursts it pauses. It does not shoot, and it does not explode.

A touch is one rock-sized bump. After the touch it pauses, so it cannot grind the hull by staying overlapped. A block does not stop the body. Flying clear during the pause avoids the next bump.

Drop: 1 Grip fiber. This part is new. It is stored until a later bench recipe uses it to make Quiet running last longer than the few seconds the current Amber-and-Pale version gives. It is not worn by itself.

## Dartwing

Picture `alien_galaga.png`. A blue-green insect ship with swept wings and two yellow eyes.

It flies a wide curve at 240, then commits to one straight dive at 500, faster than a stock ship, then climbs back into the curve. The dive aims at where the ship was when the dive started. It does not steer during the dive.

At the start of the dive it fires two small bolts with a slight spread. A block stops a bolt. The body is not a ram, but overlapping the dive still counts as a touch and one rock-sized bump. A dash off the dive line avoids both.

Drop: 1 Hull shard. The shard feeds a later hull recipe. It is not worn by itself.

## Eye

Picture `alien_eye.png`. One eye in a metal ring, with a small antenna.

It orbits at 200, always facing the ship, and it keeps a long gap. If the ship closes, the orbit widens instead of meeting the hull. It does not charge.

It fires a fast, thin red beam in a short burst. The beam is straight. A block stops it.

Drop: 1 Cold lamp. This is the same lamp a stronghold can hold in `SPACE_OBJECT.md`. It is a fabrication ingredient for the beacon and for night-bright hull work. It is not a weapon.

## Pincer

Picture `alien_robot.png`. A dark machine with a glass dome, a yellow eye, and pincer arms.

It closes to a medium range, then only slides left and right at 260. It keeps that range. It does not charge, even if the ship comes closer. It faces the ship while it strafes.

The pincers fire one heavy, slow bolt, straight. A block stops it. There is a clear gap before the next bolt.

Drop: 1 Servo joint. This part is new. It is the intended ingredient for the thruster-housing recipe when that hull slot is built. In `HULL.md` that slot's stat is a higher top speed. The joint is not worn by itself, and the slot is still a plan.

## Golem

Picture `alien_golem.png`. A bulky grey body, crystal spikes, and a glowing blue chest.

It lumbers at 120 while it faces the ship and waits. Then it charges in a straight line at 340, still under a stock ship's top speed, without steering. At the end of the charge it slows, turns, and lines up again.

It does not shoot, and it does not explode. The charge is the attack. Touching the ship on that line is one rock-sized bump. A block does not stop the body. A dash can leave the line. A ship already at full thrust can pull ahead of 340. A ship that is slow or facing the wrong way gets caught.

Drop: 1 Spike crystal. This part is new. It is the intended material for raising bow plating once the Pale ore stand-in in `HULL.md` is replaced. It is not worn by itself. The Pale stand-in stays until that recipe is chosen, and this file does not set the count.

## Saucer

Picture `alien_saucer.png`. A silver disc with a red glass dome and lights underneath.

It hovers at 140. It does not chase. If the ship leaves, the saucer stays in its patch of belt and keeps dropping bombs toward the last place it saw the ship.

A bomb falls slowly and bursts on a short fuse, or sooner if it touches the ship. The burst is one rock-sized bump. The saucer stays.

If the ship flies into the saucer itself, the saucer explodes. That blast is two rock-sized bumps, the saucer counts as broken, and the drop still falls.

Drop: 1 Alien chart. This is the same one-use note a stronghold can hold in `SPACE_OBJECT.md`. Using it shows the layer and the direction of another stronghold, or of a black hole, in this cluster.

## Brain

Picture `alien_brain.png`. A pink brain on a round metal base, with tentacles.

It hovers at 80. It barely moves. If the ship aims at it, it makes one short slide away from that aim, then holds still again. It does not chase, and it does not explode.

The attack is a slow ring that grows outward from the base. The ring is not a bullet and it does not follow the ship. Standing in the ring when it passes is one rock-sized bump. A block does not stop the ring. Stepping out of it before it reaches the ship avoids the bump.

Drop: 1 Alien core. The core is the part for the heaviest weapon at the bench, and the mega drill in `CONSTRUCT.md` spends one.

## What this leaves alone

- No alien on screen until the spawn clock is built.
- No second question UI. Free combat and the duel stay as written in their own files.
- No ore from an alien.
- Shared alien sounds stay shared. This file does not assign a sound per picture.
- Grip fiber, Spike crystal, and Servo joint can be stored once they exist. Their recipes wait. The three parts already named in `FREE_COMBAT.md`, plus the Cold lamp and the Alien chart, keep the uses written above.
