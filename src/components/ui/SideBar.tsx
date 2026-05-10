import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { toggleTheme } from "../../store/slices/themeSlice";

type MenuItem = {
  label: string;
  icon: string;
  path: string;
};

type MenuSection = {
  section: string;
  items: MenuItem[];
};

const MENUS: Record<string, MenuSection[]> = {
  system_admin: [
    {
      section: "System",
      items: [
        { label: "Dashboard", icon: "pi pi-th-large", path: "/dashboard" },
        { label: "Targets", icon: "pi pi-compass", path: "/targets" },
        { label: "SSL Center", icon: "pi pi-shield", path: "/ssl-verifier" },
        { label: "Incident Center", icon: "pi pi-exclamation-triangle", path: "/incidents" },
        { label: "Agent Control", icon: "pi pi-sitemap", path: "/agents" },
        { label: "Service Center", icon: "pi pi-desktop", path: "/services" },
        { label: "Alert View", icon: "pi pi-bell", path: "/alerts" },
        { label: "Team Management", icon: "pi pi-server", path: "/team" },
        {
          label: "Backup Policies",
          icon: "pi pi-database",
          path: "/backup-policies",
        },
        {
          label: "Backup Logs",
          icon: "pi pi-history",
          path: "/backup-logs",
        },
      ],
    },
    {
      section: "Reports",
      items: [
        { label: "Super Admin Dashboard", icon: "pi pi-th-large", path: "/super-admin-dashboard" },
        { label: "Agent Releases", icon: "pi pi-chart-bar", path: "/agent-releases" },
        { label: "System Users", icon: "pi pi-file", path: "/system-users" },
        // { label: "Settings", icon: "pi pi-cog", path: "/settings" },
      ],
    },
  ],

  tenant_admin: [
    {
      section: "Management",
      items: [
        { label: "Dashboard", icon: "pi pi-th-large", path: "/dashboard" },
        { label: "Targets", icon: "pi pi-compass", path: "/targets" },
        { label: "SSL Center", icon: "pi pi-shield", path: "/ssl-verifier" },
        { label: "Incident Center", icon: "pi pi-exclamation-triangle", path: "/incidents" },
        { label: "Agent Control", icon: "pi pi-sitemap", path: "/agents" },
        { label: "Service Center", icon: "pi pi-desktop", path: "/services" },
        { label: "Alert View", icon: "pi pi-bell", path: "/alerts" },
        { label: "Team Management", icon: "pi pi-server", path: "/team" },
        {
          label: "Backup Policies",
          icon: "pi pi-database",
          path: "/backup-policies",
        },
        {
          label: "Backup Logs",
          icon: "pi pi-history",
          path: "/backup-logs",
        },
      ],
    },
  ],

  admin: [
    {
      section: "Main",
      items: [
        { label: "Dashboard", icon: "pi pi-th-large", path: "/dashboard" },
        { label: "Targets", icon: "pi pi-compass", path: "/targets" },
        { label: "SSL Center", icon: "pi pi-shield", path: "/ssl-verifier" },
        { label: "Incident Center", icon: "pi pi-exclamation-triangle", path: "/incidents" },
        { label: "Agent Control", icon: "pi pi-sitemap", path: "/agents" },
        { label: "Service Center", icon: "pi pi-desktop", path: "/services" },
        { label: "Alert View", icon: "pi pi-bell", path: "/alerts" },
        { label: "Team Management", icon: "pi pi-server", path: "/team" },
      ],
    },
  ],

  operator: [
    {
      section: "Operations",
      items: [
        { label: "Dashboard", icon: "pi pi-th-large", path: "/dashboard" },
        { label: "Targets", icon: "pi pi-compass", path: "/targets" },
        { label: "SSL Center", icon: "pi pi-shield", path: "/ssl-verifier" },
        { label: "Incident Center", icon: "pi pi-exclamation-triangle", path: "/incidents" },
        { label: "Agent Control", icon: "pi pi-sitemap", path: "/agents" },
        { label: "Service Center", icon: "pi pi-desktop", path: "/services" },
        { label: "Alert View", icon: "pi pi-bell", path: "/alerts" },
        { label: "Team Management", icon: "pi pi-server", path: "/team" },
      ],
    },
  ],

  member: [
    {
      section: "Main",
      items: [
        { label: "Dashboard", icon: "pi pi-th-large", path: "/dashboard" },
        { label: "Targets", icon: "pi pi-compass", path: "/targets" },
        { label: "SSL Center", icon: "pi pi-shield", path: "/ssl-verifier" },
        { label: "Incident Center", icon: "pi pi-exclamation-triangle", path: "/incidents" },
        { label: "Agent Control", icon: "pi pi-sitemap", path: "/agents" },
        { label: "Service Center", icon: "pi pi-desktop", path: "/services" },
        { label: "Alert View", icon: "pi pi-bell", path: "/alerts" },
        { label: "Team Management", icon: "pi pi-server", path: "/team" },
      ],
    },
  ],
};

function getInitials(name?: string, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return parts[0].slice(0, 2).toUpperCase();
  }

  return email ? email.slice(0, 2).toUpperCase() : "OR";
}

function formatRole(role?: string | null) {
  if (!role) return "Tenant Admin";

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SideBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user, tenant, role } = useAppSelector((state) => state.auth);
  const { mode } = useAppSelector((state) => state.theme);

  const [collapsed, setCollapsed] = useState(false);

  const menuSections = useMemo(() => {
    return MENUS[role || "tenant_admin"] || MENUS.tenant_admin;
  }, [role]);

  const userName = user?.full_name?.trim() || user?.email || "Dennis Irungu";
  const userRole = formatRole(user?.role || role);
  const initials = getInitials(user?.full_name, user?.email);

  const logoSrc =
    mode === "dark"
      ? "/logos/opsradar-dark.png"
      : "/logos/opsradar-light.png";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <>
      <aside className={collapsed ? "app-sidebar collapsed" : "app-sidebar"}>
        <div className="sidebar-brand">
          <button
            type="button"
            className="sidebar-logo-button"
            onClick={() => navigate("/dashboard")}
            aria-label="Go to dashboard"
          >
            <img
              src={logoSrc}
              alt="OpsRadar"
              className="sidebar-logo-img"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <span className="sidebar-logo-fallback">
              <i className="pi pi-wave-pulse" />
            </span>
          </button>

          {!collapsed && <span className="sidebar-brand-name">OpsRadar</span>}

          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((prev) => !prev)}
            type="button"
            aria-label="Toggle sidebar"
          >
            <i className={collapsed ? "pi pi-angle-right" : "pi pi-bars"} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuSections.map((section) => (
            <div className="sidebar-section" key={section.section}>
              {!collapsed && <p className="section-title">{section.section}</p>}

              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    isActive ? "sidebar-link active" : "sidebar-link"
                  }
                >
                  <i className={item.icon} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-action-btn logout-btn"
            onClick={handleLogout}
          >
            <i className="pi pi-sign-out" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <header className={collapsed ? "app-topbar sidebar-collapsed" : "app-topbar"}>
        <div className="topbar-left">
          <div className="topbar-search">
            <i className="pi pi-search" />
            <input placeholder="Search monitors, alerts, services..." />
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => dispatch(toggleTheme())}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={mode === "dark" ? "Light mode" : "Dark mode"}
          >
            <i className={mode === "dark" ? "pi pi-sun" : "pi pi-moon"} />
          </button>

          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => navigate("/alerts")}
            aria-label="Notifications"
            title="Notifications"
          >
            <i className="pi pi-bell" />
            <span className="notification-dot" />
          </button>

          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="Help"
            title="Help"
          >
            <i className="pi pi-question-circle" />
          </button>

          <button
            type="button"
            className="topbar-profile"
            onClick={handleProfileClick}
            title="Open profile"
          >
            <div className="topbar-avatar">{initials}</div>

            <div className="topbar-user-info">
              <strong>{userName}</strong>
              <span>{tenant?.name || userRole}</span>
            </div>

            <i className="pi pi-angle-down profile-chevron" />
          </button>
        </div>
      </header>
    </>
  );
}