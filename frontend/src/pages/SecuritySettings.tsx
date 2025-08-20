// src/pages/settings/SecuritySettings.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import "./SecuritySettings.css";

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const goChangePassword = () => {
    // ajusta se o teu route do ForgotPassword for diferente
    navigate("/login/forgot-password");
  };

  const logout = () => {
    try {
      // limpa o que usas no login
      localStorage.removeItem("keeply_token");
      localStorage.removeItem("keeply_user");
      sessionStorage.clear();
    } catch {}
    navigate("/login");
  };

  const deleteAccount = async () => {
    if (!window.confirm("⚠️ This will permanently delete your account and related data. Continue?")) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      // ⬇️ ajusta este endpoint ao que tiveres no backend
      await apiFetch("/account", { method: "DELETE" });
      setOk("Account deleted. Redirecting…");
      setTimeout(() => logout(), 900);
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Could not delete the account.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="security">
      <header className="security__header">
        <h1 className="security__title">Security</h1>
        <p className="security__subtitle">Manage password, sessions and account lifecycle.</p>
      </header>

      {err && <div className="sec-alert sec-alert--error">{err}</div>}
      {ok && <div className="sec-alert sec-alert--ok">{ok}</div>}

      <div className="sec-card">
        <div className="sec-card__text">
          <div className="sec-card__title">Change password</div>
          <div className="sec-card__desc">You will be redirected to the reset password form.</div>
        </div>
        <div className="sec-card__action">
          <button className="sec-btn sec-btn--ghost" onClick={goChangePassword}>
            Change password
          </button>
        </div>
      </div>

      <div className="sec-card">
        <div className="sec-card__text">
          <div className="sec-card__title">Log out</div>
          <div className="sec-card__desc">End your current session on this device.</div>
        </div>
        <div className="sec-card__action">
          <button className="sec-btn sec-btn--ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="sec-card sec-card--danger">
        <div className="sec-card__text">
          <div className="sec-card__title">Danger Zone</div>
          <div className="sec-card__desc">Delete your account permanently. This action cannot be undone.</div>
        </div>
        <div className="sec-card__action">
          <button
            className="sec-btn sec-btn--ghost"
            onClick={deleteAccount}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
