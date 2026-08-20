# Opix Instruments — Website

Static multi-page site. No build step, no dependencies. Deploys to any web server.

## Hosting
Live at **https://opixinst.com** (and `www`), served from a local nginx through
a named Cloudflare Tunnel — no public IP, no inbound port.
Setup: [`DEPLOY.md` §3C](DEPLOY.md). Day-to-day and troubleshooting:
[`docs/OPERATIONS.md`](docs/OPERATIONS.md). Reproduce from scratch:
`./deploy/install.sh`.

Content changes need no deploy step — nginx serves the working tree, so a
`git pull` on the host is live immediately.

## Structure
- `index.html` `catalog.html` `about.html` `contact.html` — hand-written pages
- `catalog-<code>.html`  — 28 section pages, GENERATED, products pre-rendered
- `catalog-<code>-<cat>.html` — 286 category landing pages, GENERATED
- `data/products.js`     — ALL product data; one SECTIONS entry per catalog.
  Build input only — it is no longer sent to browsers and nginx 404s `/data/`.
- `assets/img/products/` — product photos named `<SKU>.jpg`
- `assets/fonts/`        — self-hosted Archivo / Inter / JetBrains Mono woff2
- `assets/css|js/`       — shared styles and logic (cart, catalog filter)
- `tools/ingest_catalog.py` — slices product photos out of a catalog PDF
- `tools/seo/`           — the SEO build; see [`docs/SEO.md`](docs/SEO.md)
- `deploy/`              — nginx config, systemd units and install script
- `docs/OPERATIONS.md`   — runbook: architecture, ops, security, troubleshooting
- `sitemap*.xml` `robots.txt` `site.webmanifest` — GENERATED

## Generated files — do not hand-edit
Every `<head>`, all `catalog-*.html`, both sitemap tiers, `robots.txt` and
`site.webmanifest` are written by `tools/seo/build.js`. Edit the source
(`tools/seo/config.js`) and rebuild:

```
node tools/regen.js        # section grid + full SEO build
node tools/seo/audit.js    # titles, descriptions, canonicals, duplicates, orphans
node tools/seo/verify.js   # JSON-LD, links, tag balance
```

Both checkers exit non-zero on failure. Run them before any content deploy.

## Configure before launch
1. `assets/js/site.js` → set `OPIX.wa` to your WhatsApp Business number
   (e.g. `"9230xxxxxxxxx"`, no `+`).
2. Replace `www.opixinst.com` in sitemap/canonicals if your domain differs.

## Catalog status
All 26 Surgical sections plus the Dental and Orthopedic catalogs are live —
28 sections, ~9,720 products. Section codes:
SL SS FR AF CS RT PB DG TS SU DR BS CV NS OG TR DM GA LG GY OB OT RH OM TN PD DN OR.
`tools/manifest.json` is the source of truth for code → title/blurb/PDF.

### Orthopedic (OR) — text layer + embedded image rects
The orthopedic PDF (11-01-series) has a real text layer but garbled size
fractions, and product photos are separate embedded images. Data is transcribed
via vision (`tools/build_ortho.py` assembles it). Photos are cropped from
per-product boxes with `tools/dn_crop.py`. `tools/or_images.py` is an
alternative fully-geometric extractor (pairs each caption to the image rect
directly above it) — reliable on clean grid pages, less so on dense ones.

### Dental (DN) — different source layout
The dental PDF is a GRID of individual product photos (one photo per 786-series
SKU with a caption), not the surgical stacked-band layout. Its pipeline differs:
transcription also returns a per-item photo bounding box; `tools/build_dental.py`
assembles the section, and `tools/dn_crop.py` crops each photo using the
agent box refined with OpenCV (staying inside the box so it never grabs a
neighbour). Steps 5's band-slicer/recover.py do NOT apply to DN.

## Rebuild / re-add a catalog section from a flat catalog PDF
The catalog PDFs are flat page-images (no text layer), so product data is
transcribed by reading the rendered pages. The reproducible pipeline:

1. **Render** content pages (skip cover page 0 and the back cover; content is
   usually pages `1 .. n-2`):
   `python tools/render_pages.py "<catalog>.pdf" pages/<code> 1 <lastPage> 130`
2. **Transcribe** each page image to JSON `[{page,header,groups:[{name,desc,
   rows:[{sku,size}]}]}]` (one `out_*.json` per page range) — done by reading
   the rendered PNGs.
3. **Assemble** the products.js block + ingest map (categories are derived from
   each page's English header automatically):
   `python tools/build_section.py <CODE> "<Title>" pages/<code>`
4. **Insert** into products.js:  `python tools/insert_block.py <CODE> pages/<code>`
5. **Slice images** out of the PDF using the generated map:
   `python tools/ingest_catalog.py "<catalog>.pdf" --map pages/<code>/map.json --out assets/img/products`
   (for pages where band auto-detection miscounts, recover with
   `python tools/recover.py "<catalog>.pdf" pages/<code>/map.json assets/img/products <0-basedPage,...>`)
6. **Page generation is no longer a separate step** — `tools/make_page.py` is
   deprecated. Section and category pages are emitted by the SEO build in step 7.
7. **Wire the hub and rebuild the site** — regenerates the index section grid,
   then pre-renders every catalogue and category page and rewrites the sitemaps:
   `node tools/regen.js`
   Add the new code to `SECTION_SEO` in `tools/seo/config.js` first; the build
   fails loudly if a section has no title and description.

## Deploy on your nginx (MetaXperts pattern)
```
rsync -av --delete ./ user@server:/var/www/opixinst/
```
```nginx
server {
    listen 80;
    server_name opixinst.com www.opixinst.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://www.opixinst.com$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name www.opixinst.com;
    root /var/www/opixinst;
    index index.html;
    ssl_certificate     /etc/letsencrypt/live/www.opixinst.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.opixinst.com/privkey.pem;
    location ~* \.(jpg|css|js)$ { expires 30d; add_header Cache-Control "public"; }
    gzip on; gzip_types text/css application/javascript text/html;
}
```
Then the usual: enable site → `certbot certonly --webroot -w /var/www/html -d www.opixinst.com -d opixinst.com` → reload.
