import { apiClient } from "./http";

export type AgentReleaseStatus = "active" | "inactive" | "draft" | string;

export type AgentRelease = {
  id: string;
  _id?: string;

  version: string;
  title?: string;
  description?: string;
  notes?: string;

  platform?: string;
  architecture?: string;

  file_url?: string;
  download_url?: string;
  checksum?: string;

  status?: AgentReleaseStatus;
  is_active?: boolean;

  created_at?: string;
  updated_at?: string;
  activated_at?: string;
};

export type CreateAgentReleasePayload = {
  version: string;
  title?: string;
  description?: string;
  notes?: string;
  platform?: string;
  architecture?: string;
  download_url?: string;
  file_url?: string;
  checksum?: string;
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

export type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

const normalizeRelease = (release: any): AgentRelease => {
  return {
    ...release,
    id: release.id || release._id,
    is_active:
      typeof release.is_active === "boolean"
        ? release.is_active
        : release.status === "active",
  };
};

export const agentReleasesApi = {
  create: async (
    payload: CreateAgentReleasePayload
  ): Promise<ApiResponse<AgentRelease>> => {
    const response = await apiClient.post<ApiResponse<AgentRelease>>(
      "/agent-releases/create",
      payload
    );

    return {
      ...response.data,
      data: normalizeRelease(response.data.data),
    };
  },

  view: async (): Promise<ApiResponse<AgentRelease[]>> => {
    const response = await apiClient.get<ApiResponse<AgentRelease[]>>(
      "/agent-releases/view"
    );

    return {
      ...response.data,
      data: Array.isArray(response.data.data)
        ? response.data.data.map(normalizeRelease)
        : [],
    };
  },

  activate: async (id: string): Promise<ApiResponse<AgentRelease>> => {
    const response = await apiClient.post<ApiResponse<AgentRelease>>(
      "/agent-releases/activate",
      { id }
    );

    return {
      ...response.data,
      data: normalizeRelease(response.data.data),
    };
  },
};