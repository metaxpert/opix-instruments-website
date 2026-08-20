/* Structural verification: every JSON-LD block parses, every internal link
   resolves, every referenced asset exists. Run after tools/seo/build.js. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const bad = [];
let blocks = 0, links = 0, assets = 0;

const exists = p => fs.existsSync(path.join(ROOT, decodeURIComponent(p)));

for (const f of pages) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');

  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    blocks++;
    try {
      const o = JSON.parse(m[1]);
      if (!o['@context'] || !o['@type']) bad.push(`${f}: JSON-LD missing @context/@type`);
    } catch (e) { bad.push(`${f}: JSON-LD parse error — ${e.message}`); }
  }

  for (const m of h.matchAll(/(?:href|src)="(\/[^"#?]*|[a-z0-9][a-z0-9._\/-]*\.(?:html|css|js|png|jpg|pdf|xml|txt|webmanifest|woff2))(?:\?[^"]*)?(?:#[^"]*)?"/gi)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
    const rel = u.replace(/^\//, '');
    if (rel === '' ) continue;                       // "/" -> index.html
    (/\.(html|xml|txt|webmanifest)$/.test(rel) ? links++ : assets++);
    if (!exists(rel)) bad.push(`${f}: broken → ${u}`);
  }

  // Structural sanity
  const open = (h.match(/<article class="card"/g) || []).length;
  const close = (h.match(/<\/article>/g) || []).length;
  if (open !== close) bad.push(`${f}: ${open} <article> vs ${close} </article>`);
  for (const tag of ['html', 'head', 'body', 'main', 'footer']) {
    const o = (h.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const c = (h.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (o !== c) bad.push(`${f}: <${tag}> ${o} open / ${c} close`);
  }
}

/* In-page anchors.
   The footer links to /about.html#oem from every page. The link resolved (the
   file exists) but the id did not, so the fragment silently did nothing — the
   file-existence check above cannot see that. Verify every fragment target. */
{
  const ids = new Map();
  const idsOf = f => {
    if (!ids.has(f)) {
      const h = fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '';
      ids.set(f, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
    }
    return ids.get(f);
  };
  for (const f of pages) {
    const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of h.matchAll(/href="(\/[a-z0-9-]*\.html|)#([^"]+)"/g)) {
      const target = m[1] ? m[1].replace(/^\//, '') : f;
      const frag = decodeURIComponent(m[2]);
      if (!idsOf(target).has(frag)) bad.push(`${f}: fragment #${frag} has no target in ${target}`);
    }
  }
}

/* Untyped @id references.
   schema.org's validator resolves {"@id": "..."} to an untyped Thing unless the
   full node is in the SAME document, and then rejects it on any property whose
   range is Organization (manufacturer, publisher, parentOrganization). Catalogue
   pages carry no Organization node, so every such reference must be a TYPED stub.
   This is the check that caught it; keep it. */
for (const f of pages) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let o; try { o = JSON.parse(m[1]); } catch { continue; }
    (function scan(node, trail) {
      if (Array.isArray(node)) return node.forEach((n, i) => scan(n, `${trail}[${i}]`));
      if (!node || typeof node !== 'object') return;
      if (node['@id'] && !node['@type'] && Object.keys(node).length === 1)
        bad.push(`${f}: untyped @id reference at ${trail} → ${node['@id']}`);
      for (const [k, v] of Object.entries(node)) scan(v, `${trail}.${k}`);
    })(o, o['@type'] || '?');
  }
}

// Sitemap XML wellformedness (no parser dependency — check structure)
for (const f of fs.readdirSync(ROOT).filter(f => /sitemap.*\.xml$/.test(f))) {
  const x = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const o = (x.match(/<url>/g) || []).length, c = (x.match(/<\/url>/g) || []).length;
  if (o !== c) bad.push(`${f}: ${o} <url> vs ${c} </url>`);
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(x)) bad.push(`${f}: unescaped & in XML`);
}

console.log(`Verified ${pages.length} pages · ${blocks} JSON-LD blocks · ${links} page links · ${assets} asset refs`);
if (!bad.length) console.log('✓ all valid, nothing broken');
else { console.log(`\n${bad.length} problem(s):`); [...new Set(bad)].slice(0, 30).forEach(b => console.log('  · ' + b)); }
process.exitCode = bad.length ? 1 : 0;
