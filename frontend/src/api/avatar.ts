// src/api/avatar.ts
import { apiFetchId } from "./client";

export async function getAvatarViewUrl() {
  // devolve { viewUrl: string | null, ver?: string }
  return apiFetchId<{ viewUrl: string | null; ver?: string }>("/users/avatar/view-url", {
    method: "GET",
  });
}

export async function getAvatarUploadUrl(contentType: string) {
  // devolve { uploadUrl: string, key: string }
  return apiFetchId<{ uploadUrl: string; key: string }>("/users/avatar/upload-url", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export async function commitAvatarKey(key: string) {
  // devolve { ok: true, key, ver?: string }
  return apiFetchId<{ ok: boolean; key: string; ver?: string }>("/users/avatar/commit", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}


export async function getAvatarViewUrlFor(userId: string) {
  // antiga (sem família) – mantém se quiseres
  return apiFetchId<{ viewUrl: string | null }>(`/users/${encodeURIComponent(userId)}/avatar/view-url`, { method: "GET" });
}

export async function getFamilyMemberAvatarViewUrl(familyId: string, userId: string) {
  return apiFetchId<{ viewUrl: string | null }>(
    `/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(userId)}/avatar/view-url`,
    { method: "GET" }
  );
}