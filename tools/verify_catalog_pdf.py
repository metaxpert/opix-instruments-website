#!/usr/bin/env python3
"""Check the website's product data against what the PDF catalogues print.

For every product in data/products.js it looks up the page where
tools/ocr_catalogs.py found its catalogue number, reads that row of the
catalogue table and the heading above the table, and compares:

  number   the catalogue number is printed in the PDF at all
  size     the metric size on the row (13 cm, 2.0 mm …) equals the website's
  name     the table heading contains the website's product name

and, the other way round, catalogue-number-shaped codes printed in a PDF that
the website does not have.

    python3 tools/verify_catalog_pdf.py            writes docs/catalog-pdf-verification.csv
    python3 tools/verify_catalog_pdf.py --summary  counts only

Runs on the OCR output (assets/catalog-index/*.json), so a "mismatch" can be
an OCR misread rather than a data error — the CSV carries the text the PDF
row was read as, so each one can be judged at a glance, and the
catalogue viewer link opens the page with it highlighted.
"""
import csv, json, os, re, subprocess, sys
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IDX = os.path.join(ROOT, "assets", "catalog-index")
OUT = os.path.join(ROOT, "docs", "catalog-pdf-verification.csv")
SITE = "https://www.opixinst.com"
# Flags looked at against the PDF page and found to be OCR misreads of a
# correct website value. Add to this when a reviewed flag turns out the same.
CHECKED_OK = {
    "OP-11-237": "PDF prints Ø 9.0 mm (OCR read g.0)", "SL-6093": "PDF prints 21 cm (8 ¼\")",
    "SS-414-3": "PDF prints 16.5 cm (6 ½\")", "SS-911-1": "PDF prints 19 cm (7 ½\")",
    "TR-05-108": "PDF prints 14 cm (5 ½\")", "TR-05-174": "PDF prints Ø 180 mm, 2.5 mm",
    "TR-05-246": "PDF prints Ø 2.0 x 90 mm",
}
STOP = {"with", "and", "for", "the", "per", "set", "complete", "type", "pattern", "fig", "figs"}


def products():
    js = ("const {SECTIONS}=require(process.argv[1]);const o=[];"
          "for(const [k,v] of Object.entries(SECTIONS))for(const it of v.items)o.push([k,...it]);"
          "process.stdout.write(JSON.stringify(o))")
    out = subprocess.run(["node", "-e", js, os.path.join(ROOT, "data", "products.js")], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def compact(s):
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


METRIC = re.compile(r"(\d+(?:[.,]\d+)?)\s*(cm|mm)\b", re.I)


def metric(s):
    """First metric measurement as (value, unit) — the reliable part of a size;
    the inch fractions are where OCR struggles ('5 3%4"')."""
    m = METRIC.search(str(s or ""))
    return (float(m.group(1).replace(",", ".")), m.group(2).lower()) if m else None


FRAC = {"¼": .25, "½": .5, "¾": .75, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875}


def inches(s):
    """Inch value in parentheses — '(7 ½")', '(7 1/2")' — or None."""
    m = re.search(r"\(\s*(\d{1,2})\s*(?:([¼½¾⅛⅜⅝⅞])|(\d)\s*/\s*(\d{1,2}))?\s*[\"”″]", str(s or ""))
    if not m:
        return None
    v = float(m.group(1))
    if m.group(2):
        v += FRAC[m.group(2)]
    elif m.group(3) and m.group(4) and int(m.group(4)) in (2, 4, 8, 16) and int(m.group(3)) < int(m.group(4)):
        v += int(m.group(3)) / int(m.group(4))
    return v


def consistent(cm_val, unit, inch):
    """Does a metric size agree with its own inch figure (catalogues round)?"""
    if inch is None:
        return None
    cm_ = cm_val / 10 if unit == "mm" else cm_val
    return abs(cm_ - inch * 2.54) <= 0.8


WATERMARK = re.compile(r"\b\w*(?:STRUMENTS|UMENTS|MENTS)\b|\bOPIX\b", re.I)


def similar(w, text_words):
    import difflib
    return any(w == x or (len(w) >= 4 and difflib.SequenceMatcher(None, w, x).ratio() >= 0.8) for x in text_words)


def name_words(name):
    return [w for w in re.findall(r"[a-z]+", name.lower()) if len(w) >= 3 and w not in STOP]


def shape(sku):
    return re.sub(r"\d", "9", re.sub(r"[A-Z]", "A", sku))


def main():
    P = products()
    by_sku = {p[1]: p for p in P}
    pidx = json.load(open(os.path.join(ROOT, "data", "pdf-index.json")))
    cats = {}
    for f in os.listdir(IDX):
        if f.endswith(".json") and not f.startswith("_"):
            d = json.load(open(os.path.join(IDX, f)))
            cats[d["code"]] = d

    rows, stats = [], Counter()

    def add(status, sec, sku, name="", size="", page="", pdf_row="", heading="", note=""):
        stats[status] += 1
        at = pidx.get(sku)
        link = f"{SITE}/catalog-viewer.html?q={sku}&c={at[0].lower()}&p={at[1]}" if at else ""
        rows.append([status, sec, sku, name, size, page, pdf_row, heading, note, link])

    for sec, sku, name, desc, size, cat in P:
        at = pidx.get(sku)
        if not at or at[0] not in cats:
            add("NOT IN PDF", sec, sku, name, size, note="catalogue number not found in any PDF (not printed, or unreadable to OCR)")
            continue
        code, page = at
        lines = cats[code]["pages"][page - 1]
        csku = compact(sku)
        me = next((l for l in lines if csku in compact(l[4])), None)
        if me is None:
            add("NOT IN PDF", sec, sku, name, size, page, note="indexed page no longer contains the number")
            continue
        x0, y0, x1, y1, text = me
        h = y1 - y0
        cy = (y0 + y1) / 2
        # The row: the rest of this line, plus lines level with it to the right
        # (up to the next catalogue number in the same row, for 2-column tables).
        right = [l for l in lines if l is not me and abs((l[1] + l[3]) / 2 - cy) < h * 0.6 and l[0] > x0 and l[0] - x1 < 0.45]
        right.sort(key=lambda l: l[0])
        cut = []
        for l in right:
            if any(compact(s) in compact(l[4]) for s in _codes_in(l[4])):
                break
            cut.append(l[4])
        row_text = " ".join([text.split(sku)[-1].strip() if sku in text else ""] + cut).strip()

        # The heading: walk up the same column past the table header to the
        # first one-to-three lines of title text.
        col = [l for l in lines if l[3] <= y0 + 0.002 and abs(l[0] - x0) < 0.06]
        col.sort(key=lambda l: -l[3])
        head, seen_header = [], False
        for l in col:
            t = l[4].strip()
            if _codes_in(t) or re.fullmatch(r"[\d.,\s]+", t):
                if seen_header:
                    break
                continue
            if re.match(r"catalog", t, re.I):
                seen_header = True
                continue
            if seen_header:
                head.append(t)
                if len(head) == 3 or (y0 - l[3]) > 0.2:
                    break
        heading = " / ".join(reversed(head))

        notes, status = [], "OK"
        wm, pm = metric(size), metric(row_text)
        if wm and pm and wm != pm:
            # Is the PDF reading self-consistent (its cm matches its own inches)?
            # If not, it is almost certainly an OCR misread, not a data error.
            pc, wc = consistent(pm[0], pm[1], inches(row_text)), consistent(wm[0], wm[1], inches(size))
            if pc is False and wc is not False:
                notes.append(f"OCR misread: PDF row read as {pm[0]:g} {pm[1]}, which disagrees with its own inch size")
            elif pm[1] != wm[1]:
                notes.append(f"PDF row read as {pm[0]:g} {pm[1]} (different measurement, not compared)")
            else:
                status = "SIZE DIFFERS"
                notes.append(f"website {wm[0]:g} {wm[1]} vs PDF {pm[0]:g} {pm[1]}" + (" — PDF cm agrees with its inches" if pc else ""))
        elif wm and not pm:
            notes.append("size not readable on the PDF row")
        words = name_words(name)
        heading = WATERMARK.sub("", heading).strip(" /")
        # Product titles sit above a run of variant sub-tables ("Curved",
        # "Oval", "Smooth Shaft"), so judge the name against all title text in
        # the column above, not only the nearest heading.
        above = " ".join(WATERMARK.sub("", l[4]) for l in col if (y0 - l[3]) < 0.4 and not _codes_in(l[4]))
        if heading and words:
            ch = compact(heading + " " + above)
            hw = re.findall(r"[a-z]+", (heading + " " + above).lower())
            hit = sum(1 for w in words if w in ch or similar(w, hw))
            if hit / len(words) < 0.5:
                status = "NAME DIFFERS" if status == "OK" else status + " + NAME DIFFERS"
                notes.append(f"{hit}/{len(words)} name words in PDF heading")
        elif not heading:
            notes.append("no table heading found")
        if status != "OK" and sku in CHECKED_OK:
            status, notes = "OK", [f"checked by eye: OCR misread — {CHECKED_OK[sku]}"]
        add(status, sec, sku, name, size, page, row_text, heading, "; ".join(notes))

    # Codes printed in a PDF that look like this catalogue's numbers but are
    # not on the website.
    shapes = defaultdict(set)
    for sec, sku, *_ in P:
        shapes[sec].add(shape(sku))
    sec_of_code = {}
    for sku, (code, _) in pidx.items():
        if sku in by_sku:
            sec_of_code.setdefault(code, Counter())[by_sku[sku][0]] += 1
    for code, d in sorted(cats.items()):
        secs = [s for s, _ in sec_of_code.get(code, Counter()).most_common(2)]
        want = set().union(*(shapes[s] for s in secs)) if secs else set()
        extra = {}
        for pno, lines in enumerate(d["pages"], 1):
            for l in lines:
                for c in _codes_in(l[4]):
                    c2 = re.sub(r"\s", "", c.upper())
                    if c2 not in by_sku and shape(c2) in want:
                        extra.setdefault(c2, (pno, l[4]))
        for c, (pno, t) in sorted(extra.items()):
            stats["IN PDF, NOT ON WEBSITE"] += 1
            rows.append(["IN PDF, NOT ON WEBSITE", secs[0] if secs else "", c, "", "", pno, t, "", "printed in the PDF but no such product on the website (or an OCR misread)",
                         f"{SITE}/catalog-viewer.html?q={c}&c={code.lower()}&p={pno}"])

    order = {"SIZE DIFFERS": 0, "NAME DIFFERS": 1, "SIZE DIFFERS + NAME DIFFERS": 0, "NOT IN PDF": 2, "IN PDF, NOT ON WEBSITE": 3, "OK": 9}
    rows.sort(key=lambda r: (order.get(r[0], 5), r[1], r[2]))
    if "--summary" not in sys.argv:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["status", "section", "catalogue number", "website name", "website size", "pdf page", "pdf row (OCR)", "pdf heading (OCR)", "note", "open in viewer"])
            w.writerows(rows)
    total = len(P)
    print(f"{total} website products checked against {len(cats)} PDF catalogues")
    for k, v in sorted(stats.items(), key=lambda kv: -kv[1]):
        print(f"  {k:28s} {v}")
    if "--summary" not in sys.argv:
        print(f"report: {os.path.relpath(OUT, ROOT)}")


_CODE = re.compile(r"(?<![A-Za-z0-9])([A-Z0-9]{1,3}\s?-\s?[A-Z0-9]{1,4}(?:\s?-\s?[A-Z0-9]{1,4})?)(?![A-Za-z0-9])")


def _codes_in(t):
    return [m.group(1) for m in _CODE.finditer(t) if re.search(r"\d", m.group(1)) and re.search(r"-", m.group(1))]


if __name__ == "__main__":
    main()
