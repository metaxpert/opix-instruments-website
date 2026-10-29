# Website audit log

## Summary (16 Oct 2026)
Ten-area audit of www.opixinst.com and the UDI pages, every round rebuilt,
checked and pushed. Final re-check: site checks all pass (audit, verify,
idempotency, render, 57/57 tests); **0 accessibility violations** (axe, 16
page types × desktop/mobile); no layout defects at 360–1440 px; 14/14
end-to-end tests; all 401 sitemap URLs live at 200.

**Fixed**
- Product data: 351 products corrected (misspellings, surgeon names,
  spacing, units); 25 dental trays given real names; 3 malformed catalogue
  numbers; typos, degree signs and wrong inch sizes.
- PDFs: foreign branding removed (Suture pp.55–57 → Opix header/footer;
  Dental p.107 surgicalsources.com footer → Opix).
- Photos: 31 more products photographed from the PDFs (9,880 / 9,936).
- Copy: stale "9,720" totals and frozen Specialties counts — now computed
  from the data on every build.
- Accessibility: contrast to WCAG AA, accessible names, landmarks,
  keyboard-scrollable tables, underlined in-text links on UDI pages.
- Performance: UDI pages 279 KB → 54 KB image (mobile LCP 3.1 s → <1 s);
  catalogue viewer layout shift removed.
- Security: /deploy/ (server config) and the internal audit CSV were
  publicly downloadable — moved out of the web root; UDI login/admin/API
  now frame-protected with a CSP.
- SEO: UDI titles within 60 characters.

**Your action**
- Purge in Cloudflare: /docs/catalog-pdf-verification.csv (cached copy of a
  file that is no longer public), plus the Suture and Dental PDFs.
- Decide the items below.


Full audit of www.opixinst.com, started 16 Oct 2026. Ten areas, one per
round; each round is fixed, rebuilt, checked (audit / verify / idempotency /
render / test) and pushed before the next starts.

## Needs your decision
_Items that are not clearly wrong, or that change what the business says.
Nothing here has been changed._

- ~~**Prices printed in the Dental PDF.**~~ Resolved 22 Oct 2026: on your instruction,
  all 16 prices (786-001 to 786-016, pp.106–107) were painted out of the page images
  and the OCR text layer rebuilt. Original kept as `data/ocr/DN/_source-before-price-removal.pdf`.
- **"Lerche Dissecting Forcep" (FR-245-1).** Could be a misspelling of
  "Lerch"; the PDF prints "Lerche". Left as printed.

- ~~**9 duplicate Scissors products.**~~ Resolved 22 Oct 2026: on your instruction the
  nine "-2" entries (SS-447, 493, 541, 547, 548, 554, 718, 734, 739) and their photos
  were removed; the "-1" entries the PDF prints remain. Catalogue total now 9,927.
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
  full list in data/catalog-pdf-verification.csv (status NOT IN PDF).

- **Orthopedic 11-01-0742, 11-01-0743A, 11-01-0743B.** Photos exist for
  these catalogue numbers but the products are missing from the website
  (0740, 0741, 0744… are there). Probably dropped by the original import;
  needs the orthopedic source catalogue to add them.

- **SIMAP membership certificate shown as "valid to 31 March 2026"** on
  the About page — that date has passed. Upload the renewed certificate
  (or say if the membership lapsed and the card should go).
- **"more than 40 countries"** (home page). Not verifiable from anything
  on the server; confirm the figure is current.

- **UDI product images.** 24 of the 25 GTIN products in UDI Master have no
  photo, so the product register and their scan pages show "No image".
  Upload them in UDI Master → Product images (they then also feed GS1).

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

### 6 · Accessibility — done
axe-core (WCAG 2.0/2.1 A + AA + best practice) on 16 page types × desktop
and mobile, plus WCAG 2.2 target size on mobile. Before: 5 issue types,
~2,900 nodes. After: **0 violations**.
- Contrast: grey text 4.37:1 and blue links/buttons 3.7–3.94:1 → raised to
  ≥ 4.6:1 by a shade-deeper grey (#637281) and blue (#1675B3); same hues,
  the home banner keeps its pinned colours.
- Accessible names: the logo link and the "View in catalogue" button now
  expose their visible text (2,100+ nodes).
- Landmarks: page headings and the home banner are labelled regions; the
  WhatsApp button sits in its own labelled aside (site.js v4).
- Keyboard: scrollable instrument tables (sets, distributors) are focusable
  regions, each named after its own heading.
- UDI pages: in-text links underlined (they relied on colour alone).
- Tap targets: none below the WCAG 2.2 minimum on mobile.

### 7 · Layout at 360 / 390 / 768 / 1024 / 1280 / 1440 — done
16 page types × 6 widths (96 renders), automated + visual review.
- No sideways scroll, nothing off-screen, header single-row at every width,
  no clipped text (the only flags were screen-reader-only labels, hidden on
  purpose). Grids reflow 4 → 3 → 2 → 1 cleanly; category strip scrolls on
  phones; forms stack; drawer and viewer fit.
- No changes needed. Noted, not changed: on tablets (768 px) the original
  home banner's four buttons wrap 3 + 1 — kept as the approved design.

### 8 · Performance — done
Measured live through Cloudflare, cache disabled, desktop and throttled
mobile 4G, 11 page types.
- Main content (LCP): 0.28–0.44 s desktop, 0.62–0.81 s mobile 4G.
  Layout shift ≈ 0 everywhere. HTML and text assets served brotli/gzip.
- Caching correct per type: HTML no-cache (edits go live at once); photos
  and fonts 1 year immutable; CSS/JS 7 days, versioned (?v=); PDFs 30 days.
- Fixed: UDI product pages loaded the 2,000 px GS1 master image to show it
  at ~600 px (mobile LCP 3.1 s). They now use display copies
  (/udi/img/<GTIN>-800.jpg, -400 for the register): 279 KB → 54 KB / 13 KB.
  The GS1 image URL is unchanged. (udi-master)
- Fixed: catalogue viewer layout shift 0.15 → 0.00 desktop / 0.097 mobile
  by reserving the PDF page's space before it draws (site.css v23).
- Left: /assets/catalog-index/*.json has no Cache-Control header (served
  fresh each time); adding one needs an nginx change, which this audit
  does not touch. Impact is small (gzip, ~1 MB only on the viewer).

### 9 · UDI pages, scanner, catalogue viewer, search — done
End-to-end tests (live site, headless Chromium), all passing:
- id.opixinst.com: /01/<GTIN> and /01/…/10/<lot>/21/<serial>?17= → 307 to
  the product page with path and query intact; /gtin/ alias; / → scanner.
- All 25 UDI product pages 200; unknown GTIN and bad check digit → friendly
  404; ?linkType=all → GS1 linkset JSON; register, scanner, sitemap 200;
  admin requires login (303 → login; API 401).
- Scanner: a photo of a GS1 DataMatrix (generated with the label
  generator's own encoder) opens /udi/01/05065028735001/10/L42/21/SN7?11=…;
  typed GTIN opens its page; wrong check digit rejected with a message.
- Viewer: SKU search across all catalogues highlights the product;
  next/previous page; name search within a catalogue; empty-result message;
  Downloads search box opens the viewer with the highlight.
- Catalogue pages: live search filters cards; Add to Inquiry updates the
  counter and the drawer; "View in catalogue" buttons on every located
  product (1,546 on the dental page).
No defects found.

### 10 · Security — done
- Probed for exposed files: .git, .github, source data, tools, Markdown docs,
  UDI data and path-traversal attempts (/udi/../data/users.json etc.) — all
  404; UDI API 401 without a session; bad login 401 (rate-limited).
- Fixed: **/deploy/ was public** (nginx.conf with the country-block setup,
  install.sh, systemd units) → moved to tools/deploy/ (tools/ is 404 at the
  origin); README, DEPLOY.md, OPERATIONS.md, SEO.md and install.sh updated.
- Fixed: **/docs/catalog-pdf-verification.csv was public** (internal audit
  data) → moved to data/ (404). Cloudflare still holds a cached copy for up
  to 4 h — purge https://www.opixinst.com/docs/catalog-pdf-verification.csv.
- Website headers on every type of page/asset: CSP (script-src 'self'),
  HSTS, X-Frame-Options, nosniff, Referrer-Policy, COOP, Permissions-Policy.
- Fixed: the UDI login/admin/API responses had no CSP or frame protection
  (clickjacking risk on the login form) → X-Frame-Options DENY and a strict
  default CSP on every private response (udi-master 20d8cf5). Session cookie
  is HttpOnly, Secure, SameSite=Strict.

## 29 Oct 2026 — Procedure-set catalogue numbers

The 20 procedure sets (695 lines) used an internal numbering scheme that did not
exist in the catalogue. Each line was matched to the real catalogue by
instrument, pattern and size, and the Procedure Sets PDF's Cat. No. column was
rewritten in place (original kept as `data/ocr/ST/_source-before-set-numbers.pdf`);
`data/sets.json` is re-read from the PDF, so the website and the PDF agree.

- 130 lines: exact catalogue number.
- 171 lines: nearest catalogue pattern, marked `*` (size or a detail differs).
- 57 lines: `—`, no stand-alone catalogue item (gallipots, trays, mats, suture
  scissors, and instruments not in the catalogue, or where the only candidate is
  a different pattern, e.g. curved for angled, straight for bayonet).
- Set pages link every number to its product card; a footnote explains `*` and `—`.
- Fixed: 21 lines whose instrument name sat in the Size column (parse_sets.py).

### Needs your decision
- The 57 `—` lines: add these products to the catalogue, or change the set contents.
- Matches judged nearest-size are listed in the agent notes; a hand review of the
  `*` lines against the instruments actually packed would confirm them.
