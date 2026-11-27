/**
 * Write pixel ships from the generator.
 *   node scripts/generate-ships.mjs
 *   node scripts/generate-ships.mjs --count 8 --seed fleet
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { catalogShips, generateShip, shipRgba } from '../src/game/shipGenerator.js';

const args = process.argv.slice(2);
function flag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1];
}

const count = Math.max(1, Number(flag('--count', '8')) || 8);
const seed = flag('--seed', 'mentaris');
const catalog = args.includes('--catalog');
const withSheet = args.includes('--sheet');
const outDir = path.resolve(flag('--out', 'public/assets/ships/generated'));

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

export function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function blit(dest, dw, image, ox, oy) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const si = (y * image.width + x) * 4;
      const di = ((oy + y) * dw + (ox + x)) * 4;
      const a = image.rgba[si + 3] / 255;
      if (a <= 0) continue;
      dest[di] = image.rgba[si];
      dest[di + 1] = image.rgba[si + 1];
      dest[di + 2] = image.rgba[si + 2];
      dest[di + 3] = 255;
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
const ships = [];
const built = catalog ? catalogShips() : Array.from({ length: count }, (_, i) => generateShip(seed + '-' + i));
for (const ship of built) {
  const image = shipRgba(ship);
  const file = ship.plan.name + '.png';
  fs.writeFileSync(path.join(outDir, file), encodePng(image.width, image.height, image.rgba));
  ships.push({ ship, image, file });
  console.log(file, ship.plan.nose, ship.plan.wing, ship.plan.tip, ship.plan.cockpit, ship.plan.engines);
}

if (!withSheet) {
  console.log('wrote', ships.length, 'ships to', outDir);
  process.exit(0);
}

const pad = 8;
const cellW = ships[0].image.width + pad;
const cellH = ships[0].image.height + pad;
const cols = Math.min(4, ships.length);
const rows = Math.ceil(ships.length / cols);
const sheetW = cols * cellW + pad;
const sheetH = rows * cellH + pad;
const sheet = new Uint8Array(sheetW * sheetH * 4);
sheet.fill(0);
for (let i = 0; i < sheet.length; i += 4) {
  sheet[i] = 8;
  sheet[i + 1] = 10;
  sheet[i + 2] = 16;
  sheet[i + 3] = 255;
}
ships.forEach((item, index) => {
  const col = index % cols;
  const row = Math.floor(index / cols);
  blit(sheet, sheetW, item.image, pad + col * cellW, pad + row * cellH);
});
const sheetPath = path.join(outDir, 'sheet.png');
fs.writeFileSync(sheetPath, encodePng(sheetW, sheetH, sheet));
console.log('sheet', sheetPath);
