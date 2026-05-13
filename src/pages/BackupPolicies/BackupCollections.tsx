import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import "./BackupPolicies.css";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import {
  AgentBackupStorageSummary,
  AgentBackupTreeItem,
  BackupPolicy,
  backupPolicyApi,
  formatBackupBytes,
  getBackupTreeItemName,
} from "../../services/api";

type DeleteTarget = {
  policyId: string;
  item: AgentBackupTreeItem;
};

function normalizeText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizePath(value: any): string {
  return normalizeText(value).replaceAll("\\", "/");
}

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function getTreePath(item: AgentBackupTreeItem): string {
  return normalizePath(item.path || item.relative_path);
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
      const path = getTreePath(item).toLowerCase();
      const serviceName = normalizeText(item.service_name).toLowerCase();
      const serviceType = normalizeText(item.service_type).toLowerCase();

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

function CollectionTreeRow(props: {
  policyId: string;
  item: AgentBackupTreeItem;
  level: number;
  expandedPaths: Record<string, boolean>;
  downloadingPath: string;
  deletingPath: string;
  onToggle: (item: AgentBackupTreeItem) => void;
  onDownload: (policyId: string, item: AgentBackupTreeItem) => void;
  onDelete: (policyId: string, item: AgentBackupTreeItem) => void;
}) {
  const {
    policyId,
    item,
    level,
    expandedPaths,
    downloadingPath,
    deletingPath,
    onToggle,
    onDownload,
    onDelete,
  } = props;

  const path = getTreePath(item);
  const isDirectory = item.type === "directory";
  const isFile = item.type === "file";
  const hasChildren = Boolean(item.children?.length);
  const expanded = Boolean(expandedPaths[path]);

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
              <small>{item.relative_path || path}</small>
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
              onClick={() => onDownload(policyId, item)}
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
              title="Delete backup"
              onClick={() => onDelete(policyId, item)}
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
            <CollectionTreeRow
              key={`${policyId}-${child.path || child.relative_path}-${level + 1}`}
              policyId={policyId}
              item={child}
              level={level + 1}
              expandedPaths={expandedPaths}
              downloadingPath={downloadingPath}
              deletingPath={deletingPath}
              onToggle={onToggle}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))
        : null}
    </>
  );
}

export default function BackupCollections() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [policies, setPolicies] = useState<BackupPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [storage, setStorage] = useState<AgentBackupStorageSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [downloadingPath, setDownloadingPath] = useState("");
  const [deletingPath, setDeletingPath] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const selectedPolicy = useMemo(() => {
    return policies.find((policy) => policy.id === selectedPolicyId) || null;
  }, [policies, selectedPolicyId]);

  const visibleItems = useMemo(() => {
    return searchTree(storage?.items || [], searchTerm);
  }, [storage, searchTerm]);

  const flatItems = useMemo(() => {
    return flattenTree(storage?.items || []);
  }, [storage]);

  const totals = useMemo(() => {
    const files = flatItems.filter((item) => item.type === "file");
    const folders = flatItems.filter((item) => item.type === "directory");

    const sizeBytes = files.reduce((sum, item) => {
      return sum + Number(item.size_bytes || 0);
    }, 0);

    return {
      files: files.length,
      folders: folders.length,
      sizeBytes,
      sizeHuman: formatBackupBytes(sizeBytes),
    };
  }, [flatItems]);

  const loadPolicies = async () => {
    try {
      setLoading(true);

      const response = await backupPolicyApi.view();
      const activePolicies = (response || []).filter((policy) => {
        return String(policy.status || "enabled").toLowerCase() !== "disabled";
      });

      setPolicies(activePolicies);

      if (activePolicies.length && !selectedPolicyId) {
        setSelectedPolicyId(activePolicies[0].id);
        await loadStorage(activePolicies[0].id);
      }
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load policies",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not load backup policies."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStorage = async (policyId = selectedPolicyId) => {
    if (!policyId) return;

    try {
      setStorageLoading(true);

      const summary = await backupPolicyApi.listAgentStorage(policyId);
      setStorage(summary);

      const nextExpanded: Record<string, boolean> = {};

      flattenTree(summary.items || []).forEach((item) => {
        const path = getTreePath(item);

        if (path && item.type === "directory") {
          nextExpanded[path] = true;
        }
      });

      setExpandedPaths(nextExpanded);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load backup folders",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not load agent backup folders."
      );
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePolicyChange = async (policyId: string) => {
    setSelectedPolicyId(policyId);
    setSearchTerm("");
    await loadStorage(policyId);
  };

  const toggleTreeItem = (item: AgentBackupTreeItem) => {
    const path = getTreePath(item);

    if (!path) return;

    setExpandedPaths((current) => ({
      ...current,
      [path]: !current[path],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};

    flatItems.forEach((item) => {
      const path = getTreePath(item);

      if (path && item.type === "directory") {
        next[path] = true;
      }
    });

    setExpandedPaths(next);
  };

  const collapseAll = () => {
    setExpandedPaths({});
  };

  const handleDownload = async (policyId: string, item: AgentBackupTreeItem) => {
    const path = getTreePath(item);

    if (item.type !== "file") {
      showToast("info", "Download unavailable", "Only files can be downloaded.");
      return;
    }

    if (!path) {
      showToast("error", "Download failed", "Backup file path is missing.");
      return;
    }

    try {
      setDownloadingPath(path);

      await backupPolicyApi.downloadFile(
        policyId,
        path,
        getBackupTreeItemName(item)
      );

      showToast("success", "Download started", getBackupTreeItemName(item));
    } catch (error: any) {
      showToast(
        "error",
        "Download failed",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not download backup file."
      );
    } finally {
      setDownloadingPath("");
    }
  };

  const openDeleteDialog = (policyId: string, item: AgentBackupTreeItem) => {
    setDeleteTarget({
      policyId,
      item,
    });
    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deletingPath) return;

    setDeleteTarget(null);
    setDeleteDialogVisible(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const path = getTreePath(deleteTarget.item);

    if (!path) {
      showToast("error", "Delete failed", "Backup path is missing.");
      return;
    }

    try {
      setDeletingPath(path);

      await backupPolicyApi.deleteFile(deleteTarget.policyId, path);

      showToast(
        "success",
        deleteTarget.item.type === "directory"
          ? "Backup folder deleted"
          : "Backup file deleted",
        `${getBackupTreeItemName(deleteTarget.item)} has been deleted successfully.`
      );

      setDeleteDialogVisible(false);
      setDeleteTarget(null);

      await loadStorage(deleteTarget.policyId);
    } catch (error: any) {
      showToast(
        "error",
        "Delete failed",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Could not delete backup."
      );
    } finally {
      setDeletingPath("");
    }
  };

  const deletePath = deleteTarget ? getTreePath(deleteTarget.item) : "";
  const deleteName = deleteTarget ? getBackupTreeItemName(deleteTarget.item) : "";

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

          <span className="backup-eyebrow">Backup Collections</span>

          <h1>Backup Collections</h1>

          <p>
            View all backup folders and files returned from the agent storage.
            This page is not grouped by service.
          </p>
        </div>

        <div className="backup-hero-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => loadStorage()}
            disabled={storageLoading || !selectedPolicyId}
          >
            <i
              className={
                storageLoading ? "pi pi-spin pi-spinner" : "pi pi-refresh"
              }
            />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader message="Loading backup collections..." />
      ) : (
        <>
          <div className="backup-stats-grid">
            <div className="backup-stat-card purple">
              <span>Total Size</span>
              <strong>{storage?.total_size_human || totals.sizeHuman}</strong>
              <small>All returned backup files</small>
            </div>

            <div className="backup-stat-card green">
              <span>Files</span>
              <strong>{storage?.total_files || totals.files}</strong>
              <small>Physical backup files</small>
            </div>

            <div className="backup-stat-card blue">
              <span>Folders</span>
              <strong>{storage?.total_folders || totals.folders}</strong>
              <small>Backup directories</small>
            </div>

            <div className="backup-stat-card red">
              <span>Policies</span>
              <strong>{policies.length}</strong>
              <small>Available backup policies</small>
            </div>
          </div>

          <section className="backup-card">
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
                  onClick={() => loadStorage()}
                  disabled={storageLoading || !selectedPolicyId}
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

            {selectedPolicy ? (
              <div className="backup-card-header small">
                <div>
                  <h2>All Agent Backup Folders</h2>
                  <p>
                    Source policy: {selectedPolicy.name} · Local path:{" "}
                    {selectedPolicy.local_path || "—"}
                  </p>
                </div>

                <span>{formatDate(storage?.scanned_at_iso)}</span>
              </div>
            ) : null}

            {storageLoading && !storage ? (
              <PageLoader message="Loading backup folders..." />
            ) : !visibleItems.length ? (
              <div className="empty-state compact">
                <i className="pi pi-folder-open" />
                <h3>No backup folders found</h3>
                <p>No folders or files were returned from the agent.</p>
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
                    {visibleItems.map((item) => (
                      <CollectionTreeRow
                        key={`${selectedPolicyId}-${item.path || item.relative_path}`}
                        policyId={selectedPolicyId}
                        item={item}
                        level={0}
                        expandedPaths={expandedPaths}
                        downloadingPath={downloadingPath}
                        deletingPath={deletingPath}
                        onToggle={toggleTreeItem}
                        onDownload={handleDownload}
                        onDelete={openDeleteDialog}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
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
                {deleteTarget?.item.type === "directory"
                  ? "backup folder"
                  : "backup file"}
                ?
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
                  Delete
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
            <p>Folder deletion will also remove files inside that folder.</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}