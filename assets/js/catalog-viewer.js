/* Catalogue search + viewer (catalog-viewer.html).

   Two indexes, both written by tools/ocr_catalogs.py + the site build:
     /assets/catalog-index/_products.json  every catalogue number → its PDF page
     /assets/catalog-index/<code>.json     every OCR'd line, with its box, per page
   A search across all catalogues looks up products; a search inside one
   catalogue also matches every word printed in it. The page is drawn with
   PDF.js and the matching words are boxed over it.

   URL state: ?q=<query>&c=<code>&p=<page> — shareable, and what the "PDF p.N"
   links on the product cards open. */
import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const compact = (s) => norm(s).replace(/[^a-z0-9]/g, "");

let PRODUCTS = null;              // {codes:{SS:{title,file,pages}}, items:[[sku,name,code,page]]}
const LINES = {};                 // code -> index json
const DOCS = {};                  // code -> PDF.js document promise
let cur = { c: "", p: 1, q: "" }; // what is on screen
let renderTask = null;

async function products() {
  if (!PRODUCTS) PRODUCTS = await (await fetch("/assets/catalog-index/_products.json")).json();
  return PRODUCTS;
}
async function lines(code) {
  if (!LINES[code]) LINES[code] = await (await fetch(`/assets/catalog-index/${code.toLowerCase()}.json`)).json();
  return LINES[code];
}
function doc(code) {
  if (!DOCS[code]) {
    DOCS[code] = products().then((P) => pdfjsLib.getDocument({
      url: P.codes[code].file, isEvalSupported: false, disableAutoFetch: true, rangeChunkSize: 262144,
    }).promise);
  }
  return DOCS[code];
}

/* ---------- matching ---------- */
function terms(q) { return norm(q).split(/\s+/).filter(Boolean); }

/* A line matches when every term is in it; catalogue numbers also match with
   the punctuation ignored ("ss4141" finds "SS-414-1"). */
function lineMatches(text, q) {
  const t = norm(text), ts = terms(q);
  if (!ts.length) return false;
  if (ts.every((w) => t.includes(w))) return true;
  const cq = compact(q);
  return cq.length >= 4 && compact(text).includes(cq);
}

/* Character span of the query inside a line, for a tighter highlight box. */
function span(text, q) {
  const t = norm(text), n = norm(q).trim();
  let i = t.indexOf(n);
  if (i >= 0) return [i, i + n.length];
  const ts = terms(q);
  const hits = ts.map((w) => [t.indexOf(w), w.length]).filter(([a]) => a >= 0);
  if (hits.length === ts.length) {
    const a = Math.min(...hits.map((h) => h[0])), b = Math.max(...hits.map((h) => h[0] + h[1]));
    return [a, b];
  }
  return [0, text.length];
}

function productHits(P, q, code) {
  const cq = compact(q), ts = terms(q);
  const out = [];
  for (const it of P.items) {
    if (code && it[2] !== code) continue;
    const sku = compact(it[0]);
    let score = 0;
    if (cq && sku === cq) score = 100;
    else if (cq.length >= 3 && sku.startsWith(cq)) score = 80;
    else if (ts.length && ts.every((w) => norm(it[1] + " " + it[0]).includes(w))) score = 50;
    if (score) out.push([score, it]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1][0].localeCompare(b[1][0], undefined, { numeric: true }));
  return out.map((x) => x[1]);
}

/* ---------- results ---------- */
async function search(q, code) {
  const P = await products();
  const res = $("cvRes");
  q = q.trim();
  if (!q) {
    res.innerHTML = "";
    if (code) await show(code, cur.c === code ? cur.p : 1, "");
    return;
  }
  res.innerHTML = '<p class="cvmuted">Searching…</p>';
  const prods = productHits(P, q, code).slice(0, 80);
  let pages = [];
  if (code) {
    const L = await lines(code);
    L.pages.forEach((pg, i) => {
      const m = pg.filter((l) => lineMatches(l[4], q));
      if (m.length) pages.push([i + 1, m]);
    });
  }
  let h = "";
  if (prods.length) {
    h += `<h2>Products <span>${prods.length}${prods.length === 80 ? "+" : ""}</span></h2><ul class="cvlist">`
      + prods.map(([sku, name, c, p]) => `<li><a href="?q=${encodeURIComponent(sku)}&c=${c.toLowerCase()}&p=${p}" data-c="${c}" data-p="${p}" data-q="${esc(sku)}"><b>${esc(sku)}</b> ${esc(name)}<small>${esc(P.codes[c].title)} · page ${p}</small></a></li>`).join("")
      + "</ul>";
  }
  if (pages.length) {
    h += `<h2>In this catalogue <span>${pages.length} page${pages.length > 1 ? "s" : ""}</span></h2><ul class="cvlist">`
      + pages.slice(0, 150).map(([p, m]) => `<li><a href="?q=${encodeURIComponent(q)}&c=${code.toLowerCase()}&p=${p}" data-c="${code}" data-p="${p}" data-q="${esc(q)}"><b>Page ${p}</b> ${esc(m.slice(0, 3).map((l) => l[4]).join(" · "))}${m.length > 3 ? " …" : ""}</a></li>`).join("")
      + "</ul>";
  }
  if (!h) {
    h = `<p class="cvmuted">Nothing found for “${esc(q)}”${code ? " in " + esc(P.codes[code].title) : ""}.`
      + (code ? ' <a href="#" data-all="1">Search all catalogues</a>' : " Pick a catalogue above to search every word printed in it.")
      + "</p>";
  }
  res.innerHTML = h;
  const first = res.querySelector("a[data-p]");
  // Open the best hit straight away, unless the URL already names a page.
  if (first && !(cur.c === code && cur.p && new URLSearchParams(location.search).get("p"))) first.click();
  else if (cur.c) highlight();
}

/* ---------- page view ---------- */
async function show(code, p, q) {
  const P = await products();
  const meta = P.codes[code];
  if (!meta) return;
  p = Math.min(Math.max(1, +p || 1), meta.pages);
  cur = { c: code, p, q };
  $("cvView").hidden = false;
  $("cvTitle").textContent = meta.title;
  $("cvPages").textContent = meta.pages;
  $("cvPg").value = p;
  $("cvPg").max = meta.pages;
  $("cvOpen").href = `${meta.file}#page=${p}${q ? "&search=" + encodeURIComponent(q) : ""}`;
  $("cvPrev").disabled = p <= 1;
  $("cvNext").disabled = p >= meta.pages;
  $("cvRes").querySelectorAll("a.on").forEach((a) => a.classList.remove("on"));
  $("cvRes").querySelectorAll(`a[data-c="${code}"][data-p="${p}"]`).forEach((a) => a.classList.add("on"));
  syncURL();
  $("cvHl").innerHTML = "";
  $("cvLoad").hidden = false;
  try {
    const d = await doc(code);
    const page = await d.getPage(p);
    if (cur.c !== code || cur.p !== p) return;           // the user moved on
    const box = $("cvPage"), canvas = $("cvCanvas");
    const base = page.getViewport({ scale: 1 });
    const cssW = box.clientWidth || 800;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const vp = page.getViewport({ scale: (cssW / base.width) * dpr });
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.style.width = cssW + "px"; canvas.style.height = (vp.height / dpr) + "px";
    if (renderTask) renderTask.cancel();
    renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
    await renderTask.promise;
    renderTask = null;
  } catch (e) {
    if (e && e.name === "RenderingCancelledException") return;
    $("cvHl").innerHTML = `<p class="cvmuted cverr">Could not load this page. <a href="${esc(meta.file)}#page=${p}" target="_blank" rel="noopener">Open the PDF</a> instead.</p>`;
  } finally {
    $("cvLoad").hidden = true;
  }
  await highlight();
}

async function highlight() {
  const { c, p, q } = cur;
  const hl = $("cvHl");
  hl.innerHTML = "";
  if (!c || !q) return;
  const L = await lines(c);
  const pg = L.pages[p - 1] || [];
  let first = null;
  for (const [x0, y0, x1, y1, text] of pg) {
    if (!lineMatches(text, q)) continue;
    const [a, b] = span(text, q), n = Math.max(text.length, 1), w = x1 - x0;
    const el = document.createElement("i");
    el.style.left = (x0 + w * (a / n)) * 100 - 0.4 + "%";
    el.style.width = w * ((b - a) / n) * 100 + 0.8 + "%";
    el.style.top = y0 * 100 - 0.25 + "%";
    el.style.height = (y1 - y0) * 100 + 0.5 + "%";
    hl.appendChild(el);
    first = first || el;
  }
  // Bring the first highlight into view on long pages / small screens.
  if (first) {
    const r = first.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight - 40) window.scrollBy({ top: r.top - innerHeight / 3, behavior: "smooth" });
  }
}

function syncURL() {
  const u = new URLSearchParams();
  const q = $("cvQ").value.trim();
  if (q) u.set("q", q);
  if (cur.c) { u.set("c", cur.c.toLowerCase()); u.set("p", cur.p); }
  else if ($("cvC").value) u.set("c", $("cvC").value.toLowerCase());
  history.replaceState(null, "", "?" + u.toString());
}

/* ---------- wiring ---------- */
$("cvForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("cvC").value;
  cur.p = 0;
  history.replaceState(null, "", "?" + new URLSearchParams({ q: $("cvQ").value.trim(), ...(code ? { c: code.toLowerCase() } : {}) }));
  search($("cvQ").value, code);
});
$("cvC").addEventListener("change", () => $("cvForm").requestSubmit());
$("cvRes").addEventListener("click", (e) => {
  const all = e.target.closest("[data-all]");
  if (all) { e.preventDefault(); $("cvC").value = ""; $("cvForm").requestSubmit(); return; }
  const a = e.target.closest("a[data-p]");
  if (!a) return;
  e.preventDefault();
  show(a.dataset.c, +a.dataset.p, a.dataset.q);
});
$("cvPrev").onclick = () => show(cur.c, cur.p - 1, cur.q);
$("cvNext").onclick = () => show(cur.c, cur.p + 1, cur.q);
$("cvPg").onchange = (e) => show(cur.c, +e.target.value, cur.q);
document.addEventListener("keydown", (e) => {
  if (!cur.c || /input|select|textarea/i.test(e.target.tagName)) return;
  if (e.key === "ArrowLeft") $("cvPrev").click();
  if (e.key === "ArrowRight") $("cvNext").click();
});
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => cur.c && show(cur.c, cur.p, cur.q), 250); });

/* Start from the URL. */
(async () => {
  const u = new URLSearchParams(location.search);
  const q = u.get("q") || "", c = (u.get("c") || "").toUpperCase(), p = +u.get("p") || 0;
  $("cvQ").value = q;
  const P = await products();
  if (c && P.codes[c]) $("cvC").value = c;
  if (c && P.codes[c] && p) { cur = { c, p, q }; await show(c, p, q); }
  if (q || c) search(q, P.codes[c] ? c : "");
  else $("cvQ").focus();
})();
