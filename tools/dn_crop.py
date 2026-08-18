# -*- coding: utf-8 -*-
"""Crop dental grid product photos using agent-provided boxes, refined with cv2.
Usage: python dn_crop.py <pdf> <json_dir> <outdir> [dpi]
Reads <json_dir>/out_*.json (page objects with items[{sku,box[0..1000]}]).
For each item: scale box to page pixels, expand, find the dominant instrument
blob inside, tight-crop, save <sku>.jpg. Records failures.
"""
import sys, json, glob, os
import numpy as np
import cv2
import pymupdf
from PIL import Image

PDF, JDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DPI = int(sys.argv[4]) if len(sys.argv) > 4 else 150
os.makedirs(OUT, exist_ok=True)
doc = pymupdf.open(PDF)

pages = []
for f in sorted(glob.glob(JDIR + "/out_*.json")):
    pages += json.load(open(f, encoding="utf-8"))

written, failed = 0, []
# cache rendered pages
cache = {}
def render(pno):
    if pno not in cache:
        pix = doc[pno].get_pixmap(dpi=DPI)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
        else:
            img = img[:, :, :3].copy()
        cache[pno] = img
    return cache[pno]

for p in pages:
    pno = p["page"]
    img = render(pno)
    H, W = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    for it in p.get("items", []):
        sku = (it.get("sku") or "").strip()
        box = it.get("box")
        if not sku or not box or len(box) != 4:
            failed.append((pno, sku, "nobox")); continue
        x0 = int(box[0] / 1000 * W); y0 = int(box[1] / 1000 * H)
        x1 = int(box[2] / 1000 * W); y1 = int(box[3] / 1000 * H)
        # tiny safety pad, then clamp inside the page
        x0, y0 = max(x0 - 2, 0), max(y0 - 2, 0)
        x1, y1 = min(x1 + 2, W), min(y1 + 2, H)
        if x1 - x0 < 6 or y1 - y0 < 6:
            failed.append((pno, sku, "badbox")); continue
        sub_rgb = img[y0:y1, x0:x1]
        sub = gray[y0:y1, x0:x1]
        Hs, Ws = sub.shape[:2]
        boxArea = Hs * Ws
        # Refine WITHIN the agent box only (never reach outside -> never grabs a
        # neighbour or page number). Largest dark blob = the instrument.
        mask = (sub < 205).astype(np.uint8) * 255
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        crop = sub_rgb  # fallback = the whole box (already the right instrument)
        if cnts:
            best, bestArea = None, 0
            for c in cnts:
                x, y, w, h = cv2.boundingRect(c)
                a = w * h
                if a > bestArea:
                    bestArea, best = a, (x, y, w, h)
            if best and bestArea >= 0.08 * boxArea:
                X0, Y0, X1, Y1 = best[0], best[1], best[0] + best[2], best[1] + best[3]
                for c in cnts:                          # union large overlapping parts
                    x, y, w, h = cv2.boundingRect(c)
                    if w * h < 0.30 * bestArea:
                        continue
                    if min(X1, x + w) - max(X0, x) > -6 and min(Y1, y + h) - max(Y0, y) > -6:
                        X0, Y0, X1, Y1 = min(X0, x), min(Y0, y), max(X1, x + w), max(Y1, y + h)
                pad = 5
                crop = sub_rgb[max(Y0 - pad, 0):min(Y1 + pad, Hs),
                               max(X0 - pad, 0):min(X1 + pad, Ws)]
        if crop.size == 0 or crop.shape[0] < 8 or crop.shape[1] < 8:
            crop = sub_rgb
        if crop.size == 0 or crop.shape[0] < 6 or crop.shape[1] < 6:
            failed.append((pno, sku, "tiny")); continue
        # reject near-blank crops (box landed on empty area / only faint watermark).
        cg = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
        if (cg < 150).mean() < 0.004:
            failed.append((pno, sku, "blank")); continue
        Image.fromarray(crop).save(os.path.join(OUT, sku + ".jpg"), quality=82)
        written += 1

print("written:", written, "failed:", len(failed))
for x in failed[:40]:
    print("  ", x)
