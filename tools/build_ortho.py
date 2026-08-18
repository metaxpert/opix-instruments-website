# -*- coding: utf-8 -*-
"""Build the Orthopedic (OR) section block from out_*.json
(page objects: {page, header, items:[{sku,name,desc,size}]}).
Categories derived from each page's banner header. Writes block.txt.
Usage: python build_ortho.py <CODE> "<Title>" <json_dir>
"""
import sys, json, glob, io, re
from collections import Counter, OrderedDict

CODE, TITLE, JDIR = sys.argv[1], sys.argv[2], sys.argv[3]
BS = chr(92); DQ = chr(34)
def esc(s): return (s or "").replace(BS, BS + BS).replace(DQ, BS + DQ)
def clean(s): return " ".join((s or "").split()).strip()
def cat_of(h):
    h = clean(h)
    h = re.split(r"[(/]| - ", h)[0].strip()
    return h.title() if h.isupper() else h
def slug(s):
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    if s and s[0].isdigit(): s = "c_" + s
    return s or "other"

pages = []
for f in sorted(glob.glob(JDIR + "/out_*.json")):
    pages += json.load(open(f, encoding="utf-8"))
pages.sort(key=lambda p: p["page"])

cat_titles = OrderedDict()
items = []
seen = set()
last_key = "other"
for p in pages:
    ct = cat_of(p.get("header", ""))
    key = slug(ct) if ct else last_key
    if ct and key not in cat_titles:
        cat_titles[key] = ct
    if ct:
        last_key = key
    else:
        key = last_key
    for it in p.get("items", []):
        sku = clean(it.get("sku", "")).upper()
        if not sku or sku in seen:
            continue
        seen.add(sku)
        name = clean(it.get("name", "")) or "Orthopedic Instrument"
        desc = clean(it.get("desc", ""))
        size = clean(it.get("size", "")) or "N/A"
        items.append([sku, name, desc, size, key])

cc = Counter(it[4] for it in items)
cats_used = [(k, cat_titles.get(k, k)) for k in cat_titles if cc.get(k, 0) > 0]

buf = io.StringIO()
buf.write('  "%s": {\n' % CODE)
buf.write('    title: "%s",\n' % esc(TITLE))
buf.write('    cats: {\n')
buf.write(",\n".join('      %s:"%s"' % (k, esc(v)) for k, v in cats_used) + "\n")
buf.write('    },\n    items: [\n')
rows = []
for sku, name, desc, size, cat in items:
    rows.append('["%s","%s","%s","%s","%s"]' % (esc(sku), esc(name), esc(desc), esc(size), cat))
buf.write(",\n".join(rows) + "\n    ]\n  }")
open(JDIR + "/block.txt", "w", encoding="utf-8").write(buf.getvalue())

print("CODE=%s items=%d cats=%d" % (CODE, len(items), len(cats_used)))
print("cats:", [(k, cc[k]) for k, _ in cats_used])
