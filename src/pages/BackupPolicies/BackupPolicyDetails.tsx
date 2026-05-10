import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import "./BackupPolicies.css";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import {
  Agent,
  BackupLog,
  BackupPolicy,
  agentApi,
  backupPolicyApi,
  getAgentDownloadIP,
  getAgentId,
  getBackupLogDownloadPath,
} from "../../services/api";

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
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

  if (value === "success" || value === "enabled") {
    return "backup-status-badge success";
  }

  if (value === "failed" || value === "error") {
    return "backup-status-badge failed";
  }

  if (value === "running") {
    return "backup-status-badge running";
  }

  if (value === "disabled") {
    return "backup-status-badge muted";
  }

  return "backup-status-badge pending";
}

function normalizeIdValue(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return value.$oid || value.Hex || value.hex || "";
  }

  return String(value);
}

function getBackupFileName(row: BackupLog) {
  if (row.file_name) {
    return row.file_name;
  }

  const path = row.local_path || row.path || row.relative_path || "";
  const parts = path.replaceAll("\\", "/").split("/").filter(Boolean);

  return parts[parts.length - 1] || "backup-file";
}

function getMatchedAgent(policy: BackupPolicy | null, agents: Agent[]) {
  if (!policy) return null;

  const policyAgentID = normalizeIdValue(policy.agent_id);

  return (
    agents.find((agent) => {
      return normalizeIdValue(getAgentId(agent)) === policyAgentID;
    }) || null
  );
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default function BackupPolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [policy, setPolicy] = useState<BackupPolicy | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState("");
  const [deletingPath, setDeletingPath] = useState("");

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedDeleteLog, setSelectedDeleteLog] = useState<BackupLog | null>(
    null
  );

  const matchedAgent = useMemo(() => {
    return getMatchedAgent(policy, agents);
  }, [policy, agents]);

  const agentIP = useMemo(() => {
    return getAgentDownloadIP(matchedAgent);
  }, [matchedAgent]);

  const stats = useMemo(() => {
    const total = logs.length;

    const success = logs.filter((log) => {
      return String(log.status || "").toLowerCase() === "success";
    }).length;

    const failed = logs.filter((log) => {
      return String(log.status || "").toLowerCase() === "failed";
    }).length;

    const synced = logs.filter((log) => {
      return log.rsync_synced || log.rclone_synced;
    }).length;

    return {
      total,
      success,
      failed,
      synced,
    };
  }, [logs]);

  const loadDetails = async () => {
    if (!id) {
      showToast("error", "Policy missing", "Backup policy ID is missing.");
      return;
    }

    try {
      setLoading(true);

      const [policyDetails, policyLogs, agentList] = await Promise.all([
        backupPolicyApi.details(id),
        backupPolicyApi.logs(id),
        agentApi.view(),
      ]);

      setPolicy(policyDetails);
      setLogs(policyLogs.logs || []);
      setAgents(agentList || []);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load backup policy",
        getErrorMessage(error, "Could not fetch backup policy.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRunNow = async () => {
    if (!policy?.id) {
      showToast("error", "Backup policy missing", "Backup policy ID is missing.");
      return;
    }

    try {
      setRunningNow(true);

      await backupPolicyApi.runNow(policy.id);

      showToast(
        "success",
        "Backup queued",
        "The agent will run this backup shortly."
      );

      await loadDetails();
    } catch (error: any) {
      showToast(
        "error",
        "Failed to run backup",
        getErrorMessage(error, "Could not queue backup.")
      );
    } finally {
      setRunningNow(false);
    }
  };

  const handleDownload = async (row: BackupLog) => {
    if (!policy?.id) {
      showToast("error", "Download failed", "Backup policy ID is missing.");
      return;
    }

    const path = getBackupLogDownloadPath(row);

    if (!path) {
      showToast("error", "Download failed", "Backup file path is missing.");
      return;
    }

    try {
      setDownloadingPath(path);

      await backupPolicyApi.downloadFile(
        policy.id,
        path,
        getBackupFileName(row)
      );

      showToast("success", "Download started", getBackupFileName(row));
    } catch (error: any) {
      showToast(
        "error",
        "Download failed",
        getErrorMessage(error, "Could not download backup using signed URL.")
      );
    } finally {
      setDownloadingPath("");
    }
  };

  const openDeleteDialog = (row: BackupLog) => {
    setSelectedDeleteLog(row);
    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deletingPath) return;

    setSelectedDeleteLog(null);
    setDeleteDialogVisible(false);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteLog) return;

    if (!policy?.id) {
      showToast("error", "Delete failed", "Backup policy ID is missing.");
      return;
    }

    const path = getBackupLogDownloadPath(selectedDeleteLog);

    if (!path) {
      showToast("error", "Delete failed", "Backup file path is missing.");
      return;
    }

    const fileName = getBackupFileName(selectedDeleteLog);

    try {
      setDeletingPath(path);

      await backupPolicyApi.deleteFile(policy.id, path);

      setDeleteDialogVisible(false);
      setSelectedDeleteLog(null);

      showToast(
        "success",
        "Backup deleted",
        `${fileName} has been deleted successfully.`
      );

      await loadDetails();
    } catch (error: any) {
      showToast(
        "error",
        "Delete failed",
        getErrorMessage(error, "Could not delete backup using signed URL.")
      );
    } finally {
      setDeletingPath("");
    }
  };

  const statusBody = (row: BackupLog) => {
    return (
      <span className={statusClass(row.status)}>
        {row.status || "unknown"}
      </span>
    );
  };

  const fileBody = (row: BackupLog) => {
    const path = getBackupLogDownloadPath(row);

    return (
      <div className="backup-table-service">
        <strong>{getBackupFileName(row)}</strong>
        <span>{formatBytes(row.file_size_bytes)}</span>
        {path ? <small className="backup-file-path">{path}</small> : null}
      </div>
    );
  };

  const syncBody = (row: BackupLog) => {
    return (
      <div className="backup-sync-stack">
        <span className={row.rsync_synced ? "sync-ok" : "sync-muted"}>
          <i className="pi pi-send" />
          Rsync {row.rsync_synced ? "synced" : "not synced"}
        </span>

        <span className={row.rclone_synced ? "sync-ok" : "sync-muted"}>
          <i className="pi pi-cloud" />
          Rclone {row.rclone_synced ? "synced" : "not synced"}
        </span>
      </div>
    );
  };

  const actionsBody = (row: BackupLog) => {
    const path = getBackupLogDownloadPath(row);
    const status = String(row.status || "").toLowerCase();

    const canDownload =
      Boolean(policy?.id) && Boolean(path) && status === "success";

    const canDelete = Boolean(policy?.id) && Boolean(path);

    return (
      <div className="backup-log-actions">
        <button
          type="button"
          className="backup-icon-btn"
          disabled={!canDownload || downloadingPath === path}
          title={
            canDownload
              ? "Generate signed URL and download"
              : "Backup file is not available"
          }
          onClick={() => handleDownload(row)}
        >
          {downloadingPath === path ? (
            <i className="pi pi-spin pi-spinner" />
          ) : (
            <i className="pi pi-download" />
          )}
        </button>

        <button
          type="button"
          className="backup-icon-btn danger"
          disabled={!canDelete || deletingPath === path}
          title="Delete backup file"
          onClick={() => openDeleteDialog(row)}
        >
          {deletingPath === path ? (
            <i className="pi pi-spin pi-spinner" />
          ) : (
            <i className="pi pi-trash" />
          )}
        </button>
      </div>
    );
  };

  const deleteFileName = selectedDeleteLog
    ? getBackupFileName(selectedDeleteLog)
    : "";

  const deleteFilePath = selectedDeleteLog
    ? getBackupLogDownloadPath(selectedDeleteLog)
    : "";

  return (
    <div className="backup-page">
      <div className="backup-hero details">
        <div>
          <button
            type="button"
            className="agent-back-btn"
            onClick={() => navigate("/backup-policies")}
          >
            <i className="pi pi-arrow-left" />
            Back
          </button>

          <span className="backup-eyebrow">Backup Policy Details</span>
          <h1>{policy?.name || "Backup Policy"}</h1>
          <p>
            Backup downloads and deletes are protected using short-lived signed
            URLs generated by the backend.
          </p>
        </div>

        <div className="backup-hero-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadDetails}
            disabled={loading}
          >
            <i className={loading ? "pi pi-spin pi-spinner" : "pi pi-refresh"} />
            Refresh
          </button>

          <button
            type="button"
            className="backup-primary-btn"
            disabled={!policy || runningNow}
            onClick={handleRunNow}
          >
            <i className={runningNow ? "pi pi-spin pi-spinner" : "pi pi-play"} />
            Run Now
          </button>
        </div>
      </div>

      {loading && !policy ? (
        <PageLoader message="Loading backup policy..." />
      ) : !policy ? (
        <div className="empty-state">
          <i className="pi pi-database" />
          <h3>No backup policy found</h3>
          <p>The selected backup policy could not be loaded.</p>
        </div>
      ) : (
        <>
          <div className="backup-stats-grid">
            <div className="backup-stat-card purple">
              <span>Total Runs</span>
              <strong>{stats.total}</strong>
              <small>Backup attempts</small>
            </div>

            <div className="backup-stat-card green">
              <span>Success</span>
              <strong>{stats.success}</strong>
              <small>Completed backups</small>
            </div>

            <div className="backup-stat-card red">
              <span>Failed</span>
              <strong>{stats.failed}</strong>
              <small>Failed attempts</small>
            </div>

            <div className="backup-stat-card blue">
              <span>Remote Synced</span>
              <strong>{stats.synced}</strong>
              <small>Rsync or rclone</small>
            </div>
          </div>

          <div className="backup-details-grid">
            <section className="backup-card">
              <div className="backup-profile-header">
                <div className="backup-profile-icon">
                  <i className="pi pi-database" />
                </div>

                <div>
                  <h2>{policy.name}</h2>
                  <p>
                    {policy.service_name || "—"} ·{" "}
                    {policy.service_type || "unknown"}
                  </p>

                  <div className="backup-profile-pills">
                    <span className={statusClass(policy.status)}>
                      {policy.status || "enabled"}
                    </span>
                    <span className="backup-storage-pill local">
                      {policy.storage_type || "local"}
                    </span>
                    <span className="backup-storage-pill zip">
                      {policy.compression}
                    </span>
                  </div>
                </div>
              </div>

              <div className="backup-profile-grid">
                <div>
                  <span>Schedule</span>
                  <strong>{policy.schedule}</strong>
                </div>

                <div>
                  <span>Retention</span>
                  <strong>{policy.retention_days || 14} days</strong>
                </div>

                <div>
                  <span>Local Path</span>
                  <strong>{policy.local_path || "—"}</strong>
                </div>

                <div>
                  <span>Agent</span>
                  <strong>{matchedAgent?.name || policy.agent_id || "—"}</strong>
                </div>

                <div>
                  <span>Agent IP</span>
                  <strong>{agentIP || "No IP reported"}</strong>
                </div>

                <div>
                  <span>Download Security</span>
                  <strong>Backend signed URL</strong>
                </div>

                <div>
                  <span>Archive Protected</span>
                  <strong>{policy.archive_password_enabled ? "Yes" : "No"}</strong>
                </div>

                <div>
                  <span>Auto Install Tools</span>
                  <strong>{policy.auto_install_tools ? "Enabled" : "Disabled"}</strong>
                </div>

                <div>
                  <span>Install Strategy</span>
                  <strong>{policy.install_strategy || "report_only"}</strong>
                </div>
              </div>
            </section>

            <aside className="backup-card compact">
              <h3>Required Tools</h3>

              <div className="backup-required-tools">
                {(policy.required_tools || []).length ? (
                  policy.required_tools?.map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))
                ) : (
                  <p>No tools detected.</p>
                )}
              </div>

              <div className="backup-tool-status">
                <span>Last Tool Check</span>
                <strong>{policy.last_tool_check_status || "not checked"}</strong>
                <small>{formatDate(policy.last_tool_check_at)}</small>
                {policy.last_tool_check_error ? (
                  <p>{policy.last_tool_check_error}</p>
                ) : null}
              </div>
            </aside>
          </div>

          <section className="backup-card">
            <div className="backup-card-header">
              <div>
                <h2>Backup Logs</h2>
                <p>
                  Showing backup executions for this policy. Downloads use
                  backend-signed agent URLs.
                </p>
              </div>

              <span>{logs.length} log record(s)</span>
            </div>

            <DataTable
              value={logs}
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 20, 50]}
              scrollable
              scrollHeight="430px"
              stripedRows
              emptyMessage="No backup logs found."
              className="backup-datatable"
            >
              <Column
                header="Started At"
                body={(row: BackupLog) => formatDate(row.started_at)}
              />
              <Column header="Status" body={statusBody} />
              <Column
                header="File"
                body={fileBody}
                style={{ minWidth: "360px" }}
              />
              <Column
                header="Duration"
                body={(row: BackupLog) => `${row.duration_seconds || 0}s`}
              />
              <Column header="Sync" body={syncBody} />
              <Column field="error_message" header="Error" />
              <Column
                header="Actions"
                body={actionsBody}
                style={{ minWidth: "120px" }}
              />
            </DataTable>
          </section>
        </>
      )}

      <Dialog
        visible={deleteDialogVisible}
        onHide={closeDeleteDialog}
        modal
        draggable={false}
        resizable={false}
        closable={!deletingPath}
        className="backup-delete-dialog"
        header={
          <div className="backup-delete-dialog-header">
            <div className="backup-delete-icon">
              <i className="pi pi-trash" />
            </div>
            <div>
              <h3>Delete backup file?</h3>
              <p>This action will remove the selected backup from the agent.</p>
            </div>
          </div>
        }
        footer={
          <div className="backup-delete-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={closeDeleteDialog}
              disabled={Boolean(deletingPath)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="backup-danger-btn"
              onClick={confirmDelete}
              disabled={Boolean(deletingPath)}
            >
              {deletingPath ? (
                <>
                  <i className="pi pi-spin pi-spinner" />
                  Deleting...
                </>
              ) : (
                <>
                  <i className="pi pi-trash" />
                  Delete File
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="backup-delete-body">
          <span>File name</span>
          <strong>{deleteFileName || "backup-file"}</strong>

          {deleteFilePath ? (
            <div className="backup-delete-path">
              <span>Path</span>
              <code>{deleteFilePath}</code>
            </div>
          ) : null}

          <div className="backup-delete-warning">
            <i className="pi pi-exclamation-triangle" />
            <p>
              Make sure this backup is no longer needed before deleting it.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}