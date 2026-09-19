/* Opix Instruments — SEO source of truth.
   Every generator in tools/seo/ reads from here. Edit copy HERE, then run
   `node tools/seo/build.js` to push it into every page. Never hand-edit the
   generated <head> blocks — the build overwrites them. */

const SITE = {
  origin:      "https://www.opixinst.com",
  name:        "Opix Instruments",
  legalName:   "Opix Instruments",
  tagline:     "Crafted with Precision",
  email:       "info@opixinst.com",
  phone:       "+92-331-6189184",
  whatsapp:    "923316189184",
  street:      "Ugoki Road",
  locality:    "Sialkot",
  region:      "Punjab",
  postal:      "51310",
  country:     "PK",
  countryName: "Pakistan",
  lat:         "32.4945",
  lon:         "74.5229",
  founded:     "2009",
  ogImage:     "/assets/img/brand/og-cover.jpg",
  ogImageW:    1200,
  ogImageH:    630,
  logo:        "/assets/img/brand/opix-logo.png",
  themeColor:  "#1B8FD6",
  twitter:     "",                       // "@handle" when the account exists
  // Google Search Console HTML-tag verification. Paste just the token from
  // <meta name="google-site-verification" content="TOKEN"> and rebuild.
  // Leave empty to use the DNS TXT method instead (preferred — it survives
  // any rebuild and covers every subdomain).
  gscToken:    "",
  bingToken:   "",                       // <meta name="msvalidate.01" content="...">
  // Yandex Webmaster. Russia is the one named target market where Google is not
  // the default engine, and Yandex reports nothing until the site is verified
  // there. <meta name="yandex-verification" content="TOKEN">
  yandexToken: "",
  sameAs: [                              // fill in as profiles go live — these
    // "https://www.linkedin.com/company/opix-instruments",
    // "https://www.facebook.com/opixinstruments",
  ],
  // Markets the copy is written for. Drives the geo/market phrasing below, the
  // areaServed of the Organization and sales ContactPoint, and the export FAQ
  // answer — that answer is generated from this list, so the two can no longer
  // disagree the way they did when the sentence was typed out by hand.
  markets: ["United States", "Canada", "Germany", "United Kingdom", "France",
            "Italy", "Spain", "Netherlands", "Poland", "Russia", "Japan",
            "Australia", "United Arab Emirates", "Saudi Arabia", "Brazil",
            "Turkey"],
  certs: ["ISO 13485:2016", "CE Marking", "US FDA Establishment Registration"],

  /* The certificates as issued, transcribed from the PDFs in
     assets/certificates/. A buyer's QA team opens the file and checks it
     against the page, so registration numbers, scope wording and dates must
     match the document exactly — quote it, do not paraphrase it.

     The CE entry is deliberately titled the way the document is titled. For
     Class I reusable, non-sterile, non-measuring devices, MDR conformity is
     declared by the manufacturer; this is a certificate of CE compliance from
     a certification body, not an EU Notified Body certificate, and calling it
     one on the website is the kind of overclaim an importer's regulatory
     affairs desk catches. Only add an FDA card when there is a document to
     link — SITE.certs mentions the registration, which is a different claim
     from publishing a certificate.

     No US FDA entry here: no certificate was supplied for it. */
  certificates: [
    {
      name: "ISO 13485:2016",
      covers: "ISO 13485:2016",          // the SITE.certs entry this document evidences
      kicker: "Quality management system",
      issuer: "Standard Certifications Services",
      file: "/assets/certificates/opix-iso-13485-2026-27.pdf",
      rows: [
        ["Registration", "SCS/QMS/2025050101"],
        ["Scope", "Manufacture of non-active surgical and dental instruments"],
        ["Valid", "10 May 2026 — 9 May 2027"],
      ],
    },
    {
      name: "CE — MDR 2017/745",
      covers: "CE Marking",
      kicker: "Class I medical devices",
      issuer: "Standard Certifications Services",
      file: "/assets/certificates/opix-ce-mdr-2026-27.pdf",
      rows: [
        ["Registration", "SCS/EC/2025050102"],
        ["Devices", "Reusable, non-active, non-sterile surgical and dental instruments"],
        ["Assessed to", "GSPR Annex I; technical file per Annex II & III"],
      ],
    },
  ],

  /* Compliance and membership marks — the trust strip in the home page's
     Quality section and in the footer.

     Only CE is drawn as its actual symbol. That is a deliberate limit:

       CE    — a conformity mark the manufacturer affixes itself. Ours to use,
               and drawn to the Regulation 765/2008 Annex II construction.
       ISO   — ISO prohibits certified organisations from using the ISO logo.
               A certified company states the standard, as this does, or uses
               its certification body's mark. Never ISO's own.
       FDA   — the FDA logo is for FDA use only; a private firm displaying it
               implies an endorsement FDA does not give. Registration is also
               not approval, so the wording stays "registered" throughout.
       SIMAP — a membership mark, usable with the association's own artwork,
               which we do not hold.

     Set `img` on an entry to a file under assets/img/brand/ and that artwork
     renders in place of the typographic tile — that is the route for the
     SIMAP mark, or for the certification body's ISO mark, once supplied. */
  marks: [
    { id: "ce",    glyph: "ce",    name: "CE marked",      sub: "MDR 2017/745 · Class I" },
    { id: "iso",   glyph: "13485", name: "ISO 13485:2016", sub: "Certified quality system" },
    { id: "fda",   glyph: "FDA",   name: "FDA registered", sub: "US establishment registration" },
    { id: "simap", glyph: "SIMAP", name: "SIMAP member",   sub: "Pakistan manufacturers association" },
  ],
};

/* Buyer segments — used to write intro copy that speaks to all four at once
   without keyword-stuffing any single page. */
const AUDIENCE = {
  importer: "importers and distributors",
  oem:      "OEM and private-label partners",
  hospital: "hospitals, surgical centres and clinics",
  reseller: "medical device resellers",
};

/* ---------------------------------------------------------------------------
   PER-SECTION SEO. One entry per catalog code.
     h1     — on-page heading (keyword-led, human-readable)
     title  — <title>. Keep the distinctive part in the first ~55 chars.
     desc   — meta description, 140–160 chars, ends with a call to action.
     intro  — 2–3 sentences of unique indexable copy above the grid.
     terms  — related search terms; rendered as a crawlable "related searches"
              strip and folded into the page's keyword surface.
--------------------------------------------------------------------------- */
const SECTION_SEO = {
  SL: {
    h1: "Scalpel Handles, Blades & Surgical Knives",
    title: "Scalpel Handles & Surgical Knives Manufacturer | Opix",
    desc: "Scalpel handles #3, #4 and #7, blades 10–36, operating, amputation and post-mortem knives, dermatomes. ISO 13485 manufacturer, Sialkot. Request a quote.",
    intro: "Opix manufactures the complete scalpel and surgical knife line in German-pattern martensitic stainless steel — solid and fluted handles in sizes #3, #4, #5 and #7, matching blade holders, and operating, amputation, resection and post-mortem knives. Every handle is forged, hardened to specification and hand-finished, with catalogue numbers that cross-reference the standard international patterns distributors already stock.",
    terms: ["scalpel handle #3", "scalpel handle #4 supplier", "surgical blade holder", "amputation knife manufacturer", "post mortem knife", "dermatome supplier", "fluted scalpel handle"],
  },
  SS: {
    h1: "Surgical Scissors — Operating, Dissecting & Micro",
    title: "Surgical Scissors Manufacturer & Exporter | Opix Instruments",
    desc: "782 surgical scissors — Mayo, Metzenbaum, Iris, vascular, micro, eye and ENT patterns plus tungsten-carbide SuperCut lines. ISO 13485 exporter. Get a quote.",
    intro: "The Opix scissors range covers every pattern an operating room specifies — Mayo and Metzenbaum dissecting scissors, Iris and Stevens fine scissors, vascular and cardiovascular patterns, micro spring scissors and dedicated eye and ENT designs. Tungsten-carbide SuperCut variants carry gold rings and a razor-ground blade edge for a longer service life under repeated sterilisation.",
    terms: ["Mayo scissors supplier", "Metzenbaum scissors manufacturer", "tungsten carbide scissors", "supercut surgical scissors", "iris scissors wholesale", "micro spring scissors", "bandage scissors exporter"],
  },
  FR: {
    h1: "Surgical Forceps — Dissecting, Tissue & Micro",
    title: "Surgical Forceps Manufacturer & Supplier | Opix Instruments",
    desc: "593 dissecting, tissue, jeweler, splinter, grasping, vascular and micro forceps, incl. tungsten-carbide lines. ISO 13485 manufacturer. Request bulk pricing.",
    intro: "Opix produces the full thumb and tissue forceps programme: Adson, DeBakey, Potts-Smith, Cushing, Gerald and Bonney patterns, jeweler and splinter forceps, and micro forceps with platform tips for vascular and ophthalmic work. Tungsten-carbide inserts are available across the dissecting range for surgeons who need a non-slip grip that survives repeated autoclaving.",
    terms: ["Adson forceps manufacturer", "DeBakey forceps supplier", "tissue forceps wholesale", "jeweler forceps", "splinter forceps exporter", "tungsten carbide forceps", "micro forceps supplier"],
  },
  AF: {
    h1: "Artery & Hemostatic Forceps",
    title: "Hemostatic & Artery Forceps Manufacturer | Opix Instruments",
    desc: "484 artery and hemostatic forceps — Kocher, Crile, Kelly, Mixter, Rochester and mosquito patterns, clip appliers. ISO 13485 exporter. Request a quote.",
    intro: "Hemostasis is the highest-volume line in any instrument tender, and Opix builds it accordingly: Halsted mosquito, Crile, Kelly, Rochester-Pean, Kocher-Ochsner and Mixter right-angle forceps in straight and curved patterns across every standard working length. Box joints are milled and lapped so the jaws meet along their full length and the ratchet holds after thousands of cycles.",
    terms: ["Kocher forceps manufacturer", "mosquito forceps supplier", "Crile forceps wholesale", "Kelly hemostat exporter", "Mixter right angle forceps", "artery forceps bulk supplier", "hemostat manufacturer Pakistan"],
  },
  CS: {
    h1: "Cotton, Swab & Sponge-Holding Forceps",
    title: "Sponge Holding & Swab Forceps Supplier | Opix Instruments",
    desc: "Sponge-holding, dressing and cotton-swab forceps — Foerster, Rampley and Gross-Maier patterns, serrated or smooth. ISO 13485 maker. Get bulk pricing.",
    intro: "Foerster, Rampley and Gross-Maier sponge-holding forceps in straight and curved patterns, with serrated or smooth ring jaws, plus the cotton and dressing forceps that accompany them on every dressing trolley. High-turnover consumable-adjacent items that distributors reorder in volume — priced accordingly on quantity.",
    terms: ["sponge holding forceps supplier", "Foerster forceps manufacturer", "Rampley sponge forceps", "dressing forceps wholesale", "cotton swab forceps exporter"],
  },
  RT: {
    h1: "Surgical Retractors — Self-Retaining & Hand-Held",
    title: "Surgical Retractor Manufacturer & Exporter | Opix Instruments",
    desc: "654 retractors — Weitlaner, Balfour, Finochietto, Deaver, Richardson, Langenbeck and Senn patterns, hooks. ISO 13485 supplier. Request a quote.",
    intro: "Opix retractors span the hand-held range — Langenbeck, Richardson, Deaver, Volkmann, Senn-Miller and US Army patterns — and the self-retaining designs that hold the field alone: Weitlaner, Gelpi, Balfour abdominal and Finochietto rib spreaders. Blades are polished to a satin finish that cuts glare under operating lights without harbouring bioburden.",
    terms: ["Weitlaner retractor supplier", "Balfour abdominal retractor", "Finochietto rib spreader manufacturer", "Deaver retractor wholesale", "Langenbeck retractor exporter", "skin hook supplier", "self retaining retractor manufacturer"],
  },
  PB: {
    h1: "Probes, Directors & Cotton Applicators",
    title: "Surgical Probes & Applicators Supplier | Opix Instruments",
    desc: "Surgical probes, grooved directors, seekers and cotton applicators in malleable and rigid patterns. ISO 13485 manufacturer, Sialkot. Request a quote.",
    intro: "Grooved directors, malleable probes, lacrimal and fistula probes, seekers and threaded cotton applicators — the fine ancillary instruments that complete a general surgery or ENT set. Manufactured in the same stainless grades as the primary instruments so a full set sterilises and ages uniformly.",
    terms: ["grooved director supplier", "surgical probe manufacturer", "cotton applicator exporter", "lacrimal probe wholesale", "malleable probe supplier"],
  },
  DG: {
    h1: "Diagnostic Instruments & Tongue Depressors",
    title: "Diagnostic Instruments Manufacturer | Opix Instruments",
    desc: "Diagnostic sets, laryngeal mirrors, tongue depressors, spatulas and examination instruments. ISO 13485 manufacturer and exporter. Request bulk pricing.",
    intro: "Examination-room instruments built to the same tolerances as the operating-room range: laryngeal mirrors in graded diameters, Brunings and Tobold tongue depressors, spatulas and the small diagnostic sets that clinics buy in quantity. Stocked patterns suit both hospital procurement and distributor catalogue lines.",
    terms: ["tongue depressor manufacturer", "laryngeal mirror supplier", "diagnostic instrument set exporter", "medical spatula wholesale"],
  },
  TS: {
    h1: "Trocars, Cannulas & Suction Tubes",
    title: "Trocar & Suction Tube Manufacturer | Opix Instruments",
    desc: "187 trocars, cannulas and suction tubes — Yankauer, Frazier, Poole and Andrews patterns, reusable stainless. ISO 13485 exporter. Request a quote.",
    intro: "Reusable suction and drainage instrumentation: Yankauer, Frazier, Poole and Andrews suction tubes with matched connectors, plus abdominal and thoracic trocars with their cannulas. Lumens are electro-polished end to end so cleaning validation passes and residue does not bake on during autoclaving.",
    terms: ["Yankauer suction tube supplier", "Frazier suction manufacturer", "trocar and cannula exporter", "Poole suction tube wholesale", "reusable suction tube supplier"],
  },
  SU: {
    // The section page targets the broad term; its "Needle Holders" category
    // page (104 items) is the stronger target for that specific query, so the
    // two must not compete for it.
    h1: "Suture Instruments & Needle Holders",
    title: "Suture Instruments Manufacturer & Exporter | Opix",
    desc: "293 needle holders and suture instruments — Mayo-Hegar, Crile-Wood, Olsen-Hegar and Castroviejo, tungsten-carbide jaws. ISO 13485. Get a quote.",
    intro: "Mayo-Hegar, Crile-Wood, Olsen-Hegar, Ryder and Castroviejo needle holders in every standard length, with tungsten-carbide jaw inserts and gold-plated rings on the TC lines. Diamond-dust and cross-serrated jaw faces are milled to grip fine suture needles without flattening them.",
    terms: ["Mayo Hegar needle holder supplier", "tungsten carbide needle holder", "Castroviejo needle holder manufacturer", "Crile Wood needle holder exporter", "micro needle holder wholesale"],
  },
  DR: {
    h1: "Dressing & Bandage Instruments",
    title: "Dressing & Bandage Instruments Supplier | Opix Instruments",
    desc: "Dressing and bandage instruments, ligature scissors and wound-care ancillaries in surgical stainless steel. ISO 13485 exporter. Request bulk pricing.",
    intro: "The wound-care ancillaries that ship alongside every dressing set — bandage and ligature scissors, dressing instruments and probe-tipped patterns designed for use over intact skin. Simple, high-volume items where consistent finish and reliable lead time matter more than complexity.",
    terms: ["bandage scissors supplier", "dressing instrument manufacturer", "wound care instrument exporter"],
  },
  BS: {
    h1: "Bone Surgery Instruments — Rongeurs, Chisels & Saws",
    title: "Bone Surgery Instruments Manufacturer | Opix Instruments",
    desc: "1,115 bone surgery instruments — Kerrison and Luer rongeurs, bone cutters, chisels, gouges, osteotomes, curettes, saws. ISO 13485 exporter. Get a quote.",
    intro: "The largest single line in the Opix catalogue. Kerrison and Luer-Stille rongeurs across every bite width and angle, Liston and Ruskin bone cutters, Lambotte and Smith-Petersen osteotomes, gouges, mallets, Volkmann curettes, periosteal elevators and Gigli and amputation saws. Cutting edges are heat-treated to a hardness that holds through repeated resharpening.",
    terms: ["Kerrison rongeur manufacturer", "Luer bone rongeur supplier", "bone cutting forceps exporter", "osteotome manufacturer", "Volkmann curette wholesale", "periosteal elevator supplier", "amputation saw manufacturer"],
  },
  CV: {
    h1: "Cardiovascular & Thoracic Surgery Instruments",
    title: "Cardiovascular Surgery Instruments Manufacturer | Opix",
    desc: "363 cardiovascular and thoracic instruments — DeBakey and Satinsky clamps, bulldog clamps, rib spreaders, sternum sets. ISO 13485 supplier. Get a quote.",
    intro: "Atraumatic vascular instrumentation built around the DeBakey jaw profile: aortic and peripheral vascular clamps, Satinsky and Cooley patterns, Glover and DeBakey bulldog clamps, plus the thoracic set — rib spreaders, rib shears, sternum saws and wire twisters. Jaw serrations are cut fine enough to hold a vessel without intimal damage.",
    terms: ["DeBakey vascular clamp supplier", "Satinsky clamp manufacturer", "bulldog clamp exporter", "rib spreader wholesale", "sternum instrument supplier", "vascular surgery instrument manufacturer"],
  },
  NS: {
    h1: "Neurosurgery Instruments",
    title: "Neurosurgery Instruments Manufacturer & Exporter | Opix",
    desc: "427 neurosurgical instruments — dura and brain retractors, Adson and Raney patterns, micro dissectors, spinal sets. ISO 13485 supplier. Get a quote.",
    intro: "Cranial and spinal instrumentation for neurosurgical theatres: dura hooks and separators, Penfield and Rhoton-pattern dissectors, Adson and Raney scalp clips and appliers, brain spatulas, self-retaining brain retractors and the laminectomy and spinal set. Fine tips are finished under magnification and inspected individually.",
    terms: ["neurosurgical instruments supplier", "Penfield dissector manufacturer", "Raney clip applier", "dura hook exporter", "brain retractor wholesale", "laminectomy instrument supplier"],
  },
  OG: {
    h1: "Ophthalmic Surgery Instruments",
    title: "Ophthalmic Surgery Instruments Manufacturer | Opix",
    desc: "426 ophthalmic and micro-eye instruments — Castroviejo, Barraquer and Colibri patterns, lid specula, chalazion forceps. ISO 13485 exporter. Get a quote.",
    intro: "Micro-ophthalmic instrumentation manufactured under magnification: Castroviejo calipers and needle holders, Barraquer and Lieberman lid specula, Colibri and capsulorhexis forceps, chalazion clamps and curettes, muscle hooks, lacrimal cannulas and the corneal and cataract sets. Tips are measured against gauge before release.",
    terms: ["ophthalmic instruments manufacturer", "Castroviejo forceps supplier", "eye speculum exporter", "chalazion forceps wholesale", "capsulorhexis forceps supplier", "cataract instrument set manufacturer"],
  },
  GA: {
    h1: "Gastro-Intestinal Clamps & Forceps",
    title: "Intestinal & Stomach Clamps Manufacturer | Opix Instruments",
    desc: "200 gastro-intestinal instruments — Doyen, Kocher, Payr, Allis and Babcock clamps, intestinal and stomach forceps in atraumatic patterns. ISO 13485 exporter.",
    intro: "Bowel and gastric instrumentation in crushing and non-crushing patterns: Doyen intestinal clamps with and without sheaths, Payr pylorus clamps, Kocher and Lane gastric clamps, Allis and Babcock tissue forceps and the anastomosis set. Atraumatic jaws are profiled to occlude without devitalising the bowel wall.",
    terms: ["Doyen intestinal clamp supplier", "Babcock forceps manufacturer", "Allis tissue forceps exporter", "Payr stomach clamp wholesale", "intestinal clamp supplier"],
  },
  GY: {
    h1: "Gynecology Instruments",
    title: "Gynecology Instruments Manufacturer & Supplier | Opix",
    desc: "339 gynecological instruments — Cusco and Graves specula, uterine sounds, tenaculum forceps, Sims curettes, dilators. ISO 13485 exporter. Get a quote.",
    intro: "The complete gynaecological examination and minor-procedure range: Cusco, Graves and Sims vaginal specula in graded sizes, Hegar and Pratt dilators, uterine sounds, Schroeder and Duplay tenaculum forceps, Sims and Novak curettes, and biopsy and polypus forceps. Specula are finished to a mirror polish inside the blade for patient comfort.",
    terms: ["vaginal speculum manufacturer", "Cusco speculum supplier", "Hegar dilator exporter", "uterine curette wholesale", "tenaculum forceps supplier", "gynecology instrument set manufacturer"],
  },
  OB: {
    h1: "Obstetric Instruments & Forceps",
    title: "Obstetric Forceps Manufacturer & Supplier | Opix Instruments",
    desc: "Obstetric forceps and delivery instruments — Simpson, Wrigley, Kielland and Piper patterns, cord clamps. ISO 13485 manufacturer. Request a quote.",
    intro: "Delivery-room instrumentation: Simpson, Wrigley, Kielland, Naegele and Piper obstetric forceps, umbilical cord clamps and scissors, and the ancillary perforator and cranioclast patterns still specified in tender documents. Manufactured to the classic blade geometries with a balanced, hand-matched articulation.",
    terms: ["obstetric forceps manufacturer", "Wrigley forceps supplier", "Kielland forceps exporter", "umbilical cord clamp wholesale", "delivery instrument supplier"],
  },
  OT: {
    h1: "Otology & Ear Surgery Instruments",
    title: "ENT & Ear Surgery Instruments Manufacturer | Opix Instruments",
    desc: "345 otology instruments — ear specula, micro-ear forceps, Hartmann and Troeltsch patterns, myringotomy knives. ISO 13485 exporter. Get a quote.",
    intro: "Micro-otological instrumentation for tympanoplasty, stapedectomy and routine ear surgery: Hartmann and Troeltsch ear specula in graded diameters, alligator and crocodile forceps, myringotomy knives, ear curettes and suction tubes, and the fine picks and elevators used on the ossicular chain.",
    terms: ["ENT instruments manufacturer", "ear speculum supplier", "Hartmann ear forceps exporter", "myringotomy knife wholesale", "alligator forceps supplier", "tympanoplasty instrument set"],
  },
  RH: {
    h1: "Rhinology & Nasal Surgery Instruments",
    title: "Nasal & Rhinology Instruments Manufacturer | Opix Instruments",
    desc: "334 rhinology instruments — Killian and Cottle nasal specula, septum instruments, turbinate scissors, antrum punches. ISO 13485 exporter. Get a quote.",
    intro: "Septoplasty, rhinoplasty and sinus instrumentation: Killian, Cottle, Vienna and Hartmann nasal specula, Cottle and Freer elevators and knives, turbinate and septum scissors, Blakesley and Takahashi nasal forceps, antrum punches, rasps and osteotomes. Rhinoplasty rasps are cut on precision teeth-forming machines for a consistent stroke.",
    terms: ["nasal speculum manufacturer", "Killian speculum supplier", "Cottle elevator exporter", "Blakesley forceps wholesale", "rhinoplasty instrument set supplier", "septum instrument manufacturer"],
  },
  OM: {
    h1: "Oral & Maxillofacial Surgery Instruments",
    title: "Oral & Maxillofacial Instruments Manufacturer | Opix",
    desc: "156 oral and maxillofacial instruments — bone plating sets, mouth gags, tongue retractors, elevators, rongeurs. ISO 13485 exporter. Get a quote.",
    intro: "Maxillofacial trauma and oral surgery instrumentation: mouth gags and props, cheek and tongue retractors, periosteal and root elevators, bone files and rongeurs, and the plating ancillaries used in mandibular fixation. Bridges the dental and orthopaedic ranges for surgeons who work across both.",
    terms: ["maxillofacial instruments supplier", "mouth gag manufacturer", "oral surgery instrument exporter", "bone plating instrument wholesale", "periosteal elevator dental supplier"],
  },
  DM: {
    h1: "Dermatology & Minor Surgery Instruments",
    title: "Dermatology Instruments Manufacturer & Supplier | Opix",
    desc: "Dermatology and minor-surgery instruments — biopsy punches, comedone extractors, dermal curettes, skin hooks. ISO 13485 maker. Request bulk pricing.",
    intro: "Skin-procedure instrumentation for dermatology clinics and minor-operation theatres: dermal curettes in graded diameters, comedone and milia extractors, skin hooks, biopsy punches and the fine scissors and forceps that complete a minor surgery tray.",
    terms: ["dermatology instruments supplier", "comedone extractor manufacturer", "dermal curette exporter", "skin biopsy punch wholesale", "minor surgery set supplier"],
  },
  TR: {
    h1: "Tracheotomy & Airway Instruments",
    title: "Tracheotomy Instruments Manufacturer | Opix Instruments",
    desc: "Tracheotomy and airway instruments — tracheal dilators, tracheotomy tubes, hooks and Trousseau patterns. ISO 13485 exporter. Request a quote.",
    intro: "Airway instrumentation for emergency and elective tracheostomy: Trousseau and Laborde tracheal dilators, tracheal hooks, tracheotomy tubes and the retractors and scissors specified in the standard tracheostomy set.",
    terms: ["tracheal dilator supplier", "tracheotomy instrument manufacturer", "Trousseau dilator exporter", "tracheostomy set wholesale"],
  },
  LG: {
    h1: "Liver, Gallbladder & Biliary Instruments",
    title: "Gallbladder & Biliary Instruments Manufacturer | Opix",
    desc: "108 liver, gallbladder and biliary instruments — Desjardins and Randall stone forceps, bile duct dilators, scoops and gallbladder trocars. ISO 13485 exporter.",
    intro: "Open biliary surgery instrumentation: Desjardins and Randall gall stone forceps, Mayo and Bakes common duct dilators, gall stone scoops, gallbladder trocars and the liver retractors that accompany them. Still specified across markets where open cholecystectomy remains routine.",
    terms: ["gall stone forceps supplier", "Randall forceps manufacturer", "bile duct dilator exporter", "Desjardins forceps wholesale", "biliary instrument supplier"],
  },
  TN: {
    h1: "Tonsillectomy & Adenoid Instruments",
    title: "Tonsillectomy Instruments Manufacturer | Opix Instruments",
    desc: "134 tonsil and adenoid instruments — Boyle-Davis mouth gags, tonsil snares, Barnhill and St. Clair curettes. ISO 13485 exporter. Get a quote.",
    intro: "The complete tonsillectomy and adenoidectomy set: Boyle-Davis and Davis-Meyer mouth gags with tongue blades, Ballenger and Tydings tonsil snares with wire, Barnhill and St. Clair-Thompson adenoid curettes, tonsil-holding forceps and pillar retractors.",
    terms: ["tonsillectomy set supplier", "Boyle Davis mouth gag manufacturer", "adenoid curette exporter", "tonsil snare wholesale", "tonsil forceps supplier"],
  },
  PD: {
    h1: "Podiatry & Nail Instruments",
    title: "Podiatry & Nail Instruments Manufacturer | Opix Instruments",
    desc: "Podiatry and nail instruments — ingrown toenail nippers, nail splitters, chiropody forceps, curettes, rasps. ISO 13485 exporter. Get a quote.",
    intro: "Chiropody and podiatric surgery instrumentation: heavy-duty nail nippers and cantilever patterns for thickened nails, nail splitters and elevators, chiropody curettes, blacks files and rasps. Cutting jaws are hardened above the range used on soft-tissue instruments.",
    terms: ["nail nipper manufacturer", "podiatry instruments supplier", "ingrown toenail instrument exporter", "chiropody instrument wholesale", "nail splitter supplier"],
  },
  DN: {
    h1: "Dental Instruments",
    title: "Dental Instruments Manufacturer & Exporter | Opix Instruments",
    desc: "1,559 dental instruments — extracting forceps, root elevators, scalers, curettes, mirrors, explorers, trays. ISO 13485 supplier. Request a quote.",
    intro: "A complete dental programme built for clinic supply and distributor catalogues alike: adult and paediatric extracting forceps across the American and English patterns, Cryer and Coupland root elevators, Gracey and universal curettes, sickle and periodontal scalers, mouth mirrors, explorers, probes, and perforated and rim-lock impression trays.",
    terms: ["dental extracting forceps manufacturer", "dental instruments supplier Pakistan", "Gracey curette exporter", "root elevator wholesale", "dental scaler manufacturer", "impression tray supplier", "dental instrument set exporter"],
  },
  OR: {
    h1: "Orthopedic Surgery Instruments",
    title: "Orthopedic Instruments Manufacturer & Exporter | Opix",
    desc: "762 orthopedic instruments — bone rongeurs, osteotomes, chisels, curettes, elevators, drills, saws, spinal sets. ISO 13485 supplier. Get a quote.",
    intro: "Trauma, arthroplasty and spinal instrumentation: Stille-Luer and Kerrison rongeurs, Lambotte and Smith-Petersen osteotomes and chisels, bone curettes and gouges, Hohmann and Bennett retractors, bone-holding and reduction forceps, hand drills, reamers and amputation saws. Supplied loose or assembled to a customer's set list.",
    terms: ["orthopedic instruments manufacturer", "bone rongeur supplier", "Hohmann retractor exporter", "bone holding forceps wholesale", "orthopedic surgical set supplier", "spinal instrument manufacturer", "trauma instrument set exporter"],
  },
};

/* Category-level copy templates. Category pages get their headline data from
   the products themselves (count, size range, SKU range) plus these openers,
   selected by keyword so no two category pages read identically. */
const CAT_OPENERS = [
  "{n} {cat} patterns from the Opix {sec} range, manufactured in Sialkot under an ISO 13485 quality system and supplied worldwide to distributors, hospitals and OEM partners.",
  "The complete Opix {cat} line — {n} catalogue numbers spanning {sizes}. Manufactured to German-pattern geometry in surgical-grade stainless steel and CE marked for the European market.",
  "Opix manufactures {n} {cat} references as part of the {sec} programme. Every item is forged, heat-treated and hand-finished in our own facility, then inspected against pattern before packing.",
  "Browse {n} {cat} instruments with full catalogue numbers and working lengths. Available loose, in sets, or under your own brand as a private-label programme.",
  "{n} {cat} in the Opix catalogue, {sizes}. Bulk and OEM pricing on request — quotations returned within one working day with FOB and CIF terms.",
];


/* Specialty grouping — mirrors tools/gen_specialties.js. Drives the
   "related sections" cross-links, which is how link equity moves sideways
   between topically adjacent catalogue sections instead of only up to the hub. */
const SPECIALTIES = [
  { key: 'ent',        title: 'ENT — Ear, Nose & Throat',            codes: ['OT','RH','TN','TR'] },
  { key: 'cvt',        title: 'Cardiovascular & Thoracic',           codes: ['CV'] },
  { key: 'ophthalmic', title: 'Ophthalmic (Eye)',                    codes: ['OG'] },
  { key: 'neuro',      title: 'Neurosurgery',                        codes: ['NS'] },
  { key: 'ortho',      title: 'Orthopedic & Bone Surgery',           codes: ['OR','BS','PD'] },
  { key: 'gynob',      title: 'Gynecology & Obstetrics',             codes: ['GY','OB'] },
  { key: 'gastro',     title: 'Gastrointestinal & Abdominal',        codes: ['GA','LG'] },
  { key: 'dental',     title: 'Dental & Oral-Maxillofacial',         codes: ['DN','OM'] },
  { key: 'derm',       title: 'Dermatology & Minor Surgery',         codes: ['DM'] },
  { key: 'cutting',    title: 'Cutting & Dissecting',                codes: ['SL','SS'] },
  { key: 'grasping',   title: 'Grasping, Clamping & Hemostasis',     codes: ['FR','AF','CS'] },
  { key: 'retraction', title: 'Retraction & Exposure',               codes: ['RT'] },
  { key: 'suturing',   title: 'Suturing & Wound Closure',            codes: ['SU'] },
  { key: 'access',     title: 'Probes, Trocars & Suction',           codes: ['PB','TS'] },
  { key: 'diag',       title: 'Diagnostic & Dressing',               codes: ['DG','DR'] },
];

/* Minimum products before a category earns its own indexable URL. Below this
   the category stays an anchor on its section page — a page with four items
   and templated copy is exactly what a thin-content filter is built to catch. */
const CATEGORY_MIN_ITEMS = 6;

module.exports = { SITE, AUDIENCE, SECTION_SEO, CAT_OPENERS, SPECIALTIES, CATEGORY_MIN_ITEMS };
