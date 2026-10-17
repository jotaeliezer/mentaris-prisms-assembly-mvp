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

export const DEFAULT_SHIP = "AM3 Scout.png";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load " + src));
    img.src = src;
  });
}

export async function loadFoundationSprites() {
  const ships = {};
  const asteroids = [];
  const ship = await loadImage("assets/ships/" + encodeURIComponent(DEFAULT_SHIP));
  ships[DEFAULT_SHIP] = ship;
  for (const name of ASTEROID_FILES) {
    asteroids.push(await loadImage("assets/asteroids/" + encodeURIComponent(name)));
  }
  const mineral = await loadImage("assets/asteroids/" + encodeURIComponent(MINERAL_FILE));
  return { ships, asteroids, mineral, shipName: DEFAULT_SHIP };
}
