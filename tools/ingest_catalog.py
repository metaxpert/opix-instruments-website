#!/usr/bin/env python3
"""
Opix catalog ingestion — slices product images out of a flat (Photoshop-export)
catalog PDF and drops them into assets/img/products/.

Usage:
  python3 tools/ingest_catalog.py path/to/catalog.pdf --map map.json

map.json describes each content page (0-based) and its SKUs in reading order.
Multi-size items sharing one photo are joined with "|":

  {
    "tab_pages": [2,4,6],          // pages with the dark right-side tab
    "pages": {
      "1": ["FC-7010","FC-7011"],
      "2": ["FC-7012-1|FC-7012-2"]
    }
  }

After ingestion, append the section's items to data/products.js manually
(or ask Claude to generate the block from the PDF text).
"""
import sys, json, argparse, os
import numpy as np
import fitz  # pymupdf
from PIL import Image

def runs_of(ok, gap):
    rs = []
    for i, v in enumerate(ok):
        if v:
            if rs and i - rs[-1][1] <= gap: rs[-1][1] = i
            else: rs.append([i, i])
    return rs

def ingest(pdf, mapping, outdir, dpi=150):
    doc = fitz.open(pdf)
    tab = set(mapping.get("tab_pages", []))
    os.makedirs(outdir, exist_ok=True)
    written, problems = 0, []
    for pno_s, groups in mapping["pages"].items():
        pno = int(pno_s)
        pix = doc[pno].get_pixmap(dpi=dpi)
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        a = np.array(im.convert("L")); h, w = a.shape
        z = a[:, int(w*0.16):int(w*0.96)]
        dark = (z < 170).mean(axis=1)
        ys = [y for y in range(int(h*0.13), int(h*0.95)) if dark[y] > 0.8]
        grps = []
        for y in ys:
            if grps and y - grps[-1][-1] <= 3: grps[-1].append(y)
            else: grps.append([y])
        seps = [int(np.mean(g)) for g in grps if len(g) <= 5]
        bounds = [int(h*0.14)] + seps + [int(h*0.96)]
        bands = [(bounds[i]+3, bounds[i+1]-3) for i in range(len(bounds)-1)]
        if len(bands) != len(groups):
            problems.append(f"page {pno+1}: found {len(bands)} bands, expected {len(groups)} — adjust map or thresholds")
            continue
        x0 = int(w*0.17); x1 = int(w*(0.885 if pno in tab else 0.965))
        for grp, (y0, y1) in zip(groups, bands):
            crop = im.crop((x0, y0, x1, y1)); cw = crop.width
            mask = np.array(crop.convert("L")) < 195
            rowct = mask[:, int(cw*0.40):].sum(axis=1)
            rr = runs_of(rowct > 40, 28) or runs_of(rowct > 8, 28)
            if not rr:
                problems.append(f"empty crop: {grp}"); continue
            r0, r1 = max(rr, key=lambda r: rowct[r[0]:r[1]+1].sum())
            colct = mask[r0:r1+1, :].sum(axis=0)
            cr = runs_of(colct > 3, 50) or runs_of(colct > 0, 50)
            c0, c1 = max(cr, key=lambda r: colct[r[0]:r[1]+1].sum())
            pad = 6
            out = crop.crop((max(c0-pad,0), max(r0-pad,0), min(c1+pad,cw), min(r1+pad,crop.height)))
            for sku in grp.split("|"):
                out.save(os.path.join(outdir, f"{sku}.jpg"), quality=82)
                written += 1
    print(f"written: {written} images -> {outdir}")
    if problems:
        print("PROBLEMS:"); [print("  -", p) for p in problems]
        sys.exit(1)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--map", required=True)
    ap.add_argument("--out", default="assets/img/products")
    ap.add_argument("--dpi", type=int, default=150)
    a = ap.parse_args()
    ingest(a.pdf, json.load(open(a.map)), a.out, a.dpi)
