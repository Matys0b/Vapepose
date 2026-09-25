import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { X, Download, Share, PlusSquare, Smartphone } from "lucide-react";
import { isStandalone, isIOS } from "../lib/pwa";

const DISMISS_KEY = "vapepos_install_dismissed_at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export default function InstallBanner() {
  const [available, setAvailable] = useState(!!window.__vapepos_installEvent);
  const [visible, setVisible] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < DISMISS_MS) return;
    const on = () => setAvailable(true);
    window.addEventListener("vapepos-install-ready", on);
    // Show after 4s so it doesn't intrude on login
    const t = setTimeout(() => setVisible(true), 4000);
    return () => { clearTimeout(t); window.removeEventListener("vapepos-install-ready", on); };
  }, []);

  if (isStandalone() || !visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (isIOS()) { setShowIOS(true); return; }
    const evt = window.__vapepos_installEvent;
    if (!evt) { setShowIOS(true); return; }
    evt.prompt();
    try {
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") setVisible(false);
      window.__vapepos_installEvent = null;
    } catch (e) { void e; }
  };

  return (
    <>
      <div
        className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 max-w-sm w-[92%] rounded-2xl bg-slate-950/95 backdrop-blur border border-violet-500/30 shadow-2xl p-3 flex items-center gap-3"
        data-testid="install-banner"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">Installer VapePOS sur cette tablette</div>
          <div className="text-[11px] text-slate-400">Un tap pour ouvrir la caisse en plein écran.</div>
        </div>
        <Button size="sm" onClick={install} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-9 px-3" data-testid="btn-install">
          <Download className="w-4 h-4 mr-1" /> {available ? "Installer" : "Comment ?"}
        </Button>
        <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 p-1" data-testid="btn-install-dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={showIOS} onOpenChange={(o) => !o && setShowIOS(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30 max-w-md">
          <DialogTitle className="font-display text-xl font-black">Ajouter à l'écran d'accueil</DialogTitle>
          <div className="space-y-3 text-sm text-slate-300">
            <p>Sur iPad (Safari) — 3 gestes :</p>
            <div className="space-y-2">
              <Step n={1} icon={<Share className="w-4 h-4" />}>Touche le bouton <b>Partager</b> en haut de Safari.</Step>
              <Step n={2} icon={<PlusSquare className="w-4 h-4" />}>Fais défiler et choisis <b>Sur l'écran d'accueil</b>.</Step>
              <Step n={3} icon={<Download className="w-4 h-4" />}>Confirme avec <b>Ajouter</b>. VapePOS apparaît sur l'écran d'accueil.</Step>
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-violet-500/15">
              Sur Android (Chrome), le bouton d'installation apparaîtra automatiquement.
            </div>
          </div>
          <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" onClick={() => setShowIOS(false)} data-testid="btn-ios-ok">
            J'ai compris
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n, icon, children }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-violet-500/10">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-black">{n}</div>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-violet-300">{icon}</span>
        <span>{children}</span>
      </div>
    </div>
  );
}
