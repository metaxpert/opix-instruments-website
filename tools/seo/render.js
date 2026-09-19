/* Render check. verify.js proves the markup is well formed and the links
   resolve; this proves each page actually comes out looking like a page —
   one heading, the chrome wired up, no template artefacts leaking into the
   visible text, and the interactive parts reachable.

   Cheap regex checks run over EVERY page; jsdom runs over one of each kind.
   Run: npm install jsdom && node tools/seo/render.js                        */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const pages = require('./lib.js').listPages();
const bad = [];
const note = (f, m) => bad.push(`${f}: ${m}`);

/* ---------- every page ---------- */
const ONCE = {
  '<h1>': /<h1[\s>]/g, '<main>': /<main[\s>]/g, '<header>': /<header[\s>]/g,
  '<footer>': /<footer[\s>]/g, 'section index': /<nav class="secindex/g,
  '<title>': /<title>/g, 'canonical': /rel="canonical"/g,
};
// Strings that mean a template went wrong rather than content saying so.
const ARTEFACTS = [
  ['undefined', /(?:>|\s)undefined(?:<|\s|,|\.)/],
  ['[object Object]', /\[object Object\]/],
  ['NaN', /(?:>|\s)NaN(?:<|\s|,)/],
  ['unresolved ${}', /\$\{[a-zA-Z_]/],
  ['literal placeholder', /challenge_placeholder|TODO_|FIXME_|lorem ipsum/i],
  ['double-escaped entity', /&amp;(?:amp|quot|lt|gt|#\d);/],
  ['duplicated attribute', /<[a-z]+[^>]*\s([a-z-]+)="[^"]*"[^>]*\s\1="/],
];

for (const f of pages) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');

  for (const [label, re] of Object.entries(ONCE)) {
    const n = (h.match(re) || []).length;
    if (n !== 1) note(f, `${label} appears ${n}× (expected exactly 1)`);
  }
  for (const [label, re] of ARTEFACTS) if (re.test(h)) note(f, `template artefact: ${label}`);

  // Markers must be balanced and must never be visible as text.
  for (const name of ['HEADER', 'FOOT', 'MAIN']) {
    const o = (h.match(new RegExp(`<!--SEO:${name}-->`, 'g')) || []).length;
    const c = (h.match(new RegExp(`<!--/SEO:${name}-->`, 'g')) || []).length;
    if (o !== c) note(f, `marker ${name} unbalanced (${o} open / ${c} close)`);
    if (o > 1) note(f, `marker ${name} appears ${o}×`);
  }

  // Chrome every page needs for the header controls to do anything.
  for (const id of ['cartOpen', 'drawer', 'ovl', 'toast', 'cartCount', 'mobmenu'])
    if (!h.includes(`id="${id}"`)) note(f, `missing #${id} — header控 would be inert`);

  if (!/<a class="skip"/.test(h)) note(f, 'no skip link');
  if (!/<script src="\/assets\/js\/site\.js/.test(h)) note(f, 'site.js not loaded');
  if (/src="data\/products\.js"/.test(h)) note(f, 'still loads the retired data file');
  if (/href="assets\/|src="assets\//.test(h) && !/href="\/assets\//.test(h))
    note(f, 'relative asset paths in a page that should use absolute');

  // Images: alt is required, dimensions prevent layout shift. Skip the ones
  // with no src — #zimg is an empty placeholder the zoom overlay fills in on
  // click, so it has nothing to size or describe until it is used.
  for (const m of h.matchAll(/<img\s([^>]*)>/g)) {
    const a = m[1];
    if (!/\bsrc="[^"]+"/.test(a)) continue;
    if (!/\balt="/.test(a)) note(f, `<img> with no alt: ${m[0].slice(0, 80)}`);
    if (!/\bwidth="\d+"/.test(a) || !/\bheight="\d+"/.test(a))
      note(f, `<img> with no intrinsic size: ${m[0].slice(0, 80)}`);
  }

  // An empty heading is a template that rendered nothing.
  for (const m of h.matchAll(/<(h[1-3])[^>]*>\s*<\/\1>/g)) note(f, `empty ${m[1]}`);
}

console.log(`Static checks: ${pages.length} pages`);

/* ---------- jsdom, one of each kind ---------- */
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch { console.log('(jsdom not installed — skipping the live-DOM pass)'); report(); }

const SAMPLE = [
  ['index.html', 'home'], ['catalog.html', 'catalog'], ['specialties.html', 'specialties'],
  ['downloads.html', 'downloads'], ['about.html', 'about'], ['contact.html', 'contact'],
  ['404.html', null], ['catalog-sl.html', 'catalog'], ['catalog-dn.html', 'catalog'],
  ['catalog-af-bile-duct-clamps.html', 'catalog'], ['catalog-bs-hand-drills.html', 'catalog'],
];

(async () => {
  for (const [f, active] of SAMPLE) {
    if (!fs.existsSync(path.join(ROOT, f))) { note(f, 'sample page missing'); continue; }
    const dom = new JSDOM(fs.readFileSync(path.join(ROOT, f), 'utf8'),
      { url: 'https://www.opixinst.com/' + f, runScripts: 'outside-only' });
    const w = dom.window, d = w.document;
    await new Promise(r => d.addEventListener('DOMContentLoaded', r));
    w.eval(fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const text = d.body.textContent.replace(/\s+/g, ' ').trim();
    if (text.length < 400) note(f, `only ${text.length} chars of visible text`);
    if (/SEO:(HEADER|FOOT|MAIN)/.test(text)) note(f, 'SEO marker visible as text');
    if (/<[a-z]+[ >]/.test(text)) note(f, 'raw HTML visible as text');

    // Header nav: exactly one current page, and it is the right one.
    const on = [...d.querySelectorAll('nav.main a.on')];
    if (active && on.length !== 1) note(f, `${on.length} nav items marked current (expected 1)`);
    if (!active && on.length !== 0) note(f, `${on.length} nav items marked current on a page with no nav state`);

    // Progressive enhancement actually attached.
    if (!d.querySelector('.wafab')) note(f, 'WhatsApp button not injected');
    const openBtn = d.getElementById('cartOpen');
    openBtn.click();
    if (!d.getElementById('drawer').classList.contains('open')) note(f, 'inquiry drawer does not open');
    if (!d.querySelector('#ditems .empty')) note(f, 'empty-cart message missing from the drawer');

    // Every page reaches all 28 sections and the core pages.
    if (d.querySelectorAll('.secindex a').length !== 28)
      note(f, `${d.querySelectorAll('.secindex a').length} section-index links (expected 28)`);
    for (const href of ['/contact.html', '/downloads.html', '/about.html'])
      if (!d.querySelector(`footer a[href="${href}"], footer a[href^="${href}#"]`))
        note(f, `footer does not link to ${href}`);

    // Headings descend without skipping a level.
    const lv = [...d.querySelectorAll('h1,h2,h3,h4')].map(e => +e.tagName[1]);
    for (let i = 1; i < lv.length; i++)
      if (lv[i] > lv[i - 1] + 1) { note(f, `heading jumps h${lv[i - 1]} → h${lv[i]}`); break; }

    // Catalogue pages: the grid is real markup and the filter narrows it.
    const grid = d.getElementById('grid');
    if (grid) {
      const cards = d.querySelectorAll('.card');
      if (!cards.length) note(f, 'catalogue page with an empty grid');
      if (String(cards.length) !== grid.dataset.total)
        note(f, `grid data-total=${grid.dataset.total} but ${cards.length} cards`);
      const first = cards[0];
      if (!first.querySelector('.name')?.textContent.trim()) note(f, 'first card has no name');
      if (!first.querySelector('.tag.sku')?.textContent.trim()) note(f, 'first card has no catalogue number');
      if (!first.querySelector('.addbtn')?.dataset.sku) note(f, 'first card has no add-to-inquiry data');
    }
  }
  report();
})();

function report() {
  const uniq = [...new Set(bad)];
  console.log(`\nRender check complete`);
  if (!uniq.length) console.log('✓ every page renders correctly');
  else { console.log(`${uniq.length} problem(s):`); uniq.slice(0, 40).forEach(b => console.log('  · ' + b)); }
  process.exitCode = uniq.length ? 1 : 0;
}
