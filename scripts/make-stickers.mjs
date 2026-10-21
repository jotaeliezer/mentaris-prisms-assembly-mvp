import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const items = join(root, 'public', 'images', 'items');
const cats = join(root, 'public', 'images', 'categories');
mkdirSync(items, { recursive: true });
mkdirSync(cats, { recursive: true });

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">${body}</svg>\n`;
}

const stickers = {
  glass: svg('<rect x="12" y="8" width="24" height="32" rx="3" fill="#d7fff4" stroke="#083028" stroke-width="2"/><path d="M18 16h12M18 24h8" stroke="#3ec8ff" stroke-width="2"/>'),
  iron: svg('<path d="M8 30h32l-4 8H12z" fill="#c5ced6" stroke="#1c2830" stroke-width="2"/><path d="M14 30V16h20v14" stroke="#1c2830" stroke-width="2"/><path d="M18 16l6-6 6 6" stroke="#7ad7ff" stroke-width="2"/>'),
  resin: svg('<path d="M24 6c8 8 12 14 12 22a12 12 0 1 1-24 0c0-8 4-14 12-22z" fill="#ffcf70" stroke="#5a3410" stroke-width="2"/>'),
  filament: svg('<path d="M8 30c8-16 8 8 16-8s8 16 16-6" stroke="#c9b6ff" stroke-width="3" stroke-linecap="round"/><circle cx="8" cy="30" r="3" fill="#efe7ff"/><circle cx="40" cy="16" r="3" fill="#efe7ff"/>'),
  wire: svg('<path d="M6 24h8l4-10 8 20 4-10h12" stroke="#9eb4c6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  foil: svg('<path d="M10 14h22l6 10-6 10H10l6-10z" fill="#b6f7a0" stroke="#1c4020" stroke-width="2"/>'),
  gem: svg('<path d="M24 6l12 10-12 26L12 16z" fill="#ffe9a3" stroke="#6a5010" stroke-width="2"/><path d="M12 16h24" stroke="#fff6d0" stroke-width="2"/>'),
  drive: svg('<circle cx="24" cy="24" r="8" fill="none" stroke="#7ad7ff" stroke-width="3"/><path d="M24 6v8M24 34v8M6 24h8M34 24h8" stroke="#7ad7ff" stroke-width="3"/>'),
  hull: svg('<path d="M8 30l16-16 16 16v8H8z" fill="#b7d4ff" stroke="#16304c" stroke-width="2"/>'),
  hint: svg('<circle cx="24" cy="20" r="10" fill="#ffe08a" stroke="#5a4310" stroke-width="2"/><path d="M24 30v6M20 40h8" stroke="#5a4310" stroke-width="2" stroke-linecap="round"/>'),
  jumper: svg('<path d="M24 40V14" stroke="#7ee7ff" stroke-width="3"/><path d="M14 22l10-12 10 12" fill="#7ee7ff" stroke="#083040" stroke-width="2"/><path d="M10 40h28" stroke="#9ad7ff" stroke-width="2"/>'),
  bench: svg('<rect x="8" y="18" width="32" height="8" rx="2" fill="#d7e4ff" stroke="#1c3048" stroke-width="2"/><path d="M14 26v10M34 26v10" stroke="#1c3048" stroke-width="3"/>'),
  map: svg('<rect x="8" y="10" width="32" height="28" rx="3" fill="#123048" stroke="#9ad7ff" stroke-width="2"/><circle cx="20" cy="22" r="3" fill="#7ad7ff"/><circle cx="30" cy="28" r="2" fill="#ffe08a"/>'),
  compass: svg('<rect x="6" y="22" width="36" height="4" rx="2" fill="#d2fff8"/><circle cx="28" cy="24" r="5" fill="#062028" stroke="#7ee7ff" stroke-width="2"/>'),
  ping: svg('<circle cx="24" cy="24" r="4" fill="#ffd7a1"/><circle cx="24" cy="24" r="10" stroke="#ffd7a1" stroke-width="2"/><circle cx="24" cy="24" r="16" stroke="#ffd7a1" stroke-width="2" opacity="0.6"/>'),
  gate: svg('<path d="M12 40V16a12 12 0 0 1 24 0v24" stroke="#d2b4ff" stroke-width="3"/><circle cx="24" cy="22" r="3" fill="#d2b4ff"/>'),
  repair: svg('<rect x="18" y="8" width="12" height="32" rx="2" fill="#8dffb0"/><rect x="8" y="18" width="32" height="12" rx="2" fill="#8dffb0"/>'),
  blink: svg('<path d="M8 28l14-16 6 10 12-14" stroke="#e7d6ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  tractor: svg('<path d="M10 34c6-14 22-14 28 0" stroke="#ffb15a" stroke-width="3"/><circle cx="24" cy="16" r="5" fill="#ffb15a"/>'),
  quiet: svg('<path d="M10 18h8l8-6v24l-8-6h-8z" fill="#9bb0c0" stroke="#1c2830" stroke-width="2"/><path d="M32 20l6 8M38 20l-6 8" stroke="#9bb0c0" stroke-width="2"/>'),
  bow: svg('<path d="M8 34c8-18 24-18 32 0" stroke="#d5e6ff" stroke-width="4" stroke-linecap="round"/><path d="M24 16v18" stroke="#7ad7ff" stroke-width="2"/>'),
  flare: svg('<path d="M24 40V22" stroke="#fff1a8" stroke-width="3"/><path d="M24 8l4 10h-8z" fill="#fff1a8"/>'),
  wall: svg('<rect x="4" y="21" width="40" height="6" rx="1" fill="#d5e2ec" stroke="#1c2830" stroke-width="2"/>'),
  panel: svg('<path d="M6 18h36l-4 12H10z" fill="#9eb6c8" stroke="#16304c" stroke-width="2"/>'),
};

const categories = {
  basics: svg('<path d="M16 28c0-6 4-10 8-10s8 4 8 10v8H16z" fill="#d7e4ff" stroke="#16304c" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#9ad7ff"/>'),
  alloys: svg('<rect x="8" y="20" width="32" height="10" rx="2" fill="#c5ced6" stroke="#1c2830" stroke-width="2"/><rect x="14" y="14" width="20" height="6" fill="#ffcf70"/>'),
  weapons: svg('<path d="M10 34L30 10l8 4L18 38z" fill="#ffb7de" stroke="#401828" stroke-width="2"/>'),
  ship: svg('<path d="M24 8l10 28H14z" fill="#7ad7ff" stroke="#083040" stroke-width="2"/>'),
  hud: svg('<rect x="8" y="12" width="32" height="24" rx="3" fill="#10283c" stroke="#9ad7ff" stroke-width="2"/><path d="M14 30h8M26 24h8" stroke="#7ee7ff" stroke-width="2"/>'),
  abilities: svg('<path d="M24 6l4 12h12l-10 8 4 12-10-7-10 7 4-12L8 18h12z" fill="#e7d6ff" stroke="#302050" stroke-width="2"/>'),
  construction: svg('<rect x="6" y="28" width="36" height="5" fill="#d5e2ec" stroke="#1c2830" stroke-width="2"/><path d="M10 14h28l-4 10H14z" fill="#9eb6c8" stroke="#16304c" stroke-width="2"/>'),
};

for (const [name, body] of Object.entries(stickers)) writeFileSync(join(items, name + '.svg'), body);
for (const [name, body] of Object.entries(categories)) writeFileSync(join(cats, name + '.svg'), body);
console.log('wrote', Object.keys(stickers).length, 'items and', Object.keys(categories).length, 'categories');
