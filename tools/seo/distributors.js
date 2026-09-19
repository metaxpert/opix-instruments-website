/* /distributors.html — the distributorship offer, and what a distributor has
   to have in place before the first order can ship.

   Two rules govern the copy here.

   1. Commercial terms are NOT invented. Territory, exclusivity, annual
      targets, discount structure and contract term are the client's to set,
      and a number guessed on a website is a number a distributor will quote
      back in a negotiation. Everything of that kind is described as agreed in
      the distribution agreement. Fill TERMS below once the client states them.

   2. Regulatory lines describe what the DISTRIBUTOR must hold in its own
      market, which is a different claim from what Opix holds. Opix's side is
      stated separately and only as far as the certificates support it — with
      the MDR Class Ir question open, the EU row says what the importer's
      obligations are, not that the route is complete. */
const L = require('./lib.js');
const { header, footer, sectionIndex, overlays } = require('./chrome.js');
const { SITE } = require('./config.js');

/* Per-market regulatory route. `holder` is what the distributor or importer
   must hold; `maker` is what the manufacturer must have in place for that
   market to be reachable at all. */
const MARKETS = [
  {
    market: 'European Union', law: 'MDR 2017/745',
    holder: 'Registration as importer or distributor in EUDAMED; verification that the device is CE marked and a Declaration of Conformity exists; a complaints and traceability register under MDR Articles 13 and 14.',
    maker: 'An EU Authorised Representative designated under Article 11 and named on the labelling, plus a EUDAMED SRN. Reusable surgical instruments are Class Ir, where a notified body assesses the reprocessing aspects.',
  },
  {
    market: 'United Kingdom', law: 'UK MDR 2002 · MHRA',
    holder: 'MHRA registration as the importer, and a UK Responsible Person appointed for a manufacturer outside the UK.',
    maker: 'A UK Responsible Person. Great Britain continues to accept CE marked devices under the published transition.',
  },
  {
    market: 'United States', law: 'FDA · 21 CFR 807',
    holder: 'FDA registration as Initial Importer, renewed annually, and a customs broker able to file FDA entry lines.',
    maker: 'FDA establishment registration and device listing, renewed annually, and a designated US Agent. Most hand-held instruments in this range are Class I and 510(k)-exempt.',
  },
  {
    market: 'Canada', law: 'Health Canada · SOR/98-282',
    holder: 'A Medical Device Establishment Licence (MDEL) held by whoever imports or distributes.',
    maker: 'No device licence is required for Class I devices; the obligation sits with the MDEL holder.',
  },
  {
    market: 'Australia', law: 'TGA · Therapeutic Goods Act',
    holder: 'An Australian Sponsor — a local legal entity that submits the ARTG inclusion and carries the responsibility for the device in Australia.',
    maker: 'A Declaration of Conformity supporting the sponsor’s ARTG inclusion. Class I non-sterile, non-measuring devices are self-assessed.',
  },
  {
    market: 'Japan', law: 'PMD Act · PMDA',
    holder: 'A Marketing Authorisation Holder (MAH), or a DMAH acting for a foreign manufacturer, holding the licence to place the device on the market.',
    maker: 'Foreign Manufacturer Registration with PMDA. General medical devices are Class I and clear by notification — todokede — against a JMDN code.',
  },
  {
    market: 'Russia', law: 'Roszdravnadzor · EAEU',
    holder: 'A local authorised representative to hold the Registration Certificate, and testing carried out in country. The EAEU route is the alternative.',
    maker: 'Documentation supporting the representative’s registration dossier. The certificate is held locally, not by the manufacturer.',
  },
  {
    market: 'GCC', law: 'MOHAP (UAE) · SFDA (Saudi Arabia)',
    holder: 'Registration as the authorised local agent, and device registration with MOHAP or the SFDA depending on the market.',
    maker: 'A Certificate of Free Sale, the ISO 13485 certificate and the technical documentation the agent submits.',
  },
];

/* What a distributor needs regardless of market. */
const DOCS = [
  ['Company registration', 'Trade licence or certificate of incorporation for the appointing entity.'],
  ['Medical device importer status', 'Whatever your market calls it — importer registration, establishment licence, agent registration. The table above names it per market.'],
  ['Tax and customs identity', 'VAT or tax registration, EORI or the local equivalent, and a customs broker able to clear medical devices.'],
  ['Mutual NDA', 'Signed before the technical file and pricing are released.'],
  ['Distribution agreement', 'Territory, term, targets and exclusivity are set here. We work from your draft or ours.'],
  ['Letter of Authorisation', 'Issued by Opix once the agreement is signed. Most registrations will not proceed without it — it is the document naming you as our representative in your market.'],
  ['Banking and terms', 'Bank details and agreed payment terms; letter of credit where you prefer it.'],
];

/* The appointment process. Numbered because it is a real sequence: the
   Letter of Authorisation cannot issue before the agreement, and the
   agreement is not worth drafting before the regulatory route is known. */
const STEPS = [
  ['Tell us your market', 'Which country, which specialties, and roughly what volume. If you already hold an importer licence or establishment registration, say so — it shortens everything that follows.'],
  ['Documentation and NDA', 'We send the summary pack: ISO 13485 and CE certificates, catalogue, and the specifications you need to assess the range. A mutual NDA releases the complete technical file.'],
  ['Samples', 'A sample order against the catalogue numbers you care about. Instruments are judged in the hand, not from photographs.'],
  ['Confirm the regulatory route', 'We establish together what your market requires of each side — your registration, our documentation — before anyone drafts a contract.'],
  ['Distribution agreement', 'Territory, term, targets, exclusivity and pricing. These are negotiated per market; nothing on this page presumes them.'],
  ['Letter of Authorisation', 'Issued on signature, in the form your authority accepts, so your registration can proceed.'],
  ['First commercial order', 'Quoted FOB or CIF, with confirmed lead time and full shipping documentation.'],
];

function generate(write) {
  const url = '/distributors.html';
  const title = 'Become a Distributor — Surgical Instruments | Opix';
  // 156 chars — inside the 160 SERP budget. The audit fails the build's own
  // check if this grows, which is how the first draft was caught.
  const desc = 'Distribution partnerships for surgical, dental and orthopedic instruments '
    + '— the regulatory route, legal documents and appointment process, market by market.';

  const rows = MARKETS.map(m => `<tr>
        <td class="mkt"><b>${L.esc(m.market)}</b><span>${L.esc(m.law)}</span></td>
        <td>${L.esc(m.holder)}</td>
        <td>${L.esc(m.maker)}</td>
      </tr>`).join('\n');

  const steps = STEPS.map(([h, p], i) => `      <li>
        <span class="stepn">${String(i + 1).padStart(2, '0')}</span>
        <span class="stept"><b>${L.esc(h)}</b><span>${L.esc(p)}</span></span>
      </li>`).join('\n');

  const docs = DOCS.map(([h, p]) =>
    `<div class="t"><b>${L.esc(h)}</b><span>${L.esc(p)}</span></div>`).join('\n      ');

  const head = L.buildHead({
    url, title, desc, ogType: 'website',
    schema: [
      L.breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Distributors' }]),
      {
        "@context": "https://schema.org", "@type": "WebPage",
        "@id": L.abs(url) + "#page", "url": L.abs(url),
        "name": 'Distribution partnerships', "description": desc,
        "isPartOf": L.siteRef(), "about": L.orgRef(), "inLanguage": "en",
      },
    ],
  });

  write('distributors.html', `<!DOCTYPE html>
<html lang="en">
<head>
${head}
</head>
<body>
${header('distributors')}
<div class="pagehead railpad"><div class="ph">
  <nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <b>Distributors</b></nav>
  <h1>Become an Opix Distributor</h1>
</div></div>
<main class="railpad" id="main"><div class="wrap">
  <section class="sect">
    <div class="seo-intro">
      <p>We appoint distributors market by market for the full Opix range — 9,720 catalogue references across 28 sections, 20 ready-kitted procedure sets, and private-label programmes under your own brand. You hold the customer relationship and the market registration; we manufacture, document and ship.</p>
      <p>This page sets out what a distributorship covers, what your market requires of each side before the first order can move, and how an appointment actually proceeds. Territory, term, targets and exclusivity are negotiated per market — nothing here presumes them.</p>
    </div>

    <h2>What the distributorship covers</h2>
    <div class="trust" style="margin-top:16px">
      <div class="t"><b>The full catalogue</b><span>All 28 sections and 20 procedure sets, in satin, mirror-polish, tungsten-carbide and economy configurations. Not a restricted export list.</span></div>
      <div class="t"><b>Private label</b><span>Your brand laser-marked on the instrument, your artwork on the packaging, your reference numbers applied across the range. Tooling for custom patterns quoted separately.</span></div>
      <div class="t"><b>Documentation</b><span>ISO 13485 and CE certificates, Declaration of Conformity, technical documentation to MDR Annex II and III, EN 10204 3.1 material certificates and reprocessing instructions for use — everything your registration needs.</span></div>
      <div class="t"><b>Sales material</b><span>The complete PDF catalogue set and product photography for your own catalogues, price lists and tenders.</span></div>
      <div class="t"><b>Sets built to your list</b><span>Any procedure set can be re-specified line by line from the catalogue and quoted as a single unit under your part number.</span></div>
      <div class="t"><b>Terms</b><span>Quoted FOB or CIF. Most catalogue references start at 10 pieces; stocked items ship in 2–4 weeks, sets and private-label runs in 6–10 weeks.</span></div>
    </div>

    <h2 style="margin-top:38px">What your market requires</h2>
    <p class="sub">Every market puts a registration between the goods and the customer, and in almost all of them it is the local partner who holds it. This is what each side needs before the first order can ship. Confirm it with a regulatory adviser in your own market — the summary below is a starting point for that conversation, not a substitute for it.</p>
    <div class="settable"><table>
      <thead><tr><th>Market</th><th>What you hold</th><th>What Opix provides</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table></div>

    <h2 style="margin-top:38px">Documents you will need</h2>
    <p class="sub">Whatever your market, these are the papers that come up in every appointment.</p>
    <div class="trust" style="margin-top:16px">
      ${docs}
    </div>

    <h2 style="margin-top:38px">How an appointment proceeds</h2>
    <ol class="steps">
${steps}
    </ol>

    <div class="setcta" style="margin-top:32px">
      <a class="pri" href="/contact.html">Apply for a distributorship</a>
      <a class="sec" href="/downloads.html">Download the catalogues</a>
    </div>
    <p class="sub" style="margin-top:14px">Write to <a href="mailto:${L.esc(SITE.email)}" style="color:var(--blue);font-weight:600">${L.esc(SITE.email)}</a> with your market and product focus, or call any of the numbers in the footer. We reply within one working day.</p>
  </section>
</div></main>
${overlays(false)}
${sectionIndex()}
${footer()}
<script src="/assets/js/site.js?v=3" defer></script>
</body>
</html>
`);
  return url;
}

module.exports = { generate, MARKETS, STEPS, DOCS };
