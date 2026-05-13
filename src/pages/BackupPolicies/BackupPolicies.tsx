import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import "./BackupPolicies.css";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import { BackupPolicy, backupPolicyApi } from "../../services/api";

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function getPolicyStatus(row: BackupPolicy) {
  const value = String(row.status || "").toLowerCase();

  if (value === "disabled" || row.enabled === false) {
    return "disabled";
  }

  return "enabled";
}

function isPolicyEnabled(row: BackupPolicy) {
  return getPolicyStatus(row) === "enabled";
}

function statusClass(status?: string) {
  const value = String(status || "enabled").toLowerCase();

  if (value === "enabled" || value === "success") {
    return "backup-status-badge success";
  }

  if (value === "disabled") {
    return "backup-status-badge muted";
  }

  if (value === "failed" || value === "error") {
    return "backup-status-badge failed";
  }

  if (value === "running") {
    return "backup-status-badge running";
  }

  return "backup-status-badge pending";
}

function storageClass(storage?: string) {
  const value = String(storage || "local").toLowerCase();
  return `backup-storage-pill ${value}`;
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function BackupPolicyActions(props: {
  row: BackupPolicy;
  busyPolicyId: string;
  onView: (row: BackupPolicy) => void;
  onRunNow: (row: BackupPolicy) => void;
  onToggleStatus: (row: BackupPolicy) => void;
}) {
  const { row, busyPolicyId, onView, onRunNow, onToggleStatus } = props;

  const menuRef = useRef<Menu>(null);
  const enabled = isPolicyEnabled(row);
  const isBusy = busyPolicyId === row.id;

  const items: MenuItem[] = [
    {
      label: "View",
      icon: "pi pi-eye",
      command: () => onView(row),
    },
    {
      label: "Run Now",
      icon: "pi pi-play",
      disabled: !enabled || isBusy,
      command: () => onRunNow(row),
    },
    {
      separator: true,
    },
    {
      label: enabled ? "Disable" : "Enable",
      icon: enabled ? "pi pi-pause-circle" : "pi pi-check-circle",
      disabled: isBusy,
      command: () => onToggleStatus(row),
    },
  ];

  return (
    <div className="backup-row-actions">
      <Menu model={items} popup ref={menuRef} appendTo={document.body} />

      <button
        type="button"
        className="backup-kebab-btn"
        title="Actions"
        disabled={isBusy}
        onClick={(event) => menuRef.current?.toggle(event)}
      >
        {isBusy ? (
          <i className="pi pi-spin pi-spinner" />
        ) : (
          <i className="pi pi-ellipsis-v" />
        )}
      </button>
    </div>
  );
}

export default function BackupPolicies() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [policies, setPolicies] = useState<BackupPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyPolicyId, setBusyPolicyId] = useState("");

  const stats = useMemo(() => {
    const total = policies.length;

    const enabled = policies.filter((policy) => {
      return isPolicyEnabled(policy);
    }).length;

    const disabled = policies.filter((policy) => {
      return !isPolicyEnabled(policy);
    }).length;

    const remote = policies.filter((policy) => {
      return policy.rsync_enabled || policy.rclone_enabled;
    }).length;

    return {
      total,
      enabled,
      disabled,
      remote,
    };
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
        getErrorMessage(error, "Could not fetch backup policies.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = (row: BackupPolicy) => {
    navigate(`/backup-policies/${row.id}`);
  };

  const handleRunNow = async (row: BackupPolicy) => {
    if (!isPolicyEnabled(row)) {
      showToast(
        "info",
        "Policy disabled",
        "Enable this backup policy before running it."
      );
      return;
    }

    try {
      setBusyPolicyId(row.id);

      await backupPolicyApi.runNow(row.id);

      showToast(
        "success",
        "Backup queued",
        "The agent will run this backup shortly."
      );

      await loadPolicies();
    } catch (error: any) {
      showToast(
        "error",
        "Failed to run backup",
        getErrorMessage(error, "Could not queue backup.")
      );
    } finally {
      setBusyPolicyId("");
    }
  };

  const handleToggleStatus = async (row: BackupPolicy) => {
    const enabled = isPolicyEnabled(row);
    const nextStatus = enabled ? "disabled" : "enabled";

    try {
      setBusyPolicyId(row.id);

      await backupPolicyApi.updateStatus(row.id, nextStatus);

      showToast(
        "success",
        nextStatus === "enabled" ? "Policy enabled" : "Policy disabled",
        nextStatus === "enabled"
          ? "The backup policy has been enabled and queued for agent cache update."
          : "The backup policy has been disabled and queued for agent cache update."
      );

      await loadPolicies();
    } catch (error: any) {
      showToast(
        "error",
        nextStatus === "enabled"
          ? "Failed to enable policy"
          : "Failed to disable policy",
        getErrorMessage(error, "Could not update backup policy status.")
      );
    } finally {
      setBusyPolicyId("");
    }
  };

  const statusBody = (row: BackupPolicy) => {
    const status = getPolicyStatus(row);

    return <span className={statusClass(status)}>{status}</span>;
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
    return (
      <span className={storageClass(row.storage_type)}>
        {row.storage_type || "local"}
      </span>
    );
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
        <span className={statusClass(row.last_status)}>
          {row.last_status || "not run"}
        </span>
      </div>
    );
  };

  const actionsBody = (row: BackupPolicy) => {
    return (
      <BackupPolicyActions
        row={row}
        busyPolicyId={busyPolicyId}
        onView={handleView}
        onRunNow={handleRunNow}
        onToggleStatus={handleToggleStatus}
      />
    );
  };

  return (
    <div className="backup-page">
      <div className="backup-hero">
        <div>
          <span className="backup-eyebrow">OpsRadar Backup Center</span>

          <h1>Backup Policies</h1>

          <p>
            Manage scheduled database backups, dynamic tool installation, local
            vault credentials, and remote sync destinations.
          </p>
        </div>

        <div className="backup-hero-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadPolicies}
            disabled={loading}
          >
            <i className={loading ? "pi pi-spin pi-spinner" : "pi pi-refresh"} />
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
          <span>Disabled</span>
          <strong>{stats.disabled}</strong>
          <small>Paused backup schedules</small>
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
            <Column header="Status" body={statusBody} sortable />
            <Column
              header="Actions"
              body={actionsBody}
              frozen
              alignFrozen="right"
              style={{ width: "90px" }}
            />
          </DataTable>
        )}
      </section>
    </div>
  );
}