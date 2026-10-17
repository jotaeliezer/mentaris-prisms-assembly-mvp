# Build phases: Mentaris: Prisms of Assembly

Design source of truth: `DESIGN.md` (copy of mentaris2.md from branch Prisms-of-Assembly).

1. [x] Foundation: scaffold, canvas that loads the copied sprites, ship flying with native mouse and keyboard controls.
2. [x] Math as input: asteroids on screen, student types the answer directly, correct answer launches a missile. Addition and subtraction first. Reuse question logic from the existing game where it fits.
3. [x] Aiming: click-to-target missiles that arc to the clicked asteroid. Laser stays a later option (undecided in the design).
4. [x] Free roam: larger scrolling world, scattered untimed asteroids. Approaching one shows its difficulty without revealing the answer; player picks easy or hard.
5. [x] Free-roaming missions: operation-locked missions, asteroid question quota, locked wormhole that unlocks when the quota is met.
6. [x] Rewards, fabrication and ship HP: materials, upgrades, HP, dropped materials fade after a limited time.
7. [x] Clusters, layers and wormholes: seeded worlds, stacked 2D layers with a transition animation, wormhole travel that costs material.
8. [ ] Multiplayer is out of scope for this MVP. Later: live shared worlds on one seed, then bases and aliens. No networking in this build.

Rules: one commit per phase, tick each phase off here when done. Child privacy: no personal data from kids, no trackers, no third-party fonts or scripts.
