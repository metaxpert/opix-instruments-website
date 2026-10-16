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
