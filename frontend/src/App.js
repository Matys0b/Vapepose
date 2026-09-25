import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import InstallBanner from "./components/InstallBanner";
import KioskMode from "./components/KioskMode";
import OfflineBanner from "./components/OfflineBanner";
import Login from "./pages/Login";
import POS from "./pages/POS";
import BackOfficeLayout from "./pages/BackOfficeLayout";
import Dashboard from "./pages/Dashboard";
import ProductsPage from "./pages/Products";
import SalesPage from "./pages/Sales";
import CustomersPage from "./pages/Customers";
import StockPage from "./pages/Stock";
import SuppliersPage from "./pages/Suppliers";
import UsersPage from "./pages/Users";
import Accounting from "./pages/Accounting";
import Expenses from "./pages/Expenses";
import Statistics from "./pages/Statistics";
import "./App.css";

function Protected({ children, roles }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === null) return <div className="h-screen flex items-center justify-center text-slate-400">Chargement…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/pos" replace />;
  return children;
}

function LandingRedirect() {
  const { user } = useAuth();
  if (user === null) return <div className="h-screen flex items-center justify-center text-slate-400">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/pos" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" theme="dark" richColors closeButton />
        <KioskMode />
        <OfflineBanner />
        <InstallBanner />
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pos" element={<Protected><POS /></Protected>} />
          <Route path="/admin" element={<Protected roles={["admin", "manager"]}><BackOfficeLayout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="produits" element={<ProductsPage />} />
            <Route path="ventes" element={<SalesPage />} />
            <Route path="clients" element={<CustomersPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="fournisseurs" element={<SuppliersPage />} />
            <Route path="comptabilite" element={<Accounting />} />
            <Route path="statistiques" element={<Statistics />} />
            <Route path="depenses" element={<Expenses />} />
            <Route path="utilisateurs" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
