// My Account page: sign in / sign up (phone + 4-digit PIN), profile, orders, settings.
// Loaded after shop.js, so it uses its helpers (esc, fmt, hideDrawers, downloadBill, loadMyOrders, deliveryText, WHATSAPP).
(function () {
const TK = "maxstyle_token";
const DISTRICTS = ["Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara","Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa","Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla","Monaragala","Ratnapura","Kegalle"];
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
.ac-btn{width:100%;padding:13px;background:#111;color:#f3d27a;border:0;border-radius:8px;font-weight:700;font-size:16px;margin-top:10px}
.ac-sec{width:100%;padding:12px;background:#eee;color:#111;border:0;border-radius:8px;font-weight:700;margin-top:10px}
.ac-tabs{display:flex;gap:6px;margin-bottom:12px}
.ac-tabs button{flex:1;padding:10px;border:1px solid #111;background:#fff;color:#111;border-radius:8px;font-weight:700;width:auto;margin:0}
.ac-tabs button.on{background:#111;color:#f3d27a}
.ac-err{color:#c62828;font-size:14px;margin-top:6px;min-height:18px}
.ac-ord{border-bottom:1px solid #eee;padding:10px 0;font-size:14px}
.ac-ord:last-child{border-bottom:0}
.ac-ord button{margin-top:6px;padding:8px 12px;border:1px solid #111;background:#fff;color:#111;border-radius:6px;font-weight:700;width:auto}
.ac-muted{color:#666;font-size:13px}`;

let P = null, view = "home", curOrders = [];

const getTok = () => { try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; } };
const setTok = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} };
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
    const r = await fetch("/api/account?token=" + encodeURIComponent(t));
    if (r.ok) { const d = await r.json(); P = d.profile; P.orders = d.orders || []; }
    else if (r.status === 401) setTok("");
  } catch (e) {}
}
// Fill the checkout form with the signed-in customer's details (only empty fields).
function fillCheckout() {
  if (!P) return;
  const set = (id, val) => { const e = document.getElementById(id); if (e && !e.value && val) e.value = val; };
  set("name", P.name); set("phone", P.phone); set("phone2", P.phone2); set("addr", P.address); set("district", P.district);
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
    +   '<button data-act="settings">' + ICON_PIN + '<span>Addresses</span></button>'
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
    + '<div class="ac-err" id="aErr"></div></div>';
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
    + '<button data-bill="' + i + '">Download bill</button></div>').join("") + '</div>';
}
function settingsHtml() {
  if (!P) return '<div class="ac-card">Sign in to manage your details.</div><button class="ac-gold" data-act="goSignin">Sign Up or Sign in</button>';
  return '<div class="ac-card ac-f"><label>Name</label><input id="sN" value="' + esc(P.name) + '">'
    + '<label>Phone</label><input value="' + esc(P.phone) + '" disabled>'
    + '<label>Second phone</label><input id="sP2" inputmode="tel" value="' + esc(P.phone2 || '') + '">'
    + '<label>District</label><select id="sD"><option value="">Select district</option>'
    + DISTRICTS.map(d => '<option' + (P.district === d ? ' selected' : '') + '>' + d + '</option>').join("") + '</select>'
    + '<label>Delivery address</label><textarea id="sA" rows="3">' + esc(P.address || '') + '</textarea>'
    + '<button class="ac-btn" data-act="save">Save details</button><div class="ac-err" id="sMsg"></div></div>'
    + '<div class="ac-card ac-f"><b>Change PIN</b>'
    + '<label>Current PIN</label><input id="sOld" type="password" inputmode="numeric" maxlength="4">'
    + '<label>New PIN</label><input id="sNew" type="password" inputmode="numeric" maxlength="4">'
    + '<button class="ac-sec" data-act="pin">Change PIN</button><div class="ac-err" id="pMsg"></div></div>'
    + '<button class="ac-sec" data-act="logout">Log out</button>';
}
function infoHtml(html) { return '<div class="ac-card">' + html + '</div>'; }

const TITLES = {home:"My Account",signin:"Sign in",signup:"Sign up",purchases:"My orders / Bills",settings:"Settings",about:"About Us",faq:"FAQs"};
function render() {
  const m = ensure();
  // Keep the browser history entry in sync with the page being shown.
  if (history.state && history.state.ac) history.replaceState({ ac: 1, d: history.state.d || 0, v: view }, "");
  let body = "";
  if (view === "home") body = homeHtml();
  else if (view === "signin" || view === "signup") body = authHtml();
  else if (view === "purchases") body = purchases();
  else if (view === "settings") body = settingsHtml();
  else if (view === "about") body = infoHtml("<p><b>Max Style</b><br>Style without limits.</p><p>Delivery within 5 working days.</p><p>Order on WhatsApp for fast help: 0722555929</p>");
  else if (view === "faq") body = infoHtml("<p><b>How long does delivery take?</b><br>Within 5 working days from the order date.</p><p><b>Where can I see my orders?</b><br>Open My Account, then Purchases.</p><p><b>Need help?</b><br>Message us on WhatsApp.</p>");
  m.innerHTML = '<div class="ac-top"><button data-act="back">' + (view === "home" ? "✕" : "← Back") + '</button><h2>' + TITLES[view] + '</h2><span></span></div><div class="ac-body">' + body + '</div>';
}

function ensure() {
  if (!document.getElementById("accStyle")) {
    const s = document.createElement("style"); s.id = "accStyle"; s.textContent = CSS; document.head.appendChild(s);
  }
  let m = document.getElementById("accModal");
  if (!m) {
    m = document.createElement("div"); m.id = "accModal"; document.body.appendChild(m);
    m.addEventListener("click", e => {
      const b = e.target.closest("[data-act],[data-bill]");
      if (!b || !m.contains(b)) return;
      if (b.hasAttribute("data-bill")) { const bill = curOrders[+b.getAttribute("data-bill")]; if (bill) downloadBill(bill); return; }
      act(b.getAttribute("data-act"));
    });
  }
  return m;
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
  if (a === "purchases" || a === "settings" || a === "about" || a === "faq") return goView(a);
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
  if (a === "save") {
    const r = await post({ action: "update", token: getTok(), name: v("sN"), phone2: v("sP2"), district: v("sD"), address: v("sA") });
    if (!r.ok) return err("sMsg", r.d.error || "Could not save");
    await loadProfile(); fillCheckout(); render(); return err("sMsg", "Saved ✓");
  }
  if (a === "pin") {
    const r = await post({ action: "pin", token: getTok(), old_pin: v("sOld"), new_pin: v("sNew") });
    if (!r.ok) return err("pMsg", r.d.error || "Could not change PIN");
    render(); return err("pMsg", "PIN changed ✓");
  }
  if (a === "logout") {
    await post({ action: "logout", token: getTok() });
    setTok(""); P = null; view = "home"; return render();
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
loadProfile().then(fillCheckout);
})();
