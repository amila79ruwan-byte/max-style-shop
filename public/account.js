// My Account page: sign in / sign up (phone + 4-digit PIN), profile, orders, saved addresses, settings.
// Loaded after shop.js, so it uses its helpers (esc, fmt, hideDrawers, downloadBill, loadMyOrders, deliveryText, WHATSAPP).
(function () {
const TK = "maxstyle_token";
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
// Main towns of each district (the last choice "Other" lets the customer type any town).
const CITIES = {
  "Colombo":["Colombo","Dehiwala","Mount Lavinia","Moratuwa","Nugegoda","Maharagama","Kotte","Battaramulla","Rajagiriya","Kaduwela","Homagama","Piliyandala","Kesbewa","Avissawella","Padukka","Boralesgamuwa","Kolonnawa","Kottawa","Athurugiriya","Malabe"],
  "Gampaha":["Gampaha","Negombo","Ja-Ela","Wattala","Kelaniya","Kadawatha","Ragama","Minuwangoda","Divulapitiya","Nittambuwa","Veyangoda","Katunayake","Seeduwa","Kiribathgoda","Delgoda","Mirigama","Attanagalla"],
  "Kalutara":["Kalutara","Panadura","Horana","Beruwala","Aluthgama","Matugama","Bandaragama","Wadduwa","Ingiriya","Agalawatta","Bulathsinhala"],
  "Kandy":["Kandy","Peradeniya","Katugastota","Gampola","Nawalapitiya","Pilimathalawa","Kundasale","Akurana","Digana","Wattegama","Teldeniya","Pallekele","Ampitiya"],
  "Matale":["Matale","Dambulla","Rattota","Ukuwela","Galewela","Sigiriya","Naula","Pallepola"],
  "Nuwara Eliya":["Nuwara Eliya","Hatton","Talawakele","Nanu Oya","Ginigathhena","Maskeliya","Kotagala","Ragala","Walapane"],
  "Galle":["Galle","Hikkaduwa","Ambalangoda","Elpitiya","Baddegama","Karapitiya","Unawatuna","Bentota","Ahangama","Habaraduwa","Yakkalamulla"],
  "Matara":["Matara","Weligama","Akuressa","Dikwella","Kamburupitiya","Hakmana","Deniyaya","Mirissa","Devinuwara"],
  "Hambantota":["Hambantota","Tangalle","Tissamaharama","Ambalantota","Beliatta","Weeraketiya","Kataragama","Sooriyawewa"],
  "Jaffna":["Jaffna","Nallur","Chavakachcheri","Point Pedro","Karainagar","Kopay","Tellippalai","Chunnakam"],
  "Kilinochchi":["Kilinochchi","Pallai","Paranthan","Poonakary"],
  "Mannar":["Mannar","Nanattan","Madhu","Pesalai"],
  "Vavuniya":["Vavuniya","Nedunkeni","Cheddikulam"],
  "Mullaitivu":["Mullaitivu","Puthukudiyiruppu","Oddusuddan","Mankulam"],
  "Batticaloa":["Batticaloa","Kattankudy","Eravur","Valaichchenai","Kalkudah"],
  "Ampara":["Ampara","Kalmunai","Akkaraipattu","Sainthamaruthu","Pottuvil","Uhana","Dehiattakandiya","Sammanthurai"],
  "Trincomalee":["Trincomalee","Kinniya","Mutur","Kantale","Nilaveli"],
  "Kurunegala":["Kurunegala","Kuliyapitiya","Narammala","Wariyapola","Pannala","Nikaweratiya","Mawathagama","Polgahawela","Alawwa","Galgamuwa","Ibbagamuwa"],
  "Puttalam":["Puttalam","Chilaw","Wennappuwa","Marawila","Nattandiya","Dankotuwa","Anamaduwa","Kalpitiya"],
  "Anuradhapura":["Anuradhapura","Kekirawa","Tambuttegama","Eppawala","Medawachchiya","Galenbindunuwewa","Mihintale","Padaviya"],
  "Polonnaruwa":["Polonnaruwa","Hingurakgoda","Medirigiriya","Kaduruwela","Dimbulagala"],
  "Badulla":["Badulla","Bandarawela","Hali-Ela","Haputale","Welimada","Mahiyanganaya","Passara","Ella","Diyatalawa"],
  "Monaragala":["Monaragala","Wellawaya","Bibile","Buttala","Siyambalanduwa","Medagama"],
  "Ratnapura":["Ratnapura","Embilipitiya","Balangoda","Pelmadulla","Kuruwita","Eheliyagoda","Kahawatta","Rakwana"],
  "Kegalle":["Kegalle","Mawanella","Warakapola","Rambukkana","Ruwanwella","Galigamuwa","Yatiyantota","Dehiowita","Aranayaka"]
};
const STL = {received:"Received",confirmed:"Confirmed",packed:"Packed",out:"Out for delivery",delivered:"Delivered",cancelled:"Cancelled"};
const ICON_BOX = '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>';
const ICON_HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/></svg>';

const CSS = `#accModal{position:fixed;inset:0;background:#f3f3f3;z-index:86;overflow-y:auto;color:#111}
.ac-top{background:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;position:sticky;top:0;z-index:1}
.ac-top h2{font-size:18px;text-align:center;flex:1}
.ac-top button{background:none;border:0;font-size:16px;width:auto;padding:4px 6px;color:#111;min-width:50px;text-align:left}
.ac-top span{min-width:50px}
.ac-body{padding:14px 16px 40px;max-width:560px;margin:auto}
.ac-hi{font-size:20px;margin:6px 0 12px}
.ac-gold{width:100%;padding:14px;background:#c49a5c;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:16px;margin-bottom:14px}
.ac-tiles{display:grid;grid-template-columns:repeat(3,1fr);background:#fff;border-radius:10px;padding:14px 6px;margin-bottom:12px}
.ac-tiles button{background:none;border:0;font-size:13px;color:#111;display:flex;flex-direction:column;align-items:center;gap:6px;width:auto;margin:0}
.ac-tiles svg{width:26px;height:26px;fill:none;stroke:#8a6a1f;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ac-list{background:#fff;border-radius:10px;margin-bottom:12px;overflow:hidden}
.ac-list>*{display:flex;width:100%;justify-content:space-between;align-items:center;background:#fff;border:0;border-bottom:1px solid #eee;padding:15px 14px;font-size:15px;color:#111;text-align:left;margin:0;text-decoration:none;cursor:pointer}
.ac-list>*:last-child{border-bottom:0}
.ac-list>*::after{content:"\\203A";color:#999;font-size:20px}
.ac-card{background:#fff;border-radius:10px;padding:14px;margin-bottom:12px;font-size:15px;line-height:1.5}
.ac-f label{font-size:13px;color:#555;display:block;margin:8px 0 4px}
.ac-f input,.ac-f select,.ac-f textarea{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font:inherit;font-size:16px;background:#fff;margin-bottom:4px}
.ac-f input:disabled{background:#eee;color:#666}
.ac-f .ac-chk{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:14px;color:#111}
.ac-f .ac-chk input{width:20px;height:20px;margin:0}
.ac-btn{width:100%;padding:13px;background:#111;color:#f3d27a;border:0;border-radius:8px;font-weight:700;font-size:16px;margin-top:10px}
.ac-sec{width:100%;padding:12px;background:#eee;color:#111;border:0;border-radius:8px;font-weight:700;margin-top:10px}
.ac-danger{width:100%;padding:12px;background:#fff;color:#c62828;border:1px solid #c62828;border-radius:8px;font-weight:700;margin-top:10px}
.ac-tabs{display:flex;gap:6px;margin-bottom:12px}
.ac-tabs button{flex:1;padding:10px;border:1px solid #111;background:#fff;color:#111;border-radius:8px;font-weight:700;width:auto;margin:0}
.ac-tabs button.on{background:#111;color:#f3d27a}
.ac-err{color:#c62828;font-size:14px;margin-top:6px;min-height:18px}
.ac-ord{border-bottom:1px solid #eee;padding:10px 0;font-size:14px}
.ac-ord:last-child{border-bottom:0}
.ac-ord button{margin-top:6px;padding:8px 12px;border:1px solid #111;background:#fff;color:#111;border-radius:6px;font-weight:700;width:auto}
.ac-addr{border-bottom:1px solid #eee;padding:12px 0;font-size:14px;line-height:1.45}
.ac-addr:last-child{border-bottom:0}
.ac-addr button{margin:8px 6px 0 0;padding:7px 12px;border:1px solid #111;background:#fff;color:#111;border-radius:6px;font-weight:700;font-size:13px;width:auto}
.ac-addr button.d{border-color:#c62828;color:#c62828}
.ac-badge{display:inline-block;background:#111;color:#f3d27a;border-radius:6px;padding:1px 8px;font-size:11px;font-weight:700;margin-left:6px}
.ac-muted{color:#666;font-size:13px}`;

let P = null, view = "home", curOrders = [], editAddr = null;

const getTok = () => { try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; } };
const setTok = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} };
// shop.js uses this so the server knows the customer is signed in (needed for the first order discount).
window.getMaxToken = getTok;
const dateTxt = t => new Date(t).toLocaleString("en-GB", { timeZone: "Asia/Colombo" });

function post(body) {
  return fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then(async r => ({ ok: r.ok, status: r.status, d: await r.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, status: 0, d: { error: "Network error. Please try again." } }));
}
async function loadProfile() {
  const t = getTok(); P = null;
  if (!t) return;
  try {
    const r = await fetch("/api/account", { headers: { authorization: "Bearer " + t } });
    if (r.ok) { const d = await r.json(); P = d.profile; P.orders = d.orders || []; P.addresses = d.addresses || []; }
    else if (r.status === 401) setTok("");
  } catch (e) {}
}

// ---- Checkout: saved addresses ----
const defAddr = () => P && P.addresses && (P.addresses.find(a => a.is_default) || P.addresses[0]);
function addrLine(a) { return a.address + (a.city ? ", " + a.city : "") + (a.postal ? " " + a.postal : ""); }
function setField(id, val) {
  const e = document.getElementById(id); if (!e) return;
  e.value = val || "";
  e.dispatchEvent(new Event("input", { bubbles: true }));
}
// Put one saved address into the checkout form.
function applyAddr(a) {
  if (!a) return;
  if (window.msApplyAddr) return window.msApplyAddr(a);
  setField("name", a.name); setField("phone", a.phone); setField("phone2", a.phone2);
  setField("district", a.district); setField("addr", addrLine(a));
}
// Drop-down at the top of the delivery details page: choose a saved address, or type a different one.
function refreshPicker() {
  const co = document.querySelector("#checkout .co"); if (!co) return;
  let sel = document.getElementById("addrPick");
  if (!P || !P.addresses || !P.addresses.length) { if (sel) sel.remove(); return; }
  if (!sel) {
    sel = document.createElement("select"); sel.id = "addrPick";
    sel.style.cssText = "width:100%;padding:12px;border:1px solid var(--line);border-radius:6px;margin-bottom:10px;font:inherit;font-size:15px";
    sel.addEventListener("change", () => {
      if (!P) return;
      const a = P.addresses.find(x => String(x.id) === sel.value);
      if (a) applyAddr(a);
      else ["name", "phone", "phone2", "addr", "district"].forEach(id => setField(id, ""));
    });
    co.insertBefore(sel, co.firstChild);
  }
  const d = defAddr();
  sel.innerHTML = P.addresses.map(a => '<option value="' + a.id + '">' + esc(a.name + " · " + (a.city || a.district)) + (a.is_default ? " ★" : "") + '</option>').join("")
    + '<option value="">+ Enter a different address</option>';
  if (d) sel.value = String(d.id);
}
// Fill the checkout form with the default saved address (only when the form is empty).
function fillCheckout() {
  refreshPicker();
  if (window.msFill) return window.msFill();
  if (!P) return;
  const nm = document.getElementById("name");
  if (!nm || nm.value) return;
  const d = defAddr();
  if (d) applyAddr(d);
  else { setField("name", P.name); setField("phone", P.phone); setField("phone2", P.phone2); setField("addr", P.address); setField("district", P.district); }
}
function serverBills() {
  return (P && P.orders || []).map(o => ({
    code: o.code, created: o.created, name: o.name, phone1: o.phone1, phone2: o.phone2,
    district: o.district, address: o.address, status: o.status, total: o.total,
    items: (o.items || []).map(i => ({ name: i.name, size: i.size, color: i.color, qty: i.qty, amount: (Number(i.price) || 0) * i.qty }))
  }));
}

function homeHtml() {
  const guest = !P;
  return '<h3 class="ac-hi">Hi, ' + esc(guest ? "Guest" : P.name) + '!</h3>'
    + (guest ? '<button class="ac-gold" data-act="goSignin">Sign Up or Sign in</button>' : '')
    + '<div class="ac-tiles">'
    +   '<button data-act="purchases">' + ICON_BOX + '<span>Purchases</span></button>'
    +   '<button data-act="lists">' + ICON_HEART + '<span>My Lists</span></button>'
    +   '<button data-act="addresses">' + ICON_PIN + '<span>Addresses</span></button>'
    + '</div>'
    + '<div class="ac-list">'
    +   '<button data-act="settings">Settings</button>'
    +   '<a href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">Contact Us</a>'
    +   '<button data-act="faq">FAQs</button>'
    +   '<button data-act="about">About Us</button>'
    +   (guest ? '' : '<button data-act="logout">Log out</button>')
    + '</div>';
}
function authHtml() {
  const up = view === "signup";
  return '<div class="ac-tabs"><button data-act="tabIn" class="' + (up ? '' : 'on') + '">Sign in</button>'
    + '<button data-act="tabUp" class="' + (up ? 'on' : '') + '">Sign up</button></div>'
    + '<div class="ac-card ac-f">'
    + (up ? '<label>Name</label><input id="aN" autocomplete="name">' : '')
    + '<label>Phone number</label><input id="aP" inputmode="tel" placeholder="07XXXXXXXX">'
    + '<label>4-digit PIN</label><input id="aPin" type="password" inputmode="numeric" maxlength="4">'
    + (up ? '<label>Second phone (optional)</label><input id="aP2" inputmode="tel">'
      + '<label>District</label><select id="aD"><option value="">Select district</option>' + DISTRICTS.map(d => '<option>' + d + '</option>').join("") + '</select>'
      + '<label>Delivery address</label><textarea id="aA" rows="3"></textarea>' : '')
    + '<button class="ac-btn" data-act="' + (up ? 'doSignup' : 'doLogin') + '">' + (up ? 'Create account' : 'Sign in') + '</button>'
    + '<div class="ac-err" id="aErr"></div>'
    + (up ? '' : '<a href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent("Hi Max Style, I forgot my PIN. Please reset it for me. My phone number: ") + '" onclick="var i=document.getElementById(\'aP\');this.href=\'https://wa.me/' + WHATSAPP + '?text=\'+encodeURIComponent(\'Hi Max Style, I forgot my PIN. Please reset it for me. My phone number: \'+(i?i.value.trim():\'\'))" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:12px;color:#1a7f37;font-weight:600;text-decoration:none">Forgot your PIN? Message us on WhatsApp</a>')
    + '</div>';
}
function purchases() {
  curOrders = P ? serverBills() : loadMyOrders();
  if (!curOrders.length) {
    return '<div class="ac-card">No orders yet.</div>' + (P ? '' : '<button class="ac-gold" data-act="goSignin">Sign in to see orders from any phone</button>');
  }
  return '<div class="ac-card">' + curOrders.map((b, i) =>
    '<div class="ac-ord"><b>' + esc(b.code) + '</b> · Rs. ' + fmt(b.total) + (b.status ? ' · ' + esc(STL[b.status] || b.status) : '')
    + '<br><span class="ac-muted">' + esc(dateTxt(b.created)) + '</span><br>'
    + '<span class="ac-muted">Delivery within 5 working days, by ' + esc(deliveryText(b.created)) + '</span><br>'
    + '<button data-bill="' + i + '">Download bill</button>'
    + ((P && b.status === 'out') ? ' <button data-confirm="' + i + '">I received my order</button>' : '')
    + '</div>').join("") + '</div>';
}

// ---- Addresses page (list) and the add/edit form ----
function addressesHtml() {
  if (!P) return '<div class="ac-card">Sign in to save addresses.</div><button class="ac-gold" data-act="goSignin">Sign Up or Sign in</button>';
  const list = P.addresses || [];
  return '<button class="ac-gold" data-act="addrNew">+ Add new address</button>'
    + (list.length ? '<div class="ac-card">' + list.map(a =>
        '<div class="ac-addr"><b>' + esc(a.name) + '</b>' + (a.is_default ? '<span class="ac-badge">Default</span>' : '')
        + '<br>' + esc(a.address) + '<br>' + esc([a.city, a.district].filter(Boolean).join(", ")) + (a.postal ? ' · ' + esc(a.postal) : '')
        + '<br><span class="ac-muted">' + esc(a.phone) + (a.phone2 ? ' / ' + esc(a.phone2) : '') + '</span><br>'
        + '<button data-ae="' + a.id + '">Edit</button>'
        + (a.is_default ? '' : '<button data-adef="' + a.id + '">Set as default</button>')
        + '<button class="d" data-ad="' + a.id + '">Delete</button></div>').join("") + '</div>'
      : '<div class="ac-card">No saved addresses yet. Tap "Add new address".</div>');
}
function cityOptions(district, selected) {
  const list = CITIES[district] || [];
  const inList = list.includes(selected);
  return '<option value="">Select city</option>'
    + list.map(c => '<option' + (c === selected ? ' selected' : '') + '>' + esc(c) + '</option>').join("")
    + '<option value="__other"' + (selected && !inList ? ' selected' : '') + '>Other</option>';
}
function addrFormHtml() {
  const a = editAddr || {};
  const isNew = !a.id;
  const dist = a.district || "";
  const cityOther = a.city && !(CITIES[dist] || []).includes(a.city);
  return '<div class="ac-card ac-f">'
    + '<label>Name</label><input id="fN" autocomplete="name" value="' + esc(isNew ? (P ? P.name : "") : a.name) + '">'
    + '<label>District</label><select id="fD"><option value="">Select district</option>'
    + DISTRICTS.map(d => '<option' + (d === dist ? ' selected' : '') + '>' + d + '</option>').join("") + '</select>'
    + '<label>City</label><select id="fC">' + cityOptions(dist, a.city) + '</select>'
    + '<input id="fCo" placeholder="Type your city" style="display:' + (cityOther ? 'block' : 'none') + '" value="' + esc(cityOther ? a.city : "") + '">'
    + '<label>Postal code</label><input id="fPo" inputmode="numeric" maxlength="10" value="' + esc(a.postal || "") + '">'
    + '<label>Address</label><textarea id="fA" rows="3">' + esc(a.address || "") + '</textarea>'
    + '<label>Phone number</label><input id="fP" inputmode="tel" value="' + esc(isNew ? (P ? P.phone : "") : a.phone) + '">'
    + '<label>Second phone number (optional)</label><input id="fP2" inputmode="tel" value="' + esc(a.phone2 || "") + '">'
    + (isNew || !a.is_default ? '<label class="ac-chk"><input type="checkbox" id="fDef"' + (isNew && !(P.addresses || []).length ? ' checked disabled' : '') + '> Make this my default address</label>' : '')
    + '<button class="ac-btn" data-act="addrSave">Save address</button><div class="ac-err" id="fErr"></div></div>';
}

function settingsHtml() {
  if (!P) return '<div class="ac-card">Sign in to manage your details.</div><button class="ac-gold" data-act="goSignin">Sign Up or Sign in</button>';
  return '<div class="ac-card ac-f"><label>Name</label><input id="sN" value="' + esc(P.name) + '">'
    + '<label>Phone</label><input value="' + esc(P.phone) + '" disabled>'
    + '<button class="ac-btn" data-act="save">Save details</button><div class="ac-err" id="sMsg"></div></div>'
    + '<div class="ac-card ac-f"><b>Change PIN</b>'
    + '<label>Current PIN</label><input id="sOld" type="password" inputmode="numeric" maxlength="4">'
    + '<label>New PIN</label><input id="sNew" type="password" inputmode="numeric" maxlength="4">'
    + '<button class="ac-sec" data-act="pin">Change PIN</button><div class="ac-err" id="pMsg"></div></div>'
    + '<button class="ac-sec" data-act="logout">Log out</button>'
    + '<button class="ac-danger" data-act="delAcc">Delete my account</button><div class="ac-err" id="dMsg"></div>';
}
function infoHtml(html) { return '<div class="ac-card">' + html + '</div>'; }

const TITLES = {home:"My Account",signin:"Sign in",signup:"Sign up",purchases:"My orders / Bills",settings:"Settings",about:"About Us",faq:"FAQs",addresses:"My Addresses",addrform:"Address"};
function render() {
  const m = ensure();
  // Keep the browser history entry in sync with the page being shown.
  if (history.state && history.state.ac) history.replaceState({ ac: 1, d: history.state.d || 0, v: view }, "");
  let body = "";
  if (view === "home") body = homeHtml();
  else if (view === "signin" || view === "signup") body = authHtml();
  else if (view === "purchases") body = purchases();
  else if (view === "addresses") body = addressesHtml();
  else if (view === "addrform") body = addrFormHtml();
  else if (view === "settings") body = settingsHtml();
  else if (view === "about") body = infoHtml("<p><b>Max Style</b><br>Style without limits.</p><p>Delivery within 5 working days.</p><p>Order on WhatsApp for fast help: 0722555929</p>");
  else if (view === "faq") body = infoHtml("<p><b>How long does delivery take?</b><br>Within 5 working days from the order date.</p><p><b>Where can I see my orders?</b><br>Open My Account, then Purchases.</p><p><b>Need help?</b><br>Message us on WhatsApp.</p>");
  const title = view === "addrform" ? (editAddr && editAddr.id ? "Edit address" : "New address") : TITLES[view];
  m.innerHTML = '<div class="ac-top"><button data-act="back">' + (view === "home" ? "✕" : "← Back") + '</button><h2>' + title + '</h2><span></span></div><div class="ac-body">' + body + '</div>';
}

function ensure() {
  if (!document.getElementById("accStyle")) {
    const s = document.createElement("style"); s.id = "accStyle"; s.textContent = CSS; document.head.appendChild(s);
  }
  let m = document.getElementById("accModal");
  if (!m) {
    m = document.createElement("div"); m.id = "accModal"; document.body.appendChild(m);
    m.addEventListener("click", e => {
      const b = e.target.closest("[data-act],[data-bill],[data-confirm],[data-ae],[data-ad],[data-adef]");
      if (!b || !m.contains(b)) return;
      if (b.hasAttribute("data-bill")) { const bill = curOrders[+b.getAttribute("data-bill")]; if (bill) downloadBill(bill); return; }
      if (b.hasAttribute("data-confirm")) { const o = curOrders[+b.getAttribute("data-confirm")]; if (o) confirmOrder(o.code); return; }
      if (b.hasAttribute("data-ae")) { editAddr = (P.addresses || []).find(a => String(a.id) === b.getAttribute("data-ae")) || null; if (editAddr) goView("addrform"); return; }
      if (b.hasAttribute("data-adef")) { addrDefault(b.getAttribute("data-adef")); return; }
      if (b.hasAttribute("data-ad")) { addrDelete(b.getAttribute("data-ad")); return; }
      act(b.getAttribute("data-act"));
    });
    // District -> city list; "Other" city shows a text box.
    m.addEventListener("change", e => {
      if (e.target.id === "fD") {
        const c = document.getElementById("fC"), o = document.getElementById("fCo");
        if (c) c.innerHTML = cityOptions(e.target.value, "");
        if (o) { o.style.display = "none"; o.value = ""; }
      }
      if (e.target.id === "fC") {
        const o = document.getElementById("fCo");
        if (o) o.style.display = e.target.value === "__other" ? "block" : "none";
      }
    });
  }
  return m;
}

// Customer marks an order as received.
async function confirmOrder(code) {
  const r = await post({ action: "confirm", token: getTok(), code: code });
  if (!r.ok) { alert(r.d.error || "Could not confirm the order"); return; }
  await loadProfile(); view = "purchases"; render();
}
async function addrDefault(id) {
  const r = await post({ action: "addrDefault", token: getTok(), id: Number(id) });
  if (!r.ok) { alert(r.d.error || "Could not change the default address"); return; }
  await loadProfile(); refreshPicker(); render();
}
async function addrDelete(id) {
  if (!confirm("Delete this address?")) return;
  const r = await post({ action: "addrDelete", token: getTok(), id: Number(id) });
  if (!r.ok) { alert(r.d.error || "Could not delete the address"); return; }
  await loadProfile(); refreshPicker(); render();
}

// Moving to a sub-page adds a history entry, so the phone back button returns to the previous page.
function goView(next) {
  view = next;
  const d = (history.state && history.state.ac ? history.state.d || 0 : 0) + 1;
  history.pushState({ ac: 1, d: d, v: next }, "");
  return render();
}

async function act(a) {
  const v = id => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
  const err = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  if (a === "back") { if (view === "home") return closeAccount(); return history.back(); }
  if (a === "goSignin" || a === "tabIn") return goView("signin");
  if (a === "tabUp") return goView("signup");
  if (a === "purchases" || a === "settings" || a === "about" || a === "faq" || a === "addresses") return goView(a);
  if (a === "addrNew") {
    if ((P.addresses || []).length >= 10) return alert("You can save up to 10 addresses");
    editAddr = null; return goView("addrform");
  }
  if (a === "lists") { closeAccount(); const w = document.getElementById("wishBtn"); if (w) w.click(); return; }
  if (a === "doLogin") {
    const r = await post({ action: "login", phone: v("aP"), pin: v("aPin") });
    if (!r.ok) return err("aErr", r.d.error || "Could not sign in");
    setTok(r.d.token); await loadProfile(); fillCheckout(); view = "home"; return render();
  }
  if (a === "doSignup") {
    const r = await post({ action: "signup", name: v("aN"), phone: v("aP"), pin: v("aPin"), phone2: v("aP2"), district: v("aD"), address: v("aA") });
    if (!r.ok) return err("aErr", r.d.error || "Could not create account");
    setTok(r.d.token); await loadProfile(); fillCheckout(); view = "home"; return render();
  }
  if (a === "addrSave") {
    const cityVal = v("fC") === "__other" ? v("fCo") : v("fC");
    const defBox = document.getElementById("fDef");
    const r = await post({
      action: "addrSave", token: getTok(), id: editAddr && editAddr.id ? editAddr.id : 0,
      name: v("fN"), district: v("fD"), city: cityVal, postal: v("fPo"), address: v("fA"),
      phone: v("fP"), phone2: v("fP2"), makeDefault: !!(defBox && defBox.checked)
    });
    if (!r.ok) return err("fErr", r.d.error || "Could not save the address");
    await loadProfile();
    const nm = document.getElementById("name");   // refresh the checkout drop-down and form
    if (nm) nm.value = "";
    fillCheckout();
    editAddr = null;
    return history.back();
  }
  if (a === "save") {
    // Only the name is changed here; the other saved details stay as they are.
    const r = await post({ action: "update", token: getTok(), name: v("sN"), phone2: P.phone2 || "", district: P.district || "", address: P.address || "" });
    if (!r.ok) return err("sMsg", r.d.error || "Could not save");
    await loadProfile(); render(); return err("sMsg", "Saved ✓");
  }
  if (a === "pin") {
    const r = await post({ action: "pin", token: getTok(), old_pin: v("sOld"), new_pin: v("sNew") });
    if (!r.ok) return err("pMsg", r.d.error || "Could not change PIN");
    render(); return err("pMsg", "PIN changed ✓");
  }
  if (a === "delAcc") {
    if (!confirm("Delete your account? Your saved addresses will be removed. This cannot be undone.")) return;
    const pin = prompt("Enter your 4-digit PIN to delete the account:");
    if (pin === null) return;
    const r = await post({ action: "deleteAccount", token: getTok(), pin: String(pin).trim() });
    if (!r.ok) return err("dMsg", r.d.error || "Could not delete the account");
    setTok(""); P = null; refreshPicker(); view = "home"; return render();
  }
  if (a === "logout") {
    await post({ action: "logout", token: getTok() });
    setTok(""); P = null; refreshPicker(); view = "home"; return render();
  }
}

// The My Account page uses browser history, so the phone back button closes it.
function openAccount() {
  hideDrawers();
  view = "home";
  ensure();
  if (!(history.state && history.state.ac)) {
    if (history.state && history.state.dr) history.replaceState({ ac: 1, d: 0, v: "home" }, "");
    else history.pushState({ ac: 1, d: 1, v: "home" }, "");
  }
  render();
  loadProfile().then(() => { fillCheckout(); if (document.getElementById("accModal")) render(); });
}
// Close the page and remove every history entry it added (sub-pages included).
function closeAccount() {
  const m = document.getElementById("accModal"); if (m) m.remove();
  const d = (history.state && history.state.ac) ? (history.state.d || 0) : 0;
  if (d > 0) history.go(-d);
}
window.addEventListener("popstate", () => {
  const m = document.getElementById("accModal");
  if (!m) return;
  if (history.state && history.state.ac) { view = history.state.v || "home"; render(); }
  else m.remove();
});

const accBtn = document.getElementById("accBtn");
if (accBtn) accBtn.addEventListener("click", openAccount);
// When the delivery details page opens, make sure the saved address is filled in.
const nextBtn = document.getElementById("toCheckout");
if (nextBtn) nextBtn.addEventListener("click", () => setTimeout(fillCheckout, 0));
loadProfile().then(fillCheckout);
window.MSAcc = { CITIES: CITIES, getP: () => P, defAddr: () => defAddr(), getTok: getTok };
})();
