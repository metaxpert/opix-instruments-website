# Website audit log

Full audit of www.opixinst.com, started 16 Oct 2026. Ten areas, one per
round; each round is fixed, rebuilt, checked (audit / verify / idempotency /
render / test) and pushed before the next starts.

## Needs your decision
_Items that are not clearly wrong, or that change what the business says.
Nothing here has been changed._

- **Prices printed in the Dental PDF.** Orthodontic pliers on pp.106–107
  show prices (e.g. "49.50"), while the website says no prices are published.
  Remove the prices from the PDF, or keep them?
- **"Lerche Dissecting Forcep" (FR-245-1).** Could be a misspelling of
  "Lerch"; the PDF prints "Lerche". Left as printed.

- **9 duplicate Scissors products.** SS-447, 493, 541, 547, 548, 554, 718,
  734 and 739 each exist as "-1" (what the PDF prints) and "-2" (the original
  import's misnumbering of the same row), with identical details.
  Recommendation: remove the nine "-2" entries.
- **Size contradictions printed in the PDFs** (the website copies them
  faithfully; which number is right needs the instrument measured):
  SL-6117 32 cm (13"), FR-238-1 13 cm (5 ¾"), FR-281-1 12 cm (3 ¾"),
  FR-291-1 15 cm (5"), AF-0201 25 cm (10 ¼"), AF-0216 14.5 cm (4 ¾"),
  AF-0368 18 cm (9 ¾"), TR-05-183/184 31 cm (21 ¼"), TR-05-194 22 cm (8"),
  TR-05-195 36 cm (8 ¼"), TR-05-198 36 cm (12 ¼"), OR-07-809 2.5 cm (8 ½"),
  CV-09-277 25 cm (10 ¾"), CV-09-304/305 12.5 cm (15"), NS-10-123..126
  40–70 cm all (11 ¾"), SI-14-174 23 cm (8"), SI-14-175 14 cm (5"),
  GY-16-218 26 cm (9 ½"), RH-19-280/281 9 cm (7 ½"), OM-20-157 10 cm (4 ¾"),
  and OR 11-01-0377, 0446, 0603–0605, 0609, 0850.
- **786-16741 "Key Rings / Nasal Specula".** The PDF prints this number; it
  breaks the 786-NNNN pattern (probably 786-1675). Left as printed.
- **82 products not printed in any PDF** (outside Orthopedic) — e.g. the 26
  "T" variants AF-0150T..0184T, DN trays 786-1125S/1131A/1132S/1137S/1139S,
  786-1531..1533, 786-1605..1654. They may come from another source list;
  full list in docs/catalog-pdf-verification.csv (status NOT IN PDF).

- **Orthopedic 11-01-0742, 11-01-0743A, 11-01-0743B.** Photos exist for
  these catalogue numbers but the products are missing from the website
  (0740, 0741, 0744… are there). Probably dropped by the original import;
  needs the orthopedic source catalogue to add them.

- **SIMAP membership certificate shown as "valid to 31 March 2026"** on
  the About page — that date has passed. Upload the renewed certificate
  (or say if the membership lapsed and the card should go).
- **"more than 40 countries"** (home page). Not verifiable from anything
  on the server; confirm the figure is current.

## Rounds

### 1 · Product data quality — done
Scanned all 9,936 products (name, description, size) for OCR junk, spacing,
repeated letters, stray symbols, and near-duplicate spellings of the same word.

Fixed (351 products):
- Misspellings: Striaght, Forcesps, Dellicate, Prostheties, Spcula, Ratcht,
  Uretheral, Anastomsis, Sperical, Cheeck, Catrilage, Covex, Apporximator,
  Tightner, Peeriodontal, Modifed, Sterum, Suppot, Seperator, Downards,
  Chargin, Facsciotomy, "Leaf Pring" → "Leaf Spring", "Sharpe/Blunt".
- Surgeon names standardised to the correct spelling: Smith-Petersen,
  Goligher, Middeldorpf, Schmieden, Denis-Browne, Charrière (Charriere),
  Halsey, Weingart, Volkmann, Hohmann, Dingman, Jaffe, Tydings, Crile-Wood,
  Crile-Murray, Verbrugge, Aufricht, Sedillot, Kevorkian, Kramer-Nevins,
  Mayo-Noble, Iwanson, Crane-Kaplan, Baumgartner, Zaufal-Jansen, Elschnig,
  Hepp-Scheidel, Blumenthal; Anusope/Anuscope → Anoscope; Biopod → Bipod;
  Vertibra → Vertebra; Ferrozill → Ferrozell.
- Formatting: stray space before commas (" ," → ",") across AF, RT, TS, SU,
  CV, OG, RH; "22 cm I 8 ¾"" → "22 cm / 8 ¾""; "20 .5cm" → "20.5 cm".
- Wrong size: 11-01-0747 "19 cm / 17 ½"" → "19 cm / 7 ½"".

Checked and deliberately left: Blount, Wies, Wagener, Hess, Le Cron,
Hirschman/Hirschmann (different instruments), "Moveable up to h" (musical
note H on tuning forks), Metzenbaum-Fino / -Fine (both used by the catalogue).

### 2 · Product data vs PDF — done
Fixed:
- Catalogue numbers the PDF prints malformed, corrected to the series
  format (photos renamed too): FR342-2 → FR-342-2, GY16-274 → GY-16-274,
  NS-10--472 → NS-10-472.
- 25 dental trays named "Made of 18/8 Stainless Steel" (a caption, not a
  name) → "Stainless Steel Impression Tray" / "Stainless Steel Instrument
  Tray" / "Impression Tray For Crown & Bridge Work", as headed in the PDF;
  "dimensions mm,288x187x29" → "dimensions 288x187x29 mm"; "16 instrument"
  → "16 instruments".
- Typos: DeBakey-Mosqutio → Mosquito, Noenatal → Neonatal; missing ° on
  "Angled 25/45/60" (SS-552, 554, 556, 558); "21. 5 cm", "11 .5cm".
- Two inch sizes entered wrongly last session: SS-734-1 → 10.5 cm (4 ¼"),
  SS-739-1 → 11 cm (4 ¼").

Reviewed and fine: all 19 "name differs" flags are the OCR reading a
sub-heading ("Single Ended", "Standard Blade") or a misread title
("Mini-Lambatesteotome"); the website names are correct.

### 3 · Product photos — done
- 9,936 products; every recorded image size matches its file; no broken or
  missing files referenced by any page (verify.js).
- 87 products had no photo (55 dental, 32 orthopedic). Cropped the dental
  ones from their PDF pages and kept the **31 that show the complete
  instrument and match the product** (scissors, skin hooks, retractors,
  elevators, carvers, tissue punches, extraction forceps, sterilisation
  trays). 22 dental crops were rejected as partial or ambiguous (zoomed
  retractor tips, blade fragments) — those products still show the
  placeholder. The 32 orthopedic ones have no source PDF on the server.
- ~960 photos are long thin strips (e.g. 612 x 35 px). These are long
  instruments at the PDF's own resolution — expected, not broken; higher
  resolution needs original photography.

### 4 · Facts and copy consistency — done
Extracted every count, certificate number, date, phone and email from all
344 pages and compared them with the data and the certificates.
- Consistent everywhere: the three phone numbers, info@opixinst.com, ISO
  SCS/QMS/2025050101 (to 9 May 2027), CE SCS/EC/2025050102, SCCI A-82677,
  "28 sections", "29 PDF catalogues · 1,245 pages", per-section counts.
- Fixed: stale "9,720 instruments" on the 404 page, the Distributors page
  and the Specialties page; Specialties section/specialty totals were frozen
  at an old build (e.g. Dental 1,559 → 1,566). The build now rewrites these
  counts from the product data every time (liveCounts in tools/seo/build.js,
  distributors.js), so they cannot drift again. tools/gen_specialties.js is a
  legacy generator (Windows path, would overwrite the SEO head) — not used.

### 5 · Links, sitemaps, robots, canonicals, structured data — done
- Live crawl of every sitemap URL (374 site + 27 UDI): all 200, no redirects,
  no duplicates, every canonical self-referencing, nothing noindexed listed.
- robots.txt lists both sitemaps and blocks /tools/ /data/ /deploy/ /docs/.
- External links: one (WhatsApp, 200). All 9,092 product links inside the
  PDFs land on an existing product card.
- JSON-LD parses on every page (verify.js: 998 blocks) and on the UDI pages;
  sitemap lastmod range 2026-09-10 … 2026-10-16, none in the future.
- Fixed: UDI product page titles ran to ~78 characters; now kept within 60
  (drops the REF, then the long brand form). udi-master b8979f8.
