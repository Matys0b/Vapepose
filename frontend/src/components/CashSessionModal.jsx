import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Coins } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function CashSessionModal({ session, onClose, onChanged }) {
  const [opening, setOpening] = useState("150");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(null);

  const openS = async () => {
    setBusy(true);
    try {
      await api.post("/cash-sessions/open", { opening_amount: parseFloat(opening.replace(",", ".")) || 0 });
      toast.success("Caisse ouverte");
      onChanged?.();
      onClose();
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
  };

  const closeS = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/cash-sessions/close", { counted_amount: parseFloat(counted.replace(",", ".")) || 0, note });
      setClosed(data);
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-slate-950 border-violet-500/30">
        <DialogTitle className="font-display text-2xl font-black flex items-center gap-2">
          <Coins className="w-6 h-6 text-amber-300" /> {session ? "Fermer la caisse" : "Ouvrir la caisse"}
        </DialogTitle>

        {closed ? (
          <div className="space-y-2 text-sm">
            <Row label="Fond d'ouverture" value={fmt(closed.opening_amount)} />
            <Row label="Ventes espèces" value={fmt(closed.cash_sales_total || 0)} />
            <Row label="Ventes carte" value={fmt(closed.card_sales_total || 0)} />
            <Row label="Ventes autre" value={fmt(closed.other_sales_total || 0)} />
            <Row label="Total ventes" value={fmt(closed.total_sales || 0)} />
            <Row label="Espèces attendues" value={fmt(closed.expected_amount)} />
            <Row label="Espèces comptées" value={fmt(closed.counted_amount)} />
            <div className={`p-3 rounded-lg ${Math.abs(closed.difference || 0) < 0.01 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"} border border-current/20 flex items-center justify-between font-mono-num font-bold`}>
              <span>Écart</span><span>{fmt(closed.difference || 0)}</span>
            </div>
            <Button className="w-full mt-2" onClick={onClose} data-testid="btn-close-session-done">Terminer</Button>
          </div>
        ) : session ? (
          <div className="space-y-3">
            <Row label="Fond d'ouverture" value={fmt(session.opening_amount)} />
            <Row label="Ventes espèces" value={fmt(session.cash_sales_total || 0)} />
            <Row label="Ventes carte" value={fmt(session.card_sales_total || 0)} />
            <Row label="Total ventes" value={fmt(session.total_sales || 0)} />
            <Row label="Nb ventes" value={session.sales_count || 0} />
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400">Espèces comptées</label>
              <input value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0,00" className="w-full h-12 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num text-lg mt-1" data-testid="input-counted-amount" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400">Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-violet-500/20 px-3 mt-1" />
            </div>
            <Button disabled={busy} onClick={closeS} className="w-full h-12 bg-gradient-to-r from-rose-600 to-fuchsia-600" data-testid="btn-close-session">
              Fermer la caisse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400">Fond de caisse (€)</label>
              <input value={opening} onChange={(e) => setOpening(e.target.value)} className="w-full h-12 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num text-lg mt-1" data-testid="input-opening-amount" />
            </div>
            <Button disabled={busy} onClick={openS} className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold" data-testid="btn-open-session">
              Ouvrir la caisse
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm bg-slate-900/60 border border-violet-500/10 rounded-lg px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono-num font-semibold text-slate-100">{value}</span>
    </div>
  );
}
