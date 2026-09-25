import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { toast } from "sonner";
import { Zap, Mail, LockKeyhole, User, Phone, ArrowRight } from "lucide-react";

export default function ClientLogin() {
  const { customer, login, register } = useCustomerAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (customer) return <Navigate to="/client/me" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.first_name.trim()) { toast.error("Prénom requis"); return; }
        if (form.password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
        await register(form);
      }
      toast.success("Bienvenue !");
      nav("/client/me");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-black">VapePOS</div>
            <div className="text-[10px] uppercase tracking-widest text-violet-300/70">Espace client</div>
          </div>
        </div>

        <Card className="bg-slate-900/70 backdrop-blur border-violet-500/20 p-5">
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold ${mode === "login" ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-slate-800/60 text-slate-300"}`}
              data-testid="tab-login"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold ${mode === "register" ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "bg-slate-800/60 text-slate-300"}`}
              data-testid="tab-register"
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <>
                <Row icon={<User className="w-4 h-4" />}>
                  <input required placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" data-testid="cf-first-name" />
                </Row>
                <Row icon={<User className="w-4 h-4" />}>
                  <input placeholder="Nom (optionnel)" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" data-testid="cf-last-name" />
                </Row>
                <Row icon={<Phone className="w-4 h-4" />}>
                  <input placeholder="Téléphone (optionnel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" data-testid="cf-phone" />
                </Row>
              </>
            )}
            <Row icon={<Mail className="w-4 h-4" />}>
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" data-testid="cf-email" />
            </Row>
            <Row icon={<LockKeyhole className="w-4 h-4" />}>
              <input required type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" data-testid="cf-password" />
            </Row>
            <Button type="submit" disabled={busy} className="w-full h-12 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 font-bold" data-testid="btn-cf-submit">
              {busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <div className="mt-4 text-[11px] text-slate-500 text-center">
            En créant un compte tu obtiens ton QR fidélité et tu gagnes 1 point par euro dépensé.
          </div>
        </Card>
        <style>{`.input{background:transparent;border:none;outline:none;color:#f8fafc;flex:1;font-size:14px;height:42px}`}</style>
      </div>
    </div>
  );
}

function Row({ icon, children }) {
  return (
    <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-slate-950/60 border border-violet-500/20 focus-within:border-fuchsia-500/50">
      <span className="text-violet-300">{icon}</span>
      {children}
    </div>
  );
}
