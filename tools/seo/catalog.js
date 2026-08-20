/* Generates the 28 catalogue section pages and every category landing page,
   with all products PRE-RENDERED into static HTML.

   Why pre-render: before this, the grid was built client-side from a 940 KB
   data file. Googlebot's renderer may or may not get to it, and even when it
   does the products live at no crawlable URL of their own — so 9,720 products
   generated zero long-tail impressions. Now every product name, catalogue
   number and size is in the served HTML, and every category has its own URL. */
const fs = require('fs');
const path = require('path');
const { SITE, SECTION_SEO, CAT_OPENERS, SPECIALTIES, CATEGORY_MIN_ITEMS } = require('./config.js');
const L = require('./lib.js');
const { header, footer, sectionIndex, overlays, built, SECTIONS } = require('./chrome.js');

const ROOT = L.ROOT;
const manifest = require(path.join(ROOT, 'tools', 'manifest.json'));
const M = {}; manifest.forEach(m => M[m.code] = m);

/* ---------- derived facts, used to make every page's copy different ---------- */
function sizeRange(items) {
  const cm = items.map(p => {
    const m = /([\d.]+)\s*cm/i.exec(p[3] || '');
    return m ? parseFloat(m[1]) : null;
  }).filter(n => n && n > 0 && n < 200);
  if (cm.length < 2) return null;
  const lo = Math.min(...cm), hi = Math.max(...cm);
  return lo === hi ? `${lo} cm` : `${lo} cm to ${hi} cm`;
}
function skuRange(items) {
  const s = items.map(p => p[0]).sort();
  return s.length > 1 ? `${s[0]}–${s[s.length - 1]}` : s[0];
}

/* Rotate opener templates by a stable hash so neighbouring category pages
   never share phrasing, but a rebuild produces byte-identical output. */
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function opener(key, vars) {
  return CAT_OPENERS[hash(key) % CAT_OPENERS.length]
    .replace('{n}', vars.n).replace('{cat}', vars.cat)
    .replace('{sec}', vars.sec).replace('{sizes}', vars.sizes);
}


/* Compose within a SERP budget instead of truncating: drop optional clauses
   from the tail until it fits. A description cut off mid-word by an ellipsis
   is a wasted snippet — the call to action is the part that must survive. */
function compose(parts, max) {
  const req = parts.filter(p => p.req).map(p => p.t);
  let out = req.join(' ');
  for (const p of parts) {
    if (p.req) continue;
    const idx = parts.indexOf(p);
    const trial = parts.filter(q => q.req || parts.indexOf(q) <= idx).map(q => q.t).join(' ');
    if (trial.length <= max) out = trial;
  }
  return out.replace(/\s+/g, ' ').trim();
}

function factChips(facts) {
  const chips = facts.filter(Boolean).map(f => `<span>${L.esc(f)}</span>`).join('');
  return chips ? `<div class="facts">${chips}</div>` : '';
}

/* ---------- category sidebar (real links, not JS buttons) ---------- */
function catNav(code, items, cats, activeCat) {
  const low = code.toLowerCase();
  const rows = [`<a class="cat${activeCat ? '' : ' on'}" href="/catalog-${low}.html"><span>All products</span><span class="n">${items.length}</span></a>`];
  for (const [key, label] of Object.entries(cats)) {
    const n = items.filter(p => p[4] === key).length;
    if (!n) continue;
    const url = n >= CATEGORY_MIN_ITEMS
      ? `/catalog-${low}-${L.slug(label)}.html`
      : `/catalog-${low}.html#cat-${L.slug(label)}`;
    rows.push(`<a class="cat${key === activeCat ? ' on' : ''}" href="${url}"${key === activeCat ? ' aria-current="page"' : ''}><span>${L.esc(label)}</span><span class="n">${n}</span></a>`);
  }
  // h2, not h3: it sits directly under the page h1 with no h2 before it, and a
  // heading level skipped is a heading level a screen reader reports as missing.
  return `<aside class="side"><h2>Categories</h2><nav class="cats" aria-label="Categories">${rows.join('')}</nav></aside>`;
}

/* ---------- related sections ---------- */
function relatedSections(code) {
  const group = SPECIALTIES.find(s => s.codes.includes(code));
  const sibs = new Set((group ? group.codes : []).filter(c => c !== code));
  // Top up from the manifest neighbours so every page gets a full row.
  const order = built.map(m => m.code);
  const i = order.indexOf(code);
  for (const off of [1, -1, 2, -2, 3]) {
    if (sibs.size >= 4) break;
    const c = order[(i + off + order.length) % order.length];
    if (c && c !== code) sibs.add(c);
  }
  const cards = [...sibs].slice(0, 4).map(c => {
    const seo = SECTION_SEO[c] || {};
    const n = SECTIONS[c].items.length;
    return `<a href="/catalog-${c.toLowerCase()}.html"><b>${L.esc(seo.h1 || M[c].title)}</b>${n.toLocaleString()} instruments · ${L.esc(M[c].desc.split(',')[0])}</a>`;
  }).join('');
  return `<section class="related"><h2>Related instrument ranges</h2><div class="rlist">${cards}</div></section>`;
}

function relatedTerms(terms) {
  if (!terms || !terms.length) return '';
  return `<section class="relterms"><h2>Related searches</h2><ul>${
    terms.map(t => `<li>${L.esc(t)}</li>`).join('')}</ul></section>`;
}

/* ---------- page shell ---------- */
function shell({ head, crumb, h1, aside, intro, searchHint, resultTitle, count, grid,
                 terms, related, anchors }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${header('catalog')}
<div class="pagehead railpad"><div class="ph">
  <nav class="crumb" aria-label="Breadcrumb">${crumb}</nav>
  <h1>${h1}</h1>
</div></div>
<main class="railpad" id="main"><div class="catmain">
  ${aside}
  <section>
    ${intro}
    <div class="searchbox">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Search by name, catalog # or size — e.g. ${L.attr(searchHint)}" aria-label="Search these instruments" autocomplete="off">
    </div>
    <div class="rhead"><h2 id="catTitle">${L.esc(resultTitle)}</h2><div class="meta" id="meta">${count} ITEM${count !== 1 ? 'S' : ''}</div></div>
    <div class="grid" id="grid" data-total="${count}">
${grid}
    </div>
    ${anchors || ''}
    ${terms}
    ${related}
  </section>
</div></main>
${overlays()}
${sectionIndex()}
${footer()}
<script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>
`;
}

/* Several category names legitimately appear in more than one section —
   "Bone Rongeurs" exists in Bone Surgery, Orthopedic and Dental, with different
   products under each. Left alone, those pages compete for the same query and
   Google picks one arbitrarily. Colliding labels therefore carry their section
   in the title, H1 and description; unique labels stay clean. */
const LABEL_SECTIONS = (() => {
  const m = {};
  for (const s of built) {
    for (const [, label] of Object.entries(SECTIONS[s.code].cats)) {
      (m[label] = m[label] || []).push(s.code);
    }
  }
  return m;
})();
const collides = label => (LABEL_SECTIONS[label] || []).length > 1;

/* ---------- SECTION PAGE ---------- */
function requireSEO(code) {
  const seo = SECTION_SEO[code];
  if (!seo) throw new Error(
    `No SECTION_SEO entry for section "${code}".\n` +
    `Add one to tools/seo/config.js with h1, title, desc, intro and terms, then rebuild.\n` +
    `Failing here is deliberate: a catalogue section shipped with no title and no\n` +
    `meta description is worse than one that is not published yet.`);
  return seo;
}

function buildSection(code) {
  const sec = SECTIONS[code];
  const seo = requireSEO(code);
  const man = M[code];
  const low = code.toLowerCase();
  const url = `/catalog-${low}.html`;
  const items = sec.items;
  const sizes = sizeRange(items);

  const crumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Catalog', url: '/catalog.html' },
    { name: `${code} — ${man.title}` },
  ];
  const crumb = `<a href="/">Home</a> / <a href="/catalog.html">Catalog</a> / <b>${code} — ${L.esc(man.title)}</b>`;

  const withPhoto = items.filter(p => L.hasImage(p[0])).length;
  const intro = `<div class="seo-intro">
      <p>${L.esc(seo.intro)}</p>
      <p>All ${items.length.toLocaleString()} references below carry their Opix catalogue number and working length. Prices are quoted, never published — send an inquiry and our team returns a formal FOB or CIF quotation, with MOQ and lead time, within one working day.</p>
      ${factChips([`${items.length.toLocaleString()} CATALOGUE NUMBERS`,
                   `${Object.keys(sec.cats).length} CATEGORIES`,
                   sizes ? `SIZES ${sizes.toUpperCase()}` : null,
                   `${withPhoto.toLocaleString()} PRODUCT PHOTOS`,
                   'ISO 13485 · CE · FDA'])}
    </div>`;

  // Small categories get an in-page anchor list so their keywords still exist
  // somewhere crawlable even though they do not earn their own URL.
  const small = Object.entries(sec.cats)
    .map(([k, label]) => [k, label, items.filter(p => p[4] === k).length])
    .filter(([, , n]) => n > 0 && n < CATEGORY_MIN_ITEMS);
  const anchors = small.length
    ? `<section class="relterms"><h2>Also in this section</h2><ul>${
        small.map(([k, label, n]) => `<li id="cat-${L.slug(label)}">${L.esc(label)} (${n})</li>`).join('')}</ul></section>`
    : '';

  const grid = items.map(p => '      ' + L.cardHTML(p, man.title)).join('\n');

  const head = L.buildHead({
    url, title: seo.title, desc: seo.desc, ogType: 'website',
    schema: [
      L.breadcrumbSchema(crumbItems),
      L.collectionSchema({ url, name: seo.h1, desc: seo.intro, count: items.length }),
      L.productListSchema(items, url, man.title),
    ],
  });

  return shell({
    head, crumb, h1: L.esc(seo.h1),
    aside: catNav(code, items, sec.cats, null),
    intro,
    searchHint: `${items[0][1]}, ${items[0][0]}`,
    resultTitle: 'All products',
    count: items.length,
    grid, anchors,
    terms: relatedTerms(seo.terms),
    related: relatedSections(code),
  });
}

/* ---------- CATEGORY PAGE ---------- */
function buildCategory(code, catKey, label) {
  const sec = SECTIONS[code];
  const seo = requireSEO(code);
  const man = M[code];
  const low = code.toLowerCase();
  const items = sec.items.filter(p => p[4] === catKey);
  const file = `catalog-${low}-${L.slug(label)}.html`;
  const url = '/' + file;
  const sizes = sizeRange(items);

  const crumb = `<a href="/">Home</a> / <a href="/catalog.html">Catalog</a> / `
    + `<a href="/catalog-${low}.html">${code} — ${L.esc(man.title)}</a> / <b>${L.esc(label)}</b>`;
  const crumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Catalog', url: '/catalog.html' },
    { name: `${code} — ${man.title}`, url: `/catalog-${low}.html` },
    { name: label },
  ];

  const dupe = collides(label);
  const heading = dupe ? `${label} — ${man.title}` : label;

  // Longest-fitting title variant, so nothing is ever cut off in the SERP.
  const variants = dupe ? [
    `${label} — ${man.title} | Opix Instruments`,
    `${label} — ${man.title} | Opix`,
    `${label} for ${man.title} | Opix`,
    `${code} ${label} — ${man.title}`,
  ] : [
    `${label} — Manufacturer & Supplier | Opix Instruments`,
    `${label} Manufacturer & Supplier | Opix`,
    `${label} — ${man.title} | Opix`,
    `${label} | Opix Instruments`,
  ];
  const title = variants.find(t => t.length <= 62) || variants[variants.length - 1].slice(0, 62);

  const desc = compose([
    { t: `${items.length} ${label.toLowerCase()} by Opix Instruments${sizes ? `, ${sizes}` : ''}.`, req: true },
    ...(dupe ? [{ t: `From the ${man.title} catalogue section.`, req: true }] : []),
    { t: 'ISO 13485, CE marked, FDA registered.' },
    ...(dupe ? [] : [{ t: `From the ${man.title} range.` }]),
    { t: 'Request bulk or OEM pricing.' },
  ], 158);

  const body = opener(code + catKey, {
    n: items.length, cat: label.toLowerCase(), sec: man.title, sizes: sizes || 'a full range of working lengths',
  });
  const intro = `<div class="seo-intro">
      <p>${L.esc(body)}</p>
      <p>Every reference below is listed with its Opix catalogue number${sizes ? ' and working length' : ''}. Add the sizes you need to an inquiry and we return a formal quotation — FOB or CIF, with MOQ and lead time — within one working day. Bulk, set-assembly and private-label programmes are quoted on the same terms.</p>
      ${factChips([`${items.length} CATALOGUE NUMBERS`, sizes ? `SIZES ${sizes.toUpperCase()}` : null,
                   `REF ${skuRange(items)}`, 'ISO 13485 · CE · FDA'])}
    </div>`;

  const grid = items.map(p => '      ' + L.cardHTML(p, label)).join('\n');

  const head = L.buildHead({
    url, title, desc, ogType: 'website',
    schema: [
      L.breadcrumbSchema(crumbItems),
      L.collectionSchema({ url, name: `${label} — ${man.title}`, desc: body, count: items.length }),
      L.productListSchema(items, url, label),
    ],
  });

  return {
    file,
    html: shell({
      head, crumb,
      h1: L.esc(heading),
      aside: catNav(code, sec.items, sec.cats, catKey),
      intro,
      searchHint: `${items[0][1]}, ${items[0][0]}`,
      resultTitle: label,          // shell() escapes it; escaping here too
                                   // rendered "Calipers &amp; Measuring Gauges"
      count: items.length,
      grid,
      terms: relatedTerms((seo.terms || []).slice(0, 4)),
      related: relatedSections(code),
    }),
  };
}

/* ---------- run ---------- */
/* Delete generated pages the build no longer produces. Without this, renaming
   or re-slugging a category leaves the old file on disk, still linked from
   nowhere but still reachable and indexable — a duplicate of the page that
   replaced it. Only files matching the generated naming scheme are removed;
   catalog.html and every hand-written page are left alone. */
function prune(keep) {
  const kept = new Set(keep);
  let removed = 0;
  for (const f of fs.readdirSync(ROOT)) {
    if (!/^catalog-[a-z]{2}(-[a-z0-9-]+)?\.html$/.test(f)) continue;
    if (kept.has(f)) continue;
    fs.unlinkSync(path.join(ROOT, f));
    console.log(`  pruned stale page: ${f}`);
    removed++;
  }
  return removed;
}

function generate() {
  const written = [];
  for (const m of built) {
    const f = `catalog-${m.code.toLowerCase()}.html`;
    fs.writeFileSync(path.join(ROOT, f), buildSection(m.code));
    written.push({ file: f, code: m.code, kind: 'section', count: SECTIONS[m.code].items.length });

    const sec = SECTIONS[m.code];
    for (const [key, label] of Object.entries(sec.cats)) {
      const n = sec.items.filter(p => p[4] === key).length;
      if (n < CATEGORY_MIN_ITEMS) continue;
      const out = buildCategory(m.code, key, label);
      fs.writeFileSync(path.join(ROOT, out.file), out.html);
      written.push({ file: out.file, code: m.code, kind: 'category', count: n });
    }
  }
  prune(written.map(w => w.file));
  return written;
}

module.exports = { generate, buildSection, buildCategory, sizeRange };
