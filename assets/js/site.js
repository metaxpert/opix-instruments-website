/* Opix Instruments — shared site JS */
const OPIX = {
  email: "info@opixinst.com",
  wa: "",            // e.g. "923001234567" — set your WhatsApp Business number (country code, no +)
  imgPath: "assets/img/products/"
};

const $ = id => document.getElementById(id);
const store = window.localStorage;
let cart = JSON.parse(store.getItem("opixCart") || "{}");
const ALL = Object.entries(SECTIONS).flatMap(([sec, s]) => s.items.map(it => ({sec, it})));
const findItem = sku => ALL.find(x => x.it[0] === sku)?.it;

function saveCart(){ store.setItem("opixCart", JSON.stringify(cart)); renderCount(); }
function renderCount(){ const el=$("cartCount"); if(el) el.textContent=Object.keys(cart).length; }

let tmr;
function toast(m){ const t=$("toast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(tmr); tmr=setTimeout(()=>t.classList.remove("show"),1800); }

/* ---------- inquiry drawer (present on every page) ---------- */
function renderDrawer(){
  const box=$("ditems"); if(!box) return;
  const keys=Object.keys(cart);
  box.innerHTML = keys.length ? keys.map(s=>{
    const p=findItem(s); if(!p) return "";
    return `<div class="ditem"><div class="nm">${p[1]}${p[2]?" — "+p[2]:""}</div><div class="sk">${s}${p[3]!=="N/A"?" · "+p[3]:""}</div>
      <div class="qty"><button data-a="-" data-s="${s}" aria-label="Decrease">−</button><input data-s="${s}" value="${cart[s].qty}" inputmode="numeric" aria-label="Quantity"><button data-a="+" data-s="${s}" aria-label="Increase">+</button></div>
      <button class="rm" data-s="${s}">Remove</button></div>`;
  }).join("") : `<div class="empty"><b>Your inquiry is empty</b>Add instruments from the catalog to request a quotation.</div>`;
  box.querySelectorAll(".qty button").forEach(b=>b.onclick=()=>{
    cart[b.dataset.s].qty=Math.max(1,cart[b.dataset.s].qty+(b.dataset.a==="+"?10:-10)); saveCart(); renderDrawer();
  });
  box.querySelectorAll(".qty input").forEach(i=>i.onchange=()=>{
    cart[i.dataset.s].qty=Math.max(1,parseInt(i.value)||1); saveCart(); renderDrawer();
  });
  box.querySelectorAll(".rm").forEach(b=>b.onclick=()=>{
    delete cart[b.dataset.s]; saveCart(); renderDrawer();
    if (typeof renderGrid==="function") renderGrid();
  });
}
function rfqText(){
  const lines=Object.entries(cart).map(([s,c])=>{const p=findItem(s);
    return `• ${s} — ${p[1]}${p[2]?" ("+p[2]+")":""}${p[3]!=="N/A"?", "+p[3]:""} — Qty: ${c.qty}`;});
  return `Request for Quotation — Opix Instruments\n\nDear Opix team,\n\nPlease quote the following items (CIF/FOB, lead time and MOQ):\n\n${lines.join("\n")}\n\nCompany:\nCountry:\nContact:\n\nThank you.`;
}
function wireDrawer(){
  const open=$("cartOpen"), close=$("cartClose"), ovl=$("ovl"), dr=$("drawer");
  if(!dr) return;
  open.onclick=()=>{dr.classList.add("open");ovl.classList.add("open");renderDrawer();};
  const shut=()=>{dr.classList.remove("open");ovl.classList.remove("open");};
  close.onclick=ovl.onclick=shut;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){shut();const z=$("zoom");if(z)z.classList.remove("open");}});
  $("sendEmail").onclick=()=>{
    if(!Object.keys(cart).length) return toast("Add items first");
    location.href=`mailto:${OPIX.email}?subject=${encodeURIComponent("RFQ — Surgical Instruments ("+Object.keys(cart).length+" items)")}&body=${encodeURIComponent(rfqText())}`;
  };
  $("sendWa").onclick=()=>{
    if(!Object.keys(cart).length) return toast("Add items first");
    window.open(`https://wa.me/${OPIX.wa}?text=${encodeURIComponent(rfqText())}`,"_blank");
  };
}

/* ---------- catalog page renderer ---------- */
let cat="all", query="", SEC=null, SECKEY=null;
function initCatalog(sectionKey){
  SECKEY=sectionKey; SEC=SECTIONS[sectionKey];
  renderCats(); renderGrid();
  $("q").oninput=e=>{query=e.target.value;renderGrid();};
  $("grid").addEventListener("click",e=>{
    const t=e.target.closest(".thumb img"); if(!t) return;
    const p=findItem(t.dataset.z);
    $("zimg").src=t.src; $("zt").textContent=p[1]+(p[2]?" — "+p[2]:""); $("zs").textContent=p[0]+(p[3]!=="N/A"?" · "+p[3]:"");
    $("zoom").classList.add("open");
  });
  $("zoom").onclick=()=>$("zoom").classList.remove("open");
}
function renderCats(){
  const cats={all:"All Products",...SEC.cats};
  $("cats").innerHTML=Object.entries(cats).map(([k,v])=>{
    const n=k==="all"?SEC.items.length:SEC.items.filter(p=>p[4]===k).length;
    return `<button class="cat ${k===cat?'on':''}" data-c="${k}"><span>${v}</span><span class="n">${n}</span></button>`;
  }).join("");
  document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{cat=b.dataset.c;renderCats();renderGrid();});
}
function renderGrid(){
  const q=query.trim().toLowerCase();
  const list=SEC.items.filter(p=>(cat==="all"||p[4]===cat)&&(!q||(p[0]+" "+p[1]+" "+p[2]+" "+p[3]).toLowerCase().includes(q)));
  $("catTitle").textContent=q?`Results for “${query.trim()}”`:(cat==="all"?"All Products":SEC.cats[cat]);
  $("meta").textContent=`${list.length} ITEM${list.length!==1?"S":""}`;
  if(!list.length){$("grid").innerHTML=`<div class="empty"><b>No matching instruments</b>Try a different spelling, or search by catalog number like ${SEC.items[0][0]}.</div>`;return;}
  $("grid").innerHTML=list.map(p=>`
    <div class="card">
      <div class="thumb"><img loading="lazy" src="${OPIX.imgPath}${p[0]}.jpg" alt="${p[1]} ${p[2]||""}" data-z="${p[0]}" onerror="this.parentElement.style.display='none'"></div>
      <div><div class="name">${p[1]}</div>${p[2]?`<div class="desc">${p[2]}</div>`:""}
        <div class="specs"><span class="tag sku">${p[0]}</span>${p[3]!=="N/A"?`<span class="tag">${p[3]}</span>`:""}</div>
      </div>
      <button class="addbtn ${cart[p[0]]?'in':''}" data-s="${p[0]}">${cart[p[0]]?'✓ In Inquiry':'Add to Inquiry'}</button>
    </div>`).join("");
  document.querySelectorAll(".addbtn").forEach(b=>b.onclick=()=>{
    const s=b.dataset.s;
    if(cart[s]){delete cart[s];toast("Removed from inquiry");}
    else{cart[s]={qty:10};toast("Added to inquiry");}
    saveCart();renderGrid();renderDrawer();
  });
}

/* mobile nav */
document.addEventListener("DOMContentLoaded",()=>{
  renderCount(); wireDrawer();
  const mm=$("mobmenu"); if(mm) mm.onclick=()=>document.querySelector("nav.main").classList.toggle("open");
});
