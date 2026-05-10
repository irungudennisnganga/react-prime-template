import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import "./BackupPolicies.css";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import { BackupPolicy, backupPolicyApi } from "../../services/api";

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

function statusClass(status?: string) {
  const value = String(status || "enabled").toLowerCase();

  if (value === "enabled" || value === "success") return "backup-status-badge success";
  if (value === "disabled") return "backup-status-badge muted";
  if (value === "failed" || value === "error") return "backup-status-badge failed";
  if (value === "running") return "backup-status-badge running";

  return "backup-status-badge pending";
}

function storageClass(storage?: string) {
  const value = String(storage || "local").toLowerCase();
  return `backup-storage-pill ${value}`;
}

export default function BackupPolicies() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [policies, setPolicies] = useState<BackupPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = policies.length;
    const enabled = policies.filter((p) => p.status === "enabled").length;
    const autoInstall = policies.filter((p) => p.auto_install_tools).length;
    const remote = policies.filter((p) => p.rsync_enabled || p.rclone_enabled).length;

    return { total, enabled, autoInstall, remote };
  }, [policies]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await backupPolicyApi.view();
      setPolicies(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load backup policies",
        error.response?.data?.message || error.message || "Could not fetch backup policies."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const statusBody = (row: BackupPolicy) => {
    return <span className={statusClass(row.status)}>{row.status || "enabled"}</span>;
  };

  const serviceBody = (row: BackupPolicy) => {
    return (
      <div className="backup-table-service">
        <strong>{row.service_name || "—"}</strong>
        <span>{row.service_type || "unknown"}</span>
      </div>
    );
  };

  const storageBody = (row: BackupPolicy) => {
    return <span className={storageClass(row.storage_type)}>{row.storage_type || "local"}</span>;
  };

  const toolsBody = (row: BackupPolicy) => {
    const tools = row.required_tools || [];

    if (!tools.length) return "—";

    return (
      <div className="backup-tools-list">
        {tools.slice(0, 4).map((tool) => (
          <span key={tool}>{tool}</span>
        ))}
        {tools.length > 4 ? <small>+{tools.length - 4}</small> : null}
      </div>
    );
  };

  const lastRunBody = (row: BackupPolicy) => {
    return (
      <div className="backup-table-date">
        <strong>{formatDate(row.last_run_at)}</strong>
        <span className={statusClass(row.last_status)}>{row.last_status || "not run"}</span>
      </div>
    );
  };

  const actionsBody = (row: BackupPolicy) => {
    return (
      <div className="backup-actions">
        <button
          type="button"
          className="backup-icon-btn"
          onClick={() => navigate(`/backup-policies/${row.id}`)}
          title="View"
        >
          <i className="pi pi-eye" />
        </button>

        <button
          type="button"
          className="backup-icon-btn accent"
          onClick={async () => {
            try {
              await backupPolicyApi.runNow(row.id);
              showToast("success", "Backup queued", "The agent will run this backup shortly.");
              loadPolicies();
            } catch (error: any) {
              showToast(
                "error",
                "Failed to run backup",
                error.response?.data?.message || error.message || "Could not queue backup."
              );
            }
          }}
          title="Run now"
        >
          <i className="pi pi-play" />
        </button>
      </div>
    );
  };

  return (
    <div className="backup-page">
      <div className="backup-hero">
        <div>
          <span className="backup-eyebrow">OpsRadar Backup Center</span>
          <h1>Backup Policies</h1>
          <p>
            Manage scheduled database backups, dynamic tool installation, local vault credentials,
            and remote sync destinations.
          </p>
        </div>

        <div className="backup-hero-actions">
          <button type="button" className="secondary-btn" onClick={loadPolicies}>
            <i className="pi pi-refresh" />
            Refresh
          </button>

          <button
            type="button"
            className="backup-primary-btn"
            onClick={() => navigate("/backup-policies/create")}
          >
            <i className="pi pi-plus" />
            New Policy
          </button>
        </div>
      </div>

      <div className="backup-stats-grid">
        <div className="backup-stat-card purple">
          <span>Total Policies</span>
          <strong>{stats.total}</strong>
          <small>All configured backup jobs</small>
        </div>

        <div className="backup-stat-card green">
          <span>Enabled</span>
          <strong>{stats.enabled}</strong>
          <small>Currently active schedules</small>
        </div>

        <div className="backup-stat-card orange">
          <span>Auto Install</span>
          <strong>{stats.autoInstall}</strong>
          <small>Can install missing tools</small>
        </div>

        <div className="backup-stat-card blue">
          <span>Remote Sync</span>
          <strong>{stats.remote}</strong>
          <small>Rsync or rclone enabled</small>
        </div>
      </div>

      <section className="backup-card">
        <div className="backup-card-header">
          <div>
            <h2>Policies</h2>
            <p>Showing all configured backup policies.</p>
          </div>

          <span>{policies.length} policy record(s)</span>
        </div>

        {loading ? (
          <PageLoader message="Loading backup policies..." />
        ) : (
          <DataTable
            value={policies}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 20, 50]}
            stripedRows
            scrollable
            scrollHeight="520px"
            emptyMessage="No backup policies found."
            className="backup-datatable"
          >
            <Column field="name" header="Policy Name" sortable />
            <Column header="Service" body={serviceBody} />
            <Column field="schedule" header="Schedule" sortable />
            <Column field="compression" header="Compression" sortable />
            <Column header="Storage" body={storageBody} />
            <Column header="Tools" body={toolsBody} />
            <Column header="Last Run" body={lastRunBody} />
            <Column header="Status" body={statusBody} />
            <Column header="Actions" body={actionsBody} frozen alignFrozen="right" />
          </DataTable>
        )}
      </section>
    </div>
  );
}