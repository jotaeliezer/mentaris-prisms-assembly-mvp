"""Cut picture files down to the size the game actually draws them at.

Every cap below is the longest side in pixels, kept at roughly twice the
largest size that picture is ever drawn, so it stays sharp on a retina
screen and while the camera zooms. The draw sizes come from PlayScene
(SHIP_DRAW 97, aliens and bullets 84, PIECE_DRAW up to 136, stars r 78)
and from game.css (.fab-icon-btn img 92px, .ship-choice-grid img 132px).

Pictures the game stretches far past their own pixels are left alone:
a nebula is drawn 9200px wide, so its 1024 plate is already an upscale.

Only files git tracks are touched, so untracked work in progress is safe.
Run from the project root:

    python scripts/shrink-art.py          # report only
    python scripts/shrink-art.py --write  # rewrite the files
"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# folder under public/ -> longest side the file is allowed to keep
CAPS = {
    "images/items": 256,
    "images/categories": 128,
    "images/station": 256,
    "images/aliens": 256,
    "images/stars": 256,
    "images/bullets": 256,
    "images/shots": 256,
    "images/powerups": 256,
    "images/space": 512,
    "assets/ships": 512,
}

# Drawn far larger than their own plate, so shrinking them would show.
KEEP = {
    "images/space/nebula-cloud.png",
    "images/space/black-hole.png",
    "images/space/star-dust-cloud.png",
}


def tracked_files():
    out = subprocess.run(
        ["git", "ls-files", "public"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return [line.strip() for line in out.stdout.splitlines() if line.strip()]


def cap_for(rel):
    """rel is the path under public/, with forward slashes."""
    if rel in KEEP:
        return None
    for folder, cap in CAPS.items():
        if rel.startswith(folder + "/"):
            return cap
    return None


def shrink(path, cap, write):
    with Image.open(path) as im:
        im.load()
        longest = max(im.size)
        if longest <= cap:
            return 0, 0
        ratio = cap / longest
        size = (max(1, round(im.width * ratio)), max(1, round(im.height * ratio)))
        small = im.resize(size, Image.LANCZOS)
        before = path.stat().st_size
        # A dry run encodes into memory so the report shows the real saving.
        target = path if write else io.BytesIO()
        if path.suffix.lower() in {".jpg", ".jpeg"}:
            small.convert("RGB").save(target, "JPEG", quality=82, optimize=True, progressive=True)
        else:
            small.save(target, "PNG", optimize=True)
        if not write:
            return before, target.tell()
    return before, path.stat().st_size


def main():
    write = "--write" in sys.argv
    public = ROOT / "public"
    saved = 0
    touched = 0
    for rel_repo in tracked_files():
        if not rel_repo.startswith("public/"):
            continue
        rel = rel_repo[len("public/"):]
        path = public / rel
        if not path.exists() or path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        cap = cap_for(rel)
        if cap is None:
            continue
        before, after = shrink(path, cap, write)
        if not before:
            continue
        touched += 1
        saved += before - after
        print(f"{'wrote ' if write else 'would'} {rel:48s} {before / 1024:7.0f}KB -> {after / 1024:6.0f}KB")
    verb = "saved" if write else "would save"
    print(f"\n{touched} files, {verb} {saved / 1048576:.1f} MB")
    if not write:
        print("Nothing changed. Pass --write to rewrite the files.")


if __name__ == "__main__":
    main()
