import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Sun, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function ClientQR() {
  const { customer, refreshQR } = useCustomerAuth();
  const [brightHint, setBrightHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBrightHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const doRefreshQR = async () => {
    if (!window.confirm("Régénérer un nouveau QR ? L'ancien deviendra inactif.")) return;
    try { await refreshQR(); toast.success("QR régénéré"); } catch { toast.error("Impossible"); }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {brightHint && (
        <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2" data-testid="brightness-hint">
          <Sun className="w-4 h-4 shrink-0" />
          Astuce : monte la luminosité à fond pour un scan rapide en boutique.
        </div>
      )}

      <Card className="p-6 bg-slate-900/70 border-violet-500/20" data-testid="qr-card">
        <div className="text-center mb-4">
          <div className="font-display text-2xl font-black">Mon QR fidélité</div>
          <div className="text-xs text-slate-400 mt-1">Un code unique, opaque et révocable</div>
        </div>
        <div className="flex justify-center">
          <div className="p-5 bg-white rounded-3xl shadow-2xl shadow-fuchsia-900/30">
            <img
              alt="QR code fidélité"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=6&data=${encodeURIComponent(customer.qr_token)}`}
              className="w-72 h-72"
              data-testid="qr-image"
            />
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-200 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> {customer.loyalty_points || 0} points de fidélité
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <button onClick={doRefreshQR} data-testid="btn-refresh-qr" className="text-xs text-slate-400 hover:text-fuchsia-300 flex items-center gap-1.5 px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5" /> Régénérer mon QR
          </button>
        </div>
      </Card>

      <div className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
        Ton code ne contient aucune donnée personnelle : c'est un simple identifiant que seul le magasin peut relier à ton compte.
      </div>
    </div>
  );
}
