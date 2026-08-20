/* Proves the build is a function of its inputs, not of how many times it ran.

   This exists because it was not. The first version appended the home page's
   extra sections to </main> and re-inserted the section index on every run —
   thirteen builds left thirteen copies of both on every hand-written page.
   Generated catalogue pages were never affected (they are written whole), so
   nothing caught it. This does.

   Run: node tools/seo/idempotency.js   (runs the build twice, compares)      */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const BUILD = path.join(__dirname, 'build.js');

const snapshot = () => {
  const m = new Map();
  for (const f of fs.readdirSync(ROOT))
    if (/\.(html|xml|txt|webmanifest)$/.test(f))
      m.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
  return m;
};

execFileSync(process.execPath, [BUILD], { stdio: 'pipe' });
const a = snapshot();
execFileSync(process.execPath, [BUILD], { stdio: 'pipe' });
const b = snapshot();

const problems = [];
for (const [f, before] of a) {
  const after = b.get(f);
  if (after === undefined) { problems.push(`${f}: disappeared on the second build`); continue; }
  if (after !== before) {
    // Show the first differing line so the cause is obvious, not just the fact.
    const la = before.split('\n'), lb = after.split('\n');
    const i = la.findIndex((l, n) => l !== lb[n]);
    problems.push(`${f}: changed on the second build (line ${i + 1})\n      was: ${String(la[i]).trim().slice(0, 110)}\n      now: ${String(lb[i]).trim().slice(0, 110)}`);
  }
}
for (const f of b.keys()) if (!a.has(f)) problems.push(`${f}: appeared only on the second build`);

/* Single-instance check — a region duplicated by an earlier build would still
   be duplicated identically on both runs, so byte-equality alone misses it. */
const ONCE = [
  ['section index',  /<nav class="secindex/g],
  ['footer',         /<footer class="railpad"/g],
  ['header',         /<header class="railpad"/g],
  ['managed header', /<!--SEO:HEADER-->/g],
  ['managed footer', /<!--SEO:FOOT-->/g],
  ['managed main',   /<!--SEO:MAIN-->/g],
  ['<main>',         /<main[\s>]/g],
];
for (const [f, html] of b) {
  if (!f.endsWith('.html')) continue;
  for (const [label, re] of ONCE) {
    const n = (html.match(re) || []).length;
    if (n > 1) problems.push(`${f}: ${label} appears ${n}× (should be at most 1)`);
  }
}

console.log(`Idempotency: built twice, compared ${a.size} generated files`);
if (!problems.length) console.log('✓ byte-identical, no duplicated regions');
else { console.log(`\n${problems.length} problem(s):`); problems.forEach(p => console.log('  · ' + p)); }
process.exitCode = problems.length ? 1 : 0;
