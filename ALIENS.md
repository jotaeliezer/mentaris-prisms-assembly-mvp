# Aliens

Each picture is its own alien. Movement, the way it closes, the attack, the drop, and the place it prefers are fixed to that picture.

The eight drops are items. They can sit in the hotbar or the cargo. The Core cannon is a bench weapon that spends one Alien core, and that recipe stays hidden until a core is in the hold. No alien is in the belt. Nothing drops a part until a lair opens.

The main star is on the flight view. Its name comes from the seed, and every cluster in that game shares it. The dot on the arc is the spawn clock. Up means a lair would be open. Down means it would be shut. The lair itself is not placed yet, so the arc does not let an alien out. See `SPACE_OBJECT.md`.

Weights are out of 100. They are the chance a new alien is that type when the layer has none of that alien's source. Common fliers show up often. The brain and the saucer are rare.

Speed uses the same units as the ship. A new ship tops out at 430. A number under 430 is slower than that ship at full thrust. The dartwing's dive is the one move that is faster.

A shot that is not dashed through and not blocked hits for one rock-sized bump, 14 hull points, the same as an asteroid with no bow plating. Holding Space stops a shot. It does not stop a body. Bow plating only reduces asteroid bumps. It does not reduce an alien shot, a charge, or a touch.

Three hits from the player break any alien, the same count as three extracts on a rock. The saucer can also break by exploding when the ship flies into it.

A broken alien drops one item, always the item in its row. It does not drop Pale, Slate, Amber, Virid, or Glint. The part falls beside the wreck and is picked up like a mineral.

The picture decides the part. When a lair opens, use the drop in that alien's row.

## The main star

One sun for the whole game. It is not a layer star from `STARS.md`, and it is not placed in the belt. Every cluster shares it.

The name is two words, generated from the seed. The same seed always gets the same name. A different seed gets a different name. Changing cluster or layer does not rename it.

The dot travels a full turn in eight minutes. The seed also picks where on that turn a new flight begins, so two games do not rise together just because both clocks start at zero. A saved flight keeps the dot where it was.

- Dawn is the left end of the line. The dot climbs, and the lair would open.
- The high point is the middle, above the line.
- Dusk is the right end. The lair would shut.
- Night is the same path under the line. The dot is dim.

Up is the open half, from dawn until the dot touches the right end. Down is the shut half, from that touch until the next dawn. A Core cannon hit will count as two of the three hits once an alien is out. The arc does not spawn one.

## Where they hunt

The weight is the ordinary chance. The source is where that alien is rampant. When the source is on the layer, the clock prefers that alien. A nebula layer leans toward scouts. A layer that still has pale rocks leans toward spiders. An outer layer leans toward dartwings. The size of that lean waits until a lair opens. The source is fixed here.

## The eight

| Picture | Name | Weight | Move | Attack | Drop | Source |
| --- | --- | --- | --- | --- | --- | --- |
| alien_ET.png | Scout | 24 | Drift, then hold a gap | Slow green bolt | Spark gland | Nebula. Rampant in the cloud. |
| alien_spider.png | Spider | 18 | Skitter and turn | Touch, then pause | Grip fiber | Pale rocks. It feeds on them. |
| alien_galaga.png | Dartwing | 16 | Curve, then one dive | Two bolts on the dive | Hull shard | Outer layers of a cluster. |
| alien_eye.png | Eye | 12 | Orbit at a long gap | Fast red beam | Cold lamp | The rim of a black hole. |
| alien_robot.png | Pincer | 10 | Strafe at a fixed range | One heavy bolt | Servo joint | An ion stream. |
| alien_golem.png | Golem | 8 | Lumber, then a straight charge | The charge itself | Spike crystal | Virid rocks. It feeds on them. |
| alien_saucer.png | Saucer | 7 | Slow hover, no chase | Bomb, or it explodes on contact | Alien chart | An abandoned stronghold. |
| alien_brain.png | Brain | 5 | Hover, one slide if aimed at | A slow ring | Alien core | The lair. It stays by the mouth. |

## Scout

Picture `alien_ET.png`. Catalog keys `scout` and `alien_ET`. A small green body with a large dark head.

Source: a nebula. Scouts are rampant in the cloud.

It drifts at 160. Once it has a clear line, it turns to face the ship and stops outside touch range. If the ship rushes in, it drifts back out to that same gap. It does not ram.

From the head, about every 2 seconds, it fires one slow green bolt. The bolt flies straight. A block stops it. A dash can leave its line.

Drop: 1 Spark gland. The gland is the charge part for a strong energy weapon at the Fabrication bench, and the gunship room in `CONSTRUCT.md` spends one.

## Spider

Picture `alien_spider.png`. A mechanical spider with a red eye and eight thin legs.

Source: pale rocks. The spider feeds on them, so a layer that still has pale asteroids draws more spiders.

It skitters toward the ship at 300, under a stock ship's top speed, and it can turn while it comes. Between bursts it pauses. It does not shoot, and it does not explode.

A touch is one rock-sized bump. After the touch it pauses, so it cannot grind the hull by staying overlapped. A block does not stop the body. Flying clear during the pause avoids the next bump.

Drop: 1 Grip fiber. This part is new. It is stored until a later bench recipe uses it to make Quiet running last longer than the few seconds the current Amber-and-Pale version gives. It is not worn by itself.

## Dartwing

Picture `alien_galaga.png`. A blue-green insect ship with swept wings and two yellow eyes.

Source: the outer layers of a cluster. Dartwings are more common there, where the belt is thin.

It flies a wide curve at 240, then commits to one straight dive at 500, faster than a stock ship, then climbs back into the curve. The dive aims at where the ship was when the dive started. It does not steer during the dive.

At the start of the dive it fires two small bolts with a slight spread. A block stops a bolt. The body is not a ram, but overlapping the dive still counts as a touch and one rock-sized bump. A dash off the dive line avoids both.

Drop: 1 Hull shard. The shard feeds a later hull recipe. It is not worn by itself.

## Eye

Picture `alien_eye.png`. One eye in a metal ring, with a small antenna.

Source: the rim of a black hole. The eye keeps to that rim.

It orbits at 200, always facing the ship, and it keeps a long gap. If the ship closes, the orbit widens instead of meeting the hull. It does not charge.

It fires a fast, thin red beam in a short burst. The beam is straight. A block stops it.

Drop: 1 Cold lamp. This is the same lamp a stronghold can hold in `SPACE_OBJECT.md`. It is a fabrication ingredient for the beacon and for night-bright hull work. It is not a weapon.

## Pincer

Picture `alien_robot.png`. A dark machine with a glass dome, a yellow eye, and pincer arms.

Source: an ion stream. The pincer strafes along the current.

It closes to a medium range, then only slides left and right at 260. It keeps that range. It does not charge, even if the ship comes closer. It faces the ship while it strafes.

The pincers fire one heavy, slow bolt, straight. A block stops it. There is a clear gap before the next bolt.

Drop: 1 Servo joint. This part is new. It is the intended ingredient for the thruster-housing recipe when that hull slot is built. In `HULL.md` that slot's stat is a higher top speed. The joint is not worn by itself, and the slot is still a plan.

## Golem

Picture `alien_golem.png`. A bulky grey body, crystal spikes, and a glowing blue chest.

Source: virid rocks. The golem feeds on the green crystal.

It lumbers at 120 while it faces the ship and waits. Then it charges in a straight line at 340, still under a stock ship's top speed, without steering. At the end of the charge it slows, turns, and lines up again.

It does not shoot, and it does not explode. The charge is the attack. Touching the ship on that line is one rock-sized bump. A block does not stop the body. A dash can leave the line. A ship already at full thrust can pull ahead of 340. A ship that is slow or facing the wrong way gets caught.

Drop: 1 Spike crystal. This part is new. It is the intended material for raising bow plating once the Pale ore stand-in in `HULL.md` is replaced. It is not worn by itself. The Pale stand-in stays until that recipe is chosen, and this file does not set the count.

## Saucer

Picture `alien_saucer.png`. A silver disc with a red glass dome and lights underneath.

Source: an abandoned stronghold. The saucer lingers over the ruin.

It hovers at 140. It does not chase. If the ship leaves, the saucer stays in its patch of belt and keeps dropping bombs toward the last place it saw the ship.

A bomb falls slowly and bursts on a short fuse, or sooner if it touches the ship. The burst is one rock-sized bump. The saucer stays.

If the ship flies into the saucer itself, the saucer explodes. That blast is two rock-sized bumps, the saucer counts as broken, and the drop still falls.

Drop: 1 Alien chart. This is the same one-use note a stronghold can hold in `SPACE_OBJECT.md`. Using it shows the layer and the direction of another stronghold, or of a black hole, in this cluster.

## Brain

Picture `alien_brain.png`. A pink brain on a round metal base, with tentacles.

Source: the lair. The brain stays by the mouth, and it is the last to leave when the star sets.

It hovers at 80. It barely moves. If the ship aims at it, it makes one short slide away from that aim, then holds still again. It does not chase, and it does not explode.

The attack is a slow ring that grows outward from the base. The ring is not a bullet and it does not follow the ship. Standing in the ring when it passes is one rock-sized bump. A block does not stop the ring. Stepping out of it before it reaches the ship avoids the bump.

Drop: 1 Alien core. The core is the part for the heaviest weapon at the bench, and the mega drill in `CONSTRUCT.md` spends one.

## What this leaves alone

- No alien on screen. The arc shows the clock. The lair is not placed, and the dot does not let anyone out.
- No second question UI. Free combat and the duel stay as written in their own files.
- No ore from an alien.
- Shared alien sounds stay shared. This file does not assign a sound per picture.
- Grip fiber, Spike crystal, Servo joint, Cold lamp, and Alien chart can be stored. Their recipes wait. The Core cannon is the recipe that spends an Alien core now. Spark gland and Hull shard keep the later uses written above.
