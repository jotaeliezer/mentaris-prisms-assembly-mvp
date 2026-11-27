/**
 * Pixel ship generator.
 *
 * The current fleet is nose-up and mirrored. The parts that change shape are
 * the nose, the wing plan, the wing tip, the cockpit, the nozzle count, and
 * one marking. This draws those parts on a small grid, shades them in a short
 * color ramp, and puts a black pixel on the outside edge. The same seed always
 * builds the same ship. Exhaust in flight is still drawn by the game.
 */

import { makeRng } from './util.js';

export const SHIP_GRID = { width: 29, height: 42 };
export const SHIP_SCALE = 3;

const NOSES = ['needle', 'wedge', 'blunt', 'split'];
const WINGS = ['delta', 'crescent', 'bulb', 'lancer', 'gull'];
const TIPS = ['square', 'spike', 'pod', 'raised'];
const COCKPITS = ['slit', 'canopy', 'bubble', 'crystal'];
const MARKINGS = ['spine', 'diamond', 'stripe', 'chevron'];
const ROLES = {
  delta: ['Scout', 'Vector', 'Strike'],
  crescent: ['Manta', 'Arc', 'Sawze'],
  bulb: ['Pod', 'Hull', 'Clam'],
  lancer: ['Lancer', 'Spire', 'Dart'],
  gull: ['Flame', 'Wing', 'Ray'],
};

/** Fleet colors: hull, a lighter plate, a shadow, a bright stripe, glass, metal, nozzle glow. */
const SCHEMES = [
  { id: 'prism', title: 'Prism', hull: '#6b46d6', light: '#d2c2ff', dark: '#3a2478', accent: '#ff4f9a', glass: '#5cecff', metal: '#8d97ab', glow: '#3ad8ff' },
  { id: 'verdant', title: 'Verdant', hull: '#2f8a55', light: '#b6f0c4', dark: '#16462c', accent: '#e6c15a', glass: '#7ef0ff', metal: '#6e7888', glow: '#ffe27a' },
  { id: 'crimson', title: 'Crimson', hull: '#1f6b62', light: '#8ee0c8', dark: '#0d3330', accent: '#ff8a1e', glass: '#ffd27a', metal: '#5c6774', glow: '#ff6a1a' },
  { id: 'aurora', title: 'Aurora', hull: '#e7eef6', light: '#ffffff', dark: '#8ea0b8', accent: '#ff8a1e', glass: '#3ec8ff', metal: '#667488', glow: '#ffb03a' },
  { id: 'tiburon', title: 'Tiburon', hull: '#f4f7fb', light: '#ffffff', dark: '#9aa8ba', accent: '#7dff4a', glass: '#49d4ff', metal: '#4e5968', glow: '#b6ff6a' },
  { id: 'sawze', title: 'Sawze', hull: '#d5dde8', light: '#ffffff', dark: '#7e8b9e', accent: '#e23b45', glass: '#ff5a6a', metal: '#5a6574', glow: '#ffb03a' },
  { id: 'mantas', title: 'Mantas', hull: '#7db84a', light: '#e4f5b0', dark: '#3d6824', accent: '#f4f7fb', glass: '#c86bff', metal: '#5c6572', glow: '#d070ff' },
  { id: 'vector', title: 'Vector', hull: '#c5ced8', light: '#ffffff', dark: '#6d7c90', accent: '#ff4f9a', glass: '#49d4ff', metal: '#4a5564', glow: '#ff5a3a' },
  { id: 'azure', title: 'Azure', hull: '#2f6fbf', light: '#b9dcff', dark: '#163a6e', accent: '#d6ff4a', glass: '#8fd4ff', metal: '#d5dde6', glow: '#e8fbff' },
  { id: 'ruby', title: 'Ruby', hull: '#8e2438', light: '#f0a0b0', dark: '#4a1020', accent: '#ffd27a', glass: '#7ee7ff', metal: '#6a7382', glow: '#ff7a3a' },
];

const EMPTY = 0;
const OUTLINE = 1;
const DARK = 2;
const HULL = 3;
const LIGHT = 4;
const METAL = 5;
const ACCENT = 6;
const GLASS = 7;
const GLASS_HOT = 8;
const GLOW = 9;
const CORE = 10;

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function paletteOf(scheme) {
  return [
    [0, 0, 0, 0],
    [8, 10, 16, 255],
    hex(scheme.dark),
    hex(scheme.hull),
    hex(scheme.light),
    hex(scheme.metal),
    hex(scheme.accent),
    hex(scheme.glass),
    [236, 252, 255, 255],
    hex(scheme.glow),
    [255, 248, 228, 255],
  ];
}

export function rollShipPlan(seed) {
  const rng = makeRng('ship|' + String(seed ?? 'belt'));
  const wing = pick(rng, WINGS);
  let nose = pick(rng, ['needle', 'wedge', 'blunt']);
  let tip = pick(rng, TIPS);
  let engines = rng() < 0.72 ? 2 : 3;
  if (wing === 'bulb') {
    nose = 'blunt';
    engines = 2;
    tip = 'square';
  }
  if (wing === 'lancer') {
    nose = rng() < 0.65 ? 'wedge' : 'needle';
    engines = 2;
    tip = 'spike';
  }
  if (wing === 'crescent') nose = rng() < 0.7 ? 'blunt' : 'wedge';
  const scheme = pick(rng, SCHEMES);
  const role = pick(rng, ROLES[wing]);
  const mark = 2 + Math.floor(rng() * 8);
  return {
    seed: String(seed ?? 'belt'),
    nose,
    wing,
    tip,
    cockpit: pick(rng, COCKPITS),
    engines,
    marking: pick(rng, MARKINGS),
    scheme: scheme.id,
    name: scheme.title + ' ' + role + ' ' + mark,
  };
}

function makeGrid() {
  const { width, height } = SHIP_GRID;
  return {
    width,
    height,
    cx: (width - 1) >> 1,
    mask: new Uint8Array(width * height),
    paint: new Uint8Array(width * height),
  };
}

function plot(grid, x, y) {
  const { width, height, mask } = grid;
  if (y < 0 || y >= height || x < 0 || x >= width) return;
  mask[y * width + x] = 1;
  const mx = width - 1 - x;
  if (mx !== x) mask[y * width + mx] = 1;
}

function hline(grid, y, half) {
  const left = grid.cx - half;
  for (let x = left; x <= grid.cx; x += 1) plot(grid, x, y);
}

function band(grid, y, inner, outer) {
  for (let dx = inner; dx <= outer; dx += 1) plot(grid, grid.cx + dx, y);
}

function ellipse(grid, ox, oy, rx, ry) {
  for (let y = Math.floor(oy - ry); y <= Math.ceil(oy + ry); y += 1) {
    for (let x = Math.floor(ox - rx); x <= Math.ceil(ox + rx); x += 1) {
      const nx = (x - ox) / rx;
      const ny = (y - oy) / ry;
      if (nx * nx + ny * ny <= 1) plot(grid, x, y);
    }
  }
}

function paintNose(grid, nose) {
  const rows = {
    needle: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
    wedge: [1, 1, 2, 3, 4, 4, 5],
    blunt: [2, 2, 3, 3, 4, 4],
    split: [1, 2, 2, 3],
  }[nose];
  rows.forEach((half, index) => hline(grid, index, half));
}

function paintBody(grid, half, from, to) {
  for (let y = from; y <= to; y += 1) hline(grid, y, half);
}

function paintDelta(grid, body, span) {
  const y0 = 12;
  const y1 = 24;
  const y2 = 33;
  for (let y = y0; y <= y1; y += 1) {
    const t = (y - y0) / (y1 - y0);
    hline(grid, y, Math.round(body + t * (span - body)));
  }
  for (let y = y1 + 1; y <= y2; y += 1) {
    const t = (y - y1) / (y2 - y1);
    hline(grid, y, Math.round(span + t * (body + 1 - span)));
  }
}

function paintCrescent(grid, body, span) {
  const y0 = 11;
  const y1 = 22;
  for (let y = y0; y <= y1; y += 1) {
    const t = (y - y0) / (y1 - y0);
    hline(grid, y, Math.round(body + t * (span - body)));
  }
  for (let y = y1 + 1; y <= y1 + 8; y += 1) {
    hline(grid, y, body);
    const drop = y - y1;
    if (drop <= 2) band(grid, y, body, span);
    band(grid, y, span - 3, span - Math.floor(drop / 3));
  }
}

function paintBulb(grid) {
  ellipse(grid, grid.cx + 9, 24, 6, 7);
  paintBody(grid, 3, 4, 34);
}

function paintLancer(grid, body, span) {
  for (let s = body; s <= span; s += 1) {
    const t = (s - body) / (span - body);
    const yTop = Math.round(22 - t * 14);
    const yBot = Math.round(30 - t * 6);
    for (let y = yTop; y <= yBot; y += 1) band(grid, y, s, s);
  }
  for (let y = 20; y <= 34; y += 1) hline(grid, y, body + 3);
}

function paintGull(grid, body, span) {
  const y0 = 14;
  const y1 = 24;
  for (let y = y0; y <= y1; y += 1) {
    const t = (y - y0) / (y1 - y0);
    hline(grid, y, Math.round(body + t * (span - body)));
  }
  let top = y1;
  const tipCol = grid.cx + span;
  for (let y = 0; y < grid.height; y += 1) {
    if (grid.mask[y * grid.width + tipCol]) {
      top = y;
      break;
    }
  }
  for (let k = 1; k <= 4; k += 1) band(grid, top - k, span - 2, span);
}

function paintTip(grid, tip, span, row) {
  if (tip === 'spike') {
    for (let i = 1; i <= 3; i += 1) band(grid, row - i, span + i - 1, span + i);
  } else if (tip === 'pod') {
    for (let y = row - 1; y <= row + 3; y += 1) band(grid, y, span - 1, span + 2);
  } else if (tip === 'raised') {
    for (let i = 1; i <= 4; i += 1) band(grid, row - i, span - 1, span + 1);
  }
}

function paintWings(grid, plan) {
  const body = plan.nose === 'split' ? 3 : 4;
  const span = plan.wing === 'lancer' ? 13 : plan.wing === 'bulb' ? 8 : 13;
  if (plan.wing === 'delta') paintDelta(grid, body, span);
  else if (plan.wing === 'crescent') paintCrescent(grid, body, span);
  else if (plan.wing === 'bulb') paintBulb(grid);
  else if (plan.wing === 'lancer') paintLancer(grid, body, span);
  else paintGull(grid, body, span);
  paintBody(grid, body, 4, 34);
  if (plan.wing !== 'bulb' && plan.wing !== 'lancer' && plan.wing !== 'gull') {
    const tipRow = plan.wing === 'gull' ? 14 : plan.wing === 'crescent' ? 22 : 24;
    paintTip(grid, plan.tip, span, tipRow);
  }
  paintEngineMask(grid, plan.engines);
}

function shade(grid) {
  const { width, height, mask, paint } = grid;
  const at = (x, y) => y >= 0 && y < height && x >= 0 && x < width && mask[y * width + x];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      const up = at(x, y - 1);
      const down = at(x, y + 1);
      let tone = HULL;
      if (!up) tone = LIGHT;
      else if (!down) tone = DARK;
      paint[y * width + x] = tone;
    }
  }
}

function stamp(grid, x, y, color) {
  const { width, height, mask, paint } = grid;
  if (y < 0 || y >= height || x < 0 || x >= width || !mask[y * width + x]) return;
  paint[y * width + x] = color;
  const mx = width - 1 - x;
  if (mx !== x && mask[y * width + mx]) paint[y * width + mx] = color;
}

function fillBox(grid, x0, x1, y0, y1, color) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) stamp(grid, x, y, color);
  }
}

function paintCockpit(grid, cockpit) {
  const { cx } = grid;
  if (cockpit === 'slit') {
    fillBox(grid, cx, cx, 6, 12, GLASS);
    stamp(grid, cx, 6, GLASS_HOT);
  } else if (cockpit === 'canopy') {
    fillBox(grid, cx, cx, 5, 14, GLASS);
    fillBox(grid, cx - 1, cx - 1, 7, 12, GLASS);
    stamp(grid, cx, 5, GLASS_HOT);
    stamp(grid, cx, 6, GLASS_HOT);
  } else if (cockpit === 'bubble') {
    for (let y = 6; y <= 13; y += 1) {
      const half = y === 6 || y === 13 ? 0 : y === 7 || y === 12 ? 1 : 2;
      for (let dx = 0; dx <= half; dx += 1) stamp(grid, cx - dx, y, GLASS);
    }
    stamp(grid, cx, 7, GLASS_HOT);
  } else {
    const gem = [
      [0, 7],
      [-1, 8], [0, 8],
      [-1, 9], [0, 9],
      [0, 10],
    ];
    for (const [dx, y] of gem) stamp(grid, cx + dx, y, dx === 0 ? GLASS : ACCENT);
    stamp(grid, cx, 7, GLASS_HOT);
  }
}

function engineSpots(count) {
  if (count === 1) return [0];
  if (count === 3) return [0, 6];
  return [5];
}

function paintEngineMask(grid, count) {
  const { cx } = grid;
  for (const dx of engineSpots(count)) {
    for (let y = 33; y <= 39; y += 1) {
      plot(grid, cx + dx - 1, y);
      plot(grid, cx + dx, y);
      plot(grid, cx + dx + 1, y);
    }
  }
}

function paintEngines(grid, count) {
  const { cx } = grid;
  for (const dx of engineSpots(count)) {
    for (let y = 33; y <= 38; y += 1) {
      stamp(grid, cx + dx - 1, y, METAL);
      stamp(grid, cx + dx, y, y >= 36 ? CORE : GLOW);
      stamp(grid, cx + dx + 1, y, METAL);
    }
    stamp(grid, cx + dx, 39, GLOW);
  }
}

function paintMarking(grid, marking) {
  const { cx } = grid;
  if (marking === 'spine') {
    for (let y = 4; y <= 30; y += 1) stamp(grid, cx, y, ACCENT);
  } else if (marking === 'diamond') {
    stamp(grid, cx, 15, GLASS_HOT);
    stamp(grid, cx - 1, 16, ACCENT);
    stamp(grid, cx, 16, ACCENT);
    stamp(grid, cx, 17, ACCENT);
  } else if (marking === 'chevron') {
    for (let i = 0; i <= 4; i += 1) {
      stamp(grid, cx - i, 4 + i, ACCENT);
    }
  } else {
    for (let y = 14; y <= 24; y += 1) {
      const half = 4 + Math.round(((y - 14) / 10) * 8);
      stamp(grid, cx - half, y, ACCENT);
    }
  }
}

function outline(grid) {
  const { width, height, paint } = grid;
  const src = paint.slice();
  const filled = (x, y) => y >= 0 && y < height && x >= 0 && x < width && src[y * width + x] !== EMPTY;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        paint[y * width + x] = OUTLINE;
      }
    }
  }
}

export function renderShip(plan) {
  const grid = makeGrid();
  paintNose(grid, plan.nose);
  paintWings(grid, plan);
  shade(grid);
  paintMarking(grid, plan.marking);
  paintCockpit(grid, plan.cockpit);
  paintEngines(grid, plan.engines);
  outline(grid);
  const scheme = SCHEMES.find((item) => item.id === plan.scheme) || SCHEMES[0];
  return {
    plan,
    width: grid.width,
    height: grid.height,
    scale: SHIP_SCALE,
    cells: grid.paint,
    palette: paletteOf(scheme),
  };
}

export function generateShip(seed) {
  return renderShip(rollShipPlan(seed));
}

/** One hull for each wing plan, so the part list can be checked by eye. */
export function catalogShips() {
  return WINGS.map((wing, index) => {
    const scheme = SCHEMES[index % SCHEMES.length];
    const plan = {
      seed: 'catalog-' + wing,
      nose: wing === 'crescent' || wing === 'bulb' ? 'blunt' : index % 2 ? 'wedge' : 'needle',
      wing,
      tip: wing === 'lancer' ? 'spike' : wing === 'gull' ? 'raised' : wing === 'crescent' ? 'square' : 'pod',
      cockpit: COCKPITS[index % COCKPITS.length],
      engines: wing === 'delta' ? 3 : 2,
      marking: MARKINGS[index % MARKINGS.length],
      scheme: scheme.id,
      name: scheme.title + ' ' + ROLES[wing][0],
    };
    return renderShip(plan);
  });
}

/** RGBA pixels at the chunky export size. Empty cells stay transparent. */
export function shipRgba(ship) {
  const scale = ship.scale || 1;
  const width = ship.width * scale;
  const height = ship.height * scale;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < ship.height; y += 1) {
    for (let x = 0; x < ship.width; x += 1) {
      const color = ship.palette[ship.cells[y * ship.width + x]] || ship.palette[0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const i = ((y * scale + sy) * width + (x * scale + sx)) * 4;
          out[i] = color[0];
          out[i + 1] = color[1];
          out[i + 2] = color[2];
          out[i + 3] = color[3];
        }
      }
    }
  }
  return { width, height, rgba: out };
}

export const SHIP_PARTS = { noses: NOSES, wings: WINGS, tips: TIPS, cockpits: COCKPITS, markings: MARKINGS };
