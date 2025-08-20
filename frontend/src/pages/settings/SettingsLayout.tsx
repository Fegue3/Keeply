// src/pages/settings/SettingsLayout.tsx
import { NavLink, Outlet, useLocation  } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import MobileSettingsDropdown from "./MobileSettingsDropdown";
import "./SettingsLayout.css";

const tabs = [
  { to: "/settings/profile", label: "Profile" },
  { to: "/settings/family",  label: "Family" },
  { to: "/settings/security", label: "Security" }, 
];

export default function SettingsLayout() {
  const location = useLocation();
  const current = tabs.find(t => location.pathname.startsWith(t.to))?.to || "/settings/profile";

  return (
    <>
      <Navbar />
      <main className="keeply-settings-shell">
        <div className="keeply-settings-grid">
          <aside className="keeply-settings-sidebar" aria-label="Settings navigation">
            <div className="keeply-settings-title">Settings</div>

            {/* Mobile dropdown */}
            <div className="keeply-settings-mobile">
              <MobileSettingsDropdown tabs={tabs} current={current} />
            </div>

            {/* Desktop list */}
            <nav className="keeply-settings-nav">
              {tabs.map(t => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) => `keeply-settings-link ${isActive ? "active" : ""}`}
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <section className="keeply-settings-content">
            <Outlet />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
