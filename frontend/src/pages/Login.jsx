import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCustomerAuth, CustomerAuthProvider } from "../contexts/CustomerAuthContext";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowLeft, Store, Zap, MapPin, User, Mail, Lock, Phone, Calendar, ArrowRight } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginWrapper() {
  return (
    <CustomerAuthProvider>
      <LoginInner />
    </CustomerAuthProvider>
  );
}

function LoginInner() {
  const { universalLogin, refresh } = useAuth();
  const { register: registerCustomer, refresh: refreshCustomer } = useCustomerAuth();
  const nav = useNavigate();

  // Modes: 'login' | 'signup' | 'store' (staff post-login store picker if needed)
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", phone: "",
    birth_date: "", accept_terms: false,
  });
  const [stores, setStores] = useState([]);
  const [staffAfterLogin, setStaffAfterLogin] = useState(null);

  useEffect(() => {
    api.get("/stores/public").then((r) => setStores(r.data)).catch(() => {});
  }, []);

  // --- Auto-detect login (universal) --------------------------------
  const submitLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Email et mot de passe requis"); return; }
    setBusy(true);
    try {
      const data = await universalLogin(form.email, form.password);
      if (data.type === "customer") {
        await refreshCustomer();
        toast.success(`Bienvenue ${data.first_name || ""}`);
        nav("/client/me");
      } else if (data.type === "staff") {
        setStaffAfterLogin(data);
        if (data.store_id) {
          await refresh();
          toast.success(`${data.name} · caisse prête`);
          nav("/pos");
        } else {
          setMode("store");
        }
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setBusy(false); }
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) { toast.error("Prénom requis"); return; }
    if (!form.birth_date) { toast.error("Date de naissance requise"); return; }
    if (form.password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
    if (!form.accept_terms) { toast.error("Merci d'accepter les conditions d'utilisation"); return; }
    const today = new Date();
    const b = new Date(form.birth_date);
    const age = today.getFullYear() - b.getFullYear() - ((today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) ? 1 : 0);
    if (age < 18) { toast.error("Inscription réservée aux 18 ans et plus."); return; }
    setBusy(true);
    try {
      await registerCustomer(form);
      toast.success("Compte créé, bienvenue !");
      nav("/client/me");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  const pickStore = async (s) => {
    setBusy(true);
    try {
      await api.post("/auth/switch-store", { store_id: s.id });
      await refresh();
      toast.success(`${staffAfterLogin?.name || ""} · ${s.name}`);
      nav("/pos");
    } catch (err) { toast.error(formatApiError(err)); } finally { setBusy(false); }
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
          {(mode === "signup" || mode === "store") && (
            <button
              onClick={() => setMode("login")}
              className="ml-auto text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
              data-testid="btn-back"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          )}
          <div className={mode === "login" ? "ml-auto" : "ml-2"}>
            <ThemeToggle />
          </div>
        </div>

        {mode === "login" && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-5">
              <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Connexion</h1>
              <p className="text-slate-400 text-sm mt-1">Entre ton email et ton mot de passe.</p>
            </div>
            <form onSubmit={submitLogin} className="rounded-2xl p-5 bg-slate-900/70 border border-violet-500/20 space-y-3" data-testid="form-auto-login">
              <Field icon={<Mail className="w-4 h-4" />}>
                <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="cf-input" data-testid="cf-email" autoComplete="email" />
              </Field>
              <Field icon={<Lock className="w-4 h-4" />}>
                <input required type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="cf-input" data-testid="cf-password" autoComplete="current-password" />
              </Field>
              <button
                type="submit" disabled={busy} data-testid="btn-auto-submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 font-bold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busy ? "…" : "Se connecter"} <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center pt-1">
                <button type="button" onClick={() => setMode("signup")} className="text-sm text-fuchsia-300 hover:text-fuchsia-200" data-testid="btn-goto-signup">
                  Pas encore de compte ? <span className="font-bold underline">Créer mon compte</span>
                </button>
              </div>
            </form>
            <div className="text-center mt-4 text-[11px] text-slate-500">
              <a href="/privacy" className="hover:text-slate-300">Politique de confidentialité</a>
            </div>
            <style>{`.cf-input{background:transparent;border:none;outline:none;color:#f8fafc;flex:1;font-size:14px;height:42px}.cf-input::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(30%) hue-rotate(220deg)}`}</style>
          </div>
        )}

        {mode === "signup" && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-5">
              <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Créer un compte</h1>
              <p className="text-slate-400 text-sm mt-1">Réservé aux personnes majeures — cumule des points à chaque passage en caisse.</p>
            </div>
            <form onSubmit={submitSignup} className="rounded-2xl p-5 bg-slate-900/70 border border-violet-500/20 space-y-3" data-testid="form-signup">
              <Field icon={<User className="w-4 h-4" />}><input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="cf-input" data-testid="cf-first-name" /></Field>
              <Field icon={<User className="w-4 h-4" />}><input placeholder="Nom (optionnel)" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="cf-input" data-testid="cf-last-name" /></Field>
              <Field icon={<Phone className="w-4 h-4" />}><input placeholder="Téléphone (optionnel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="cf-input" data-testid="cf-phone" /></Field>
              <Field icon={<Calendar className="w-4 h-4" />}><input required type="date" placeholder="Date de naissance" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="cf-input" data-testid="cf-birth-date" /></Field>
              <Field icon={<Mail className="w-4 h-4" />}><input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="cf-input" data-testid="cf-email" /></Field>
              <Field icon={<Lock className="w-4 h-4" />}><input required type="password" placeholder="Mot de passe (6+ car.)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="cf-input" data-testid="cf-password" /></Field>
              <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={form.accept_terms} onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} className="mt-0.5 accent-fuchsia-500" data-testid="cf-accept-terms" />
                <span>Je certifie avoir au moins 18 ans et j'accepte la <a href="/privacy" target="_blank" rel="noreferrer" className="text-fuchsia-300 underline">politique de confidentialité</a>.</span>
              </label>
              <button type="submit" disabled={busy} data-testid="btn-signup-submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {busy ? "…" : "Créer mon compte"} <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-center pt-1">
                <button type="button" onClick={() => setMode("login")} className="text-xs text-slate-400 hover:text-slate-200" data-testid="btn-back-to-login">
                  J'ai déjà un compte
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "store" && (
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
