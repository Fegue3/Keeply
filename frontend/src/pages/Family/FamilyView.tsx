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

  // modals
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
        if (!cancel) setMembersError(e.message || "Could not load members.");
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

  // Managers: admin, parent, guardian
  const isOwnerAdmin = !!me && me.role === "admin";         // owner/admin
const isManager = !!me && ["admin","parent","guardian"].includes(me.role); // keep for other actions if you want
const canManageRoles = isOwnerAdmin;                       // <-- roles are admin-only

  async function createInvite() {
    setInviteBusy(true);
    setInviteErr(null);
    setInviteCode(null);
    try {
      const res = await apiFetch<{ code?: string; inviteId: string; expiresAt: string }>("/invites", {
        method: "POST",
        body: JSON.stringify({ familyId: family.familyId, type: "code" })
      });
      if (!res.code) throw new Error("Backend did not return an invite code.");
      setInviteCode(res.code);
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Could not generate invite.";
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

  // == Dangerous actions ==
  async function deleteFamily() {
    if (!isOwnerAdmin) return;
    if (!window.confirm("⚠️ This will delete the family and all associated data. Continue?")) return;
    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}`, { method: "DELETE" });
      onRefresh();
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Could not delete the family.";
      setDangerErr(msg);
    } finally {
      setDangerBusy(false);
    }
  }

  async function leaveFamily() {
    if (!mySub) return;
    if (isOwnerAdmin) return; // admins don't leave here
    if (!window.confirm("Do you really want to leave this family?")) return;

    setDangerBusy(true);
    setDangerErr(null);
    try {
      await apiFetch(`/families/${family.familyId}/leave`, { method: "DELETE" });
      onRefresh();
    } catch (e: any) {
      const msg =
        (e?.bodyText && (() => { try { return JSON.parse(e.bodyText).message; } catch { return null; } })()) ||
        e?.message || "Could not leave the family.";
      setDangerErr(msg);
    } finally {
      setDangerBusy(false);
    }
  }

  // modal callbacks
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
          <h1 className="fam__title">{family.name || "Family"}</h1>
          <div className="fam__meta">
            <span className="tag is-static">{family.plan || "free"}</span>
            {family.createdAt && (
              <span className="muted">Created on {new Date(family.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </header>

      <section className="fam__section">
        <h2>Members</h2>

        {membersLoading && <div className="muted">Loading members…</div>}
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
                    <div className="member__name">{m.name || "User"}</div>
                    {m.email && <div className="member__email" title={m.email}>{m.email}</div>}
                  </div>
                </div>
                <div className="member__right">
                  <span className={`badge role-${m.role === "admin" ? "admin" : "member"}`}>{m.role}</span>
                  {m.joinedAt && <span className="member__since">since {new Date(m.joinedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            )) : (
              <div className="muted">No members listed.</div>
            )}
          </div>
        )}
      </section>

      <section className="fam__section">
        <h2>Information</h2>
        <div className="info__grid">
          <div className="kv"><span className="kv__k">ID</span><span className="kv__v">{family.familyId || "—"}</span></div>
          {family.description && <div className="kv"><span className="kv__k">Description</span><span className="kv__v">{family.description}</span></div>}
          {family.createdBy && <div className="kv"><span className="kv__k">Created by</span><span className="kv__v">{family.createdBy}</span></div>}
        </div>
      </section>

      {/* ===== Admin Privileges / Danger Zone ===== */}
      <section className="fam__section keeply-adminzone">
        <div className="keeply-adminzone__header">
          <h2>Admin Privileges</h2>
          <span className="chip">{isManager ? "Admins only" : "Account options"}</span>
        </div>

        <div className="keeply-adminzone__rows">

          {/* Invite member */}
          {isManager && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Invite member</div>
                <div className="keeply-adminzone__desc">
                  Generate an invite code to add new users to the family.
                </div>
                {inviteCode && (
                  <div className="keeply-adminzone__invite">
                    <div className="invite__code" title="Click to copy" onClick={copyInvite}>
                      {inviteCode}
                    </div>
                    <button className="btn" onClick={copyInvite}>{copied ? "Copied!" : "Copy"}</button>
                  </div>
                )}
                {inviteErr && <div className="alert alert--error" style={{ marginTop: 8 }}>{inviteErr}</div>}
              </div>

              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={createInvite}
                  disabled={inviteBusy}
                  title="Generate invite code"
                >
                  {inviteBusy ? "Generating…" : "Generate invite"}
                </button>
              </div>
            </div>
          )}

          {/* Remove member (opens modal) */}
          {isManager && members.length > 1 && (
            <div className="keeply-adminzone__row">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Remove members</div>
                <div className="keeply-adminzone__desc">
                  Open the selector to choose who to remove. You cannot remove your own account.
                </div>
              </div>
              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={() => setRemoveOpen(true)}
                >
                  Remove member
                </button>
              </div>
            </div>
          )}

          {/* Manage roles (opens modal) */}
          {canManageRoles && (
  <div className="keeply-adminzone__row">
    <div className="keeply-adminzone__text">
      <div className="keeply-adminzone__title">Manage roles</div>
      <div className="keeply-adminzone__desc">
        Set <strong>parent</strong>, <strong>guardian</strong>, or <strong>member</strong> for each user.
      </div>
    </div>
    <div className="keeply-adminzone__action">
      <button
        className="btn btn--ghost keeply-adminzone__btn"
        onClick={() => canManageRoles && setRolesOpen(true)}
      >
        Manage roles
      </button>
    </div>
  </div>
)}

          {/* ===== Danger Zone ===== */}

          {/* Transfer ownership (admin only) — now inside Danger Zone */}
          {isOwnerAdmin && members.length > 1 && (
            <div className="keeply-adminzone__row keeply-adminzone__row--danger">
              <div className="keeply-adminzone__text">
                <div className="keeply-adminzone__title">Transfer ownership</div>
                <div className="keeply-adminzone__desc">
                  Transfer the <strong>admin</strong> role to another member. Your role will become <strong>member</strong>.
                </div>
                {dangerErr && <div className="alert alert--error" style={{ marginTop: 8 }}>{dangerErr}</div>}
              </div>
              <div className="keeply-adminzone__action">
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={() => setTransferOpen(true)}
                  disabled={dangerBusy}
                >
                  Transfer ownership
                </button>
              </div>
            </div>
          )}

          {/* Delete family / Leave family */}
          <div className="keeply-adminzone__row keeply-adminzone__row--danger">
            <div className="keeply-adminzone__text">
              <div className="keeply-adminzone__title">Danger Zone</div>
              <div className="keeply-adminzone__desc">Irreversible actions. Be careful.</div>
              {dangerErr && <div className="alert alert--error" style={{ marginTop: 8 }}>{dangerErr}</div>}
            </div>

            <div className="keeply-adminzone__action">
              {isOwnerAdmin ? (
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={deleteFamily}
                  disabled={dangerBusy}
                >
                  {dangerBusy ? "Deleting…" : "Delete family"}
                </button>
              ) : (
                <button
                  className="btn btn--ghost keeply-adminzone__btn"
                  onClick={leaveFamily}
                  disabled={dangerBusy}
                >
                  {dangerBusy ? "Leaving…" : "Leave family"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Remove modal */}
      {removeOpen && (
        <RemoveMemberWidget
          familyId={family.familyId}
          members={members}
          mySub={mySub}
          onClose={() => setRemoveOpen(false)}
          onRemoved={handleRemoved}
        />
      )}

      {/* Roles modal */}
      {rolesOpen && (
        <RoleManagerWidget
          familyId={family.familyId}
          members={members}
          mySub={mySub}
          onClose={() => setRolesOpen(false)}
          onRoleChanged={handleRoleChanged}
        />
      )}

      {/* Transfer ownership modal */}
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
