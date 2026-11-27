import { catalogShips, generateShip, SHIP_PARTS } from '../src/game/shipGenerator.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function components(ship) {
  const width = ship.width;
  const cells = ship.cells;
  const seen = new Uint8Array(cells.length);
  let count = 0;
  const stack = [];
  function walk(start) {
    stack.push(start);
    while (stack.length) {
      const index = stack.pop();
      if (index < 0 || index >= cells.length || seen[index] || !cells[index]) continue;
      seen[index] = 1;
      const x = index % width;
      if (x > 0) stack.push(index - 1);
      if (x + 1 < width) stack.push(index + 1);
      if (index >= width) stack.push(index - width);
      if (index + width < cells.length) stack.push(index + width);
    }
  }
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] && !seen[i]) {
      count += 1;
      walk(i);
    }
  }
  return count;
}

const again = generateShip('prism-7');
const first = generateShip('prism-7');
assert(again.plan.name === first.plan.name, 'the same seed keeps the name');
assert(Buffer.from(again.cells).equals(Buffer.from(first.cells)), 'the same seed keeps the pixels');

const other = generateShip('prism-8');
assert(other.plan.seed !== first.plan.seed, 'a new seed is a new roll');

for (const ship of catalogShips()) {
  assert(SHIP_PARTS.wings.includes(ship.plan.wing), ship.plan.wing + ' is a fleet wing');
  assert(components(ship) === 1, ship.plan.name + ' is one connected hull');
  const width = ship.width;
  let glass = 0;
  let glow = 0;
  for (let y = 0; y < ship.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = ship.cells[y * width + x];
      const mirror = ship.cells[y * width + (width - 1 - x)];
      assert(color === mirror, ship.plan.name + ' is mirrored');
      if (color === 7 || color === 8) glass += 1;
      if (color === 9 || color === 10) glow += 1;
    }
  }
  assert(glass > 0, ship.plan.name + ' has a cockpit');
  assert(glow > 0, ship.plan.name + ' has nozzles');
}

const wings = new Set(catalogShips().map((ship) => ship.plan.wing));
assert(wings.size === SHIP_PARTS.wings.length, 'the catalog shows every wing plan');

console.log('ship generator ok');
