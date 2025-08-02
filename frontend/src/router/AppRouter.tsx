import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Items from "../pages/Items";
import ItemDetails from "../pages/ItemDetails";
import AddItem from "../pages/AddItem";
import Settings from "../pages/Settings";
import Family from "../pages/Family";

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth Routes (sem Navbar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Layout com Navbar + Outlet inline */}
      <Route
        element={
          <>
            <Navbar />
            <main style={{ padding: "2rem" }}>
              <Outlet />
            </main>
          </>
        }
      >
        {/* Redirecionar raiz para dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Rotas protegidas (ou públicas com navbar) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/new" element={<AddItem />} />
        <Route path="/items/:id" element={<ItemDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/family" element={<Family />} />
      </Route>
    </Routes>
  );
}
