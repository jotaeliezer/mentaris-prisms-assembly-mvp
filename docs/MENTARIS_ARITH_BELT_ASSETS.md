# Mentaris: The Arith Belt — file use for Mentaris: Prisms of Assembly

This note describes how the current game, Mentaris: The Arith Belt, uses its files. It was read from `math-game1` at `89d2b1a`. The game code was not changed.

Runtime files live under `public/`. The same tree is copied to `docs/` for the published site. The browser loads paths relative to `public/asteroid_blaster.html` and `public/home.html`, so a path written here as `images/ships/BU2X.png` is the file `public/images/ships/BU2X.png`.

Wiring lives in:

- `src/js/core/audio.js` — sound bank, loops, soundtrack
- `src/js/core/game.js` — images, shots, powerups, menus, most animations
- `src/js/render/animations.js` — particles, rings, camera shake, damage smoke
- `src/js/render/background.js` — procedural starfield, planets, streaks
- `src/js/core/tourguide.js` — tutorial commander and typewriter audio
- `src/js/entities/aliens.js` — alien fire sounds
- `src/js/entities/powerups.js` — a small unused stub (`slowmo`, `hull-boost`). Live powerups are in `game.js`.

Loose copies under `docs/images/` and `docs/sfx/` (files sitting next to the folders, not inside `aliens/`, `shots/`, and so on) are not what the game loads. The game loads the folder paths below.

## 1. Sound effects

`initSfx()` in `audio.js` builds the bank. `playSfx(state, name)` clones the clip so overlapping sounds can play. Master volume and SFX volume scale every clip. Sound is silent until the player has unlocked audio with a gesture (`unlockSfx` plays `gun1` at volume 0).

### 1.1 Menu and tutorial

| Key | File | When |
| --- | --- | --- |
| `menu_beep` | `sfx/ui/menu_beep.mp3` | Menu and overlay buttons, sandbox buttons, settings tabs |
| tutorial typewriter | `sfx/ui/tutorial_messages.mp3` | Loops while Commander Solver's text types. Volume 0.4. Skipped on the intro step |
| intro sting | `sfx/commander_solver/training/t_start.mp3` | First tutorial card, "Welcome aboard, pilot". That step mutes the typewriter |

### 1.2 Progress

| Key | File | When |
| --- | --- | --- |
| `session_start` | `sfx/progress/session_start.mp3` | Countdown before a run |
| `level_up2` | `sfx/progress/level_up2.mp3` | Every 5th correct answer. Level increases, slow-mo starts (2 seconds at scale 0.55), level-up banner shows |
| `sec_15_mark` | `sfx/progress/15_sec_mark.mp3` | Timed run reaches 15 seconds left |
| `mission_cleared1` | `sfx/progress/mission_cleared1.mp3` | Wave or mission clear, before the end panel |
| `game_over3` | `sfx/progress/game_over3.mp3` | After the ship is destroyed and the run ends |

### 1.3 Ship loops and one-shots

| Key | File | When |
| --- | --- | --- |
| `ship_drone` | `sfx/ship/ship_drone.mp3` | Loop while a run is active (`setDrone`) |
| `ship_idle` | `sfx/ship/ship_idle.mp3` | Loop while the ship is idle or moving left, right, or down. Starts only after audio is unlocked |
| `ship_advance` | `sfx/ship/ship_advance.mp3` | Loop while moving upward. Same unlock rule |
| `dash` | `sfx/ship/dash.mp3` | Dash (Shift), the default shockwave, overflight, compass, knockback (volume 0.82), clear-front, and downburst |
| `flares` | `sfx/ship/flares.mp3` | Verdant Spire side flares (special key, default Q) |
| `teleport_disappear` | `sfx/ship/teleport_disappear.mp3` | AM3 Scout teleport start, and Aurora Dart intangible start |
| `teleport_reappear` | `sfx/ship/teleport_reappear.mp3` | Teleport end |
| `explosion` | `sfx/ship/explosion.mp3` | Ship destroyed. Also the tutorial hull-critical recovery |
| `ship_damaged` | `sfx/ship/ship_damaged.mp3` | Player takes hull damage |
| `crash` | `sfx/ship/crash.mp3` | Hard ship collision (asteroid or alien). Volumes used in code: 0.6, 0.55, or 0.45 depending on the hit |

### 1.4 Shots

Fired from `fireForPilot`. Missile shots do not use this gun map; typing the correct answer with missile armed plays `shot_missile` instead.

| Mode | File | Key |
| --- | --- | --- |
| single, pierce (bola), and the fallback | `sfx/shots/gun1.mp3` | `gun1` |
| laser | `sfx/shots/gun2.mp3` | `gun2` |
| ice | `sfx/shots/ice_shot.mp3` | `ice_shot` |
| electric | `sfx/shots/electric_shot.mp3` | `electric_shot` |
| fire | `sfx/shots/flame_shot.mp3` | `flame_shot` |
| plasma | `sfx/shots/shot_orb.mp3` | `shot_orb` |
| rail | `sfx/shots/shot_railbeam.mp3` | `shot_railbeam` |
| missile (typed answer) | `sfx/shots/shot_missile.mp3` | `shot_missile` |
| auto-fire spin-up | `sfx/shots/machine_gun_load.mp3` | `machine_gun_load` |

`sfx/shots/camer_ice_shot.mp3` is loaded into the bank as `camer_ice_shot` and never played. Ice shots use `ice_shot`.

### 1.5 Gameplay hits

| Key | File | When |
| --- | --- | --- |
| `correct` | `sfx/gameplay/correct.mp3` | Correct asteroid destroyed |
| `wrong_asteroid` | `sfx/gameplay/wrong_asteroid.mp3` | Wrong asteroid hit |
| `missed_answer` | `sfx/gameplay/missed_answer.mp3` | Correct asteroid escapes |
| `mineral_collected` | `sfx/gameplay/mineral_collected.mp3` | A mineral drop is collected |
| `impact` | `sfx/gameplay/impact.mp3` | Ship hits and some alien impacts. Volumes 0.4, 0.35, or 0.22 |
| `impact_thud` | `sfx/gameplay/impact_thud.mp3` | Asteroid impacts, EMP cascade hits, knockback bursts. Volumes 0.35 to 0.45 |
| `ship_damage_alarm` | `sfx/gameplay/ship_damage_alarm.mp3` | Hull is one hit from destruction |
| `warning` | `sfx/alerts/warning.mp3` | Correct answer is near the bottom and about to escape. Not played during the tutorial |

### 1.6 Aliens

| Key | File | When |
| --- | --- | --- |
| `alien_hit` | `sfx/alien/alien_hit.mp3` | A bullet damages an alien. One call uses volume 0.48 |
| `alien_kill` | `sfx/alien/alien_kill.mp3` | Alien shot down (0.65), boss retreat (0.45), or a swarm pool cleared (0.65) |
| `alien_shooting` | `sfx/alien/alien_shooting.mp3` | Alien fires. `aliens.js` also uses volumes 0.95 and 0.8 |
| `alien_12oclock_warning` | `sfx/alien/alien_12oclock_warning.mp3` | Alien threat warning at 12 o'clock |
| alien attack music | `sfx/alien/alien_attack.mp3` | Not a one-shot. `playMusicOverride` loops it during an alien attack and pauses the normal soundtrack |

### 1.7 Powerup sounds

| Key | File | When |
| --- | --- | --- |
| `powerup_emerges` | `sfx/powerups/powerup_emerges.mp3` | A hidden powerup pops out of a destroyed correct asteroid |
| `powerup_collected` | `sfx/powerups/powerup_collected.mp3` | Magnet, EMP, target lock, and other secondary pickups that are not repair, armor, shield, or a shot type |
| `hull_repair_pickup` | `sfx/powerups/hull_repair_pickup.mp3` | Hull Repair collected |
| `armor_pickup` | `sfx/powerups/armor_pickup.mp3` | Armor collected |
| `shield_pickup` | `sfx/powerups/sheld_pickup.mp3` | Shield collected. The filename is spelled `sheld_pickup.mp3` |
| `shot_powerup` | `sfx/powerups/shot_powerup.mp3` | An offense shot-type pickup is collected |
| `emp_activate` | `sfx/powerups/EMP_activate.mp3` | EMP Burst is fired with the secondary key |
| `time_activate` | `sfx/powerups/time_activate.mp3` | Time Dilation is fired with the secondary key |

### 1.8 Soundtrack

`setSoundtrack` plays these in order, then wraps. Each clip is not looped by itself. When one ends, the next starts. Base volume is 0.22 times master times music volume. `fadeOutSoundtrack` fades the current clip. An override such as `alien_attack.mp3` plays at 0.45 times the music master and pauses this list until it stops.

1. `sfx/soundtracks/soundtrack1.mp3`
2. `sfx/soundtracks/soundtrack2_toohottosleep.mp3`
3. `sfx/soundtracks/soundtrack3.mp3`
4. `sfx/soundtracks/soundtrack4.mp3`
5. `sfx/soundtracks/soundtrack5.mp3`
6. `sfx/soundtracks/soundtrack6.mp3`
7. `sfx/soundtracks/soundtrack7.mp3`
8. `sfx/soundtracks/soundtrack8.mp3`

There is also a tiny synthesized beep (`beep` in `audio.js`) for the ship-hit sting: sawtooth, 120 Hz, 95 ms. It is not a file.

### 1.9 Audio files on disk that gameplay does not play

These exist under `public/sfx/` and are not called by `playSfx` or the soundtrack list:

- `sfx/shots/bolt_shot.mp3`
- `sfx/shots/camer_ice_shot.mp3` (loaded, never triggered)
- `sfx/shots/missile_shot (1).mp3`
- `sfx/ship/ship_whoosh.mp3`
- `sfx/ship/ship_whoosh3.mp3`
- `sfx/ship/space_whoosh2.mp3`
- `sfx/ui/item_purchased.mp3`
- `sfx/alien/enemy_detected.mp3`
- `sfx/alien/8footdino_on_scratch-alarm-301729.mp3`
- `sfx/alien/dstechnician-angry-robot-iii-113012.mp3`
- `*.render_stats.html` files next to some clips (export notes, not audio)

## 2. Images

### 2.1 Background clusters

`backgroundSources` in `game.js`. `setBackgroundBelt(key)` picks one. The image scrolls downward (`BACKGROUND_SCROLL_SPEED` 8.8, plus 7.0 during pulldown). Phaser uses a slower scroll of 5.8. Stars and planets from `background.js` draw on top.

| Belt key | Menu name | File | Menu lock cost |
| --- | --- | --- | --- |
| `dusk` | Sector Run Cluster | `images/backgrounds/sector_run_d.png` | unlocked |
| `ember` | Rift Assault Cluster | `images/backgrounds/rift_assault_c.png` | unlocked |
| `aurora` | Void Run Cluster | `images/backgrounds/void_run_d.png` | 250 |
| `rift` | Nebula Seige Cluster | `images/backgrounds/nebula_seige_c.png` | 450 |
| `vega` | Apex Frontier Cluster | `images/backgrounds/apex_frontier_c.png` | 700 |
| `void` | Apex Frontier Plus | `images/backgrounds/et's_land.png` | 1000 |
| `surface` | ET Surface Cluster | `images/backgrounds/et's_surface.jpg` | 1200 |

The spelling `nebula_seige` is the filename. Other plates in those folders (`sector_run.png`, `sector_run_b.png`, `sector_run_c.PNG`, `void_run.png`, `void_run_b.png`, `void_run_c.png`, `nebula_seige.png`, `nebula_seige_b.png`, `rift_assault.png`, `rift_assault_b.png`, `apex_frontier.png`, `apex_frontier_b.png`, `et's_land.jpg`) are not the plates the run scrolls. Campaign cards use `images/thumbnails/<set id>.png`:

- `images/thumbnails/apex_frontier.png`
- `images/thumbnails/nebula_siege.png` (thumbnail spelling is `siege`, the plate spelling is `seige`)
- `images/thumbnails/rift_assault.png`
- `images/thumbnails/sector_run.png`
- `images/thumbnails/void_run.png`

### 2.2 Asteroids and minerals

Correct and decoy rocks pick a random sprite from:

- `images/asteroids/asteroid1.png`
- `images/asteroids/asteroid2.png`
- `images/asteroids/asteroid3.png`
- `images/asteroids/asteroid4.png`
- `images/asteroids/asteroid6.png`

There is no `asteroid5.png`. The home menu floats these same five files behind the title.

Mineral drops and the mineral pickup icon use `images/asteroids/mineral.png`. A correct hit bursts minerals equal to the lowest digit of the asteroid's label.

### 2.3 Aliens

| Type key | File |
| --- | --- |
| `scout`, `alien_ET` | `images/aliens/alien_ET.png` |
| `alien_brain` | `images/aliens/alien_brain.png` |
| `alien_golem` | `images/aliens/alien_golem.png` |
| `alien_galaga` | `images/aliens/alien_galaga.png` |
| `alien_eye` | `images/aliens/alien_eye.png` |
| `alien_saucer` | `images/aliens/alien_saucer.png` |
| `alien_robot` | `images/aliens/alien_robot.png` |
| `alien_spider` | `images/aliens/alien_spider.png` |

### 2.4 Ships

Default unlocked in the catalog: Scarlet Classic, Verdant Spire, AM3 Scout. The rest start locked. The special key (default Q) calls `shockwave()`, which branches on the ship's ability.

| Id | Name | File | Ability |
| --- | --- | --- | --- |
| `classic` | Scarlet Classic | `images/ships/Scarlet Classic.png` | shockwave |
| `spire` | Verdant Spire | `images/ships/Verdant Spire.png` | side flares |
| `am2` | AM3 Scout | `images/ships/AM3 Scout.png` | teleport (`spin`) |
| `mk7` | Crimson MK-7 | `images/ships/Crimson MK-7.png` | downburst |
| `fizard` | Aurora Dart | `images/ships/Aurora Dart.png` | intangible (`phase`), 7s cooldown |
| `bu2x` | BU2X | `images/ships/BU2X.png` | knockback of up to 3 rocks |
| `ember` | Ruby Strike | `images/ships/Ruby Strike.png` | overflight |
| `azure` | Azure Lancer | `images/ships/Azure Lancer.png` | overflight |
| `mantas` | Mantas Arc-5 | `images/ships/Mantas - Arc 5.png` | shockwave |
| `cyan` | Cyan Vector 7 | `images/ships/Cyan Vector 7.png` | compass |
| `veloz` | Veloz Mas | `images/ships/Veloz Mas.png` | compass |
| `verde9` | VER-DE-9 | `images/ships/VER-DE-9.png` | knockback of up to 3 rocks |
| `whiteflame8` | White Flame 8 | `images/ships/White Flame 8.png` | clear the lane in front |
| `datsawze` | D.A.T. Sawze | `images/ships/D.A.T. Sawze.png` | downburst |
| `apextiburoniv` | Apex Tiburon IV | `images/ships/Apex Tiburon IV.png` | compass |

`images/ships/Apex Tiburon.png` (no "IV") is on disk and is not assigned to a ship.

HUD ability icons:

- `images/ui/dash.png`
- `images/ui/shockwave.png`
- `images/ui/flares.png`
- `images/ui/teleport.png`

`images/ui/controls.png` and `images/ui/intange.png` are on disk and are not referenced by the game script or the HTML pages.

### 2.5 Shot icons and bullet sprites

Menu and catalog icons are the `images/shots/` files. The projectile drawn in flight is the matching `images/bullets/` file.

| Mode | Catalog icon | In-flight sprite |
| --- | --- | --- |
| single | none (briefing uses the bullet) | `images/bullets/bullet_single.png` |
| missile | `images/shots/shot_missile.png` | `images/bullets/bullet_missile.png` |
| laser | `images/shots/shot_laser.png` | `images/bullets/bullet_laser.png` |
| fire | `images/shots/shot_fire.png` | `images/bullets/bullet_fire1.png` |
| ice | `images/shots/shot_ice.png` | `images/bullets/bullet_ice.png` |
| electric | `images/shots/shot_electric.png` | `images/bullets/bullet_electric1.png` |
| pierce (bola) | `images/shots/shot_bola.png` | `images/bullets/bullet_bola.png` |
| plasma | `images/shots/shot_plasma.png` | `images/bullets/bullet_orb.png` |
| rail | `images/shots/shot_rail.png` | `images/bullets/bullet_rail.png` |

`images/shots/shot_electric2.png` is not used.

Stampede claw:

- closed: `images/bullets/claw_closed.png`
- open: `images/bullets/claw_open.png`

### 2.6 Powerup icons

| Id | Label | File |
| --- | --- | --- |
| `repair` | Hull Repair | `images/powerups/powerup_hullrepair.png` |
| `time` | Time Dilation | `images/powerups/powerup_timedelay.png` |
| `magnet` | Magnet Sweep | `images/powerups/powerup_magnet.png` |
| `emp` | EMP Burst | `images/powerups/powerup_EMP.png` |
| `lock` | Target Lock | `images/powerups/powerup_targetlock.png` |
| `autofire`, `machinegun` | Auto-Fire | `images/powerups/powerup_machinegun.png` |
| `ammo` | Ammo Cache | `images/powerups/powerup_ammo.png` |
| `speedup` | Afterburner | `images/powerups/rare_speedboost.png` |
| `invincibility` | Battle Screen | `images/powerups/rare_invincibility.png` |
| `pushaway` | Repulsor Field | `images/powerups/rare_pushaway.png` |
| `scope` | Scope | `images/powerups/powerup_scope.png` |
| `shield` | Shield | `images/powerups/powerup_shield.png` |
| `armor` | Armor | `images/powerups/powerup_armor.png` |

### 2.7 Commander

- closed mouth: `images/characters/commander1.png`
- talking: `images/characters/commander2.png`

Used on the mission briefing and in the tutorial overlay. While text types, the portrait swaps to the open mouth on a timer, then back to the closed mouth.

Favicon: `images/misc/favicon.png`.

Sprite sheets under `images/misc/` (`Assorted cartoon asteroids collection.png`, `Sci-fi ability icons set1.png`, `set2.png`, `set3.png`) are source art. The game does not slice them at runtime.

## 3. Animations and what triggers them

Almost every effect is drawn in code. There are no sprite-sheet animation clips.

### 3.1 Shared impact effects (`animations.js`)

- **Correct hit** (`impactCorrect`): 0.10s of slow-mo at scale 0.42, camera shake amplitude 7.5 for 0.10s, a cyan and amber expanding ring, and 36 cyan particles.
- **Wrong hit** (`impactWrong`): shake 4.0 for 0.08s and 22 red particles.
- **Debris** (`impactDebris`): shake 2.0 for 0.06s and 12 pale particles. Used when a rock breaks without a full correct or wrong sting.
- **Ship hit** (`impactShipHit`): shake 28 for 0.16s, yellow sparks, smoke, and the synthesized beep. No slow-mo.
- **Damage smoke** (`emitDamageSmoke`): while hull is damaged and the ship is not invulnerable, smoke puffs spawn behind the ship. More smoke when the ship is moving and the hull is lower.
- **Directed sparks** (`spawnDirectedSparks`): a cone of sparks along a direction. Flares use this on rocks they push.
- Rings are capped at 14. Particles are capped at 180. Smoke grows and fades. Other particles slow down and fade in a fraction of a second.

### 3.2 Ship motion

- **Dash** (Shift): the ship jumps up to its dash distance (Scarlet Classic 200, others mostly 130). Five ghost images of the ship are left along the path and fade over 0.32s. Invulnerable for 0.6s. If the dash line hits an asteroid, the ship stops short and the collision resolves. Camera shake 12 for 0.1s. Sound: `dash`.
- **Muzzle**: every shot sets `recoil` and `flash` to 1 so the sprite kicks and the muzzle flashes, and `spawnGunSmoke` drops smoke at the nose.
- **Thruster loops**: `ship_idle` or `ship_advance` as in the sound table. The sprite also draws exhaust from the ship profile.
- **Electric shot**: sets `state.lightningFlash` for 0.12s, a full-screen flash on top of the bolt sprite.

### 3.3 Special abilities (Q)

All of these go through `shockwave()` and respect that ship's cooldown.

- **Shockwave** (Scarlet Classic, Mantas Arc-5, and the default): pushes asteroids inside the radius (Classic 220 / strength 760, default 160 / 520). Classic and Mantas also spawn a ring. Shake 14 for 0.12s. Sound: `dash`. Toast: SHOCKWAVE.
- **Side flares** (Verdant Spire): two flare points offset 46px for 0.9s. Rocks inside the radius are pushed and spark (`spark` and `spark_white`) at most every 0.18s. Icon `images/ui/flares.png`. Sound: `flares`.
- **Teleport** (AM3 Scout): a longer dash (Spire dash distance times 1.35). Smoke at the start, sparks at the end, ship hidden for 0.35s. `teleportFx` draws the travel for about 0.32s and plays `teleport_reappear` when the hide ends. Sound at the start: `teleport_disappear`.
- **Overflight** (Ruby Strike, Azure Lancer): ship scale eases up to 1.68 over 0.42s, holds, then eases down over the last 0.55s of a 6s timer. Sound: `dash`. Toast: OVERFLIGHT.
- **Intangible** (Aurora Dart): `phaseTimer` 6s. Sound: `teleport_disappear`. Toast: INTANGIBLE.
- **Compass** (Cyan Vector 7, Veloz Mas, Apex Tiburon IV): `compassTimer` 6s. Sound: `dash`. Toast: COMPASS ONLINE.
- **Knockback** (BU2X, VER-DE-9): up to 3 nearest rocks inside 220px are shoved, spun, and shaken for 0.12s. Each gets debris plus white sparks and `impact_thud`. A short burst overlay (`knock3Fx`, 0.22s) and a camera flash (0.06s). If one of them is the correct answer, that answer is compromised. Sound: `dash` at volume 0.82. Toast: KNOCKBACK.
- **Clear front** (White Flame 8): rocks in the forward lane are removed. Correct ones count as a hit (`impactCorrect`); others are debris. Flash 0.12s and a 0.22s lane overlay. Sound: `dash`. Toast: CLEAR FRONT.
- **Downburst** (Crimson MK-7, D.A.T. Sawze): rocks below the ship inside the radius are pushed downward. Five rays draw for 0.35s from just under the ship. Shake 10 for 0.1s. Sound: `dash`. Toast: DOWNBURST.

### 3.4 Asteroids

- Spawn above the view (or from the side) and fall. They spin (`spin` about -2.6 to 2.6 rad/s) and drift sideways on a sine.
- Side spawns fade in over 0.4s.
- A hit sets `shakeTimer`. Effects (`markAsteroidEffect`) can burn, freeze, or fade the rock, then mark it ghost so it no longer deals damage.
- Retired wave rocks fade out (`retiredFade`).
- Stampede claw: hold the special key near the correct rock. A line draws from the ship to the claw. Phase `open` uses `claw_open.png` for 0.12s, then `claw_closed.png` while the rock is `grabbedByClaw` and reeled in. Retract adds a small random wobble. A prompt ("HOLD … TO GRAB") fades in when a target is in range.

### 3.5 Aliens

- Hit shake on damage.
- A killed boss can retreat upward instead of exploding (`retreating`, slow drift).
- Swarm: shooting the alien that shows the correct digit removes the whole pool and plays debris at each member.
- Firing plays `alien_shooting` and spawns an alien bullet.

### 3.6 Powerup pickups on screen

`spawnPowerup` drops an icon that falls at 90–140 px/s and spins. A radial glow uses the type color (repair cyan, time and EMP magenta, magnet gold, shield yellow-green, armor red, ammo orange, and so on). Hidden powerups pop: scale pulses over 0.55s (or the caller's duration) from a base pop scale of about 0.7–0.92.

### 3.7 World dressing (`background.js`)

Rebuilt when the canvas size changes.

- Three star layers, drifting down, some twinkling, a few drawn as a cross.
- 1–3 planets with a gradient fill and sometimes a ring, drifting down.
- Rare shooting streaks (cyan or magenta), at most two at once.
- Optional nebula color wash at alpha 0.38.
- `darken` fills the frame with 90% black before the stars. Used when a photo background should stay readable.

### 3.8 HUD and end of run

- Countdown overlay before the run, with `session_start`.
- Level-up banner when the level increases.
- Toasts for hits, powerups, and abilities.
- End panel: score counts up (`animateEndScore`), minerals count up (`animateMineralsCount`), and the score list can scroll to a row.
- Tutorial hull failure: ship hides, shake, explosion sound, ring, sparks, and smoke, then Commander Solver explains the hull bar.

## 4. How powerups are rewarded and used

Live rules are `choosePowerupDrop`, `applyPowerup`, and `secondaryFireForPilot` in `game.js`. The `POWERUPS` list in `powerups.js` is not what the run uses.

### 4.1 How a drop is chosen

`choosePowerupDrop()` rolls a group, then a type.

Secondary pool (weights are repeated entries): time, time, emp, emp, magnet, lock, repair, autofire, scope, ammo, ammo. Stampede swaps in a pool that favors emp and autofire.

Rare secondary, 5% of secondary rolls: `speedup`, `invincibility`, or `pushaway`.

Defense roll: 55% shield, 45% armor.

Context changes the roll:

- Hull under 30%: a large chance to force a secondary drop, and 60% of those are Hull Repair.
- Alien swarm: more defense (shield or armor) and repair.
- Stampede: more defense-or-secondary, still biased to repair when the hull is low.
- Campaign and primary ammo at or under 14% of the soft cap (at least 12 rounds): 52% chance the drop is ammo before the other rolls.

Offense shot types are not in this random pool. They are chosen in the mission menu, or granted as an orange offense pickup when that path spawns one. A missile pickup is replaced with laser if missiles are not allowed. Missile is also blocked while auto-fire is active.

### 4.2 When a drop appears

- **Hidden in the correct asteroid.** After 7 correct answers (4 in a campaign) with no hidden drop already waiting, the next correct asteroid carries a hidden powerup. Destroying it plays `powerup_emerges` and pops the icon out of the rock. If that rock escapes, the hidden flag clears.
- **Event chance on a correct hit** (only if no hidden drop just spawned): 10% if the rock had already shown the escape warning, else 30% on a precision hit (answered within the precision window of spawning). A streak of 3 clean waves spawns one for certain.
- **Alien destroyed** in a swarm pool: one drop at the alien.
- **Low ammo scripted drops** can force an ammo pickup near the ship.
- **Tutorial** spawns repair, time, magnet, and EMP on a fixed script, not the random table.
- Random top-of-screen drops use `maybeDropPowerup` (40% pass, then `choosePowerupDrop`). It does nothing while a hidden powerup is already armed.

Pickups fall and spin until the ship overlaps them.

### 4.3 What collecting does

**Offense** (two "knock charges"): the shot type stays until two asteroid bumps or alien bullets spend the charges, then the ship returns to single shots. A pre-launch menu choice is different: that type is unlimited for the mission (`blasterHitsRemaining` 9999).

**Defense**

- Shield: 10 seconds. Hits strip the shield before hull. Toast DEFENSE -> SHIELD.
- Armor: 5 hits, with a 0.14s flash on the ship. Toast DEFENSE -> ARMOR.
- Scope, if it arrives as defense: 1 second of laser guide.

**Instant secondary**

- Hull Repair: +35% hull, cyan ring and correct-hit particles. Toast HULL REPAIRED.
- Afterburner: +thrust for 20s.
- Battle Screen: no hull damage from asteroids or aliens for 20s.
- Repulsor Field: pushes nearby asteroids for 20s. The answer rock snaps back if it leaves the field.
- Ammo Cache: +22 primary rounds.
- Scope: 1 second guide.

**Charged secondary** (stored, then fired with E): Time Dilation, Magnet Sweep, EMP Burst, Target Lock, Auto-Fire. The toast names the charge and the key.

Using a charge (`secondaryFireForPilot`):

- Repair from a slot: another +35% hull, ring, and particles.
- Time Dilation: slow-mo for 8 seconds at scale 0.35, after a 0.8s delay while a wave graphic travels. Sound `time_activate`.
- Magnet Sweep: 6 seconds pulling the correct asteroid.
- EMP Burst: 2 seconds. Cascades non-answer asteroids. Each cascade hit can play `impact_thud`. Sound `emp_activate`.
- Target Lock: at least 6 seconds of shots steering to the correct asteroid.
- Auto-Fire: toggles a magazine for the current shot type (not during missile). Magazine size: single 300, laser 325, fire 250, ice 350, electric 500, bola 100, plasma 400, rail 550. Spin-up plays `machine_gun_load`.
- Cooldown after a charge is 1.2s (0.35s when toggling auto-fire).

The in-game catalog (`CATALOGS` in the pause settings) lists these with the same icons and the descriptions stored on `powerupCatalogSecondary`, `powerupCatalogDefense`, and `powerupCatalogOffense`.

## 5. How the menu sets up a mission

The front door is `public/home.html` ("Mentaris / The Arith Belt"). Buttons:

- **Launch** — last setup, straight into a run
- **Campaign** — 6-mission run. Profiles, then a campaign, then a mission map. Three failures end the run. Start Mission opens the briefing
- **Single Mission** — the 6-step custom setup below
- **Side Ops** — separate mini-game page (`side_ops.html`), not this asset set
- **Tutorial** — guided tour inside the game
- **Achievements**, **Leaderboards**, **Settings**, **Exit**

### 5.1 Single Mission funnel

`#funnelOverlay`, six steps. The stepper reads "Step N of 6".

1. **Operation** (`data-op`): Multiplication, Addition, Rationals, Squares.
2. **Mode**: Digit Hunt, Classic Answer, Series, Stampede, Factor Hunt, Divisors. The hidden field `#questionMode` stores the concrete mode id.
3. **Submode**: 2 by 1 or 3 by 1 (and the matching addition or series variants the step shows for that operation).
4. **Difficulty**: Easy, Normal, Hard, Brutal. An options panel under it sets number ranges (A min/max, B min/max), decoy count (2–5), decoy style (units-digit bias, structured, digit shuffle), speed, lives (5, 10, 15, 20), strikes, and timer (off, 60, 90, 120, 180, 300, 600 seconds).
5. **Cluster Selector** (`#belt`): the seven belts in the table above. Locked clusters show a mineral cost.
6. **Ship Frame**: the ship roster. Locked ships are bought with minerals.

Footer: Reset, Back, Continue, Save, and **Pilot Ship** (`#btnLaunchGame`).

Choosing a grade (the chip under Single Mission) pre-fills ranges, difficulty, and pace. The player can still change every step.

### 5.2 Mission briefing

`#briefingOverlay` shows before the run:

- objective text
- ship name and `images/ships/…` portrait (default art is Crimson MK-7)
- cluster name and the belt image (default `images/backgrounds/sector_run_d.png`)
- shot label and bullet icon (default `images/bullets/bullet_single.png`)
- mode, difficulty, operation, submode, lives, strikes, time limit
- Commander Solver portrait (`images/characters/commander1.png`) and a command hint

**Launch Mission** writes the query (operation, mode, difficulty, belt, ship, ranges, timer, lives) and opens `asteroid_blaster.html`. That page reads the query and calls `setBackgroundBelt`, the question mode, and the ship.

### 5.3 In the mission

`public/asteroid_blaster.html` is the run. HUD: score, streak, level, timer, accuracy, the problem chip, Pause (P), Settings, Home.

Settings (`#overlayMenu`) is not where the mission is built. It has four tabs:

- **Audio** — master, SFX, and soundtrack sliders, plus a preview list of every clip in `sfxCatalog`
- **Display** — fullscreen and widened playfield
- **Controls** — WASD or arrows, Space or click to fire, E secondary, Q special, Shift dash, P pause, M menu, and key remaps
- **Catalogs** — secondary, defense, offense, and ships, with the icons and descriptions above

Pause does not rebuild the question, the belt, or the ship. Those were fixed at launch.

Sandbox (from home Settings, once unlocked) is an in-run panel: session toggles, every operation and mode, shot types, defense, secondary charges, ships, and clusters. Cluster buttons call `setBackgroundBelt`. That is the only place a belt can be swapped after launch.

## 6. Page files

| File | Role |
| --- | --- |
| `public/home.html` | Front menu, funnel, briefing, campaign, settings |
| `public/asteroid_blaster.html` | The mission |
| `public/asteroid_blaster.css` | Layout and HUD |
| `public/game.html`, `public/competitive.html` | Other entry pages |
| `public/side_ops.html` | Mini games |
| `src/js/core/game.js` | Rules, images, powerups, animations |
| `src/js/core/audio.js` | Sound bank |
