import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import "./family.css";

type Member = {
  userId: string;
  role: "admin" | "member" | "parent" | "guardian";
  joinedAt?: string;
  name?: string | null;
  email?: string | null;
  initials?: string;
};

type Family = {
  familyId: string;
  name: string;
  description?: string;
  plan?: "free" | "plus" | "family";
  createdAt?: string;
  createdBy?: string;
  members: Member[];
};

export function FamilyView({ family, onRefresh }: { family: Family; onRefresh: () => void }) {
  const [members, setMembers] = useState<Member[]>(family.members || []);
  const [membersLoading, setMembersLoading] = useState<boolean>(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [removeMode, setRemoveMode] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErr, setRemoveErr] = useState<string | null>(null);

  const [dangerErr, setDangerErr] = useState<string | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function loadMembers() {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const data = await apiFetch<{ familyId: string; members: Member[] }>("/families/users");
        if (!cancel) setMembers(data.members || []);
      } catch (e: any) {
        if (!cancel) setMembersError(e.message || "Não foi possível carregar os membros.");
      } finally {
        if (!cancel) setMembersLoading(false);
      }
    }
    loadMembers();
    return () => { cancel = true; };
  }, [family.familyId]);

  function getMySub(): string | null {
    try {
      const raw = localStorage.getItem("keeply_token");
      if (!raw) return null;
      const { idToken } = JSON.parse(raw);
      if (!idToken) return null;
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      return payload?.sub || null;
    } catch { return null; }
  }
  const mySub = getMySub();

  const me = members.find(m => m.userId === mySub) || null;
  const iAmAdmin = !!me && ["admin","parent","guardian"].includes(me.role); // tratam como “admin roles”
  const canShowRemoveMode = iAmAdmin && members.length > 1;

  // == Ações de membro ==
  async function removeMember(userId: string) {
    if (!iAmAdmin) return;
    if (!window.confirm("Tens a certeza que queres remover este membro?")) return;

    setRemovingId(userId);
    setRemoveErr(null);
    try {
      await apiFetch(`/families/${family.familyId}/members/${userId}`, { method: "DELETE" });
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível remover o membro.";
      setRemoveErr(msg);
    } finally {
      setRemovingId(null);
    }
  }

  async function createInvite() {
    setInviteBusy(true);
    setInviteErr(null);
    setInviteCode(null);
    try {
      const res = await apiFetch<{ code?: string; inviteId: string; expiresAt: string }>("/invites", {
        method: "POST",
        body: JSON.stringify({ familyId: family.familyId, type: "code" })
      });
      if (!res.code) throw new Error("O backend não devolveu código.");
      setInviteCode(res.code);
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível gerar convite.";
      setInviteErr(msg);
    } finally {
      setInviteBusy(false);
    }
  }

  function copyInvite() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  // == Ações perigosas ==
  async function deleteFamily() {
    if (!iAmAdmin) return;
    if (!window.confirm("⚠️ Isto vai apagar a família e todos os dados associados. Continuar?")) return;
    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}`, { method: "DELETE" });
      // após apagar, pede ao pai para recarregar/ir embora
      onRefresh();
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível apagar a família.";
      setDangerErr(msg);
    } finally {
      setDangerBusy(false);
    }
  }

  async function leaveFamily() {
    if (!mySub) return;
    if (iAmAdmin) {
      // admins não podem “sair” com este botão — devem transferir ou apagar
      return;
    }
    if (!window.confirm("Queres mesmo sair desta família?")) return;

    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}/members/${mySub}`, { method: "DELETE" });
      onRefresh();
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Não foi possível sair da família.";
      setDangerErr(msg);
    } finally {
      setDangerBusy(false);
    }
  }

  return (
    <div className="fam__container">
      <header className="fam__header">
        <div>
          <h1 className="fam__title">{family.name || "Família"}</h1>
          <div className="fam__meta">
            <span className="tag is-static">{family.plan || "free"}</span>
            {family.createdAt && (
              <span className="muted">Criada em {new Date(family.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div>
          <button className="btn btn--primary" onClick={createInvite} disabled={inviteBusy}>
            {inviteBusy ? "A gerar…" : "Convidar membro"}
          </button>

          {canShowRemoveMode && (
            <button
              className={`btn btn--danger ${removeMode ? "is-on" : ""}`}
              style={{ marginLeft: 8 }}
              onClick={() => setRemoveMode(v => !v)}
            >
              {removeMode ? "Cancelar" : "Remover membro"}
            </button>
          )}

          {/* Botões perigosos à direita */}
          {iAmAdmin ? (
            <button
              className="btn btn--danger"
              style={{ marginLeft: 8 }}
              onClick={deleteFamily}
              disabled={dangerBusy}
              title="Apagar família"
            >
              {dangerBusy ? "A apagar…" : "Apagar família"}
            </button>
          ) : (
            <button
              className="btn btn--ghost"
              style={{ marginLeft: 8 }}
              onClick={leaveFamily}
              disabled={dangerBusy}
              title="Sair da família"
            >
              {dangerBusy ? "A sair…" : "Sair da família"}
            </button>
          )}

          {(inviteErr || removeErr || dangerErr) && (
            <div className="alert alert--error" style={{ marginTop: 8 }}>
              {inviteErr || removeErr || dangerErr}
            </div>
          )}
        </div>
      </header>

      {inviteCode && (
        <div className="invite__box">
          <div className="invite__code" title="Clique para copiar" onClick={copyInvite}>
            {inviteCode}
          </div>
          <button className="btn" onClick={copyInvite}>{copied ? "Copiado!" : "Copiar"}</button>
        </div>
      )}

      <section className="fam__section">
        <h2>Membros</h2>

        {membersLoading && <div className="muted">A carregar membros…</div>}
        {membersError && <div className="alert alert--error">{membersError}</div>}

        {!membersLoading && !membersError && (
          <div className="members__grid">
            {members.length ? members.map((m) => (
              <div className="member card" key={m.userId}>
                {/* botão X para remover - só em modo remover e só se houver >1 membro */}
                {removeMode && canShowRemoveMode && iAmAdmin && m.userId !== mySub && (
                  <button
                    className="member__remove"
                    title="Remover membro"
                    onClick={() => removeMember(m.userId)}
                    disabled={removingId === m.userId}
                  >
                    {removingId === m.userId ? "…" : "×"}
                  </button>
                )}

                <div className="member__left">
                  <div className="avatar">{m.initials || initials(m.name || m.email || m.userId)}</div>
                  <div className="member__info">
                    <div className="member__name">{m.name || "Utilizador"}</div>
                    {m.email && <div className="member__email" title={m.email}>{m.email}</div>}
                  </div>
                </div>
                <div className="member__right">
                  <span className={`badge role-${m.role === "admin" ? "admin" : "member"}`}>{m.role}</span>
                  {m.joinedAt && <span className="member__since">desde {new Date(m.joinedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            )) : (
              <div className="muted">Sem membros listados.</div>
            )}
          </div>
        )}
      </section>

      <section className="fam__section">
        <h2>Informação</h2>
        <div className="info__grid">
          <div className="kv"><span className="kv__k">ID</span><span className="kv__v">{family.familyId || "—"}</span></div>
          {family.description && <div className="kv"><span className="kv__k">Descrição</span><span className="kv__v">{family.description}</span></div>}
          {family.createdBy && <div className="kv"><span className="kv__k">Criada por</span><span className="kv__v">{family.createdBy}</span></div>}
        </div>
      </section>
    </div>
  );
}

function initials(s: string) {
  return s
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
