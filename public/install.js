// Register the service worker (needed for Android install).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const wasDismissed = () => { try { return localStorage.getItem("maxstyle_install_dismissed") === "1"; } catch (e) { return false; } };
const rememberDismiss = () => { try { localStorage.setItem("maxstyle_install_dismissed", "1"); } catch (e) {} };

let deferredPrompt = null;

function showBox(html) {
  if (document.getElementById("installBox")) return;
  const d = document.createElement("div");
  d.id = "installBox";
  d.innerHTML = html;
  d.style.cssText = "position:fixed;left:12px;right:12px;bottom:76px;background:#111;color:#fff;padding:14px;border-radius:12px;z-index:70;display:flex;gap:10px;align-items:center;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.3)";
  document.body.appendChild(d);
  d.querySelector("[data-no]").onclick = () => { rememberDismiss(); d.remove(); };
  const yes = d.querySelector("[data-yes]");
  if (yes) yes.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    d.remove();
  };
}

// Android Chrome: show our own Install button.
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone && !wasDismissed()) {
    showBox('<span style="flex:1">Max Style app එක ඔයාගේ ෆෝන් එකට install කරන්න.</span>'
      + '<button data-yes style="background:#c9961a;color:#111;border:0;padding:8px 12px;border-radius:8px;font-weight:700">Install</button>'
      + '<button data-no style="background:none;border:0;color:#fff;font-size:18px">✕</button>');
  }
});

// iPhone Safari: no install button possible, so show instructions.
if (isIOS && !isStandalone && !wasDismissed()) {
  setTimeout(() => showBox('<span style="flex:1">Install කරන්න: Safari එකේ <b>Share</b> (⬆) → <b>Add to Home Screen</b></span>'
    + '<button data-no style="background:none;border:0;color:#fff;font-size:18px">✕</button>'), 3000);
}
// Count each phone once when the app is opened as an installed app.
function countInstall() {
  try {
    if (localStorage.getItem("maxstyle_install_counted") === "1") return;
    localStorage.setItem("maxstyle_install_counted", "1");
  } catch (e) {}
  fetch("/api/installs", { method: "POST" }).catch(() => {});
}
if (isStandalone) countInstall();
window.addEventListener("appinstalled", countInstall);
