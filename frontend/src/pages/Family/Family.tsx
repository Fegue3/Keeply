import { useEffect, useState } from "react";
import { apiFetch, HttpError } from "../../api/client";
import { NoFamilyPanel } from "./NoFamilyPanel";
import { FamilyView } from "./FamilyView";
import "./family.css";

// Tipos inline
export type Member = {
  userId: string;
  role: "admin" | "member";
  joinedAt?: string;
  name?: string;
  email?: string;
  initials?: string;
};

export type Family = {
  familyId: string;
  name: string;
  description?: string;
  plan?: "free" | "plus" | "family";
  createdAt?: string;
  createdBy?: string;
  members: Member[];
};

type MeResponse =
  | { sub: string; family: Family }                          // caso 1: traz objeto completo
  | { sub: string; family?: null; familyId?: string | null } // caso 2: só indica que tem família (ex.: familyId)
  ;

export default function FamilyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);

  async function loadMe() {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<MeResponse>("/families/me");

      // Caso 1: /me traz o objeto completo
      if ((me as any).family && typeof (me as any).family === "object") {
        setFamily((me as any).family as Family);
      }
      // Caso 2: /me não traz o objeto, mas sabemos que TEM família (200 + familyId)
      else if ((me as any).familyId) {
        // Construímos um “stub” para mostrar a página e permitir convites
        setFamily({
          familyId: (me as any).familyId!,
          name: "Minha família",
          members: [],
          plan: "free",
        });
      }
      // Se chegou 200 mas sem familyId -> tratamos como sem família
      else {
        setFamily(null);
      }
    } catch (e: any) {
      if (e instanceof HttpError && e.status === 404) {
        // 404 => não tem família
        setFamily(null);
        setError(null);
      } else {
        setError(e.message || "Falha ao carregar /me");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  if (loading) {
    return (
      <div className="fam__container">
        <div className="fam__card centered">A carregar…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fam__container">
        <div className="fam__card centered">
          <div className="fam__error">⚠️ {error}</div>
          <button className="btn btn--primary" onClick={loadMe}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!family) return <NoFamilyPanel onChanged={loadMe} />;

  return <FamilyView family={family} onRefresh={loadMe} />;
}
