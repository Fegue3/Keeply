import React, { useState } from "react";
import { apiFetch } from "../../api/client";
import "./family.css";

export function NoFamilyPanel({ onChanged }: { onChanged: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "accept" | null>(null);

  async function createFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("create");
    setMsg(null);
    try {
      await apiFetch("/families", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() })
      });
      onChanged();
    } catch (e: any) {
      setMsg(e.message || "Não foi possível criar a família.");
    } finally {
      setBusy(null);
    }
  }

  async function acceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy("accept");
    setMsg(null);
    try {
      await apiFetch("/invites/accept", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }) // ✅ só código
      });
      onChanged();
    } catch (e: any) {
      const backendMsg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) || null;
      setMsg(backendMsg || e.message || "Não foi possível aceitar o convite.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fam__container">
      <div className="fam__split">
        <div className="fam__hero">
          <h1>Não tens nenhuma família ainda</h1>
          <p>Cria já a tua família Keeply ou entra com um código de convite.</p>
        </div>

        <div className="fam__actions">
          <form className="card" onSubmit={createFamily}>
            <h2>Criar família</h2>
            <label className="field">
              <span>Nome</span>
              <input className="input" type="text" placeholder="Ex.: Família Pereira"
                     value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn btn--primary" disabled={busy === "create"}>
              {busy === "create" ? "A criar…" : "Criar"}
            </button>
            <p className="hint">Podes convidar membros depois.</p>
          </form>

          <form className="card" onSubmit={acceptInvite}>
            <div className="card__top">
              <h2>Entrar com código</h2>
              <span className="chip">Convite</span>
            </div>
            <label className="field">
              <span>Código</span>
              <input className="input" type="text" placeholder="Ex.: FAM-ABC123"
                     value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <button className="btn" disabled={busy === "accept"}>
              {busy === "accept" ? "A entrar…" : "Entrar"}
            </button>
            <p className="hint">Cola apenas o código partilhado contigo.</p>
          </form>

          {msg && <div className="alert alert--error">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
