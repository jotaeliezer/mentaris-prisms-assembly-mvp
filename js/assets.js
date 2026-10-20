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

function assetPath(folder, name) {
  return folder + "/" + name.split("/").map(encodeURIComponent).join("/");
}

async function loadImage(src, attempts = 3) {
  let lastError = null;
  for (let tryNo = 1; tryNo <= attempts; tryNo += 1) {
    try {
      const response = await fetch(src, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("Could not load " + src + " (" + response.status + ")");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Could not load " + src));
          image.src = objectUrl;
        });
        return img;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Could not load " + src);
}

export async function loadFoundationSprites() {
  const ships = {};
  const asteroids = [];
  const ship = await loadImage(assetPath("assets/ships", DEFAULT_SHIP));
  ships[DEFAULT_SHIP] = ship;
  for (const name of ASTEROID_FILES) {
    asteroids.push(await loadImage(assetPath("assets/asteroids", name)));
  }
  const mineral = await loadImage(assetPath("assets/asteroids", MINERAL_FILE));
  return { ships, asteroids, mineral, shipName: DEFAULT_SHIP };
}
