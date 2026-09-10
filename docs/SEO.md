# SEO — how the site ranks, and how to keep it that way

Everything here is generated. **Do not hand-edit `<head>` blocks, catalogue
pages, category pages, sitemaps or `robots.txt`** — the build overwrites them.
Edit the source of truth and rebuild.

```
node tools/regen.js          # section grid + the full SEO build (normal path)
node tools/seo/build.js      # the SEO build alone
node tools/gen_downloads.js  # Downloads page from downloads/_index.json (chains the SEO build)
node tools/seo/audit.js      # titles, descriptions, canonicals, duplicates, orphans
node tools/seo/verify.js     # JSON-LD parses, links resolve, fragments exist, tags balance
node tools/seo/idempotency.js # builds twice, proves the output does not drift
node tools/seo/render.js      # every page renders: one h1, chrome wired, no artefacts
npm i jsdom && node tools/seo/test.js   # functional tests for the catalogue JS
```

All three exit non-zero on failure — wire them into CI before any deploy that
touches content.

**Why `idempotency.js` exists.** The catalogue pages are written whole every
build, so they can never drift. The six hand-written pages are *edited in place*,
and the first version of that code appended instead of replaced: the home page's
extra sections were added at `</main>` on every run, and the section index was
re-inserted because its matcher looked for `class="secindex"` when the emitted
markup is `class="secindex railpad"`. Thirteen builds left thirteen copies of
both on every hand-written page, and nothing caught it. Every region the build
writes into a hand-written page is now wrapped in `<!--SEO:NAME--> … <!--/SEO:NAME-->`
and each pattern matches *either* the marked region or the original markup, so
the result is the same however many times it runs. `idempotency.js` builds twice
and diffs; it caught a fresh instance of the same mistake within a minute of
being written.

## Where the copy lives

| What | File |
|---|---|
| Site identity, address, certs, markets, OG image | `tools/seo/config.js` → `SITE` |
| Per-section title / description / intro / related terms | `tools/seo/config.js` → `SECTION_SEO` |
| Category-page opening sentences | `tools/seo/config.js` → `CAT_OPENERS` |
| Specialty grouping (drives "related sections") | `tools/seo/config.js` → `SPECIALTIES` |
| Buyer FAQ (also the FAQPage schema) | `tools/seo/build.js` → `FAQ` |
| Header, footer, all-sections index | `tools/seo/chrome.js` |
| Page shells, schema, product cards | `tools/seo/catalog.js`, `tools/seo/lib.js` |

Adding a catalogue section: add its `SECTION_SEO` entry, then run
`node tools/regen.js`. Without that entry the build throws — deliberately, so a
new section can never ship with no title and no description.

Adding a catalogue PDF: drop the file in `downloads/` as
`opix-<code>-<slug>.pdf`, add its `code`, `title`, `file`, `pages` and `mb` to
`downloads/_index.json`, then run `node tools/gen_downloads.js`. That one file
is the source of truth for the Downloads page, its `DigitalDocument` schema,
the 28 PDF sitemap entries and the download link on the matching section page —
`tools/seo/downloads.js` reads it for all four, so they cannot disagree about
which catalogues exist.

## `lastmod` is cached on purpose

`tools/seo/lastmod.json` maps each URL to a hash of its emitted bytes and the
date that hash last changed. The build rewrites all 317 pages every run, so
stamping the current date — which is what it used to do — told Google the whole
site changed every time anything did, and lastmod is a hint Google discounts
once it is demonstrably wrong. **Commit that file.** Delete it and every date
collapses to the day of the next build.

## What the build produces

- **28 section pages** with all 9,720 products pre-rendered into the HTML.
- **286 category landing pages** (`catalog-<code>-<category>.html`), one per
  category with at least `CATEGORY_MIN_ITEMS` (6) products. Smaller categories
  stay as anchors on their section page rather than becoming thin pages.
- **`catalog.html`** — the catalogue hub the nav and breadcrumbs point at.
- **Sitemap index** + paginated child sitemaps (200 URLs each) with `lastmod`,
  `changefreq` and image entries.
- `robots.txt`, `site.webmanifest`, `assets/img/brand/og-cover.jpg`.

## The decision that matters most

The catalogue used to render client-side from a 940 KB `data/products.js`. The
served HTML for `catalog-dn.html` was an empty `<div id="grid">`. Googlebot
renders JavaScript, but on a second pass, on a budget, and even when it worked
no product had a URL — so 9,720 products produced no long-tail impressions.

Products are now in the served HTML and each category has its own indexable
URL. `data/products.js` is still the source of truth for the build; it is no
longer shipped to browsers, and nginx 404s `/data/` so it cannot be.

`.grid .card { content-visibility: auto }` keeps the 1,559-card dental page
cheap to render — the content stays in the DOM (indexable, findable, readable
by assistive tech) while the browser skips layout and paint for off-screen rows.

## Canonicalisation

`deploy/nginx.conf` 301s apex → `www`, `http` → `https`, and `/index.html` → `/`.
Before this all four answered `200` with identical content. The `/index.html`
rule tests `$request_uri`, not a `location` — `index index.html` rewrites `/` to
`/index.html` internally, so a `location = /index.html` block would redirect the
homepage to itself forever.

Cloudflare's "Always Use HTTPS" is the better home for the scheme redirect; the
origin rule is the backstop.

## Still to do — needs account access, not code

1. **Google Search Console** — verify `https://www.opixinst.com`, submit
   `/sitemap.xml`, then watch Coverage for the 320 new URLs. Put the
   verification token in `SITE.gscToken` in `tools/seo/config.js` and rebuild if
   you want the meta-tag method instead of the DNS record.
2. **Bing Webmaster Tools** — import from Search Console; it takes one click and
   Bing feeds ChatGPT search results.
3. **Google Business Profile** for the Sialkot facility — the `LocalBusiness`
   schema on `/contact.html` has nothing to reconcile against without it.
4. **`SITE.sameAs`** in `tools/seo/config.js` is empty. Add the LinkedIn,
   Facebook and any trade-directory profiles (Alibaba, ExportersIndia,
   Medicalexpo). `sameAs` is the main input to entity consolidation, and for an
   unknown brand it is the cheapest authority signal available.
5. **Backlinks.** Nothing in this repo can produce them, and for a B2B exporter
   they are the binding constraint on ranking. The realistic sources: SIMAP and
   SCCI member directories, Sialkot Chamber listings, trade-show exhibitor pages
   (MEDICA, Arab Health, FIME), and industry directories.

## Honest expectation

Technical SEO removes the reasons a page *cannot* rank. It does not, by itself,
outrank an established competitor. What changed here: 320 indexable URLs where
there were effectively 6, clean canonicalisation, structured data on every page,
and a much faster catalogue. What has not changed: domain authority. Expect
long-tail catalogue-number and pattern-name queries to land first — those have
little competition and the pages now answer them exactly — with head terms like
"surgical instruments manufacturer" following only alongside link acquisition.
