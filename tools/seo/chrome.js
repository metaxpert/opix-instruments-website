/* Shared page chrome: header, footer, section index. Generated into every
   page so internal linking is identical sitewide and stays in one place. */
const path = require('path');
const { SITE, SECTION_SEO } = require('./config.js');
const { esc, attr } = require('./lib.js');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'tools', 'manifest.json'));
const { SECTIONS } = require(path.join(ROOT, 'data', 'products.js'));

const built = manifest.filter(m => SECTIONS[m.code] && SECTIONS[m.code].items.length);

const NAV = [
  ['index.html',      'Home',            'home'],
  ['catalog-sl.html', 'Catalog',         'catalog'],
  ['specialties.html','Specialties',     'specialties'],
  ['downloads.html',  'Downloads',       'downloads'],
  ['distributors.html','Distributors',   'distributors'],
  ['about.html',      'About &amp; Quality', 'about'],
  ['contact.html',    'Contact / RFQ',   'contact'],
];

function header(active) {
  const links = NAV.map(([href, label, key]) =>
    `<a href="/${href}"${key === active ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<div class="rail" aria-hidden="true"><div class="ticks"></div><div class="mm">MILLIMETERS</div></div>
<header class="railpad"><div class="hwrap">
  <a class="brand" href="/" aria-label="${attr(SITE.name)} — home"><img class="bmark" src="/assets/img/brand/opix-mark.png" alt="${attr(SITE.name)} logo" width="34" height="30"><b>OPIX</b><span>INSTRUMENTS</span></a>
  <button class="mobmenu" id="mobmenu" aria-label="Menu" aria-expanded="false">&#9776;</button>
  <nav class="main" aria-label="Main">${links}</nav>
  <button class="cartbtn" id="cartOpen" type="button">Inquiry <span class="count" id="cartCount">0</span></button>
</div></header>`;
}

/* Every page links to every catalogue section — this is what keeps all 28
   sections (and through them the 286 category pages) at crawl depth 1. */
function sectionIndex() {
  const items = built.map(m => {
    const seo = SECTION_SEO[m.code] || {};
    const n = SECTIONS[m.code].items.length;
    return `<li><a href="/catalog-${m.code.toLowerCase()}.html" title="${attr(seo.h1 || m.title)} — ${n} products"><b>${m.code}</b>${esc(m.title)}</a></li>`;
  }).join('');
  return `<nav class="secindex railpad" aria-label="All catalogue sections"><div class="siwrap">
  <h2>All instrument categories</h2>
  <ul>${items}</ul>
</div></nav>`;
}

/* The CE mark, built the way Regulation 765/2008 Annex II builds it: two
   letters on circles of equal diameter, each a 240° arc opening to the right,
   the E carrying a middle bar. Drawn rather than shipped as an image so it
   stays sharp at any size and inherits the surrounding colour. */
// Each letter is drawn as two 120° segments through the leftmost point rather
// than one 240° arc: a single large arc depends on the large-arc/sweep flag
// pair, and getting that pair wrong renders a mirrored "Ɔ" that still looks
// plausible in source. Two small arcs are unambiguous. The E's middle bar
// starts at the circle's left edge so it joins the stroke instead of floating.
const CE_MARK = '<svg class="cemark" viewBox="0 0 68 44" fill="none" stroke="currentColor" stroke-width="7.7" aria-hidden="true">'
  + '<path d="M27.1 8.66A15.4 15.4 0 0 0 4 22A15.4 15.4 0 0 0 27.1 35.34"/>'
  + '<path d="M60.1 8.66A15.4 15.4 0 0 0 37 22A15.4 15.4 0 0 0 60.1 35.34"/>'
  + '<path d="M37 22H62"/></svg>';

function markGlyph(m) {
  // Real artwork wins as soon as there is any (see SITE.marks in config.js).
  if (m.img) return `<img src="${m.img}" alt="${esc(m.name)}" loading="lazy" decoding="async">`;
  if (m.glyph === 'ce') return CE_MARK;
  return `<span class="marktype">${esc(m.glyph)}</span>`;
}

/* variant 'full' — home page, with the caption line.
   variant 'compact' — footer, name only. */
function marks(variant = 'full') {
  const items = (SITE.marks || []).map(m => `<li class="mark mark-${esc(m.id)}">`
    + `<span class="markglyph">${markGlyph(m)}</span>`
    + `<span class="marklabel"><b>${esc(m.name)}</b>`
    + (variant === 'full' ? `<span>${esc(m.sub)}</span>` : '')
    + `</span></li>`).join('');
  if (!items) return '';
  return `<ul class="marks${variant === 'compact' ? ' compact' : ''}" aria-label="Compliance and membership">${items}</ul>`;
}

function footer() {
  const year = 2026;
  return `<footer class="railpad"><div class="fwrap">
  <div><h3>${esc(SITE.name)}</h3>
    <a href="/about.html">Surgical, dental &amp; orthopedic instruments</a>
    <a href="/about.html">${esc(SITE.street)}, ${esc(SITE.locality)} ${esc(SITE.postal)}, ${esc(SITE.countryName)}</a>
    <a href="/about.html">ISO 13485 · CE · FDA registered</a></div>
  <div><h3>Top sections</h3>
    <a href="/catalog-ss.html">Surgical scissors</a>
    <a href="/catalog-af.html">Artery &amp; hemostatic forceps</a>
    <a href="/catalog-bs.html">Bone surgery instruments</a>
    <a href="/catalog-dn.html">Dental instruments</a>
    <a href="/catalog-or.html">Orthopedic instruments</a>
    <a href="/sets/">Procedure sets</a></div>
  <div><h3>Buyers</h3>
    <a href="/contact.html">Request a quotation</a>
    <a href="/downloads.html">Download PDF catalogs</a>
    <a href="/distributors.html">Become a distributor</a>
    <a href="/about.html#oem">OEM &amp; private label</a>
    <a href="/specialties.html">Shop by specialty</a></div>
  <div><h3>Contact</h3>
    <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
${(SITE.phones || [{ label: '', number: SITE.phone }]).map(p =>
    `    <a href="tel:${esc(p.number.replace(/[^+\d]/g, ''))}">${esc(p.number)}`
    + (p.label ? ` <span class="ftel">${esc(p.label)}</span>` : '') + `</a>`).join('\n')}
    <a href="https://wa.me/${SITE.whatsapp}" rel="noopener">WhatsApp Business</a></div>
</div>${marks('compact')}<div class="fbot">© ${year} ${esc(SITE.name)} — ${esc(SITE.tagline)}. All catalog numbers and specifications subject to change.</div></footer>`;
}

/* Inquiry drawer + toast on every page; the zoom overlay only where there is a
   product grid to zoom, so the other pages do not carry markup nothing uses. */
function overlays(withZoom = true) {
  const zoom = withZoom
    ? `<div class="zoom" id="zoom"><div class="zin"><img id="zimg" alt=""><div class="zt" id="zt"></div><div class="zs" id="zs"></div></div></div>\n`
    : '';
  return `${zoom}<div class="ovl" id="ovl"></div>
<aside class="drawer" id="drawer" aria-label="Inquiry cart">
  <div class="dhead"><h2>Your Inquiry</h2><button id="cartClose" type="button" aria-label="Close">&times;</button></div>
  <div class="ditems" id="ditems"></div>
  <div class="dfoot">
    <button class="send email" id="sendEmail" type="button">Send RFQ by Email</button>
    <button class="send wa" id="sendWa" type="button">Send RFQ on WhatsApp</button>
    <div class="dnote">No prices shown online — our team replies with a formal quotation within 24 hours.</div>
  </div>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

module.exports = { header, footer, marks, sectionIndex, overlays, built, manifest, SECTIONS, NAV };
