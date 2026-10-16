#!/usr/bin/env python3
"""Make the PDF catalogues searchable and link every product in them.

The catalogue PDFs are flat page images, so Ctrl+F finds nothing. This tool
adds an invisible OCR text layer to every page (the pages look identical) and
turns every catalogue number into a link to that product on the website. It
also writes the search index behind the website's catalogue viewer.

    ~/.local/opix-ocr/bin/python tools/ocr_catalogs.py            all catalogues
    ~/.local/opix-ocr/bin/python tools/ocr_catalogs.py SS DN      only these
    ~/.local/opix-ocr/bin/python tools/ocr_catalogs.py --index    rebuild index/links only

Needs PyMuPDF + RapidOCR (PP-OCRv5 English), in their own venv:
    python3 -m venv ~/.local/opix-ocr
    ~/.local/opix-ocr/bin/pip install pymupdf rapidocr onnxruntime

Inputs   downloads/_index.json, data/products.js (for the known catalogue numbers)
Cache    data/ocr/<CODE>/<page>.json   OCR result per page; delete to re-OCR
         data/ocr/<CODE>/_source.pdf   the original, un-OCR'd PDF (kept so
                                       re-runs never stack text layers)
Outputs  downloads/*.pdf               searchable, product numbers linked
         assets/catalog-index/<code>.json  text lines + boxes per page (viewer)
         data/pdf-index.json           SKU -> [catalogue, page] (website build)
"""
import json, os, re, shutil, subprocess, sys, time
from concurrent.futures import ProcessPoolExecutor

import pymupdf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OCR_DIR = os.path.join(ROOT, "data", "ocr")
IDX_DIR = os.path.join(ROOT, "assets", "catalog-index")
SITE = "https://www.opixinst.com"
DPI = 200
WORKERS = max(1, min(12, (os.cpu_count() or 4) // 3))

# OCR confusions seen on these catalogues, tried when a code is not an exact hit.
CONFUSE = {"5": "S", "S": "5", "0": "O", "O": "0", "1": "I", "I": "1", "8": "B", "B": "8", "2": "Z", "Z": "2", "6": "G", "G": "6", "L": "I"}  # L: lowercase l read for I ("Sl-14-100")
CODE_RE = re.compile(r"(?<![A-Z0-9])([A-Z0-9]{1,3}\s?-\s?[A-Z0-9]{1,4}(?:\s?-\s?[A-Z0-9]{1,4})?)(?![A-Z0-9])")


def known_skus():
    """SKU -> section code, read from data/products.js via node."""
    js = ("const {SECTIONS}=require(process.argv[1]);const o={};"
          "for(const [k,v] of Object.entries(SECTIONS))for(const it of v.items)o[it[0]]=k;"
          "process.stdout.write(JSON.stringify(o))")
    out = subprocess.run(["node", "-e", js, os.path.join(ROOT, "data", "products.js")], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def fix_code(raw, known):
    s = re.sub(r"\s", "", raw.upper())
    if s in known:
        return s
    # one or two single-character confusions, only if that lands on exactly one SKU
    cands = {s}
    for _ in range(2):
        nxt = set()
        for c in cands:
            for i, ch in enumerate(c):
                if ch in CONFUSE:
                    nxt.add(c[:i] + CONFUSE[ch] + c[i + 1:])
        cands |= nxt
    hits = {c for c in cands if c in known}
    return hits.pop() if len(hits) == 1 else None


# ------------------------------------------------------------------- OCR

_ENGINE = None


def _engine():
    global _ENGINE
    if _ENGINE is None:
        import logging
        from rapidocr import RapidOCR, LangRec, OCRVersion, ModelType
        logging.getLogger("RapidOCR").setLevel(logging.ERROR)
        _ENGINE = RapidOCR(params={"Rec.lang_type": LangRec.EN, "Rec.ocr_version": OCRVersion.PPOCRV5,
                                   "Rec.model_type": ModelType.MOBILE, "Global.log_level": "error",
                                   "EngineConfig.onnxruntime.intra_op_num_threads": 3})
    return _ENGINE


def ocr_page(job):
    """(pdf path, page no, cache path) -> cache path. Lines in PDF points."""
    src, pno, cache = job
    if os.path.exists(cache):
        return cache
    doc = pymupdf.open(src)
    page = doc[pno]
    pix = page.get_pixmap(dpi=DPI)
    import numpy as np
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img = img[:, :, :3]
    res = _engine()(img[:, :, ::-1].copy())
    sx, sy = page.rect.width / pix.width, page.rect.height / pix.height
    lines = []
    if res.boxes is not None:
        for box, txt, sc in zip(res.boxes, res.txts, res.scores):
            xs, ys = [p[0] for p in box], [p[1] for p in box]
            if not txt.strip() or sc < 0.5:
                continue
            lines.append([round(float(min(xs)) * sx, 1), round(float(min(ys)) * sy, 1), round(float(max(xs)) * sx, 1), round(float(max(ys)) * sy, 1), txt.strip(), round(float(sc), 3)])
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    tmp = cache + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"w": round(page.rect.width, 1), "h": round(page.rect.height, 1), "lines": lines}, f, separators=(",", ":"))
    os.replace(tmp, cache)
    return cache


def text_layer_lines(page):
    """For PDFs that already have real text: lines from the text layer."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = " ".join(s["text"] for s in l["spans"]).strip()
            if t:
                x0, y0, x1, y1 = l["bbox"]
                out.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), t, 1.0])
    return {"w": round(page.rect.width, 1), "h": round(page.rect.height, 1), "lines": out}


# -------------------------------------------------------------- assemble

def add_text(page, x0, y0, x1, y1, text):
    """Invisible text (render mode 3) stretched over the OCR box, so a
    viewer's search highlight lands on the printed words."""
    h = max(y1 - y0, 1)
    fs = h * 0.8
    tl = pymupdf.get_text_length(text, "helv", fs)
    if tl <= 0:
        return
    tw = pymupdf.TextWriter(page.rect)
    org = pymupdf.Point(x0, y1 - h * 0.22)
    tw.append(org, text, fontsize=fs)
    tw.write_text(page, render_mode=3, morph=(org, pymupdf.Matrix((x1 - x0) / tl, 1)))


def build_catalog(entry, known, only_index):
    code = entry["code"]
    pdf = os.path.join(ROOT, entry["file"])
    cdir = os.path.join(OCR_DIR, code)
    os.makedirs(cdir, exist_ok=True)
    source = os.path.join(cdir, "_source.pdf")
    if not os.path.exists(source):
        shutil.copy2(pdf, source)           # first run: keep the pristine original
    doc = pymupdf.open(source)
    native = sum(len(doc[i].get_text().split()) for i in range(min(3, len(doc)))) > 50

    pages = []
    if native:
        pages = [text_layer_lines(doc[i]) for i in range(len(doc))]
    else:
        jobs = [(source, i, os.path.join(cdir, f"{i + 1:04d}.json")) for i in range(len(doc))]
        todo = [j for j in jobs if not os.path.exists(j[2])]
        if todo and only_index:
            sys.exit(f"{code}: {len(todo)} pages not OCR'd yet — run without --index")
        if todo:
            t = time.time()
            with ProcessPoolExecutor(WORKERS) as ex:
                for n, _ in enumerate(ex.map(ocr_page, todo, chunksize=1), 1):
                    if n % 20 == 0 or n == len(todo):
                        print(f"  {code}: OCR {n}/{len(todo)} pages ({time.time() - t:.0f}s)", flush=True)
        pages = [json.load(open(j[2])) for j in jobs]

    # Correct catalogue numbers against the product list, collect hits.
    hits = []                               # (sku, page, x0, y0, x1, y1)
    for pno, pg in enumerate(pages):
        for ln in pg["lines"]:
            txt = ln[4]
            for m in list(CODE_RE.finditer(txt.upper()))[::-1]:
                sku = fix_code(m.group(1), known)
                if not sku:
                    continue
                txt = txt[:m.start()] + sku + txt[m.end():]
                # Box of just the code, by its share of the line's characters.
                a, b = m.start() / max(len(ln[4]), 1), min(1, (m.start() + len(sku)) / max(len(ln[4]), 1))
                w = ln[2] - ln[0]
                hits.append((sku, pno + 1, ln[0] + w * a, ln[1], ln[0] + w * b, ln[3]))
            ln[4] = txt

    # Write the PDF: text layer (scanned catalogues only) + product links.
    out = pymupdf.open(source)
    for pno, pg in enumerate(pages):
        page = out[pno]
        if not native:
            for x0, y0, x1, y1, txt, _ in pg["lines"]:
                add_text(page, x0, y0, x1, y1, txt)
    seen = set()
    for sku, pno, x0, y0, x1, y1 in hits:
        if (sku, pno) in seen:
            continue
        seen.add((sku, pno))
        sec = known[sku].lower()
        out[pno - 1].insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2),
                                  "uri": f"{SITE}/catalog-{sec}.html#{sku}"})
    out.set_metadata({**(out.metadata or {}), "title": f"Opix Instruments — {entry['title']} catalogue",
                      "author": "Opix Instruments", "subject": f"{entry['title']} — searchable catalogue with linked catalogue numbers",
                      "keywords": "surgical instruments, Opix Instruments, " + entry["title"], "producer": "Opix Instruments OCR (PP-OCRv5)"})
    tmp = pdf + ".tmp"
    out.save(tmp, garbage=3, deflate=True, use_objstms=1)
    os.replace(tmp, pdf)

    # Viewer index: per page, lines with boxes as 0..1 fractions.
    os.makedirs(IDX_DIR, exist_ok=True)
    idx = {"code": code, "title": entry["title"], "file": "/" + entry["file"], "pages": []}
    for pg in pages:
        W, H = pg["w"], pg["h"]
        idx["pages"].append([[round(l[0] / W, 4), round(l[1] / H, 4), round(l[2] / W, 4), round(l[3] / H, 4), l[4]] for l in pg["lines"]])
    with open(os.path.join(IDX_DIR, f"{code.lower()}.json"), "w") as f:
        json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
    return code, len(pages), native, hits, os.path.getsize(pdf)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only_index = "--index" in sys.argv
    entries = json.load(open(os.path.join(ROOT, "downloads", "_index.json")))
    if args:
        entries = [e for e in entries if e["code"] in {a.upper() for a in args}]
    known = known_skus()
    print(f"{len(known)} known catalogue numbers; {len(entries)} catalogue(s); {WORKERS} OCR workers")

    pidx_path = os.path.join(ROOT, "data", "pdf-index.json")
    pidx = json.load(open(pidx_path)) if os.path.exists(pidx_path) else {}
    for e in entries:
        t = time.time()
        code, n, native, hits, size = build_catalog(e, known, only_index)
        for k in [k for k, v in pidx.items() if v[0] == code]:
            del pidx[k]
        for sku, pno, *_ in hits:
            pidx.setdefault(sku, [code, pno])
        e["mb"] = round(size / 1048576, 1)
        print(f"{code}: {n} pages, {'text layer' if native else 'OCR'}, {len({h[0] for h in hits})} catalogue numbers linked, {e['mb']} MB, {time.time() - t:.0f}s", flush=True)

    with open(pidx_path, "w") as f:
        json.dump(dict(sorted(pidx.items())), f, separators=(",", ":"))
    full = json.load(open(os.path.join(ROOT, "downloads", "_index.json")))
    sizes = {e["code"]: e["mb"] for e in entries}
    for e in full:
        e["mb"] = sizes.get(e["code"], e["mb"])
    with open(os.path.join(ROOT, "downloads", "_index.json"), "w") as f:
        json.dump(full, f, indent=1, ensure_ascii=False)
        f.write("\n")
    have = len(set(pidx) & set(known))
    print(f"pdf-index: {have}/{len(known)} catalogue products located in a PDF")


if __name__ == "__main__":
    main()
