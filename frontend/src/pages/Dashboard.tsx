import React, { useEffect } from "react";
import "./Dashboard.css";

// Simple inline icons (no external deps)
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.5h-5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10.5Z"/>
    </svg>
  ),
  Grid: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9a6 6 0 1 1 12 0v1H4v-1Zm14.5-8a3.5 3.5 0 1 0-2.9-5.5 5.5 5.5 0 0 1 0 7A3.5 3.5 0 0 0 18.5 12Zm1.5 9h-4.3c.1-.33.3-.66.5-.96A6.98 6.98 0 0 1 20 18v3Z"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M19.14 12.94a7.96 7.96 0 0 0 .06-.94 7.96 7.96 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.4 7.4 0 0 0-1.64-.94l-.36-2.54A.5.5 0 0 0 12 1h-4a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.13.55-1.64.94l-2.39-.96a.5.5 0 0 0-.6.22L.59 8.04a.5.5 0 0 0 .12.64L2.74 10.26a7.96 7.96 0 0 0 0 1.88L.71 13.72a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.62.22l2.39-.96c.5.39 1.06.7 1.64.94l.36 2.54c.05.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.36-2.54c.58-.24 1.13-.55 1.64-.94l2.39.96c.23.09.49 0 .62-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM10 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M12 3 7 8h3v5h4V8h3l-5-5Zm-9 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4h-2v4H5v-4H3Z"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M21 21 16.65 16.65M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" aria-hidden className="keeply-ico">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
};

const sampleItems = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  title: `Sample Item ${i + 1}`,
  owner: i % 2 ? "Alex" : "Jamie",
  category: i % 3 ? "General" : "Personal",
}));

const Dashboard: React.FC = () => {
  useEffect(() => {
    document.title = "Keeply Dashboard – Smart Organizer";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Keeply-inspired dashboard layout with sidebar, search, filters, and responsive item grid.");
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    if (!canonical.parentNode) document.head.appendChild(canonical);
  }, []);

  return (
    <div className="keeply-shell" role="application">
      {/* Sidebar */}
      <aside className="keeply-aside-nav">
        <div className="keeply-brand">
          <span className="keeply-brand-glyph" aria-hidden>K</span>
          <span className="keeply-brand-word">Keeply</span>
        </div>
        <nav className="keeply-rail" aria-label="Primary">
          <a href="#" className="keeply-rail-item keeply-is-active">
            <Icon.Home />
            <span>Home</span>
          </a>
          <a href="#" className="keeply-rail-item">
            <Icon.Grid />
            <span>Categories</span>
          </a>
          <a href="#" className="keeply-rail-item">
            <Icon.Users />
            <span>Family</span>
          </a>
          <a href="#" className="keeply-rail-item">
            <Icon.Settings />
            <span>Settings</span>
          </a>
          <a href="#" className="keeply-rail-item">
            <Icon.Upload />
            <span>Export</span>
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main className="keeply-main">
        <header className="keeply-toolbar" role="search">
          <div className="keeply-search-wrap">
            <span className="keeply-search-ico" aria-hidden>
              <Icon.Search />
            </span>
            <input
              className="keeply-search-input"
              type="search"
              placeholder="Search"
              aria-label="Search items"
            />
          </div>

          <button className="keeply-filter-select" aria-haspopup="listbox" aria-expanded="false">
            <span>All categories</span>
            <Icon.ChevronDown />
          </button>

          <button className="keeply-avatar" aria-label="Profile">
            <span className="keeply-avatar-initial" aria-hidden>
              A
            </span>
          </button>
        </header>

        <section className="keeply-grid" aria-label="Items grid">
          {sampleItems.map((it) => (
            <article key={it.id} className="keeply-card" tabIndex={0} aria-label={`${it.title} card`}>
              <div className="keeply-thumb" aria-hidden />
              <div className="keeply-card-body">
                <h3 className="keeply-card-title">{it.title}</h3>
                <div className="keeply-card-meta">
                  <span className="keeply-chip">
                    <span className="keeply-chip-dot" aria-hidden />
                    {it.owner}
                  </span>
                  <span className="keeply-subtle">{it.category}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
