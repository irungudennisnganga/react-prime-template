import { apiClient } from "./http";

export type AgentStatus =
  | "active"
  | "inactive"
  | "offline"
  | "pending"
  | string;

export type AgentDirectoryUsage = {
  path: string;
  size_bytes: number;
};

export type AgentLogFileReport = {
  path: string;
  size_bytes: number;
  modified_at?: string;
  is_candidate?: boolean;
  truncated?: boolean;
  error?: string;
};

export type AgentDiskMaintenanceReport = {
  id?: string;
  _id?: string;
  tenant_id?: string;
  agent_id?: string;
  hostname?: string;
  top_directories?: AgentDirectoryUsage[];
  log_files?: AgentLogFileReport[];
  total_truncated?: number;
  total_candidates?: number;
  total_errors?: number;
  created_at?: string;
};

export type AgentDiskMaintenanceResponse = {
  agent_id: string;
  latest?: AgentDiskMaintenanceReport | null;
  reports: AgentDiskMaintenanceReport[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type Agent = {
  id?: string;
  _id?: string;
  agent_id?: string;

  name: string;
  site?: string;
  status?: AgentStatus;

  hostname?: string;
  os?: string;
  arch?: string;
  version?: string;

  last_seen_at?: string;
  last_ip?: string;

  /**
   * Optional IP fields from backend/agent records.
   * These are added because backup downloads need the agent address.
   */
  ip?: string;
  public_ip?: string;
  private_ip?: string;
  host?: string;

  created_at?: string;
};

export type CreateAgentPayload = {
  name: string;
  site: string;
};

export type CreateAgentResponse = {
  id?: string;
  _id?: string;
  agent_id?: string;
  name?: string;
  site?: string;
  token?: string;
  install_command?: string;
  command?: string;
};

export type AgentMetrics = {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  ip?: string;
  hostname?: string;
  agent_version?: string;
  created_at?: string;
};

export type AgentHeartbeatLog = {
  id?: string;
  _id?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  hostname?: string;
  ip?: string;
  agent_version?: string;
  created_at?: string;
};

export type AgentDetails = {
  id: string;
  _id?: string;
  agent_id?: string;

  name: string;
  site?: string;
  status?: AgentStatus;

  hostname?: string;
  os?: string;
  arch?: string;
  version?: string;

  last_seen_at?: string;
  last_ip?: string;

  ip?: string;
  public_ip?: string;
  private_ip?: string;
  host?: string;

  created_at?: string;

  metrics?: AgentMetrics;
  heartbeat_logs?: AgentHeartbeatLog[];

  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

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

function normalizeText(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function getAgentId(agent?: Agent | AgentDetails | null): string {
  if (!agent) return "";

  return (
    normalizeIdValue(agent.id) ||
    normalizeIdValue(agent._id) ||
    normalizeIdValue(agent.agent_id)
  );
}

export function getAgentDownloadIP(agent?: Agent | AgentDetails | null): string {
  if (!agent) return "";

  const value =
    normalizeText(agent.last_ip) ||
    normalizeText(agent.ip) ||
    normalizeText(agent.public_ip) ||
    normalizeText(agent.private_ip) ||
    normalizeText(agent.host) ||
    normalizeText(agent.hostname);

  if (!value) return "";

  return value
    .replace(/^http:\/\//i, "")
    .replace(/^https:\/\//i, "")
    .replace(/\/$/, "")
    .split(":")[0]
    .trim();
}

export function normalizeAgent(raw: any): Agent {
  const id =
    normalizeIdValue(raw?.id) ||
    normalizeIdValue(raw?._id) ||
    normalizeIdValue(raw?.agent_id) ||
    normalizeIdValue(raw?.ID) ||
    normalizeIdValue(raw?.AgentID);

  return {
    ...raw,
    id,
    _id: id,
    agent_id: id,

    name: raw?.name || raw?.Name || "",
    site: raw?.site || raw?.Site || "",
    status: raw?.status || raw?.Status || "pending",

    hostname: raw?.hostname || raw?.Hostname || "",
    os: raw?.os || raw?.OS || "",
    arch: raw?.arch || raw?.Arch || "",
    version: raw?.version || raw?.Version || "",

    last_seen_at: raw?.last_seen_at || raw?.LastSeenAt || "",
    last_ip: raw?.last_ip || raw?.LastIP || "",

    ip: raw?.ip || raw?.IP || "",
    public_ip: raw?.public_ip || raw?.PublicIP || "",
    private_ip: raw?.private_ip || raw?.PrivateIP || "",
    host: raw?.host || raw?.Host || "",

    created_at: raw?.created_at || raw?.CreatedAt || "",
  };
}

export function normalizeAgentDetails(raw: any): AgentDetails {
  const agent = normalizeAgent(raw);

  return {
    ...raw,
    ...agent,

    id: getAgentId(agent),

    metrics: raw?.metrics || raw?.Metrics || undefined,

    heartbeat_logs: Array.isArray(raw?.heartbeat_logs)
      ? raw.heartbeat_logs
      : Array.isArray(raw?.HeartbeatLogs)
      ? raw.HeartbeatLogs
      : [],

    pagination: raw?.pagination || raw?.Pagination || undefined,
  };
}

export function normalizeDiskMaintenanceReport(
  raw: any
): AgentDiskMaintenanceReport {
  const id =
    normalizeIdValue(raw?.id) ||
    normalizeIdValue(raw?._id) ||
    normalizeIdValue(raw?.ID);

  return {
    ...raw,
    id,
    _id: id,

    tenant_id:
      normalizeIdValue(raw?.tenant_id) || normalizeIdValue(raw?.TenantID),

    agent_id:
      normalizeIdValue(raw?.agent_id) || normalizeIdValue(raw?.AgentID),

    hostname: raw?.hostname || raw?.Hostname || "",

    top_directories: Array.isArray(raw?.top_directories)
      ? raw.top_directories
      : Array.isArray(raw?.TopDirectories)
      ? raw.TopDirectories
      : [],

    log_files: Array.isArray(raw?.log_files)
      ? raw.log_files
      : Array.isArray(raw?.LogFiles)
      ? raw.LogFiles
      : [],

    total_truncated: Number(raw?.total_truncated || raw?.TotalTruncated || 0),
    total_candidates: Number(raw?.total_candidates || raw?.TotalCandidates || 0),
    total_errors: Number(raw?.total_errors || raw?.TotalErrors || 0),

    created_at: raw?.created_at || raw?.CreatedAt || "",
  };
}

export const agentApi = {
  view: async (): Promise<Agent[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>("/agents/view");

    return (response.data.data || []).map(normalizeAgent);
  },

  create: async (payload: CreateAgentPayload): Promise<CreateAgentResponse> => {
    const response = await apiClient.post<ApiResponse<CreateAgentResponse>>(
      "/agents/create",
      payload
    );

    return response.data.data;
  },

  details: async (
    id: string,
    page = 1,
    pageSize = 10
  ): Promise<AgentDetails> => {
    const response = await apiClient.get<ApiResponse<any>>("/agents/details", {
      params: {
        id,
        page,
        page_size: pageSize,
      },
    });

    return normalizeAgentDetails(response.data.data);
  },

  diskMaintenanceReports: async (
    agentId: string,
    page = 1,
    pageSize = 10
  ): Promise<AgentDiskMaintenanceResponse> => {
    const response = await apiClient.get<ApiResponse<any>>(
      "/agents/disk-maintenance-reports",
      {
        params: {
          agent_id: agentId,
          page,
          page_size: pageSize,
        },
      }
    );

    const data = response.data.data || {};

    return {
      agent_id: normalizeIdValue(data.agent_id || data.AgentID || agentId),
      latest: data.latest
        ? normalizeDiskMaintenanceReport(data.latest)
        : data.Latest
        ? normalizeDiskMaintenanceReport(data.Latest)
        : null,

      reports: Array.isArray(data.reports)
        ? data.reports.map(normalizeDiskMaintenanceReport)
        : Array.isArray(data.Reports)
        ? data.Reports.map(normalizeDiskMaintenanceReport)
        : [],

      pagination: data.pagination ||
        data.Pagination || {
          page,
          page_size: pageSize,
          total: 0,
          total_pages: 0,
        },
    };
  },
};