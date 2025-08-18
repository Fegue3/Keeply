import { useEffect, useState } from "react";
import { getFamilyMemberAvatarViewUrl } from "../api/avatar";

export default function FamilyAvatar({
  familyId, userId, size = 36, initials = "U", className = ""
}: { familyId: string; userId: string; size?: number; initials?: string; className?: string; }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoaded(false);
      const cacheKey = `keeply_user_avatar:${familyId}:${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached && !cancel) { setSrc(cached); setLoaded(true); }

      const { viewUrl } = await getFamilyMemberAvatarViewUrl(familyId, userId);
      if (cancel) return;
      if (viewUrl) { setSrc(viewUrl); localStorage.setItem(cacheKey, viewUrl); }
      else { setSrc(null); localStorage.removeItem(cacheKey); }
    }
    load(); return () => { cancel = true; };
  }, [familyId, userId]);

  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        background: "#dab49d", color: "#3f2c1e",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size/2.8, position: "relative"
      }}
    >
      {!src && (initials?.slice(0,2).toUpperCase() || "U")}
      {src && (
        <>
          {!loaded && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{
                width: size/4, height: size/4, border: "2px solid rgba(255,255,255,.6)",
                borderTopColor: "transparent", borderRadius: "50%", animation: "keeply-spin 1s linear infinite"
              }}/>
            </div>
          )}
          <img
            src={src}
            alt="avatar"
            style={{ width:"100%", height:"100%", objectFit:"cover", opacity: loaded?1:0, transition:"opacity .25s" }}
            onLoad={() => setLoaded(true)}
          />
        </>
      )}
    </div>
  );
}
