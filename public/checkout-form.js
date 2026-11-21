// Checkout delivery form + short address summary for signed-in customers.
// Loaded LAST (after account.js). It overrides applyAddr / fillCheckout / ckForm / ckValidate.
// Form order: Name, District, City (auto list by district), Address, Postal code (optional), Phone, Alternate phone (optional).
(function () {
  const escH = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $id = id => document.getElementById(id);
  const FIELDS = ["name", "rowDC", "cityOther", "addr", "rowPP", "phone2", "addrPick"];
  let editing = false;     // signed-in customer pressed "Edit"
  let giftMode = false;    // gift to someone else: always show the full form

  // Keep only digits and "+" (spaces, dashes, dots, brackets, Sinhala/Arabic digits typed by mistake are removed).
  const cleanPhone = v => String(v || "").replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632).replace(/[^\d+]/g, "");
  const cityVal = () => {
    const c = $id("city"); if (!c) return "";
    return c.value === "__other" ? ($id("cityOther").value || "").trim() : c.value;
  };
  const combinedAddr = () => {
    const a = ($id("addr").value || "").trim(), c = cityVal(), p = ($id("postal").value || "").trim();
    return a + (c ? ", " + c : "") + (p ? " " + p : "");
  };
  const ACC = () => window.MSAcc || null;
  const loggedIn = () => { try { const a = ACC(); return !!(a && a.getP() && a.getTok()); } catch (e) { return false; } };

  // ---- City list (depends on the district) ----
  function fillCities(district, selected) {
    const c = $id("city"), o = $id("cityOther"); if (!c) return;
    const list = (ACC() && ACC().CITIES[district]) || [];
    const inList = list.includes(selected);
    c.innerHTML = '<option value="">Select city</option>'
      + list.map(x => '<option' + (x === selected ? " selected" : "") + ">" + escH(x) + "</option>").join("")
      + '<option value="__other"' + (selected && !inList ? " selected" : "") + ">Other</option>";
    o.style.display = selected && !inList ? "block" : "none";
    o.value = selected && !inList ? selected : "";
  }
  function setAddress(a) {   // a = {name, phone, phone2, district, city, postal, address}
    const set = (id, v) => { const e = $id(id); if (e) { e.value = v || ""; e.dispatchEvent(new Event("input", { bubbles: true })); } };
    set("name", a.name); set("phone", a.phone); set("phone2", a.phone2);
    set("district", a.district); fillCities(a.district, a.city);
    set("addr", a.address); set("postal", a.postal);
  }

  // ---- Short summary card (signed-in customers) ----
  const missing = () => !($id("name").value.trim() && $id("phone").value.trim() && $id("district").value && cityVal() && $id("addr").value.trim());
  function showFields(on) { FIELDS.forEach(id => { const e = $id(id); if (e) e.style.display = on ? "" : "none"; });
    if (on) { const o = $id("cityOther"), c = $id("city"); if (o) o.style.display = c && c.value === "__other" ? "block" : "none"; } }
  function render() {
    const card = $id("addrCard"); if (!card) return;
    const useCard = loggedIn() && !giftMode && !editing && !missing();
    const useForm = !loggedIn() || giftMode || editing || missing();
    if (useCard) {
      showFields(false);
      const ph = $id("phone").value.trim() + ($id("phone2").value.trim() ? " / " + $id("phone2").value.trim() : "");
      const line = [$id("addr").value.trim(), cityVal(), $id("district").value].filter(Boolean).join(", ")
        + (($id("postal").value || "").trim() ? " · " + $id("postal").value.trim() : "");
      card.style.cssText = "display:flex;gap:10px;align-items:flex-start;border:1.5px solid #e6e0cf;background:#faf8f3;border-radius:12px;padding:12px;margin-bottom:10px";
      card.innerHTML = '<div style="flex:1;min-width:0;font-size:14px;line-height:1.45"><b>' + escH($id("name").value.trim()) + "</b><br>"
        + escH(line) + '<br><span style="color:#666">' + escH(ph) + "</span></div>"
        + '<button type="button" id="addrEdit" style="flex:none;border:1px solid #111;background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600">Edit</button>';
      $id("addrEdit").onclick = () => { editing = true; render(); };
    } else if (useForm) {
      showFields(true);
      if (loggedIn() && !giftMode) {   // editing (or incomplete saved address): small "Done" button above the form
        card.style.cssText = "display:flex;justify-content:flex-end;margin-bottom:8px";
        card.innerHTML = '<button type="button" id="addrDone" style="border:1px solid #111;background:#fff;border-radius:8px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600">Done</button>';
        $id("addrDone").onclick = () => {
          if (missing()) { const m = $id("msg"); if (m) { m.style.color = "#c62828"; m.textContent = "Please fill in the name, district, city, address and phone number."; } return; }
          editing = false; render();
        };
      } else { card.style.display = "none"; card.innerHTML = ""; }
    }
  }

  // ---- Overrides of account.js / shop4.js functions ----
  window.msApplyAddr = function (a) {
    if (!a) return;
    setAddress({ name: a.name, phone: a.phone, phone2: a.phone2, district: a.district, city: a.city, postal: a.postal, address: a.address });
    render();
  };
  window.msFill = function () {
    if (!loggedIn()) { render(); return; }
    const P = ACC().getP();
    if (!$id("name").value && !giftMode) {
      const d = ACC().defAddr();
      if (d) setAddress({ name: d.name, phone: d.phone, phone2: d.phone2, district: d.district, city: d.city, postal: d.postal, address: d.address });
      else setAddress({ name: P.name, phone: P.phone, phone2: P.phone2, district: P.district, city: "", postal: "", address: P.address });
    }
    editing = false; render();
  };
  window.ckForm = function () {
    return { name: $id("name").value.trim(), phone: cleanPhone($id("phone").value), phone2: cleanPhone($id("phone2").value),
      district: $id("district").value, addr: combinedAddr(),
      sn: $id("ckSn").value.trim(), sp: $id("ckSp").value.trim(), gm: $id("ckMsg").value.trim() };
  };
  const oldValidate = window.ckValidate;
  window.ckValidate = function () {
    const e = oldValidate();
    if (e) return e;
    if (!$id("addr").value.trim()) return "Please enter the address.";
    if (!cityVal()) return "Please select your city.";
    const f = window.ckForm();
    if (f.phone.replace(/\D/g, "").length < 9 || f.phone.length > 15) return "Please enter a valid phone number (like 0771234567).";
    if (f.phone2 && (f.phone2.replace(/\D/g, "").length < 9 || f.phone2.length > 15)) return "Alternate phone number is not valid. Leave it empty or enter a full number.";
    return "";
  };

  // ---- Events ----
  $id("district").addEventListener("change", () => fillCities($id("district").value, ""));
  $id("city").addEventListener("change", () => {
    const o = $id("cityOther"); o.style.display = $id("city").value === "__other" ? "block" : "none";
    if ($id("city").value !== "__other") o.value = "";
  });
  document.addEventListener("change", e => {
    if (e.target && e.target.id === "addrPick" && !e.target.value) {      // "+ Enter a different address"
      fillCities("", ""); $id("postal").value = ""; editing = true; render();
    }
    if (e.target && e.target.id === "ckG") {                              // gift: receiver's address is typed fresh
      giftMode = e.target.checked;
      if (giftMode) { ["name", "phone", "phone2", "addr", "postal"].forEach(id => $id(id).value = ""); $id("district").value = ""; fillCities("", ""); render(); }
      else window.msFill();
    }
  });
  // After an order the old code clears the fields: also clear city / postal and go back to the right mode.
  const co = $id("checkout");
  if (co) new MutationObserver(() => {
    if (co.style.display === "none") return;
    if (!loggedIn() && !$id("name").value) { fillCities("", ""); $id("postal").value = ""; }
    render();
  }).observe(co, { attributes: true, attributeFilter: ["style"] });

  render();
})();
