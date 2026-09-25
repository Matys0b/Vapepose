// Register service worker and expose install prompt globally
export function registerPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Force an update check on every load
          reg.update().catch(() => {});
          // When a new SW takes control, reload once to pick up new assets
          let reloaded = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
          });
          // If a new SW is installed while page is open, tell it to skip waiting
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                nw.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch(() => {});
    });
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.__vapepos_installEvent = e;
    window.dispatchEvent(new CustomEvent("vapepos-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    window.__vapepos_installEvent = null;
    try { localStorage.setItem("vapepos_installed", "1"); } catch (e) { void e; }
  });
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari
    window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}
