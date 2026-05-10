import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import "./BackupPolicies.css";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import { BackupLog, backupPolicyApi } from "../../services/api";

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

function formatBytes(bytes?: number) {
  const value = Number(bytes || 0);
  if (!value) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size = size / 1024;
    unit++;
  }

  return `${size.toFixed(1)} ${units[unit]}`;
}

function statusClass(status?: string) {
  const value = String(status || "").toLowerCase();

  if (value === "success") return "backup-status-badge success";
  if (value === "failed" || value === "error") return "backup-status-badge failed";
  if (value === "running") return "backup-status-badge running";

  return "backup-status-badge pending";
}

export default function BackupLogs() {
  const { showToast } = useAppToast();

  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((log) => String(log.status).toLowerCase() === "success").length;
    const failed = logs.filter((log) => String(log.status).toLowerCase() === "failed").length;
    const totalSize = logs.reduce((sum, log) => sum + Number(log.file_size_bytes || 0), 0);

    return { total, success, failed, totalSize };
  }, [logs]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await backupPolicyApi.logs();
      setLogs(data.logs);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load backup logs",
        error.response?.data?.message || error.message || "Could not fetch backup logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const statusBody = (row: BackupLog) => {
    return <span className={statusClass(row.status)}>{row.status || "unknown"}</span>;
  };

  const serviceBody = (row: BackupLog) => {
    return (
      <div className="backup-table-service">
        <strong>{row.service_name || "—"}</strong>
        <span>{row.service_type || "unknown"}</span>
      </div>
    );
  };

  const fileBody = (row: BackupLog) => {
    return (
      <div className="backup-table-service">
        <strong>{row.file_name || "—"}</strong>
        <span>{formatBytes(row.file_size_bytes)}</span>
      </div>
    );
  };

  return (
    <div className="backup-page">
      <div className="backup-hero logs">
        <div>
          <span className="backup-eyebrow">Backup Observability</span>
          <h1>Backup Logs</h1>
          <p>Track successful backups, failed jobs, archive sizes, and sync status across all agents.</p>
        </div>

        <button type="button" className="secondary-btn" onClick={loadLogs}>
          <i className="pi pi-refresh" />
          Refresh
        </button>
      </div>

      <div className="backup-stats-grid">
        <div className="backup-stat-card purple">
          <span>Total Logs</span>
          <strong>{stats.total}</strong>
          <small>All backup executions</small>
        </div>

        <div className="backup-stat-card green">
          <span>Successful</span>
          <strong>{stats.success}</strong>
          <small>Completed successfully</small>
        </div>

        <div className="backup-stat-card red">
          <span>Failed</span>
          <strong>{stats.failed}</strong>
          <small>Needs attention</small>
        </div>

        <div className="backup-stat-card blue">
          <span>Total Size</span>
          <strong>{formatBytes(stats.totalSize)}</strong>
          <small>Stored archive volume</small>
        </div>
      </div>

      <section className="backup-card">
        <div className="backup-card-header">
          <div>
            <h2>Execution Logs</h2>
            <p>Showing backup logs in East Africa Time.</p>
          </div>

          <span>{logs.length} log record(s)</span>
        </div>

        {loading ? (
          <PageLoader message="Loading backup logs..." />
        ) : (
          <DataTable
            value={logs}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 20, 50]}
            scrollable
            scrollHeight="560px"
            stripedRows
            emptyMessage="No backup logs found."
            className="backup-datatable"
          >
            <Column header="Started At" body={(row: BackupLog) => formatDate(row.started_at)} />
            <Column header="Service" body={serviceBody} />
            <Column header="Status" body={statusBody} />
            <Column header="File" body={fileBody} />
            <Column header="Duration" body={(row: BackupLog) => `${row.duration_seconds || 0}s`} />
            <Column header="Local Path" field="local_path" />
            <Column header="Error" field="error_message" />
          </DataTable>
        )}
      </section>
    </div>
  );
}