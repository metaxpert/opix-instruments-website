# -*- coding: utf-8 -*-
"""Generate catalog-<code>.html from the shared template.
Usage: python make_page.py <CODE> <TITLE> <CRUMB_TITLE> <SEARCH_HINT> <META_DESC>
"""
import sys
CODE, TITLE, CRUMB, HINT, META = sys.argv[1:6]
low = CODE.lower()
html = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{CODE} — {TITLE} Catalog | Opix Instruments</title>
<link rel="icon" type="image/png" href="assets/img/brand/favicon.png">
<meta name="description" content="{META}">
<link rel="canonical" href="https://www.opixinst.com/catalog-{low}.html">
<meta property="og:title" content="{CODE} — {TITLE} Catalog | Opix Instruments">
<meta property="og:description" content="{META}">
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
  <nav class="main"><a href="index.html" class="">Home</a><a href="catalog-sl.html" class="on">Catalog</a><a href="specialties.html" class="">Specialties</a><a href="downloads.html" class="">Downloads</a><a href="about.html" class="">About &amp; Quality</a><a href="contact.html" class="">Contact / RFQ</a></nav>
  <button class="cartbtn" id="cartOpen">Inquiry <span class="count" id="cartCount">0</span></button>
</div></header>
<div class="pagehead railpad"><div class="ph">
  <div class="crumb"><a href="index.html">Home</a> / Catalog / <b>{CODE} — {CRUMB}</b></div>
  <h1>{CRUMB}</h1>
</div></div>
<main class="railpad"><div class="catmain">
  <aside class="side"><h3>Categories</h3><nav class="cats" id="cats"></nav></aside>
  <section>
    <div class="searchbox">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Search by name, catalog # or size — e.g. {HINT}" aria-label="Search products">
    </div>
    <div class="rhead"><h2 id="catTitle">All Products</h2><div class="meta" id="meta"></div></div>
    <div class="grid" id="grid"></div>
  </section>
</div></main>
<div class="zoom" id="zoom"><div class="zin"><img id="zimg" alt=""><div class="zt" id="zt"></div><div class="zs" id="zs"></div></div></div>
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
  <div><h4>Catalog</h4><a href="catalog-sl.html">SL — Scalpels, Knives</a><a href="catalog-ss.html">SS — Scissors</a><a href="catalog-fr.html">FR — Forceps</a><a href="index.html">All sections</a></div>
  <div><h4>Quality</h4><a href="about.html">ISO 13485</a><a href="about.html">CE Marking</a><a href="about.html">FDA Registered</a></div>
  <div><h4>Contact</h4><a href="mailto:info@opixinst.com">info@opixinst.com</a><a href="https://www.opixinst.com">www.opixinst.com</a></div>
</div><div class="fbot">© 2026 Opix Instruments — Crafted with Precision. All catalog numbers and specifications subject to change.</div></footer>
<script src="data/products.js"></script>
<script src="assets/js/site.js"></script>
<script>initCatalog("{CODE}");</script>
</body></html>
'''.format(CODE=CODE, TITLE=TITLE, CRUMB=CRUMB, HINT=HINT, META=META, low=low)
open(r"D:/Opix/opix-website/opix-site/catalog-%s.html" % low, "w", encoding="utf-8", newline="\n").write(html)
print("wrote catalog-%s.html" % low)
