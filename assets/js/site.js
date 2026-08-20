/* Opix Instruments — shared site JS.
   The catalogue grid is PRE-RENDERED into the HTML by tools/seo/build.js, so
   this file no longer builds it and no longer loads data/products.js (940 KB
   that every catalogue page used to pull down). It filters what is already in
   the document, which is both faster and means the products are in the served
   HTML where crawlers can read them. */
(function () {
  "use strict";

  var OPIX = {
    email: "info@opixinst.com",
    wa: "923316189184",            // WhatsApp Business number, country code, no +
  };

  var $ = function (id) { return document.getElementById(id); };
  var store = window.localStorage;

  /* ---------- inquiry cart ----------
     Stores name and size alongside the quantity. Previously the drawer looked
     each SKU up in the global product data; with the data file gone, the cart
     has to carry enough to render itself and to write the RFQ. */
  var cart = {};
  try { cart = JSON.parse(store.getItem("opixCart") || "{}") || {}; } catch (e) { cart = {}; }
  // Migrate carts saved by the old build ({sku:{qty}} with no name).
  Object.keys(cart).forEach(function (k) {
    if (!cart[k] || typeof cart[k] !== "object") delete cart[k];
    else if (!cart[k].name) cart[k].name = k;
  });

  function saveCart() {
    try { store.setItem("opixCart", JSON.stringify(cart)); } catch (e) {}
    renderCount(); syncButtons();
  }
  function renderCount() {
    var el = $("cartCount");
    if (el) el.textContent = Object.keys(cart).length;
  }

  var toastTimer;
  function toast(m) {
    var t = $("toast"); if (!t) return;
    t.textContent = m; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ---------- drawer ---------- */
  function renderDrawer() {
    var box = $("ditems"); if (!box) return;
    var keys = Object.keys(cart);
    if (!keys.length) {
      box.innerHTML = '<div class="empty"><b>Your inquiry is empty</b>Add instruments from the catalog to request a quotation.</div>';
      return;
    }
    box.innerHTML = keys.map(function (s) {
      var c = cart[s];
      return '<div class="ditem"><div class="nm">' + esc(c.name || s) + '</div>' +
        '<div class="sk">' + esc(s) + (c.size ? ' · ' + esc(c.size) : '') + '</div>' +
        '<div class="qty">' +
          '<button type="button" data-a="-" data-s="' + esc(s) + '" aria-label="Decrease quantity">\u2212</button>' +
          '<input data-s="' + esc(s) + '" value="' + c.qty + '" inputmode="numeric" aria-label="Quantity for ' + esc(s) + '">' +
          '<button type="button" data-a="+" data-s="' + esc(s) + '" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<button type="button" class="rm" data-s="' + esc(s) + '">Remove</button></div>';
    }).join("");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function rfqText() {
    var lines = Object.keys(cart).map(function (s) {
      var c = cart[s];
      return "• " + s + " — " + (c.name || "") + (c.size ? ", " + c.size : "") + " — Qty: " + c.qty;
    });
    return "Request for Quotation — Opix Instruments\n\nDear Opix team,\n\n" +
      "Please quote the following items (CIF/FOB, lead time and MOQ):\n\n" +
      lines.join("\n") + "\n\nCompany:\nCountry:\nContact:\n\nThank you.";
  }

  function wireDrawer() {
    var dr = $("drawer"); if (!dr) return;
    var open = $("cartOpen"), close = $("cartClose"), ovl = $("ovl");
    function shut() { dr.classList.remove("open"); ovl.classList.remove("open"); }
    if (open) open.onclick = function () { dr.classList.add("open"); ovl.classList.add("open"); renderDrawer(); };
    if (close) close.onclick = shut;
    if (ovl) ovl.onclick = shut;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { shut(); var z = $("zoom"); if (z) z.classList.remove("open"); }
    });

    // Quantity / remove — delegated, so re-rendering the list keeps working.
    $("ditems").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var s = b.dataset.s; if (!s || !cart[s]) return;
      if (b.classList.contains("rm")) { delete cart[s]; }
      else if (b.dataset.a === "+") { cart[s].qty += 10; }
      else if (b.dataset.a === "-") { cart[s].qty = Math.max(1, cart[s].qty - 10); }
      else return;
      saveCart(); renderDrawer();
    });
    $("ditems").addEventListener("change", function (e) {
      var i = e.target; if (i.tagName !== "INPUT") return;
      var s = i.dataset.s; if (!cart[s]) return;
      cart[s].qty = Math.max(1, parseInt(i.value, 10) || 1);
      saveCart(); renderDrawer();
    });

    $("sendEmail").onclick = function () {
      if (!Object.keys(cart).length) return toast("Add items first");
      location.href = "mailto:" + OPIX.email +
        "?subject=" + encodeURIComponent("RFQ — Surgical Instruments (" + Object.keys(cart).length + " items)") +
        "&body=" + encodeURIComponent(rfqText());
    };
    $("sendWa").onclick = function () {
      if (!Object.keys(cart).length) return toast("Add items first");
      window.open("https://wa.me/" + OPIX.wa + "?text=" + encodeURIComponent(rfqText()), "_blank", "noopener");
    };
  }

  /* ---------- catalogue grid: filter the pre-rendered cards ---------- */
  var grid, cards, metaEl, titleEl, baseTitle;

  function syncButtons() {
    if (!cards) return;
    for (var i = 0; i < cards.length; i++) {
      var b = cards[i].querySelector(".addbtn"); if (!b) continue;
      var inCart = !!cart[b.dataset.sku];
      b.classList.toggle("in", inCart);
      b.textContent = inCart ? "✓ In Inquiry" : "Add to Inquiry";
    }
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var hit = !q || cards[i].dataset.s.indexOf(q) !== -1;
      cards[i].hidden = !hit;
      if (hit) shown++;
    }
    if (metaEl) metaEl.textContent = shown + " ITEM" + (shown !== 1 ? "S" : "");
    if (titleEl) titleEl.textContent = q ? 'Results for “' + q + '”' : baseTitle;
    var empty = document.getElementById("noHits");
    if (!shown && !empty) {
      empty = document.createElement("div");
      empty.id = "noHits"; empty.className = "empty";
      empty.innerHTML = "<b>No matching instruments</b>Try a different spelling, or search by catalog number.";
      grid.appendChild(empty);
    }
    if (empty) empty.hidden = shown > 0;
  }

  function wireCatalog() {
    grid = $("grid"); if (!grid) return;
    cards = grid.querySelectorAll(".card");
    metaEl = $("meta"); titleEl = $("catTitle");
    baseTitle = titleEl ? titleEl.textContent : "";
    syncButtons();

    var q = $("q"), t;
    if (q) {
      q.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () { filter(q.value); }, 120);
      });
    }

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".addbtn");
      if (btn) {
        var sku = btn.dataset.sku;
        if (cart[sku]) { delete cart[sku]; toast("Removed from inquiry"); }
        else { cart[sku] = { qty: 10, name: btn.dataset.name || sku, size: btn.dataset.size || "" }; toast("Added to inquiry"); }
        saveCart(); renderDrawer();
        return;
      }
      var img = e.target.closest(".thumb img");
      if (img) {
        var card = img.closest(".card");
        var b = card.querySelector(".addbtn");
        $("zimg").src = img.src;
        $("zimg").alt = img.alt;
        $("zt").textContent = b ? b.dataset.name : "";
        $("zs").textContent = card.id + (b && b.dataset.size ? " · " + b.dataset.size : "");
        $("zoom").classList.add("open");
      }
    });

    var z = $("zoom");
    if (z) z.onclick = function () { z.classList.remove("open"); };
  }

  /* ---------- floating WhatsApp button ---------- */
  function wireWhatsApp() {
    if (!OPIX.wa) return;
    var a = document.createElement("a");
    a.className = "wafab";
    a.href = "https://wa.me/" + OPIX.wa + "?text=" +
      encodeURIComponent("Hello Opix Instruments, I'd like to enquire about your surgical instruments.");
    a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "Chat with Opix Instruments on WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-1.8c1.9 1 4 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.8c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-4.1 1.1 1.1-4-.3-.4a10 10 0 0 1-1.6-5.4C5.5 9.9 10.2 5.3 16 5.3S26.5 9.9 26.5 15.5 21.8 25.8 16 25.8zm5.7-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg><span class="walabel">Chat on WhatsApp</span>';
    document.body.appendChild(a);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderCount(); wireDrawer(); wireCatalog(); wireWhatsApp();
    var mm = $("mobmenu");
    if (mm) mm.onclick = function () {
      var nav = document.querySelector("nav.main");
      var open = nav.classList.toggle("open");
      mm.setAttribute("aria-expanded", open ? "true" : "false");
    };
  });
})();
