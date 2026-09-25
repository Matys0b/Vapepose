import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { Pause, ArrowRight } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function SuspendedCartsDrawer({ onClose, onResume }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/suspended-carts").then((r) => setItems(r.data));
  }, []);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="bg-slate-950 border-violet-500/30 text-slate-100 w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2 text-slate-100"><Pause className="w-5 h-5" /> Paniers en attente</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 max-h-[80vh] overflow-auto scroll-thin">
          {items.length === 0 && <div className="text-sm text-slate-500 text-center py-10">Aucun panier en attente</div>}
          {items.map((s) => {
            const total = s.items.reduce((acc, it) => acc + it.unit_price * it.quantity - (it.discount || 0), 0) - (s.global_discount || 0);
            return (
              <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-violet-500/15" data-testid={`suspended-${s.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{s.label || "Panier"}</div>
                    <div className="text-xs text-slate-400">Par {s.user_name} · {new Date(s.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-num font-bold text-pink-300">{fmt(total)}</div>
                    <div className="text-[10px] text-slate-400">{s.items.length} article(s)</div>
                  </div>
                </div>
                <Button onClick={() => onResume(s)} className="mt-2 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid={`btn-resume-${s.id}`}>
                  Reprendre <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
