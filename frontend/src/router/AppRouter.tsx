import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// Layout
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Auth Forms
import LoginForm from "../auth/LoginForm";
import SignupForm from "../auth/SignupForm";
import ConfirmForm from '../auth/ConfirmForm';
import ForgotPassword from "../auth/ForgotPassword";
import ResetPassword from '../auth/ResetPassword';


// App Pages
import Dashboard from "../pages/Dashboard";
import Items from "../pages/Items";
import ItemDetails from "../pages/ItemDetails";
import AddItem from "../pages/AddItem";
import Settings from "../pages/Settings";
import Family from "../pages/Family";
import AuthLayout from "../auth/AuthLayout";
import Account from "../pages/AccountSettings";

export default function AppRouter() {
  const AppLayout = () => (
    <>
      <Navbar />
      <main style={{ padding: "2rem", minHeight: "calc(100vh - 160px)" }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );

  return (
    <Routes>
      {/* Auth Pages — usam o AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<SignupForm />} />
        <Route path="/register/confirm" element={<ConfirmForm />} />
        <Route path="/login/forgot-password" element={<ForgotPassword />} />
        <Route path="/login/reset-password" element={<ResetPassword />} />
      </Route>

      {/* App Pages — com Navbar + Footer */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/new" element={<AddItem />} />
        <Route path="/items/:id" element={<ItemDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/family" element={<Family />} />
        <Route path="/profile" element={<Account />} />
      </Route>
    </Routes>
  );
}