import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft, Store, Zap, MapPin, User, Mail, Lock, Phone, Calendar, ArrowRight } from "lucide-react";
import { CustomerAuthProvider } from "../contexts/CustomerAuthContext";

/** Wrapper so we can use the customer context here too (staff login stays untouched). */
export default function LoginWrapper() {
  return (
    <CustomerAuthProvider>
      <LoginInner />
    </CustomerAuthProvider>
  );
}

function LoginInner() {
  const { pinLogin, refresh } = useAuth();
  const { register: registerCustomer, login: loginCustomer } = useCustomerAuth();
  const nav = useNavigate();
  const [audience, setAudience] = useState("client"); // client | staff
  const [clientMode, setClientMode] = useState("login"); // login | signup
  const [step, setStep] = useState("person");
  const [accounts, setAccounts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", phone: "",
    birth_date: "", accept_terms: false,
  });

  useEffect(() => {
    api.get("/auth/accounts").then((r) => setAccounts(r.data)).catch(() => {});
    api.get("/stores/public").then((r) => setStores(r.data)).catch(() => {});
  }, []);

  const pushPin = (d) => { setErr(""); setPin((p) => p.length < 6 ? p + d : p); };
  const backPin = () => { setErr(""); setPin((p) => p.slice(0, -1)); };

  const submitPin = async (e) => {
    e?.preventDefault?.();
    if (pin.length < 4) return;
    setBusy(true);
    try {
      const u = await pinLogin(pin);
      if (u.name !== selected.name) { setErr(`PIN ne correspond pas à ${selected.name}`); setPin(""); }
      else setStep("store");
    } catch { setErr("PIN incorrect"); setPin(""); }
    finally { setBusy(false); }
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

  const submitClient = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (clientMode === "login") {
        await loginCustomer(form.email, form.password);
      } else {
        if (!form.first_name.trim()) { toast.error("Prénom requis"); return; }
        if (!form.birth_date) { toast.error("Date de naissance requise"); return; }
        if (form.password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
        if (!form.accept_terms) { toast.error("Merci d'accepter les conditions d'utilisation"); return; }
        // Client-side age check for UX
        const today = new Date();
        const b = new Date(form.birth_date);
        const age = today.getFullYear() - b.getFullYear() - ((today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) ? 1 : 0);
        if (age < 18) { toast.error("Inscription réservée aux 18 ans et plus."); return; }
        await registerCustomer(form);
      }
      toast.success("Bienvenue !");
      nav("/client/me");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-violet-600/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display text-2xl font-black tracking-tight">Cha Va'Pote</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">VapePOS · Fidélité</div>
          </div>
          {audience === "staff" && step !== "person" && (
            <button
              onClick={() => { setStep("person"); setSelected(null); setPin(""); setErr(""); }}
              className="ml-auto text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
              data-testid="btn-back"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          )}
        </div>

        {/* Audience toggle */}
        <div className="mx-auto max-w-md mb-6 grid grid-cols-2 rounded-2xl p-1 bg-slate-900/70 border border-violet-500/20">
          <button
            onClick={() => setAudience("client")}
            data-testid="tab-audience-client"
            className={`h-11 rounded-xl text-sm font-bold transition ${audience === "client" ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-900/40" : "text-slate-300"}`}
          >
            Client
          </button>
          <button
            onClick={() => setAudience("staff")}
            data-testid="tab-audience-staff"
            className={`h-11 rounded-xl text-sm font-bold transition ${audience === "staff" ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-900/40" : "text-slate-300"}`}
          >
            Personnel
          </button>
        </div>

        {audience === "client" && (
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-2 rounded-xl p-1 bg-slate-900/60 border border-violet-500/15 mb-4">
              <button data-testid="tab-login" onClick={() => setClientMode("login")} className={`h-10 rounded-lg text-sm font-semibold ${clientMode === "login" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Se connecter</button>
              <button data-testid="tab-register" onClick={() => setClientMode("signup")} className={`h-10 rounded-lg text-sm font-semibold ${clientMode === "signup" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Créer un compte</button>
            </div>
            <form onSubmit={submitClient} className="rounded-2xl p-5 bg-slate-900/70 border border-violet-500/20 space-y-3">
              {clientMode === "signup" && (
                <>
                  <Field icon={<User className="w-4 h-4" />}>
                    <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="cf-input" data-testid="cf-first-name" />
                  </Field>
                  <Field icon={<User className="w-4 h-4" />}>
                    <input placeholder="Nom (optionnel)" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="cf-input" data-testid="cf-last-name" />
                  </Field>
                  <Field icon={<Phone className="w-4 h-4" />}>
                    <input placeholder="Téléphone (optionnel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="cf-input" data-testid="cf-phone" />
                  </Field>
                  <Field icon={<Calendar className="w-4 h-4" />}>
                    <input required type="date" placeholder="Date de naissance" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="cf-input" data-testid="cf-birth-date" />
                  </Field>
                </>
              )}
              <Field icon={<Mail className="w-4 h-4" />}>
                <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="cf-input" data-testid="cf-email" />
              </Field>
              <Field icon={<Lock className="w-4 h-4" />}>
                <input required type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="cf-input" data-testid="cf-password" />
              </Field>
              {clientMode === "signup" && (
                <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={form.accept_terms} onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} className="mt-0.5 accent-fuchsia-500" data-testid="cf-accept-terms" />
                  <span>
                    Je certifie avoir au moins 18 ans et j'accepte la{" "}
                    <a href="/privacy" target="_blank" className="text-fuchsia-300 underline">politique de confidentialité</a>.
                  </span>
                </label>
              )}
              <button type="submit" disabled={busy} data-testid="btn-cf-submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {busy ? "…" : clientMode === "login" ? "Se connecter" : "Créer mon compte"} <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-[11px] text-slate-500 text-center">
                {clientMode === "signup"
                  ? "1 point de fidélité par euro dépensé — récompenses exclusives à venir."
                  : "Ton QR fidélité t'attend juste après la connexion."}
              </div>
            </form>
            <style>{`.cf-input{background:transparent;border:none;outline:none;color:#f8fafc;flex:1;font-size:14px;height:42px}.cf-input::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(30%) hue-rotate(220deg)}`}</style>
          </div>
        )}

        {audience === "staff" && step === "person" && (
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black mb-1 tracking-tight text-center">Qui prend la caisse ?</h1>
            <p className="text-slate-400 mb-6 text-center text-sm">Sélectionne ton profil pour commencer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setStep("pin"); }}
                  className="group relative rounded-3xl p-6 bg-slate-900/70 border border-violet-500/20 hover:border-fuchsia-500/60 transition text-left overflow-hidden"
                  data-testid={`person-${a.name.toLowerCase()}`}
                  style={{ boxShadow: `0 0 40px -20px ${a.color || "#8B5CF6"}66` }}
                >
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-30 blur-2xl group-hover:opacity-60 transition" style={{ background: a.color || "#8B5CF6" }} />
                  <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center font-display text-5xl font-black text-white mb-4" style={{ background: `linear-gradient(135deg, ${a.color || "#8B5CF6"}, #EC4899)` }}>
                    {a.name[0]}
                  </div>
                  <div className="relative font-display text-2xl font-black">{a.name}</div>
                  <div className="relative text-xs uppercase tracking-widest text-slate-400 mt-1">Administrateur</div>
                </button>
              ))}
              {accounts.length === 0 && <div className="col-span-3 text-center text-slate-500 py-10">Chargement des comptes…</div>}
            </div>
          </div>
        )}

        {audience === "staff" && step === "pin" && selected && (
          <div className="max-w-sm mx-auto">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-display text-5xl font-black text-white mb-3" style={{ background: `linear-gradient(135deg, ${selected.color || "#8B5CF6"}, #EC4899)` }}>
                {selected.name[0]}
              </div>
              <div className="font-display text-2xl font-black">Salut {selected.name}</div>
              <div className="text-sm text-slate-400 mt-1">Entre ton code PIN pour continuer</div>
            </div>
            <form onSubmit={submitPin} data-testid="form-pin">
              <div className="h-16 rounded-2xl bg-slate-950/70 border border-violet-500/25 flex items-center justify-center gap-3 font-mono-num text-4xl mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={i < pin.length ? "text-pink-300" : "text-slate-700"}>{i < pin.length ? "•" : "○"}</span>
                ))}
                {pin.length > 4 && Array.from({ length: pin.length - 4 }).map((_, i) => <span key={`x${i}`} className="text-pink-300">•</span>)}
              </div>
              {err && <div className="text-rose-300 text-xs text-center mb-2" data-testid="pin-error">{err}</div>}
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map((d) => (
                  <button key={d} type="button" data-testid={`pin-${d}`} onClick={() => pushPin(d)} className="numpad-key">{d}</button>
                ))}
                <button type="button" onClick={backPin} className="numpad-key text-slate-400">⌫</button>
                <button type="button" data-testid="pin-0" onClick={() => pushPin("0")} className="numpad-key">0</button>
                <button type="submit" disabled={busy || pin.length < 4} data-testid="btn-pin-submit" className="numpad-key text-white border-0 disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${selected.color || "#8B5CF6"}, #EC4899)` }}>OK</button>
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500 text-center">
                Démo : Mathis 1111 · Emma 2222 · Jessica 3333
              </div>
            </form>
          </div>
        )}

        {audience === "staff" && step === "store" && (
          <div>
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl sm:text-4xl font-black mb-1 tracking-tight">Choisis ton magasin</h1>
              <p className="text-slate-400 text-sm">Chaque boutique a son propre stock et son propre CA.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {stores.map((s, i) => (
                <button key={s.id} onClick={() => pickStore(s)} disabled={busy} className="group relative rounded-3xl overflow-hidden aspect-[4/3] border border-violet-500/20 hover:border-fuchsia-500/60 transition" data-testid={`store-${s.code}`} style={{ background: i === 0 ? "linear-gradient(135deg, #4C1D95 0%, #831843 100%)" : "linear-gradient(135deg, #0E7490 0%, #1E3A8A 100%)" }}>
                  <div className="absolute inset-0 grain opacity-20" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-6 h-6 text-white/80" />
                      <span className="text-xs uppercase tracking-[0.3em] text-white/60">Boutique</span>
                    </div>
                    <div className="text-left">
                      <div className="font-display text-4xl sm:text-5xl font-black text-white">{s.name}</div>
                      <div className="flex items-center gap-1 mt-2 text-white/70 text-sm"><MapPin className="w-3.5 h-3.5" /> Cha Va'Pote · {s.code}</div>
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

function Field({ icon, children }) {
  return (
    <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-slate-950/60 border border-violet-500/20 focus-within:border-fuchsia-500/50">
      <span className="text-violet-300">{icon}</span>
      {children}
    </div>
  );
}
