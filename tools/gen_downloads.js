// Generate downloads.html ("Catalog Downloads") from downloads/_index.json
// (produced by batch_compress.py) + manifest + shared section logos.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');
const { iconSvg } = require('./card_assets.js');
const esc = s => (s || '').replace(/&/g, '&amp;');

const idx = JSON.parse(fs.readFileSync(SITE + '/downloads/_index.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync(SITE + '/tools/manifest.json', 'utf8'));
const order = {}; manifest.forEach((m, i) => order[m.code] = i);
idx.sort((a, b) => (order[a.code] ?? 99) - (order[b.code] ?? 99));

const totalMb = idx.reduce((a, x) => a + x.mb, 0);
const totalPages = idx.reduce((a, x) => a + x.pages, 0);

const cards = idx.map(x => `      <a class="dlcard" href="${x.file}" download>
        <span class="dlicon">${iconSvg(x.code)}</span>
        <span class="dltext"><b>${esc(x.title)}</b><span class="dlmeta">${x.pages} pages · ${x.mb} MB · PDF</span></span>
        <span class="dlbtn">Download<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/></svg></span>
      </a>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Catalog Downloads — PDF Instrument Catalogs | Opix Instruments</title>
<link rel="icon" type="image/png" href="assets/img/brand/favicon.png">
<meta name="description" content="Download Opix Instruments product catalogs as PDF — scalpels, scissors, forceps, retractors, bone surgery, cardiovascular, neurosurgery, ophthalmic, dental and the full surgical range.">
<link rel="canonical" href="https://www.opixinst.com/downloads.html">
<meta property="og:title" content="Catalog Downloads | Opix Instruments">
<meta property="og:description" content="Download the full Opix Instruments catalog range as PDF.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css?v=2">
</head>
<body>
<div class="rail" aria-hidden="true"><div class="ticks"></div><div class="mm">MILLIMETERS</div></div>
<header class="railpad"><div class="hwrap">
  <a class="brand" href="index.html"><img class="bmark" src="assets/img/brand/opix-mark.png" alt="Opix Instruments" width="34" height="30"><b>OPIX</b><span>INSTRUMENTS</span></a>
  <button class="mobmenu" id="mobmenu" aria-label="Menu">☰</button>
  <nav class="main"><a href="index.html" class="">Home</a><a href="catalog-sl.html" class="">Catalog</a><a href="specialties.html" class="">Specialties</a><a href="downloads.html" class="on">Downloads</a><a href="about.html" class="">About &amp; Quality</a><a href="contact.html" class="">Contact / RFQ</a></nav>
  <button class="cartbtn" id="cartOpen">Inquiry <span class="count" id="cartCount">0</span></button>
</div></header>
<div class="pagehead railpad"><div class="ph">
  <div class="crumb"><a href="index.html">Home</a> / <b>Catalog Downloads</b></div>
  <h1>Catalog Downloads</h1>
</div></div>
<main class="railpad">
<section class="sect"><div class="wrap">
  <div class="eyebrow">PDF Catalogs · ${idx.length} files</div>
  <h2>Download our catalogs</h2>
  <p class="sub">Web-optimized PDF editions of the full Opix Instruments range — ${totalPages.toLocaleString()} catalog pages across ${idx.length} downloadable catalogs. For high-resolution print masters or a combined catalog, <a href="contact.html">contact our team</a>.</p>
  <div class="dlgrid">
${cards}
  </div>
</div></section>
</main>
<div class="ovl" id="ovl"></div>
<aside class="drawer" id="drawer" aria-label="Inquiry cart">
  <div class="dhead"><h3>Your Inquiry</h3><button id="cartClose" aria-label="Close">&times;</button></div>
  <div class="ditems" id="ditems"></div>
  <div class="dfoot">
    <button class="send email" id="sendEmail">Send RFQ by Email</button>
    <button class="send wa" id="sendWa">Send RFQ on WhatsApp</button>
    <div class="dnote">No prices shown online — our team replies with a formal quotation within 24 hours.</div>
  </div>
</aside>
<div class="toast" id="toast"></div>
<footer class="railpad"><div class="fwrap">
  <div><h4>Opix Instruments</h4><a>Surgical &amp; Medical Instruments</a><a>Sialkot 51310, Pakistan</a></div>
  <div><h4>Catalog</h4><a href="specialties.html">Shop by Specialty</a><a href="downloads.html">Catalog Downloads</a><a href="index.html">All sections</a></div>
  <div><h4>Quality</h4><a href="about.html">ISO 13485</a><a href="about.html">CE Marking</a><a href="about.html">FDA Registered</a></div>
  <div><h4>Contact</h4><a href="mailto:info@opixinst.com">info@opixinst.com</a><a href="https://www.opixinst.com">www.opixinst.com</a></div>
</div><div class="fbot">© 2026 Opix Instruments — Crafted with Precision. All catalog numbers and specifications subject to change.</div></footer>
<script src="data/products.js"></script>
<script src="assets/js/site.js"></script>
</body></html>
`;
fs.writeFileSync(SITE + '/downloads.html', html);
console.log('wrote downloads.html —', idx.length, 'catalogs,', totalMb.toFixed(1), 'MB total');
