# Mentaris: Prisms of Assembly, plan (multiplayer-focused)

Planning document only. The current game stays as-is; nothing here changes existing code.

## 1. Core idea
The math question IS the input. The student types the answer directly (2x1 or 3x1 digit multiplication, plus addition and subtraction). That number launches missiles, unlocks asteroids, and earns rewards.

## 2. Progression ladder
- Early: addition and subtraction.
- Higher levels or harder missions: multiplication, decimals, and perfect squares.

## 3. Ship and controls
Keep the ship with native mouse-and-keyboard controls; the mouse is the shoot button. Two open aiming options:
- **(a) Click-to-target:** the missile arcs to the clicked asteroid and pairs naturally with the math gate.
- **(b) Straight-line laser.**

## 4. Free roam multiplayer
- Not timed; asteroids are scattered around the map.
- Approaching an asteroid shows its question difficulty without revealing the answer (color-coding or star rating, open point).
- Students choose easy or hard; harder gives more rewards, easier gives fewer.
- Multiple players join and play simultaneously.

## 5. Seeded worlds
- Worlds are generated from a seed, similar to seeded survival-world generation, so every player who uses the same seed shares the same asteroid layout.
- Players roam to asteroids, see each asteroid's question difficulty, and solve to get items and rewards.
- Rewards are spent to level up the ship, weapons, and abilities, and to buy other ships within the game.
- Aliens show up periodically as stakes and pressure.

## 6. Wormholes
- Wormholes are the travel mechanic between seeded regions and clusters.
- Approaching a wormhole offers travel to a named destination cluster (for example, "mega cluster").
- Clicking it plays a quick animation and transports the player.
- The return wormhole is always present at the destination, so the player can always go back.

### Cost
- Wormhole travel costs material harvested from asteroids.
- Players dropped into the first cluster cannot use wormholes until they have gathered some material.
- The cost scales with distance traveled, so farther jumps cost more.

## 7. Risk and recovery
- **(a)** The ship has HP. When an alien hits the ship it loses HP.
- **(b)** If HP reaches zero, the ship loses all its collected material, dropped on the spot.
- **(c)** When the ship is destroyed, the collected minerals are recuperable but follow a timed drop: the items sit at the death location for a limited time and start disappearing if not recovered in time.
- **(d)** Aliens are rival solvers: they try to take whatever the player solved from asteroids the player destroys.

## 8. Fabrication
Collected asteroid materials are used to:
- **(a)** Manufacture better weapons.
- **(b)** Build a faster ship.
- **(c)** Fabricate items.
- **(d)** Buy math hints.

Gather resources, then fabricate upgrades, in tiers where better gear needs rarer materials. Materials carried are at stake until used or banked in fabrication, which ties into the risk rules.

## 9. Base-building
- Bases are defensible but not untouchable.
- Players can defend their base from aliens, but it is not a completely safe zone; aliens can still threaten it.
- Players can choose where to build their base, among asteroids or on other planets.
- The base serves as a hub for refueling and fabrication.
- Players gather material by solving math questions from asteroids, and that material funds the base's functions.

## 10. Free-roaming missions
- Incorporate these design ideas into the actual Mentaris game that exists now.
- Missions are not about solving the question at the top of the screen. They are free-roaming: the player has to collect or answer a certain number of asteroid questions.
- Missions are operation-locked. One mission uses only addition asteroids, another uses only multiplication asteroids, and so on. The mission's question generation reuses the existing question generation logic from the current Mentaris game; do not create a separate generator. The operation is fixed per mission regardless of which layer the ship is on; layers are only vertical space within a cluster.
- To move on, the player has to get to the wormhole.
- The wormhole is unlockable. It stays locked until the player has hit the required number of asteroid questions answered or collected.
- Open question: what happens when the player reaches the unlocked wormhole is undecided (teleport to a new cluster vs. clearing the mission).

## 11. Cluster layers
- Layers are huge 2D planes stacked vertically within a cluster.
- The player can travel freely across a layer: asteroids, aliens, nebulas that blind trajectory, other planets, bright stars.
- Moving between layers must be easy for the player, but it is still a 2D game: no true 3D.
- There must be a cool animation for layer transitions that clearly communicates whether the ship is going up or down a layer (for example a smooth camera tilt or a parallax depth shift, not just a screen cut).

## 12. Open questions
- Aiming mechanic: click-to-target vs laser.
- How difficulty is displayed: color vs stars.
- Multiplayer infrastructure: not yet decided.
- The seed must be shared between players.
