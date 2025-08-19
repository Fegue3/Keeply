import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Tab = { to: string; label: string };

export default function MobileSettingsDropdown({
  tabs,
  current,
}: { tabs: Tab[]; current: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  // click‑outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // teclado
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const active = tabs.find(t => t.to === current) ?? tabs[0];

  return (
    <div className="keeply-dropdown">
      <button
        ref={btnRef}
        className={`keeply-dd-btn ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onKeyDown={onKeyDown}
      >
        <span>{active.label}</span>
        {/* chevron */}
        <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <ul
        ref={listRef}
        className={`keeply-dd-list ${open ? "show" : ""}`}
        role="listbox"
        aria-label="Settings sections"
      >
        {tabs.map(t => (
          <li key={t.to} role="option" aria-selected={t.to === current}>
            <button
              className={`keeply-dd-item ${t.to === current ? "active" : ""}`}
              onClick={() => { setOpen(false); navigate(t.to); }}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
