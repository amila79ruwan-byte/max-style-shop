// English <-> Sinhala switch. Translates visible text using this list.
const DICT = {
  "Sign up and get 10% off on your first order": "පළමු ඇණවුමට 10% වට්ටමක්!",
  "NEW ARRIVALS": "අලුත් ඇතුළත් කිරීම්",
  "OUR COLLECTION": "අපගේ එකතුව",
  "Shop now": "දැන් බලන්න",
  "All": "සියල්ල",
  "Women": "කාන්තා",
  "Men": "පිරිමි",
  "Kids": "ළමයින්",
  "Womens": "කාන්තා",
  "Mens": "පිරිමි",
  "New Arrivals": "අලුත් ඇතුළත් කිරීම්",
  "Offers": "දීමනා",
  "Menu": "මෙනුව",
  "Contact Us": "අප අමතන්න",
  "Delivery and Returns": "බෙදාහැරීම සහ ආපසු ගැනීම",
  "Track my order": "මගේ ඇණවුම බලන්න",
  "Your cart": "ඔබේ කරත්තය",
  "Your cart is empty. Add something from the collection.": "ඔබේ කරත්තය හිසයි. එකතුවෙන් යමක් එක් කරන්න.",
  "Total": "මුළු එකතුව",
  "Place order": "ඇණවුම තහවුරු කරන්න",
  "Add to cart": "කරත්තයට දාන්න",
  "Please select a size": "ප්‍රමාණයක් තෝරන්න",
  "No products found.": "භාණ්ඩ කිසිවක් හමු නොවීය.",
  "Loading…": "පූරණය වෙමින්…",
  "Style without limits.": "සීමා රහිත විලාසිතාව.",
  "Order on WhatsApp for fast delivery.": "වේගවත් බෙදාහැරීම සඳහා WhatsApp හරහා ඇණවුම් කරන්න.",
  "Search products": "භාණ්ඩ සොයන්න",
  "Your name": "ඔබේ නම",
  "Phone number (WhatsApp)": "දුරකථන අංකය (WhatsApp)",
  "Alternate phone number (optional)": "විකල්ප දුරකථන අංකය (අවශ්‍ය නම්)",
  "Select district": "දිස්ත්‍රික්කය තෝරන්න",
  "Delivery address": "බෙදාහැරීමේ ලිපිනය"
};

const REV = {};
Object.keys(DICT).forEach(en => { REV[DICT[en]] = en; });

let lang = "en";
try { lang = localStorage.getItem("maxstyle_lang") || "en"; } catch (e) {}

function swap(text) {
  const t = text.trim();
  const map = lang === "si" ? DICT : REV;
  if (map[t] === undefined) return text;
  return text.replace(t, map[t]);
}

function translate() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const p = walker.currentNode.parentNode;
    if (p && (p.nodeName === "SCRIPT" || p.nodeName === "STYLE")) continue;
    nodes.push(walker.currentNode);
  }
  nodes.forEach(n => {
    const v = swap(n.nodeValue);
    if (v !== n.nodeValue) n.nodeValue = v;
  });
  document.querySelectorAll("[placeholder]").forEach(el => {
    const old = el.getAttribute("placeholder");
    const v = swap(old);
    if (v !== old) el.setAttribute("placeholder", v);
  });
  const b = document.getElementById("langBtn");
  if (b) b.textContent = lang === "si" ? "EN" : "සිං";
  document.documentElement.lang = lang === "si" ? "si" : "en";
}

// Re-translate when the page changes (for example, when products load).
const obs = new MutationObserver(() => {
  obs.disconnect();
  translate();
  watch();
});
function watch() {
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });
}

document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "si" ? "en" : "si";
  try { localStorage.setItem("maxstyle_lang", lang); } catch (e) {}
  obs.disconnect();
  translate();
  watch();
});

translate();
watch();
