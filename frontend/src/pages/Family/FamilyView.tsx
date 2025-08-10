import { useState } from "react";
import { apiFetch } from "../../api/client";
import "./family.css";

type Member = {
  userId: string;
  role: "admin" | "member";
  joinedAt?: string;
  name?: string;
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
    const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
  setInviteBusy(true);
  setInviteErr(null);
  setInviteCode(null);
  try {
    const res = await apiFetch<{ code?: string; inviteId: string; expiresAt: string }>("/invites", {
      method: "POST",
      body: JSON.stringify({ familyId: family.familyId, type: "code" }) // ✅ payload esperado
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

  return (
    <div className="fam__container">
      <header className="fam__header">
        <div>
          <h1 className="fam__title">{family.name || "Família"}</h1>
          <div className="fam__meta">
            <span className="tag">{family.plan || "free"}</span>
            {family.createdAt && <span className="muted">Criada em {new Date(family.createdAt).toLocaleDateString()}</span>}
            <button className="btn btn--ghost" onClick={onRefresh}>Atualizar</button>
          </div>
        </div>

        <div>
          <button className="btn btn--primary" onClick={createInvite} disabled={inviteBusy}>
  {inviteBusy ? "A gerar…" : "Convidar membro"}
</button>
          {inviteErr && <div className="alert alert--error" style={{marginTop:8}}>{inviteErr}</div>}
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
        <div className="members__grid">
          {family.members?.length ? (
            family.members.map((m) => (
              <div className="member card" key={m.userId}>
                <div className="avatar">{(m.initials || initials(m.name || m.userId))}</div>
                <div className="member__body">
                  <div className="member__name">{m.name || m.userId}</div>
                  <div className="member__meta">
                    <span className="tag">{m.role}</span>
                    {m.joinedAt && <span className="muted">desde {new Date(m.joinedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="muted">Sem membros listados.</div>
          )}
        </div>
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
  return s.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}
