# Ship style guide

This note describes the 18 PNG files in `public/assets/ships/`. Every size, colour, and shape below comes from those files.

Colour hex values are approximate. They are median RGB values of pixels with alpha at least 140, sampled on a 2-pixel grid, then grouped by hue. A pixel counts as near-black when its HSV value is under 0.16. A 30° hue band is named `h000` through `h330`. The count beside a swatch is the number of samples in that band, not a full-resolution census. A nearby pixel can sit a few steps away from the median.

Widths named below are the median width of opaque pixels (alpha above 16) in three bands of the ship’s content box: the top 10%, a band around the middle, and the bottom 10%. “Content box” means the bounding box of pixels with alpha above 16. Padding is the empty margin from that box to the canvas edge.

Gameplay lines are copied from section 2.4 of `docs/MENTARIS_ARITH_BELT_ASSETS.md`. They describe ability behaviour in that document. They are not visual traits. That document’s paths use `images/ships/`; the files studied here live in `public/assets/ships/`.

## AM2 Scout

| | |
| --- | --- |
| File | `public/assets/ships/AM2 Scout.png` |
| Canvas | 1024 × 1024 px, 8-bit RGBA, not interlaced |
| Content box | 861 × 837 px, padding left 81, top 47, right 82, bottom 140 |
| Band widths | top 47, middle 479, bottom 64 |
| Outline mirror | alpha match 0.993 |
| Paint mirror | best colour match 0.240 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#040115` | near-black | 4927 | Outline and shadow across the hull |
| `#24125A` | dark purple | 10580 | Hull shadow, including the upper fuselage (`#3C1A7A` in the top band) |
| `#65349C` | purple | 12289 | Main hull |
| `#C885D0` | light purple | 8615 | Upper and mid panels |
| `#F089D9` | pink | 11825 | Upper and mid panels (`#F640C1` in the top band) |
| `#FDF0FC` | near-white | 5803 | Light panels; more of them on the right half (1072 left, 6019 right) |
| `#11CADF` | cyan | 5466 | Lower band (`#10C4DB`) |

**Shapes and silhouette.** Plan view. The nose points to the top of the file. The top is a short point, the middle spreads into swept wings, and the bottom narrows into two lower nacelles. The outline matches its left-right mirror. The paint does not: purple, pink, and white are distributed unevenly across the two halves.

**Details.** The upper centre is purple and magenta. The middle holds the same hues in larger panels, broken by near-black lines. The lower band shifts to cyan on the nacelles. Partial alpha sits along the edges (about 41,000 pixels with alpha between the transparent field and fully opaque).

**Overall look.** A narrow purple-and-pink scout with a cyan lower edge, drawn as flat colour blocks and dark contours on a transparent field.

**Gameplay (not visual).** Section 2.4 does not list `AM2 Scout.png`. The row whose id is `am2` points at `AM3 Scout.png`.

## AM3 Scout

| | |
| --- | --- |
| File | `public/assets/ships/AM3 Scout.png` |
| Canvas | 1024 × 909 px, 8-bit RGBA, not interlaced |
| Content box | 861 × 837 px, padding left 81, top 47, right 82, bottom 25 |
| Band widths | top 47, middle 479, bottom 64 |
| Outline mirror | alpha match 0.993 |
| Paint mirror | best colour match 0.205 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#05070E` | near-black | 4860 | Outline and shadow |
| `#2C08B4` | blue-violet | 14350 | Main hull (`#2E02C0` in the top band, `#5520DF` in the middle) |
| `#B472FE` | violet | 15092 | Main hull |
| `#E82EFF` | magenta-violet | 6441 | Mid panels (`#D96DFF` in the middle band) |
| `#010C55` | dark blue | 5480 | Shadowed hull |
| `#FCFAFF` | near-white | 8793 | Light panels; more on the right (1899 left, 7604 right) |
| `#30E0FF` | cyan | 5342 | Lower band (`#1CD4FF`) |

**Shapes and silhouette.** The alpha mask in the shared 1024 × 909 region matches `AM2 Scout.png` with zero alpha differences. The content box, top width, middle width, and bottom width match that file. The RGB values do not: almost every opaque pixel differs, with channel gaps up to 97. `AM2 Scout.png` is the same silhouette on a taller canvas. Its extra bottom rows are empty (alpha at most 1).

**Details.** Same pointed nose, swept wings, and two lower nacelles as AM2 Scout. The upper and middle paint is blue-violet and magenta-violet. The nacelles are cyan. Near-white panels weigh to the right.

**Overall look.** The same scout drawing as AM2 Scout, repainted in stronger blue-violet and cyan, with less empty canvas under the ship.

**Gameplay (not visual).** Section 2.4 id `am2`, display name “AM3 Scout”, file `images/ships/AM3 Scout.png`, ability teleport (`spin`).

## Apex Tiburon

| | |
| --- | --- |
| File | `public/assets/ships/Apex Tiburon.png` |
| Canvas | 682 × 665 px, 8-bit RGBA, not interlaced |
| Content box | 682 × 665 px, no transparent margin |
| Band widths | top, middle, and bottom all 682, because the field is opaque |
| Outline mirror | alpha match 1.000 (every pixel is opaque) |
| Paint mirror | best colour match 0.786, raised by the flat field |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#070606` | near-black | 83469 | The opaque field around the ship, and hull shadow. Corner pixels are `(7, 6, 6, 255)` |
| `#F9FDFE` | near-white | 8326 | Hull panels; more on the right (2500 left, 5491 right) |
| `#406687` | blue-gray | 6235 | Mid hull |
| `#297B89` | teal | 5567 | Upper hull (`#25869F` in the top band) |
| `#0B6300` | dark green | 4014 | Lower hull |
| `#7BFF00` | bright green | 2586 | Lower edge (`#A5FF00` in the bottom band) |

**Shapes and silhouette.** Where `Apex Tiburon IV.png` has alpha of at least 16, this file’s RGB matches those pixels exactly (143,509 compared pixels, zero RGB differences). The drawing is the same shark-like plan: narrow nose at the top, wider mid body, green along the lower edge. This file fills every remaining pixel with opaque near-black, so it has no transparent padding and no partial alpha.

**Details.** Upper area is teal and white. The middle is white and blue-gray. The bottom band is dark green and bright green. About 4,660 pixels are painted a non-background colour here while the IV file is transparent at the same coordinate; they sit on the dark fringe rather than forming a second craft.

**Overall look.** The Tiburon drawing on a solid near-black rectangle instead of a transparent field.

**Gameplay (not visual).** Section 2.4 states that `images/ships/Apex Tiburon.png` (no “IV”) is on disk and is not assigned to a ship.

## Apex Tiburon IV

| | |
| --- | --- |
| File | `public/assets/ships/Apex Tiburon IV.png` |
| Canvas | 682 × 665 px, 8-bit RGBA, not interlaced |
| Content box | 643 × 627 px, padding left 21, top 19, right 18, bottom 19 |
| Band widths | top 45, middle 414, bottom 132 |
| Outline mirror | alpha match 0.994 |
| Paint mirror | best colour match 0.332 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#070A06` | near-black | 6156 | Outline and shadow. Transparent pixels store a similar RGB with alpha 0 |
| `#F9FDFE` | near-white | 8198 | Hull panels; more on the right (2621 left, 5317 right) |
| `#406787` | blue-gray | 6141 | Mid hull |
| `#2B7B89` | teal | 5679 | Upper hull (`#21869F` in the top band) |
| `#0A6700` | dark green | 3600 | Lower hull |
| `#7AFF00` | bright green | 2424 | Lower edge. Bright saturated pixels fall 709 / 1180 / 1984 from top to bottom; their median is `#75F507` |

**Shapes and silhouette.** Narrow nose at the top, shoulders through the middle, a shorter tail. The outline is a near mirror. The paint is not.

**Details.** A pale teal area sits at the upper centre. White and blue-gray panels fill the middle, cut by dark lines. Bright green sits on the lower edge. Edges use partial alpha (about 5,400 semi-transparent pixels).

**Overall look.** A compact white, teal, and green craft on a transparent field, with the brightest green at the tail.

**Gameplay (not visual).** Section 2.4 id `apextiburoniv`, display name “Apex Tiburon IV”, ability compass.

## Aurora Dart

| | |
| --- | --- |
| File | `public/assets/ships/Aurora Dart.png` |
| Canvas | 1024 × 775 px, 8-bit RGBA, not interlaced |
| Content box | 935 × 754 px, padding left 45, top 21, right 44, bottom 0 |
| Band widths | top 68, middle 684, bottom 83 |
| Outline mirror | alpha match 0.987 |
| Paint mirror | best colour match 0.322 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#FAFBF5` | ivory | 15527 | Large hull panels; more on the right (5529 left, 9031 right) |
| `#CB6700` | orange | 10883 | Hull and lower edge. Bright saturated median `#F98600` |
| `#773000` | dark red-brown | 6486 | Shadowed orange areas |
| `#0A0500` | near-black | 9528 | Outline and shadow |
| `#FDCC00` | yellow | 3202 | Accent panels |
| `#F4FD70` | pale yellow | 1324 | Small accent |
| `#00BFED` | cyan | 1609 | Top band (`#00BBEB`) |
| `#5D5B5F` | gray | 3659 | Minor panels |

**Shapes and silhouette.** Long dart. The nose is narrow, the wings span the middle, and the tail narrows again. The painted ship touches the bottom edge of the canvas. Outline symmetry is high; colour symmetry is not.

**Details.** The top band mixes ivory, cyan, orange, and a lighter orange (`#D59D53`). The middle is mostly ivory, black, and orange. The bottom band is orange (`#C74300`), yellow, and black. Partial alpha is present along the edges (about 42,000 pixels).

**Overall look.** A long ivory-and-orange dart with a cyan touch at the nose and orange at the tail, sitting on the bottom edge of a transparent canvas.

**Gameplay (not visual).** Section 2.4 id `fizard`, display name “Aurora Dart”, ability intangible (`phase`), 7s cooldown.

## Azure Lancer

| | |
| --- | --- |
| File | `public/assets/ships/Azure Lancer.png` |
| Canvas | 1024 × 738 px, 8-bit RGBA, not interlaced |
| Content box | 825 × 717 px, padding left 99, top 17, right 100, bottom 4 |
| Band widths | top 810, middle 624, bottom 124 |
| Outline mirror | alpha match 0.992 |
| Paint mirror | best colour match 0.335 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#2D78C1` | blue | 28449 | Wings and body (`#50BBFF` in the top band) |
| `#010306` | near-black | 13376 | Outline and the lower band |
| `#FDFEFF` | near-white | 9456 | Panels; more on the right (3869 left, 5277 right) |
| `#50E4FF` | cyan | 7388 | Top and middle (`#50BBFF` top, `#45ADFE` middle) |
| `#00163D` | dark blue | 3731 | Shadow |
| `#EAFF79` | yellow-green | 4190 | Smaller accent |

**Shapes and silhouette.** The top band is the widest part of the ship. Wings stretch across the forward half, and the form narrows to a short tail. Bright saturated pixels are 9323 in the top third, 10967 in the middle, and 203 in the bottom third. The lower edge is dark blue, black, and white rather than a bright glow.

**Details.** Upper surfaces are cyan and blue with white panels. Dark lines separate the panels. The tail is narrow and dark. Partial alpha is present (about 36,000 pixels).

**Overall look.** A wide blue-and-cyan forward wing with a narrow dark tail, on a transparent canvas that the ship nearly reaches at the bottom.

**Gameplay (not visual).** Section 2.4 id `azure`, display name “Azure Lancer”, ability overflight.

## BU2X

| | |
| --- | --- |
| File | `public/assets/ships/BU2X.png` |
| Canvas | 1024 × 630 px, 8-bit RGBA, not interlaced |
| Content box | 818 × 579 px, padding left 101, top 33, right 105, bottom 18 |
| Band widths | top 470, middle 806, bottom 142 |
| Outline mirror | alpha match 0.988 |
| Paint mirror | best colour match 0.320 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#DCF900` | yellow-green | 23784 | Top and middle (`#D0F500` top, `#D8F500` middle) |
| `#0C080F` | near-black | 12324 | Outline and shadow |
| `#FCFFFE` | near-white | 7498 | Panels; more on the right (3236 left, 5127 right) and more in the upper half |
| `#CA1770` | magenta | 4197 | Middle band (`#FD2494`) |
| `#FD4ABE` | pink-magenta | 1955 | Middle band |
| `#74AA2A` | green | 3934 | Hull |
| `#0EEAFF` | cyan | 1917 | Upper area, smaller than the yellow |
| `#2EB288` | green | — | Bottom band, with `#54CC79` and `#E5FF68` |

**Shapes and silhouette.** Short and wide. The middle is the widest band, the top is still broad, and the bottom narrows. A dark angular mark sits on the upper fuselage. The outline mirrors; the yellow, white, and magenta paint does not.

**Details.** Yellow-green covers the upper and middle hull. Magenta sits in the middle band. The lower edge turns greener, with yellow still present. Partial alpha is present (about 55,000 pixels).

**Overall look.** A compact yellow-green hull with magenta in the middle and green along the lower edge.

**Gameplay (not visual).** Section 2.4 id `bu2x`, display name “BU2X”, ability knockback of up to 3 rocks.

## Crimson MK-7

| | |
| --- | --- |
| File | `public/assets/ships/Crimson MK-7.png` |
| Canvas | 1024 × 793 px, 8-bit RGBA, not interlaced |
| Content box | 873 × 747 px, padding left 74, top 25, right 77, bottom 21 |
| Band widths | top 52, middle 712, bottom 264 |
| Outline mirror | alpha match 0.989 |
| Paint mirror | best colour match 0.326 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#06090A` | near-black | 24677 | Outline, shadow, and much of the lower band |
| `#005040` | dark teal | 12528 | The wide middle (`#005E45`) |
| `#F96B00` | orange | 6706 | Nose and lower hull |
| `#FECC00` | yellow | 5087 | Nose and middle |
| `#AB2200` | red | 4919 | Nose and middle (`#D14000`, `#D23300`) |
| `#FBFFFC` | near-white | 2293 | Small light panels; more on the right (315 left, 2195 right) |

**Shapes and silhouette.** A narrow point at the top, a wide wing span in the middle, and a broader tail than the dart-shaped ships (bottom band 264). The largest coloured region is dark teal, not red. Red, orange, and yellow are the smaller saturated groups.

**Details.** The top band mixes dark teal, red, and yellow. The middle is dark teal and black, with yellow and red. The bottom is mostly black and orange. Near-white pixels are scarce. Partial alpha is present (about 61,000 pixels).

**Overall look.** A pointed ship whose broad wings are dark teal, with orange, yellow, and red on the nose and lower hull.

**Gameplay (not visual).** Section 2.4 id `mk7`, display name “Crimson MK-7”, ability downburst.

## Cyan Vector 7

| | |
| --- | --- |
| File | `public/assets/ships/Cyan Vector 7.png` |
| Canvas | 1075 × 871 px, 8-bit RGBA, not interlaced |
| Content box | 835 × 856 px, padding left 115, top 14, right 125, bottom 1 |
| Band widths | top 38, middle 771, bottom 166 |
| Outline mirror | alpha match 0.976 |
| Paint mirror | best colour match 0.265 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#0B4F90` | dark blue | 15442 | Body (`#183D70` in the middle, `#002F6E` at the top) |
| `#EA8200` | orange | 9034 | Middle band, with `#CE4E00` |
| `#FFD900` | yellow | 6690 | Middle band (`#FFC600`) |
| `#FBFEFF` | near-white | 6698 | Panels; more on the right (2326 left, 4463 right) and more in the lower half |
| `#06080E` | near-black | 6597 | Outline and shadow |
| `#0E1D44` | darker blue | 5830 | Shadowed body |
| `#812700` | red-brown | 3211 | With the orange areas |
| `#81ECFF` | cyan | 1394 | Smaller accent (`#29A5F5` in the top band) |
| `#A39E9E` | gray | — | Bottom band, beside gold `#EAB96A` |

**Shapes and silhouette.** The only canvas wider than 1024 px. The nose is a thin point (top band 38). The wings are very wide through the middle. The ship runs almost the full height of the canvas. This is the least mirror-perfect outline in the set, and it is still close to symmetric.

**Details.** The nose mixes dark blue, cyan, and orange. A yellow and orange band crosses the blue middle. The lower band is muted gold, gray, and dark blue, not a bright cyan block. Partial alpha is present (about 76,000 pixels).

**Overall look.** A long blue arrow with an orange-yellow middle and a duller gray-gold tail, nearly touching the bottom of the canvas.

**Gameplay (not visual).** Section 2.4 id `cyan`, display name “Cyan Vector 7”, ability compass.

## D.A.T. Sawze

| | |
| --- | --- |
| File | `public/assets/ships/D.A.T. Sawze.png` |
| Canvas | 1024 × 787 px, 8-bit RGBA, not interlaced |
| Content box | 943 × 728 px, padding left 39, top 30, right 42, bottom 29 |
| Band widths | top 74, middle 900, bottom 280 |
| Outline mirror | alpha match 0.990 |
| Paint mirror | best colour match 0.259 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#45719F` | steel blue | 29500 | Body (`#7298C6` in the middle) |
| `#070707` | near-black | 19553 | Outline and the lower band |
| `#FAFCFF` | near-white | 13906 | Panels; far more on the right (2248 left, 12206 right) |
| `#99000F` | red | 6091 | Top band (`#B70018`) |
| `#772919` | brown-red | 3038 | Lower hull (`#9A5334` in the bottom band) |
| `#DD8C47` | tan | 3032 | Lower hull |
| `#353E59` | dark blue | 967 | Small shadow accent |

**Shapes and silhouette.** Narrow nose, very wide middle, tail narrower than the wings but wider than the nose. Near-white panels are strongly weighted to the right half.

**Details.** Red is concentrated in the top band, on the nose. The middle is steel blue, black, and white. The bottom mixes black, tan, white, and steel blue. Bright saturated pixels include both steel blue and red (`#F00000`). Partial alpha is present (about 55,000 pixels).

**Overall look.** A broad blue-gray wing with a red nose, white panels on the right, and a tan lower edge.

**Gameplay (not visual).** Section 2.4 id `datsawze`, display name “D.A.T. Sawze”, ability downburst.

## Mantas - Arc 5

| | |
| --- | --- |
| File | `public/assets/ships/Mantas - Arc 5.png` |
| Canvas | 1024 × 687 px, 8-bit RGBA, not interlaced |
| Content box | 911 × 641 px, padding left 55, top 17, right 58, bottom 29 |
| Band widths | top 84, middle 851, bottom 164 |
| Outline mirror | alpha match 0.987 |
| Paint mirror | best colour match 0.243 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#070708` | near-black | 12646 | Outline and shadow |
| `#678B38` | olive | 10209 | Wings (`#9FBF64` in the middle, `#4A6E3A` at the top) |
| `#FDFCFA` | near-white | 8052 | Panels; more on the right (2300 left, 5746 right) and more in the upper half |
| `#DDF287` | yellow-green | 6539 | Mid wings. Bright saturated median `#CDD28B` |
| `#CF56EF` | purple | 3107 | Glow (`#9C03C2` in the top band, `#D075F4` in the bottom band) |
| `#375A30` | dark green | 2474 | Shadowed wing |

**Shapes and silhouette.** A wide, shallow manta. The top band is a short centre rising between the wings. The middle is almost the full content width. The bottom centre is narrower and holds the purple pixels. See the next section for the pixel comparison with `Mantas - Arc 5 (1).png`.

**Details.** The top mixes white, black, olive, and purple. The wings are yellow-green and olive. The bottom band is purple (`#D075F4`), white, and black. Partial alpha is present (about 59,000 pixels).

**Overall look.** A wide olive-and-lime manta with purple at the lower centre and a smaller purple touch near the top centre.

**Gameplay (not visual).** Section 2.4 id `mantas`, display name “Mantas Arc-5”, file `images/ships/Mantas - Arc 5.png`, ability shockwave.

## Mantas - Arc 5 (1)

| | |
| --- | --- |
| File | `public/assets/ships/Mantas - Arc 5 (1).png` |
| Canvas | 1024 × 1024 px, 8-bit RGBA, not interlaced |
| Content box | 945 × 666 px, padding left 39, top 181, right 40, bottom 177 |
| Band widths | top 94, middle 932, bottom 187 |
| Outline mirror | alpha match 0.988 |
| Paint mirror | best colour match 0.265 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#080A0C` | near-black | 23319 | Outline and shadow |
| `#70885B` | gray-olive | 9710 | Wings |
| `#525553` | gray | 7840 | Mid wings (`#92948A` in the middle band) |
| `#FAF5EE` | ivory | 6452 | Light panels; more on the right (1347 left, 5131 right) |
| `#394B34` | dark green | 4989 | Shadowed wing |
| `#A9A99E` | light gray | 3011 | Mid panels |
| `#B9C78C` | pale olive | 2134 | Wings |
| `#DD8EF0` | light purple | 2417 | Top and bottom (`#733E8F` top, `#EAA4F8` bottom) |

**Pixels compared with `Mantas - Arc 5.png`.** The pixels are not identical.

| Check | Result |
| --- | --- |
| Canvas | 1024 × 687 versus 1024 × 1024 |
| File bytes | 791,465 versus 1,829,620 |
| Content box | 911 × 641 versus 945 × 666 |
| Alpha overlap after scaling both content boxes to 400 × 280 | IoU 0.796 |
| Mean absolute RGB difference on that overlap | 65.6 per channel |

Both are wide plan-view mantas with a narrow top, a very wide middle, and purple samples near the lower centre. The Arc 5 file is the more saturated of the two: its middle is yellow-green (`#9FBF64`, `#DDF287`) and it has 8,102 bright saturated samples. The `(1)` file is grayer (`#92948A`, `#525553`), and only 1,492 samples pass the same bright-saturated test; those are mostly purple. The `(1)` file also leaves large transparent bands above and below the ship (top padding 181, bottom padding 177).

**Shapes and silhouette.** Same family of shape as Arc 5: shallow wings, a short rise at the top centre, a narrower lower centre. The scaled masks do not coincide, so this is a separate drawing, not a crop or a re-save of the other file.

**Details.** The upper centre is dark, olive, ivory, and purple. The wings are gray and dull olive. Purple remains visible at the lower centre (`#EAA4F8`). Partial alpha is present (about 38,000 pixels).

**Overall look.** A grayer, less saturated manta on a square canvas, with purple at the lower centre and wide empty margins.

**Gameplay (not visual).** Section 2.4 does not list this filename. The shockwave row names `Mantas - Arc 5.png` only.

## Ruby Strike

| | |
| --- | --- |
| File | `public/assets/ships/Ruby Strike.png` |
| Canvas | 1024 × 661 px, 8-bit RGBA, not interlaced |
| Content box | 943 × 613 px, padding left 40, top 29, right 41, bottom 19 |
| Band widths | top 936, middle 748, bottom 142 |
| Outline mirror | alpha match 0.995 |
| Paint mirror | best colour match 0.536 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#FCFDFE` | near-white | 15180 | Hull panels; more on the right (6317 left, 7499 right) and more in the upper half |
| `#070709` | near-black | 15038 | Outline and mid shadow |
| `#F20015` | red | 13440 | Top and middle (`#F70018` top, `#EC0015` middle). Bright median `#FC001A` |
| `#59769B` | blue-gray | 8299 | Body and the lower band (`#82A1C5`) |
| `#596387` | slate blue | 5000 | Mid panels |
| `#A21F00` | dark red | 4326 | With the red panels |
| `#E6760F` | orange | 1772 | Small accent |
| `#3AE5FF` | cyan | 1233 | Small accent |
| `#E8EDF6` | pale blue-gray | — | Bottom band |

**Shapes and silhouette.** The top band is the widest. Wings span the forward edge and the body narrows toward the tail. This file has the highest colour-mirror score of the transparent ships, and the two halves still do not match.

**Details.** Red and white dominate the top and middle. Bright saturated pixels are 7256 / 7027 / 680 from top to bottom, so the red is not a tail glow. The bottom band is pale blue-gray, steel blue, and black. Partial alpha is present (about 56,000 pixels).

**Overall look.** A forward-wide red-and-white ship with a narrow pale tail.

**Gameplay (not visual).** Section 2.4 id `ember`, display name “Ruby Strike”, ability overflight.

## Scarlet Classic

| | |
| --- | --- |
| File | `public/assets/ships/Scarlet Classic.png` |
| Canvas | 1024 × 768 px, 8-bit RGBA, not interlaced |
| Content box | 880 × 722 px, padding left 71, top 29, right 73, bottom 17 |
| Band widths | top 81, middle 795, bottom 184 |
| Outline mirror | alpha match 0.989 |
| Paint mirror | best colour match 0.343 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#0A0202` | near-black | 15856 | Outline and shadow |
| `#993003` | red | 15548 | Hull (`#B64500` top, `#AA4900` middle, `#CB3900` bottom) |
| `#F57400` | orange | 15492 | Hull. Bright saturated median `#FB9100` |
| `#FFD412` | yellow | 10030 | Upper and middle panels (`#FEC100` top) |
| `#622A33` | dark red | 6837 | Shadowed red |
| `#20E0E7` | cyan | 3360 | Smaller accent scattered on the sprite |
| `#FDFBF8` | near-white | 3137 | Light panels; more on the right (1164 left, 2609 right) |
| `#FC4B91` | pink | 1448 | Small accent |

**Shapes and silhouette.** Narrow nose, wide middle wings, narrower tail. Orange, red, and yellow run from nose to tail. The outline mirrors; the paint does not.

**Details.** The top band is yellow, red, and black. The middle is black, red, yellow, and dark red. The bottom is red and orange. Cyan is a minor group next to those hues. Partial alpha is present (about 75,000 pixels).

**Overall look.** A red-orange-yellow winged ship with dark contours and a small cyan accent.

**Gameplay (not visual).** Section 2.4 id `classic`, display name “Scarlet Classic”, ability shockwave.

## VER-DE-9

| | |
| --- | --- |
| File | `public/assets/ships/VER-DE-9.png` |
| Canvas | 1024 × 641 px, 8-bit RGBA, not interlaced |
| Content box | 839 × 601 px, padding left 92, top 29, right 93, bottom 11 |
| Band widths | top 199, middle 837, bottom 141 |
| Outline mirror | alpha match 0.991 |
| Paint mirror | best colour match 0.336 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#05090F` | near-black | 24485 | Outline and shadow |
| `#355D8B` | blue | 21973 | Body (`#4BACDE` in the middle, `#4882AA` at the top) |
| `#FFFFFF` | white | 8603 | Panels; more on the right (2700 left, 5919 right) and more in the upper half |
| `#21283A` | dark blue | 5056 | Shadowed body |
| `#44E6FF` | cyan | 4277 | Body accent |
| `#00BD37` | green | — | Bottom band, with `#009E74` and `#59F602` |
| `#94FF00` | yellow-green | 1758 | With the lower green |

**Shapes and silhouette.** The nose is wider than the needle noses (top band 199). The wings then run almost the full content width, and the tail narrows. The ship sits close to the bottom edge.

**Details.** The upper and middle bands are black, blue, dark blue, and white. Green is concentrated in the bottom band. Partial alpha is present (about 50,000 pixels).

**Overall look.** A wide blue ship with white panels and a green lower edge.

**Gameplay (not visual).** Section 2.4 id `verde9`, display name “VER-DE-9”, ability knockback of up to 3 rocks.

## Veloz Mas

| | |
| --- | --- |
| File | `public/assets/ships/Veloz Mas.png` |
| Canvas | 1024 × 876 px, 8-bit RGBA, not interlaced |
| Content box | 846 × 858 px, padding left 88, top 18, right 90, bottom 0 |
| Band widths | top 47, middle 812, bottom 351 |
| Outline mirror | alpha match 0.984 |
| Paint mirror | best colour match 0.287 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#08538B` | dark blue | 17926 | Body (`#0A376E` middle, `#022D5E` top) |
| `#070707` | near-black | 12572 | Outline and shadow |
| `#F28400` | orange | 5424 | Middle (`#FFBD00` in the middle band) |
| `#FEFFFF` | near-white | 4622 | Panels; more on the right (1382 left, 3349 right) |
| `#FEDD00` | yellow | 3780 | Middle |
| `#EFFF56` | pale yellow | 2574 | Accent |
| `#902600` | dark red | 2419 | With the orange |
| `#011540` | darker blue | 2328 | Shadow |
| `#AEB1B9` | light gray | — | Bottom band, with gold `#FCCE72` and tan `#C49177` |

**Shapes and silhouette.** Long. The nose is a point, the middle is very wide, and the tail stays fairly wide (bottom band 351). The painted ship touches the bottom edge.

**Details.** The nose is dark blue with some orange. The middle adds a yellow-orange band on the blue hull. The bottom is gray and muted gold rather than a saturated glow. Partial alpha is present (about 73,000 pixels).

**Overall look.** A long blue ship with an orange-yellow middle and a gray tail that meets the bottom of the canvas.

**Gameplay (not visual).** Section 2.4 id `veloz`, display name “Veloz Mas”, ability compass.

## Verdant Spire

| | |
| --- | --- |
| File | `public/assets/ships/Verdant Spire.png` |
| Canvas | 1024 × 873 px, 8-bit RGBA, not interlaced |
| Content box | 797 × 825 px, padding left 113, top 19, right 114, bottom 29 |
| Band widths | top 50, middle 581, bottom 75 |
| Outline mirror | alpha match 0.993 |
| Paint mirror | best colour match 0.269 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#5707A9` | purple | 18924 | Main hull (`#9E2CED` in the middle, `#3C008A` at the top) |
| `#070414` | near-black | 9498 | Outline and the lower band |
| `#03E5FC` | cyan | 9136 | Top (`#0071A3`) and bottom (`#00DCEF`) |
| `#D867FF` | magenta | 6267 | Hull (`#C65EFF` at the top) |
| `#004884` | blue | 4617 | With the cyan areas |
| `#8C5305` | brown | 4141 | Beside the yellow band |
| `#FEFEFF` | near-white | 4072 | Panels; more on the right (1209 left, 3473 right) |
| `#FFE000` | yellow | 3252 | Middle band (`#DFA000`) |

The sampled hue bands do not include a green group. The visible hull is purple, cyan, and yellow.

**Shapes and silhouette.** Tall and comparatively narrow. The nose is a point (top band 50), the middle widens to 581, and the tail narrows to 75. Left and right padding are the largest among the 1024-wide files.

**Details.** The top mixes cyan, purple, and magenta. A yellow band crosses the purple middle. The bottom returns to black, cyan, and purple. Partial alpha is present (about 35,000 pixels).

**Overall look.** A tall purple spire with a yellow middle band and cyan at the nose and tail.

**Gameplay (not visual).** Section 2.4 id `spire`, display name “Verdant Spire”, ability side flares.

## White Flame 8

| | |
| --- | --- |
| File | `public/assets/ships/White Flame 8.png` |
| Canvas | 1024 × 604 px, 8-bit RGBA, not interlaced |
| Content box | 916 × 552 px, padding left 54, top 24, right 54, bottom 28 |
| Band widths | top 63, middle 900, bottom 317 |
| Outline mirror | alpha match 0.983 |
| Paint mirror | best colour match 0.317 |

**Colours**

| Hex | Plain name | Samples | Where the samples sit |
| --- | --- | --- | --- |
| `#FEFEFF` | white | 18499 | Hull; more on the right (5706 left, 12533 right) and more in the upper half |
| `#7181BB` | periwinkle | 11649 | Wings (`#7B8EC0` in the middle, `#6B88C2` at the top) |
| `#07040C` | near-black | 7473 | Outline and the lower band |
| `#5D99D4` | light blue | 7419 | Wings |
| `#EB0D6E` | magenta | 3204 | Middle (`#FF19AA`) |
| `#F324B1` | pink-magenta | 2567 | Middle |
| `#2F295F` | dark purple | 2734 | Shadow |
| `#45EEFF` | cyan | 2146 | Top band (`#2FBFFF`) |
| `#C50024` | red | 1655 | Small accent |

**Shapes and silhouette.** The shortest canvas in the set. A narrow nose opens into a very wide middle, with a tail that stays broader than the darts (bottom band 317).

**Details.** The nose is blue, white, and cyan. The middle is white and periwinkle with a magenta group. The bottom is darker: black, blue (`#3668C7`), and dark magenta (`#571F4B`). Partial alpha is present (about 67,000 pixels).

**Overall look.** A wide, short white-and-blue wing with magenta in the middle and a darker lower edge.

**Gameplay (not visual).** Section 2.4 id `whiteflame8`, display name “White Flame 8”, ability clear the lane in front.

## Shared visual language

### Palette rules

- Near-black is a major sampled group on every file. It forms the contour and the shadowed gaps between panels. Typical medians are `#070606` to `#0A0202`, sometimes with a slight hue (`#040115` on AM2 Scout, `#0A0500` on Aurora Dart).
- Every file also has a near-white or ivory group, from `#F9FDFE` to `#FFFFFF`. Those pixels are more numerous on the right half than the left half of every sprite.
- Each ship has one dominant saturated family, plus smaller accent hues. The families actually on the sprites are purple and pink (AM2 Scout), blue-violet (AM3 Scout), teal and green (both Apex files), orange and ivory (Aurora Dart), blue and cyan (Azure Lancer), yellow-green and magenta (BU2X), dark teal with orange and red (Crimson MK-7), blue with orange and yellow (Cyan Vector 7, Veloz Mas), steel blue with red (D.A.T. Sawze), olive with purple (both Mantas files), red and white (Ruby Strike), red-orange and yellow (Scarlet Classic), blue with a green tail (VER-DE-9), purple with cyan and yellow (Verdant Spire), and white with periwinkle and magenta (White Flame 8).
- The filename is not a colour key. Verdant Spire’s sampled bands are purple, cyan, and yellow. Crimson MK-7’s largest coloured band is dark teal. Cyan Vector 7’s largest coloured band is dark blue, with cyan as a smaller accent.
- Paint is not a left-right mirror. After searching a range of mirror axes, colour match stays between 0.205 and 0.536 on the transparent ships. `Apex Tiburon.png` scores 0.786 because the opaque field matches itself.

### Shape conventions

- Each file shows one craft, drawn in plan view.
- The outline is a near left-right mirror. Alpha match runs from 0.976 (Cyan Vector 7) to 0.995 (Ruby Strike) on the transparent files.
- Most ships are narrow at the top, widest through the middle, and narrower again at the bottom. Azure Lancer and Ruby Strike are widest in the top band because the wings reach the forward edge. BU2X is broad at the top and widest in the middle. VER-DE-9’s nose is wider than the needle noses (top band 199) and then opens to a full-width wing.
- Wings account for the wide band. The lower band is the tail and engine area.
- Dark lines break the hull into panels. Edges on the transparent files include partial alpha, so the contour is antialiased. `Apex Tiburon.png` has no partial alpha.

### Orientation and facing

The nose points to the top of the image. Engine and tail colours sit in the lower band: cyan on the AM scouts, bright green on both Apex files, orange on Aurora Dart, green on BU2X and VER-DE-9, orange on Crimson MK-7 and Scarlet Classic, purple on both Mantas files. Azure Lancer, Cyan Vector 7, Ruby Strike, and Veloz Mas keep their brightest saturated pixels on the wings or the middle, and the lower band is darker or grayer.

Nothing in the set is drawn nose-left, nose-right, or nose-down.

### Line and shading style

Colour sits in hard-edged regions: a near-black line or gap, a mid colour, and a near-white panel. The samples cluster into a handful of hue bands rather than a smooth ramp across the hull. Partial alpha is an edge fringe, not a soft glow painted far outside the silhouette. Semi-transparent pixel counts on the transparent files run from about 5,400 (Apex Tiburon IV) to about 76,000 (Cyan Vector 7).

### Background and transparency

Seventeen files use a transparent field outside the ship. `Apex Tiburon.png` does not: every pixel has alpha 255, and the field is `#070606`.

Transparent pixels still store an RGB value. On most files that stored value is near `#070606`. On `AM2 Scout.png` the transparent field stores a muted purple around `(129, 123, 155)` with alpha 0. That purple does not show. The visible ground is empty.

### Canvas size and padding

There is no single canvas size. All 18 files are 8-bit RGBA and non-interlaced.

| File | Canvas | Content box | Padding L, T, R, B |
| --- | --- | --- | --- |
| AM2 Scout.png | 1024 × 1024 | 861 × 837 | 81, 47, 82, 140 |
| AM3 Scout.png | 1024 × 909 | 861 × 837 | 81, 47, 82, 25 |
| Apex Tiburon IV.png | 682 × 665 | 643 × 627 | 21, 19, 18, 19 |
| Apex Tiburon.png | 682 × 665 | 682 × 665 | 0, 0, 0, 0 |
| Aurora Dart.png | 1024 × 775 | 935 × 754 | 45, 21, 44, 0 |
| Azure Lancer.png | 1024 × 738 | 825 × 717 | 99, 17, 100, 4 |
| BU2X.png | 1024 × 630 | 818 × 579 | 101, 33, 105, 18 |
| Crimson MK-7.png | 1024 × 793 | 873 × 747 | 74, 25, 77, 21 |
| Cyan Vector 7.png | 1075 × 871 | 835 × 856 | 115, 14, 125, 1 |
| D.A.T. Sawze.png | 1024 × 787 | 943 × 728 | 39, 30, 42, 29 |
| Mantas - Arc 5 (1).png | 1024 × 1024 | 945 × 666 | 39, 181, 40, 177 |
| Mantas - Arc 5.png | 1024 × 687 | 911 × 641 | 55, 17, 58, 29 |
| Ruby Strike.png | 1024 × 661 | 943 × 613 | 40, 29, 41, 19 |
| Scarlet Classic.png | 1024 × 768 | 880 × 722 | 71, 29, 73, 17 |
| VER-DE-9.png | 1024 × 641 | 839 × 601 | 92, 29, 93, 11 |
| Veloz Mas.png | 1024 × 876 | 846 × 858 | 88, 18, 90, 0 |
| Verdant Spire.png | 1024 × 873 | 797 × 825 | 113, 19, 114, 29 |
| White Flame 8.png | 1024 × 604 | 916 × 552 | 54, 24, 54, 28 |

Left padding and right padding match within a few pixels, so each ship is centred horizontally. Top padding on the 1024-wide files is 14 to 47 px. Bottom padding runs from 0 to 177. Aurora Dart and Veloz Mas touch the bottom edge. Cyan Vector 7 and Azure Lancer nearly do.

### Lighting direction

The sprites do not share one cast-light direction. Shadow is painted as near-black shapes inside the contour. Near-white panels are a paint choice, and on every file more of those pixels lie on the right half than the left. Whether they lie higher or lower depends on the ship: White Flame 8, Ruby Strike, VER-DE-9, Mantas - Arc 5, and BU2X carry more of them in the upper half; the AM scouts, both Apex files, Cyan Vector 7, D.A.T. Sawze, and Veloz Mas carry more in the lower half.

Glows are small saturated regions inside the silhouette. They are not a shared lamp from one corner of the canvas.

### Mood and theme

The set is a group of separate spacecraft, each with its own hue family, drawn the same way: plan view, nose to the top, dark contours, flat colour panels, a near-white panel group weighted to the right, and a transparent ground. The canvases are large relative to a HUD icon, and the ships fill most of the width. The mood of the pixels is high-contrast and graphic: saturated colour against near-black linework, with small brighter accents at the nose, the wings, or the tail.

## Recipe for a new ship image

These steps follow the files above. They are instructions only. They do not change `src/game/assetsManifest.js`.

1. **Canvas.** Create an 8-bit RGBA PNG, non-interlaced. Use a width of 1024 px unless the ship is the smaller Tiburon size (682 × 665) or you have a reason to match Cyan Vector 7 (1075 × 871). Set the height so the ship fits with the padding in the next step. Do not add an opaque background. `Apex Tiburon.png` is the only file that fills the canvas with opaque `#070606`.
2. **Padding.** Centre the ship left to right, with similar left and right margins. Keep the top margin small, on the order of 15 to 45 px for a 1024-wide file. Bottom margin in the set runs from none (the sprite touches the edge) to a large empty band. Leave the margin transparent.
3. **Orientation.** Draw the ship in plan view with the nose at the top of the image and the tail at the bottom. The existing files do not face left, right, or down.
4. **Silhouette.** Draw one connected craft. Make the outline a left-right mirror; the current alpha masks match their mirrors at about 0.98 to 0.99. Put the wings in the wide band. For a dart, keep the top band narrow and the middle band wide. For a forward-wing ship like Azure Lancer or Ruby Strike, let the top band be the widest and narrow the tail. Keep the lower band for the tail and engines.
5. **Palette.** Pick one saturated family for the hull. Add near-black contours and shadows, a near-white panel group, and one smaller accent for lights or the tail (cyan, green, orange, yellow, or purple, as on the existing ships). Paint the two halves differently. Place more of the near-white panels on the right half.
6. **Shading.** Fill hard-edged regions. Separate them with near-black lines. Do not grade one soft shadow across the whole hull. Keep any glow inside the silhouette or in a short antialiased fringe. The existing partial-alpha pixels hug the contour.
7. **Details.** Put a contrasting patch at the upper centre for the canopy area. Break the wings into panels. Put the engine colour in the lower band. Match the accent to the hull family the way the set does: cyan under the purple scouts, green under the Tiburon, orange under Aurora Dart and Scarlet Classic, purple under the Mantas, green under VER-DE-9.
8. **Export.** Save PNG, 8 bits per channel, colour type RGBA, no interlacing. The filename is the ship’s name plus `.png`, with spaces preserved, as in `Scarlet Classic.png`, `Crimson MK-7.png`, `VER-DE-9.png`, and `D.A.T. Sawze.png`. `Mantas - Arc 5 (1).png` is a different picture from `Mantas - Arc 5.png`, so a ` (1)` suffix is not a way to store a duplicate.
9. **Where to put it, and how to register it.** Save the file in `public/assets/ships/`. In `src/game/assetsManifest.js`, add that exact filename as a string in the `SHIP_FILES` array. `listPhaserImages()` loops the array and loads each name with `assetUrl("assets/ships", name)`, which percent-encodes the filename, so spaces are valid. The Phaser texture key is the filename, including `.png`. `DEFAULT_SHIP` in the same file is `"AM3 Scout.png"`. Leave that constant unless this new file should replace the default. The filename in the array and the filename on disk have to match, including spaces and capital letters.
