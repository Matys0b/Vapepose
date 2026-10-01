// Native shim — safe to import on web (all calls short-circuit).
// Uses dynamic imports so Webpack doesn't crash on missing Capacitor APIs during web build.
let _CapCore = null;

async function getCapacitor() {
  if (_CapCore) return _CapCore;
  try {
    const mod = await import("@capacitor/core");
    _CapCore = mod.Capacitor;
    return _CapCore;
  } catch { return null; }
}

export const isNative = async () => {
  const Cap = await getCapacitor();
  try { return Cap && Cap.isNativePlatform ? Cap.isNativePlatform() : false; } catch { return false; }
};

export const configureNativeUi = async () => {
  if (!(await isNative())) return;
  try {
    const sb = await import("@capacitor/status-bar");
    await sb.StatusBar.setStyle({ style: sb.Style.Dark });
    await sb.StatusBar.setOverlaysWebView({ overlay: true });
    await sb.StatusBar.setBackgroundColor({ color: "#0b0716" });
  } catch { /* ignore */ }
};

export const enableLocalNotifications = async () => {
  if (!(await isNative())) return;
  try {
    const mod = await import("@capacitor/local-notifications");
    const LN = mod.LocalNotifications;
    const cur = await LN.checkPermissions();
    if (cur.display !== "granted") await LN.requestPermissions();
    await LN.createChannel({
      id: "general",
      name: "Cha Va Pote",
      description: "Fidélité, ventes, événements boutique",
      importance: 3,
    });
  } catch { /* ignore */ }
};

export const addUrlOpenListener = async (handler) => {
  if (!(await isNative())) return () => {};
  try {
    const mod = await import("@capacitor/app");
    const h = await mod.App.addListener("appUrlOpen", (event) => handler(event.url));
    return () => h.remove();
  } catch { return () => {}; }
};
