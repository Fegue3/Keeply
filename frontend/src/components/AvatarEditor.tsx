// src/components/AvatarEditor.tsx
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { commitAvatarKey, getAvatarUploadUrl } from "../api/avatar";

export default function AvatarEditor({ onChanged }: { onChanged?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pick() {
    fileRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) return setErr("Usa JPEG/PNG/WEBP");
    if (file.size > 3 * 1024 * 1024) return setErr("Máximo 3MB");

    try {
      setBusy(true);

      // 1) presigned PUT
      const { uploadUrl, key } = await getAvatarUploadUrl(file.type);

      // 2) upload direto para S3
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Falha no upload");

      // 3) commit no Cognito
      await commitAvatarKey(key);

      // 4) limpar cache local e avisar UI (se quiseres)
      localStorage.removeItem("keeply_user_avatar");
      onChanged?.();

      // 5) REFRESH imediato da página
      // (pequeno timeout só para garantir que o event loop flushou)
      setTimeout(() => {
        window.location.reload();
      }, 0);
    } catch (e: any) {
      setErr(e?.message || "Erro ao atualizar foto");
      setBusy(false); // só desativa se falhar
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // em sucesso o reload acontece; este cleanup é redundante mas inofensivo
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={pick}
        className="profile-edit-btn"
        disabled={busy}
        title="Change profile picture"
        style={{
          width: 38, height: 38, borderRadius: "9999px",
          display: "inline-flex", alignItems: "center", justifyContent: "center"
        }}
      >
        {busy ? <span style={{ fontSize: 10 }}>…</span> : <Camera size={16} />}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        style={{ display: "none" }}
      />

      {err && <div style={{ color: "#d97777", fontSize: 12 }}>{err}</div>}
    </div>
  );
}
