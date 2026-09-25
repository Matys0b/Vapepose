import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      className="fixed z-50 top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 bg-rose-500/95 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
      data-testid="offline-banner"
    >
      <WifiOff className="w-4 h-4" /> Hors ligne — vente désactivée
    </div>
  );
}
