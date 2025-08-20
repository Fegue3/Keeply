import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import FamilyAvatar from "./FamilyAvatar";
import RemoveMemberWidget from "../../components/RemoveMemberWidget";
import RoleManagerWidget from "../../components/RoleManagerWidget";
import TransferOwnerWidget from "../../components/TransferOwnershipWidget";
import "./family.css";

type Role = "admin" | "member" | "parent" | "guardian";

type Member = {
  userId: string;
  role: Role;
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

  const [dangerErr, setDangerErr] = useState<string | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);

  // modais
  const [removeOpen, setRemoveOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

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

  // Gestores: admin, parent, guardian
  const isManager = !!me && ["admin","parent","guardian"].includes(me.role);
  // Zona perigosa só admin
  const isOwnerAdmin = !!me && me.role === "admin";

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
    if (!isOwnerAdmin) return;
    if (!window.confirm("⚠️ Isto vai apagar a família e todos os dados associados. Continuar?")) return;
    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}`, { method: "DELETE" });
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
    if (isOwnerAdmin) return; // admins não saem por aqui
    if (!window.confirm("Queres mesmo sair desta família?")) return;

    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}/leave`, { method: "DELETE" });
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

  // callbacks dos modais
  const handleRemoved = (userId: string) => {
    setMembers(prev => prev.filter(m => m.userId !== userId));
    setRemoveOpen(false);
  };

  const handleRoleChanged = (userId: string, newRole: Role) => {
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
  };

  const handleTransferred = (newOwnerUserId: string) => {
    setMembers(prev =>
      prev.map(m =>
        m.userId === newOwnerUserId
          ? { ...m, role: "admin" }
          : (m.userId === mySub ? { ...m, role: "member" } : m)
      )
    );
    setTransferOpen(false);
  };

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
      </header>

      <section className="fam__section">
        <h2>Membros</h2>

        {membersLoading && <div className="muted">A carregar membros…</div>}
        {membersError && <div className="alert alert--error">{membersError}</div>}

        {!membersLoading && !membersError && (
          <div className="members__grid">
            {members.length ? members.map((m) => (
              <div className="member card" key={m.userId}>
                <div className="member__left">
                  <FamilyAvatar
                    familyId={family.familyId}
                    userId={m.userId}
                    size={42}
                    initials={m.initials || initials(m.name || m.email || m.userId)}
                  />
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

      {/* ===== Admin Privileges / Danger Zone ===== */}
      <section className="fam__section keeply-adminzone">
        <div className="keeply-adminzone__header">
          <h2>Admin Privileges</h2>
          <span className="chip">{isManager ? "Apenas administradores" : "Opções da conta"}</span>
        </div>

        <div className="keeply-adminzone__rows">

          {/* Convidar membro */}
          {isManager && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Convidar membro</div>
                <div className="keeply-adminzone__desc">
                  Gera um código de convite para adicionar novos utilizadores à família.
                </div>
                {inviteCode && (
                  <div className="keeply-adminzone__invite">
                    <div className="invite__code" title="Clique para copiar" onClick={copyInvite}>
                      {inviteCode}
                    </div>
                    <button className="btn" onClick={copyInvite}>{copied ? "Copiado!" : "Copiar"}</button>
                  </div>
                )}
                {inviteErr && <div className="alert alert--error" style={{ marginTop: 8 }}>{inviteErr}</div>}
              </div>

              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={createInvite}
                  disabled={inviteBusy}
                  title="Gerar código de convite"
                >
                  {inviteBusy ? "A gerar…" : "Gerar convite"}
                </button>
              </div>
            </div>
          )}

          {/* Remover membro (abre modal) */}
          {isManager && members.length > 1 && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Remover membros</div>
                <div className="keeply-adminzone__desc">
                  Abre o seletor para escolher quem remover. Não podes remover a tua própria conta.
                </div>
              </div>
              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={() => setRemoveOpen(true)}
                >
                  Remover membro
                </button>
              </div>
            </div>
          )}

          {/* Gerir papéis (abre modal) */}
          {isManager && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Gerir papéis</div>
                <div className="keeply-adminzone__desc">
                  Define <strong>parent</strong>, <strong>guardian</strong> ou <strong>member</strong> para cada utilizador.
                </div>
              </div>
              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={() => setRolesOpen(true)}
                >
                  Gerir papéis
                </button>
              </div>
            </div>
          )}

          {/* Transferir propriedade (admin only) */}
          {isOwnerAdmin && members.length > 1 && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Transferir propriedade</div>
                <div className="keeply-adminzone__desc">
                  Passa o papel de <strong>admin</strong> para outro membro. O teu papel passa a <strong>member</strong>.
                </div>
              </div>
              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={() => setTransferOpen(true)}
                >
                  Transferir propriedade
                </button>
              </div>
            </div>
          )}

          {/* Zona perigosa */}
          <div className="keeply-adminzone__row keeply-adminzone__row--danger">
            <div className="keeply-adminzone__text">
              <div className="keeply-adminzone__title">Zona perigosa</div>
              <div className="keeply-adminzone__desc">Ações irreversíveis. Tem cuidado.</div>
              {dangerErr && <div className="alert alert--error" style={{ marginTop: 8 }}>{dangerErr}</div>}
            </div>
            
            <div className="keeply-adminzone__action">
              {isOwnerAdmin ? (
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={deleteFamily}
                  disabled={dangerBusy}
                >
                  {dangerBusy ? "A apagar…" : "Apagar família"}
                </button>
              ) : (
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={leaveFamily}
                  disabled={dangerBusy}
                >
                  {dangerBusy ? "A sair…" : "Sair da família"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal de remoção */}
      {removeOpen && (
        <RemoveMemberWidget
          familyId={family.familyId}
          members={members}
          mySub={mySub}
          onClose={() => setRemoveOpen(false)}
          onRemoved={handleRemoved}
        />
      )}

      {/* Modal de papéis */}
      {rolesOpen && (
        <RoleManagerWidget
          familyId={family.familyId}
          members={members}
          mySub={mySub}
          onClose={() => setRolesOpen(false)}
          onRoleChanged={handleRoleChanged}
        />
      )}

      {/* Modal de transferir propriedade */}
      {transferOpen && (
        <TransferOwnerWidget
          familyId={family.familyId}
          members={members}
          mySub={mySub}
          onClose={() => setTransferOpen(false)}
          onTransferred={handleTransferred}
        />
      )}
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
