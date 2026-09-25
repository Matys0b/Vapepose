import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { LockKeyhole, Mail, KeyRound, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, pinLogin } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Bienvenue ${u.name}`);
      nav(u.role === "cashier" ? "/pos" : "/pos");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Connexion impossible");
    } finally { setBusy(false); }
  };

  const submitPin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await pinLogin(pin);
      toast.success(`Bienvenue ${u.name}`);
      nav("/pos");
    } catch (err) {
      toast.error(err.response?.data?.detail || "PIN invalide");
      setPin("");
    } finally { setBusy(false); }
  };

  const pushPin = (d) => setPin((p) => (p.length < 8 ? p + d : p));
  const backPin = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-6">
        <div className="hidden md:flex flex-col justify-between p-8 rounded-3xl bg-gradient-to-br from-violet-700/40 via-fuchsia-700/30 to-pink-600/20 border border-violet-500/30">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-display text-2xl font-black tracking-tight">VapePOS</div>
                <div className="text-xs text-violet-200/80">Cha Va'Pote</div>
              </div>
            </div>
            <h1 className="font-display text-4xl font-black leading-tight mb-4">
              La caisse la plus <span className="text-pink-300">rapide</span><br /> pour boutiques de vape.
            </h1>
            <p className="text-slate-300/90 text-sm max-w-sm">
              Interface tactile paysage, scan produit instantané, encaissement en quelques secondes. Vos vendeurs vont adorer.
            </p>
          </div>
          <div className="text-xs text-slate-400/70 mt-8">Optimisé tablette 10"+ – posée horizontalement.</div>
        </div>

        <Card className="bg-slate-900/70 backdrop-blur border-violet-500/20 p-6 shadow-2xl">
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={mode === "email" ? "default" : "outline"}
              className={mode === "email" ? "flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" : "flex-1"}
              onClick={() => setMode("email")}
              data-testid="tab-email"
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button
              type="button"
              variant={mode === "pin" ? "default" : "outline"}
              className={mode === "pin" ? "flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" : "flex-1"}
              onClick={() => setMode("pin")}
              data-testid="tab-pin"
            >
              <KeyRound className="w-4 h-4 mr-2" /> PIN Vendeur
            </Button>
          </div>

          {mode === "email" ? (
            <form onSubmit={submitEmail} className="space-y-4" data-testid="form-login-email">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    data-testid="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@vapepos.local"
                    className="pl-9 h-12 bg-slate-950/50 border-violet-500/20"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mot de passe</label>
                <div className="relative mt-1">
                  <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    data-testid="input-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-12 bg-slate-950/50 border-violet-500/20"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-12 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 hover:opacity-95 font-semibold"
                data-testid="btn-login-submit"
              >
                {busy ? "Connexion…" : "Se connecter"}
              </Button>
              <div className="text-xs text-slate-500 text-center pt-2">
                Démo : admin@vapepos.local · vendeur@vapepos.local
              </div>
            </form>
          ) : (
            <form onSubmit={submitPin} className="space-y-4" data-testid="form-login-pin">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Code PIN Vendeur</label>
                <div className="mt-2 h-16 rounded-xl bg-slate-950/70 border border-violet-500/20 flex items-center justify-center gap-2 font-mono-num text-3xl">
                  {(pin.padEnd(4, "•")).slice(0, Math.max(4, pin.length)).split("").map((c, i) => (
                    <span key={i} className={i < pin.length ? "text-pink-300" : "text-slate-700"}>{i < pin.length ? "•" : c}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9"].map((d) => (
                  <button key={d} type="button" data-testid={`pin-${d}`} onClick={() => pushPin(d)} className="numpad-key">{d}</button>
                ))}
                <button type="button" onClick={backPin} className="numpad-key text-slate-400">⌫</button>
                <button type="button" data-testid="pin-0" onClick={() => pushPin("0")} className="numpad-key">0</button>
                <button type="submit" disabled={busy || pin.length < 4} data-testid="btn-pin-submit" className="numpad-key bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 text-white disabled:opacity-40">OK</button>
              </div>
              <div className="text-xs text-slate-500 text-center pt-2">
                Démo : PIN 1234 (Thomas) · 4321 (Lucie) · 2580 (Manager)
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
