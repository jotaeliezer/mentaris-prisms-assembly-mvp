# Art style

This is the look of the rocks and the ships that already exist. New objects should be drawn to this, not to a new style. The source is Mentaris: The Arith Belt: the five asteroid sprites, the mineral, and the ship portraits under `public/assets/`.

## The impression

A toy that knows it is a toy, painted like a premium sticker. Everything is seen from directly above, nose toward the top of the file, on a pure black background that is really transparency. The silhouette is chunky and readable at the size of a thumbnail. Edges are a dark ink line, almost a cut-out. Color is flat and saturated, then cut into gem-like facets. Nothing is photoreal, weathered, or gritty. The mood is a bright arcade cabinet: candy metal, glowing glass, and a plume of light behind the engines.

Light comes from the top of the image. Upper facets are pale. Lower facets and the belly of the rock are a deeper shade of the same hue. There is no cast shadow on a ground, because there is no ground. Glow is part of the drawing: engines, cockpits, and craters bleed a soft halo into the black.

One object, one picture. No animation frames. Motion, when it exists, is drawn as a frozen plume so the sprite still looks alive when it is still.

## Shared rules for anything new

- Top-down, facing up the file. The game rotates the sprite so the nose follows the aim.
- Transparent background. No rectangle, no floor, no stars in the sprite.
- Thick dark outline around the whole silhouette, plus inner lines that break the body into plates.
- Faceted color: three steps per hue (highlight, body, shadow). Hard edges between them, not a smooth airbrush, except on the glow.
- A glow is a soft shape in the same hue as the light source, wider than the object, fading to nothing. It is painted, not a blur added later.
- Small details are jewels: a white or pale diamond on the nose, a round lens, a ring crater. They are few and large.
- Do not add text, numbers, or UI marks inside the picture.
- Do not add a second art style for "rare" or "damaged". Damage, if it is ever shown, is the same object with fewer facets and a duller hue, not a new rendering.

## Asteroids

The rocks are cartoon boulders made of cracked plates. Each plate is a polygon with a lighter top edge and a darker bottom edge, so the rock reads as a pile of cut stones rather than a round ball. Craters are rings: a pale rim, a dark hole, sometimes a tiny highlight on the upper-left of the rim. The outline is a heavy black contour that follows every lump. The file is wider than it is tall, and the shape is irregular, never a circle and never a perfect oval.

They should feel heavy, mineable, and slightly cute. The craters are the "face". There is no ore icon painted on the rock. The mineral is a separate sprite that appears after an extract.

### asteroid1

Grey and silver. The plates run from near-white caps to charcoal gaps. Two craters: one large on the left, one smaller on the lower right. A bright diagonal facet crosses the middle like a metal streak. This is the default "cold rock" and the safest reference for a new grey object.

### asteroid2

The same grey family, seen more from above and more oval. Four craters in a loose square, plus a field of tiny pits in the center. Darker overall than asteroid1, with less of the white streak. Use this when a rock should feel older and more pocked.

### asteroid3

The brown-orange rock. Plates are rust, ochre, and a pale tan on the upper faces. Five ring craters, the largest toward the upper left. The outline picks up a warm dark brown instead of pure black. This is the "warm belt" rock. New amber-colored objects should borrow this hue family, not a new orange.

### asteroid4

Green. Moss to deep emerald, with two large craters and one smaller one. The plates are smaller and more broken than the grey rocks, so it feels crumbly. New organic or resin objects can use this green, kept faceted, not slimy.

### asteroid6

The hot rock. Yellow-orange plates, two big craters side by side like eyes, and a lumpy outline. Highlights are almost white-gold. This is the brightest rock and should stay rare in a scene so the greys and browns still read as the belt.

### mineral

A small cyan crystal, the same facet language as the rocks but gem-cut instead of cratered. Bright cyan caps, deeper blue in the cracks, a soft blue glow around the silhouette. This is what a collected material looks like in the world. New world drops should be this size and this clarity: one chunk, one glow, readable at a few dozen pixels.

## Ships

Every ship is a top-down fighter from Mentaris: The Arith Belt. The shared skeleton is strict:

- A pointed or rounded nose at the top.
- A canopy or crystal on the centerline, glowing.
- A pale diamond or chevron just under the canopy. This mark repeats across the fleet. New ships keep it.
- Wings left and right, symmetrical.
- Engines at the bottom, usually two or three nozzles.
- A painted exhaust plume below the nozzles, long, soft, and in the ship's light color. The plume is part of the portrait. In flight the game also draws a shorter live flame so the exhaust can grow while W is held. New ships should include the painted plume so they match at a glance.
- Panel lines, rivets, and a few tiny lights. The body is faceted metal, not a smooth 3D render.
- A dark ink outline and a faint colored halo around the whole craft.

The impression is a collectible ship sticker: loud color, clear silhouette, friendly rather than military.

### AM3 Scout and AM2 Scout

Purple and magenta twins. Long dagger nose, pink crystal canopy, white diamond, pale lavender wings, three cyan engine tongues inside a wide cyan glow. AM2 is the same portrait with a slightly different crop of the same design. This pair is the default "player ship" color: violet metal, pink glass, cyan fire.

### Scarlet Classic

Gold hull, black structural ribs, a cyan canopy, a white diamond, and two red side pods with pink lenses. Two orange-red engine plumes inside a wide amber glow. The heaviest and most "classic toy" of the set. Gold plus one cool glass color is the rule when a ship should feel like the original.

### Verdant Spire

Purple body again, but the wings carry gold missile pods and the canopy is cyan. One wide cyan plume. The gold pods are the special: a second bright color used only on the wings, not all over the hull.

### White Flame 8

White and silver manta wings with hot-pink and blue racing stripes. Cyan canopy. Two narrow plumes that start red at the nozzle and turn cyan, over a dusty pink glow. This is the "clean racer". White hulls get one neon stripe color and a two-tone flame.

### Aurora Dart

White and orange, three orange engine plumes, a cyan canopy, and a spray of orange sparks in the glow. The sparks are painted into the file. Use sparks only when the ship is the hot one. Do not put sparks on every ship.

### Azure Lancer

A broad V of blue glass wings with lime-green edges and a silver frame. Two pale blue-white plumes. The wings are the whole silhouette. New "glass wing" objects should be this: a big transparent-looking panel, a metal frame, and a thin bright edge.

### BU2X

A squat beetle. Lime-green shells, magenta stripes, a small cyan canopy, two yellow-green plumes in a green glow. The shortest nose in the fleet. Use this proportion when an object should feel tough and close to the ground rather than fast.

### Crimson MK-7

Dark green hull, orange-gold edges, an orange crystal nose, and a white diamond. Two orange plumes and a lower central nozzle. The green is deep, not the leaf green of asteroid4. Orange is the light, green is the metal.

### Cyan Vector 7

A long orange-and-blue fighter with a real airplane planform. Two yellow plumes in a pale smoke. The nose is a blue canopy sunk into the orange spine. This is the most "jet" of the set. Keep the wings thin.

### Ruby Strike

Red boomerang wings, white and silver frames, a cyan core, and orange pods. Two pale plumes. The wings are the silhouette, same idea as Azure Lancer in a warm palette.

### Mantas Arc-5 and Mantas Arc-5 (1)

Green manta wings, a purple crystal canopy, purple engine fire, and small purple lights on the wing pods. The `(1)` file is a tighter, darker green version of the same ship. Purple fire on a green hull is allowed when the canopy and the plume match. Do not mix a third glow color.

### Veloz Mas

Blue, orange, and yellow, with a green canopy and a long pointed tail between two orange plumes. The tail extends down between the flames. Wings carry blue pods. This is the "fast" silhouette: long nose, long tail, thin wings.

### VER-DE-9

A dark grey crab. Rounded side pods with cyan cross lights, a bright green canopy, and two green plumes. The body is short. The pods are the width. New bulky tools can follow this: dark metal, one saturated core, glowing lines on the cheeks.

### D.A.T. Sawze

Silver and red. A long red canopy, red stripes, swept wings with spike pods, and two orange plumes around a gold nose bulb. The metal is the brightest silver in the fleet. Red is the glass, not the whole hull.

### Apex Tiburon and Apex Tiburon IV

The same white fighter drawn twice. Cyan canopy, green diamond, green edge lights, and three green plumes, plus two small green flames on the upper pods. IV is the one the Arith Belt assigns to a pilot. The file without IV is the spare. White plus one neon, three engines, is the "clean military" end of the same sticker style. It is still faceted and outlined. It is not a realistic jet.

## Pilot name

The name on the ship is a callsign the player types, in the same spirit as a Helldivers 2 ship name. Helldivers gives the Super Destroyer a spoken title, something like "SES Elected Representative of the People": short, proud, and a little absurd. Mentaris keeps that feeling and drops the SES prefix. The player writes their own, up to 28 characters, on the title screen before Launch. It is not generated, and it is not a serial number.

It shows at the top right of the flight view, to the right of the settings gear. Other pilots see that same name over the ship. A blank field falls back to "Pilot". The portrait of the ship stays the Arith Belt sticker art. The name is type, not a new picture.

## What a new object must pass

- It could sit in a row with these ships or these rocks and not look like it came from another game.
- At 72 pixels, the silhouette is still obvious.
- It has one main hue, one light color, and the shared dark outline.
- If it is a ship, it has the diamond mark, a glowing canopy, and a painted plume.
- If it is a rock or a drop, it is faceted stone or a single gem, with craters or facets large enough to see.
- It does not introduce photoreal texture, thin line art, or a flat vector icon with no facets.
