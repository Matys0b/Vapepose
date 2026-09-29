import { Navigate, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { LogOut, Save, Trash2, Shield, User, Phone, Mail, Lock, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";

export default function ClientProfile() {
  const { customer, logout, updateProfile, deleteAccount } = useCustomerAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (customer) setForm({
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      phone: customer.phone || "",
    });
  }, [customer]);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(form);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (!pw.current || pw.next.length < 6) { toast.error("6 caractères min pour le nouveau"); return; }
    setBusy(true);
    try {
      await api.put("/customer/profile", { current_password: pw.current, new_password: pw.next });
      toast.success("Mot de passe modifié");
      setPw({ current: "", next: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (confirm !== "SUPPRIMER") { toast.error('Tape "SUPPRIMER" en majuscules pour confirmer'); return; }
    if (!window.confirm("Suppression définitive de ton compte. Es-tu sûr ?")) return;
    setBusy(true);
    try {
      await deleteAccount();
      toast.success("Compte supprimé");
      nav("/login");
    } catch { toast.error("Impossible de supprimer"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card className="p-4 bg-slate-900/70 border-violet-500/20" data-testid="profile-info">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center font-display text-2xl font-black text-white">
            {customer.first_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black text-lg truncate">{customer.first_name} {customer.last_name}</div>
            <div className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</div>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-2">
          <Row icon={<User className="w-4 h-4" />}><input placeholder="Prénom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="p-input" data-testid="pf-first-name" /></Row>
          <Row icon={<User className="w-4 h-4" />}><input placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="p-input" data-testid="pf-last-name" /></Row>
          <Row icon={<Phone className="w-4 h-4" />}><input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="p-input" data-testid="pf-phone" /></Row>
          <Button type="submit" disabled={busy} className="w-full h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold" data-testid="btn-save-profile">
            <Save className="w-4 h-4 mr-1" /> Enregistrer
          </Button>
        </form>
      </Card>

      <Card className="p-4 bg-slate-900/70 border-violet-500/20">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> Mot de passe
        </div>
        <form onSubmit={changePw} className="space-y-2">
          <Row icon={<Lock className="w-4 h-4" />}><input type="password" placeholder="Mot de passe actuel" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="p-input" data-testid="pf-current-pw" /></Row>
          <Row icon={<Lock className="w-4 h-4" />}><input type="password" placeholder="Nouveau (6+ caractères)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="p-input" data-testid="pf-new-pw" /></Row>
          <Button type="submit" variant="outline" disabled={busy} className="w-full h-10" data-testid="btn-change-pw">
            Modifier
          </Button>
        </form>
      </Card>

      <Card className="p-4 bg-slate-900/70 border-violet-500/20">
        <a href="/privacy" target="_blank" className="flex items-center justify-between text-sm hover:text-fuchsia-300" data-testid="link-privacy">
          <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-violet-300" /> Politique de confidentialité</span>
          <Shield className="w-4 h-4 text-slate-500" />
        </a>
      </Card>

      <Button variant="outline" onClick={() => { logout(); nav("/login"); }} className="w-full h-12 border-slate-700" data-testid="btn-client-logout">
        <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
      </Button>

      <Card className="p-4 bg-rose-950/30 border-rose-500/30">
        <div className="text-sm font-bold text-rose-200 flex items-center gap-2 mb-1">
          <Trash2 className="w-4 h-4" /> Zone dangereuse
        </div>
        <div className="text-xs text-rose-200/70 mb-3">
          Suppression définitive de ton compte et de tes données personnelles. Cette action est irréversible.
        </div>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder='Écris "SUPPRIMER" pour confirmer'
          className="w-full h-10 rounded-lg bg-slate-950/60 border border-rose-500/30 px-3 text-sm mb-2"
          data-testid="pf-delete-confirm"
        />
        <Button onClick={doDelete} disabled={busy || confirm !== "SUPPRIMER"} className="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40" data-testid="btn-delete-account">
          Supprimer mon compte
        </Button>
      </Card>

      <div className="text-[10px] text-slate-500 text-center pt-2 pb-2">
        VapePOS · Cha Va'Pote — v{customer.version || "1.0"}
      </div>
      <style>{`.p-input{background:transparent;border:none;outline:none;color:#f8fafc;flex:1;font-size:14px;height:40px}`}</style>
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
