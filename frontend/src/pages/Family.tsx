import React, { useEffect, useMemo, useState } from "react";
import "./Family.css";

// ---- Token helpers (ID Token only) ----
const KEEPLY_TOKEN_KEY = "keeply_token";

/**
 * Guarda APENAS o idToken (string JWT) no localStorage.
 * Use isto logo após o login Cognito.
 */
export function setKeeplyIdToken(idToken: string) {
  if (typeof idToken !== "string" || !idToken.includes(".")) {
    throw new Error("idToken inválido");
  }
  localStorage.setItem(KEEPLY_TOKEN_KEY, idToken);
}

/** Remove o token (logout) */
export function clearKeeplyIdToken() {
  localStorage.removeItem(KEEPLY_TOKEN_KEY);
}

/** Lê o idToken (JWT) do localStorage */
export function getKeeplyIdToken(): string | null {
  try {
    const raw = localStorage.getItem(KEEPLY_TOKEN_KEY);
    if (!raw) return null;
    // Se por acaso alguém gravou um objeto antigo, tenta extrair idToken
    if (raw.startsWith("{")) {
      const obj = JSON.parse(raw);
      return typeof obj?.idToken === "string" ? obj.idToken : null;
    }
    // Caso normal: já é o JWT puro
    return raw.includes(".") ? raw : null;
  } catch {
    return null;
  }
}

type MeResponse = {
  userId: string;
  name?: string;
  family?: {
    id: string;
    name: string;
    members?: Array<{ id: string; name?: string; email?: string }>;
  } | null;
};

type FamilyResponse = {
  id: string;
  name: string;
  members?: Array<{ id: string; name?: string; email?: string }>;
};

// Base do API: use .env (Vite) ou cai no valor por defeito.
// IMPORTANTE: incluir o /prod (ou o stage que usas)
const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://kupja6ps8e.execute-api.eu-north-1.amazonaws.com";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getKeeplyIdToken();
  if (!token) throw new Error("NOT_AUTHENTICATED");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // <- só o idToken
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}: ${text.slice(0, 300)}`);
  }
  if (!contentType.includes("application/json")) {
    throw new Error(`Resposta não-JSON (ct=${contentType}): ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch (e: any) {
    throw new Error(`Falha a parsear JSON: ${String(e)} | Body: ${text.slice(0, 200)}`);
  }
}

export default function Family() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = useMemo(() => !!getKeeplyIdToken(), []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!isAuthed) {
        setError("NOT_AUTHENTICATED");
        setLoading(false);
        return;
      }

      try {
        const data = await api<MeResponse>("/families/me", { method: "GET" });
        if (!mounted) return;
        setMe(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "UNKNOWN_ERROR");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="familyView__containerRoot--q1w2e3r4t5y6">
        <div className="familyView__authGatePanel--a9b8c7d6e5">
          <h2 className="familyView__authGateTitle--z9y8x7w6v5">Sessão necessária</h2>
          <p className="familyView__authGateCopy--u4i3o2p1">
            Você precisa estar autenticado para aceder à página da família.
          </p>
          <a className="familyView__authGateLinkButton--l0k9j8h7g6" href="/login">
            Ir para login
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="familyView__containerRoot--q1w2e3r4t5y6">
        <div className="familyView__loadingSpinnerWrap--mmnnbbvvcx">
          <div className="familyView__loadingSpinnerDot--qw12er34ty" />
          <div className="familyView__loadingSpinnerLabel--pl09ok87ij">A carregar…</div>
        </div>
      </div>
    );
  }

  if (error && error !== "NOT_AUTHENTICATED") {
    return (
      <div className="familyView__containerRoot--q1w2e3r4t5y6">
        <div className="familyView__errorPanel--err5566aa">
          <h3 className="familyView__errorTitle--err8899bb">Ups, algo correu mal</h3>
          <pre className="familyView__errorMessageMono--ee77dd66">{String(error)}</pre>
        </div>
      </div>
    );
  }

  const hasFamily = !!me?.family?.id;

  return (
    <div className="familyView__containerRoot--q1w2e3r4t5y6">
      {hasFamily ? (
        <HasFamilyView
          family={me!.family!}
          onRefresh={async () => {
            setLoading(true);
            try {
              const data = await api<MeResponse>("/families/me", { method: "GET" });
              setMe(data);
            } catch (e: any) {
              setError(e?.message || "UNKNOWN_ERROR");
            } finally {
              setLoading(false);
            }
          }}
        />
      ) : (
        <NoFamilyView
          onCreated={(f) => {
            setMe((prev) => (prev ? { ...prev, family: f } : prev));
          }}
          onJoined={(f) => {
            setMe((prev) => (prev ? { ...prev, family: f } : prev));
          }}
        />
      )}
    </div>
  );
}

function NoFamilyView({
  onCreated,
  onJoined,
}: {
  onCreated: (f: FamilyResponse) => void;
  onJoined: (f: FamilyResponse) => void;
}) {
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!familyName.trim()) {
      setMsg("Escolhe um nome para a família.");
      return;
    }
    setBusy("create");
    try {
      const created = await api<FamilyResponse>("/families", {
        method: "POST",
        body: JSON.stringify({ name: familyName.trim() }),
      });
      onCreated(created);
    } catch (e: any) {
      setMsg(e?.message || "Erro a criar família.");
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!joinCode.trim()) {
      setMsg("Introduz um código válido.");
      return;
    }
    setBusy("join");
    try {
      const joined = await api<FamilyResponse>("invites/accept", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      onJoined(joined);
    } catch (e: any) {
      setMsg(e?.message || "Código inválido ou expirado.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="familyZeroState__layoutGrid--x1c2v3b4n5">
      <div className="familyZeroState__cardCreate--a1s2d3f4g5">
        <h2 className="familyZeroState__cardTitle--h6j7k8l9">Criar família</h2>
        <p className="familyZeroState__cardCopyMuted--qazwsxedc">
          Começa do zero e adiciona membros depois.
        </p>
        <form className="familyZeroState__formInlineCluster--rfvtgbyhn" onSubmit={handleCreate}>
          <input
            className="familyZeroState__textInput--ujmikolp"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Ex.: Família Pereira"
            maxLength={80}
          />
          <button
            className="familyZeroState__primaryBtn--bgt5vfr4"
            disabled={busy === "create"}
          >
            {busy === "create" ? "A criar…" : "Criar"}
          </button>
        </form>
      </div>

      <div className="familyZeroState__cardJoin--z1x2c3v4b5">
        <h2 className="familyZeroState__cardTitle--h6j7k8l9">Entrar com código</h2>
        <p className="familyZeroState__cardCopyMuted--qazwsxedc">
          Se alguém te enviou um código, cola aqui.
        </p>
        <form className="familyZeroState__formInlineCluster--rfvtgbyhn" onSubmit={handleJoin}>
          <input
            className="familyZeroState__textInput--ujmikolp"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Código de convite"
            maxLength={64}
          />
          <button
            className="familyZeroState__ghostBtn--nhy6tgb5"
            disabled={busy === "join"}
          >
            {busy === "join" ? "A validar…" : "Entrar"}
          </button>
        </form>
      </div>

      {msg && <div className="familyZeroState__feedbackBanner--m1n2b3v4">{msg}</div>}
    </div>
  );
}

function HasFamilyView({
  family,
  onRefresh,
}: {
  family: FamilyResponse;
  onRefresh: () => Promise<void>;
}) {
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generateInvite = async () => {
    setErr(null);
    setInviteBusy(true);
    try {
      const res = await api<{ code: string }>("/invites", {
        method: "POST",
        body: JSON.stringify({ familyId: family.id }),
      });
      setInviteCode(res.code);
    } catch (e: any) {
      setErr(e?.message || "Não foi possível gerar o convite.");
    } finally {
      setInviteBusy(false);
    }
  };

  const copy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setErr("Código copiado para a área de transferência.");
      setTimeout(() => setErr(null), 1800);
    } catch {
      setErr("Falha ao copiar. Copia manualmente.");
    }
  };

  return (
    <div className="familyDetailView__wrap--lkjhgfdsa">
      <header className="familyDetailView__headerRow--poiuytrewq">
        <div className="familyDetailView__titleBlock--mnbvcxzpo">
          <h1 className="familyDetailView__titleMain--qqwweerrtt">{family.name}</h1>
          <p className="familyDetailView__titleSubtle--yyuuiioopp">ID: {family.id}</p>
        </div>
        <div className="familyDetailView__actionsCluster--zzaassxxcc">
          <button
            className="familyDetailView__secondaryBtn--vvrree1122"
            onClick={onRefresh}
            title="Atualizar"
          >
            Atualizar
          </button>
          <button
            className="familyDetailView__primaryBtn--bbnnmm7788"
            onClick={generateInvite}
            disabled={inviteBusy}
            title="Gerar código de convite"
          >
            {inviteBusy ? "A gerar…" : "Gerar convite"}
          </button>
        </div>
      </header>

      <section className="familyDetailView__contentGrid--kkjjhhggff">
        <div className="familyDetailView__membersCard--ddssaa1122">
          <h3 className="familyDetailView__sectionTitle--ppoo998877">Membros</h3>
          <ul className="familyDetailView__memberList--llkkjjuu">
            {(family.members || []).length === 0 && (
              <li className="familyDetailView__memberEmpty--mmnnoopp">Sem membros listados.</li>
            )}
            {(family.members || []).map((m) => (
              <li key={m.id} className="familyDetailView__memberRow--ttrreeww">
                <div className="familyDetailView__avatarStub--aa33ss55">
                  {(m.name || m.email || "U")[0]?.toUpperCase()}
                </div>
                <div className="familyDetailView__memberMeta--kk44ll66">
                  <div className="familyDetailView__memberName--zz11xx22">
                    {m.name || "Sem nome"}
                  </div>
                  {m.email && <div className="familyDetailView__memberEmail--cc77vv88">{m.email}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="familyDetailView__inviteCard--hhggffddss">
          <h3 className="familyDetailView__sectionTitle--ppoo998877">Convite por código</h3>
          <p className="familyDetailView__mutedCopy--uu77ii88">
            Gera um código e envia para alguém. Essa pessoa usa o código em “Entrar com código”.
          </p>

          <div className="familyDetailView__inviteRow--aa55ss66dd">
            <input
              className="familyDetailView__readonlyInput--ff22gg33"
              value={inviteCode || ""}
              readOnly
              placeholder="Gera um código para aparecer aqui"
            />
            <button
              className="familyDetailView__ghostBtn--ww44ee55"
              onClick={copy}
              disabled={!inviteCode}
            >
              Copiar
            </button>
          </div>

          {err && <div className="familyDetailView__feedback--jj66hh77">{err}</div>}
        </div>
      </section>
    </div>
  );
}
