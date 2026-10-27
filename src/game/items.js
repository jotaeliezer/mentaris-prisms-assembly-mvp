/** Stacks, count-based recipes, and hotbar/cargo moves. No crafting grid. */

/** Same order as the five rock pictures. A slot shows that picture, smaller. */
const ORE_SPRITE = { pale: 0, slate: 1, amber: 2, virid: 3, glint: 4 };

/** World drops use mineral.png tinted. Slots must use that crystal, not the asteroid picture. */
const ORE_FILTER = {
  pale: 'none',
  slate: 'grayscale(0.55) brightness(0.95)',
  amber: 'hue-rotate(-55deg) saturate(1.6)',
  virid: 'hue-rotate(70deg) saturate(1.3)',
  glint: 'hue-rotate(-25deg) saturate(1.8) brightness(1.15)',
};

const MADE_ICON = {
  glass: 'glass.png',
  iron: 'iron.png',
  resin: 'resin.png',
  filament: 'filament.png',
  wire: 'wire.png',
  foil: 'foil.png',
  gem: 'gem.png',
  drive: 'drive.png',
  hull: 'hull.png',
  hint: 'hint.png',
  jumper: 'jumper.png',
  bench: 'fabrication-tool.png',
  map: 'map.png',
  compass: 'compass.png',
  ping: 'ping.png',
  gate: 'gate.png',
  repair: 'repair.png',
  blink: 'blink.png',
  tractor: 'tractor.png',
  quiet: 'quiet.png',
  cloak: 'cloak.png',
  dash: 'dash.png',
  shock: 'shockwave.png',
  shield: 'shield.png',
  teleport: 'teleport.png',
  hyper: 'hyperdrive.png',
  megajump: 'megajump.png',
  bow: 'bow.png',
  plating: 'hull.png',
  ward: 'shield.png',
  housing: 'dash.png',
  wall: 'wall.png',
  panel: 'panel.png',
  corner: 'corner.png',
  bunker: 'bunker.png',
  telescope: 'telescope.png',
  satellite: 'satellite.png',
  dock: 'dock.png',
  gunship: 'gunship.png',
  drill: 'drill.png',
  'belt-drill': 'drill.png',
  excavator: 'excavator.png',
  c4: 'c4.png',
  extension: 'extension.png',
  vault: 'vault.png',
  beacon: 'beacon.png',
  salvage: 'salvage.png',
  comet: 'comet-dust.png',
  ion: 'ion-mote.png',
  prism: 'prism-mote.png',
  'ice-ammo': 'ice-ammo.png',
  'fire-ammo': 'fire-ammo.png',
  'laser-ammo': 'laser-ammo.png',
  'rail-ammo': 'rail-ammo.png',
};

export function iconFilter(id) {
  return ORE_FILTER[id] || 'none';
}

/** Bullet pictures already under public/images/bullets. */
const WEAPON_BULLET = {
  'arc-missile': 'bullet_missile.png',
  // Missile rounds have no picture of their own, so they wear the bullet the
  // weapon fires. The alien rounds have their own art in MADE_ICON.
  'missile-ammo': 'bullet_missile.png',
  flare: 'bullet_fire1.png',
  'ice-shot': 'bullet_ice.png',
  'fire-shot': 'bullet_fire1.png',
  'laser-shot': 'bullet_laser.png',
  'electric-shot': 'bullet_electric1.png',
  'bola-shot': 'bullet_bola.png',
  'plasma-shot': 'bullet_orb.png',
  'rail-shot': 'bullet_rail.png',
};

const SHOT_ICON = {
  'ice-shot': 'shot_ice.png',
  'fire-shot': 'shot_fire.png',
  'laser-shot': 'shot_laser.png',
  'electric-shot': 'shot_electric.png',
  'bola-shot': 'shot_bola.png',
  'plasma-shot': 'shot_plasma.png',
  'rail-shot': 'shot_rail.png',
};

/** Pictures cut from the alien that drops the part. The cannon is the weapon that spends a core. */
const ALIEN_ICON = {
  gland: 'spark-gland.png',
  fiber: 'grip-fiber.png',
  shard: 'hull-shard.png',
  lamp: 'cold-lamp.png',
  servo: 'servo-joint.png',
  spike: 'spike-crystal.png',
  chart: 'alien-chart.png',
  core: 'alien-core.png',
  'core-cannon': 'core-cannon.png',
};

/**
 * Picture for a hotbar or cargo slot.
 * Ores copy the mineral crystal. Crafted parts, station pieces, and space finds use painted pictures. Weapons reuse a bullet or shot. Alien parts use their own picture.
 */
export function slotIcon(id) {
  if (id === 'star-clock' || id === 'dust-pale' || id === 'halo-lens') return '/images/stars/star-pale.png';
  if (id === 'dust-cinder') return '/images/stars/star-cinder.png';
  if (id === 'dust-glint') return '/images/stars/star-glint.png';
  if (Object.prototype.hasOwnProperty.call(ORE_SPRITE, id)) return '/assets/asteroids/mineral.png';
  const made = MADE_ICON[id];
  if (made) return '/images/items/' + made;
  const shot = SHOT_ICON[id];
  if (shot) return '/images/shots/' + shot;
  const bullet = WEAPON_BULLET[id];
  if (bullet) return '/images/bullets/' + bullet;
  const alien = ALIEN_ICON[id];
  return alien ? '/images/items/' + alien : '';
}

/**
 * The bullet a weapon puts in the air. Weapons in SHOT_STYLE carry their own
 * face there; this covers the missile-class ones, so each fires the bullet its
 * own slot shows.
 */
export function weaponBullet(id) {
  return WEAPON_BULLET[id] || '';
}

/** Phaser texture key for a drop that has its own picture. Ores stay on the mineral sprite. */
export function dropSpriteKey(id) {
  const icon = slotIcon(id);
  const folders = ['/images/items/', '/images/stars/', '/images/bullets/'];
  if (!folders.some((folder) => icon.startsWith(folder))) return '';
  return icon.slice(icon.lastIndexOf('/') + 1);
}

export const STACK_MAX = 64;
/** One magazine. Alien-weapon ammo stacks to a full load. */
export const AMMO_STACK = 150;
export const BASE_AMMO = 150;
export const AMMO_OF = {
  'ice-shot': 'ice-ammo',
  'fire-shot': 'fire-ammo',
  'laser-shot': 'laser-ammo',
  'rail-shot': 'rail-ammo',
  'arc-missile': 'missile-ammo',
};
const AMMO_IDS = new Set(Object.values(AMMO_OF));

export function stackLimit(id) {
  return AMMO_IDS.has(id) ? AMMO_STACK : STACK_MAX;
}

/** Weapons, abilities, and construction stay on the hotbar. Everything else goes to cargo. */
export function staysOnHotbar(id) {
  const item = ITEMS[id];
  return !!item && (item.kind === 'weapon' || item.kind === 'ability' || item.kind === 'construction');
}
/** Four across and ten down, so the hold is as tall as the hotbar. */
export const CARGO_COLS = 4;
export const CARGO_ROWS = 10;
export const CARGO_SIZE = CARGO_COLS * CARGO_ROWS;

export const ITEMS = {
  pale: { id: 'pale', name: 'Pale ore', mark: 'Pa', color: '#9be7ff', tint: 0x9be7ff, kind: 'mineral', about: 'The common cyan crystal from a pale rock. It feeds Prism glass, the layer jumper, and most early counts.' },
  slate: { id: 'slate', name: 'Slate ore', mark: 'Sl', color: '#8ea4b8', tint: 0x8ea4b8, kind: 'mineral', about: 'A blue-grey crystal from a slate rock. Two of them draw into Slate wire once the Fabrication Tool is carried. The wire can be stored, and it has no use yet.' },
  amber: { id: 'amber', name: 'Amber ore', mark: 'Am', color: '#ffb15a', tint: 0xffb15a, kind: 'mineral', about: 'A warm crystal from an amber rock. Counts that need heat spend it: Belt iron, Amber resin, and the layer map.' },
  virid: { id: 'virid', name: 'Virid ore', mark: 'Vi', color: '#7dff9a', tint: 0x7dff9a, kind: 'mineral', about: 'A green crystal from a virid rock. It is uncommon. Two of them press into Virid foil once the Fabrication Tool is carried. The foil can be stored, and it has no use yet.' },
  glint: { id: 'glint', name: 'Glint ore', mark: 'Gn', color: '#ffe27a', tint: 0xffe27a, kind: 'mineral', about: 'A bright crystal from a glint rock. Glint rocks are rare, and a hard question drops at most two. One of them cuts a Glint gem once the Fabrication Tool is carried. The gem can be stored, and it has no use yet.' },
  glass: { id: 'glass', name: 'Prism glass', mark: 'Gl', color: '#d7fff4', tint: 0xd7fff4, kind: 'alloy', about: 'Pale ore sintered into a clear plate. It is a feed stock, not a tool. Use it for hints, the compass, and the layer map.' },
  iron: { id: 'iron', name: 'Belt iron', mark: 'Fe', color: '#c5ced6', tint: 0xc5ced6, kind: 'alloy', about: 'A grey metal bar made from pale and amber ore. It is the structural alloy. Use it for missiles, hull plates, and the drive coil.' },
  resin: { id: 'resin', name: 'Amber resin', mark: 'Re', color: '#ffcf70', tint: 0xffcf70, kind: 'alloy', about: 'Sticky amber refined from amber ore. It binds other parts. Use it for Void filament and the tractor pulse.' },
  filament: { id: 'filament', name: 'Void filament', mark: 'Vf', color: '#c9b6ff', tint: 0xc9b6ff, kind: 'alloy', about: 'A violet thread of resin and glass. It is a rare part. Use it to fabricate Phase blink.' },
  wire: { id: 'wire', name: 'Slate wire', mark: 'Sw', color: '#9eb4c6', tint: 0x9eb4c6, kind: 'alloy', about: 'A blue-grey strand drawn from slate ore. It can be stored in the hotbar or the cargo. It has no use.' },
  foil: { id: 'foil', name: 'Virid foil', mark: 'Fo', color: '#b6f7a0', tint: 0xb6f7a0, kind: 'alloy', about: 'A thin green sheet pressed from virid ore. It can be stored in the hotbar or the cargo. It has no use.' },
  gem: { id: 'gem', name: 'Glint gem', mark: 'Ge', color: '#ffe9a3', tint: 0xffe9a3, kind: 'alloy', about: 'A bright face cut from one glint crystal. It can be stored in the hotbar or the cargo. It has no use.' },
  'arc-missile': { id: 'arc-missile', name: 'Arc missile', mark: 'Ar', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'weapon', use: 'missile', about: 'A homing shot for aliens and asteroids. It curves around other rocks to reach the target, and it locks from much farther away. The weapon stays on the hotbar. Select it and left click to spend one Missile round. It comes with 150 rounds.' },
  flare: { id: 'flare', name: 'Survey flare', mark: 'Sf', color: '#fff1a8', tint: 0xfff1a8, kind: 'weapon', use: 'flare', about: 'A survey count of the rocks still on this layer. Use it from the hotbar. Useful when you want to know if the belt around you is spent before you jump.' },
  drive: { id: 'drive', name: 'Drive coil', mark: 'Dr', color: '#7ad7ff', tint: 0x7ad7ff, kind: 'ship', use: 'drive', about: 'A coil that raises the ship’s top speed. Use it from the hotbar. Each coil is one tier, up to three. Useful when the belt feels slow.' },
  hull: { id: 'hull', name: 'Hull plate', mark: 'Hu', color: '#b7d4ff', tint: 0xb7d4ff, kind: 'ship', use: 'hull', about: 'A plate that raises maximum hull and repairs a little. Use it from the hotbar, up to three times. Useful after a few rock bumps.' },
  hint: { id: 'hint', name: 'Math hint', mark: 'Hi', color: '#ffe08a', tint: 0xffe08a, kind: 'ship', use: 'hint', about: 'A hint for the rock you are nearest. Use it from the hotbar. It tells you if a one-digit answer is odd or even, or the first digit of a longer one. Useful when you are stuck on an extract.' },
  map: { id: 'map', name: 'Layer map', mark: 'Mp', color: '#9ad7ff', tint: 0x9ad7ff, kind: 'hud', use: 'map', about: 'The small map in the bottom right of the flight view. Fabricating it turns that map on for this layer. Useful when you need to see rocks and the gate without flying blind.' },
  compass: { id: 'compass', name: 'Layer compass', mark: 'Lc', color: '#d2fff8', tint: 0xd2fff8, kind: 'hud', about: 'A hull instrument. Once it is worn, the flight view draws this layer as a line, with a dot for where the ship sits between the two ends, and the layer number beside that line. It is not used up from the hotbar. Useful after several jumps, when you need to know if you are far to the left or the right.' },
  'star-clock': { id: 'star-clock', name: 'Star clock', mark: 'Sc', color: '#ffe7a8', tint: 0xffe7a8, kind: 'hud', about: 'A carried copy of the belt sun. The sun’s name and arc are already on the flight view. Up is the half of the turn when a lair can let an alien out.' },
  'dust-pale': { id: 'dust-pale', name: 'Pale dust', mark: 'Pd', color: '#e7f4ff', tint: 0xe7f4ff, kind: 'space', about: 'One mote shaken loose from a pale star’s halo. It is not Pale ore, and it cannot pay an ore cost. The Halo lens spends one.' },
  'halo-lens': { id: 'halo-lens', name: 'Halo lens', mark: 'Hl', color: '#e7f4ff', tint: 0xe7f4ff, kind: 'ability', use: 'halo', about: 'Reports the nearest layer star. Select it and left click. It is not used up. Fabricating it spends one Pale dust mote and one Prism glass.' },
  'dust-cinder': { id: 'dust-cinder', name: 'Cinder dust', mark: 'Ci', color: '#ffb15a', tint: 0xffb15a, kind: 'space', about: 'One mote from a cinder star’s halo. It is not Amber ore.' },
  'dust-glint': { id: 'dust-glint', name: 'Glint dust', mark: 'Gd', color: '#ffe27a', tint: 0xffe27a, kind: 'space', about: 'One mote from a glint star’s halo. It is not Glint ore.' },
  ping: { id: 'ping', name: 'Ore ping', mark: 'Op', color: '#ffd7a1', tint: 0xffd7a1, kind: 'hud', use: 'ping', about: 'Reports how far the nearest dropped mineral is. Use it from the hotbar. Useful when an extract dropped ore and you flew past it.' },
  gate: { id: 'gate', name: 'Gate marker', mark: 'Gm', color: '#d2b4ff', tint: 0xd2b4ff, kind: 'ability', use: 'gate', about: 'Points to the wormhole or the return gate. Select it and left click. The belt does not draw that arrow until this marker is fabricated. It is not used up.' },
  repair: { id: 'repair', name: 'Repair patch', mark: 'Rp', color: '#8dffb0', tint: 0x8dffb0, kind: 'ability', use: 'repair', about: 'Restores 40 hull, up to the maximum. Use it from the hotbar. Useful just after a bump, before the hull reaches zero.' },
  blink: { id: 'blink', name: 'Phase blink', mark: 'Bl', color: '#e7d6ff', tint: 0xe7d6ff, kind: 'ability', use: 'blink', about: 'Slides the ship forward a short hop along its aim. Use it from the hotbar. Useful for slipping past a rock that is blocking the gate.' },
  tractor: { id: 'tractor', name: 'Tractor pulse', mark: 'Tr', color: '#ffb15a', tint: 0xffb15a, kind: 'ability', use: 'tractor', about: 'Pulls nearby drops toward the ship. Use it from the hotbar. Useful when ore is sitting on the far side of a rock you do not want to scrape.' },
  quiet: { id: 'quiet', name: 'Quiet running', mark: 'Qr', color: '#9bb0c0', tint: 0x9bb0c0, kind: 'ability', use: 'quiet', about: 'For a few seconds, bumping a rock does not damage the hull. Use it from the hotbar. Useful when you must squeeze between rocks to reach a drop.' },
  cloak: { id: 'cloak', name: 'Cloak', mark: 'Ck', color: '#c9b6ff', tint: 0xc9b6ff, kind: 'ability', use: 'cloak', about: 'Aliens lose sight of the ship for a few seconds. Select it and left click. Rocks can still bump the hull.' },
  dash: { id: 'dash', name: 'Dash', mark: 'Ds', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ability', use: 'dash', about: 'A short burst along the nose. Press Left Shift while flying, or select it and left click. Each use spends one charge.' },
  'belt-drill': { id: 'belt-drill', name: 'Drill', mark: 'Di', color: '#e8a05a', tint: 0xe8a05a, kind: 'ability', about: 'Stays with the ship after it is fabricated. An asteroid breaks after two correct answers instead of three. A question does not use it up. The Mega drill on a station is a different piece.' },
  excavator: { id: 'excavator', name: 'Excavator', mark: 'Ev', color: '#ffb15a', tint: 0xffb15a, kind: 'ability', about: 'Stays with the ship after it is fabricated. An asteroid breaks after one correct answer. If a Drill is also carried, the excavator is the one that counts.' },
  c4: { id: 'c4', name: 'C4', mark: 'C4', color: '#ff6b6b', tint: 0xff6b6b, kind: 'ability', use: 'c4', about: 'Select it and click an asteroid. The rock breaks with no question, and that charge is spent. Ore from the blast is marked. While any marked ore is in the hold, fabrication questions are a little harder.' },
  shock: { id: 'shock', name: 'Shockwave', mark: 'Sw', color: '#d7f6ff', tint: 0xd7f6ff, kind: 'ability', use: 'shock', about: 'A ring that shoves nearby aliens away and hurts them. Select it and left click.' },
  shield: { id: 'shield', name: 'Shield', mark: 'Sh', color: '#9be7ff', tint: 0x9be7ff, kind: 'ability', use: 'shield', about: 'The next rock bump or alien hit is absorbed. Select it and left click before you take the hit.' },
  teleport: { id: 'teleport', name: 'Teleport', mark: 'Tp', color: '#e7d6ff', tint: 0xe7d6ff, kind: 'ability', use: 'teleport', about: 'Vanishes and reappears a long hop along the nose, the way the scout frame does. Select it and left click.' },
  hyper: { id: 'hyper', name: 'Hyperdrive', mark: 'Hy', color: '#ffe27a', tint: 0xffe27a, kind: 'ability', use: 'hyper', about: 'Fast travel to a point on this same layer. Select it, then left click the destination.' },
  megajump: { id: 'megajump', name: 'MegaJump', mark: 'Mj', color: '#7ee0d0', tint: 0x7ee0d0, kind: 'ability', use: 'megajump', about: 'Jump to any layer in the stack. Select it, type the layer from -250 to 250, then Enter. Minus flips the sign.' },
  /** Placeholder cost. The real jumper ingredients are still open. */
  jumper: { id: 'jumper', name: 'Layer jumper', mark: 'Jp', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ship', about: 'A carried part that unlocks Q and E layer travel. It is not used up by a jump. If a hull breach drops it, layer travel locks until you pick it up. The 4 Pale ore cost is a stand-in.' },
  bow: { id: 'bow', name: 'Bow plating', mark: 'Bp', color: '#d5e6ff', tint: 0xd5e6ff, kind: 'ship', about: 'Worn in the hull panel. A rock hit does a little less damage. Level 1 is a modest change, and the piece can be raised to level 3. The 3 Pale ore count and the raise cost are stand-ins.' },
  plating: { id: 'plating', name: 'Hull plating', mark: 'Hp', color: '#c5d4e4', tint: 0xc5d4e4, kind: 'ship', about: 'Worn in the hull panel. Raises maximum hull. The Pale ore count is a stand-in.' },
  ward: { id: 'ward', name: 'Shield plate', mark: 'Wd', color: '#9be7ff', tint: 0x9be7ff, kind: 'ship', about: 'Worn in the hull panel. After a hit, the next hit in a short moment is ignored. The Pale ore count is a stand-in.' },
  housing: { id: 'housing', name: 'Thruster housing', mark: 'Th', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ship', about: 'Worn in the hull panel. Raises top speed. The Pale ore count is a stand-in.' },
  bench: { id: 'bench', name: 'Fabrication Tool', mark: 'Fb', color: '#d7e4ff', tint: 0xd7e4ff, kind: 'station', about: 'A carried emitter. Keep it in the hotbar or cargo and the bay opens the rest of the index. Drop it on a hull breach and those counts close until you pick it up.' },
  gland: { id: 'gland', name: 'Spark gland', mark: 'Sg', color: '#7dff9a', tint: 0x7dff9a, kind: 'alien', about: 'A green charge from a scout. Store it in the hotbar or cargo. It is the part for a strong energy weapon, and the gunship room spends one. The belt does not drop it until a lair opens.' },
  fiber: { id: 'fiber', name: 'Grip fiber', mark: 'Gf', color: '#d5d8df', tint: 0xd5d8df, kind: 'alien', about: 'A coil from a spider. Store it until a later count makes Quiet running last longer. It is not worn.' },
  shard: { id: 'shard', name: 'Hull shard', mark: 'Hs', color: '#5ee0c5', tint: 0x5ee0c5, kind: 'alien', about: 'A plate from a dartwing. Store it for a later hull count. It is not worn by itself.' },
  lamp: { id: 'lamp', name: 'Cold lamp', mark: 'Cl', color: '#d7f4ff', tint: 0xd7f4ff, kind: 'alien', about: 'A small lamp from an eye. It is a part for the beacon and for night-bright hull work. It is not a weapon. Store it until those counts exist.' },
  servo: { id: 'servo', name: 'Servo joint', mark: 'Sv', color: '#7aa2ff', tint: 0x7aa2ff, kind: 'alien', about: 'A hinge from a pincer. It is the part for thruster housing, which raises top speed, once that slot exists. Store it until then.' },
  spike: { id: 'spike', name: 'Spike crystal', mark: 'Sp', color: '#b7c9d6', tint: 0xb7c9d6, kind: 'alien', about: 'A spike from a golem. It is the material for raising bow plating once the Pale ore stand-in is replaced. Store it until then.' },
  chart: { id: 'chart', name: 'Alien chart', mark: 'Ac', color: '#e7eef5', tint: 0xe7eef5, kind: 'alien', about: 'A one-use note from a saucer. When strongholds exist, using it shows the layer and the direction of another stronghold, or of a black hole, in this cluster. Store it until then.' },
  core: { id: 'core', name: 'Alien core', mark: 'Co', color: '#ff7ab8', tint: 0xff7ab8, kind: 'alien', about: 'The heart of a brain. The Core cannon spends one, and the mega drill spends one. Store it, then fabricate the cannon with the Fabrication Tool.' },
  salvage: { id: 'salvage', name: 'Hull salvage', mark: 'Vg', color: '#c5ced6', tint: 0xc5ced6, kind: 'space', about: 'A broken plate from a debris field. It is weaker than ore and cannot replace an alloy. Shot counts can spend it.' },
  comet: { id: 'comet', name: 'Comet dust', mark: 'Cd', color: '#ffe7b0', tint: 0xffe7b0, kind: 'space', about: 'Dust from a comet tail. It is not star dust. Fire and heat shots spend it.' },
  ion: { id: 'ion', name: 'Ion mote', mark: 'Io', color: '#b7e4ff', tint: 0xb7e4ff, kind: 'space', about: 'A pinch of current from an ion stream. Electric shots spend it.' },
  prism: { id: 'prism', name: 'Prism mote', mark: 'Pm', color: '#e7d6ff', tint: 0xe7d6ff, kind: 'space', about: 'A spark left by flying through a prism ring. The rail shot spends one.' },
  'ice-shot': { id: 'ice-shot', name: 'Ice shot', mark: 'Ic', color: '#b7f4ff', tint: 0xb7f4ff, kind: 'weapon', use: 'shot', about: 'A slower bolt for aliens only. The weapon stays on the hotbar. One click spends one Ice round and freezes one alien. Ram the frozen alien with the hull to break it. It comes with 150 rounds.' },
  'fire-shot': { id: 'fire-shot', name: 'Fire shot', mark: 'Fi', color: '#ffb15a', tint: 0xffb15a, kind: 'weapon', use: 'shot', about: 'A short flamethrower for aliens only. The weapon stays on the hotbar. One click spends one Fire round, washes the cone in front of the nose, and pushes aliens back. It comes with 150 rounds.' },
  'laser-shot': { id: 'laser-shot', name: 'Laser shot', mark: 'Lz', color: '#8dffb0', tint: 0x8dffb0, kind: 'weapon', use: 'shot', about: 'Aliens only, at the same reach as a single shot. The weapon stays on the hotbar. One click spends one Laser round and fires the three-bolt burst. It comes with 150 rounds.' },
  'rail-shot': { id: 'rail-shot', name: 'Rail shot', mark: 'Rl', color: '#ffe27a', tint: 0xffe27a, kind: 'weapon', use: 'shot', about: 'A fast, long-range rail dart for aliens only. The weapon stays on the hotbar. One click spends one Rail round, and the ship kicks harder. It comes with 150 rounds.' },
  'ice-ammo': { id: 'ice-ammo', name: 'Ice rounds', mark: 'Ir', color: '#b7f4ff', tint: 0xb7f4ff, kind: 'ammo', about: 'Rounds for the Ice shot. They sit in the cargo. One click of the weapon spends one round.' },
  'fire-ammo': { id: 'fire-ammo', name: 'Fire rounds', mark: 'Fr', color: '#ffb15a', tint: 0xffb15a, kind: 'ammo', about: 'Rounds for the Fire shot. They sit in the cargo. One click of the weapon spends one round.' },
  'laser-ammo': { id: 'laser-ammo', name: 'Laser rounds', mark: 'Lr', color: '#8dffb0', tint: 0x8dffb0, kind: 'ammo', about: 'Rounds for the Laser shot. They sit in the cargo. One click of the weapon spends one round.' },
  'rail-ammo': { id: 'rail-ammo', name: 'Rail rounds', mark: 'Rr', color: '#ffe27a', tint: 0xffe27a, kind: 'ammo', about: 'Rounds for the Rail shot. They sit in the cargo. One click of the weapon spends one round.' },
  'missile-ammo': { id: 'missile-ammo', name: 'Missile rounds', mark: 'Mr', color: '#7ee7ff', tint: 0x7ee7ff, kind: 'ammo', about: 'Rounds for the Arc missile. They sit in the cargo. One click of the weapon spends one round.' },
  'electric-shot': { id: 'electric-shot', name: 'Electric shot', mark: 'El', color: '#7ad7ff', tint: 0x7ad7ff, kind: 'weapon', use: 'shot', about: 'A crackling bolt. Select it and left click. It breaks one rock in range. The count spends slate wire, a spark gland, and an ion mote.' },
  'bola-shot': { id: 'bola-shot', name: 'Bola shot', mark: 'Bo', color: '#d5d8df', tint: 0xd5d8df, kind: 'weapon', use: 'shot', about: 'Select it and left click an asteroid. The rock becomes four stars and the shot keeps flying. Finish that rock’s questions and the bola breaks the closest asteroid ahead for extra ore.' },
  'plasma-shot': { id: 'plasma-shot', name: 'Plasma shot', mark: 'Pl', color: '#c9b6ff', tint: 0xc9b6ff, kind: 'weapon', use: 'shot', about: 'Hits aliens and asteroids. A three-star rock or higher can still be answered. Shooting it drops the rock to two stars and gives it an easier question. The shot does not break the rock by itself.' },
  'core-cannon': { id: 'core-cannon', name: 'Core cannon', mark: 'Cn', color: '#ff8ec8', tint: 0xff8ec8, kind: 'weapon', use: 'core', about: 'The heavy weapon. Select it and left click. It reaches farther than the Arc missile, and one shot breaks one rock. On an alien it counts as two of the three hits. The count spends an Alien core and stays hidden until a core is in the hold.' },
  wall: { id: 'wall', name: 'Wall', mark: 'Wa', color: '#d5e2ec', tint: 0xd5e2ec, kind: 'construction', about: 'A thin bar. It is placed from the hotbar by clicking in space.' },
  panel: { id: 'panel', name: 'Panel', mark: 'Pn', color: '#9eb6c8', tint: 0x9eb6c8, kind: 'construction', about: 'A square deck plate. It is placed from the hotbar by clicking in space.' },
  corner: { id: 'corner', name: 'Corner', mark: 'Cr', color: '#e7d3b0', tint: 0xe7d3b0, kind: 'construction', about: 'A right-angle joint for a station. It turns a straight run of walls so the build can branch. Fabricate it at the bench, then place it from the hotbar.' },
  bunker: { id: 'bunker', name: 'Bunker', mark: 'Bk', color: '#7f97ab', tint: 0x7f97ab, kind: 'construction', about: 'A closed room on the station. It is placed from the hotbar by clicking in space.' },
  telescope: { id: 'telescope', name: 'Telescope', mark: 'Ts', color: '#8ecfff', tint: 0x8ecfff, kind: 'construction', about: 'A scope pointed along the belt. It is placed from the hotbar by clicking in space.' },
  satellite: { id: 'satellite', name: 'Satellite', mark: 'Sa', color: '#c4b4ef', tint: 0xc4b4ef, kind: 'construction', about: 'A small dish. It is placed from the hotbar by clicking in space.' },
  dock: { id: 'dock', name: 'Fueling dock', mark: 'Dk', color: '#ffd27a', tint: 0xffd27a, kind: 'construction', about: 'A fueling dock. It is placed from the hotbar by clicking in space.' },
  gunship: { id: 'gunship', name: 'Gunship', mark: 'Gs', color: '#ff9ec8', tint: 0xff9ec8, kind: 'construction', about: 'A turret housing fixed to the station. It is placed from the hotbar by clicking in space.' },
  drill: { id: 'drill', name: 'Mega drill', mark: 'Dl', color: '#e8a05a', tint: 0xe8a05a, kind: 'construction', about: 'A drill head fixed to the station. It is placed from the hotbar by clicking in space.' },
  extension: { id: 'extension', name: 'Layer extension', mark: 'Ex', color: '#7ee0d0', tint: 0x7ee0d0, kind: 'construction', about: 'An extension module. It is placed from the hotbar by clicking in space.' },
  vault: { id: 'vault', name: 'Ore vault', mark: 'Vt', color: '#b7c4ce', tint: 0xb7c4ce, kind: 'construction', about: 'A heavy store room. It is placed from the hotbar by clicking in space.' },
  beacon: { id: 'beacon', name: 'Beacon', mark: 'Bc', color: '#fff1b8', tint: 0xfff1b8, kind: 'construction', about: 'A lamp. It is placed from the hotbar by clicking in space.' },
};

/** Each recipe is a result plus how many of each material it takes. station: 'bench' waits until that item is carried. */
export const RECIPES = [
  { id: 'glass', category: 'basics', result: 'glass', count: 1, costs: [{ id: 'pale', n: 2 }] },
  { id: 'bench', category: 'basics', result: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }] },
  { id: 'arc-missile', category: 'weapons', result: 'arc-missile', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'glass', n: 2 }, { id: 'resin', n: 1 }, { id: 'pale', n: 2 }] },
  { id: 'core-cannon', category: 'weapons', result: 'core-cannon', station: 'bench', reveal: 'core', count: 1, costs: [{ id: 'core', n: 1 }, { id: 'iron', n: 2 }, { id: 'glass', n: 1 }] },
  { id: 'flare', category: 'weapons', result: 'flare', station: 'bench', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'ice-shot', category: 'weapons', result: 'ice-shot', station: 'bench', count: 1, costs: [{ id: 'slate', n: 1 }, { id: 'wire', n: 1 }, { id: 'shard', n: 1 }] },
  { id: 'fire-shot', category: 'weapons', result: 'fire-shot', station: 'bench', count: 1, costs: [{ id: 'amber', n: 1 }, { id: 'resin', n: 1 }, { id: 'gland', n: 1 }] },
  { id: 'laser-shot', category: 'weapons', result: 'laser-shot', station: 'bench', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'glass', n: 1 }, { id: 'lamp', n: 1 }] },
  { id: 'electric-shot', category: 'weapons', result: 'electric-shot', station: 'bench', count: 1, costs: [{ id: 'wire', n: 1 }, { id: 'gland', n: 1 }, { id: 'ion', n: 1 }] },
  { id: 'bola-shot', category: 'weapons', result: 'bola-shot', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'fiber', n: 1 }, { id: 'salvage', n: 2 }] },
  { id: 'plasma-shot', category: 'weapons', result: 'plasma-shot', station: 'bench', count: 1, costs: [{ id: 'filament', n: 1 }, { id: 'lamp', n: 1 }, { id: 'virid', n: 1 }] },
  { id: 'rail-shot', category: 'weapons', result: 'rail-shot', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'wire', n: 1 }, { id: 'spike', n: 1 }] },
  { id: 'ice-ammo', category: 'weapons', result: 'ice-ammo', station: 'bench', count: 50, costs: [{ id: 'slate', n: 1 }] },
  { id: 'fire-ammo', category: 'weapons', result: 'fire-ammo', station: 'bench', count: 50, costs: [{ id: 'amber', n: 1 }] },
  { id: 'laser-ammo', category: 'weapons', result: 'laser-ammo', station: 'bench', count: 50, costs: [{ id: 'glass', n: 1 }] },
  { id: 'rail-ammo', category: 'weapons', result: 'rail-ammo', station: 'bench', count: 50, costs: [{ id: 'iron', n: 1 }] },
  { id: 'missile-ammo', category: 'weapons', result: 'missile-ammo', station: 'bench', count: 50, costs: [{ id: 'resin', n: 1 }] },
  { id: 'drive', category: 'ship', result: 'drive', station: 'bench', count: 1, costs: [{ id: 'iron', n: 3 }, { id: 'pale', n: 1 }] },
  { id: 'hull', category: 'ship', result: 'hull', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'pale', n: 2 }] },
  { id: 'hint', category: 'ship', result: 'hint', station: 'bench', count: 1, costs: [{ id: 'glass', n: 1 }] },
  { id: 'jumper', category: 'ship', result: 'jumper', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }] },
  { id: 'bow', category: 'ship', result: 'bow', station: 'bench', count: 1, costs: [{ id: 'pale', n: 3 }], standIn: true },
  { id: 'plating', category: 'ship', result: 'plating', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }], standIn: true },
  { id: 'ward', category: 'ship', result: 'ward', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }], standIn: true },
  { id: 'housing', category: 'ship', result: 'housing', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }], standIn: true },
  { id: 'iron', category: 'alloys', result: 'iron', station: 'bench', count: 1, costs: [{ id: 'pale', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'resin', category: 'alloys', result: 'resin', station: 'bench', count: 1, costs: [{ id: 'amber', n: 2 }] },
  { id: 'filament', category: 'alloys', result: 'filament', station: 'bench', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'wire', category: 'alloys', result: 'wire', station: 'bench', count: 1, costs: [{ id: 'slate', n: 2 }] },
  { id: 'foil', category: 'alloys', result: 'foil', station: 'bench', count: 1, costs: [{ id: 'virid', n: 2 }] },
  { id: 'gem', category: 'alloys', result: 'gem', station: 'bench', count: 1, costs: [{ id: 'glint', n: 1 }] },
  { id: 'map', category: 'hud', result: 'map', station: 'bench', count: 1, costs: [{ id: 'glass', n: 2 }, { id: 'amber', n: 1 }] },
  { id: 'compass', category: 'hud', result: 'compass', station: 'bench', count: 1, costs: [{ id: 'glass', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'star-clock', category: 'hud', result: 'star-clock', station: 'bench', count: 1, costs: [{ id: 'glass', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'ping', category: 'hud', result: 'ping', station: 'bench', count: 1, costs: [{ id: 'pale', n: 1 }, { id: 'amber', n: 1 }] },
  { id: 'gate', category: 'hud', result: 'gate', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'repair', category: 'abilities', result: 'repair', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'pale', n: 2 }] },
  { id: 'blink', category: 'abilities', result: 'blink', station: 'bench', count: 1, costs: [{ id: 'filament', n: 1 }] },
  { id: 'tractor', category: 'abilities', result: 'tractor', station: 'bench', count: 1, costs: [{ id: 'resin', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'quiet', category: 'abilities', result: 'quiet', station: 'bench', count: 1, costs: [{ id: 'amber', n: 1 }, { id: 'pale', n: 2 }] },
  { id: 'cloak', category: 'abilities', result: 'cloak', station: 'bench', count: 1, costs: [{ id: 'filament', n: 2 }, { id: 'resin', n: 1 }, { id: 'glass', n: 1 }, { id: 'amber', n: 2 }] },
  { id: 'dash', category: 'abilities', result: 'dash', station: 'bench', count: 1, costs: [{ id: 'iron', n: 1 }, { id: 'amber', n: 1 }, { id: 'pale', n: 1 }] },
  { id: 'belt-drill', category: 'abilities', result: 'belt-drill', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'slate', n: 2 }, { id: 'pale', n: 4 }] },
  { id: 'excavator', category: 'abilities', result: 'excavator', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'amber', n: 2 }, { id: 'virid', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'c4', category: 'abilities', result: 'c4', station: 'bench', count: 1, costs: [{ id: 'glint', n: 2 }, { id: 'virid', n: 2 }, { id: 'amber', n: 2 }, { id: 'resin', n: 1 }, { id: 'spike', n: 1 }, { id: 'comet', n: 2 }] },
  { id: 'shock', category: 'abilities', result: 'shock', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'comet', n: 2 }, { id: 'spike', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'shield', category: 'abilities', result: 'shield', station: 'bench', count: 1, costs: [{ id: 'iron', n: 2 }, { id: 'foil', n: 1 }, { id: 'shard', n: 1 }, { id: 'salvage', n: 2 }] },
  { id: 'teleport', category: 'abilities', result: 'teleport', station: 'bench', count: 1, costs: [{ id: 'filament', n: 2 }, { id: 'lamp', n: 1 }, { id: 'glass', n: 2 }, { id: 'prism', n: 1 }] },
  { id: 'hyper', category: 'abilities', result: 'hyper', station: 'bench', count: 1, costs: [{ id: 'drive', n: 1 }, { id: 'iron', n: 3 }, { id: 'gem', n: 1 }, { id: 'ion', n: 1 }, { id: 'filament', n: 2 }] },
  { id: 'megajump', category: 'abilities', result: 'megajump', station: 'bench', count: 1, costs: [{ id: 'jumper', n: 1 }, { id: 'iron', n: 2 }, { id: 'glass', n: 2 }, { id: 'prism', n: 1 }, { id: 'resin', n: 2 }] },
  { id: 'halo-lens', category: 'abilities', result: 'halo-lens', station: 'bench', count: 1, costs: [{ id: 'dust-pale', n: 1 }, { id: 'glass', n: 1 }] },
  { id: 'wall', category: 'construction', result: 'wall', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }, { id: 'slate', n: 2 }] },
  { id: 'panel', category: 'construction', result: 'panel', station: 'bench', count: 1, costs: [{ id: 'pale', n: 2 }, { id: 'slate', n: 4 }] },
  { id: 'corner', category: 'construction', result: 'corner', station: 'bench', count: 1, costs: [{ id: 'pale', n: 4 }, { id: 'slate', n: 2 }, { id: 'wall', n: 1 }, { id: 'panel', n: 1 }] },
  { id: 'bunker', category: 'construction', result: 'bunker', station: 'bench', count: 1, costs: [{ id: 'pale', n: 8 }, { id: 'slate', n: 4 }, { id: 'wall', n: 2 }, { id: 'panel', n: 1 }] },
  { id: 'telescope', category: 'construction', result: 'telescope', station: 'bench', count: 1, costs: [{ id: 'pale', n: 6 }, { id: 'slate', n: 2 }, { id: 'wall', n: 1 }, { id: 'panel', n: 1 }] },
  { id: 'satellite', category: 'construction', result: 'satellite', station: 'bench', count: 1, costs: [{ id: 'pale', n: 6 }, { id: 'slate', n: 4 }, { id: 'wall', n: 1 }, { id: 'panel', n: 1 }] },
  { id: 'dock', category: 'construction', result: 'dock', station: 'bench', count: 1, costs: [{ id: 'pale', n: 40 }, { id: 'slate', n: 24 }, { id: 'amber', n: 16 }, { id: 'glass', n: 8 }, { id: 'iron', n: 4 }, { id: 'wall', n: 2 }, { id: 'panel', n: 2 }] },
  { id: 'gunship', category: 'construction', result: 'gunship', station: 'bench', count: 1, costs: [{ id: 'pale', n: 30 }, { id: 'amber', n: 20 }, { id: 'virid', n: 10 }, { id: 'iron', n: 6 }, { id: 'filament', n: 4 }, { id: 'gland', n: 1 }, { id: 'wall', n: 2 }, { id: 'panel', n: 1 }] },
  { id: 'drill', category: 'construction', result: 'drill', station: 'bench', count: 1, costs: [{ id: 'pale', n: 36 }, { id: 'slate', n: 18 }, { id: 'amber', n: 12 }, { id: 'virid', n: 8 }, { id: 'glint', n: 4 }, { id: 'iron', n: 6 }, { id: 'core', n: 1 }, { id: 'wall', n: 2 }, { id: 'panel', n: 2 }] },
  { id: 'extension', category: 'construction', result: 'extension', station: 'bench', count: 1, costs: [{ id: 'pale', n: 28 }, { id: 'slate', n: 16 }, { id: 'amber', n: 12 }, { id: 'virid', n: 6 }, { id: 'glass', n: 4 }, { id: 'resin', n: 4 }, { id: 'wall', n: 2 }, { id: 'panel', n: 1 }] },
  { id: 'vault', category: 'construction', result: 'vault', station: 'bench', count: 1, costs: [{ id: 'pale', n: 24 }, { id: 'amber', n: 16 }, { id: 'virid', n: 8 }, { id: 'glint', n: 4 }, { id: 'iron', n: 8 }, { id: 'wall', n: 2 }, { id: 'panel', n: 2 }] },
  { id: 'beacon', category: 'construction', result: 'beacon', station: 'bench', count: 1, costs: [{ id: 'pale', n: 20 }, { id: 'slate', n: 10 }, { id: 'amber', n: 6 }, { id: 'glass', n: 4 }, { id: 'wall', n: 1 }, { id: 'panel', n: 1 }] },
];

/** Immediate Fabrication has no station. The rest need that item in the hull. */
export function recipeOpen(state, recipe) {
  if (!recipe || !recipe.station) return true;
  return hullHas(state, recipe.station);
}

export const HULL_FITS = [
  { accept: 'jumper', label: 'Layer jumper' },
  { accept: 'bench', label: 'Fabrication Tool' },
  { accept: 'compass', label: 'Layer compass' },
  { accept: 'bow', label: 'Bow plating' },
  { accept: 'plating', label: 'Hull plating' },
  { accept: 'ward', label: 'Shield' },
  { accept: 'housing', label: 'Thruster housing' },
];

export const BOW_ID = 'bow';
export const BOW_MAX_LEVEL = 3;
/** Stand-in until the real counts are chosen. A few Pale ore, spent from the hotbar, then the cargo. */
export const BOW_LEVEL_COST = [{ id: 'pale', n: 3 }];

const LEVELED_HULL = new Set(['bow', 'plating', 'ward', 'housing']);

export function pieceLevel(stack) {
  if (!stack || !LEVELED_HULL.has(stack.id)) return 0;
  const n = Number(stack.level);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n > BOW_MAX_LEVEL ? BOW_MAX_LEVEL : n;
}

export function bowLevel(stack) {
  return stack && stack.id === BOW_ID ? pieceLevel(stack) : 0;
}

function pieceStack(id, count, level) {
  const stack = { id, count };
  if (id === 'bow' || id === 'plating' || id === 'ward' || id === 'housing') {
    stack.level = pieceLevel({ id, level: level || 1 });
  }
  return stack;
}

export function ensureHull(state) {
  if (!Array.isArray(state.hullSlots) || state.hullSlots.length !== HULL_FITS.length) {
    const next = HULL_FITS.map(() => null);
    if (Array.isArray(state.hullSlots)) {
      state.hullSlots.forEach((stack, index) => {
        if (index < next.length) next[index] = stack;
      });
    }
    state.hullSlots = next;
  }
}

export function hullHas(state, id) {
  ensureHull(state);
  return state.hullSlots.some((stack) => stack && stack.id === id);
}

/** Install a hull piece into its slot. Returns false if that slot is taken or the item does not fit. */
export function equipHull(state, id, level) {
  ensureHull(state);
  const index = HULL_FITS.findIndex((slot) => slot.accept === id);
  if (index < 0 || state.hullSlots[index]) return false;
  state.hullSlots[index] = pieceStack(id, 1, level);
  return true;
}

export function emptyStacks(count) {
  return Array.from({ length: count }, () => null);
}

export function itemById(id) {
  return ITEMS[id] || null;
}

export function itemTint(id) {
  const item = ITEMS[id];
  return item ? item.tint : 0x9be7ff;
}

export function ensureInventory(state) {
  if (!Array.isArray(state.hotbar) || state.hotbar.length !== 10) {
    state.hotbar = emptyStacks(10);
  }
  if (!Array.isArray(state.cargoSlots) || state.cargoSlots.length !== CARGO_SIZE) {
    const next = emptyStacks(CARGO_SIZE);
    if (Array.isArray(state.cargoSlots)) {
      state.cargoSlots.forEach((stack, index) => {
        if (index < next.length) next[index] = stack;
      });
    }
    state.cargoSlots = next;
  }
  ensureHull(state);
  for (const fit of HULL_FITS) {
    const index = HULL_FITS.findIndex((slot) => slot.accept === fit.accept);
    if (state.hullSlots[index]) continue;
    for (const list of [state.hotbar, state.cargoSlots]) {
      if (!list) continue;
      const found = list.findIndex((stack) => stack && stack.id === fit.accept);
      if (found < 0) continue;
      const foundStack = list[found];
      state.hullSlots[index] = pieceStack(fit.accept, 1, foundStack.level);
      foundStack.count -= 1;
      if (foundStack.count <= 0) list[found] = null;
      break;
    }
  }
  settleHotbar(state);
}

/** Pull minerals and other stored goods off the hotbar. Returns mineral names that moved. */
export function settleHotbar(state) {
  if (!state || !Array.isArray(state.hotbar) || !Array.isArray(state.cargoSlots)) return [];
  const moved = [];
  for (let i = 0; i < state.hotbar.length; i += 1) {
    const stack = state.hotbar[i];
    if (!stack || staysOnHotbar(stack.id)) continue;
    if (ITEMS[stack.id] && ITEMS[stack.id].kind === 'mineral') continue;
    const before = stack.count;
    const tainted = Math.min(stack.tainted || 0, before);
    const left = addInto(state.cargoSlots, stack.id, stack.count, stack.level);
    const sent = before - Math.max(0, left);
    const sentTaint = Math.min(tainted, sent);
    if (sent <= 0) continue;
    if (left <= 0) state.hotbar[i] = null;
    else {
      stack.count = left;
      stack.tainted = Math.min(left, Math.max(0, tainted - sentTaint));
    }
    if (sentTaint > 0) markTaint(state, stack.id, sentTaint, [state.cargoSlots]);
    const item = ITEMS[stack.id];
    if (item && item.kind === 'mineral') moved.push(item.name);
  }
  if (moved.length) {
    if (!Array.isArray(state.notices)) state.notices = [];
    for (const name of new Set(moved)) {
      state.notices.push({
        id: state.nextId ? state.nextId++ : Date.now(),
        text: name + ' moved to the cargo.',
        time: 2.2,
        kind: 'loot',
      });
    }
    if (state.notices.length > 3) state.notices.splice(0, state.notices.length - 3);
  }
  return moved;
}

export function markTaint(state, id, n, lists) {
  let left = n;
  const piles = lists || [state.cargoSlots, state.hotbar, state.hullSlots];
  for (const list of piles) {
    if (!list || left <= 0) continue;
    for (const stack of list) {
      if (!stack || stack.id !== id || left <= 0) continue;
      const room = stack.count - (stack.tainted || 0);
      if (room <= 0) continue;
      const take = Math.min(room, left);
      stack.tainted = (stack.tainted || 0) + take;
      left -= take;
    }
  }
}

export function holdHasTaint(state) {
  if (!state) return false;
  const lists = [state.hotbar, state.cargoSlots, state.hullSlots];
  return lists.some((list) => (list || []).some((stack) => stack && stack.tainted > 0));
}

export function countItem(state, id) {
  ensureInventory(state);
  let total = 0;
  for (const stack of state.hotbar) if (stack && stack.id === id) total += stack.count;
  for (const stack of state.cargoSlots) if (stack && stack.id === id) total += stack.count;
  if (state.hullSlots) {
    for (const stack of state.hullSlots) if (stack && stack.id === id) total += stack.count;
  }
  return total;
}

function addInto(list, id, count, level) {
  let left = count;
  const limit = stackLimit(id);
  if (id === BOW_ID) {
    const lv = bowLevel({ id: BOW_ID, level });
    for (let i = 0; i < list.length && left > 0; i++) {
      if (list[i]) continue;
      list[i] = { id: BOW_ID, count: 1, level: lv };
      left -= 1;
    }
    return left;
  }
  // A weapon that takes rounds arrives loaded, however it got here: fabricated,
  // picked up off the ground after a breach, or pulled out of a wreck.
  const magazine = AMMO_OF[id] ? BASE_AMMO : 0;
  for (const stack of list) {
    if (!stack || stack.id !== id || stack.count >= limit) continue;
    const take = Math.min(limit - stack.count, left);
    stack.count += take;
    if (magazine) stack.rounds = (stack.rounds || 0) + magazine * take;
    left -= take;
    if (left <= 0) return 0;
  }
  for (let i = 0; i < list.length; i++) {
    if (list[i]) continue;
    const take = Math.min(limit, left);
    list[i] = { id, count: take };
    if (magazine) list[i].rounds = magazine * take;
    left -= take;
    if (left <= 0) return 0;
  }
  return left;
}

/** Prefer the hotbar. Overflow goes to cargo. Returns how many did not fit. */
export function addItem(state, id, count, level) {
  ensureInventory(state);
  ensureHull(state);
  if (!ITEMS[id] || count <= 0) return count;
  let left = count;
  if (HULL_FITS.some((slot) => slot.accept === id) && equipHull(state, id, level)) left -= 1;
  if (left <= 0) return 0;
  if (staysOnHotbar(id)) {
    left = addInto(state.hotbar, id, left, level);
    if (left > 0) left = addInto(state.cargoSlots, id, left, level);
  } else {
    left = addInto(state.cargoSlots, id, left, level);
  }
  return left;
}

/** Collected ore stays on the hotbar. The caller moves it to cargo later. */
export function parkCollectedMineral(state, id, count, level) {
  ensureInventory(state);
  if (!ITEMS[id] || ITEMS[id].kind !== 'mineral' || count <= 0) return count;
  let left = addInto(state.hotbar, id, count, level);
  const onBar = count - left;
  if (onBar > 0) {
    if (!state.mineralHold) state.mineralHold = [];
    state.mineralHold.push({ id, count: onBar, at: state.clock || 0 });
  }
  if (left > 0) left = addInto(state.cargoSlots, id, left, level);
  return left;
}

/** Move ore whose hotbar time is up. Returns the names that actually moved. */
export function releaseHeldMinerals(state, afterSec) {
  if (!state || !state.mineralHold || !state.mineralHold.length) return [];
  ensureInventory(state);
  const wait = afterSec || 600;
  const now = state.clock || 0;
  const due = [];
  const keep = [];
  for (const entry of state.mineralHold) {
    if (now - (entry.at || 0) >= wait) due.push(entry);
    else keep.push(entry);
  }
  state.mineralHold = keep;
  const names = [];
  for (const entry of due) {
    let left = entry.count;
    let sentAny = 0;
    for (let i = 0; i < state.hotbar.length && left > 0; i += 1) {
      const stack = state.hotbar[i];
      if (!stack || stack.id !== entry.id) continue;
      const take = Math.min(stack.count, left);
      const unfit = addInto(state.cargoSlots, entry.id, take, stack.level);
      const sent = take - Math.max(0, unfit);
      if (sent <= 0) continue;
      const tainted = Math.min(stack.tainted || 0, sent);
      stack.count -= sent;
      stack.tainted = Math.max(0, (stack.tainted || 0) - tainted);
      if (stack.count <= 0) state.hotbar[i] = null;
      if (tainted > 0) markTaint(state, entry.id, tainted, [state.cargoSlots]);
      left -= sent;
      sentAny += sent;
    }
    if (sentAny > 0) {
      const item = ITEMS[entry.id];
      names.push(item ? item.name : entry.id);
    }
  }
  return names;
}

export function removeItems(state, id, count) {
  ensureInventory(state);
  if (count <= 0) return true;
  if (countItem(state, id) < count) return false;
  let left = count;
  for (const list of [state.cargoSlots, state.hotbar]) {
    for (let i = 0; i < list.length && left > 0; i++) {
      const stack = list[i];
      if (!stack || stack.id !== id) continue;
      const take = Math.min(stack.count, left);
      stack.count -= take;
      stack.tainted = Math.max(0, (stack.tainted || 0) - take);
      left -= take;
      if (stack.count <= 0) list[i] = null;
    }
  }
  return true;
}

export function canAfford(state, costs) {
  return costs.every((cost) => countItem(state, cost.id) >= cost.n);
}

/** Hotbar first, then cargo. Bow leveling and construction recipes use this. Other recipes use removeItems. */
function spendHotbarThenCargo(state, id, count) {
  let left = count;
  for (const list of [state.hotbar, state.cargoSlots]) {
    for (let i = 0; i < list.length && left > 0; i++) {
      const stack = list[i];
      if (!stack || stack.id !== id) continue;
      const take = Math.min(stack.count, left);
      stack.count -= take;
      stack.tainted = Math.max(0, (stack.tainted || 0) - take);
      left -= take;
      if (stack.count <= 0) list[i] = null;
    }
  }
  return left === 0;
}

/** Construction spends hotbar then cargo. Every other recipe still spends with removeItems, in cost order. */
export function payCraftCosts(state, recipe) {
  if (recipe.category === 'construction') {
    for (const cost of recipe.costs) spendHotbarThenCargo(state, cost.id, cost.n);
    return;
  }
  for (const cost of recipe.costs) removeItems(state, cost.id, cost.n);
}

/** Raise worn bow plating by one level. 'short', 'max', 'empty', or the new level. */
export function raiseBowPlating(state, id) {
  ensureInventory(state);
  const pieceId = id || BOW_ID;
  const index = HULL_FITS.findIndex((slot) => slot.accept === pieceId);
  const stack = index < 0 ? null : state.hullSlots[index];
  if (!stack || stack.id !== pieceId) return 'empty';
  const level = pieceLevel(stack);
  if (!level) return 'empty';
  if (level >= BOW_MAX_LEVEL) return 'max';
  if (!canAfford(state, BOW_LEVEL_COST)) return 'short';
  for (const cost of BOW_LEVEL_COST) {
    if (!spendHotbarThenCargo(state, cost.id, cost.n)) return 'short';
  }
  stack.level = level + 1;
  return stack.level;
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

export function costLabel(costs) {
  return costs.map((cost) => cost.n + ' ' + (ITEMS[cost.id] ? ITEMS[cost.id].name : cost.id)).join(' + ');
}

/**
 * Move a cargo stack onto a hotbar slot.
 * Same item merges. A different item swaps.
 */
export function moveCargoToHotbar(state, cargoIndex, hotbarIndex) {
  ensureInventory(state);
  if (!Number.isInteger(cargoIndex) || cargoIndex < 0 || cargoIndex >= state.cargoSlots.length) return false;
  if (!Number.isInteger(hotbarIndex) || hotbarIndex < 0 || hotbarIndex >= state.hotbar.length) return false;
  const from = state.cargoSlots[cargoIndex];
  if (!from || !staysOnHotbar(from.id)) return false;
  const to = state.hotbar[hotbarIndex];
  if (!to) {
    state.hotbar[hotbarIndex] = from;
    state.cargoSlots[cargoIndex] = null;
    return true;
  }
  if (to.id === from.id) {
    const take = Math.min(stackLimit(to.id) - to.count, from.count);
    if (take <= 0) return false;
    to.count += take;
    from.count -= take;
    if (from.count <= 0) state.cargoSlots[cargoIndex] = null;
    return true;
  }
  state.hotbar[hotbarIndex] = from;
  state.cargoSlots[cargoIndex] = to;
  return true;
}

/** Move a hotbar stack into cargo, merging when the material matches. */
export function moveHotbarToCargo(state, hotbarIndex) {
  ensureInventory(state);
  if (!Number.isInteger(hotbarIndex) || hotbarIndex < 0 || hotbarIndex >= state.hotbar.length) return false;
  const from = state.hotbar[hotbarIndex];
  if (!from) return false;
  const left = addInto(state.cargoSlots, from.id, from.count, from.level);
  if (left === from.count) return false;
  if (left <= 0) state.hotbar[hotbarIndex] = null;
  else from.count = left;
  return true;
}

/** Move a single piece between one hotbar slot and cargo. dir 1 pulls from cargo; dir -1 sends one out. */
function cargoDepositIndex(state, id) {
  if (!state.cargoDrop || typeof state.cargoDrop !== 'object') state.cargoDrop = {};
  const remembered = state.cargoDrop[id];
  if (Number.isInteger(remembered) && remembered >= 0 && remembered < state.cargoSlots.length) {
    const slot = state.cargoSlots[remembered];
    if (!slot || (slot.id === id && slot.count < stackLimit(id))) return remembered;
  }
  const room = [];
  state.cargoSlots.forEach((slot, index) => {
    if (!slot || (slot.id === id && slot.count < stackLimit(id))) room.push(index);
  });
  if (!room.length) return -1;
  const pick = room[Math.floor(Math.random() * room.length)];
  state.cargoDrop[id] = pick;
  return pick;
}

export function shiftOne(state, hotbarIndex, dir) {
  ensureInventory(state);
  if (!Number.isInteger(hotbarIndex) || hotbarIndex < 0 || hotbarIndex >= state.hotbar.length) return false;
  const stack = state.hotbar[hotbarIndex];
  if (!stack || !stack.id) return false;
  if (dir > 0 && !staysOnHotbar(stack.id)) return false;
  if (dir < 0) {
    if (stack.count <= 0) return false;
    const pick = cargoDepositIndex(state, stack.id);
    if (pick < 0) return false;
    const dest = state.cargoSlots[pick];
    if (!dest) state.cargoSlots[pick] = { id: stack.id, count: 1, ...(stack.level ? { level: stack.level } : {}) };
    else dest.count += 1;
    stack.count -= 1;
    if (stack.count <= 0) state.hotbar[hotbarIndex] = null;
    return true;
  }
  if (stack.count >= stackLimit(stack.id)) return false;
  const remembered = state.cargoDrop && state.cargoDrop[stack.id];
  let pick = -1;
  if (Number.isInteger(remembered)) {
    const slot = state.cargoSlots[remembered];
    if (slot && slot.id === stack.id && slot.count > 0) pick = remembered;
  }
  if (pick < 0) {
    pick = state.cargoSlots.findIndex((slot) => slot && slot.id === stack.id && slot.count > 0);
  }
  if (pick < 0) return false;
  const src = state.cargoSlots[pick];
  src.count -= 1;
  if (src.count <= 0) state.cargoSlots[pick] = null;
  stack.count += 1;
  return true;
}

function slotList(state, area) {
  ensureInventory(state);
  ensureHull(state);
  if (area === 'hotbar') return state.hotbar;
  if (area === 'cargo') return state.cargoSlots;
  if (area === 'hull') return state.hullSlots;
  return null;
}

/**
 * Pick up, place, merge, or swap between the hotbar and the cargo.
 * The carried stack sits on state.held until it is put down.
 */
export function inventoryClick(state, area, index) {
  const list = slotList(state, area);
  if (!list || !Number.isInteger(index) || index < 0 || index >= list.length) return false;
  const slot = list[index];
  const held = state.held || null;
  if (area === 'hotbar' && held && !staysOnHotbar(held.id)) return false;
  if (area === 'hull' && held) {
    const fit = HULL_FITS[index];
    if (!fit || held.id !== fit.accept) return false;
    if (held.count > 1) return false;
  }
  if (!held) {
    if (!slot) return false;
    state.held = { id: slot.id, count: slot.count, area, index };
    if (slot.id === BOW_ID) state.held.level = bowLevel(slot);
    list[index] = null;
    return true;
  }
  if (!slot) {
    list[index] = pieceStack(held.id, held.count, held.level);
    state.held = null;
    return true;
  }
  if (slot.id === held.id && held.id !== BOW_ID) {
    const take = Math.min(stackLimit(slot.id) - slot.count, held.count);
    if (take <= 0) return false;
    slot.count += take;
    held.count -= take;
    if (held.count <= 0) state.held = null;
    return true;
  }
  list[index] = pieceStack(held.id, held.count, held.level);
  state.held = { id: slot.id, count: slot.count, area, index };
  if (slot.id === BOW_ID) state.held.level = bowLevel(slot);
  return true;
}

/**
 * Drag a stack from one slot onto another. Same merge and swap rules as a click.
 * Dropping on the same slot puts it back.
 */
export function inventoryDrag(state, fromArea, fromIndex, toArea, toIndex) {
  if (state.held) returnHeld(state);
  if (fromArea === toArea && fromIndex === toIndex) return false;
  if (!inventoryClick(state, fromArea, fromIndex)) return false;
  return inventoryClick(state, toArea, toIndex);
}

/** Put a carried stack back when cargo closes, preferring its original slot. */
export function returnHeld(state) {
  if (!state.held) return;
  const held = state.held;
  state.held = null;
  const list = slotList(state, held.area);
  if (list && list[held.index] == null && !(held.area === 'hotbar' && !staysOnHotbar(held.id))) {
    list[held.index] = pieceStack(held.id, held.count, held.level);
    return;
  }
  const left = addItem(state, held.id, held.count, held.level);
  if (left > 0 && state.ship) {
    const drop = {
      id: state.nextId++,
      x: state.ship.x,
      y: state.ship.y,
      itemId: held.id,
      count: left,
      life: 40,
      maxLife: 40,
    };
    if (held.id === BOW_ID) drop.level = bowLevel(held);
    state.drops.push(drop);
  }
}

export function takeAllStacks(state) {
  ensureInventory(state);
  ensureHull(state);
  const stacks = [];
  for (const list of [state.hotbar, state.cargoSlots, state.hullSlots]) {
    for (let i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      stacks.push(list[i]);
      list[i] = null;
    }
  }
  return stacks;
}
