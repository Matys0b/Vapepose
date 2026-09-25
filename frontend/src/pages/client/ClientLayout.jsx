import { Outlet } from "react-router-dom";
import { CustomerAuthProvider } from "../../contexts/CustomerAuthContext";

export default function ClientLayout() {
  return (
    <CustomerAuthProvider>
      <div className="min-h-screen bg-[#0f0b1e] text-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative">
          <Outlet />
        </div>
      </div>
    </CustomerAuthProvider>
  );
}
