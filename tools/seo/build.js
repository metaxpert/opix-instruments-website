/* Opix Instruments — SEO build.
   Run:  node tools/seo/build.js
   Idempotent: safe to run after every content change, and it must be run after
   tools/regen.js because it is what puts the products into the served HTML. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SITE, SECTION_SEO, SPECIALTIES, CATEGORY_MIN_ITEMS } = require('./config.js');
const L = require('./lib.js');
const C = require('./chrome.js');
const catalog = require('./catalog.js');
const { DOWNLOADS } = require('./downloads.js');

const ROOT = L.ROOT;
const { SECTIONS, built, manifest } = C;
const M = {}; manifest.forEach(m => M[m.code] = m);
const TOTAL = Object.values(SECTIONS).reduce((a, s) => a + s.items.length, 0);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

/* ---------------------------------------------------------------- rewrite
   Swaps the generated regions of a hand-written page and leaves the editorial
   body alone.

   Every generated region is wrapped in <!--SEO:NAME--> … <!--/SEO:NAME--> and
   REPLACED, never appended. That is not cosmetic. The first version of this
   function did `h.replace('</main>', block + '</main>')`, which appends a fresh
   copy on every run, and matched the section index on `<nav class="secindex"`
   when the emitted markup is `class="secindex railpad"` — so that never matched
   either and also re-inserted each run. Thirteen builds put thirteen copies of
   both on the home page. Each pattern below therefore matches EITHER the marked
   region (every run after the first) OR the original hand-written markup (the
   first run), so the result is the same no matter how many times it runs. */
const region = (name, body) => `<!--SEO:${name}-->${body}<!--/SEO:${name}-->`;

function rewrite(file, { head, active, extraScripts = '', mainAppend = '' }) {
  let h = read(file);

  h = h.replace(/<head>[\s\S]*?<\/head>/, '<head>\n' + head + '\n</head>');

  // Header — marked region, or the original rail+header block.
  h = h.replace(
    /<!--SEO:HEADER-->[\s\S]*?<!--\/SEO:HEADER-->|<a class="skip"[\s\S]*?<\/header>|<div class="rail"[\s\S]*?<\/header>/,
    region('HEADER', C.header(active)));

  // Section index + footer — marked region, or the original bare <footer>.
  h = h.replace(
    /<!--SEO:FOOT-->[\s\S]*?<!--\/SEO:FOOT-->|<footer class="railpad">[\s\S]*?<\/footer>/,
    region('FOOT', C.sectionIndex() + '\n' + C.footer()));

  // Extra page content appended inside <main>. The optional group is what makes
  // this a replace rather than an append.
  if (mainAppend) {
    h = h.replace(/(?:<!--SEO:MAIN-->[\s\S]*?<!--\/SEO:MAIN-->\s*)?<\/main>/,
                  region('MAIN', '\n' + mainAppend + '\n') + '\n</main>');
  } else {
    h = h.replace(/<!--SEO:MAIN-->[\s\S]*?<!--\/SEO:MAIN-->\s*/g, '');
  }

  // Overlays — marked region, or the original hand-written block. Keeping this
  // generated means the inquiry drawer has one definition instead of seven
  // copies drifting apart in the hand-written pages.
  h = h.replace(
    /<!--SEO:OVERLAY-->[\s\S]*?<!--\/SEO:OVERLAY-->|<div class="(?:zoom" id="zoom|ovl" id="ovl)"[\s\S]*?<div class="toast" id="toast"><\/div>/,
    region('OVERLAY', C.overlays(false)));

  h = h.replace(/<script src="data\/products\.js"><\/script>\s*<script src="assets\/js\/site\.js"><\/script>/,
                `<script src="/assets/js/site.js?v=3" defer></script>${extraScripts}`);

  if (!/<main[^>]*id="main"/.test(h)) h = h.replace(/<main /, '<main id="main" ');
  return h;
}


/* The home and specialty section cards carried onerror="this.remove()" on every
   thumbnail — 56 inline handlers that forced 'unsafe-inline' into the CSP for
   script-src. We know at build time which photos exist, so resolve it here:
   drop the handler, drop the <img> entirely when the file is missing, and add
   intrinsic dimensions while we are in there. */
function fixSectionCardImages(h) {
  return h.replace(
    /<img src="(?:\/)?assets\/img\/products\/([^"]+)\.jpg" alt="([^"]*)"([^>]*?)>/g,
    (m, sku, alt, rest) => {
      if (!L.hasImage(sku)) return '';
      const [w, hh] = L.dims()[sku];
      // Emit a CANONICAL tag: strip every attribute this function manages and
      // re-add it, rather than appending to whatever is already there. The
      // first version stripped onerror/width/height but not decoding, so
      // decoding="async" accumulated once per build.
      const keep = rest
        .replace(/\s*(?:onerror|width|height|decoding|loading)="[^"]*"/g, '')
        .trim();
      // "Scissors instruments" describes nothing. Say what the photograph is.
      const a = /\binstruments$/.test(alt)
        ? `${alt.replace(/\s*instruments$/, '')} — surgical instruments manufactured by Opix Instruments, Sialkot`
        : alt;
      return `<img src="/assets/img/products/${sku}.jpg" alt="${a}" width="${w}" height="${hh}"`
           + ` decoding="async" loading="lazy"${keep ? ' ' + keep : ''}>`;
    });
}

/* ---------------------------------------------------------------- FAQ
   Real answers to the questions export buyers actually send. Doubles as the
   FAQPage structured data and as the text an AI answer engine can quote. */
const FAQ = [
  ["Are Opix Instruments ISO 13485 certified?",
   "Yes. Opix Instruments manufactures under an ISO 13485:2016 quality management system, carries CE marking for the European market and holds a US FDA establishment registration. Certificates are issued to buyers on request with every first order."],
  ["What is your minimum order quantity?",
   "MOQ is set per item and per finish, and is negotiable on mixed orders. Most catalogue instruments start at 10 pieces per reference; assembled sets and private-label runs are quoted individually. Send the catalogue numbers you need and we will confirm the MOQ with the quotation."],
  ["Do you supply OEM and private-label instruments?",
   "Yes. Opix runs private-label programmes for distributors and resellers — your brand name, logo and reference numbers laser-marked on the instrument, your artwork on the packaging, and your catalogue structure applied to the range. Tooling for custom patterns is quoted separately."],
  ["Which countries do you export to?",
   "Opix ships worldwide from Sialkot, Pakistan. Regular export markets include the United States, Germany, the United Kingdom, France, Italy, Spain, the Netherlands, Poland, the UAE, Saudi Arabia, Australia, Canada, Brazil and Turkey. Quotations are given on FOB or CIF terms."],
  ["What are your lead times?",
   "Stocked catalogue references typically ship in 2 to 4 weeks. Larger orders, assembled sets and private-label runs generally take 6 to 10 weeks depending on quantity and finish. Confirmed lead time is stated on every quotation."],
  ["Why are no prices shown on the website?",
   "Instrument pricing depends on quantity, finish, marking and delivery terms, so a published price would be wrong for almost every buyer. Add the references you need to an inquiry and our team returns a formal quotation — with MOQ, lead time and FOB or CIF pricing — within one working day."],
  ["What steel do you use?",
   "German-pattern surgical instruments are manufactured from martensitic stainless steels in the AISI 410, 420 and 440 families, selected by instrument type, with austenitic 304/316 used where corrosion resistance matters more than edge retention. Tungsten-carbide inserts are fitted on the TC scissors, forceps and needle-holder lines."],
  ["Can you supply complete surgical sets?",
   "Yes. Opix assembles procedure sets to a customer's own list — general surgery, ENT, orthopedic, dental, gynecology and specialty trays — supplied kitted and labelled. Send your set list with catalogue numbers or pattern names and we will quote it as a unit."],
];

function faqHTML() {
  return `<section class="sect" id="faq"><div class="wrap">
  <div class="eyebrow">Buyer FAQ</div>
  <h2>Questions we are asked before every first order</h2>
  <div class="faq">
${FAQ.map(([q, a]) => `    <details><summary>${L.esc(q)}</summary><p>${L.esc(a)}</p></details>`).join('\n')}
  </div>
</div></section>`;
}

/* ---------------------------------------------------------------- pages */
/* Extra home-page content, inserted inside <main> as a single managed region. */
function indexSections() {
  return `<section class="sect" id="who-we-supply"><div class="wrap">
  <div class="eyebrow">Who we supply</div>
  <h2>Four kinds of buyer, one manufacturing floor</h2>
  <div class="related"><div class="rlist" style="margin-top:4px">
    <a href="/contact.html"><b>Importers &amp; distributors</b>Container and part-container orders across the full ${TOTAL.toLocaleString()}-instrument range, quoted FOB Karachi or CIF to your port, with consolidated documentation.</a>
    <a href="/about.html#oem"><b>OEM &amp; private label</b>Your brand laser-marked on the instrument, your artwork on the packaging, your reference numbers applied across the catalogue.</a>
    <a href="/specialties.html"><b>Hospitals &amp; surgical centres</b>Procedure sets assembled to your own list — general surgery, ENT, orthopedic, dental and specialty trays, kitted and labelled.</a>
    <a href="/downloads.html"><b>Medical device resellers</b>Full PDF catalogues with photography and catalogue numbers you can drop straight into your own price list.</a>
  </div></div>
</div></section>

<section class="sect" id="quality"><div class="wrap">
  <div class="eyebrow">Quality &amp; compliance</div>
  <h2>What every export buyer checks first</h2>
  <p class="sub" style="max-width:820px">Every Opix instrument is forged, milled, heat-treated, hand-assembled and passivated in Sialkot, then inspected against pattern before packing. The quality system is certified to ISO 13485:2016; the range is CE marked for placement on the European market and the facility holds a US FDA establishment registration. Certificates, technical files and material declarations are issued with first orders — and to any buyer who asks before placing one.</p>
</div></section>

${faqHTML()}`;
}

function buildIndex() {
  const url = '/';
  const head = L.buildHead({
    url,
    fonts: ['archivo-800', 'inter-400'],   // the hero <h1> is Archivo 800
    title: 'Surgical Instruments Manufacturer & Exporter | Opix',
    desc: `ISO 13485, CE marked and FDA registered manufacturer of ${TOTAL.toLocaleString()} surgical, dental and orthopedic instruments in Sialkot, Pakistan. OEM and bulk export.`,
    schema: [
      L.orgSchema(),
      L.websiteSchema(),
      L.breadcrumbSchema([{ name: 'Home' }]),
      L.faqSchema(FAQ),
      {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": "Opix Instruments catalogue sections",
        "numberOfItems": built.length,
        "itemListElement": built.map((m, i) => ({
          "@type": "ListItem", "position": i + 1,
          "name": (SECTION_SEO[m.code] || {}).h1 || m.title,
          "url": L.abs(`/catalog-${m.code.toLowerCase()}.html`)
        }))
      },
    ],
  });

  let h = rewrite('index.html', { head, active: 'home', mainAppend: indexSections() });

  // Keyword-bearing but still human H1, and a lead paragraph that names the
  // four buyer types the site sells to.
  h = h.replace(/<h1>[\s\S]*?<\/h1>/,
    '<h1>Surgical, dental and orthopedic instruments, manufactured in Sialkot for hospitals worldwide.</h1>');
  h = h.replace(/<h1>([\s\S]*?)<\/h1>\s*<p>[\s\S]*?<\/p>/,
    `<h1>$1</h1>\n  <p>Opix Instruments manufactures and exports ${TOTAL.toLocaleString()} German-pattern surgical, dental and orthopedic instruments — from scalpel handles to complete operating-room sets — under an ISO 13485 quality system, CE marked and FDA establishment registered. We supply importers and distributors, hospitals and surgical centres, OEM private-label partners and medical device resellers in more than 40 countries.</p>`);

  // Give the section grid a stable anchor for the breadcrumb hub link.
  h = h.replace('<div class="eyebrow">Catalog Sections</div>',
                '<div class="eyebrow" id="sections">Catalog Sections</div>');

  // The hero used to send everyone to the Scalpels section; point it at the
  // catalogue hub so the strongest internal link on the site lands on the hub.
  h = h.replace('<a class="pri" href="catalog-sl.html">Browse the Catalog</a>',
                '<a class="pri" href="/catalog.html">Browse the full catalog</a>');



  write('index.html', fixSectionCardImages(h));
}

function buildStatic(file, active, spec, mutate, mainAppend) {
  const head = L.buildHead(spec);
  let h = rewrite(file, { head, active, extraScripts: spec.extraScripts || '', mainAppend });
  if (mutate) h = mutate(h);
  write(file, fixSectionCardImages(h));
}

/* The catalogue hub. The nav used to point at catalog-sl.html, which meant the
   word "catalog" had no page of its own and the breadcrumb had nowhere to go. */
function buildCatalogHub() {
  const url = '/catalog.html';
  const rows = built.map(m => {
    const seo = SECTION_SEO[m.code] || {};
    const sec = SECTIONS[m.code];
    const cats = Object.entries(sec.cats)
      .map(([k, label]) => [label, sec.items.filter(p => p[4] === k).length])
      .filter(([, n]) => n >= CATEGORY_MIN_ITEMS)
      .slice(0, 6)
      .map(([label]) => `<a href="/catalog-${m.code.toLowerCase()}-${L.slug(label)}.html">${L.esc(label)}</a>`)
      .join(' · ');
    return `  <section class="sect" style="padding:20px 0;border-bottom:1px solid var(--line)"><div class="wrap">
    <h2 style="font-size:19px"><a href="/catalog-${m.code.toLowerCase()}.html">${m.code} — ${L.esc(seo.h1 || m.title)}</a></h2>
    <p class="sub" style="margin-bottom:8px">${sec.items.length.toLocaleString()} catalogue numbers · ${L.esc(m.desc)}</p>
    ${cats ? `<p style="font-size:13px;color:var(--mist)">${cats}</p>` : ''}
  </div></section>`;
  }).join('\n');

  const head = L.buildHead({
    url,
    title: 'Surgical Instruments Catalog — 28 Sections | Opix Instruments',
    desc: `Full Opix Instruments catalog: ${TOTAL.toLocaleString()} surgical, dental and orthopedic instruments across ${built.length} sections with catalogue numbers, sizes and photos. Request a quote.`,
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Catalog' }]),
      L.collectionSchema({
        url, name: 'Surgical Instruments Catalog',
        desc: `The complete Opix Instruments catalogue — ${TOTAL.toLocaleString()} instruments in ${built.length} sections.`,
        count: TOTAL,
      }),
    ],
  });

  write('catalog.html', `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${C.header('catalog')}
<div class="pagehead railpad"><div class="ph">
  <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <b>Catalog</b></nav>
  <h1>Surgical Instruments Catalog</h1>
</div></div>
<main class="railpad" id="main">
<section class="sect" style="padding-bottom:8px"><div class="wrap">
  <div class="seo-intro">
    <p>The complete Opix Instruments programme — ${TOTAL.toLocaleString()} catalogue numbers across ${built.length} sections, every one manufactured in our own facility in Sialkot, Pakistan under an ISO 13485:2016 quality system, CE marked and FDA establishment registered.</p>
    <p>Each section below lists full catalogue numbers, working lengths and product photography. Prices are quoted rather than published: add the references you need to an inquiry and our team returns a formal FOB or CIF quotation, with MOQ and lead time, within one working day. Bulk, set-assembly and private-label programmes are quoted on the same terms.</p>
    <div class="facts"><span>${TOTAL.toLocaleString()} CATALOGUE NUMBERS</span><span>${built.length} SECTIONS</span><span>ISO 13485 · CE · FDA</span><span>WORLDWIDE EXPORT</span></div>
  </div>
</div></section>
${rows}
</main>
${C.overlays(false)}
${C.sectionIndex()}
${C.footer()}
<script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>
`);
}

/* ---------------------------------------------------------------- sitemaps */
/* <lastmod> that only moves when the page moved.

   Google treats lastmod as a crawl-scheduling hint and discounts it on a site
   where it is demonstrably wrong. Every build rewrites every catalogue page,
   so stamping today's date on all 317 URLs announced a site-wide change on
   every run — publishing one PDF claimed 9,720 products had been revised.

   The emitted file is hashed instead and the date kept in lastmod.json, so a
   URL's date moves only when that URL's bytes moved. Keep that file in git:
   delete it and every date resets to the day of the next build. */
const LASTMOD_CACHE = path.join(__dirname, 'lastmod.json');

function lastmodStamps(pages, today) {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(LASTMOD_CACHE, 'utf8')); } catch { /* first run */ }

  const next = {};
  for (const p of pages) {
    const file = p.url === '/' ? 'index.html' : p.url.replace(/^\//, '');
    let hash = null;
    try {
      hash = crypto.createHash('sha1')
        .update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
    } catch { /* nothing on disk — stamp today rather than invent a date */ }
    const was = prev[p.url];
    next[p.url] = { hash, date: (hash && was && was.hash === hash) ? was.date : today };
  }

  fs.writeFileSync(LASTMOD_CACHE, JSON.stringify(next, null, 1) + '\n');
  return url => (next[url] || {}).date || today;
}

function sitemaps(pages) {
  const today = new Date().toISOString().slice(0, 10);
  const lastmod = lastmodStamps(pages, today);
  const chunk = (a, n) => a.reduce((r, v, i) => (i % n ? r[r.length - 1].push(v) : r.push([v]), r), []);
  const newest = list => list.reduce((d, p) => (lastmod(p.url) > d ? lastmod(p.url) : d), '1970-01-01');

  const urlset = list => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${list.map(p => {
    const imgs = (p.images || []).slice(0, 40)
      .map(i => `\n    <image:image><image:loc>${L.abs(i.loc)}</image:loc><image:title>${L.esc(i.title)}</image:title></image:image>`).join('');
    return `  <url>\n    <loc>${L.abs(p.url)}</loc>\n    <lastmod>${lastmod(p.url)}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.pri}</priority>${imgs}\n  </url>`;
  }).join('\n')}
</urlset>
`;

  const core = pages.filter(p => p.group === 'core');
  const cat = pages.filter(p => p.group !== 'core');
  const parts = chunk(cat, 200);

  write('sitemap-pages.xml', urlset(core));
  parts.forEach((p, i) => write(`sitemap-catalog-${i + 1}.xml`, urlset(p)));

  const files = ['sitemap-pages.xml', ...parts.map((_, i) => `sitemap-catalog-${i + 1}.xml`)];
  const groups = [core, ...parts];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map((f, i) => `  <sitemap><loc>${L.abs('/' + f)}</loc><lastmod>${newest(groups[i])}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
  return { files, count: pages.length };
}

function robots() {
  write('robots.txt', `# Opix Instruments — https://www.opixinst.com
User-agent: *
Allow: /

# Tooling and source data are not content. They are already 404'd at the
# origin; this keeps them out of crawl logs entirely.
Disallow: /tools/
Disallow: /data/
Disallow: /deploy/
Disallow: /docs/

# Product photography is a genuine discovery surface for this catalogue —
# it must stay crawlable for Google Images.
User-agent: Googlebot-Image
Allow: /assets/img/

Sitemap: ${SITE.origin}/sitemap.xml
`);
}

function webmanifest() {
  write('site.webmanifest', JSON.stringify({
    name: SITE.name + ' — Surgical Instruments',
    short_name: 'Opix',
    description: 'ISO 13485 manufacturer and exporter of surgical, dental and orthopedic instruments.',
    start_url: '/',
    display: 'browser',
    background_color: '#F5F7F9',
    theme_color: SITE.themeColor,
    icons: [
      { src: '/assets/img/brand/favicon.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/img/brand/opix-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }, null, 2) + '\n');
}

/* ---------------------------------------------------------------- run */
function main() {
  const pages = [];
  const push = (url, pri, freq, group, images) => pages.push({ url, pri, freq, group, images });

  buildIndex();
  buildCatalogHub();

  buildStatic('specialties.html', 'specialties', {
    url: '/specialties.html',
    title: 'Surgical Instruments by Specialty — Shop by Procedure | Opix',
    desc: 'Browse surgical instruments by specialty — general surgery, ENT, cardiovascular, ophthalmic, neurosurgery, orthopedic, gynecology, dental and dermatology sets.',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Shop by Specialty' }]),
      L.collectionSchema({ url: '/specialties.html', name: 'Surgical instruments by specialty',
        desc: 'The Opix range grouped by surgical specialty and procedure.', count: SPECIALTIES.length }),
    ],
  });

  buildStatic('downloads.html', 'downloads', {
    url: '/downloads.html',
    title: 'Surgical Instrument Catalogs — Free PDF Downloads | Opix',
    desc: 'Download the full Opix Instruments PDF catalogs — scalpels, scissors, forceps, retractors, bone surgery, cardiovascular, neurosurgery, ophthalmic and dental.',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Catalog Downloads' }]),
      // One DigitalDocument per PDF that is actually on disk, pointing at the
      // PDF itself. It used to point at /catalog-<code>.html while still
      // claiming encodingFormat application/pdf — an HTML page described as a
      // PDF — and was built from the manifest, so it would have listed a
      // catalogue whose file had not been produced yet.
      {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": "Opix Instruments PDF catalogs",
        "numberOfItems": DOWNLOADS.length,
        "itemListElement": DOWNLOADS.map((d, i) => ({
          "@type": "ListItem", "position": i + 1,
          "item": {
            "@type": "DigitalDocument",
            "name": `${d.title} — Opix Instruments catalog`,
            "description": `${d.pages}-page PDF catalogue of the Opix ${d.title} range, with catalogue numbers, sizes and product photographs.`,
            "url": L.abs('/' + d.file),
            "encodingFormat": "application/pdf",
            "inLanguage": "en",
            "isPartOf": L.siteRef(),
            "about": { "@type": "Thing", "name": M[d.code] ? M[d.code].title : d.title },
            "publisher": L.orgRef()
          }
        }))
      },
    ],
  });

  buildStatic('about.html', 'about', {
    url: '/about.html',
    title: 'About Opix Instruments — ISO 13485 Manufacturer, Sialkot',
    desc: 'Opix Instruments: ISO 13485 certified, CE marked and FDA registered surgical instrument manufacturer in Sialkot, Pakistan. OEM and private-label capability.',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'About & Quality' }]),
      { "@context": "https://schema.org", "@type": "AboutPage",
        "url": L.abs('/about.html'), "mainEntity": L.orgRef(),
        "isPartOf": L.siteRef() },
      L.orgSchema(),
      L.faqSchema(FAQ),
    ],
  }, h => h.replace(
       // The (?![^>]*\bid=) guard is what makes this idempotent: without it the
       // capture group swallows the id added by the previous run and a second
       // one is prepended each time. Footers link to /about.html#oem sitewide.
       /<h2(?![^>]*\bid=)([^>]*)>(\s*OEM\b[^<]*)<\/h2>/i,
       '<h2 id="oem"$1>$2</h2>'),
     faqHTML());

  buildStatic('contact.html', 'contact', {
    url: '/contact.html',
    title: 'Contact Opix Instruments — Request a Quotation | Sialkot',
    desc: 'Request a quotation for surgical, dental or orthopedic instruments. Email or WhatsApp Opix Instruments, Sialkot, Pakistan. Formal quote within one working day.',
    extraScripts: '\n<script src="/assets/js/contact.js?v=1" defer></script>',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Contact / RFQ' }]),
      { "@context": "https://schema.org", "@type": "ContactPage",
        "url": L.abs('/contact.html'), "isPartOf": L.siteRef(),
        "mainEntity": L.orgRef() },
      {
        "@context": "https://schema.org", "@type": "LocalBusiness",
        "@id": SITE.origin + "/#localbusiness",
        "parentOrganization": L.orgRef(),
        "name": SITE.name, "url": SITE.origin + "/",
        "image": L.abs(SITE.ogImage), "logo": L.abs(SITE.logo),
        "email": SITE.email, "telephone": SITE.phone,
        "priceRange": "$$",
        "address": { "@type": "PostalAddress", "streetAddress": SITE.street,
          "addressLocality": SITE.locality, "addressRegion": SITE.region,
          "postalCode": SITE.postal, "addressCountry": SITE.country },
        "geo": { "@type": "GeoCoordinates", "latitude": SITE.lat, "longitude": SITE.lon },
        "openingHoursSpecification": [{
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "09:00", "closes": "18:00"
        }],
        "areaServed": SITE.markets.map(m => ({ "@type": "Country", "name": m }))
      },
    ],
  }, h => h.replace(/<script>\s*document\.getElementById\("sendForm"\)[\s\S]*?<\/script>\s*/, ''));

  buildStatic('404.html', null, {
    url: '/404.html', noindex: true,
    title: 'Page not found — Opix Instruments',
    desc: 'That page does not exist. Browse the surgical instrument catalog or request a quotation.',
  });

  // Catalogue + category pages (this is what pre-renders the 9,720 products).
  const written = catalog.generate();

  /* ---- sitemap entries ---- */
  push('/', '1.0', 'weekly', 'core');
  push('/catalog.html', '0.9', 'weekly', 'core');
  push('/specialties.html', '0.8', 'monthly', 'core');
  push('/downloads.html', '0.7', 'monthly', 'core');
  push('/about.html', '0.6', 'yearly', 'core');
  push('/contact.html', '0.7', 'yearly', 'core');

  // The PDFs themselves. Google indexes PDFs and ranks them for the
  // "<specialty> instrument catalogue pdf" queries a buyer actually types;
  // until now the only route to 102 MB of catalogue was a single download
  // link on one page, and nothing in any sitemap.
  for (const d of DOWNLOADS) push('/' + d.file, '0.5', 'yearly', 'core');

  for (const w of written) {
    const sec = SECTIONS[w.code];
    // A handful of representative photos per page, so Google Images has an
    // explicit route into the catalogue photography.
    const imgs = sec.items.filter(p => L.hasImage(p[0])).slice(0, 12).map(p => ({
      loc: `/assets/img/products/${p[0]}.jpg`,
      title: `${p[1]}${p[2] && p[2] !== 'N/A' ? ', ' + p[2] : ''} — ${p[0]}`,
    }));
    push('/' + w.file, w.kind === 'section' ? '0.9' : '0.8', 'monthly', 'catalog', imgs);
  }

  const sm = sitemaps(pages);
  robots();
  webmanifest();

  const sections = written.filter(w => w.kind === 'section').length;
  const cats = written.filter(w => w.kind === 'category').length;
  console.log(`SEO build complete
  ${sections} section pages   (${TOTAL.toLocaleString()} products pre-rendered into HTML)
  ${cats} category pages
  6 core pages + 404
  ${sm.count} URLs across ${sm.files.length} sitemap files`);
}

main();
