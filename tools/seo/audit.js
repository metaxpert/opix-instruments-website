/* Post-build audit. Fails loudly on the things that silently cost rankings:
   truncated tags, duplicate titles, missing canonicals, orphan pages. */
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const ROOT = L.ROOT;

const pages = L.listPages();
const titles = new Map(), descs = new Map(), canons = new Map();
const problems = [];
let noindexed = 0, totalIn = 0;

const get = (h, re) => { const m = re.exec(h); return m ? m[1] : null; };
const dec = s => s ? s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : s;

for (const f of pages) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const t = dec(get(h, /<title>([\s\S]*?)<\/title>/));
  const d = dec(get(h, /<meta name="description" content="([\s\S]*?)">/));
  const c = get(h, /<link rel="canonical" href="([^"]+)">/);
  const robots = get(h, /<meta name="robots" content="([^"]+)">/) || '';
  const h1s = (h.match(/<h1[^>]*>/g) || []).length;

  if (/noindex/.test(robots)) { noindexed++; continue; }
  totalIn++;

  if (!t) problems.push(`${f}: no <title>`);
  else {
    if (t.length > 62) problems.push(`${f}: title ${t.length} chars — will truncate`);
    if (/…/.test(t)) problems.push(`${f}: title machine-truncated`);
    (titles.get(t) || titles.set(t, []).get(t)).push(f);
  }
  if (!d) problems.push(`${f}: no meta description`);
  else {
    if (d.length > 160) problems.push(`${f}: description ${d.length} chars`);
    if (d.length < 70) problems.push(`${f}: description only ${d.length} chars`);
    if (/…/.test(d)) problems.push(`${f}: description machine-truncated`);
    (descs.get(d) || descs.set(d, []).get(d)).push(f);
  }
  if (!c) problems.push(`${f}: no canonical`);
  else {
    if (canons.has(c)) problems.push(`${f}: canonical collides with ${canons.get(c)}`);
    canons.set(c, f);
  }
  if (h1s !== 1) problems.push(`${f}: ${h1s} <h1> tags`);
  if (!/application\/ld\+json/.test(h)) problems.push(`${f}: no structured data`);
  if (!/og:image/.test(h)) problems.push(`${f}: no og:image`);
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(h)) problems.push(`${f}: still calls Google Fonts`);
  if (/src="data\/products\.js"/.test(h)) problems.push(`${f}: still loads the 940 KB data file`);
}

for (const [t, fl] of titles) if (fl.length > 1) problems.push(`duplicate title (${fl.length}x) "${t}": ${fl.slice(0, 3).join(', ')}${fl.length > 3 ? '…' : ''}`);
for (const [d, fl] of descs) if (fl.length > 1) problems.push(`duplicate description (${fl.length}x): ${fl.slice(0, 3).join(', ')}${fl.length > 3 ? '…' : ''}`);

/* Orphan check — every indexable page must be linked from somewhere. */
const linked = new Set();
for (const f of pages) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of h.matchAll(/href="\/?((?:sets\/)?[a-z0-9][a-z0-9-]*\.html)(?:#[^"]*)?"/g)) linked.add(m[1]);
  // A directory link is a link to its index page.
  for (const m of h.matchAll(/href="\/(sets)\/"/g)) linked.add(m[1] + '/index.html');
}
const orphans = pages.filter(p => !linked.has(p) && p !== 'index.html' && p !== '404.html');
if (orphans.length) problems.push(`${orphans.length} orphan pages: ${orphans.slice(0, 6).join(', ')}`);

/* Sitemap coverage */
const smFiles = fs.readdirSync(ROOT).filter(f => /^sitemap-.*\.xml$/.test(f));
const inMap = new Set();
for (const f of smFiles)
  for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g))
    inMap.add(m[1].replace(/^https:\/\/www\.opixinst\.com\//, '') || 'index.html');
// A sitemap <loc> of /sets/ covers the page written as sets/index.html.
for (const d of [...inMap]) if (d.endsWith('/')) inMap.add(d + 'index.html');
const missing = pages.filter(p => p !== '404.html' && !inMap.has(p) && !(p === 'index.html' && inMap.has('index.html')));
if (missing.length) problems.push(`${missing.length} pages absent from sitemap: ${missing.slice(0, 5).join(', ')}`);

/* Near-duplicate titles.
   Exact duplicates are a hard failure above. This catches the softer case —
   two pages whose titles differ only by punctuation or a plural, which still
   compete for the same query. It comes from the catalogue data (e.g. SU has
   both "Needle Holders" and "Needle Holder"), not from this build, so it is
   reported as a warning and does NOT fail the run. Fix it in data/products.js
   by merging the categories, then rebuild. */
const warnings = [];
{
  const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s(?=[a-z]|$)/g, '');
  const groups = new Map();
  for (const [t, fl] of titles) {
    const k = norm(t);
    (groups.get(k) || groups.set(k, []).get(k)).push([t, fl[0]]);
  }
  for (const [, list] of groups)
    if (list.length > 1)
      warnings.push(`near-duplicate titles: ${list.map(([t, f]) => `"${t}" (${f})`).join(' vs ')}`);
}

console.log(`Audited ${pages.length} pages (${totalIn} indexable, ${noindexed} noindex)`);
if (!problems.length) console.log('✓ no issues');
else { console.log(`\n${problems.length} issue(s):`); problems.slice(0, 40).forEach(p => console.log('  · ' + p)); }
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s) — from the catalogue data, not the build:`);
  warnings.forEach(w => console.log('  ! ' + w));
}
process.exitCode = problems.length ? 1 : 0;
