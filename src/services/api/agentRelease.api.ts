import { apiClient } from "./http";

export type AgentReleaseStatus = "active" | "inactive" | "draft" | string;

export type AgentReleaseChannel = "stable" | "beta" | "dev" | string;

export type AgentReleaseOS = "linux" | "windows" | "darwin" | string;

export type AgentReleaseArch = "amd64" | "arm64" | "386" | string;

export type AgentRelease = {
  id: string;
  _id?: string;

  version: string;

  os: AgentReleaseOS;
  arch: AgentReleaseArch;
  channel: AgentReleaseChannel;

  binary_path?: string;
  download_url: string;
  sha256: string;

  release_notes?: string;
  mandatory?: boolean;

  active?: boolean;
  is_active?: boolean;
  status?: AgentReleaseStatus;

  created_at?: string;
  updated_at?: string;

  /**
   * Backward-compatible frontend aliases.
   * These help older UI components keep working.
   */
  title?: string;
  description?: string;
  notes?: string;
  platform?: string;
  architecture?: string;
  file_url?: string;
  checksum?: string;
  activated_at?: string;
};

export type CreateAgentReleasePayload = {
  version: string;

  os: AgentReleaseOS;
  arch: AgentReleaseArch;
  channel: AgentReleaseChannel;

  binary_path?: string;
  download_url: string;
  sha256: string;

  release_notes?: string;
  mandatory?: boolean;
};

export type ActivateAgentReleasePayload = {
  id: string;
};

export type AgentReleaseApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

/**
 * Renamed from AgentService to avoid conflict with agentService.api.ts
 */
export type AgentReleaseService = {
  id: string;
  _id?: string;

  name?: string;
  agent_id?: string;
  service_name?: string;
  host?: string;
  status?: string;
  enabled?: boolean;

  version?: string;
  current_version?: string;
  target_version?: string;

  last_seen_at?: string;
  last_checked_at?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Renamed from AgentServiceLog to avoid conflict with agentService.api.ts
 */
export type AgentReleaseServiceLog = {
  id?: string;
  level?: string;
  message?: string;
  created_at?: string;
  timestamp?: string;
};

function normalizeId(value: any): string {
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

function normalizeBool(value: any): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value.toLowerCase() === "active";
  }

  return Boolean(value);
}

export function normalizeRelease(raw: any): AgentRelease {
  const safeRaw = raw || {};

  const id =
    normalizeId(safeRaw.id) ||
    normalizeId(safeRaw._id) ||
    normalizeId(safeRaw.ID);

  const active =
    typeof safeRaw.active === "boolean"
      ? safeRaw.active
      : typeof safeRaw.Active === "boolean"
        ? safeRaw.Active
        : typeof safeRaw.is_active === "boolean"
          ? safeRaw.is_active
          : typeof safeRaw.IsActive === "boolean"
            ? safeRaw.IsActive
            : safeRaw.status === "active";

  const version = normalizeText(safeRaw.version || safeRaw.Version);

  const os = normalizeText(
    safeRaw.os || safeRaw.OS || safeRaw.platform || safeRaw.Platform || "linux"
  ).toLowerCase();

  const arch = normalizeText(
    safeRaw.arch ||
      safeRaw.Arch ||
      safeRaw.architecture ||
      safeRaw.Architecture ||
      "amd64"
  ).toLowerCase();

  const channel = normalizeText(
    safeRaw.channel || safeRaw.Channel || "stable"
  ).toLowerCase();

  const binaryPath = normalizeText(safeRaw.binary_path || safeRaw.BinaryPath);

  const downloadUrl = normalizeText(
    safeRaw.download_url ||
      safeRaw.DownloadURL ||
      safeRaw.file_url ||
      safeRaw.FileURL
  );

  const sha256 = normalizeText(
    safeRaw.sha256 || safeRaw.SHA256 || safeRaw.checksum || safeRaw.Checksum
  ).toLowerCase();

  const releaseNotes = normalizeText(
    safeRaw.release_notes ||
      safeRaw.ReleaseNotes ||
      safeRaw.notes ||
      safeRaw.Notes ||
      safeRaw.description ||
      safeRaw.Description
  );

  const mandatory =
    typeof safeRaw.mandatory === "boolean"
      ? safeRaw.mandatory
      : typeof safeRaw.Mandatory === "boolean"
        ? safeRaw.Mandatory
        : normalizeBool(safeRaw.mandatory || safeRaw.Mandatory);

  const createdAt = normalizeText(safeRaw.created_at || safeRaw.CreatedAt);
  const updatedAt = normalizeText(safeRaw.updated_at || safeRaw.UpdatedAt);

  return {
    ...safeRaw,

    id,
    _id: id,

    version,

    os,
    arch,
    channel,

    binary_path: binaryPath,
    download_url: downloadUrl,
    sha256,

    release_notes: releaseNotes,
    mandatory,

    active,
    is_active: active,
    status: active ? "active" : "inactive",

    created_at: createdAt,
    updated_at: updatedAt,

    /**
     * Backward-compatible aliases for old UI code.
     */
    title: safeRaw.title || safeRaw.Title || `Agent ${version}`,
    description: releaseNotes,
    notes: releaseNotes,
    platform: os,
    architecture: arch,
    file_url: downloadUrl,
    checksum: sha256,
    activated_at: active ? updatedAt || createdAt : safeRaw.activated_at || "",
  };
}

function normalizeCreatePayload(
  payload: CreateAgentReleasePayload
): CreateAgentReleasePayload {
  return {
    version: normalizeText(payload.version),

    os: normalizeText(payload.os).toLowerCase(),
    arch: normalizeText(payload.arch).toLowerCase(),
    channel: normalizeText(payload.channel).toLowerCase(),

    binary_path: normalizeText(payload.binary_path),
    download_url: normalizeText(payload.download_url),
    sha256: normalizeText(payload.sha256).toLowerCase(),

    release_notes: normalizeText(payload.release_notes),
    mandatory: Boolean(payload.mandatory),
  };
}

export const agentReleasesApi = {
  create: async (
    payload: CreateAgentReleasePayload
  ): Promise<AgentReleaseApiResponse<AgentRelease>> => {
    const cleanPayload = normalizeCreatePayload(payload);

    const response = await apiClient.post<AgentReleaseApiResponse<any>>(
      "/agent-releases/create",
      cleanPayload
    );

    return {
      ...response.data,
      data: normalizeRelease(response.data?.data),
    };
  },

  view: async (): Promise<AgentReleaseApiResponse<AgentRelease[]>> => {
    const response = await apiClient.get<AgentReleaseApiResponse<any[]>>(
      "/agent-releases/view"
    );

    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeRelease)
        : [],
    };
  },

  details: async (id: string): Promise<AgentRelease> => {
    const response = await apiClient.get<AgentReleaseApiResponse<any>>(
      "/agent-releases/details",
      {
        params: { id },
      }
    );

    return normalizeRelease(response.data?.data);
  },

  activate: async (
    id: string
  ): Promise<AgentReleaseApiResponse<AgentRelease>> => {
    const response = await apiClient.post<AgentReleaseApiResponse<any>>(
      "/agent-releases/activate",
      { id }
    );

    return {
      ...response.data,
      data: normalizeRelease(response.data?.data),
    };
  },

  delete: async (id: string): Promise<AgentReleaseApiResponse<any>> => {
    const response = await apiClient.delete<AgentReleaseApiResponse<any>>(
      "/agent-releases/delete",
      {
        params: { id },
      }
    );

    return response.data;
  },

  copyDownloadUrl: (release: AgentRelease): string => {
    return release.download_url || release.file_url || "";
  },
};