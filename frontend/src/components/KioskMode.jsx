import { useEffect, useRef } from "react";
import { isStandalone } from "../lib/pwa";

/**
 * Enables kiosk-friendly behaviours when VapePOS runs as an installed PWA:
 *  - Prevents accidental back-navigation (history trap)
 *  - Disables context menu long-press and pinch/double-tap zoom
 *  - Requests fullscreen on first user tap
 *  - Requests Wake Lock so the tablet doesn't sleep during a shift
 * All logic is a NO-OP when running inside a normal browser tab.
 */
export default function KioskMode() {
  const wakeRef = useRef(null);

  useEffect(() => {
    if (!isStandalone()) return;

    // History trap
    const trapBack = () => window.history.pushState(null, "", window.location.href);
    trapBack();
    const onPop = () => trapBack();
    window.addEventListener("popstate", onPop);

    // Context menu + zoom prevention
    const noCtx = (e) => e.preventDefault();
    let lastTouch = 0;
    const noDoubleTap = (e) => {
      const now = Date.now();
      if (now - lastTouch < 300) e.preventDefault();
      lastTouch = now;
    };
    const noGesture = (e) => e.preventDefault();
    document.addEventListener("contextmenu", noCtx);
    document.addEventListener("touchend", noDoubleTap, { passive: false });
    document.addEventListener("gesturestart", noGesture);

    // Fullscreen on first user interaction
    const goFS = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) { void e; }
      document.removeEventListener("pointerdown", goFS);
    };
    document.addEventListener("pointerdown", goFS, { once: true });

    // Wake Lock
    const requestWake = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeRef.current = await navigator.wakeLock.request("screen");
          wakeRef.current.addEventListener?.("release", () => { wakeRef.current = null; });
        }
      } catch (e) { void e; }
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !wakeRef.current) requestWake(); };
    requestWake();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("contextmenu", noCtx);
      document.removeEventListener("touchend", noDoubleTap);
      document.removeEventListener("gesturestart", noGesture);
      document.removeEventListener("visibilitychange", onVisible);
      wakeRef.current?.release?.().catch(() => {});
    };
  }, []);

  return null;
}
