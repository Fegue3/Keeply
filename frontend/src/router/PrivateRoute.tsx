import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem("token"); // ou estado global
  return isAuthenticated ? children : <Navigate to="/" />;
}
