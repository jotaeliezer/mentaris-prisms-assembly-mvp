"""Drop black plates and white sticker outlines from generated pictures."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "images"
FOLDERS = ["items", "categories", "stars", "planets", "space"]


def peel(im):
    arr = np.array(im.convert("RGBA"))
    r, g, b, a = [arr[:, :, i].astype(np.int16) for i in range(4)]
    h, w = r.shape
    corners = [
        (int(r[2, 2]), int(g[2, 2]), int(b[2, 2])),
        (int(r[2, w - 3]), int(g[2, w - 3]), int(b[2, w - 3])),
        (int(r[h - 3, 2]), int(g[h - 3, 2]), int(b[h - 3, 2])),
        (int(r[h - 3, w - 3]), int(g[h - 3, w - 3]), int(b[h - 3, w - 3])),
    ]
    blackish = sum(1 for cr, cg, cb in corners if max(cr, cg, cb) < 32) >= 3
    if not blackish:
        return None
    hi = np.maximum(np.maximum(r, g), b)
    lo = np.minimum(np.minimum(r, g), b)
    chroma = hi - lo
    black = (hi < 32) & (np.abs(r - g) < 18) & (np.abs(g - b) < 18)
    a = np.where(black, 0, a)
    white = (a >= 24) & (hi >= 196) & (chroma <= 28)
    gray = (a >= 24) & (hi >= 70) & (hi < 196) & (chroma <= 22)

    def edge(mask):
        clear = a < 24
        pad = np.pad(clear, 1, constant_values=True)
        touch = (
            pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
            | pad[:-2, :-2] | pad[:-2, 2:] | pad[2:, :-2] | pad[2:, 2:]
        )
        return mask & touch

    for _ in range(18):
        kill = edge(white)
        if not kill.any():
            break
        a = np.where(kill, 0, a)
        white = white & (a >= 24)
    for _ in range(5):
        kill = edge(gray)
        if not kill.any():
            break
        a = np.where(kill, 0, a)
        gray = gray & (a >= 24)
    # Leftover sticker antialias is a thin gray rim. The painted subject starts darker or more colorful.
    rim = (a >= 24) & (hi < 80) & (chroma <= 14)
    for _ in range(4):
        kill = edge(rim)
        if not kill.any():
            break
        a = np.where(kill, 0, a)
        rim = rim & (a >= 24)
    rgb_clear = a < 24
    arr[:, :, 0] = np.where(rgb_clear, 0, arr[:, :, 0])
    arr[:, :, 1] = np.where(rgb_clear, 0, arr[:, :, 1])
    arr[:, :, 2] = np.where(rgb_clear, 0, arr[:, :, 2])
    if (a < 24).mean() < 0.08:
        return None
    arr[:, :, 3] = a.astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def main():
    changed = []
    for folder in FOLDERS:
        directory = ROOT / folder
        if not directory.exists():
            continue
        for path in sorted(directory.iterdir()):
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            if path.suffix.lower() == ".png" and path.with_suffix(".jpg").exists():
                continue
            if path.name.endswith(".peel.png"):
                continue
            try:
                src = Image.open(path)
            except OSError as err:
                print("skip", path.name, err)
                continue
            out = peel(src)
            if out is None:
                print("leave", folder + "/" + path.name)
                continue
            dest = path.with_suffix(".png")
            tmp = dest.with_name(dest.stem + ".peel.png")
            out.save(tmp, "PNG")
            try:
                tmp.replace(dest)
            except OSError as err:
                print("locked", dest.name, err)
                continue
            changed.append(str(dest.relative_to(ROOT.parent)))
            print("clean", folder + "/" + dest.name)
    print("done", len(changed))


if __name__ == "__main__":
    main()
