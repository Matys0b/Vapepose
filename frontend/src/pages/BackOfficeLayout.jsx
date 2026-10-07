import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import NotificationBell from "../components/NotificationBell";
import ThemeToggle from "../components/ThemeToggle";
import {
  LayoutDashboard, Package, Receipt, Users, Boxes, Truck, UserCog, ArrowLeft, LogOut, Zap,
  Calculator, BarChart3, Wallet, Sparkles
} from "lucide-react";

export default function BackOfficeLayout() {
  const { logout, user } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/ventes", label: "Ventes", icon: Receipt },
    { to: "/admin/produits", label: "Produits", icon: Package },
    { to: "/admin/stock", label: "Stock", icon: Boxes },
    { to: "/admin/fournisseurs", label: "Fournisseurs", icon: Truck },
    { to: "/admin/clients", label: "Clients", icon: Users },
    { to: "/admin/fidelite", label: "Fidélité", icon: Sparkles },
    { to: "/admin/comptabilite", label: "Comptabilité", icon: Calculator },
    { to: "/admin/depenses", label: "Dépenses", icon: Wallet },
    { to: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
    { to: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog, adminOnly: true },
  ];

  return (
    <div className="min-h-screen flex bg-[#0f0b1e] text-slate-100">
      <aside className="w-60 border-r border-violet-500/15 bg-slate-950/50 backdrop-blur flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2 border-b border-violet-500/15">
          <div className="w-9 h-9 rounded-lg aurora-badge flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-black gradient-text">VapePOS</div>
            <div className="text-[10px] uppercase tracking-widest text-violet-300/70">Gestion</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.filter((i) => !i.adminOnly || user?.role === "admin").map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`nav-${label.toLowerCase()}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition ${
                isActive ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-violet-500/15 space-y-1">
          <Button variant="outline" size="sm" onClick={() => nav("/pos")} className="w-full justify-start" data-testid="btn-back-to-pos">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la caisse
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start" data-testid="btn-logout-admin">
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto scroll-thin">
        <div className="sticky top-0 z-20 h-14 px-6 flex items-center justify-end gap-3 border-b border-violet-500/15 bg-[#0f0b1e]/70 backdrop-blur">
          <NotificationBell />
          <ThemeToggle />
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
