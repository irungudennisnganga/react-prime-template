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
  AgentBackupStorageSummary,
  AgentBackupTreeItem,
  BackupLog,
  BackupPolicy,
  agentApi,
  backupPolicyApi,
  formatBackupBytes,
  getAgentId,
  getBackupLogDownloadPath,
  getBackupTreeItemName,
} from "../../services/api";

type DeleteTarget =
  | {
      source: "log";
      log: BackupLog;
      item?: never;
    }
  | {
      source: "tree";
      item: AgentBackupTreeItem;
      log?: never;
    };

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
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

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return value.$oid || value.Hex || value.hex || "";
  }

  return String(value);
}

function normalizeText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizePath(value: any): string {
  let clean = normalizeText(value)
    .replaceAll("\\", "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\/+/, "")
    .trim();

  if (clean.endsWith("/") && clean.length > 1) {
    clean = clean.slice(0, -1);
  }

  return clean;
}

function pathBaseName(value?: string) {
  const clean = normalizePath(value);
  const parts = clean.split("/").filter(Boolean);

  return parts[parts.length - 1] || "";
}

function getBackupFileName(row: BackupLog) {
  if (row.file_name) return row.file_name;

  const path = row.local_path || row.path || row.relative_path || "";
  const parts = normalizePath(path).split("/").filter(Boolean);

  return parts[parts.length - 1] || "backup-file";
}

function getBackupTreePath(item: AgentBackupTreeItem) {
  return normalizePath(item.path || item.relative_path);
}

function getBackupTreeRelativePath(item: AgentBackupTreeItem) {
  return normalizePath(item.relative_path || item.path);
}

function getBackupTreeName(item: AgentBackupTreeItem) {
  return normalizeText(item.name || item.file_name || getBackupTreeItemName(item));
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

function flattenTree(items: AgentBackupTreeItem[]): AgentBackupTreeItem[] {
  const output: AgentBackupTreeItem[] = [];

  const walk = (nodes: AgentBackupTreeItem[]) => {
    nodes.forEach((node) => {
      output.push(node);

      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children);
      }
    });
  };

  walk(items);

  return output;
}

function getAgentDisplayName(agent: Agent | null, fallback?: string) {
  if (!agent) return fallback || "—";

  const value =
    (agent as any).name ||
    (agent as any).Name ||
    (agent as any).hostname ||
    (agent as any).Hostname ||
    (agent as any).host ||
    (agent as any).Host ||
    fallback;

  return value || "—";
}

function getAgentDisplayIP(agent: Agent | null) {
  if (!agent) return "Backend proxy";

  const value =
    (agent as any).ip ||
    (agent as any).IP ||
    (agent as any).agent_ip ||
    (agent as any).AgentIP ||
    (agent as any).host_ip ||
    (agent as any).HostIP ||
    (agent as any).last_ip ||
    (agent as any).LastIP ||
    "";

  return value || "Backend proxy";
}

function getPolicyFolderName(policy: BackupPolicy | null): string {
  return pathBaseName(policy?.local_path || "").toLowerCase();
}

function getPolicyBranchDepth(item: AgentBackupTreeItem, policy: BackupPolicy | null): number {
  const policyFolder = getPolicyFolderName(policy);

  if (!policyFolder) return -1;

  const name = getBackupTreeName(item).toLowerCase();
  const relativePath = getBackupTreeRelativePath(item).toLowerCase();
  const path = getBackupTreePath(item).toLowerCase();

  const candidates = [name, relativePath, path].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === policyFolder) return 0;

    const parts = candidate.split("/").filter(Boolean);
    const index = parts.indexOf(policyFolder);

    if (index >= 0) return index;
  }

  return -1;
}

function isPolicyRootNode(item: AgentBackupTreeItem, policy: BackupPolicy | null): boolean {
  const policyFolder = getPolicyFolderName(policy);

  if (!policyFolder) return false;

  const name = getBackupTreeName(item).toLowerCase();
  const relativePath = getBackupTreeRelativePath(item).toLowerCase();
  const path = getBackupTreePath(item).toLowerCase();

  return (
    name === policyFolder ||
    relativePath === policyFolder ||
    path === policyFolder
  );
}

function isInsidePolicyBranch(item: AgentBackupTreeItem, policy: BackupPolicy | null): boolean {
  const policyFolder = getPolicyFolderName(policy);

  if (!policyFolder) return false;

  const name = getBackupTreeName(item).toLowerCase();
  const relativePath = getBackupTreeRelativePath(item).toLowerCase();
  const path = getBackupTreePath(item).toLowerCase();

  return (
    name === policyFolder ||
    relativePath === policyFolder ||
    path === policyFolder ||
    relativePath.startsWith(`${policyFolder}/`) ||
    path.startsWith(`${policyFolder}/`) ||
    relativePath.includes(`/${policyFolder}/`) ||
    path.includes(`/${policyFolder}/`) ||
    relativePath.endsWith(`/${policyFolder}`) ||
    path.endsWith(`/${policyFolder}`)
  );
}

function trimTreeToPolicyBranch(
  item: AgentBackupTreeItem,
  policy: BackupPolicy | null
): AgentBackupTreeItem | null {
  const children = Array.isArray(item.children)
    ? (item.children
        .map((child) => trimTreeToPolicyBranch(child, policy))
        .filter(Boolean) as AgentBackupTreeItem[])
    : [];

  const matched = isInsidePolicyBranch(item, policy);

  if (!matched && !children.length) {
    return null;
  }

  return {
    ...item,
    children,
  };
}

function dedupeTreeByPolicyPath(items: AgentBackupTreeItem[]): AgentBackupTreeItem[] {
  const seen = new Set<string>();

  const walk = (nodes: AgentBackupTreeItem[]): AgentBackupTreeItem[] => {
    return nodes
      .map((node) => {
        const children = Array.isArray(node.children) ? walk(node.children) : [];

        const type = normalizeText(node.type || "unknown").toLowerCase();
        const name = getBackupTreeName(node).toLowerCase();
        const relativePath = getBackupTreeRelativePath(node).toLowerCase();
        const path = getBackupTreePath(node).toLowerCase();

        const key = `${type}:${relativePath || path || name}`;

        if (seen.has(key)) {
          return null;
        }

        seen.add(key);

        return {
          ...node,
          children,
        };
      })
      .filter(Boolean) as AgentBackupTreeItem[];
  };

  return walk(items);
}

function collectPolicyFolderStructure(
  items: AgentBackupTreeItem[],
  policy: BackupPolicy | null
): AgentBackupTreeItem[] {
  const policyFolder = getPolicyFolderName(policy);

  if (!policyFolder) return [];

  const roots: AgentBackupTreeItem[] = [];

  const findRoots = (nodes: AgentBackupTreeItem[]) => {
    nodes.forEach((node) => {
      const trimmed = trimTreeToPolicyBranch(node, policy);

      if (!trimmed) return;

      if (isPolicyRootNode(trimmed, policy)) {
        roots.push(trimmed);
        return;
      }

      if (Array.isArray(trimmed.children) && trimmed.children.length) {
        findRoots(trimmed.children);
      }
    });
  };

  findRoots(items);

  const rootOnly = roots.filter((item) => {
    return getPolicyBranchDepth(item, policy) === 0;
  });

  return dedupeTreeByPolicyPath(rootOnly);
}

function searchTree(
  items: AgentBackupTreeItem[],
  searchTerm: string
): AgentBackupTreeItem[] {
  const query = searchTerm.trim().toLowerCase();

  if (!query) return items;

  return items
    .map((item) => {
      const children = Array.isArray(item.children)
        ? searchTree(item.children, query)
        : [];

      const name = getBackupTreeItemName(item).toLowerCase();
      const path = getBackupTreePath(item).toLowerCase();
      const serviceName = String(item.service_name || "").toLowerCase();
      const serviceType = String(item.service_type || "").toLowerCase();

      const matched =
        name.includes(query) ||
        path.includes(query) ||
        serviceName.includes(query) ||
        serviceType.includes(query);

      if (matched || children.length) {
        return {
          ...item,
          children,
        };
      }

      return null;
    })
    .filter(Boolean) as AgentBackupTreeItem[];
}

function TreeNodeRow(props: {
  item: AgentBackupTreeItem;
  level: number;
  expandedPaths: Record<string, boolean>;
  deletingPath: string;
  downloadingPath: string;
  onToggle: (item: AgentBackupTreeItem) => void;
  onDownload: (item: AgentBackupTreeItem) => void;
  onDelete: (item: AgentBackupTreeItem) => void;
}) {
  const {
    item,
    level,
    expandedPaths,
    deletingPath,
    downloadingPath,
    onToggle,
    onDownload,
    onDelete,
  } = props;

  const path = getBackupTreePath(item);
  const hasChildren = Boolean(item.children?.length);
  const expanded = Boolean(expandedPaths[path]);
  const isDirectory = item.type === "directory";
  const isFile = item.type === "file";

  return (
    <>
      <tr className="backup-tree-row">
        <td>
          <div
            className="backup-tree-name"
            style={{ paddingLeft: `${level * 1.15}rem` }}
          >
            {isDirectory ? (
              <button
                type="button"
                className="backup-tree-toggle"
                onClick={() => onToggle(item)}
                disabled={!hasChildren}
              >
                <i
                  className={
                    hasChildren
                      ? expanded
                        ? "pi pi-chevron-down"
                        : "pi pi-chevron-right"
                      : "pi pi-minus"
                  }
                />
              </button>
            ) : (
              <span className="backup-tree-toggle ghost">
                <i className="pi pi-minus" />
              </span>
            )}

            <span
              className={
                isDirectory
                  ? "backup-tree-icon folder"
                  : "backup-tree-icon file"
              }
            >
              <i className={isDirectory ? "pi pi-folder" : "pi pi-file"} />
            </span>

            <div>
              <strong>{getBackupTreeItemName(item)}</strong>
              <small>{item.relative_path || path || "—"}</small>
            </div>
          </div>
        </td>

        <td>
          <span
            className={
              isDirectory
                ? "backup-storage-pill local"
                : "backup-storage-pill zip"
            }
          >
            {isDirectory ? "Directory" : "File"}
          </span>
        </td>

        <td>{item.size_human || formatBackupBytes(item.size_bytes)}</td>
        <td>{item.service_name || "—"}</td>
        <td>{item.service_type || "—"}</td>
        <td>{formatDate(item.modified_at_iso || item.modified_at)}</td>

        <td>
          <div className="backup-log-actions">
            <button
              type="button"
              className="backup-icon-btn"
              disabled={!isFile || !path || downloadingPath === path}
              title={isFile ? "Download backup file" : "Folders cannot be downloaded"}
              onClick={() => onDownload(item)}
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
              disabled={!path || deletingPath === path}
              title="Delete backup path"
              onClick={() => onDelete(item)}
            >
              {deletingPath === path ? (
                <i className="pi pi-spin pi-spinner" />
              ) : (
                <i className="pi pi-trash" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {isDirectory && expanded && hasChildren
        ? item.children?.map((child) => (
            <TreeNodeRow
              key={`${child.type}-${child.relative_path || child.path || child.name}`}
              item={child}
              level={level + 1}
              expandedPaths={expandedPaths}
              deletingPath={deletingPath}
              downloadingPath={downloadingPath}
              onToggle={onToggle}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))
        : null}
    </>
  );
}

export default function BackupPolicyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [policy, setPolicy] = useState<BackupPolicy | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [storage, setStorage] = useState<AgentBackupStorageSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState("");
  const [deletingPath, setDeletingPath] = useState("");

  const [activeTab, setActiveTab] = useState<"folders" | "logs">("folders");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const matchedAgent = useMemo(() => {
    return getMatchedAgent(policy, agents);
  }, [policy, agents]);

  const policyFolders = useMemo(() => {
    return collectPolicyFolderStructure(storage?.items || [], policy);
  }, [storage, policy]);

  const filteredPolicyFolders = useMemo(() => {
    return searchTree(policyFolders, searchTerm);
  }, [policyFolders, searchTerm]);

  const storageFlat = useMemo(() => {
    return flattenTree(policyFolders);
  }, [policyFolders]);

  const policyFileCount = useMemo(() => {
    return storageFlat.filter((item) => item.type === "file").length;
  }, [storageFlat]);

  const policyFolderCount = useMemo(() => {
    return storageFlat.filter((item) => item.type === "directory").length;
  }, [storageFlat]);

  const policyStorageSize = useMemo(() => {
    const total = storageFlat
      .filter((item) => item.type === "file")
      .reduce((sum, item) => sum + Number(item.size_bytes || 0), 0);

    return formatBackupBytes(total);
  }, [storageFlat]);

  const logStats = useMemo(() => {
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

  const loadAgentStorage = async () => {
    if (!id) return;

    try {
      setStorageLoading(true);

      const summary = await backupPolicyApi.listAgentStorage(id);
      setStorage(summary);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load policy folder structure",
        getErrorMessage(
          error,
          "Could not fetch backup folders through the backend proxy."
        )
      );
    } finally {
      setStorageLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadDetails(), loadAgentStorage()]);
  };

  useEffect(() => {
    loadDetails();
    loadAgentStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const nextExpanded: Record<string, boolean> = {};

    flattenTree(policyFolders).forEach((item) => {
      const path = getBackupTreePath(item);

      if (path && item.type === "directory") {
        nextExpanded[path] = true;
      }
    });

    setExpandedPaths(nextExpanded);
  }, [policyFolders]);

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

      await refreshAll();
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

  const handleDownloadLog = async (row: BackupLog) => {
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

      await backupPolicyApi.downloadFile(policy.id, path, getBackupFileName(row));

      showToast("success", "Download started", getBackupFileName(row));
    } catch (error: any) {
      showToast(
        "error",
        "Download failed",
        getErrorMessage(
          error,
          "Could not download backup file through the backend proxy."
        )
      );
    } finally {
      setDownloadingPath("");
    }
  };

  const handleDownloadTreeItem = async (item: AgentBackupTreeItem) => {
    if (!policy?.id) {
      showToast("error", "Download failed", "Backup policy ID is missing.");
      return;
    }

    if (item.type !== "file") {
      showToast("info", "Download unavailable", "Only files can be downloaded.");
      return;
    }

    const path = getBackupTreePath(item);

    if (!path) {
      showToast("error", "Download failed", "Backup file path is missing.");
      return;
    }

    try {
      setDownloadingPath(path);

      await backupPolicyApi.downloadFile(
        policy.id,
        path,
        getBackupTreeItemName(item)
      );

      showToast("success", "Download started", getBackupTreeItemName(item));
    } catch (error: any) {
      showToast(
        "error",
        "Download failed",
        getErrorMessage(
          error,
          "Could not download backup file through the backend proxy."
        )
      );
    } finally {
      setDownloadingPath("");
    }
  };

  const openDeleteLogDialog = (row: BackupLog) => {
    setDeleteTarget({
      source: "log",
      log: row,
    });

    setDeleteDialogVisible(true);
  };

  const openDeleteTreeDialog = (item: AgentBackupTreeItem) => {
    setDeleteTarget({
      source: "tree",
      item,
    });

    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deletingPath) return;

    setDeleteTarget(null);
    setDeleteDialogVisible(false);
  };

  const getDeleteTargetName = () => {
    if (!deleteTarget) return "";

    if (deleteTarget.source === "log") {
      return getBackupFileName(deleteTarget.log);
    }

    return getBackupTreeItemName(deleteTarget.item);
  };

  const getDeleteTargetPath = () => {
    if (!deleteTarget) return "";

    if (deleteTarget.source === "log") {
      return getBackupLogDownloadPath(deleteTarget.log);
    }

    return getBackupTreePath(deleteTarget.item);
  };

  const getDeleteTargetType = () => {
    if (!deleteTarget) return "file";

    if (deleteTarget.source === "tree") {
      return deleteTarget.item.type || "file";
    }

    return "file";
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (!policy?.id) {
      showToast("error", "Delete failed", "Backup policy ID is missing.");
      return;
    }

    const path = getDeleteTargetPath();

    if (!path) {
      showToast("error", "Delete failed", "Backup path is missing.");
      return;
    }

    const name = getDeleteTargetName();
    const type = getDeleteTargetType();

    try {
      setDeletingPath(path);

      await backupPolicyApi.deleteFile(policy.id, path);

      setDeleteDialogVisible(false);
      setDeleteTarget(null);

      showToast(
        "success",
        type === "directory" ? "Folder deleted" : "Backup deleted",
        `${name || "Selected backup"} has been deleted successfully.`
      );

      await refreshAll();
    } catch (error: any) {
      showToast(
        "error",
        "Delete failed",
        getErrorMessage(
          error,
          "Could not delete backup path through the backend proxy."
        )
      );
    } finally {
      setDeletingPath("");
    }
  };

  const toggleTreeItem = (item: AgentBackupTreeItem) => {
    const path = getBackupTreePath(item);

    if (!path) return;

    setExpandedPaths((current) => ({
      ...current,
      [path]: !current[path],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};

    storageFlat.forEach((item) => {
      if (item.type === "directory") {
        const path = getBackupTreePath(item);

        if (path) {
          next[path] = true;
        }
      }
    });

    setExpandedPaths(next);
  };

  const collapseAll = () => {
    setExpandedPaths({});
  };

  const statusBody = (row: BackupLog) => {
    return (
      <span className={statusClass(row.status)}>{row.status || "unknown"}</span>
    );
  };

  const fileBody = (row: BackupLog) => {
    const path = getBackupLogDownloadPath(row);

    return (
      <div className="backup-table-service">
        <strong>{getBackupFileName(row)}</strong>
        <span>{formatBackupBytes(row.file_size_bytes)}</span>
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

  const logActionsBody = (row: BackupLog) => {
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
              ? "Download backup through backend proxy"
              : "Backup file is not available"
          }
          onClick={() => handleDownloadLog(row)}
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
          title="Delete backup file and cleanup log"
          onClick={() => openDeleteLogDialog(row)}
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

  const deleteName = getDeleteTargetName();
  const deletePath = getDeleteTargetPath();
  const deleteType = getDeleteTargetType();

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

          <span className="backup-eyebrow">Backup Policy Viewer</span>

          <h1>{policy?.name || "Backup Policy"}</h1>

          <p>
            View this policy&apos;s backup folder structure and execution logs.
          </p>
        </div>

        <div className="backup-hero-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={refreshAll}
            disabled={loading || storageLoading}
          >
            <i
              className={
                loading || storageLoading
                  ? "pi pi-spin pi-spinner"
                  : "pi pi-refresh"
              }
            />
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
              <span>Policy Storage</span>
              <strong>{policyStorageSize}</strong>
              <small>Matched folder files only</small>
            </div>

            <div className="backup-stat-card green">
              <span>Files</span>
              <strong>{policyFileCount}</strong>
              <small>Policy backup files</small>
            </div>

            <div className="backup-stat-card blue">
              <span>Folders</span>
              <strong>{policyFolderCount}</strong>
              <small>Policy backup folders</small>
            </div>

            <div className="backup-stat-card red">
              <span>Failed Runs</span>
              <strong>{logStats.failed}</strong>
              <small>Failed policy runs</small>
            </div>
          </div>

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
                <strong>{getAgentDisplayName(matchedAgent, policy.agent_id)}</strong>
              </div>

              <div>
                <span>Agent Access</span>
                <strong>{getAgentDisplayIP(matchedAgent)}</strong>
              </div>

              <div>
                <span>Total Runs</span>
                <strong>{logStats.total}</strong>
              </div>

              <div>
                <span>Successful Runs</span>
                <strong>{logStats.success}</strong>
              </div>

              <div>
                <span>Last Scan</span>
                <strong>{formatDate(storage?.scanned_at_iso)}</strong>
              </div>
            </div>
          </section>

          <section className="backup-card">
            <div className="backup-tab-header">
              <div>
                <h2>
                  {activeTab === "folders"
                    ? "Policy Folder Structure"
                    : "Policy Backup Logs"}
                </h2>
                <p>
                  {activeTab === "folders"
                    ? "Only folders and files under this policy local path are shown."
                    : "Execution history for this backup policy."}
                </p>
              </div>

              <div className="backup-tab-actions">
                <button
                  type="button"
                  className={activeTab === "folders" ? "tab-btn active" : "tab-btn"}
                  onClick={() => setActiveTab("folders")}
                >
                  <i className="pi pi-folder" />
                  Folder Structure
                </button>

                <button
                  type="button"
                  className={activeTab === "logs" ? "tab-btn active" : "tab-btn"}
                  onClick={() => setActiveTab("logs")}
                >
                  <i className="pi pi-list" />
                  Logs
                </button>
              </div>
            </div>

            {activeTab === "folders" ? (
              <>
                <div className="backup-storage-toolbar">
                  <div className="backup-search-box">
                    <i className="pi pi-search" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search folders, files, service name, path..."
                    />
                  </div>

                  <div className="backup-storage-toolbar-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={expandAll}
                    >
                      <i className="pi pi-plus" />
                      Expand
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={collapseAll}
                    >
                      <i className="pi pi-minus" />
                      Collapse
                    </button>

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={loadAgentStorage}
                      disabled={storageLoading}
                    >
                      <i
                        className={
                          storageLoading
                            ? "pi pi-spin pi-spinner"
                            : "pi pi-refresh"
                        }
                      />
                      Rescan
                    </button>
                  </div>
                </div>

                {storageLoading && !storage ? (
                  <PageLoader message="Loading policy folder structure..." />
                ) : !filteredPolicyFolders.length ? (
                  <div className="empty-state compact">
                    <i className="pi pi-folder-open" />
                    <h3>No policy folders found</h3>
                    <p>
                      No folders were found under this policy&apos;s local path.
                    </p>
                  </div>
                ) : (
                  <div className="backup-tree-table-wrap">
                    <table className="backup-tree-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Service</th>
                          <th>Service Type</th>
                          <th>Modified</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredPolicyFolders.map((item) => (
                          <TreeNodeRow
                            key={`${item.type}-${item.relative_path || item.path || item.name}`}
                            item={item}
                            level={0}
                            expandedPaths={expandedPaths}
                            deletingPath={deletingPath}
                            downloadingPath={downloadingPath}
                            onToggle={toggleTreeItem}
                            onDownload={handleDownloadTreeItem}
                            onDelete={openDeleteTreeDialog}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="backup-card-header small">
                  <div>
                    <h2>Policy Backup Logs</h2>
                    <p>
                      Saved backend records for this policy&apos;s backup runs.
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
                    body={logActionsBody}
                    style={{ minWidth: "120px" }}
                  />
                </DataTable>
              </>
            )}
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
              <h3>
                Delete{" "}
                {deleteType === "directory" ? "backup folder" : "backup file"}?
              </h3>

              <p>
                This removes the selected backup from the agent through the
                backend proxy.
              </p>
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
                  Delete {deleteType === "directory" ? "Folder" : "File"}
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="backup-delete-body">
          <span>Name</span>
          <strong>{deleteName || "backup-item"}</strong>

          <div className="backup-delete-path">
            <span>Path</span>
            <code>{deletePath || "—"}</code>
          </div>

          <div className="backup-delete-warning">
            <i className="pi pi-exclamation-triangle" />
            <p>
              Make sure this backup is no longer needed before deleting it.
              Folder deletion will also remove files inside that folder.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}