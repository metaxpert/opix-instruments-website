/* Functional tests for the pre-rendered catalogue and the rewritten site.js.
   jsdom is the only dev dependency and is deliberately NOT vendored — install
   it wherever you run this:  npm install jsdom && node tools/seo/test.js
   The site itself still ships with zero runtime dependencies. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const SITE = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  \x1b[32m✓\x1b[0m ' + m)) : (fail++, console.log('  \x1b[31m✗\x1b[0m ' + m)); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Let jsdom fire DOMContentLoaded itself — dispatching it manually as well
   wires every delegated listener twice and every click toggles instead of adds. */
async function load(file) {
  const dom = new JSDOM(fs.readFileSync(path.join(SITE, file), 'utf8'),
    { url: 'https://www.opixinst.com/' + file, runScripts: 'outside-only' });
  const w = dom.window;
  await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
  w.eval(fs.readFileSync(path.join(SITE, 'assets/js/site.js'), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return w;
}

(async () => {
  console.log('\n\x1b[1mcatalog-sl.html — pre-rendered grid, search, inquiry cart\x1b[0m');
  {
    const w = await load('catalog-sl.html'), d = w.document;
    const cards = d.querySelectorAll('.card');
    ok(cards.length === 128, `128 products present in the served HTML (${cards.length})`);
    ok(!!d.querySelector('.wafab'), 'WhatsApp button injected');
    ok(d.querySelectorAll('script[src*="products.js"]').length === 0, 'the 940 KB data file is not loaded');

    const q = d.getElementById('q');
    q.value = 'scalpel handle # 4'; q.dispatchEvent(new w.Event('input'));
    await wait(200);
    const shown = [...cards].filter(c => !c.hidden).length;
    ok(shown > 0 && shown < 128, `search narrows 128 → ${shown}`);
    ok(d.getElementById('meta').textContent === `${shown} ITEMS`, 'result count updates');

    q.value = ''; q.dispatchEvent(new w.Event('input'));
    await wait(200);
    ok([...cards].filter(c => !c.hidden).length === 128, 'clearing search restores all 128');

    const btn = d.querySelector('.addbtn'), sku = btn.dataset.sku;
    btn.click();
    ok(d.getElementById('cartCount').textContent === '1', 'add to inquiry increments the counter');
    ok(btn.classList.contains('in'), 'button shows in-cart state');
    const saved = JSON.parse(w.localStorage.getItem('opixCart'));
    ok(saved[sku] && saved[sku].qty === 10 && !!saved[sku].name,
       `cart stores name + qty without any product data file (${saved[sku].name})`);

    d.getElementById('cartOpen').click();
    const row = d.querySelector('#ditems .ditem');
    ok(!!row, 'drawer renders the line item from the cart alone');
    ok(row.querySelector('.qty input').value === '10', 'quantity populated');
    row.querySelector('[data-a="+"]').click();
    ok(JSON.parse(w.localStorage.getItem('opixCart'))[sku].qty === 20, '+ adds 10');
    d.querySelector('#ditems .rm').click();
    ok(d.getElementById('cartCount').textContent === '0', 'remove clears the cart');
  }

  console.log('\n\x1b[1mcatalog-dn.html — largest section (1,559 products)\x1b[0m');
  {
    const w = await load('catalog-dn.html'), d = w.document;
    ok(d.querySelectorAll('.card').length === 1559, `all 1,559 dental products in HTML (${d.querySelectorAll('.card').length})`);
    const q = d.getElementById('q');
    q.value = 'extracting forceps'; q.dispatchEvent(new w.Event('input'));
    await wait(220);
    const n = [...d.querySelectorAll('.card')].filter(c => !c.hidden).length;
    ok(n > 0, `search over 1,559 cards returns ${n} hits`);
  }

  console.log('\n\x1b[1mcategory page — standalone landing page\x1b[0m');
  {
    const w = await load('catalog-af-bile-duct-clamps.html'), d = w.document;
    ok(d.querySelectorAll('.card').length === 14, 'category page renders its 14 products');
    ok(d.querySelectorAll('h1').length === 1, 'exactly one H1');
    ok(/Bile Duct Clamps/.test(d.querySelector('h1').textContent), 'H1 carries the category keyword');
    ok(d.querySelectorAll('.cats a.cat').length > 1, 'sibling categories are real crawlable links');
    ok(!!d.querySelector('.cats a.cat.on'), 'current category marked active');
    ok(d.querySelector('nav.crumb a[href="/catalog-af.html"]') !== null, 'breadcrumb links up to its section');
  }

  console.log('\n\x1b[1mnon-catalog pages — chrome still wired\x1b[0m');
  for (const f of ['index.html', 'about.html', 'contact.html', 'catalog.html']) {
    const w = await load(f), d = w.document;
    ok(!!d.querySelector('.wafab'), `${f}: WhatsApp button`);
    ok(!!d.querySelector('.secindex a[href="/catalog-dn.html"]'), `${f}: links to all 28 sections`);
    ok(d.querySelectorAll('h1').length === 1, `${f}: one H1`);
  }
  {
    const w = await load('contact.html'), d = w.document;
    w.eval(fs.readFileSync(path.join(SITE, 'assets/js/contact.js'), 'utf8'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    ok(!!d.getElementById('sendForm'), 'contact form button present for the external handler');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
