# -*- coding: utf-8 -*-
"""DEPRECATED — superseded by tools/seo/catalog.js.

This script used to emit a catalog-<code>.html shell whose product grid was
built client-side from data/products.js. That shell contained no product text,
so none of the ~9,720 products were reliably indexable and no category had a
URL of its own.

Catalogue pages are now generated with the products PRE-RENDERED into the HTML,
together with one landing page per category, by:

    node tools/seo/build.js          # or: node tools/regen.js  (chains into it)

Per-section titles, meta descriptions and intro copy live in
tools/seo/config.js under SECTION_SEO — add an entry there for a new section
code, then run the build. Nothing needs to be passed on the command line.
"""
import sys

sys.exit(__doc__)
