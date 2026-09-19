/* Procedure-set pages: /sets/<slug>.html plus the /sets/ index.

   These URLs are not a choice. The Procedure Sets PDF is already in buyers'
   hands with a link on every set heading, and those links pointed at pages
   that did not exist — a buyer reading the catalogue hit the 404 page at the
   exact moment they were interested enough to click. data/sets.json carries
   the slug straight out of the PDF's own link annotations, so the two cannot
   disagree.

   Content comes from the PDF via tools/parse_sets.py. Re-run that after any
   revision of the catalogue, then rebuild. */
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const { header, footer, sectionIndex, overlays, SECTIONS } = require('./chrome.js');
const { SITE } = require('./config.js');

const ROOT = L.ROOT;
const manifest = require(path.join(ROOT, 'tools', 'manifest.json'));
const M = {}; manifest.forEach(m => { M[m.code] = m; });

const SETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sets.json'), 'utf8'));
const PDF = '/downloads/opix-procedure-sets-catalogue.pdf';

/* The set catalogue numbers are their own scheme — of 335 distinct numbers
   only 9 collide with a product SKU — so a row must never link to a product
   anchor that would land on the wrong instrument or nothing at all. Every
   group prefix IS a real section code, so the link belongs on the group. */
const sectionLink = code => SECTIONS[code]
  ? `<a href="/catalog-${code.toLowerCase()}.html">${L.esc(M[code] ? M[code].title : code)}</a>`
  : L.esc(code);

function specTable(set) {
  const rows = set.specs
    .filter(([k]) => k !== 'Set number')
    .map(([k, v]) => `<div><dt>${L.esc(k)}</dt><dd>${L.esc(v)}</dd></div>`).join('');
  return `<dl class="setspec">${rows}</dl>`;
}

function statBar(set) {
  const s = set.stats || {};
  const cells = [
    [set.total, 'instruments'],
    [set.groups.length, 'instrument groups'],
    [s.references, 'catalog references'],
    [s.sections, 'catalog sections'],
  ].filter(([n]) => n);
  return `<div class="setstats">${cells.map(([n, l]) =>
    `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
}

function contents(set) {
  return set.groups.map(g => {
    const rows = g.rows.map(r => `<tr><td class="cat">${L.esc(r.cat)}</td><td>${L.esc(r.name)}</td>`
      + `<td class="size">${L.esc(r.size)}</td><td class="qty">${r.qty}</td></tr>`).join('');
    return `<section class="setgroup">
    <h3>${L.esc(g.label)} <span class="pcs">${g.pcs} pcs</span></h3>
    <p class="from">From ${g.codes.map(sectionLink).join(' · ')}</p>
    <div class="settable"><table>
      <thead><tr><th>Cat. No.</th><th>Instrument</th><th>Size</th><th class="qty">Qty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
  }).join('\n');
}

function setSchema(set, url) {
  const props = set.specs
    .filter(([k]) => ['Material', 'Finish', 'Container', 'Approx. weight', 'Reprocessing'].includes(k))
    .map(([k, v]) => ({ "@type": "PropertyValue", "name": k, "value": v }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${set.name} — ${set.code}`,
    "sku": set.code,
    "mpn": set.code,
    "category": "Surgical procedure sets",
    "description": L.clampDesc(set.intro, 300),
    "brand": { "@type": "Brand", "name": SITE.name },
    "manufacturer": L.orgRef(),
    "url": L.abs(url),
    "isRelatedTo": { "@type": "MedicalProcedure", "name": set.procedure },
    ...(props.length ? { "additionalProperty": props } : {}),
  };
}

/* Compose within the SERP budget instead of truncating, the way catalog.js
   does: offer variants longest-first and take the first that fits. Set names
   run from "D&C Set" to "Tonsillectomy & Adenoidectomy Set", so one fixed
   template either wastes the budget on the short names or gets machine-
   truncated on the long ones — and a description cut off mid-word by an
   ellipsis has thrown away its call to action. */
const fit = (variants, max) => variants.find(v => v.length <= max) || variants[variants.length - 1];

function buildSet(set, others) {
  const url = `/sets/${set.slug}.html`;
  const proc = set.procedure.toLowerCase();
  const title = fit([
    `${set.name} ${set.code} — ${set.total}-Instrument Set | Opix`,
    `${set.name} — ${set.code} | Opix`,
    `${set.name} ${set.code} | Opix`,
    `${set.name} | Opix`,
  ], 62);
  const desc = fit([
    `${set.name}: ${set.total} instruments in ${set.groups.length} groups for ${proc}, kitted in a sterilization tray with contents card. ISO 13485 manufacturer — request a quotation.`,
    `${set.name}: ${set.total} instruments in ${set.groups.length} groups for ${proc}, kitted in a sterilization tray. ISO 13485 manufacturer — request a quotation.`,
    `${set.name}: ${set.total} instruments for ${proc}, kitted in a sterilization tray. ISO 13485 manufacturer — request a quotation.`,
    `${set.name}: ${set.total} instruments for ${proc}. ISO 13485 manufacturer — request a quotation.`,
  ], 160);
  const crumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Catalog', url: '/catalog.html' },
    { name: 'Procedure Sets', url: '/sets/' },
    { name: set.name },
  ];

  const head = L.buildHead({
    url, title, desc, ogType: 'website',
    schema: [L.breadcrumbSchema(crumbItems), setSchema(set, url)],
  });

  const siblings = others.filter(o => o.code !== set.code).slice(0, 4).map(o =>
    `<a href="/sets/${o.slug}.html"><b>${L.esc(o.name)}</b>${o.total} instruments · ${L.esc(o.procedure)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${header('catalog')}
<div class="pagehead railpad"><div class="ph">
  <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/catalog.html">Catalog</a> / <a href="/sets/">Procedure Sets</a> / <b>${L.esc(set.name)}</b></nav>
  <h1>${L.esc(set.name)}</h1>
</div></div>
<main class="railpad" id="main"><div class="wrap">
  <section class="sect setmain">
    <p class="setkicker">${L.esc(set.code)} · ${L.esc(set.procedure)}</p>
    <p class="setintro">${L.esc(set.intro)}</p>
    ${statBar(set)}
    ${specTable(set)}
    <div class="setcta">
      <a class="pri" href="/contact.html">Request a quotation for this set</a>
      <a class="sec" href="${PDF}" target="_blank" rel="noopener">View the Procedure Sets catalogue (PDF)</a>
    </div>
    <h2>Set contents</h2>
    <p class="sub">Quantities are for one complete set. Any line may be increased, removed or exchanged for another pattern from the same catalog section — send us the amended list and we quote the set as a single unit.</p>
${contents(set)}
    <section class="related"><h2>Other procedure sets</h2><div class="rlist">${siblings}</div></section>
  </section>
</div></main>
${overlays(false)}
${sectionIndex()}
${footer()}
<script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>
`;
}

function buildIndex() {
  const url = '/sets/';
  const total = SETS.reduce((a, s) => a + s.total, 0);
  const title = `Surgical Procedure Sets — ${SETS.length} Instrument Trays | Opix`;
  const desc = `${SETS.length} ready-assembled surgical instrument sets — laparotomy, caesarean, `
    + `tonsillectomy, orthopedic, thoracotomy and cataract trays from an ISO 13485 manufacturer.`;

  const cards = SETS.map(s => `      <a class="setcard" href="/sets/${s.slug}.html">
        <span class="setcode">${L.esc(s.code)}</span>
        <b>${L.esc(s.name)}</b>
        <span class="setproc">${L.esc(s.procedure)}</span>
        <span class="setmeta">${s.total} instruments · ${s.groups.length} groups</span>
      </a>`).join('\n');

  const head = L.buildHead({
    url, title, desc, ogType: 'website',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Catalog', url: '/catalog.html' }, { name: 'Procedure Sets' }]),
      L.collectionSchema({ url, name: 'Surgical procedure sets', desc, count: SETS.length }),
      {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": "Opix procedure sets", "numberOfItems": SETS.length,
        "itemListElement": SETS.map((s, i) => ({
          "@type": "ListItem", "position": i + 1,
          "item": {
            "@type": "Product", "name": `${s.name} — ${s.code}`, "sku": s.code,
            "brand": { "@type": "Brand", "name": SITE.name },
            "manufacturer": L.orgRef(), "url": L.abs(`/sets/${s.slug}.html`)
          }
        }))
      },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${header('catalog')}
<div class="pagehead railpad"><div class="ph">
  <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/catalog.html">Catalog</a> / <b>Procedure Sets</b></nav>
  <h1>Surgical Procedure Sets</h1>
</div></div>
<main class="railpad" id="main"><div class="wrap">
  <section class="sect">
    <div class="seo-intro">
      <p>${SETS.length} ready-assembled instrument sets covering ${total.toLocaleString()} instrument places, from a 13-piece suture set to a 112-instrument major surgery tray. Each set is assembled from the Opix catalog, kitted in a perforated sterilization container with silicone mat and contents card, and quoted as a single unit.</p>
      <p>Every list below is a starting point. Lines can be added, removed or exchanged for another pattern from the same catalog section, and all sets are available in tungsten-carbide, economy and private-label configurations.</p>
      <p class="seo-dl"><a href="${PDF}" target="_blank" rel="noopener">View the Procedure Sets catalogue as PDF</a> — 72 pages, 3.2 MB, opens in your browser.</p>
    </div>
    <div class="setgrid">
${cards}
    </div>
  </section>
</div></main>
${overlays(false)}
${sectionIndex()}
${footer()}
<script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>
`;
}

function generate() {
  const dir = path.join(ROOT, 'sets');
  fs.mkdirSync(dir, { recursive: true });

  const written = [];
  fs.writeFileSync(path.join(dir, 'index.html'), buildIndex());
  written.push({ url: '/sets/', kind: 'index' });

  for (const s of SETS) {
    fs.writeFileSync(path.join(dir, `${s.slug}.html`), buildSet(s, SETS));
    written.push({ url: `/sets/${s.slug}.html`, kind: 'set' });
  }
  return written;
}

module.exports = { generate, SETS };
