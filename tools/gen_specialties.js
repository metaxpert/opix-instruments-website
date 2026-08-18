// Generate specialties.html ("Shop by Specialty") from products.js + manifest.
// Groups the existing Opix catalog sections into procedure/specialty buckets.
const fs = require('fs');
const path = require('path');
const SITE = 'D:/Opix/opix-website/opix-site';
const manifest = JSON.parse(fs.readFileSync(SITE + '/tools/manifest.json', 'utf8'));
const { SECTIONS } = require(SITE + '/data/products.js');
const { sectionCard } = require('./card_assets.js');
const esc = s => s.replace(/&/g, '&amp;');
const M = {}; manifest.forEach(m => M[m.code] = m);

// specialty -> {title, blurb, codes[]}. Procedure specialties first,
// general functional buckets last.
const SPECIALTIES = [
  { key: 'ent', title: 'ENT — Ear, Nose & Throat',
    blurb: 'Otology, rhinology, tonsillectomy and tracheotomy instrument sets.',
    codes: ['OT', 'RH', 'TN', 'TR'] },
  { key: 'cvt', title: 'Cardiovascular & Thoracic',
    blurb: 'Instruments for thoracic, cardiac and vascular surgery.',
    codes: ['CV'] },
  { key: 'ophthalmic', title: 'Ophthalmic (Eye)',
    blurb: 'Micro-instruments for ophthalmic and eye surgery.',
    codes: ['OG'] },
  { key: 'neuro', title: 'Neurosurgery',
    blurb: 'Cranial, spinal and micro-neurosurgical instruments.',
    codes: ['NS'] },
  { key: 'ortho', title: 'Orthopedic & Bone Surgery',
    blurb: 'Bone rongeurs, chisels, osteotomes, curettes, drills, saws and trauma/spinal instruments.',
    codes: ['OR', 'BS', 'PD'] },
  { key: 'gynob', title: 'Gynecology & Obstetrics',
    blurb: 'Gynecological and obstetric specula, forceps, curettes and delivery instruments.',
    codes: ['GY', 'OB'] },
  { key: 'gastro', title: 'Gastrointestinal & Abdominal',
    blurb: 'Stomach, intestinal, liver and gallbladder clamps and forceps.',
    codes: ['GA', 'LG'] },
  { key: 'dental', title: 'Dental & Oral-Maxillofacial',
    blurb: 'Full dental range plus oral and maxillofacial surgery instruments.',
    codes: ['DN', 'OM'] },
  { key: 'derm', title: 'Dermatology & Minor Surgery',
    blurb: 'Dermatology and minor-surgery instruments.',
    codes: ['DM'] },

  // ---- general / basic-surgery functional buckets ----
  { key: 'cutting', title: 'Cutting & Dissecting',
    blurb: 'Scalpels, knives and the full range of operating, dissecting and specialty scissors.',
    codes: ['SL', 'SS'] },
  { key: 'grasping', title: 'Grasping, Clamping & Hemostasis',
    blurb: 'Tissue and dressing forceps, artery / hemostatic and clip-applying forceps, sponge and swab holders.',
    codes: ['FR', 'AF', 'CS'] },
  { key: 'retraction', title: 'Retraction & Exposure',
    blurb: 'Self-retaining and hand-held retractors, wound spreaders and hooks.',
    codes: ['RT'] },
  { key: 'suturing', title: 'Suturing & Wound Closure',
    blurb: 'Needle holders, suture and ligature instruments.',
    codes: ['SU'] },
  { key: 'access', title: 'Probes, Trocars & Suction',
    blurb: 'Probes, directors and applicators, trocars, cannulas and suction tubes.',
    codes: ['PB', 'TS'] },
  { key: 'diag', title: 'Diagnostic & Dressing',
    blurb: 'Diagnostic sets, mirrors and tongue depressors, plus dressing and bandage instruments.',
    codes: ['DG', 'DR'] },
];

const sections = SPECIALTIES.map(sp => {
  const cards = sp.codes.map(c => sectionCard(c, M[c], SECTIONS, '      ')).filter(Boolean).join('\n');
  const total = sp.codes.reduce((a, c) => a + (SECTIONS[c] ? SECTIONS[c].items.length : 0), 0);
  return `<section class="sect"${sp.key === SPECIALTIES[0].key ? '' : ' style="padding-top:0"'}><div class="wrap">
  <div class="eyebrow">Specialty · ${total} items</div>
  <h2>${esc(sp.title)}</h2>
  <p class="sub">${esc(sp.blurb)}</p>
  <div class="secgrid">
${cards}
  </div>
</div></section>`;
}).join('\n\n');

const grandTotal = Object.values(SECTIONS).reduce((a, s) => a + s.items.length, 0);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shop by Specialty — Surgical Instruments by Procedure | Opix Instruments</title>
<link rel="icon" type="image/png" href="assets/img/brand/favicon.png">
<meta name="description" content="Browse Opix Instruments by surgical specialty: general surgery, ENT, cardiovascular & thoracic, ophthalmic, neurosurgery, orthopedic, gynecology & obstetrics, gastrointestinal, dental and dermatology instrument lines.">
<link rel="canonical" href="https://www.opixinst.com/specialties.html">
<meta property="og:title" content="Shop by Specialty | Opix Instruments">
<meta property="og:description" content="Browse the full Opix Instruments range organized by surgical specialty and procedure.">
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
  <nav class="main"><a href="index.html" class="">Home</a><a href="catalog-sl.html" class="">Catalog</a><a href="specialties.html" class="on">Specialties</a><a href="about.html" class="">About &amp; Quality</a><a href="contact.html" class="">Contact / RFQ</a></nav>
  <button class="cartbtn" id="cartOpen">Inquiry <span class="count" id="cartCount">0</span></button>
</div></header>
<div class="pagehead railpad"><div class="ph">
  <div class="crumb"><a href="index.html">Home</a> / <b>Shop by Specialty</b></div>
  <h1>Shop by Specialty</h1>
</div></div>
<main class="railpad">
<section class="sect" style="padding-bottom:0"><div class="wrap">
  <p class="sub">The full Opix range — ${grandTotal.toLocaleString()} instruments across ${Object.keys(SECTIONS).length} catalog sections — grouped by surgical specialty and procedure. Select a line to browse, search and build a quotation.</p>
</div></section>
${sections}
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
  <div><h4>Catalog</h4><a href="specialties.html">Shop by Specialty</a><a href="catalog-sl.html">SL — Scalpels, Knives</a><a href="index.html">All sections</a></div>
  <div><h4>Quality</h4><a href="about.html">ISO 13485</a><a href="about.html">CE Marking</a><a href="about.html">FDA Registered</a></div>
  <div><h4>Contact</h4><a href="mailto:info@opixinst.com">info@opixinst.com</a><a href="https://www.opixinst.com">www.opixinst.com</a></div>
</div><div class="fbot">© 2026 Opix Instruments — Crafted with Precision. All catalog numbers and specifications subject to change.</div></footer>
<script src="data/products.js"></script>
<script src="assets/js/site.js"></script>
</body></html>
`;

// sanity: every section assigned exactly once
const assigned = SPECIALTIES.flatMap(s => s.codes);
const missing = Object.keys(SECTIONS).filter(c => !assigned.includes(c));
const dupes = assigned.filter((c, i) => assigned.indexOf(c) !== i);
fs.writeFileSync(SITE + '/specialties.html', html);
console.log('wrote specialties.html | sections assigned:', assigned.length,
  '| unassigned:', missing, '| duplicates:', dupes);
