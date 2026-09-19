#!/usr/bin/env python3
"""Extract the procedure-set data out of the Procedure Sets catalogue PDF into
data/sets.json, which tools/seo/sets.js then renders into /sets/*.html.

The PDF is the source of truth and it ships to customers, so the website must
agree with it line for line. Parsing the PDF rather than retyping the 20 sets
is what keeps that true: regenerate after any new revision of the catalogue.

Slugs are read from the PDF's own link annotations, never derived. The PDF is
already in buyers' hands with those URLs printed into it -- deriving a slug
that differs by one character would 404 exactly the visitor who was reading
the catalogue.

Usage:  python3 tools/parse_sets.py
Needs:  pdftotext (poppler-utils)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "downloads" / "opix-procedure-sets-catalogue.pdf"
OUT = ROOT / "data" / "sets.json"

FOOTER = re.compile(r"Opix Instruments · (.+?) (SET-[A-Z]{2}-\d{3}) · Page (\d+) of (\d+)")
GROUP = re.compile(r"^([A-Z]{2}(?: · [A-Z]{2})*)\s{2,}(.+?)\s{2,}(\d+) pcs\s*$")
ROW = re.compile(r"^(\S+)\s{2,}(.+?)\s{2,}(\S[^\s].*?)\s{2,}(\d+)\s*$")
SPEC = re.compile(r"^ (\S.*?)\s{2,}(.+?)\s*$")
CONT = re.compile(r"^\s{30,}(\S.+?)\s*$")
STATS = re.compile(r"^\s*(\d+)\s{2,}(\d+)\s{2,}(\d+)\s{2,}(\d+)\s*$")
SUBTITLE = re.compile(r"^(.+?) · (\d+) instruments\s*$")


def slugs_from_pdf():
    """{'SET-GS-001': 'set-gs-001-major-surgery-set'} from the link annotations."""
    raw = subprocess.run(["strings", str(PDF)], capture_output=True, text=True).stdout
    out = {}
    for m in re.finditer(r"/URI \((\S*?)\)", raw):
        url = re.sub(r"\\(\d{3})", lambda o: chr(int(o.group(1), 8)), m.group(1))
        s = re.match(r"https://www\.opixinst\.com/sets/(set-([a-z]{2})-(\d{3})-[a-z0-9-]+)\.html", url)
        if s:
            out[f"SET-{s.group(2).upper()}-{s.group(3)}"] = s.group(1)
    return out


def text_pages():
    subprocess.run(["pdftotext", "-layout", str(PDF), "-"], check=True,
                   stdout=open("/dev/null", "w")) if False else None
    r = subprocess.run(["pdftotext", "-layout", str(PDF), "-"],
                       capture_output=True, text=True, check=True)
    return r.stdout.split("\f")


def strip_right_column(line, cut=88):
    """The intro paragraph shares its band with a right-hand caption. Anything
    past the gutter belongs to the caption, so cut there and trim."""
    return re.split(r"\s{3,}", line[:cut].rstrip())[0].strip()


def parse_set(pages, code, name):
    first = pages[0]
    lines = first.split("\n")

    procedure, total = "", 0
    intro_parts, specs, order = [], {}, []
    last_key = None

    for i, raw in enumerate(lines):
        m = SUBTITLE.match(raw.strip())
        if m and not procedure:
            procedure, total = m.group(1).strip(), int(m.group(2))
            # Intro runs from the next line until the spec table starts.
            for nxt in lines[i + 1:]:
                if SPEC.match(nxt) and nxt.startswith(" ") and not nxt.startswith("  "):
                    break
                t = strip_right_column(nxt)
                if t and not t.startswith("Tray layout"):
                    intro_parts.append(t)
            break

    for raw in lines:
        if raw.startswith(" ") and not raw.startswith("   "):
            m = SPEC.match(raw)
            if m:
                k, v = m.group(1).strip(), m.group(2).strip()
                if k in ("ISO 13485", "Set contents") or "pcs" in k:
                    continue
                specs[k] = v
                order.append(k)
                last_key = k
                continue
        m = CONT.match(raw)
        if m and last_key and last_key in specs:
            frag = m.group(1).strip()
            if frag and not frag.startswith("Instruments arranged") and "Page" not in frag:
                specs[last_key] += " " + frag

    # Contents pages are not consistently indented — some carry a leading space
    # on every line — so match against the stripped line, never the raw one.
    stats, groups, cur = {}, [], None
    for page in pages[1:]:
        for raw in page.split("\n"):
            line = raw.strip()
            if not line:
                continue
            if not stats:
                m = STATS.match(line)
                if m:
                    stats = {"instruments": int(m.group(1)), "groups": int(m.group(2)),
                             "references": int(m.group(3)), "sections": int(m.group(4))}
                    continue
            m = GROUP.match(line)
            if m:
                cur = {"codes": [c.strip() for c in m.group(1).split("·")],
                       "label": m.group(2).strip(), "pcs": int(m.group(3)), "rows": []}
                groups.append(cur)
                continue
            if line.startswith("Cat. No.") or line.startswith("Opix Instruments") or not cur:
                continue
            m = ROW.match(line)
            if m:
                cat, iname, size, qty = (g.strip() for g in m.groups())
                if cat.startswith("SET-") or "Page" in size:
                    continue
                cur["rows"].append({"cat": cat, "name": iname, "size": size, "qty": int(qty)})

    return {
        "code": code, "name": name, "procedure": procedure, "total": total,
        "intro": " ".join(intro_parts).strip(),
        "specs": [[k, specs[k]] for k in order if k in specs],
        "stats": stats, "groups": groups,
    }


def main():
    if not PDF.exists():
        sys.exit(f"missing {PDF}")
    slugs = slugs_from_pdf()
    pages = text_pages()

    buckets, meta = {}, {}
    for page in pages:
        m = FOOTER.search(page)
        if not m:
            continue
        name, code = m.group(1).strip(), m.group(2)
        buckets.setdefault(code, []).append(page)
        meta[code] = name

    sets = []
    for code, pgs in buckets.items():
        s = parse_set(pgs, code, meta[code])
        if code not in slugs:
            sys.exit(f"{code} has no link in the PDF — cannot guess its URL")
        s["slug"] = slugs[code]
        sets.append(s)

    problems = []
    for s in sets:
        counted = sum(r["qty"] for g in s["groups"] for r in g["rows"])
        if counted != s["total"]:
            problems.append(f"  {s['code']}: rows total {counted}, catalogue says {s['total']}")
        if s["stats"] and len(s["groups"]) != s["stats"]["groups"]:
            problems.append(f"  {s['code']}: {len(s['groups'])} groups parsed, "
                            f"catalogue says {s['stats']['groups']}")
        if not s["intro"]:
            problems.append(f"  {s['code']}: no intro text")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(sets, ensure_ascii=False, indent=1) + "\n")

    total = sum(s["total"] for s in sets)
    print(f"parsed {len(sets)} sets, {total} instrument places, "
          f"{sum(len(g['rows']) for s in sets for g in s['groups'])} catalogue lines -> {OUT.relative_to(ROOT)}")
    if problems:
        print("MISMATCHES against the catalogue's own totals:")
        print("\n".join(problems))
        sys.exit(1)
    print("every set's line quantities match the total printed in the PDF")


if __name__ == "__main__":
    main()
