// src/components/UserAvatar.tsx
import { useEffect, useState } from "react";
import { getAvatarViewUrl } from "../api/avatar";

type Props = {
  size?: number;
  initials?: string;
  className?: string;
  cacheBust?: boolean | number; // força refresh quando muda
};

export default function UserAvatar({ size = 32, initials = "U", className = "", cacheBust }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    setLoaded(false);

    // ⬇️ se vier cacheBust, não uses cache local nesta chamada
    const shouldUseCache = !cacheBust;
    if (shouldUseCache) {
      const cached = localStorage.getItem("keeply_user_avatar");
      if (cached) {
        setSrc(cached);
        setLoaded(true);
      }
    }

    const { viewUrl, ver } = await getAvatarViewUrl();
    if (viewUrl) {
      const v = cacheBust ? (typeof cacheBust === "number" ? cacheBust : Date.now()) : ver;
      const finalUrl = v ? `${viewUrl}${viewUrl.includes("?") ? "&" : "?"}v=${v}` : viewUrl;
      setSrc(finalUrl);
      localStorage.setItem("keeply_user_avatar", finalUrl); // atualiza cache
    } else {
      setSrc(null);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [cacheBust]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: "50%",
        overflow: "hidden",
        background: "#dab49d",
        color: "#3f2c1e",
        display: "flex",             // 👈 flex em vez de grid
        alignItems: "center",        // centra vertical
        justifyContent: "center",    // centra horizontal
        fontWeight: 700,
        fontSize: size / 2.8,        // tamanho de letra proporcional
      }}
    >
      {!src && initials?.slice(0, 2).toUpperCase()}

      {src && (
        <>
          {!loaded && (
            <div
              className="keeply-avatar-spinner"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: size / 4,
                  height: size / 4,
                  border: "2px solid rgba(255,255,255,.6)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "keeply-spin 1s linear infinite",
                }}
              />
            </div>
          )}
          <img
            src={src}
            alt="avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: loaded ? 1 : 0,
              transition: "opacity .25s ease",
            }}
            onLoad={() => setLoaded(true)}
          />
        </>
      )}
    </div>
  );
}
