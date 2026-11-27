export const SHIP_FILES = [
  "AM2 Scout.png",
  "AM3 Scout.png",
  "Apex Tiburon IV.png",
  "Apex Tiburon.png",
  "Aurora Dart.png",
  "Azure Lancer.png",
  "BU2X.png",
  "Crimson MK-7.png",
  "Cyan Vector 7.png",
  "D.A.T. Sawze.png",
  "Mantas - Arc 5 (1).png",
  "Mantas - Arc 5.png",
  "Ruby Strike.png",
  "Scarlet Classic.png",
  "VER-DE-9.png",
  "Veloz Mas.png",
  "Verdant Spire.png",
  "White Flame 8.png",
];

export const ASTEROID_FILES = [
  "asteroid1.png",
  "asteroid2.png",
  "asteroid3.png",
  "asteroid4.png",
  "asteroid6.png",
];

export const MINERAL_FILE = "mineral.png";

export const DEFAULT_SHIP = "Verdant Spire.png";

/** Blaster image folders under public/images/ */
export const ALIEN_FILES = [
  "alien_brain.png",
  "alien_ET.png",
  "alien_eye.png",
  "alien_galaga.png",
  "alien_golem.png",
  "alien_robot.png",
  "alien_saucer.png",
  "alien_spider.png",
];

export const BULLET_FILES = [
  "bullet_bola.png",
  "bullet_electric.png",
  "bullet_electric1.png",
  "bullet_fire.png",
  "bullet_fire1.png",
  "bullet_ice.png",
  "bullet_laser.png",
  "bullet_missile.png",
  "bullet_orb.png",
  "bullet_rail.png",
  "bullet_single.png",
  "claw_closed.png",
  "claw_open.png",
];

export const POWERUP_IMAGE_FILES = [
  "powerup_ammo.png",
  "powerup_armor.png",
  "powerup_EMP.png",
  "powerup_hullrepair.png",
  "powerup_machinegun.png",
  "powerup_magnet.png",
  "powerup_scope.png",
  "powerup_shield.png",
  "powerup_targetlock.png",
  "powerup_timedelay.png",
  "rare_invincibility.png",
  "rare_pushaway.png",
  "rare_speedboost.png",
];

export const SHOT_IMAGE_FILES = [
  "shot_bola.png",
  "shot_electric.png",
  "shot_electric2.png",
  "shot_fire.png",
  "shot_ice.png",
  "shot_laser.png",
  "shot_missile.png",
  "shot_plasma.png",
  "shot_rail.png",
];

/**
 * SFX under public/sfx/{folder}/ — Phaser keys are basename without .mp3.
 * T3 maps cue names (wrong, mineral, thrust, extract_start) onto these keys.
 */
export const SFX_FILES = {
  gameplay: [
    "correct.mp3",
    "impact.mp3",
    "impact_thud.mp3",
    "mineral_collected.mp3",
    "missed_answer.mp3",
    "ship_damage_alarm.mp3",
    "wrong_asteroid.mp3",
  ],
  ship: [
    "crash.mp3",
    "dash.mp3",
    "explosion.mp3",
    "flares.mp3",
    "ship_advance.mp3",
    "ship_damaged.mp3",
    "ship_drone.mp3",
    "ship_idle.mp3",
    "ship_whoosh.mp3",
    "ship_whoosh3.mp3",
    "space_whoosh2.mp3",
    "teleport_disappear.mp3",
    "teleport_reappear.mp3",
  ],
  powerups: [
    "armor_pickup.mp3",
    "EMP_activate.mp3",
    "hull_repair_pickup.mp3",
    "powerup_collected.mp3",
    "powerup_emerges.mp3",
    "sheld_pickup.mp3",
    "shot_powerup.mp3",
    "time_activate.mp3",
  ],
  ui: ["item_purchased.mp3", "menu_beep.mp3", "tutorial_messages.mp3"],
  progress: [
    "session_start.mp3",
    "level_up2.mp3",
    "15_sec_mark.mp3",
    "mission_cleared1.mp3",
    "game_over3.mp3",
  ],
  alerts: ["warning.mp3"],
  alien: [
    "alien_hit.mp3",
    "alien_kill.mp3",
    "alien_shooting.mp3",
    "alien_12oclock_warning.mp3",
    "alien_attack.mp3",
  ],
  commander_solver: ["training/t_start.mp3"],
  shots: [
    "bolt_shot.mp3",
    "camer_ice_shot.mp3",
    "electric_shot.mp3",
    "flame_shot.mp3",
    "gun1.mp3",
    "gun2.mp3",
    "ice_shot.mp3",
    "machine_gun_load.mp3",
    "missile_shot (1).mp3",
    "shot_missile.mp3",
    "shot_orb.mp3",
    "shot_railbeam.mp3",
  ],
};

function assetUrl(folder, name) {
  return "/" + folder + "/" + name.split("/").map(encodeURIComponent).join("/");
}

function audioKey(filename) {
  const base = filename.split("/").pop() || filename;
  return base.replace(/\.mp3$/i, "");
}

/** List of { key, url } for Phaser `this.load.image(key, url)`. */
export function listPhaserImages() {
  const entries = [];
  for (const name of SHIP_FILES) {
    entries.push({ key: name, url: assetUrl("assets/ships", name) });
  }
  for (const name of ASTEROID_FILES) {
    entries.push({ key: name, url: assetUrl("assets/asteroids", name) });
  }
  entries.push({
    key: MINERAL_FILE,
    url: assetUrl("assets/asteroids", MINERAL_FILE),
  });
  for (const name of ALIEN_FILES) {
    entries.push({ key: name, url: assetUrl("images/aliens", name) });
  }
  for (const name of BULLET_FILES) {
    entries.push({ key: name, url: assetUrl("images/bullets", name) });
  }
  for (const name of POWERUP_IMAGE_FILES) {
    entries.push({ key: name, url: assetUrl("images/powerups", name) });
  }
  for (const name of SHOT_IMAGE_FILES) {
    entries.push({ key: name, url: assetUrl("images/shots", name) });
  }
  return entries;
}

/** List of { key, url } for Phaser `this.load.audio(key, url)`. */
export function listPhaserAudio() {
  const entries = [];
  for (const [folder, files] of Object.entries(SFX_FILES)) {
    for (const name of files) {
      entries.push({
        key: audioKey(name),
        url: assetUrl(`sfx/${folder}`, name),
      });
    }
  }
  return entries;
}
