/* Contact form → mailto handoff. Lifted out of an inline <script> so the
   Content-Security-Policy can eventually drop 'unsafe-inline' for script-src. */
document.addEventListener("DOMContentLoaded", function () {
  var btn = document.getElementById("sendForm");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : ""; };
    var body = "Name: " + g("fn") + "\nCompany: " + g("fc") + "\nEmail: " + g("fe") + "\n\n" + g("fm");
    location.href = "mailto:info@opixinst.com?subject=" +
      encodeURIComponent("Website Enquiry — " + (g("fc") || g("fn"))) +
      "&body=" + encodeURIComponent(body);
  });
});
