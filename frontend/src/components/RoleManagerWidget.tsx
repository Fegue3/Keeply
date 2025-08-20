import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FamilyAvatar from "../pages/Family/FamilyAvatar";
import { apiFetch } from "../api/client";
import "./RoleManagerWidget.css";

type Role = "admin" | "parent" | "guardian" | "member";

type Member = {
  userId: string;
  role: Role;
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
  onRoleChanged: (userId: string, newRole: Role) => void;
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "admin",
  parent: "parent",
  guardian: "guardian",
  member: "member",
};

const ROLE_CHOICES: Role[] = ["parent", "guardian", "member"];

function initials(s: string) {
  return s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

type MenuPos = {
  top: number;
  left: number;
  width: number;
  dir: "down" | "up";
};

const RoleManagerWidget: React.FC<Props> = ({
  familyId,
  members,
  mySub,
  onClose,
  onRoleChanged,
}) => {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.userId === mySub ? -1 : b.userId === mySub ? 1 : (a.name || "").localeCompare(b.name || "")
      ),
    [members, mySub]
  );

  const adminsCount = members.reduce((n, m) => (m.role === "admin" ? n + 1 : n), 0);

  // fechar ao clicar fora
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
  const card = cardRef.current;
  if (!card) return;

  const target = e.target as HTMLElement;

  // se clicou dentro do card, ignora
  if (card.contains(target)) return;

  // se clicou no dropdown overlay ou menu, ignora
  if (
    target.closest(".keeply-roles__dropdown-wrap") ||
    target.closest(".keeply-roles__dropdown-fixed")
  ) {
    return;
  }

  // senão, fecha o modal
  onClose();
}

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (openFor) {
          setOpenFor(null);
          setMenuPos(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openFor, onClose]);

  // calcular posição absoluta
  const calcMenuPos = (userId: string) => {
    const btn = btnRefs.current[userId];
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const dir: "down" | "up" =
      spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? "down" : "up";

    const top = dir === "down" ? r.bottom + 6 : r.top - 6;
    const left = r.right - 200;
    const width = 200;
    return { top, left: Math.max(12, left), width, dir };
  };

  function toggleFor(userId: string) {
    setOpenFor((prev) => {
      const next = prev === userId ? null : userId;
      if (next) {
        const pos = calcMenuPos(next);
        setMenuPos(pos);
      } else {
        setMenuPos(null);
      }
      return next;
    });
  }

  useLayoutEffect(() => {
    if (!openFor) return;

    const update = () => {
      const pos = calcMenuPos(openFor);
      if (pos) setMenuPos(pos);
    };

    const card = cardRef.current;
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    card?.addEventListener("scroll", update, { passive: true });

    const t = setTimeout(update, 0);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      card?.removeEventListener("scroll", update as any);
      clearTimeout(t);
    };
  }, [openFor]);

  async function choose(userId: string, newRole: Role) {
    setBusyFor(userId);
    setErr(null);
    try {
      await apiFetch(`/families/${familyId}/set-role`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: userId, newRole }),
      });
      onRoleChanged(userId, newRole);
      setOpenFor(null);
      setMenuPos(null);
    } catch (e: any) {
      const msg =
        (e?.bodyText &&
          (() => {
            try {
              return JSON.parse(e.bodyText).message;
            } catch {
              return null;
            }
          })()) ||
        e?.message ||
        "Não foi possível alterar o papel.";
      setErr(msg);
    } finally {
      setBusyFor(null);
    }
  }

  function onDropdownBackdropClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains("keeply-roles__dropdown-wrap")) {
      setOpenFor(null);
      setMenuPos(null);
    }
  }

  return (
    <div className="keeply-roles__overlay" ref={overlayRef} role="dialog" aria-modal="true">
      <div className="keeply-roles__card" ref={cardRef}>
        <button className="keeply-roles__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <h2 className="keeply-roles__title">Gerir papéis</h2>
        <p className="keeply-roles__subtitle">
          Atribui <strong>parent</strong>, <strong>guardian</strong> ou <strong>member</strong>.{" "}
          Para tornar alguém <strong>admin</strong>, usa <em>Transferir propriedade</em>.
        </p>

        <div className="keeply-roles__list">
          {sorted.map((m) => {
            const isMe = m.userId === mySub;
            const isAdmin = m.role === "admin";
            const isLastAdmin = isAdmin && adminsCount <= 1;

            return (
              <div className="keeply-roles__row" key={m.userId}>
                <div className="keeply-roles__left">
                  <FamilyAvatar
                    familyId={familyId}
                    userId={m.userId}
                    size={44}
                    initials={m.initials || initials(m.name || m.email || m.userId)}
                  />
                  <div className="keeply-roles__who">
                    <div className="keeply-roles__name">
                      {m.name || "Utilizador"} {isMe && <span className="keeply-roles__me">(tu)</span>}
                    </div>
                    {m.email && <div className="keeply-roles__email">{m.email}</div>}
                  </div>
                </div>

                <div className="keeply-roles__right">
                  {isAdmin ? (
                    <button
                      className="keeply-roles__rolebtn is-disabled"
                      disabled
                      title="O papel de admin só pode ser transferido"
                    >
                      {ROLE_LABEL[m.role]}
                    </button>
                  ) : (
                    <button
                      ref={(el) => {
                        btnRefs.current[m.userId] = el;
                      }}
                      className={`keeply-roles__rolebtn ${isLastAdmin ? "is-disabled" : ""}`}
                      disabled={busyFor === m.userId || isLastAdmin}
                      onClick={() => toggleFor(m.userId)}
                      aria-expanded={openFor === m.userId}
                      title={isLastAdmin ? "Não podes retirar o último admin" : "Alterar papel"}
                    >
                      {ROLE_LABEL[m.role]}
                      <span className="keeply-roles__chev" aria-hidden>
                        ▾
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {err && <div className="keeply-roles__error">{err}</div>}
      </div>

      {openFor && menuPos && (
        <div className="keeply-roles__dropdown-wrap" onMouseDown={onDropdownBackdropClick}>
          <div
            className={`keeply-roles__dropdown-fixed ${menuPos.dir === "up" ? "is-up" : "is-down"} is-open`}
            style={{
              top: menuPos.dir === "down" ? menuPos.top : undefined,
              bottom: menuPos.dir === "up" ? `calc(100vh - ${menuPos.top}px)` : undefined,
              left: menuPos.left,
              width: menuPos.width,
            }}
          >
            {ROLE_CHOICES.map((r) => (
              <button
                key={r}
                className="keeply-roles__opt"
                onClick={() => choose(openFor, r)}
                disabled={busyFor === openFor}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagerWidget;
