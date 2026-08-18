# -*- coding: utf-8 -*-
"""Insert a section block.txt into data/products.js before the final '};'. Idempotent."""
import sys
CODE, JDIR = sys.argv[1], sys.argv[2]
PJS = r"D:/Opix/opix-website/opix-site/data/products.js"
block = open(JDIR + "/block.txt", encoding="utf-8").read()
src = open(PJS, encoding="utf-8").read()
if ('"%s":' % CODE) in src:
    print("section %s already present; aborting" % CODE); sys.exit(2)
marker = "\n  }\n};"
idx = src.rfind(marker)
if idx == -1:
    print("SECTIONS closing marker not found"); sys.exit(1)
new = src[:idx] + "\n  },\n" + block + "\n};" + src[idx + len(marker):]
open(PJS, "w", encoding="utf-8", newline="\n").write(new)
print("inserted %s (len %d -> %d)" % (CODE, len(src), len(new)))
