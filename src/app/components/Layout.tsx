import { Outlet, NavLink, useNavigate } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  BookOpen,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
// v2
import { RiskAlertPopup } from "./RiskAlertPopup";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/upload", label: "Document Upload", icon: Upload },
  { to: "/tasks", label: "Task List", icon: ListChecks },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/settings", label: "System Settings", icon: Settings },
];

export function Layout() {
  const [showRiskAlert, setShowRiskAlert] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif", background: "var(--background)" }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 shrink-0 border-r h-full"
        style={{
          background: "var(--sidebar)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded"
            style={{ background: "var(--primary)" }}
          >
            <Shield size={16} color="#fff" />
          </div>
          <div>
            <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 15, lineHeight: 1 }}>PAL</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 10, marginTop: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>COMPLIANCE AGENT</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded transition-all group ${
                  isActive ? "text-foreground" : ""
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "var(--sidebar-accent)" : "transparent",
                color: isActive ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} style={{ color: isActive ? "var(--primary)" : "var(--sidebar-foreground)", opacity: isActive ? 1 : 0.7 }} />
                  <span style={{ fontSize: 13.5, fontWeight: isActive ? 500 : 400 }}>{label}</span>
                  {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: "var(--muted-foreground)" }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "rgba(232,64,64,0.12)", border: "1px solid rgba(232,64,64,0.25)" }}
            onClick={() => setShowRiskAlert(true)}
          >
            <AlertTriangle size={13} style={{ color: "#E84040" }} />
            <span style={{ fontSize: 12, color: "#E84040", fontFamily: "'JetBrains Mono', monospace" }}>2 Risk Alerts</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-8 py-3.5 border-b shrink-0"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
            PAL / Automated Document Review
          </div>
          <div className="flex items-center gap-4">
            <button
              className="relative p-1.5 rounded transition-colors hover:opacity-80"
              style={{ color: "var(--muted-foreground)" }}
              onClick={() => setShowRiskAlert(true)}
            >
              <Bell size={16} />
              <span
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: "#E84040", fontSize: 8, color: "#fff", fontWeight: 700 }}
              >
                2
              </span>
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 600 }}
              >
                A
              </div>
              <span style={{ fontSize: 13, color: "var(--foreground)" }}>Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "var(--background)" }}>
          <Outlet />
        </main>
      </div>

      {showRiskAlert && (
        <RiskAlertPopup
          onClose={() => setShowRiskAlert(false)}
          onViewDetails={() => {
            setShowRiskAlert(false);
            navigate("/tasks/RPT-2024-003");
          }}
        />
      )}
    </div>
  );
}
