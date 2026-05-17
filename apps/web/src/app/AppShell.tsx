import { BrowserRouter, NavLink } from "react-router-dom";
import { AppRoutes } from "./router";

export function AppShell() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header glass-panel" style={{ background: "transparent", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
          <div className="brand" style={{ color: "var(--accent)" }}>BlackJackReact</div>
          <nav className="app-nav">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/play">Play</NavLink>
            <NavLink to="/training">Training</NavLink>
            <NavLink to="/stats">Stats</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </header>
        <main className="app-main">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
