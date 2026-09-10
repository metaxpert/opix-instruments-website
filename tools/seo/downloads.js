/* The PDF catalogue set.

   downloads/_index.json is the source of truth (written by the compression
   step, one entry per file actually on disk, with its real page count and
   size). Everything that talks about the PDFs reads it from here — the
   Downloads page schema, the sitemap entries and the per-section download
   link — so the four can never disagree about which catalogues exist.

   Ordered like tools/manifest.json, which is the order the Downloads page and
   the home-page section grid already use. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'manifest.json'), 'utf8'));
const order = {};
manifest.forEach((m, i) => { order[m.code] = i; });

const DOWNLOADS = JSON.parse(fs.readFileSync(path.join(ROOT, 'downloads', '_index.json'), 'utf8'))
  .slice()
  .sort((a, b) => (order[a.code] ?? 99) - (order[b.code] ?? 99));

const BY_CODE = {};
DOWNLOADS.forEach(d => { BY_CODE[d.code] = d; });

module.exports = { DOWNLOADS, BY_CODE };
