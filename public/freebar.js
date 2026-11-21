// Free delivery progress bar: "Add Rs. X more for FREE delivery". Shown in the cart and on the delivery/summary boxes.
(function () {
  const FREE_FROM = 7000;   // keep the same as the rule in shop4.js and functions/api/orders.js
  const css = document.createElement("style");
  css.textContent = ".fdbar{margin:2px 0 10px;padding:8px 10px;background:#faf8f3;border:1px solid #e6e0cf;border-radius:10px;font-size:13px;line-height:1.35}"
    + ".fdbar b{font-weight:700}.fdbar small{display:block;color:#777;font-size:11.5px}"
    + ".fdbar .trk{height:6px;border-radius:99px;background:#e9e4d4;margin-top:6px;overflow:hidden}"
    + ".fdbar .fil{height:100%;border-radius:99px;background:linear-gradient(90deg,#e8c25a,#c9961a);transition:width .35s ease}"
    + ".fdbar.done{background:#eef8f0;border-color:#bfe3c8;color:#1a7f37}.fdbar.done .trk{display:none}";
  document.head.appendChild(css);

  const fmtN = n => (window.fmt ? window.fmt(n) : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  function barHtml() {
    const t = window.calcTotals ? window.calcTotals() : null;
    if (!t || !t.sub) return "";
    const left = FREE_FROM - t.after;
    if (left <= 0) return '<div class="fdbar done"><b>🎉 You got FREE delivery!</b><small>ඔබට ප්‍රි ඩිලිවරි ලැබුණා</small></div>';
    const pct = Math.max(4, Math.min(100, Math.round(t.after / FREE_FROM * 100)));
    return '<div class="fdbar"><span>🚚 Add <b>Rs. ' + fmtN(left) + '</b> more for <b>FREE delivery</b></span>'
      + '<small>ප්‍රි ඩිලිවරි සඳහා තව Rs. ' + fmtN(left) + 'ක් එකතු කරන්න</small>'
      + '<div class="trk"><div class="fil" style="width:' + pct + '%"></div></div></div>';
  }
  const orig = window.updateSummary;
  window.updateSummary = function () {
    orig.apply(this, arguments);
    const h = barHtml();
    ["cartSum", "sumBox"].forEach(id => { const e = document.getElementById(id); if (e && h) e.insertAdjacentHTML("afterbegin", h); });
  };
  window.updateSummary();
})();
