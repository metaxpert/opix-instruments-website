# -*- coding: utf-8 -*-
"""Recover images for pages where band auto-detection mismatched the expected
group count. For each given page, split the content area into N equal bands
(N = number of groups in the map) and crop each band's instrument photo.

Usage: python recover.py <pdf> <map.json> <outdir> <page1,page2,...>
"""
import sys, json
import numpy as np
import pymupdf
from PIL import Image

pdf, mapf, outdir, pages_s = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
pages = [int(x) for x in pages_s.split(",") if x.strip()]
mapping = json.load(open(mapf, encoding="utf-8"))
doc = pymupdf.open(pdf)

def runs_of(ok, gap):
    rs = []
    for i, v in enumerate(ok):
        if v:
            if rs and i - rs[-1][1] <= gap:
                rs[-1][1] = i
            else:
                rs.append([i, i])
    return rs

def crop_band(im, y0, y1, w):
    x0 = int(w * 0.17); x1 = int(w * 0.965)
    crop = im.crop((x0, y0, x1, y1)); cw = crop.width
    mask = np.array(crop.convert("L")) < 195
    rowct = mask[:, int(cw * 0.40):].sum(axis=1)
    rr = runs_of(rowct > 40, 28) or runs_of(rowct > 8, 28)
    if not rr:
        return None
    r0, r1 = max(rr, key=lambda r: rowct[r[0]:r[1] + 1].sum())
    colct = mask[r0:r1 + 1, :].sum(axis=0)
    cr = runs_of(colct > 3, 50) or runs_of(colct > 0, 50)
    c0, c1 = max(cr, key=lambda r: colct[r[0]:r[1] + 1].sum())
    pad = 6
    return crop.crop((max(c0 - pad, 0), max(r0 - pad, 0), min(c1 + pad, cw), min(r1 + pad, crop.height)))

written = 0
for pno in pages:
    groups = mapping["pages"].get(str(pno))
    if not groups:
        print("no map entry for page", pno); continue
    pix = doc[pno].get_pixmap(dpi=150)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    h, w = pix.height, pix.width
    top, bot = int(h * 0.14), int(h * 0.96)
    n = len(groups)
    for i, grp in enumerate(groups):
        y0 = top + (bot - top) * i // n + 3
        y1 = top + (bot - top) * (i + 1) // n - 3
        out = crop_band(im, y0, y1, w)
        if out is None:
            print("empty band p%d band%d" % (pno, i)); continue
        for sku in grp.split("|"):
            out.save("%s/%s.jpg" % (outdir, sku), quality=82)
            written += 1
print("recovered images:", written)
