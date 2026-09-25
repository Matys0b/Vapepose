import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft, Store, Zap, MapPin } from "lucide-react";

export default function Login() {
  const { pinLogin, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState("person"); // person | pin | store
  const [accounts, setAccounts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/auth/accounts").then((r) => setAccounts(r.data));
    api.get("/stores/public").then((r) => setStores(r.data));
  }, []);

  const pushPin = (d) => { setErr(""); setPin((p) => p.length < 6 ? p + d : p); };
  const backPin = () => { setErr(""); setPin((p) => p.slice(0, -1)); };

  const submitPin = async (e) => {
    e?.preventDefault?.();
    if (pin.length < 4) return;
    setBusy(true);
    try {
      const u = await pinLogin(pin);
      if (u.name !== selected.name) {
        setErr(`PIN ne correspond pas à ${selected.name}`);
        setPin("");
      } else {
        setStep("store");
      }
    } catch {
      setErr("PIN incorrect");
      setPin("");
    } finally { setBusy(false); }
  };

  const pickStore = async (s) => {
    setBusy(true);
    try {
      await api.post("/auth/switch-store", { store_id: s.id });
      await refresh();
      toast.success(`${selected.name} · ${s.name}`);
      nav("/pos");
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-violet-600/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display text-2xl font-black tracking-tight">VapePOS</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">Cha Va'Pote</div>
          </div>
          {step !== "person" && (
            <button
              onClick={() => { setStep("person"); setSelected(null); setPin(""); setErr(""); }}
              className="ml-auto text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
              data-testid="btn-back"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          )}
        </div>

        {step === "person" && (
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-black mb-2 tracking-tight">Qui prend la caisse ?</h1>
            <p className="text-slate-400 mb-8">Choisis ton profil pour commencer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setStep("pin"); }}
                  className="group relative rounded-3xl p-6 bg-slate-900/70 border border-violet-500/20 hover:border-fuchsia-500/60 transition text-left overflow-hidden"
                  data-testid={`person-${a.name.toLowerCase()}`}
                  style={{ boxShadow: `0 0 40px -20px ${a.color || "#8B5CF6"}66` }}
                >
                  <div
                    className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-30 blur-2xl group-hover:opacity-60 transition"
                    style={{ background: a.color || "#8B5CF6" }}
                  />
                  <div
                    className="relative w-24 h-24 rounded-2xl flex items-center justify-center font-display text-5xl font-black text-white mb-4"
                    style={{ background: `linear-gradient(135deg, ${a.color || "#8B5CF6"}, #EC4899)` }}
                  >
                    {a.name[0]}
                  </div>
                  <div className="relative font-display text-2xl font-black">{a.name}</div>
                  <div className="relative text-xs uppercase tracking-widest text-slate-400 mt-1">Administrateur</div>
                </button>
              ))}
              {accounts.length === 0 && (
                <div className="col-span-3 text-center text-slate-500 py-10">Chargement des comptes…</div>
              )}
            </div>
          </div>
        )}

        {step === "pin" && selected && (
          <div className="max-w-sm mx-auto">
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center font-display text-5xl font-black text-white mb-3"
                style={{ background: `linear-gradient(135deg, ${selected.color || "#8B5CF6"}, #EC4899)` }}
              >
                {selected.name[0]}
              </div>
              <div className="font-display text-2xl font-black">Salut {selected.name} 👋</div>
              <div className="text-sm text-slate-400 mt-1">Entre ton code PIN pour continuer</div>
            </div>

            <form onSubmit={submitPin} data-testid="form-pin">
              <div className="h-16 rounded-2xl bg-slate-950/70 border border-violet-500/25 flex items-center justify-center gap-3 font-mono-num text-4xl mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={i < pin.length ? "text-pink-300" : "text-slate-700"}>
                    {i < pin.length ? "•" : "○"}
                  </span>
                ))}
                {pin.length > 4 && Array.from({ length: pin.length - 4 }).map((_, i) => (
                  <span key={`x${i}`} className="text-pink-300">•</span>
                ))}
              </div>
              {err && <div className="text-rose-300 text-xs text-center mb-2" data-testid="pin-error">{err}</div>}
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map((d) => (
                  <button key={d} type="button" data-testid={`pin-${d}`} onClick={() => pushPin(d)} className="numpad-key">{d}</button>
                ))}
                <button type="button" onClick={backPin} className="numpad-key text-slate-400">⌫</button>
                <button type="button" data-testid="pin-0" onClick={() => pushPin("0")} className="numpad-key">0</button>
                <button
                  type="submit"
                  disabled={busy || pin.length < 4}
                  data-testid="btn-pin-submit"
                  className="numpad-key text-white border-0 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${selected.color || "#8B5CF6"}, #EC4899)` }}
                >
                  OK
                </button>
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500 text-center">
                Démo : Mathis 1111 · Emma 2222 · Jessica 3333
              </div>
            </form>
          </div>
        )}

        {step === "store" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="font-display text-4xl sm:text-5xl font-black mb-2 tracking-tight">Choisis ton magasin</h1>
              <p className="text-slate-400">Chaque boutique a son propre stock et son propre chiffre d'affaires.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {stores.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => pickStore(s)}
                  disabled={busy}
                  className="group relative rounded-3xl overflow-hidden aspect-[4/3] border border-violet-500/20 hover:border-fuchsia-500/60 transition"
                  data-testid={`store-${s.code}`}
                  style={{ background: i === 0
                    ? "linear-gradient(135deg, #4C1D95 0%, #831843 100%)"
                    : "linear-gradient(135deg, #0E7490 0%, #1E3A8A 100%)" }}
                >
                  <div className="absolute inset-0 grain opacity-20" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-6 h-6 text-white/80" />
                      <span className="text-xs uppercase tracking-[0.3em] text-white/60">Boutique</span>
                    </div>
                    <div className="text-left">
                      <div className="font-display text-4xl sm:text-5xl font-black text-white">{s.name}</div>
                      <div className="flex items-center gap-1 mt-2 text-white/70 text-sm">
                        <MapPin className="w-3.5 h-3.5" /> Cha Va'Pote · {s.code}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
