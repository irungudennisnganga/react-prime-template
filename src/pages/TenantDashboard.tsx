import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import { InputSwitch } from "primereact/inputswitch";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  AlertEmail,
  alertEmailApi,
  Monitor,
  monitorApi,
  TeamMember,
  teamApi,
} from "../services/api";

type DashboardTheme = "light" | "dark";

function normalizeMonitorStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "up" || value === "active" || value === "online") return "online";
  if (value === "down" || value === "offline") return "offline";
  if (value === "disabled") return "disabled";

  return "pending";
}

function normalizeEmailStatus(email: AlertEmail) {
  const status = String(email.status || "").toLowerCase();

  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  if (status === "queued") return "queued";
  if (email.sent_at) return "sent";

  return status || "unknown";
}

function normalizeTeamStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "active" || value === "joined") return "active";
  if (value === "pending" || value === "invited") return "pending";
  if (value === "disabled" || value === "blocked") return "disabled";

  return value || "pending";
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function getInitials(name?: string, email?: string) {
  const source = name || email || "TM";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getStoredTheme(): DashboardTheme {
  const stored = localStorage.getItem("opsradar_theme");

  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function TenantDashboard() {
  const { showToast } = useAppToast();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [emails, setEmails] = useState<AlertEmail[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>(() => getStoredTheme());

  const isDark = theme === "dark";

  const applyTheme = (nextTheme: DashboardTheme) => {
    setTheme(nextTheme);
    localStorage.setItem("opsradar_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = (checked: boolean) => {
    applyTheme(checked ? "dark" : "light");
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [monitorData, emailData, teamData] = await Promise.all([
        monitorApi.list(),
        alertEmailApi.list({ limit: 500 }),
        teamApi.view(),
      ]);

      setMonitors(monitorData);
      setEmails(emailData);
      setTeamMembers(teamData);
    } catch (error: any) {
      showToast(
        "error",
        "Dashboard failed",
        error.response?.data?.message || "Could not load tenant dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyTheme(theme);
    loadDashboardData();
  }, []);

  const stats = useMemo(() => {
    const totalMonitors = monitors.length;

    const onlineMonitors = monitors.filter(
      (monitor) => normalizeMonitorStatus(monitor.status) === "online"
    ).length;

    const offlineMonitors = monitors.filter(
      (monitor) => normalizeMonitorStatus(monitor.status) === "offline"
    ).length;

    const pendingMonitors = monitors.filter(
      (monitor) => normalizeMonitorStatus(monitor.status) === "pending"
    ).length;

    const disabledMonitors = monitors.filter(
      (monitor) => normalizeMonitorStatus(monitor.status) === "disabled"
    ).length;

    const totalEmails = emails.length;

    const sentEmails = emails.filter(
      (email) => normalizeEmailStatus(email) === "sent"
    ).length;

    const openedEmails = emails.filter(
      (email) => Boolean(email.opened) || Number(email.open_count || 0) > 0
    ).length;

    const clickedEmails = emails.filter(
      (email) => Number(email.click_count || 0) > 0
    ).length;

    const failedEmails = emails.filter(
      (email) => normalizeEmailStatus(email) === "failed"
    ).length;

    const totalTeamMembers = teamMembers.length;

    const activeMembers = teamMembers.filter(
      (member) => normalizeTeamStatus(member.status) === "active"
    ).length;

    const admins = teamMembers.filter((member) => {
      const role = String(member.role || "").toLowerCase();
      return role === "admin" || role === "owner";
    }).length;

    const uptimeScore =
      totalMonitors > 0 ? Math.round((onlineMonitors / totalMonitors) * 100) : 0;

    const deliveryScore =
      totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : 0;

    const teamScore =
      totalTeamMembers > 0
        ? Math.round((activeMembers / totalTeamMembers) * 100)
        : 0;

    const tenantHealthScore = Math.round(
      uptimeScore * 0.5 + deliveryScore * 0.3 + teamScore * 0.2
    );

    return {
      totalMonitors,
      onlineMonitors,
      offlineMonitors,
      pendingMonitors,
      disabledMonitors,
      totalEmails,
      sentEmails,
      openedEmails,
      clickedEmails,
      failedEmails,
      totalTeamMembers,
      activeMembers,
      admins,
      uptimeScore,
      deliveryScore,
      teamScore,
      tenantHealthScore,
    };
  }, [monitors, emails, teamMembers]);

  const chartTextColor = isDark ? "#cbd5e1" : "#475569";
  const chartGridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  const baseChartOptions = useMemo(() => {
    return {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: chartTextColor,
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "#0f1c18" : "#ffffff",
          titleColor: isDark ? "#f8fafc" : "#0f172a",
          bodyColor: isDark ? "#cbd5e1" : "#475569",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartTextColor,
          },
          grid: {
            color: chartGridColor,
          },
        },
        y: {
          ticks: {
            color: chartTextColor,
          },
          grid: {
            color: chartGridColor,
          },
        },
      },
    };
  }, [chartTextColor, chartGridColor, isDark]);

  const doughnutOptions = useMemo(() => {
    return {
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: chartTextColor,
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "#0f1c18" : "#ffffff",
          titleColor: isDark ? "#f8fafc" : "#0f172a",
          bodyColor: isDark ? "#cbd5e1" : "#475569",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb",
          borderWidth: 1,
        },
      },
    };
  }, [chartTextColor, isDark]);

  const monitorStatusChart = useMemo(() => {
    return {
      labels: ["Online", "Offline", "Pending", "Disabled"],
      datasets: [
        {
          data: [
            stats.onlineMonitors,
            stats.offlineMonitors,
            stats.pendingMonitors,
            stats.disabledMonitors,
          ],
          backgroundColor: ["#17b26a", "#ef4444", "#f97316", "#64748b"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const emailEngagementChart = useMemo(() => {
    return {
      labels: ["Sent", "Opened", "Clicked", "Failed"],
      datasets: [
        {
          label: "Emails",
          data: [
            stats.sentEmails,
            stats.openedEmails,
            stats.clickedEmails,
            stats.failedEmails,
          ],
          backgroundColor: ["#3b82f6", "#f97316", "#17b26a", "#ef4444"],
          borderRadius: 10,
        },
      ],
    };
  }, [stats]);

  const teamRoleChart = useMemo(() => {
    const roles = teamMembers.reduce<Record<string, number>>((acc, member) => {
      const role = String(member.role || "member").toLowerCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(roles),
      datasets: [
        {
          data: Object.values(roles),
          backgroundColor: ["#17b26a", "#3b82f6", "#8b5cf6", "#f97316", "#06b6d4"],
          borderWidth: 0,
        },
      ],
    };
  }, [teamMembers]);

  const tenantActivityChart = useMemo(() => {
    return {
      labels: ["Monitors", "Online", "Emails", "Opened", "Team"],
      datasets: [
        {
          label: "Tenant Activity",
          data: [
            stats.totalMonitors,
            stats.onlineMonitors,
            stats.totalEmails,
            stats.openedEmails,
            stats.totalTeamMembers,
          ],
          fill: true,
          borderColor: "#17b26a",
          backgroundColor: "rgba(23, 178, 106, 0.18)",
          tension: 0.45,
          pointBackgroundColor: "#17b26a",
          pointBorderColor: "#17b26a",
        },
      ],
    };
  }, [stats]);

  const recentEmails = useMemo(() => {
    return [...emails]
      .sort((a, b) => {
        const left = new Date(a.sent_at || a.created_at || 0).getTime();
        const right = new Date(b.sent_at || b.created_at || 0).getTime();
        return right - left;
      })
      .slice(0, 5);
  }, [emails]);

  const recentMembers = useMemo(() => {
    return [...teamMembers]
      .sort((a, b) => {
        const left = new Date(a.created_at || 0).getTime();
        const right = new Date(b.created_at || 0).getTime();
        return right - left;
      })
      .slice(0, 5);
  }, [teamMembers]);

  return (
    <div className="tenant-dashboard-page">
      <div className="tenant-dashboard-top">
        <div>
          <span className="tenant-dashboard-pill">
            <i className="pi pi-chart-line" />
            Tenant Intelligence
          </span>

          <h1>Tenant Dashboard</h1>

          <p>
            A colorful overview of tenant monitors, alert emails, team access,
            engagement, and workspace health.
          </p>
        </div>

        <div className="tenant-dashboard-actions">
         

          <button type="button" className="primary-btn" onClick={loadDashboardData}>
            <i className="pi pi-refresh" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader message="Loading tenant dashboard..." />
      ) : (
        <>
          <div className="tenant-hero-grid">
            <section className="tenant-health-card">
              <div className="tenant-health-top">
                <div>
                  <span>Tenant Health Score</span>
                  <strong>{stats.tenantHealthScore}%</strong>
                  <p>
                    Calculated from monitor uptime, email delivery, and active
                    team access.
                  </p>
                </div>

                <div
                  className="tenant-health-ring"
                  style={{
                    background: `conic-gradient(var(--ops-green) 0 ${stats.tenantHealthScore}%, rgba(100,116,139,0.18) ${stats.tenantHealthScore}% 100%)`,
                  }}
                >
                  <span>{stats.tenantHealthScore}%</span>
                </div>
              </div>

              <div className="tenant-health-breakdown">
                <div>
                  <span>Uptime</span>
                  <strong>{stats.uptimeScore}%</strong>
                </div>

                <div>
                  <span>Email Delivery</span>
                  <strong>{stats.deliveryScore}%</strong>
                </div>

                <div>
                  <span>Team Activity</span>
                  <strong>{stats.teamScore}%</strong>
                </div>
              </div>
            </section>

            <section className="tenant-chart-card">
              <div className="tenant-chart-header">
                <div>
                  <h3>Tenant Activity Mix</h3>
                  <p>Snapshot across core tenant resources.</p>
                </div>
              </div>

              <div className="tenant-prime-chart short">
                <Chart type="line" data={tenantActivityChart} options={baseChartOptions} />
              </div>
            </section>
          </div>

          <div className="tenant-summary-grid">
            <div className="tenant-summary-card monitors">
              <div>
                <span>Total Monitors</span>
                <strong>{stats.totalMonitors}</strong>
                <small>{stats.onlineMonitors} online targets</small>
              </div>
              <i className="pi pi-desktop" />
            </div>

            <div className="tenant-summary-card online">
              <div>
                <span>Online</span>
                <strong>{stats.onlineMonitors}</strong>
                <small>{stats.uptimeScore}% uptime score</small>
              </div>
              <i className="pi pi-check-circle" />
            </div>

            <div className="tenant-summary-card alerts">
              <div>
                <span>Alert Emails</span>
                <strong>{stats.totalEmails}</strong>
                <small>{stats.sentEmails} sent successfully</small>
              </div>
              <i className="pi pi-envelope" />
            </div>

            <div className="tenant-summary-card opened">
              <div>
                <span>Email Opens</span>
                <strong>{stats.openedEmails}</strong>
                <small>{stats.clickedEmails} tracked clicks</small>
              </div>
              <i className="pi pi-eye" />
            </div>

            <div className="tenant-summary-card team">
              <div>
                <span>Team Members</span>
                <strong>{stats.totalTeamMembers}</strong>
                <small>{stats.admins} admins / owners</small>
              </div>
              <i className="pi pi-users" />
            </div>
          </div>

          <div className="tenant-charts-grid">
            <section className="tenant-chart-card">
              <div className="tenant-chart-header">
                <div>
                  <h3>Monitor Status Distribution</h3>
                  <p>Online, offline, pending, and disabled targets.</p>
                </div>
              </div>

              <div className="tenant-prime-chart">
                <Chart type="doughnut" data={monitorStatusChart} options={doughnutOptions} />
              </div>
            </section>

            <section className="tenant-chart-card">
              <div className="tenant-chart-header">
                <div>
                  <h3>Email Engagement</h3>
                  <p>Sent, opened, clicked, and failed alert emails.</p>
                </div>
              </div>

              <div className="tenant-prime-chart">
                <Chart type="bar" data={emailEngagementChart} options={baseChartOptions} />
              </div>
            </section>

            <section className="tenant-chart-card">
              <div className="tenant-chart-header">
                <div>
                  <h3>Team Role Breakdown</h3>
                  <p>Distribution of users by role in this tenant.</p>
                </div>
              </div>

              <div className="tenant-prime-chart">
                <Chart type="pie" data={teamRoleChart} options={doughnutOptions} />
              </div>
            </section>
          </div>

          
        </>
      )}
    </div>
  );
}