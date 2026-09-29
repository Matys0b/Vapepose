import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Lock, Unlock, Shield } from "lucide-react";

const LS_KEY = "vapepos_kiosk_locked";

export function useKioskLock() {
  const [locked, setLocked] = useState(() => localStorage.getItem(LS_KEY) === "1");

  useEffect(() => {
    localStorage.setItem(LS_KEY, locked ? "1" : "0");
    if (locked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [locked]);

  return { locked, lock: () => setLocked(true), unlock: () => setLocked(false) };
}

export function KioskLockToggle({ locked, onLock, onUnlockAttempt }) {
  return locked ? (
    <Button
      onClick={onUnlockAttempt}
      variant="outline"
      size="sm"
      className="border-fuchsia-500/40 text-fuchsia-200"
      data-testid="btn-kiosk-unlock"
    >
      <Lock className="w-4 h-4 mr-1" /> Verrouillé
    </Button>
  ) : (
    <Button
      onClick={onLock}
      variant="outline"
      size="sm"
      className="border-slate-700"
      data-testid="btn-kiosk-lock"
    >
      <Unlock className="w-4 h-4 mr-1" /> Mode bloqué
    </Button>
  );
}

export function KioskUnlockDialog({ open, onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const push = (d) => { setErr(""); setPin((p) => (p.length < 6 ? p + d : p)); };
  const back = () => { setErr(""); setPin((p) => p.slice(0, -1)); };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (pin.length < 4) return;
    setBusy(true);
    try {
      await api.post("/auth/verify-pin", { pin, require_role: "admin" });
      toast.success("Kiosque déverrouillé");
      setPin("");
      onSuccess();
    } catch (err) {
      setErr(err.response?.data?.detail || "PIN incorrect");
      setPin("");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPin(""); setErr(""); onClose(); } }}>
      <DialogContent className="max-w-sm bg-slate-950 border-fuchsia-500/30" data-testid="kiosk-unlock-dialog">
        <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
          <Shield className="w-5 h-5 text-fuchsia-400" /> Déverrouillage
        </DialogTitle>
        <div className="text-sm text-slate-400 -mt-2">PIN administrateur requis pour sortir du mode bloqué.</div>
        <form onSubmit={submit}>
          <div className="h-16 rounded-2xl bg-slate-900/70 border border-violet-500/25 flex items-center justify-center gap-3 font-mono-num text-4xl mt-3 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < pin.length ? "text-pink-300" : "text-slate-700"}>
                {i < pin.length ? "•" : "○"}
              </span>
            ))}
            {pin.length > 4 && Array.from({ length: pin.length - 4 }).map((_, i) => <span key={`x${i}`} className="text-pink-300">•</span>)}
          </div>
          {err && <div className="text-rose-300 text-xs text-center mb-2" data-testid="kiosk-pin-error">{err}</div>}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <button key={d} type="button" onClick={() => push(d)} className="numpad-key" data-testid={`kiosk-pin-${d}`}>{d}</button>
            ))}
            <button type="button" onClick={back} className="numpad-key text-slate-400">⌫</button>
            <button type="button" onClick={() => push("0")} className="numpad-key" data-testid="kiosk-pin-0">0</button>
            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="numpad-key text-white border-0 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
              data-testid="btn-kiosk-pin-submit"
            >
              OK
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
