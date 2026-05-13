import { apiClient } from "./http";

export type BackupPolicyStatus = "enabled" | "disabled" | string;
export type BackupCompression = "zip" | "gzip" | string;
export type BackupStorageType = "local" | "rsync" | "rclone" | string;
export type BackupInstallStrategy = "report_only" | "apt" | "auto" | string;

export type BackupPolicy = {
  id: string;
  _id?: string;

  tenant_id?: string;
  agent_id: string;
  service_id: string;

  name: string;
  service_name?: string;
  service_type?: string;

  status?: BackupPolicyStatus;
  enabled?: boolean;

  schedule: string;
  compression: BackupCompression;

  archive_password_enabled?: boolean;
  archive_password_vault_key?: string;

  local_path?: string;
  storage_type?: BackupStorageType;

  rsync_enabled?: boolean;
  rsync_host?: string;
  rsync_port?: number;
  rsync_user?: string;
  rsync_path?: string;
  rsync_vault_key?: string;

  rclone_enabled?: boolean;
  rclone_remote?: string;
  rclone_path?: string;
  rclone_vault_key?: string;

  retention_days?: number;

  auto_install_tools?: boolean;
  install_strategy?: BackupInstallStrategy;
  required_tools?: string[];

  last_tool_check_at?: string;
  last_tool_check_status?: string;
  last_tool_check_error?: string;

  last_run_at?: string;
  last_status?: string;
  last_error?: string;

  created_at?: string;
  updated_at?: string;
};

export type CreateBackupPolicyPayload = {
  agent_id: string;
  service_id: string;

  name: string;
  schedule: string;
  compression: BackupCompression;

  archive_password_enabled?: boolean;
  archive_password?: string;

  local_path?: string;
  storage_type?: BackupStorageType;

  rsync_enabled?: boolean;
  rsync_host?: string;
  rsync_port?: number;
  rsync_user?: string;
  rsync_path?: string;
  rsync_private_key?: string;

  rclone_enabled?: boolean;
  rclone_remote?: string;
  rclone_path?: string;
  rclone_config?: string;

  retention_days?: number;

  auto_install_tools?: boolean;
  install_strategy?: BackupInstallStrategy;
};

export type BackupLog = {
  id: string;
  _id?: string;

  tenant_id?: string;
  agent_id?: string;
  service_id?: string;
  policy_id?: string;

  service_name?: string;
  service_type?: string;
  status?: string;

  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;

  file_name?: string;
  file_size_bytes?: number;

  local_path?: string;
  relative_path?: string;
  path?: string;

  rsync_synced?: boolean;
  rsync_path?: string;

  rclone_synced?: boolean;
  rclone_path?: string;

  error_message?: string;
  created_at?: string;
};

export type LocalBackupFile = {
  file_name: string;
  service_name?: string;
  service_type?: string;
  size_bytes?: number;
  size_human?: string;
  path?: string;
  relative_path: string;
  base_path?: string;
  modified_at?: string;
  modified_at_iso?: string;
};

export type AgentBackupTreeItem = {
  name: string;
  file_name: string;
  service_name?: string;
  service_type?: string;
  type: "file" | "directory" | string;
  size_bytes: number;
  size_human?: string;
  path: string;
  relative_path: string;
  base_path?: string;
  modified_at?: string;
  modified_at_iso?: string;
  children?: AgentBackupTreeItem[];
};

export type AgentBackupStorageSummary = {
  root_paths: string[];
  total_size_bytes: number;
  total_size_human?: string;
  total_files: number;
  total_folders: number;
  scanned_at?: string;
  scanned_at_iso?: string;
  items: AgentBackupTreeItem[];
};

export type BackupPolicyApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

function normalizeBackupId(value: any): string {
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
  return normalizeText(value).replaceAll("\\", "/");
}

function extractPayload(responseData: any): any {
  return responseData?.data || responseData || {};
}

function extractListPayload(responseData: any): any {
  const payload = extractPayload(responseData);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.items)) return payload;

  return payload;
}

function getHeaderValue(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join("; ");
  }

  if (value === undefined || value === null) return "";

  return String(value);
}

export function normalizeBackupPolicy(raw: any): BackupPolicy {
  const safeRaw = raw || {};

  const id =
    normalizeBackupId(safeRaw?.id) ||
    normalizeBackupId(safeRaw?._id) ||
    normalizeBackupId(safeRaw?.ID);

  const rawStatus = safeRaw?.status || safeRaw?.Status || "";
  const rawEnabled = safeRaw?.enabled ?? safeRaw?.Enabled;

  const status =
    String(rawStatus || "").trim().toLowerCase() === "disabled"
      ? "disabled"
      : "enabled";

  const enabled =
    typeof rawEnabled === "boolean" ? rawEnabled : status !== "disabled";

  return {
    ...safeRaw,
    id,
    _id: id,

    tenant_id:
      normalizeBackupId(safeRaw?.tenant_id) ||
      normalizeBackupId(safeRaw?.TenantID),

    agent_id:
      normalizeBackupId(safeRaw?.agent_id) ||
      normalizeBackupId(safeRaw?.AgentID),

    service_id:
      normalizeBackupId(safeRaw?.service_id) ||
      normalizeBackupId(safeRaw?.ServiceID),

    name: safeRaw?.name || safeRaw?.Name || "",
    service_name: safeRaw?.service_name || safeRaw?.ServiceName || "",
    service_type: safeRaw?.service_type || safeRaw?.ServiceType || "",

    status,
    enabled,

    schedule: safeRaw?.schedule || safeRaw?.Schedule || "",
    compression: safeRaw?.compression || safeRaw?.Compression || "zip",

    archive_password_enabled:
      typeof safeRaw?.archive_password_enabled === "boolean"
        ? safeRaw.archive_password_enabled
        : Boolean(safeRaw?.ArchivePasswordEnabled),

    archive_password_vault_key:
      safeRaw?.archive_password_vault_key ||
      safeRaw?.ArchivePasswordVaultKey ||
      "",

    local_path: safeRaw?.local_path || safeRaw?.LocalPath || "",
    storage_type: safeRaw?.storage_type || safeRaw?.StorageType || "local",

    rsync_enabled:
      typeof safeRaw?.rsync_enabled === "boolean"
        ? safeRaw.rsync_enabled
        : Boolean(safeRaw?.RsyncEnabled),

    rsync_host: safeRaw?.rsync_host || safeRaw?.RsyncHost || "",
    rsync_port: Number(safeRaw?.rsync_port || safeRaw?.RsyncPort || 22),
    rsync_user: safeRaw?.rsync_user || safeRaw?.RsyncUser || "",
    rsync_path: safeRaw?.rsync_path || safeRaw?.RsyncPath || "",
    rsync_vault_key: safeRaw?.rsync_vault_key || safeRaw?.RsyncVaultKey || "",

    rclone_enabled:
      typeof safeRaw?.rclone_enabled === "boolean"
        ? safeRaw.rclone_enabled
        : Boolean(safeRaw?.RcloneEnabled),

    rclone_remote: safeRaw?.rclone_remote || safeRaw?.RcloneRemote || "",
    rclone_path: safeRaw?.rclone_path || safeRaw?.RclonePath || "",
    rclone_vault_key: safeRaw?.rclone_vault_key || safeRaw?.RcloneVaultKey || "",

    retention_days: Number(
      safeRaw?.retention_days || safeRaw?.RetentionDays || 14
    ),

    auto_install_tools:
      typeof safeRaw?.auto_install_tools === "boolean"
        ? safeRaw.auto_install_tools
        : Boolean(safeRaw?.AutoInstallTools),

    install_strategy:
      safeRaw?.install_strategy || safeRaw?.InstallStrategy || "report_only",

    required_tools: safeRaw?.required_tools || safeRaw?.RequiredTools || [],

    last_tool_check_at:
      safeRaw?.last_tool_check_at || safeRaw?.LastToolCheckAt || "",
    last_tool_check_status:
      safeRaw?.last_tool_check_status || safeRaw?.LastToolCheckStatus || "",
    last_tool_check_error:
      safeRaw?.last_tool_check_error || safeRaw?.LastToolCheckError || "",

    last_run_at: safeRaw?.last_run_at || safeRaw?.LastRunAt || "",
    last_status: safeRaw?.last_status || safeRaw?.LastStatus || "",
    last_error: safeRaw?.last_error || safeRaw?.LastError || "",

    created_at: safeRaw?.created_at || safeRaw?.CreatedAt || "",
    updated_at: safeRaw?.updated_at || safeRaw?.UpdatedAt || "",
  };
}

export function normalizeBackupLog(raw: any): BackupLog {
  const safeRaw = raw || {};

  const id =
    normalizeBackupId(safeRaw?.id) ||
    normalizeBackupId(safeRaw?._id) ||
    normalizeBackupId(safeRaw?.ID);

  return {
    ...safeRaw,
    id,
    _id: id,

    tenant_id:
      normalizeBackupId(safeRaw?.tenant_id) ||
      normalizeBackupId(safeRaw?.TenantID),

    agent_id:
      normalizeBackupId(safeRaw?.agent_id) ||
      normalizeBackupId(safeRaw?.AgentID),

    service_id:
      normalizeBackupId(safeRaw?.service_id) ||
      normalizeBackupId(safeRaw?.ServiceID),

    policy_id:
      normalizeBackupId(safeRaw?.policy_id) ||
      normalizeBackupId(safeRaw?.PolicyID),

    service_name: safeRaw?.service_name || safeRaw?.ServiceName || "",
    service_type: safeRaw?.service_type || safeRaw?.ServiceType || "",
    status: safeRaw?.status || safeRaw?.Status || "",

    started_at: safeRaw?.started_at || safeRaw?.StartedAt || "",
    finished_at: safeRaw?.finished_at || safeRaw?.FinishedAt || "",
    duration_seconds: Number(
      safeRaw?.duration_seconds || safeRaw?.DurationSeconds || 0
    ),

    file_name: safeRaw?.file_name || safeRaw?.FileName || "",
    file_size_bytes: Number(
      safeRaw?.file_size_bytes || safeRaw?.FileSizeBytes || 0
    ),

    local_path: safeRaw?.local_path || safeRaw?.LocalPath || "",
    relative_path: safeRaw?.relative_path || safeRaw?.RelativePath || "",
    path: safeRaw?.path || safeRaw?.Path || "",

    rsync_synced:
      typeof safeRaw?.rsync_synced === "boolean"
        ? safeRaw.rsync_synced
        : Boolean(safeRaw?.RsyncSynced),

    rsync_path: safeRaw?.rsync_path || safeRaw?.RsyncPath || "",

    rclone_synced:
      typeof safeRaw?.rclone_synced === "boolean"
        ? safeRaw.rclone_synced
        : Boolean(safeRaw?.RcloneSynced),

    rclone_path: safeRaw?.rclone_path || safeRaw?.RclonePath || "",

    error_message: safeRaw?.error_message || safeRaw?.ErrorMessage || "",
    created_at: safeRaw?.created_at || safeRaw?.CreatedAt || "",
  };
}

export function normalizeLocalBackupFile(raw: any): LocalBackupFile {
  const safeRaw = raw || {};

  return {
    file_name:
      safeRaw?.file_name || safeRaw?.FileName || safeRaw?.name || safeRaw?.Name || "",
    service_name: safeRaw?.service_name || safeRaw?.ServiceName || "",
    service_type: safeRaw?.service_type || safeRaw?.ServiceType || "",
    size_bytes: Number(safeRaw?.size_bytes || safeRaw?.SizeBytes || 0),
    size_human: safeRaw?.size_human || safeRaw?.SizeHuman || "",
    path: safeRaw?.path || safeRaw?.Path || "",
    relative_path: safeRaw?.relative_path || safeRaw?.RelativePath || "",
    base_path: safeRaw?.base_path || safeRaw?.BasePath || "",
    modified_at: safeRaw?.modified_at || safeRaw?.ModifiedAt || "",
    modified_at_iso: safeRaw?.modified_at_iso || safeRaw?.ModifiedAtISO || "",
  };
}

export function normalizeAgentBackupTreeItem(raw: any): AgentBackupTreeItem {
  const safeRaw = raw || {};

  const children = Array.isArray(safeRaw?.children)
    ? safeRaw.children.map(normalizeAgentBackupTreeItem)
    : Array.isArray(safeRaw?.Children)
      ? safeRaw.Children.map(normalizeAgentBackupTreeItem)
      : [];

  return {
    name:
      safeRaw?.name ||
      safeRaw?.Name ||
      safeRaw?.file_name ||
      safeRaw?.FileName ||
      "",
    file_name:
      safeRaw?.file_name ||
      safeRaw?.FileName ||
      safeRaw?.name ||
      safeRaw?.Name ||
      "",
    service_name: safeRaw?.service_name || safeRaw?.ServiceName || "",
    service_type: safeRaw?.service_type || safeRaw?.ServiceType || "",
    type: safeRaw?.type || safeRaw?.Type || "file",
    size_bytes: Number(safeRaw?.size_bytes || safeRaw?.SizeBytes || 0),
    size_human: safeRaw?.size_human || safeRaw?.SizeHuman || "",
    path: safeRaw?.path || safeRaw?.Path || "",
    relative_path: safeRaw?.relative_path || safeRaw?.RelativePath || "",
    base_path: safeRaw?.base_path || safeRaw?.BasePath || "",
    modified_at: safeRaw?.modified_at || safeRaw?.ModifiedAt || "",
    modified_at_iso: safeRaw?.modified_at_iso || safeRaw?.ModifiedAtISO || "",
    children,
  };
}

export function normalizeAgentBackupStorageSummary(
  raw: any
): AgentBackupStorageSummary {
  const safeRaw = raw || {};

  return {
    root_paths: Array.isArray(safeRaw?.root_paths)
      ? safeRaw.root_paths
      : Array.isArray(safeRaw?.RootPaths)
        ? safeRaw.RootPaths
        : [],

    total_size_bytes: Number(
      safeRaw?.total_size_bytes || safeRaw?.TotalSizeBytes || 0
    ),
    total_size_human:
      safeRaw?.total_size_human || safeRaw?.TotalSizeHuman || "",

    total_files: Number(safeRaw?.total_files || safeRaw?.TotalFiles || 0),
    total_folders: Number(safeRaw?.total_folders || safeRaw?.TotalFolders || 0),

    scanned_at: safeRaw?.scanned_at || safeRaw?.ScannedAt || "",
    scanned_at_iso: safeRaw?.scanned_at_iso || safeRaw?.ScannedAtISO || "",

    items: Array.isArray(safeRaw?.items)
      ? safeRaw.items.map(normalizeAgentBackupTreeItem)
      : Array.isArray(safeRaw?.Items)
        ? safeRaw.Items.map(normalizeAgentBackupTreeItem)
        : [],
  };
}

function getFileNameFromContentDisposition(header?: string): string {
  if (!header) return "";

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }

  const normalMatch = header.match(/filename="?([^"]+)"?/i);

  if (normalMatch?.[1]) {
    return normalMatch[1].replace(/"/g, "");
  }

  return "";
}

function saveBlobToDisk(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "backup-file";

  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}

export function formatBackupBytes(bytes?: number): string {
  const value = Number(bytes || 0);

  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getBackupLogDownloadPath(log: BackupLog): string {
  return normalizePath(log.local_path || log.path || log.relative_path);
}

export function getBackupFileDownloadPath(
  file: LocalBackupFile | AgentBackupTreeItem
): string {
  return normalizePath(file.path || file.relative_path);
}

export function getBackupTreeItemName(item: AgentBackupTreeItem): string {
  return (
    normalizeText(item.file_name) ||
    normalizeText(item.name) ||
    normalizeText(item.relative_path) ||
    "backup-item"
  );
}

export const backupPolicyApi = {
  create: async (
    payload: CreateBackupPolicyPayload
  ): Promise<BackupPolicyApiResponse<BackupPolicy>> => {
    const response = await apiClient.post<BackupPolicyApiResponse<any>>(
      "/backup-policies/create",
      payload
    );

    return {
      ...response.data,
      data: normalizeBackupPolicy(response.data?.data),
    };
  },

  view: async (): Promise<BackupPolicy[]> => {
    const response = await apiClient.get<BackupPolicyApiResponse<any[]>>(
      "/backup-policies/view"
    );

    return (response.data?.data || []).map(normalizeBackupPolicy);
  },

  details: async (id: string): Promise<BackupPolicy> => {
    const response = await apiClient.get<BackupPolicyApiResponse<any>>(
      "/backup-policies/details",
      {
        params: { id },
      }
    );

    return normalizeBackupPolicy(response.data?.data);
  },

  logs: async (
    policyId?: string
  ): Promise<{
    logs: BackupLog[];
  }> => {
    const response = await apiClient.get<BackupPolicyApiResponse<any[]>>(
      "/backup-policies/logs",
      {
        params: policyId ? { policy_id: policyId } : {},
      }
    );

    return {
      logs: (response.data?.data || []).map(normalizeBackupLog),
    };
  },

  runNow: async (id: string): Promise<BackupPolicyApiResponse<any>> => {
    const response = await apiClient.post<BackupPolicyApiResponse<any>>(
      "/backup-policies/run-now",
      { id }
    );

    return response.data;
  },

  enable: async (id: string): Promise<BackupPolicyApiResponse<any>> => {
    const response = await apiClient.post<BackupPolicyApiResponse<any>>(
      "/backup-policies/enable",
      {
        id,
        policy_id: id,
      }
    );

    return response.data;
  },

  disable: async (id: string): Promise<BackupPolicyApiResponse<any>> => {
    const response = await apiClient.post<BackupPolicyApiResponse<any>>(
      "/backup-policies/disable",
      {
        id,
        policy_id: id,
      }
    );

    return response.data;
  },

  updateStatus: async (
    id: string,
    status: "enabled" | "disabled"
  ): Promise<BackupPolicyApiResponse<any>> => {
    if (status === "enabled") {
      return backupPolicyApi.enable(id);
    }

    return backupPolicyApi.disable(id);
  },

  listAgentStorage: async (
    policyId: string
  ): Promise<AgentBackupStorageSummary> => {
    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    const response = await apiClient.get<BackupPolicyApiResponse<any>>(
      "/backup-policies/agent-files/list",
      {
        params: {
          policy_id: policyId,
        },
        timeout: 120000,
      }
    );

    const payload = extractPayload(response.data);

    return normalizeAgentBackupStorageSummary(payload);
  },

  listFiles: async (policyId: string): Promise<LocalBackupFile[]> => {
    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    const response = await apiClient.get<BackupPolicyApiResponse<any>>(
      "/backup-policies/agent-files/list",
      {
        params: {
          policy_id: policyId,
        },
        timeout: 120000,
      }
    );

    const payload = extractListPayload(response.data);

    if (Array.isArray(payload)) {
      return payload.map(normalizeLocalBackupFile);
    }

    if (Array.isArray(payload?.files)) {
      return payload.files.map(normalizeLocalBackupFile);
    }

    if (Array.isArray(payload?.items)) {
      const flatFiles: LocalBackupFile[] = [];

      const walk = (items: AgentBackupTreeItem[]) => {
        items.forEach((item) => {
          if (item.type === "file") {
            flatFiles.push(normalizeLocalBackupFile(item));
          }

          if (Array.isArray(item.children) && item.children.length) {
            walk(item.children);
          }
        });
      };

      walk(payload.items.map(normalizeAgentBackupTreeItem));

      return flatFiles;
    }

    return [];
  },

  getAgentFileDetails: async (
    policyId: string,
    path: string
  ): Promise<AgentBackupTreeItem> => {
    const cleanPath = normalizePath(path);

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup path is required");
    }

    const response = await apiClient.get<BackupPolicyApiResponse<any>>(
      "/backup-policies/agent-files/details",
      {
        params: {
          policy_id: policyId,
          path: cleanPath,
        },
        timeout: 120000,
      }
    );

    return normalizeAgentBackupTreeItem(response.data?.data || {});
  },

  downloadFile: async (
    policyId: string,
    path: string,
    fallbackFileName?: string
  ): Promise<void> => {
    const cleanPath = normalizePath(path);

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup file path is required");
    }

    const response = await apiClient.get<Blob>(
      "/backup-policies/agent-files/download",
      {
        params: {
          policy_id: policyId,
          path: cleanPath,
        },
        responseType: "blob",
        timeout: 120000,
      }
    );

    const contentType =
      getHeaderValue(response.headers["content-type"]) ||
      "application/octet-stream";

    const contentDisposition = getHeaderValue(
      response.headers["content-disposition"]
    );

    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: contentType,
          });

    const typedBlob =
      blob.type === contentType
        ? blob
        : new Blob([blob], {
            type: contentType,
          });

    const headerFileName =
      getFileNameFromContentDisposition(contentDisposition);

    saveBlobToDisk(typedBlob, headerFileName || fallbackFileName || "backup-file");
  },

  deleteLogByPath: async (policyId: string, path: string): Promise<any> => {
    const cleanPath = normalizePath(path);

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup path is required");
    }

    const response = await apiClient.delete("/backup-policies/logs/delete", {
      params: {
        policy_id: policyId,
        path: cleanPath,
      },
      timeout: 120000,
    });

    return response.data;
  },

  deleteFile: async (policyId: string, path: string): Promise<any> => {
    const cleanPath = normalizePath(path);

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup path is required");
    }

    const response = await apiClient.delete(
      "/backup-policies/agent-files/delete",
      {
        params: {
          policy_id: policyId,
          path: cleanPath,
        },
        timeout: 120000,
      }
    );

    return response.data;
  },
};