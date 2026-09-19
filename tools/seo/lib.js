/* Opix Instruments — SEO build helpers. Pure functions; no side effects
   except the on-disk image-dimension cache. */
const fs = require('fs');
const path = require('path');
const { SITE } = require('./config.js');

const ROOT = path.resolve(__dirname, '..', '..');

/* ---------- text ---------- */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Attribute-safe *and* stripped of the typographic junk that breaks meta tags.
const attr = s => esc(s).replace(/\s+/g, ' ').trim();

/* Slugs become permanent URLs, so cap them on a word boundary. A hard
   .slice(60) produced "…all-made-of-stainless-st", which is the kind of thing
   nobody fixes later because the URL is already indexed. */
const slug = s => {
  const full = String(s).toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (full.length <= 60) return full;
  const cut = full.slice(0, 60);
  const at = cut.lastIndexOf('-');
  return (at > 24 ? cut.slice(0, at) : cut).replace(/-+$/, '');
};

const abs = p => SITE.origin + (p.startsWith('/') ? p : '/' + p);

/* Trim a description to <=160 chars on a word boundary. */
function clampDesc(s, max = 160) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-—]$/, '') + '…';
}

/* ---------- image dimensions (cached) ---------- */
const DIMS_FILE = path.join(__dirname, 'imgdims.json');
let DIMS = null;
function dims() {
  if (DIMS) return DIMS;
  DIMS = fs.existsSync(DIMS_FILE) ? JSON.parse(fs.readFileSync(DIMS_FILE, 'utf8')) : {};
  return DIMS;
}
function hasImage(sku) { return Object.prototype.hasOwnProperty.call(dims(), sku); }

/* Every generated page: the root, plus the /sets/ subtree.

   The audit, verify, render and idempotency tools each read the root directory
   flat. When the procedure-set pages landed in sets/ that made 21 pages
   invisible to precisely the checks that guard the rest of the site — they
   reported "318 pages, no issues" while 21 unchecked pages sat next to them.
   One lister, used by all four, so a new subdirectory cannot go unwatched. */
function listPages() {
  const out = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const sub = path.join(ROOT, 'sets');
  if (fs.existsSync(sub))
    for (const f of fs.readdirSync(sub)) if (f.endsWith('.html')) out.push('sets/' + f);
  return out.sort();
}

/* ---------- JSON-LD ---------- */
const jsonld = obj =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const ORG_ID = SITE.origin + '/#organization';
const SITE_ID = SITE.origin + '/#website';


/* A bare {"@id": "..."} reference is only resolvable when the full node is in
   the SAME document. Catalogue pages carry no Organization node, so the
   schema.org validator resolved those references to an untyped Thing and
   rejected them on properties whose range is Organization — manufacturer,
   publisher, parentOrganization. A typed stub fixes it: it is still the same
   entity by @id (consumers merge it with the full node from the homepage) but
   it declares what it is where it is used. */
const orgRef = () => ({ "@type": "Organization", "@id": ORG_ID, "name": SITE.name, "url": SITE.origin + "/" });
const siteRef = () => ({ "@type": "WebSite", "@id": SITE_ID, "url": SITE.origin + "/" });

function orgSchema() {
  const o = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    "name": SITE.name,
    "legalName": SITE.legalName,
    "url": SITE.origin + "/",
    "logo": { "@type": "ImageObject", "url": abs(SITE.logo) },
    "image": abs(SITE.ogImage),
    "email": SITE.email,
    "telephone": SITE.phone,
    "foundingDate": SITE.founded,
    "slogan": SITE.tagline,
    "description": "ISO 13485 certified manufacturer and exporter of surgical, dental and orthopedic instruments, based in Sialkot, Pakistan. CE marked and US FDA registered. Supplying importers, distributors, hospitals and OEM private-label partners worldwide.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": SITE.street,
      "addressLocality": SITE.locality,
      "addressRegion": SITE.region,
      "postalCode": SITE.postal,
      "addressCountry": SITE.country
    },
    // One sales contact point per published number. areaServed sits on the
    // first only — repeating all 16 countries three times would trip the page
    // weight of every page carrying this block for no extra meaning.
    "contactPoint": (SITE.phones || [{ number: SITE.phone }]).map((p, i) => ({
      "@type": "ContactPoint",
      "contactType": "sales",
      "email": SITE.email,
      "telephone": p.number,
      "availableLanguage": ["English", "Urdu"],
      ...(i === 0 ? { "areaServed": SITE.markets.map(m => ({ "@type": "Country", "name": m })) } : {})
    })),
    "areaServed": { "@type": "Place", "name": "Worldwide" },
    "knowsAbout": ["Surgical instruments", "Dental instruments", "Orthopedic instruments",
                   "Medical device manufacturing", "OEM private label instruments", "ISO 13485"],
    // A credential a machine can follow to the document beats a bare string:
    // where a certificate PDF exists, the entry carries its registration
    // number, its issuing body and its URL. Certs with no document on file
    // (the FDA registration) stay as the plain claim.
    "hasCredential": SITE.certs.map(name => {
      const cred = {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": "certification",
        "name": name
      };
      const doc = (SITE.certificates || []).find(c => c.covers === name);
      if (doc) {
        const reg = (doc.rows.find(r => r[0] === 'Registration') || [])[1];
        if (reg) cred.identifier = reg;
        cred.url = abs(doc.file);
        cred.recognizedBy = { "@type": "Organization", "name": doc.issuer };
      }
      return cred;
    }),
    "naics": "339112"
  };
  if (SITE.sameAs.length) o.sameAs = SITE.sameAs;
  // Sites beyond the registered address. `address` holds one PostalAddress, so
  // the production unit is published as a Place in `location` rather than
  // being crammed into the head office's address or quietly dropped.
  const extra = (SITE.locations || []).slice(1);
  if (extra.length) o.location = extra.map(l => ({
    "@type": "Place",
    "name": l.label,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": l.street,
      "addressLocality": l.locality || SITE.locality,
      "addressRegion": SITE.region,
      ...(l.postal ? { "postalCode": l.postal } : {}),
      "addressCountry": SITE.country
    }
  }));
  return o;
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    "url": SITE.origin + "/",
    "name": SITE.name,
    "publisher": orgRef(),
    "inLanguage": "en"
    // No SearchAction: Google retired the sitelinks search box result in Nov 2023,
    // so the markup buys nothing and the site has no server-side search endpoint.
  };
}

/* items: [{name, url}] — url relative to root, last item may omit url */
function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, i) => {
      const el = { "@type": "ListItem", "position": i + 1, "name": it.name };
      if (it.url) el.item = abs(it.url);
      return el;
    })
  };
}

function collectionSchema({ url, name, desc, count }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": abs(url) + "#page",
    "url": abs(url),
    "name": name,
    "description": clampDesc(desc, 300),
    "isPartOf": siteRef(),
    "publisher": orgRef(),
    "inLanguage": "en",
    "mainEntity": { "@type": "ItemList", "numberOfItems": count }
  };
}

/* Product entries WITHOUT offers — we publish no prices. Honest schema:
   identity + image + category, which is what feeds image/product discovery. */
function productListSchema(items, pageUrl, category, cap = 50) {
  const list = items.slice(0, cap).map((p, i) => {
    const [sku, name, desc, size] = p;
    const prod = {
      "@type": "Product",
      "name": [name, desc && desc !== 'N/A' ? desc : null, size && size !== 'N/A' ? size : null]
        .filter(Boolean).join(', '),
      "sku": sku,
      "mpn": sku,
      "brand": { "@type": "Brand", "name": SITE.name },
      "manufacturer": orgRef(),
      "category": category,
      "url": abs(pageUrl) + "#" + sku
    };
    if (hasImage(sku)) prod.image = abs('/assets/img/products/' + sku + '.jpg');
    return { "@type": "ListItem", "position": i + 1, "item": prod };
  });
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": category,
    "numberOfItems": items.length,
    "itemListElement": list
  };
}

function faqSchema(qas) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": qas.map(([q, a]) => ({
      "@type": "Question", "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  };
}

/* ---------- <head> ---------- */
/* spec: {url, title, desc, ogType, noindex, schema:[], preloadImg, extra} */
function buildHead(spec) {
  const canon = abs(spec.url);
  const title = attr(spec.title);
  const desc = attr(clampDesc(spec.desc));
  const robots = spec.noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  const og = attr(spec.ogTitle || spec.title);

  const L = [];
  L.push('<meta charset="UTF-8">');
  L.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  L.push(`<title>${title}</title>`);
  L.push(`<meta name="description" content="${desc}">`);
  L.push(`<link rel="canonical" href="${canon}">`);
  L.push(`<meta name="robots" content="${robots}">`);
  L.push(`<meta name="theme-color" content="${SITE.themeColor}">`);
  L.push(`<meta name="author" content="${attr(SITE.name)}">`);
  L.push('<meta name="geo.region" content="PK-PB">');
  L.push(`<meta name="geo.placename" content="${attr(SITE.locality)}">`);
  L.push(`<meta name="geo.position" content="${SITE.lat};${SITE.lon}">`);
  if (SITE.gscToken)  L.push(`<meta name="google-site-verification" content="${attr(SITE.gscToken)}">`);
  if (SITE.bingToken) L.push(`<meta name="msvalidate.01" content="${attr(SITE.bingToken)}">`);
  if (SITE.yandexToken) L.push(`<meta name="yandex-verification" content="${attr(SITE.yandexToken)}">`);
  L.push('');
  L.push('<link rel="icon" type="image/png" href="/assets/img/brand/favicon.png">');
  L.push('<link rel="apple-touch-icon" href="/assets/img/brand/opix-mark.png">');
  L.push('<link rel="manifest" href="/site.webmanifest">');
  L.push('');
  L.push(`<meta property="og:site_name" content="${attr(SITE.name)}">`);
  L.push(`<meta property="og:title" content="${og}">`);
  L.push(`<meta property="og:description" content="${desc}">`);
  L.push(`<meta property="og:type" content="${spec.ogType || 'website'}">`);
  L.push(`<meta property="og:url" content="${canon}">`);
  L.push('<meta property="og:locale" content="en_US">');
  L.push(`<meta property="og:image" content="${abs(SITE.ogImage)}">`);
  L.push(`<meta property="og:image:width" content="${SITE.ogImageW}">`);
  L.push(`<meta property="og:image:height" content="${SITE.ogImageH}">`);
  L.push(`<meta property="og:image:alt" content="${attr(SITE.name)} — surgical instruments manufacturer, Sialkot Pakistan">`);
  L.push('<meta name="twitter:card" content="summary_large_image">');
  if (SITE.twitter) L.push(`<meta name="twitter:site" content="${attr(SITE.twitter)}">`);
  L.push(`<meta name="twitter:title" content="${og}">`);
  L.push(`<meta name="twitter:description" content="${desc}">`);
  L.push(`<meta name="twitter:image" content="${abs(SITE.ogImage)}">`);
  L.push('');
  // Preload only the two faces the ABOVE-THE-FOLD text actually uses. Catalogue
  // and category pages render their <h1> through `.pagehead h1`, which sets no
  // font-weight and so inherits the UA's bold — Archivo 700, not 600. The home
  // page's hero <h1> is 800. Preloading the wrong weight delays the LCP text
  // and wastes a request on a face the first paint never needs.
  for (const f of (spec.fonts || ['archivo-700', 'inter-400']))
    L.push(`<link rel="preload" href="/assets/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`);
  if (spec.preloadImg) L.push(`<link rel="preload" as="image" href="${spec.preloadImg}" fetchpriority="high">`);
  L.push(`<link rel="stylesheet" href="/assets/css/site.css?v=${spec.cssVer || 9}">`);
  if (spec.extra) L.push(spec.extra);
  for (const s of (spec.schema || [])) L.push(jsonld(s));
  return L.join('\n');
}

/* ---------- product card (pre-rendered, crawlable) ---------- */
function cardHTML(p, sectionTitle, i = Infinity) {
  const [sku, name, desc, size] = p;
  const d = desc && desc !== 'N/A' ? desc : '';
  const s = size && size !== 'N/A' ? size : '';
  const full = [name, d].filter(Boolean).join(', ');
  const alt = [full, s].filter(Boolean).join(' — ') + ` | ${sku} ${sectionTitle} — Opix Instruments`;
  // Search haystack, pre-lowercased so the client filter does no work at runtime.
  const hay = attr([sku, name, d, s].filter(Boolean).join(' ').toLowerCase());

  let thumb = '';
  if (hasImage(sku)) {
    const [w, h] = dims()[sku];
    // The top of the grid is the LCP element on every catalogue page, and every
    // card used to be loading="lazy" — which defers the largest paint behind the
    // lazy-load pass and is exactly what Google tells you not to do to an
    // above-the-fold image. The first four cover the widest grid the layout
    // produces; the first also gets fetchpriority so it outranks the font and
    // the logo in the request queue. Everything below stays lazy.
    const load = i < 4
      ? 'loading="eager" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : '')
      : 'loading="lazy" decoding="async"';
    thumb = `<div class="thumb"><img src="/assets/img/products/${sku}.jpg" alt="${attr(alt)}"`
          + ` width="${w}" height="${h}" ${load} data-z="${sku}"></div>`;
  } else {
    thumb = `<div class="thumb nophoto" aria-hidden="true"></div>`;
  }

  return `<article class="card" id="${sku}" data-cat="${attr(p[4] || '')}" data-s="${hay}">`
    + thumb
    + `<div><h3 class="name">${esc(name)}</h3>`
    + (d ? `<p class="desc">${esc(d)}</p>` : '')
    + `<div class="specs"><span class="tag sku">${esc(sku)}</span>`
    + (s ? `<span class="tag">${esc(s)}</span>` : '')
    + `</div></div>`
    + `<button class="addbtn" type="button" data-sku="${attr(sku)}" data-name="${attr(full)}" data-size="${attr(s)}">Add to Inquiry</button>`
    + `</article>`;
}

/* ---------- managed-region replace ---------- */
/* Replaces everything between <!--SEO:NAME--> and <!--/SEO:NAME-->, inclusive
   of the markers, so the build is idempotent. Inserts nothing if absent. */
function replaceRegion(html, name, body) {
  const re = new RegExp(`<!--SEO:${name}-->[\\s\\S]*?<!--/SEO:${name}-->`);
  const block = `<!--SEO:${name}-->${body}<!--/SEO:${name}-->`;
  return re.test(html) ? html.replace(re, block) : html;
}
function hasRegion(html, name) {
  return new RegExp(`<!--SEO:${name}-->`).test(html);
}

module.exports = {
  orgRef, siteRef,
  ROOT, esc, attr, slug, abs, clampDesc, dims, hasImage, listPages,
  jsonld, ORG_ID, SITE_ID, orgSchema, websiteSchema, breadcrumbSchema,
  collectionSchema, productListSchema, faqSchema,
  buildHead, cardHTML, replaceRegion, hasRegion,
};
