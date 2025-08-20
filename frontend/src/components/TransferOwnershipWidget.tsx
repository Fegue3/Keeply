import React, { useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import FamilyAvatar from "../pages/Family/FamilyAvatar";
import "./TransferOwnershipWidget.css";

type Member = {
  userId: string;
  role: "admin" | "member" | "parent" | "guardian";
  joinedAt?: string;
  name?: string | null;
  email?: string | null;
  initials?: string;
};

type Props = {
  familyId: string;
  members: Member[];
  mySub: string | null;
  onClose: () => void;
  onTransferred: (newOwnerUserId: string) => void;
};

const TransferOwnershipWidget: React.FC<Props> = ({
  familyId,
  members,
  mySub,
  onClose,
  onTransferred,
}) => {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const candidates = useMemo(
    () => members.filter((m) => m.userId !== mySub),
    [members, mySub]
  );

  async function handleTransfer() {
    setErr("");
    if (!selected) { setErr("Seleciona um utilizador."); return; }

    const person = members.find(m => m.userId === selected);
    const name = person?.name || person?.email || "Utilizador";

    if (!window.confirm(`Transferir propriedade para “${name}”? Deixarás de ser administrador.`)) {
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/families/${familyId}/transfer-owner`, {
        method: "POST",
        body: JSON.stringify({ newOwnerUserId: selected }),
      });
      onTransferred(selected);
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível transferir a propriedade.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="keeply-transferwidget__overlay" role="dialog" aria-modal="true" aria-label="Transferir propriedade">
      <div className="keeply-transferwidget__card">
        <button className="keeply-transferwidget__close" onClick={onClose} aria-label="Fechar">×</button>

        <h2 className="keeply-transferwidget__title">Transferir propriedade</h2>
        <p className="keeply-transferwidget__subtitle">
          Escolhe o novo administrador da família. O teu papel passará a <strong>member</strong>.
        </p>

        <div className="keeply-transferwidget__list">
          {candidates.length ? candidates.map((m) => (
            <label key={m.userId} className="keeply-transferwidget__row">
              <input
                type="radio"
                name="new-owner"
                className="keeply-transferwidget__selector"
                value={m.userId}
                onChange={() => setSelected(m.userId)}
                checked={selected === m.userId}
              />
              <div className="keeply-transferwidget__avatar">
                <FamilyAvatar
                  familyId={familyId}
                  userId={m.userId}
                  size={44}
                  initials={m.initials || initials(m.name || m.email || m.userId)}
                />
              </div>
              <div className="keeply-transferwidget__info">
                <div className="keeply-transferwidget__name">{m.name || "Utilizador"}</div>
                {m.email && <div className="keeply-transferwidget__email" title={m.email}>{m.email}</div>}
              </div>
              <div className="keeply-transferwidget__meta">
                <span className={`keeply-transferwidget__badge role-${m.role === "admin" ? "admin" : "member"}`}>{m.role}</span>
                {m.joinedAt && <span className="keeply-transferwidget__since">desde {new Date(m.joinedAt).toLocaleDateString()}</span>}
              </div>
            </label>
          )) : (
            <div className="keeply-transferwidget__empty">Sem candidatos disponíveis.</div>
          )}
        </div>

        {err && <div className="keeply-transferwidget__error">{err}</div>}

        <div className="keeply-transferwidget__actions">
          <button className="btn keeply-transferwidget__cancel" onClick={onClose}>Cancelar</button>
          <button
            className="btn keeply-transferwidget__confirm"
            onClick={handleTransfer}
            disabled={busy || !selected}
          >
            {busy ? "A transferir…" : "Transferir propriedade"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipWidget;

function initials(s: string) {
  return s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
