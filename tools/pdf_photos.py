#!/usr/bin/env python3
"""Crop product photos out of the PDF catalogues for products that have none.

For each catalogue number it finds the row on its PDF page (data/pdf-index.json
+ assets/catalog-index/<code>.json), takes the band between the horizontal
rules above and below that product's table, and keeps the largest dark
connected shape to the right of the table — the instrument photograph —
ignoring the light watermark, figure labels and the small needle-size icons.

    ~/.local/opix-ocr/bin/python tools/pdf_photos.py SKU [SKU ...]
    ~/.local/opix-ocr/bin/python tools/pdf_photos.py --missing   every product without a photo
    ~/.local/opix-ocr/bin/python tools/pdf_photos.py --sheet out.png SKU ...   contact sheet only

Writes assets/img/products/<SKU>.jpg and adds [w, h] to tools/seo/imgdims.json.
Grid layouts (dental) crop the photo above the item's caption instead.
Review the contact sheet before rebuilding — a crop is a guess, not a fact.
"""
import json, os, re, subprocess, sys

import cv2
import numpy as np
import pymupdf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "img", "products")
DIMS = os.path.join(ROOT, "tools", "seo", "imgdims.json")
DPI = 200
cmp = lambda s: re.sub(r"[^a-z0-9]", "", str(s).lower())


def load():
    pidx = json.load(open(os.path.join(ROOT, "data", "pdf-index.json")))
    files = {e["code"]: os.path.join(ROOT, e["file"]) for e in json.load(open(os.path.join(ROOT, "downloads", "_index.json")))}
    return pidx, files


_IDX, _DOCS, _PAGES = {}, {}, {}


def page_img(code, pno, files):
    k = (code, pno)
    if k not in _PAGES:
        if code not in _DOCS:
            _DOCS[code] = pymupdf.open(files[code])
        pix = _DOCS[code][pno - 1].get_pixmap(dpi=DPI)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()
        _PAGES[k] = img
    return _PAGES[k]


def lines(code, pno):
    if code not in _IDX:
        _IDX[code] = json.load(open(os.path.join(ROOT, "assets", "catalog-index", code.lower() + ".json")))
    return _IDX[code]["pages"][pno - 1]


def rules(gray, x0, x1):
    """y positions (px) of long horizontal rules between x0..x1."""
    band = gray[:, x0:x1]
    dark = (band < 170).mean(axis=1)
    ys = np.where(dark > 0.55)[0]
    out = []
    for y in ys:
        if not out or y - out[-1] > 4:
            out.append(int(y))
    return out


def instrument_crop(region, min_area=400):
    """Rectangle around the largest dark connected shape in region, or None."""
    g = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    mask = (g < 185).astype(np.uint8) * 255          # the watermark is lighter than this
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    grow = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(grow, 8)
    best = None
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < min_area or max(w, h) < 40:
            continue
        score = a * (1 + min(max(w, h) / max(min(w, h), 1), 8) * 0.12)   # long instruments beat text blocks
        if not best or score > best[0]:
            best = (score, i, (x, y, w, h))
    if not best:
        return None
    _, i, (x, y, w, h) = best
    # Crop the photo exactly as printed. Whitening the watermark pixel by
    # pixel also erased highlights on polished steel, so it is not done.
    pad = 10
    y0, x0 = max(0, y - pad), max(0, x - pad)
    return region[y0:y + h + pad, x0:x + w + pad]


def blank_text(region, L, off_x, off_y, W, H, pad=4):
    """White out every OCR'd text line inside region (codes, sizes, titles)."""
    for x0, y0, x1, y1, _ in L:
        a, b = int(x0 * W) - off_x - pad, int(y0 * H) - off_y - pad
        c, d = int(x1 * W) - off_x + pad, int(y1 * H) - off_y + pad
        a, b, c, d = max(a, 0), max(b, 0), min(c, region.shape[1]), min(d, region.shape[0])
        if c > a and d > b:
            region[b:d, a:c] = 255
    return region


def crop_table(sku, code, pno, files):
    img = page_img(code, pno, files)
    H, W = img.shape[:2]
    L = lines(code, pno)
    me = next((l for l in L if cmp(sku) in cmp(l[4])), None)
    if not me:
        return None, "row not found"
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    r = rules(gray, int(0.05 * W), int(0.86 * W))
    y_row = me[1] * H
    above = [y for y in r if y < y_row - 4]
    below = [y for y in r if y > me[3] * H + 4]
    top = (above[-1] + 6) if above else int(0.10 * H)
    bot = (below[0] - 6) if below else int(0.94 * H)
    top = max(top, int(0.075 * H))                    # skip the page banner
    x0, x1 = int(0.075 * W), int(0.875 * W)           # whole band, between the mm ruler and the side tab
    region = blank_text(img[top:bot, x0:x1].copy(), L, x0, top, W, H)
    crop = instrument_crop(region)
    return (crop, "table") if crop is not None else (None, "no photo in band")


def crop_grid(sku, code, pno, files):
    """Dental grid: the photo sits in the column above the item's caption."""
    img = page_img(code, pno, files)
    H, W = img.shape[:2]
    L = lines(code, pno)
    me = next((l for l in L if cmp(sku) == cmp(l[4]) or cmp(l[4]).startswith(cmp(sku))), None)
    if not me:
        return None, "caption not found"
    x0, x1 = int(max(0, me[0] - 0.045) * W), int(min(1, me[0] + 0.12) * W)
    top, bot = int(0.13 * H), int(me[1] * H - 4)
    region = blank_text(img[top:bot, x0:x1].copy(), L, x0, top, W, H)
    crop = instrument_crop(region)
    return (crop, "grid") if crop is not None else (None, "no photo above caption")


# Hand-set crop boxes (page fractions x0, y0, x1, y1) for tables where the
# automatic crop picked a zoomed detail or cut the photo. Checked by eye.
_M = {
    ("OM-20-256", "OM-20-257", "OM-20-258"): (0.33, 0.23, 0.85, 0.33),
    ("OM-20-259", "OM-20-260", "OM-20-261", "OM-20-262"): (0.33, 0.43, 0.85, 0.52),
    ("OM-20-263", "OM-20-264", "OM-20-265"): (0.33, 0.60, 0.85, 0.66),
    ("SU-06-293",): (0.60, 0.16, 0.99, 0.27), ("SU-06-294",): (0.60, 0.31, 0.99, 0.42),
    ("SU-06-295",): (0.60, 0.45, 0.99, 0.57), ("SU-06-296",): (0.60, 0.60, 0.99, 0.73),
    tuple(f"SU-06-{n}" for n in range(310, 317)): (0.48, 0.56, 0.99, 0.73),
    ("PR-03-190",): (0.38, 0.20, 0.99, 0.31), ("PR-03-191",): (0.38, 0.34, 0.99, 0.44),
    ("PR-03-192",): (0.38, 0.48, 0.99, 0.57),
    ("PD-22-133", "PD-22-134"): (0.55, 0.45, 0.97, 0.72),
    ("OP-11-526", "OP-11-527"): (0.66, 0.19, 0.98, 0.29),
    ("OB-17-128",): (0.60, 0.58, 0.95, 0.77),
    ("SU-06-473",): (0.50, 0.34, 0.875, 0.44), ("SU-06-474",): (0.50, 0.48, 0.875, 0.58),
    ("CV-09-463", "CV-09-464", "CV-09-465", "CV-09-466"): (0.42, 0.17, 0.88, 0.31),
}
MANUAL = {s: box for k, box in _M.items() for s in k}


def crop_manual(sku, code, pno, files):
    img = page_img(code, pno, files)
    H, W = img.shape[:2]
    x0, y0, x1, y1 = MANUAL[sku]
    return img[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)].copy(), "manual"


def finish(crop, max_side=640):
    """White background, light trim, size comparable to the existing photos."""
    h, w = crop.shape[:2]
    s = min(1.0, max_side / max(w, h))
    if s < 1:
        crop = cv2.resize(crop, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    return crop


def main():
    args = sys.argv[1:]
    sheet = None
    if "--sheet" in args:
        i = args.index("--sheet"); sheet = args[i + 1]; del args[i:i + 2]
    pidx, files = load()
    dims = json.load(open(DIMS))
    if "--missing" in args:
        js = "const {SECTIONS}=require(process.argv[1]);process.stdout.write(JSON.stringify(Object.values(SECTIONS).flatMap(s=>s.items.map(i=>i[0]))))"
        skus = [s for s in json.loads(subprocess.run(["node", "-e", js, os.path.join(ROOT, "data", "products.js")], capture_output=True, text=True, check=True).stdout) if s not in dims]
    else:
        skus = args
    tiles, done = [], 0
    for sku in skus:
        at = pidx.get(sku)
        if not at:
            print(f"{sku}: not located in any PDF"); continue
        code, pno = at
        crop, how = (crop_manual if sku in MANUAL else crop_grid if code == "DN" else crop_table)(sku, code, pno, files)
        if crop is None:
            print(f"{sku}: {how}"); continue
        crop = finish(crop)
        tiles.append((sku, crop))
        if not sheet:
            cv2.imwrite(os.path.join(OUT, sku + ".jpg"), cv2.cvtColor(crop, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 86])
            dims[sku] = [int(crop.shape[1]), int(crop.shape[0])]
            done += 1
    if sheet and tiles:
        cols, cw, ch = 4, 300, 150
        rows = (len(tiles) + cols - 1) // cols
        S = np.full((rows * (ch + 22), cols * cw, 3), 235, np.uint8)
        for i, (sku, c) in enumerate(tiles):
            r, k = divmod(i, cols)
            h, w = c.shape[:2]
            s = min((cw - 10) / w, (ch - 10) / h)
            t = cv2.resize(c, (max(1, int(w * s)), max(1, int(h * s))))
            y, x = r * (ch + 22) + 20, k * cw + 5
            S[y:y + t.shape[0], x:x + t.shape[1]] = t
            cv2.putText(S, sku, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 120), 1, cv2.LINE_AA)
        cv2.imwrite(sheet, cv2.cvtColor(S, cv2.COLOR_RGB2BGR))
        print(f"sheet: {len(tiles)} crops -> {sheet}")
    if not sheet:
        with open(DIMS, "w") as f:
            json.dump(dict(sorted(dims.items())), f, separators=(",", ":"))
        print(f"{done} photos written")


if __name__ == "__main__":
    main()
