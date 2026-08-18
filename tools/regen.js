// Regenerate index secgrid + sitemap from manifest.json and the built SECTIONS.
const fs = require('fs');
const path = require('path');
const SITE = path.resolve(__dirname, '..');            // opix-site root
const MAN = path.join(__dirname, 'manifest.json');     // tools/manifest.json
const manifest = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const { SECTIONS } = require(path.join(SITE, 'data', 'products.js'));
const { sectionCard } = require('./card_assets.js');

const esc = s => s.replace(/&/g, '&amp;');

// ---- index secgrid ----
const cards = manifest.map(m => {
  const built = SECTIONS[m.code] && SECTIONS[m.code].items.length;
  if (built) return sectionCard(m.code, m, SECTIONS, '    ');
  return `    <a class="seccard soon"><span class="sc-code">${m.code}</span><h3>${esc(m.title)}</h3><p>Coming online soon</p></a>`;
}).join('\n');

let idx = fs.readFileSync(SITE + '/index.html', 'utf8');
idx = idx.replace(/(<div class="secgrid">)[\s\S]*?(\n  <\/div>)/, `$1\n${cards}$2`);
fs.writeFileSync(SITE + '/index.html', idx);

// ---- sitemap ----
const staticUrls = [
  ['/', '1.0'], ['/specialties.html', '0.9'], ['/downloads.html', '0.8'], ['/about.html', '0.6'], ['/contact.html', '0.7'],
];
const catUrls = manifest
  .filter(m => SECTIONS[m.code] && SECTIONS[m.code].items.length)
  .map(m => [`/catalog-${m.code.toLowerCase()}.html`, '0.9']);
const all = [staticUrls[0], staticUrls[1], staticUrls[2], ...catUrls, staticUrls[3], staticUrls[4]];
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(([u, p]) => `  <url><loc>https://www.opixinst.com${u}</loc><priority>${p}</priority></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(SITE + '/sitemap.xml', sm);

const builtList = manifest.filter(m => SECTIONS[m.code] && SECTIONS[m.code].items.length).map(m => m.code);
console.log('regen done. built sections:', builtList.join(', '), '(' + builtList.length + ')');
