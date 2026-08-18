# -*- coding: utf-8 -*-
"""Extract orthopedic-catalog product photos using the PDF's own image
rectangles. Each product's caption (SKU text) is matched to the nearest image
directly above it in the same column; that image's rect is cropped from the
rendered page. Fully geometric — no OCR/vision needed.
Usage: python or_images.py <pdf> <outdir> <startPage> <endPage> [dpi]
"""
import sys, re
import pymupdf
from PIL import Image

PDF, OUT = sys.argv[1], sys.argv[2]
P0, P1 = int(sys.argv[3]), int(sys.argv[4])
DPI = int(sys.argv[5]) if len(sys.argv) > 5 else 150
sc = DPI / 72.0
doc = pymupdf.open(PDF)
SKU = re.compile(r'(11-\d\d-\d+[A-Za-z]?)')

written, missing = 0, []
seen = set()
for pno in range(P0, P1 + 1):
    p = doc[pno]; W, H = p.rect.width, p.rect.height
    pix = p.get_pixmap(dpi=DPI)
    page = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    caps = []
    for b in p.get_text("blocks"):
        x0, y0, x1, y1, txt, _, _ = b
        m = SKU.match(txt.strip())
        if m:
            caps.append((m.group(1), x0, x1, y0, y1))
    capboxes = [(x0, x1, y0, y1) for (_, x0, x1, y0, y1) in caps]
    def is_caption_img(r):
        # captions are ALSO embedded as images at the exact text position;
        # drop any image that substantially overlaps a caption text box.
        for (cx0, cx1, cy0, cy1) in capboxes:
            ix = min(r.x1, cx1) - max(r.x0, cx0)
            iy = min(r.y1, cy1) - max(r.y0, cy0)
            if ix > 0 and iy > 0:
                inter = ix * iy
                if inter > 0.4 * ((r.x1 - r.x0) * (r.y1 - r.y0)):
                    return True
        return False
    imgs = []
    for im in p.get_images(full=True):
        for r in p.get_image_rects(im[0]):
            w, h = r.x1 - r.x0, r.y1 - r.y0
            if w < 0.7 * W and r.y0 > 105 and w > 25 and h > 40 and not is_caption_img(r):
                imgs.append(r)
    for sku, cx0, cx1, cy0, cy1 in caps:
        sku = sku.upper()
        if sku in seen:
            continue
        seen.add(sku)
        ccx = (cx0 + cx1) / 2
        ccy = (cy0 + cy1) / 2
        col = [r for r in imgs if not (r.x1 < cx0 - 15 or r.x0 > cx1 + 15)]
        above = [r for r in col if r.y1 <= cy0 + 14]
        below = [r for r in col if r.y0 >= cy1 - 14]
        if above:                                   # photo directly above caption
            r = max(above, key=lambda r: r.y1)
        elif below:                                 # photo directly below caption
            r = min(below, key=lambda r: r.y0)
        elif col:                                   # any same-column image, nearest
            r = min(col, key=lambda r: abs((r.y0 + r.y1) / 2 - ccy))
        else:
            missing.append((pno, sku)); continue
        x0, y0, x1, y1 = r.x0 * sc, r.y0 * sc, r.x1 * sc, r.y1 * sc
        pad = 4
        crop = page.crop((max(x0 - pad, 0), max(y0 - pad, 0),
                          min(x1 + pad, page.width), min(y1 + pad, page.height)))
        if crop.width < 8 or crop.height < 8:
            missing.append((pno, sku)); continue
        crop.save("%s/%s.jpg" % (OUT, sku), quality=85)
        written += 1

print("written:", written, "captions_unpaired:", len(missing), "unique_skus:", len(seen))
for x in missing[:40]:
    print("  ", x)
