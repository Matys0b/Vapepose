// Register service worker and expose install prompt globally
export function registerPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    });
  }
  // Capture beforeinstallprompt so InstallBanner can trigger it
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
