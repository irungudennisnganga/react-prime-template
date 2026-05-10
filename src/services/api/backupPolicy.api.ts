import axios from "axios";
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

export type SignedAgentBackupURL = {
  method: "GET" | "DELETE" | string;
  url: string;
  agent_ip?: string;
  agent_id?: string;
  expires_at?: number;
  action?: "download" | "delete" | "list" | "file" | string;
};

export type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

function normalizeBackupId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.$oid || value.Hex || value.hex || "";
  return String(value);
}

function normalizeText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function normalizeBackupPolicy(raw: any): BackupPolicy {
  const id =
    normalizeBackupId(raw.id) ||
    normalizeBackupId(raw._id) ||
    normalizeBackupId(raw.ID);

  return {
    ...raw,
    id,
    _id: id,
    tenant_id: normalizeBackupId(raw.tenant_id) || normalizeBackupId(raw.TenantID),
    agent_id: normalizeBackupId(raw.agent_id) || normalizeBackupId(raw.AgentID),
    service_id: normalizeBackupId(raw.service_id) || normalizeBackupId(raw.ServiceID),
    name: raw.name || raw.Name || "",
    service_name: raw.service_name || raw.ServiceName || "",
    service_type: raw.service_type || raw.ServiceType || "",
    status: raw.status || raw.Status || "enabled",
    schedule: raw.schedule || raw.Schedule || "",
    compression: raw.compression || raw.Compression || "zip",

    archive_password_enabled:
      typeof raw.archive_password_enabled === "boolean"
        ? raw.archive_password_enabled
        : Boolean(raw.ArchivePasswordEnabled),

    archive_password_vault_key:
      raw.archive_password_vault_key || raw.ArchivePasswordVaultKey || "",

    local_path: raw.local_path || raw.LocalPath || "",
    storage_type: raw.storage_type || raw.StorageType || "local",

    rsync_enabled:
      typeof raw.rsync_enabled === "boolean"
        ? raw.rsync_enabled
        : Boolean(raw.RsyncEnabled),

    rsync_host: raw.rsync_host || raw.RsyncHost || "",
    rsync_port: Number(raw.rsync_port || raw.RsyncPort || 22),
    rsync_user: raw.rsync_user || raw.RsyncUser || "",
    rsync_path: raw.rsync_path || raw.RsyncPath || "",
    rsync_vault_key: raw.rsync_vault_key || raw.RsyncVaultKey || "",

    rclone_enabled:
      typeof raw.rclone_enabled === "boolean"
        ? raw.rclone_enabled
        : Boolean(raw.RcloneEnabled),

    rclone_remote: raw.rclone_remote || raw.RcloneRemote || "",
    rclone_path: raw.rclone_path || raw.RclonePath || "",
    rclone_vault_key: raw.rclone_vault_key || raw.RcloneVaultKey || "",

    retention_days: Number(raw.retention_days || raw.RetentionDays || 14),

    auto_install_tools:
      typeof raw.auto_install_tools === "boolean"
        ? raw.auto_install_tools
        : Boolean(raw.AutoInstallTools),

    install_strategy: raw.install_strategy || raw.InstallStrategy || "report_only",
    required_tools: raw.required_tools || raw.RequiredTools || [],

    last_tool_check_at: raw.last_tool_check_at || raw.LastToolCheckAt || "",
    last_tool_check_status: raw.last_tool_check_status || raw.LastToolCheckStatus || "",
    last_tool_check_error: raw.last_tool_check_error || raw.LastToolCheckError || "",

    last_run_at: raw.last_run_at || raw.LastRunAt || "",
    last_status: raw.last_status || raw.LastStatus || "",
    last_error: raw.last_error || raw.LastError || "",

    created_at: raw.created_at || raw.CreatedAt || "",
    updated_at: raw.updated_at || raw.UpdatedAt || "",
  };
}

export function normalizeBackupLog(raw: any): BackupLog {
  const id =
    normalizeBackupId(raw.id) ||
    normalizeBackupId(raw._id) ||
    normalizeBackupId(raw.ID);

  return {
    ...raw,
    id,
    _id: id,
    tenant_id: normalizeBackupId(raw.tenant_id) || normalizeBackupId(raw.TenantID),
    agent_id: normalizeBackupId(raw.agent_id) || normalizeBackupId(raw.AgentID),
    service_id: normalizeBackupId(raw.service_id) || normalizeBackupId(raw.ServiceID),
    policy_id: normalizeBackupId(raw.policy_id) || normalizeBackupId(raw.PolicyID),

    service_name: raw.service_name || raw.ServiceName || "",
    service_type: raw.service_type || raw.ServiceType || "",
    status: raw.status || raw.Status || "",

    started_at: raw.started_at || raw.StartedAt || "",
    finished_at: raw.finished_at || raw.FinishedAt || "",
    duration_seconds: Number(raw.duration_seconds || raw.DurationSeconds || 0),

    file_name: raw.file_name || raw.FileName || "",
    file_size_bytes: Number(raw.file_size_bytes || raw.FileSizeBytes || 0),

    local_path: raw.local_path || raw.LocalPath || "",
    relative_path: raw.relative_path || raw.RelativePath || "",
    path: raw.path || raw.Path || "",

    rsync_synced:
      typeof raw.rsync_synced === "boolean"
        ? raw.rsync_synced
        : Boolean(raw.RsyncSynced),

    rsync_path: raw.rsync_path || raw.RsyncPath || "",

    rclone_synced:
      typeof raw.rclone_synced === "boolean"
        ? raw.rclone_synced
        : Boolean(raw.RcloneSynced),

    rclone_path: raw.rclone_path || raw.RclonePath || "",
    error_message: raw.error_message || raw.ErrorMessage || "",
    created_at: raw.created_at || raw.CreatedAt || "",
  };
}

export function normalizeLocalBackupFile(raw: any): LocalBackupFile {
  return {
    file_name: raw.file_name || raw.FileName || "",
    service_name: raw.service_name || raw.ServiceName || "",
    service_type: raw.service_type || raw.ServiceType || "",
    size_bytes: Number(raw.size_bytes || raw.SizeBytes || 0),
    size_human: raw.size_human || raw.SizeHuman || "",
    path: raw.path || raw.Path || "",
    relative_path: raw.relative_path || raw.RelativePath || "",
    base_path: raw.base_path || raw.BasePath || "",
    modified_at: raw.modified_at || raw.ModifiedAt || "",
    modified_at_iso: raw.modified_at_iso || raw.ModifiedAtISO || "",
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

export function getBackupLogDownloadPath(log: BackupLog): string {
  const path = normalizeText(log.local_path || log.path || log.relative_path);
  return path.replaceAll("\\", "/");
}

export function getBackupFileDownloadPath(file: LocalBackupFile): string {
  const path = normalizeText(file.path || file.relative_path);
  return path.replaceAll("\\", "/");
}

export const backupPolicyApi = {
  create: async (
    payload: CreateBackupPolicyPayload
  ): Promise<ApiResponse<BackupPolicy>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/backup-policies/create",
      payload
    );

    return {
      ...response.data,
      data: normalizeBackupPolicy(response.data.data),
    };
  },

  view: async (): Promise<BackupPolicy[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      "/backup-policies/view"
    );

    return (response.data.data || []).map(normalizeBackupPolicy);
  },

  details: async (id: string): Promise<BackupPolicy> => {
    const response = await apiClient.get<ApiResponse<any>>(
      "/backup-policies/details",
      {
        params: { id },
      }
    );

    return normalizeBackupPolicy(response.data.data);
  },

  logs: async (
    policyId?: string
  ): Promise<{
    logs: BackupLog[];
  }> => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      "/backup-policies/logs",
      {
        params: policyId ? { policy_id: policyId } : {},
      }
    );

    return {
      logs: (response.data.data || []).map(normalizeBackupLog),
    };
  },

  runNow: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/backup-policies/run-now",
      { id }
    );

    return response.data;
  },

  disable: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/backup-policies/disable",
      { id }
    );

    return response.data;
  },

  enable: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      "/backup-policies/enable",
      { id }
    );

    return response.data;
  },

  /**
   * Backend signs a short-lived URL for the selected policy + file path.
   * The frontend does not know the agent secret.
   */
  signedAgentURL: async (payload: {
    policy_id: string;
    action: "download" | "delete" | "list" | "file";
    path?: string;
  }): Promise<SignedAgentBackupURL> => {
    const response = await apiClient.get<ApiResponse<SignedAgentBackupURL>>(
      "/backup-policies/signed-agent-url",
      {
        params: payload,
      }
    );

    return response.data.data;
  },

  /**
   * Secure download:
   * 1. Ask backend for signed URL.
   * 2. Download from signed agent URL.
   */
  downloadFile: async (
    policyId: string,
    path: string,
    fallbackFileName?: string
  ): Promise<void> => {
    const cleanPath = normalizeText(path).replaceAll("\\", "/");

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup file path is required");
    }

    const signed = await backupPolicyApi.signedAgentURL({
      policy_id: policyId,
      action: "download",
      path: cleanPath,
    });

    if (!signed?.url) {
      throw new Error("Signed download URL was not returned by backend");
    }

    const response = await axios.get(signed.url, {
      responseType: "blob",
      timeout: 120000,
    });

    const blob = new Blob([response.data], {
      type: response.headers["content-type"] || "application/octet-stream",
    });

    const headerFileName = getFileNameFromContentDisposition(
      response.headers["content-disposition"]
    );

    saveBlobToDisk(blob, headerFileName || fallbackFileName || "backup-file");
  },

  /**
   * Secure delete:
   * 1. Ask backend for signed DELETE URL.
   * 2. Send DELETE to signed agent URL.
   */
  deleteFile: async (policyId: string, path: string): Promise<any> => {
    const cleanPath = normalizeText(path).replaceAll("\\", "/");

    if (!policyId) {
      throw new Error("Backup policy ID is required");
    }

    if (!cleanPath) {
      throw new Error("Backup file path is required");
    }

    const signed = await backupPolicyApi.signedAgentURL({
      policy_id: policyId,
      action: "delete",
      path: cleanPath,
    });

    if (!signed?.url) {
      throw new Error("Signed delete URL was not returned by backend");
    }

    const response = await axios.delete(signed.url, {
      timeout: 120000,
    });

    return response.data;
  },

  /**
   * Optional secure list from agent through signed URL.
   */
  listFiles: async (policyId: string): Promise<LocalBackupFile[]> => {
    const signed = await backupPolicyApi.signedAgentURL({
      policy_id: policyId,
      action: "list",
    });

    if (!signed?.url) {
      throw new Error("Signed list URL was not returned by backend");
    }

    const response = await axios.get(signed.url, {
      timeout: 120000,
    });

    const data = response.data?.data || response.data?.files || response.data || [];

    return Array.isArray(data) ? data.map(normalizeLocalBackupFile) : [];
  },
};