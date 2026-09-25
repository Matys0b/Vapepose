import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CreditCard, Banknote, Wallet, Check, X } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

export default function PaymentModal({ total, onCancel, onConfirm, customer }) {
  const [method, setMethod] = useState("cash"); // cash | card | other | mixed
  const [cashInput, setCashInput] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [cardStatus, setCardStatus] = useState("idle"); // idle|waiting|ok
  const [submitting, setSubmitting] = useState(false);

  const cashVal = parseFloat(cashInput.replace(",", ".")) || 0;
  const cardVal = parseFloat(cardAmount.replace(",", ".")) || 0;
  const otherVal = parseFloat(otherAmount.replace(",", ".")) || 0;

  const paid = useMemo(() => {
    if (method === "cash") return cashVal;
    if (method === "card") return total; // full CB
    if (method === "other") return total;
    return cashVal + cardVal + otherVal;
  }, [method, cashVal, cardVal, otherVal, total]);

  const change = Math.max(0, paid - total);
  const remaining = Math.max(0, total - paid);
  const canValidate = paid + 0.001 >= total && total > 0;

  const pushDigit = (d) => {
    setCashInput((v) => {
      if (d === "," && v.includes(",")) return v;
      const nv = (v || "") + d;
      // limit 2 decimals
      const parts = nv.split(",");
      if (parts[1] && parts[1].length > 2) return v;
      return nv;
    });
  };
  const backDigit = () => setCashInput((v) => v.slice(0, -1));
  const setQuick = (v) => setCashInput(String(v));
  const setExact = () => setCashInput(String(total).replace(".", ","));

  const validate = async () => {
    setSubmitting(true);
    const payments = [];
    if (method === "cash") payments.push({ method: "cash", amount: cashVal });
    else if (method === "card") payments.push({ method: "card", amount: total });
    else if (method === "other") payments.push({ method: "other", amount: total });
    else if (method === "mixed") {
      if (cashVal > 0) payments.push({ method: "cash", amount: cashVal });
      if (cardVal > 0) payments.push({ method: "card", amount: cardVal });
      if (otherVal > 0) payments.push({ method: "other", amount: otherVal });
    }
    if (method === "card") {
      setCardStatus("waiting");
      await new Promise((r) => setTimeout(r, 700));
      setCardStatus("ok");
      await new Promise((r) => setTimeout(r, 300));
    }
    await onConfirm(payments);
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-4xl bg-slate-950 border-violet-500/30 p-0 overflow-hidden">
        <DialogTitle className="sr-only">Paiement</DialogTitle>
        <div className="grid md:grid-cols-2">
          {/* Left */}
          <div className="p-6 bg-gradient-to-br from-violet-800/40 via-fuchsia-800/20 to-slate-900 border-r border-violet-500/20">
            <div className="text-xs uppercase tracking-widest text-violet-200/70">Total à payer</div>
            <div className="font-mono-num font-black text-6xl text-emerald-300 mt-1" data-testid="payment-total">
              {fmt(total)}
            </div>
            {customer && (
              <div className="mt-3 text-sm text-slate-300">Client : <span className="font-semibold text-pink-300">{customer.first_name} {customer.last_name}</span></div>
            )}
            <div className="mt-6 space-y-2">
              <MethodBtn active={method === "cash"} onClick={() => setMethod("cash")} icon={<Banknote className="w-5 h-5" />} testid="method-cash">Espèces</MethodBtn>
              <MethodBtn active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard className="w-5 h-5" />} testid="method-card">Carte Bancaire</MethodBtn>
              <MethodBtn active={method === "other"} onClick={() => setMethod("other")} icon={<Wallet className="w-5 h-5" />} testid="method-other">Autre</MethodBtn>
              <MethodBtn active={method === "mixed"} onClick={() => setMethod("mixed")} icon={<Check className="w-5 h-5" />} testid="method-mixed">Paiement mixte</MethodBtn>
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-slate-400">Reste à payer</span>
              <span className="font-mono-num font-bold text-rose-300">{fmt(remaining)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-400">À rendre</span>
              <span className="font-mono-num font-bold text-amber-300" data-testid="payment-change">{fmt(change)}</span>
            </div>
          </div>

          {/* Right */}
          <div className="p-5">
            {method === "card" && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center mb-4">
                  <CreditCard className="w-10 h-10 text-violet-300" />
                </div>
                <div className="text-lg font-bold">Paiement par carte</div>
                <div className="text-sm text-slate-400 mt-1 max-w-xs">
                  {cardStatus === "idle" && "Insérez ou présentez la carte sur le TPE puis validez la vente."}
                  {cardStatus === "waiting" && "En attente de validation du TPE…"}
                  {cardStatus === "ok" && "Paiement accepté ✓"}
                </div>
                <div className="mt-6 text-xs uppercase tracking-widest text-amber-300/80 bg-amber-900/20 border border-amber-500/30 px-3 py-1 rounded">
                  TPE simulé – à intégrer avec matériel réel
                </div>
              </div>
            )}
            {method === "other" && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-lg font-bold">Autre moyen de paiement</div>
                <div className="text-sm text-slate-400 mt-1">Chèque, virement, avoir… saisie libre.</div>
              </div>
            )}
            {method === "cash" && (
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400">Montant reçu</div>
                <div className="mt-1 h-14 rounded-xl bg-slate-900 border border-violet-500/20 flex items-center justify-end px-4 font-mono-num text-3xl font-black text-emerald-300" data-testid="cash-input-display">
                  {cashInput || "0,00"} €
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map((v) => (
                    <button key={v} onClick={() => setQuick(v)} data-testid={`quick-cash-${v}`} className="numpad-key text-lg">+{v}€</button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {["1","2","3","4","5","6","7","8","9",",","0","⌫"].map((k) => (
                    <button
                      key={k}
                      onClick={() => k === "⌫" ? backDigit() : pushDigit(k)}
                      className="numpad-key"
                      data-testid={`cash-key-${k === "," ? "comma" : k === "⌫" ? "back" : k}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <button onClick={setExact} data-testid="quick-cash-exact" className="mt-2 w-full h-10 rounded-lg bg-slate-800 hover:bg-slate-700 border border-violet-500/20 text-sm font-semibold">Montant exact</button>
              </div>
            )}
            {method === "mixed" && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">Paiement mixte</div>
                <div>
                  <label className="text-xs text-slate-400">Espèces</label>
                  <input value={cashInput} onChange={(e) => setCashInput(e.target.value)} placeholder="0,00" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num" data-testid="mixed-cash" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Carte</label>
                  <input value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} placeholder="0,00" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num" data-testid="mixed-card" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Autre</label>
                  <input value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} placeholder="0,00" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num" data-testid="mixed-other" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 border-t border-violet-500/20">
          <Button variant="outline" className="h-14" onClick={onCancel} data-testid="btn-payment-cancel">
            <X className="w-4 h-4 mr-2" /> Annuler
          </Button>
          <Button
            disabled={!canValidate || submitting}
            onClick={validate}
            className="h-14 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-lg disabled:opacity-40"
            data-testid="btn-payment-validate"
          >
            <Check className="w-5 h-5 mr-2" /> Valider le paiement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MethodBtn({ active, onClick, icon, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`w-full h-12 rounded-xl px-3 flex items-center gap-3 border transition text-sm font-semibold ${
        active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white" : "bg-slate-900/60 border-violet-500/20 text-slate-200 hover:border-fuchsia-500/40"
      }`}
    >
      {icon}<span>{children}</span>
    </button>
  );
}
