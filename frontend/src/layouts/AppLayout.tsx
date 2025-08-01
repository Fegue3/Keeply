import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: "200px", background: "#eee" }}>Sidebar</aside>
      <main style={{ padding: "2rem", flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
