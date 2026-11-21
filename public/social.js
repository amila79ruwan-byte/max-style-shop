// "Follow us" icons: shown at the bottom of the page and at the bottom of the side menu.
// Paste your page links below. A link left empty ("") is not shown. WhatsApp uses the shop number from shop.js.
(function () {
  const LINKS = {
    facebook: "",    // e.g. "https://www.facebook.com/yourpage"
    instagram: "",   // e.g. "https://www.instagram.com/yourpage"
    tiktok: "",      // e.g. "https://www.tiktok.com/@yourpage"
    whatsapp: "https://wa.me/" + (typeof WHATSAPP !== "undefined" ? WHATSAPP : "")
  };
  const ICONS = {
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c0 2.5 2 4.5 4.5 4.5"/>',
    whatsapp: '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>'
  };
  const names = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", whatsapp: "WhatsApp" };
  const items = Object.keys(LINKS).filter(k => /^https:\/\//i.test(LINKS[k]) && (k !== "whatsapp" || /\d/.test(LINKS[k])));
  if (!items.length) return;
  const html = '<div class="follow">Follow us<div class="fo">' + items.map(k =>
    '<a href="' + LINKS[k] + '" target="_blank" rel="noopener" aria-label="' + names[k] + '"><svg viewBox="0 0 24 24">' + ICONS[k] + '</svg></a>').join("") + '</div></div>';
  const foot = document.getElementById("contact"), menu = document.getElementById("menu");
  if (foot) foot.insertAdjacentHTML("afterbegin", html);
  if (menu) menu.insertAdjacentHTML("beforeend", html);
})();
