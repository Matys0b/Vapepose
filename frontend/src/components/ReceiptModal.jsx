import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, Printer, Mail, QrCode, X } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function ReceiptModal({ sale, onClose }) {
  const [emailed, setEmailed] = useState(false);
  const printTicket = () => window.print();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-950 border-violet-500/30">
        <DialogTitle className="sr-only">Vente terminée</DialogTitle>
        <div className="text-center space-y-2 pt-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="font-display text-3xl font-black text-emerald-300">VENTE TERMINÉE</div>
          <div className="text-slate-400 text-sm">Ticket n° <span className="font-mono-num text-slate-200">{sale.number}</span></div>
        </div>

        {sale.change_due > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <span className="text-amber-200 font-semibold">À rendre</span>
            <span className="font-mono-num font-black text-2xl text-amber-300" data-testid="receipt-change">{fmt(sale.change_due)}</span>
          </div>
        )}

        <div id="printable-receipt" className="mt-3 p-4 rounded-xl bg-white text-slate-900 text-sm">
          <div className="text-center font-bold text-lg">Cha Va'Pote</div>
          <div className="text-center text-xs text-slate-500">Ticket n° {sale.number}</div>
          <div className="text-center text-xs text-slate-500 mb-3">{new Date(sale.created_at).toLocaleString()}</div>
          <table className="w-full text-xs">
            <thead className="border-b border-slate-300">
              <tr><th className="text-left">Article</th><th className="text-right">Qté</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {sale.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1">{it.name}</td>
                  <td className="py-1 text-right">{it.quantity}</td>
                  <td className="py-1 text-right font-mono">{fmt(it.unit_price * it.quantity - (it.discount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 space-y-0.5 text-xs">
            <div className="flex justify-between"><span>Sous-total</span><span className="font-mono">{fmt(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span>Remise</span><span className="font-mono">-{fmt(sale.global_discount || 0)}</span></div>
            <div className="flex justify-between"><span>Dont TVA 20%</span><span className="font-mono">{fmt(sale.vat_total)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-slate-300 pt-1 mt-1">
              <span>TOTAL</span><span className="font-mono">{fmt(sale.total)}</span>
            </div>
            {sale.payments.map((p, i) => (
              <div key={i} className="flex justify-between text-xs"><span>{p.method === "cash" ? "Espèces" : p.method === "card" ? "Carte" : "Autre"}</span><span className="font-mono">{fmt(p.amount)}</span></div>
            ))}
            {sale.change_due > 0 && <div className="flex justify-between"><span>Rendu monnaie</span><span className="font-mono">{fmt(sale.change_due)}</span></div>}
            {sale.customer && (
              <div className="mt-2 border-t border-slate-300 pt-1 text-xs">
                Client : {sale.customer.first_name} {sale.customer.last_name} · +{sale.loyalty_added} pts
              </div>
            )}
          </div>
          <div className="text-center text-[10px] text-slate-500 mt-3">Merci de votre visite !</div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <Button variant="outline" onClick={printTicket} data-testid="btn-print-receipt"><Printer className="w-4 h-4 mr-1" /> Imprimer</Button>
          <Button variant="outline" onClick={() => setEmailed(true)} data-testid="btn-email-receipt"><Mail className="w-4 h-4 mr-1" /> Email</Button>
          <Button variant="outline" data-testid="btn-qr-receipt"><QrCode className="w-4 h-4 mr-1" /> Numérique</Button>
          <Button onClick={onClose} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-new-sale"><X className="w-4 h-4 mr-1" /> Nouvelle vente</Button>
        </div>
        {emailed && <div className="text-xs text-emerald-300 text-center mt-1">Email programmé (intégration à venir).</div>}
      </DialogContent>
    </Dialog>
  );
}
