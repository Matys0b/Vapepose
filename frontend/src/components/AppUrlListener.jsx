import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addUrlOpenListener, configureNativeUi, enableLocalNotifications } from "../lib/native";

/**
 * Native integration shim: deep-link handler + status bar + local notification channel.
 * Zero-op on web — safe to mount always.
 */
export default function AppUrlListener() {
  const nav = useNavigate();

  useEffect(() => {
    configureNativeUi();
    enableLocalNotifications();
    let dispose = () => {};
    addUrlOpenListener((url) => {
      try {
        const u = new URL(url);
        const path = `${u.pathname}${u.search}${u.hash}`;
        if (path && path !== "/") nav(path);
      } catch { /* ignore malformed */ }
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, [nav]);

  return null;
}
