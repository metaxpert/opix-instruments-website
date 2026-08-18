# -*- coding: utf-8 -*-
"""Generic Opix catalog section builder.

Usage: python build_section.py <CODE> <TITLE> <json_dir>
Reads <json_dir>/out_*.json (list of page objects: {page, header, groups:[{name,desc,rows:[{sku,size}]}]}),
writes <json_dir>/block.txt (products.js section) and <json_dir>/map.json (ingest map).
Categories are auto-derived from the first clause of each page header.
"""
import json, glob, io, sys, re
from collections import Counter, OrderedDict

CODE, TITLE, JDIR = sys.argv[1], sys.argv[2], sys.argv[3]

BS = chr(92); DQ = chr(34)
def esc(s):
    s = s or ""
    return s.replace(BS, BS + BS).replace(DQ, BS + DQ)
def clean(s):
    return " ".join((s or "").split()).strip()
def slug(s):
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    if s and s[0].isdigit():
        s = "c_" + s
    return s or "other"

pages = []
for f in sorted(glob.glob(JDIR + "/out_*.json")):
    pages += json.load(open(f, encoding='utf-8'))
pages.sort(key=lambda p: p['page'])

# derive category title from header: first clause before a comma
def cat_title(header):
    h = clean(header)
    if not h:
        return "Other"
    return h.split(",")[0].strip()

cat_titles = OrderedDict()   # key -> title, first-seen order
items = []                   # [sku,name,desc,size,catkey]
seen = set()
mapping = {"tab_pages": [], "pages": {}}
problems = []
last_key = "other"
for p in pages:
    ct = cat_title(p.get('header', ''))
    key = slug(ct)
    if key not in cat_titles:
        cat_titles[key] = ct
    if clean(p.get('header', '')):
        last_key = key
    else:
        key = last_key
    pg_bands = []
    for g in p['groups']:
        name = clean(g.get('name', ''))
        desc = clean(g.get('desc', ''))
        band = []
        for r in g.get('rows', []):
            sku = clean(r.get('sku', '')).upper()
            size = clean(r.get('size', '')) or "N/A"
            if not sku:
                continue
            if sku in seen:
                problems.append("dup %s p%s" % (sku, p['page'])); continue
            seen.add(sku)
            items.append([sku, name, desc, size, key])
            band.append(sku)
        if band:
            pg_bands.append("|".join(band))
    if pg_bands:
        mapping["pages"][str(p['page'])] = pg_bands

# keep only categories that actually have items, in first-seen order
cc = Counter(it[4] for it in items)
cats_used = [(k, cat_titles[k]) for k in cat_titles if cc.get(k, 0) > 0]

buf = io.StringIO()
buf.write('  "%s": {\n' % CODE)
buf.write('    title: "%s",\n' % esc(TITLE))
buf.write('    cats: {\n')
buf.write(",\n".join('      %s:"%s"' % (k, esc(v)) for k, v in cats_used) + "\n")
buf.write('    },\n')
buf.write('    items: [\n')
rows = []
for sku, name, desc, size, cat in items:
    rows.append('["%s","%s","%s","%s","%s"]' % (esc(sku), esc(name), esc(desc), esc(size), cat))
buf.write(",\n".join(rows) + "\n")
buf.write('    ]\n  }')
open(JDIR + "/block.txt", "w", encoding="utf-8").write(buf.getvalue())
json.dump(mapping, open(JDIR + "/map.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("CODE=%s items=%d" % (CODE, len(items)))
print("cats:", [(k, cc[k]) for k, _ in cats_used])
print("map pages:", len(mapping['pages']), "problems:", len(problems))
for x in problems[:20]:
    print("  ", x)
