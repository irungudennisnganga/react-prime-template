import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";

import { TenantListItem, tenantsApi } from "../../services/api";

import "./TenantsPage.css";

export default function TenantsPage() {
  const toast = useRef<Toast>(null);

  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantListItem | null>(
    null
  );
  const [detailsVisible, setDetailsVisible] = useState(false);

  const fetchTenants = async () => {
    try {
      setLoading(true);

      const response = await tenantsApi.listAll();
      setTenants(response.data || []);
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: "Failed",
        detail:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch tenants",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
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

    return {
      totalTenants,
      totalUsers,
      totalMonitors,
      totalAgents,
    };
  }, [tenants]);

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  };

  const openDetails = (tenant: TenantListItem) => {
    setSelectedTenant(tenant);
    setDetailsVisible(true);
  };

  const tenantTemplate = (tenant: TenantListItem) => {
    const initials = (tenant.name || tenant.slug || "T")
      .charAt(0)
      .toUpperCase();

    return (
      <div className="tenant-name-cell">
        <div className="tenant-avatar">{initials}</div>

        <div>
          <div className="tenant-name">{tenant.name || "Unnamed Tenant"}</div>
          <div className="tenant-slug">{tenant.slug || "No slug set"}</div>
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
      <span className={`tenant-count-badge ${type}`}>
        <i className={icon} />
        {value}
      </span>
    );
  };

  const activityTemplate = (tenant: TenantListItem) => {
    const total =
      tenant.users_count + tenant.monitors_count + tenant.agents_count;

    let severity: "success" | "warning" | "secondary" = "secondary";
    let label = "Low";

    if (total >= 10) {
      severity = "success";
      label = "Active";
    } else if (total >= 3) {
      severity = "warning";
      label = "Growing";
    }

    return <Tag value={label} severity={severity} rounded />;
  };

  const actionsTemplate = (tenant: TenantListItem) => {
    return (
      <Button
        icon="pi pi-eye"
        label="View"
        size="small"
        outlined
        className="tenant-view-btn"
        onClick={() => openDetails(tenant)}
      />
    );
  };

  const toolbarStart = (
    <div className="tenants-toolbar-title">
      <h2>Tenant Directory</h2>
      <p>View all tenants and their system usage summary.</p>
    </div>
  );

  const toolbarEnd = (
    <div className="tenants-toolbar-actions">
      <span className="p-input-icon-left tenants-search">
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
        onClick={fetchTenants}
        loading={loading}
      />
    </div>
  );

  return (
    <div className="tenants-page">
      <Toast ref={toast} />

      <section className="tenants-banner">
        <div className="tenants-banner-content">
          <span className="tenants-kicker">System Administration</span>

          <h1>Tenants Overview</h1>

          <p>
            Monitor all registered tenants, users, monitors, and installed
            agents from one clean dashboard.
          </p>

          <div className="tenants-banner-actions">
            <Button
              label="Refresh Data"
              icon="pi pi-refresh"
              onClick={fetchTenants}
              loading={loading}
            />
          </div>
        </div>

        <div className="tenants-banner-visual">
          <div className="tenant-orbit-card main">
            <i className="pi pi-building" />
            <span>{stats.totalTenants}</span>
            <small>Tenants</small>
          </div>

          <div className="tenant-orbit-card users">
            <i className="pi pi-users" />
            <span>{stats.totalUsers}</span>
          </div>

          <div className="tenant-orbit-card monitors">
            <i className="pi pi-desktop" />
            <span>{stats.totalMonitors}</span>
          </div>

          <div className="tenant-orbit-card agents">
            <i className="pi pi-server" />
            <span>{stats.totalAgents}</span>
          </div>
        </div>
      </section>

      <div className="tenants-stats-grid">
        <Card className="tenant-stat-card tenants">
          <span>Total Tenants</span>
          <strong>{stats.totalTenants}</strong>
          <small>Registered companies</small>
        </Card>

        <Card className="tenant-stat-card users">
          <span>Total Users</span>
          <strong>{stats.totalUsers}</strong>
          <small>Across all tenants</small>
        </Card>

        <Card className="tenant-stat-card monitors">
          <span>Total Monitors</span>
          <strong>{stats.totalMonitors}</strong>
          <small>Tracked services and URLs</small>
        </Card>

        <Card className="tenant-stat-card agents">
          <span>Total Agents</span>
          <strong>{stats.totalAgents}</strong>
          <small>Installed monitoring agents</small>
        </Card>
      </div>

      <Card className="tenants-table-card">
        <Toolbar
          start={toolbarStart}
          end={toolbarEnd}
          className="tenants-toolbar"
        />

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
          className="tenants-table"
        >
          <Column
            header="Tenant"
            body={tenantTemplate}
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
        visible={detailsVisible}
        onHide={() => setDetailsVisible(false)}
        className="tenant-dialog"
        modal
      >
        {selectedTenant ? (
          <div className="tenant-details">
            <div className="tenant-details-top">
              <div className="tenant-avatar large">
                {(selectedTenant.name || selectedTenant.slug || "T")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>{selectedTenant.name || "Unnamed Tenant"}</h3>
                <p>{selectedTenant.slug || "No slug set"}</p>
              </div>
            </div>

            <Divider />

            <div className="tenant-details-grid">
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

            <div className="tenant-details-counts">
              <div className="tenant-detail-count users">
                <i className="pi pi-users" />
                <span>Users</span>
                <strong>{selectedTenant.users_count}</strong>
              </div>

              <div className="tenant-detail-count monitors">
                <i className="pi pi-desktop" />
                <span>Monitors</span>
                <strong>{selectedTenant.monitors_count}</strong>
              </div>

              <div className="tenant-detail-count agents">
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