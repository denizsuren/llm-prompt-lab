import { Outlet, NavLink } from 'react-router-dom';
import { FlaskConical, List, ExternalLink } from 'lucide-react';

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={20} color="var(--accent)" />
            <div>
              <h2>Prompt Lab</h2>
              <span>LLM Benchmarking</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <FlaskConical size={16} />
            Experiments
          </NavLink>

          <NavLink
            to="/runs"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <List size={16} />
            All Runs
          </NavLink>

          <div style={{ flex: 1 }} />
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <a
            href="https://github.com/denizsuren/llm-prompt-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <ExternalLink size={16} />
            GitHub
          </a>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
