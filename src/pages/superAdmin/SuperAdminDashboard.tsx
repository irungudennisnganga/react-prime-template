// src/pages/dashboard/superadmin/SuperAdminDashboard.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

import {
  TenantListItem,
  tenantsApi,
  AgentRelease,
  agentReleasesApi,
} from "../../services/api";

import "./SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
  const toast = useRef<Toast>(null);

  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [releases, setReleases] = useState<AgentRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(
    null
  );
  const [tenantDialogVisible, setTenantDialogVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const tenantsResponse = await tenantsApi.listAll();
      setTenants(tenantsResponse.data || []);

      try {
        const releasesResponse = await agentReleasesApi.view();
        setReleases(releasesResponse.data || []);
      } catch {
        setReleases([]);
      }
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: "Failed",
        detail:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load dashboard information",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const totalTenants = tenants.length;

    const totalUsers = tenants.reduce(
      (sum, tenant) => sum + tenant.users_count,
      0
    );

    const totalMonitors = tenants.reduce(
      (sum, tenant) => sum + tenant.monitors_count,
      0
    );

    const totalAgents = tenants.reduce(
      (sum, tenant) => sum + tenant.agents_count,
      0
    );

    const activeTenants = tenants.filter(
      (tenant) =>
        tenant.users_count + tenant.monitors_count + tenant.agents_count > 0
    ).length;

    const inactiveTenants = totalTenants - activeTenants;

    const activeRelease =
      releases.find(
        (release) => release.is_active || release.status === "active"
      ) || null;

    const latestRelease = releases[0] || null;

    const maxUsage = Math.max(
      ...tenants.map(
        (tenant) =>
          tenant.users_count + tenant.monitors_count + tenant.agents_count
      ),
      1
    );

    const topTenants = [...tenants]
      .sort((a, b) => {
        const aTotal = a.users_count + a.monitors_count + a.agents_count;
        const bTotal = b.users_count + b.monitors_count + b.agents_count;
        return bTotal - aTotal;
      })
      .slice(0, 5);

    return {
      totalTenants,
      totalUsers,
      totalMonitors,
      totalAgents,
      activeTenants,
      inactiveTenants,
      activeRelease,
      latestRelease,
      maxUsage,
      topTenants,
      totalReleases: releases.length,
    };
  }, [tenants, releases]);

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  };

  const openTenant = (tenant: TenantListItem) => {
    setSelectedTenant(tenant);
    setTenantDialogVisible(true);
  };

  const getTenantActivity = (tenant: TenantListItem) => {
    const total =
      tenant.users_count + tenant.monitors_count + tenant.agents_count;

    if (total >= 20) {
      return {
        label: "High",
        severity: "success" as const,
      };
    }

    if (total >= 5) {
      return {
        label: "Medium",
        severity: "warning" as const,
      };
    }

    if (total > 0) {
      return {
        label: "Low",
        severity: "info" as const,
      };
    }

    return {
      label: "Inactive",
      severity: "secondary" as const,
    };
  };

  const tenantNameTemplate = (tenant: TenantListItem) => {
    const initial = (tenant.name || tenant.slug || "T").charAt(0).toUpperCase();

    return (
      <div className="super-tenant-cell">
        <div className="super-tenant-avatar">{initial}</div>

        <div>
          <div className="super-tenant-name">
            {tenant.name || "Unnamed Tenant"}
          </div>
          <div className="super-tenant-sub">{tenant.slug || tenant.id}</div>
        </div>
      </div>
    );
  };

  const countBadge = (
    value: number,
    type: "users" | "monitors" | "agents"
  ) => {
    const icon =
      type === "users"
        ? "pi pi-users"
        : type === "monitors"
          ? "pi pi-desktop"
          : "pi pi-server";

    return (
      <span className={`super-count-badge ${type}`}>
        <i className={icon} />
        {value}
      </span>
    );
  };

  const usageTemplate = (tenant: TenantListItem) => {
    const total =
      tenant.users_count + tenant.monitors_count + tenant.agents_count;

    const value = Math.round((total / stats.maxUsage) * 100);

    return (
      <div className="super-usage-cell">
        <div className="super-usage-head">
          <span>{total} items</span>
          <small>{value}%</small>
        </div>

        <ProgressBar value={value} showValue={false} />
      </div>
    );
  };

  const activityTemplate = (tenant: TenantListItem) => {
    const activity = getTenantActivity(tenant);

    return (
      <Tag
        value={activity.label}
        severity={activity.severity}
        rounded
        className="super-activity-tag"
      />
    );
  };

  const actionsTemplate = (tenant: TenantListItem) => {
    return (
      <Button
        label="View"
        icon="pi pi-eye"
        size="small"
        outlined
        className="super-view-btn"
        onClick={() => openTenant(tenant)}
      />
    );
  };

  return (
    <div className="superadmin-page">
      <Toast ref={toast} />

      <section className="super-hero">
        <div className="super-hero-content">
          <span className="super-kicker">Super Admin Console</span>

          <h1>System Overview</h1>

          <p>
            Monitor tenants, users, agents, monitors, and release status across
            the full OpsRadar platform.
          </p>

          <div className="super-hero-actions">
            <Button
              label="Refresh Dashboard"
              icon="pi pi-refresh"
              onClick={fetchDashboardData}
              loading={loading}
            />
          </div>
        </div>

        <div className="super-health-card">
          <div className="super-health-top">
            <div>
              <span>Platform Health</span>
              <strong>Operational</strong>
            </div>

            <i className="pi pi-shield" />
          </div>

          <Divider />

          <div className="super-health-grid">
            <div>
              <span>Tenants</span>
              <strong>{stats.totalTenants}</strong>
            </div>

            <div>
              <span>Agents</span>
              <strong>{stats.totalAgents}</strong>
            </div>

            <div>
              <span>Monitors</span>
              <strong>{stats.totalMonitors}</strong>
            </div>

            <div>
              <span>Releases</span>
              <strong>{stats.totalReleases}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="super-stats-grid">
        <Card className="super-stat-card tenants">
          <span>Total Tenants</span>
          <strong>{stats.totalTenants}</strong>
          <small>{stats.activeTenants} active tenants</small>
        </Card>

        <Card className="super-stat-card users">
          <span>Total Users</span>
          <strong>{stats.totalUsers}</strong>
          <small>Registered across all tenants</small>
        </Card>

        <Card className="super-stat-card monitors">
          <span>Total Monitors</span>
          <strong>{stats.totalMonitors}</strong>
          <small>URLs, services, domains, servers</small>
        </Card>

        <Card className="super-stat-card agents">
          <span>Total Agents</span>
          <strong>{stats.totalAgents}</strong>
          <small>Installed monitoring agents</small>
        </Card>
      </div>

      <div className="super-main-grid">
        <Card className="super-panel super-tenant-panel">
          <div className="super-panel-header">
            <div>
              <h2>Tenant Activity</h2>
              <p>Top tenants by users, monitors, and agents.</p>
            </div>
          </div>

          <div className="super-top-list">
            {stats.topTenants.length === 0 ? (
              <div className="super-empty-state">
                <i className="pi pi-info-circle" />
                <span>No tenant activity yet.</span>
              </div>
            ) : (
              stats.topTenants.map((tenant) => {
                const total =
                  tenant.users_count +
                  tenant.monitors_count +
                  tenant.agents_count;

                const percentage = Math.round(
                  (total / stats.maxUsage) * 100
                );

                return (
                  <div className="super-top-item" key={tenant.id}>
                    <div className="super-top-main">
                      <div className="super-tenant-avatar small">
                        {(tenant.name || "T").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <strong>{tenant.name || "Unnamed Tenant"}</strong>
                        <span>{total} total resources</span>
                      </div>
                    </div>

                    <div className="super-top-progress">
                      <ProgressBar value={percentage} showValue={false} />
                      <small>{percentage}%</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="super-panel super-release-panel">
          <div className="super-panel-header">
            <div>
              <h2>Agent Releases</h2>
              <p>Current release information.</p>
            </div>
          </div>

          <div className="super-release-summary">
            <div className="super-release-icon">
              <i className="pi pi-cloud-upload" />
            </div>

            <div>
              <span>Active Release</span>
              <strong>{stats.activeRelease?.version || "Not set"}</strong>
              <small>
                Latest: {stats.latestRelease?.version || "No releases found"}
              </small>
            </div>
          </div>

          <div className="super-release-meta">
            <div>
              <span>Total Releases</span>
              <strong>{stats.totalReleases}</strong>
            </div>

            <div>
              <span>Activated At</span>
              <strong>{formatDate(stats.activeRelease?.activated_at)}</strong>
            </div>

            <div>
              <span>Latest Created</span>
              <strong>{formatDate(stats.latestRelease?.created_at)}</strong>
            </div>
          </div>
        </Card>
      </div>

      <Card className="super-table-card">
        <div className="super-table-header">
          <div>
            <h2>All Tenants</h2>
            <p>Full tenant directory with usage counts.</p>
          </div>

          <div className="super-table-actions">
            <span className="p-input-icon-left super-search">
              <i className="pi pi-search" />
              <InputText
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search tenants..."
              />
            </span>

            <Button
              label="Refresh"
              icon="pi pi-refresh"
              outlined
              onClick={fetchDashboardData}
              loading={loading}
            />
          </div>
        </div>

        <DataTable
          value={tenants}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          dataKey="id"
          globalFilter={globalFilter}
          emptyMessage="No tenants found"
          responsiveLayout="scroll"
          className="super-table"
        >
          <Column
            header="Tenant"
            body={tenantNameTemplate}
            field="name"
            sortable
          />

          <Column
            header="Users"
            body={(tenant: TenantListItem) =>
              countBadge(tenant.users_count, "users")
            }
            field="users_count"
            sortable
          />

          <Column
            header="Monitors"
            body={(tenant: TenantListItem) =>
              countBadge(tenant.monitors_count, "monitors")
            }
            field="monitors_count"
            sortable
          />

          <Column
            header="Agents"
            body={(tenant: TenantListItem) =>
              countBadge(tenant.agents_count, "agents")
            }
            field="agents_count"
            sortable
          />

          <Column header="Usage" body={usageTemplate} />

          <Column header="Activity" body={activityTemplate} />

          <Column
            header="Created"
            body={(tenant: TenantListItem) => formatDate(tenant.created_at)}
            field="created_at"
            sortable
          />

          <Column
            header=""
            body={actionsTemplate}
            style={{ width: "110px", textAlign: "right" }}
          />
        </DataTable>
      </Card>

      <Dialog
        header="Tenant Details"
        visible={tenantDialogVisible}
        onHide={() => setTenantDialogVisible(false)}
        className="super-tenant-dialog"
        modal
      >
        {selectedTenant ? (
          <div className="super-tenant-details">
            <div className="super-tenant-details-top">
              <div className="super-tenant-avatar large">
                {(selectedTenant.name || "T").charAt(0).toUpperCase()}
              </div>

              <div>
                <h3>{selectedTenant.name || "Unnamed Tenant"}</h3>
                <p>{selectedTenant.slug || selectedTenant.id}</p>
                {activityTemplate(selectedTenant)}
              </div>
            </div>

            <Divider />

            <div className="super-details-grid">
              <div>
                <span>Tenant ID</span>
                <strong>{selectedTenant.id}</strong>
              </div>

              <div>
                <span>Name</span>
                <strong>{selectedTenant.name || "—"}</strong>
              </div>

              <div>
                <span>Slug</span>
                <strong>{selectedTenant.slug || "—"}</strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>{formatDate(selectedTenant.created_at)}</strong>
              </div>

              <div>
                <span>Updated At</span>
                <strong>{formatDate(selectedTenant.updated_at)}</strong>
              </div>
            </div>

            <div className="super-detail-counts">
              <div className="super-detail-count users">
                <i className="pi pi-users" />
                <span>Users</span>
                <strong>{selectedTenant.users_count}</strong>
              </div>

              <div className="super-detail-count monitors">
                <i className="pi pi-desktop" />
                <span>Monitors</span>
                <strong>{selectedTenant.monitors_count}</strong>
              </div>

              <div className="super-detail-count agents">
                <i className="pi pi-server" />
                <span>Agents</span>
                <strong>{selectedTenant.agents_count}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p>No tenant selected</p>
        )}
      </Dialog>
    </div>
  );
}