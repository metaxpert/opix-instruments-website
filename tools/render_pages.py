import pymupdf, sys, os
pdf, outdir, start, end, dpi = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
os.makedirs(outdir, exist_ok=True)
doc = pymupdf.open(pdf)
for i in range(start, end+1):
    pix = doc[i].get_pixmap(dpi=dpi)
    pix.save(os.path.join(outdir, f"p{i:03d}.png"))
print("rendered", start, "to", end, "->", outdir)
