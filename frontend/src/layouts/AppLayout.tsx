import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AppLayout() {
  return (
    <div>
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <main style={{ padding: "2rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
