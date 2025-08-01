import { Routes, Route } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import PrivateRoute from "./PrivateRoute";

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
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
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
