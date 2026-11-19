// Home page banner slideshow (style like the big shop sites: full-width photo, progress bars at the bottom, auto-change, swipe).
// Shows the banners set in banners.html. If there are none, the normal banner stays.
(function () {
const box = document.getElementById("bannerBox");
if (!box) return;

const CSS = `#bannerBox{position:relative;overflow:hidden;background:#111}
.bn-track{display:flex;transition:transform .6s ease}
.bn-slide{flex:0 0 100%;position:relative;display:block;color:#fff;text-decoration:none}
.bn-slide img{width:100%;display:block;aspect-ratio:16/7;object-fit:cover}
.bn-txt{position:absolute;left:0;right:0;bottom:0;padding:34px 16px 26px;background:linear-gradient(transparent,rgba(0,0,0,.65));font-size:18px;font-weight:700}
.bn-bars{position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:8px;z-index:2}
.bn-bars i{display:block;width:44px;height:3px;border-radius:2px;background:rgba(255,255,255,.4);overflow:hidden}
.bn-bars i b{display:block;height:100%;width:0;background:#fff}
.bn-bars i.on b{animation:bnfill 4s linear forwards}
@keyframes bnfill{to{width:100%}}`;

const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function render(list) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  box.innerHTML = '<div class="bn-track">' + list.map(b => {
    const inner = '<img src="' + b.image + '" alt="' + esc(b.text) + '">' + (b.text ? '<div class="bn-txt">' + esc(b.text) + '</div>' : '');
    return b.link ? '<a class="bn-slide" href="' + esc(b.link) + '">' + inner + '</a>' : '<div class="bn-slide">' + inner + '</div>';
  }).join("") + '</div>' + (list.length > 1 ? '<div class="bn-bars">' + list.map(() => '<i><b></b></i>').join("") + '</div>' : '');

  if (list.length < 2) return;
  const track = box.querySelector(".bn-track");
  const bars = [...box.querySelectorAll(".bn-bars i")];
  const DELAY = 4000;
  let i = 0, timer = null, startX = null;

  const go = n => {
    i = (n + list.length) % list.length;
    track.style.transform = "translateX(" + (-i * 100) + "%)";
    // Restart the progress bar of the current slide.
    bars.forEach(el => el.classList.remove("on"));
    void track.offsetWidth;
    bars[i].classList.add("on");
  };
  const auto = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), DELAY); };

  go(0);
  auto();
  box.addEventListener("touchstart", e => { startX = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
  box.addEventListener("touchend", e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    auto();
  });
}

fetch("/api/banners")
  .then(r => r.ok ? r.json() : [])
  .then(list => { if (Array.isArray(list) && list.length) render(list); })
  .catch(() => {});
})();
