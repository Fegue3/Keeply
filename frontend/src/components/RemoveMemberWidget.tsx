import React, { useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import FamilyAvatar from "../pages/Family/FamilyAvatar";
import "./RemoveMemberWidget.css";

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
  onRemoved: (userId: string) => void;
};

const RemoveMembersWidget: React.FC<Props> = ({ familyId, members, mySub, onClose, onRemoved }) => {
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const selectable = useMemo(() => members.filter(m => m.userId !== mySub), [members, mySub]);

  async function handleRemove() {
    setErr("");
    if (!selected) { setErr("Seleciona um membro para remover."); return; }

    const victim = members.find(m => m.userId === selected);
    if (!victim) { setErr("Membro inválido."); return; }

    if (!window.confirm(`Tens a certeza que queres remover “${victim.name || victim.email || "Utilizador"}”?`)) return;

    setBusy(true);
    try {
      // === Chama a MESMA Lambda do FamilyView antigo ===
      await apiFetch(`/families/${familyId}/members/${selected}`, { method: "DELETE" });
      onRemoved(selected);
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível remover o membro.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="keeply-removewidget__overlay" role="dialog" aria-modal="true" aria-label="Remover membro">
      <div className="keeply-removewidget__card">
        <button className="keeply-removewidget__close" onClick={onClose} aria-label="Fechar">×</button>

        <h2 className="keeply-removewidget__title">Remover membro</h2>
        <p className="keeply-removewidget__subtitle">
          Seleciona quem pretendes remover desta família. Não podes remover a tua própria conta.
        </p>

        <div className="keeply-removewidget__list">
          {selectable.length ? selectable.map(m => (
            <label key={m.userId} className="keeply-removewidget__row">
              <input
                type="radio"
                name="member-select"
                className="keeply-removewidget__selector"
                value={m.userId}
                onChange={() => setSelected(m.userId)}
                checked={selected === m.userId}
              />
              <div className="keeply-removewidget__avatar">
                <FamilyAvatar
                  familyId={familyId}
                  userId={m.userId}
                  size={44}
                  initials={m.initials || initials(m.name || m.email || m.userId)}
                />
              </div>
              <div className="keeply-removewidget__info">
                <div className="keeply-removewidget__name">{m.name || "Utilizador"}</div>
                {m.email && <div className="keeply-removewidget__email" title={m.email}>{m.email}</div>}
              </div>
              <div className="keeply-removewidget__meta">
                <span className={`keeply-removewidget__badge role-${m.role === "admin" ? "admin" : "member"}`}>{m.role}</span>
                {m.joinedAt && <span className="keeply-removewidget__since">desde {new Date(m.joinedAt).toLocaleDateString()}</span>}
              </div>
            </label>
          )) : (
            <div className="keeply-removewidget__empty">Não há membros removíveis.</div>
          )}
        </div>

        {err && <div className="keeply-removewidget__error">{err}</div>}

        <div className="keeply-removewidget__actions">
          <button className="keeply-removewidget__cancel btn" onClick={onClose}>Cancelar</button>
          <button
            className="keeply-removewidget__remove btn"
            onClick={handleRemove}
            disabled={busy || !selected}
            title="Remover membro selecionado"
          >
            {busy ? "A remover…" : "Remover membro"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveMembersWidget;

function initials(s: string) {
  return s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
