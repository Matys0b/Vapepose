import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CustomerAuthProvider, useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Home, Sparkles, QrCode, Store, User, Zap } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import ThemeToggle from "../../components/ThemeToggle";

export default function ClientLayout() {
  return (
    <CustomerAuthProvider>
      <Shell />
    </CustomerAuthProvider>
  );
}

function Shell() {
  const { customer } = useCustomerAuth();
  const loc = useLocation();
  const isLoginRoute = loc.pathname.endsWith("/login");

  return (
    <div className="min-h-screen bg-[#0f0b1e] text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      {customer && !isLoginRoute && (
        <header className="relative sticky top-0 z-30 backdrop-blur-md bg-[#0f0b1e]/70 border-b border-violet-500/15">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg aurora-badge flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-violet-300/70 leading-none">Cha Va'Pote</div>
                <div className="font-display font-black text-sm leading-tight">Salut {customer.first_name} 👋</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <main className="relative pb-28">
        <Outlet />
      </main>

      {customer && !isLoginRoute && (
        <nav
          className="fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto glass-card rounded-2xl shadow-xl border border-violet-500/25 bottom-safe"
          data-testid="client-bottom-nav"
        >
          <div className="grid grid-cols-5 h-16 relative">
            <BottomTab to="/client/me" icon={Home} label="Accueil" end />
            <BottomTab to="/client/me/fidelite" icon={Sparkles} label="Fidélité" />
            <QrTab to="/client/me/qr" />
            <BottomTab to="/client/me/boutique" icon={Store} label="Boutique" />
            <BottomTab to="/client/me/profil" icon={User} label="Profil" />
          </div>
        </nav>
      )}
    </div>
  );
}

function BottomTab({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={`tab-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${
          isActive ? "text-fuchsia-300" : "text-slate-400"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`w-10 h-6 rounded-xl flex items-center justify-center ${isActive ? "bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20" : ""}`}>
            <Icon className="w-4 h-4" />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function QrTab({ to }) {
  return (
    <NavLink
      to={to}
      data-testid="tab-mon-qr"
      className="flex flex-col items-center justify-center -mt-6"
    >
      {({ isActive }) => (
        <>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition ${
              isActive
                ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 ring-4 ring-fuchsia-400/30"
                : "bg-gradient-to-br from-fuchsia-500 to-violet-600"
            }`}
          >
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 mt-0.5">Mon QR</span>
        </>
      )}
    </NavLink>
  );
}
