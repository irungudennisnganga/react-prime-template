import { apiClient } from "./http";

export type AgentServiceType = "mongodb" | "redis" | "rabbitmq" | string;

export type AgentServiceState = "up" | "down" | "unknown" | "pending" | string;

export type AgentServiceConfigStatus = "enabled" | "disabled" | string;

export type AgentServicePayload = {
  agent_id: string;
  name: string;
  service_type: AgentServiceType;
  system_service: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database_name?: string;
  rabbitmq_vhost?: string;
  check_interval_sec: number;
  enabled: boolean;
  auto_restart: boolean;
};

export type AgentService = {
  id?: string;
  _id?: string;
  ID?: string | { $oid?: string };

  tenant_id?: string;
  TenantID?: string | { $oid?: string };

  agent_id?: string;
  AgentID?: string | { $oid?: string };

  agent_name?: string;

  name: string;
  Name?: string;

  type?: AgentServiceType;
  Type?: AgentServiceType;
  service_type?: AgentServiceType;

  system_service: string;
  SystemService?: string;

  host: string;
  Host?: string;

  port: number;
  Port?: number;

  username?: string;
  Username?: string;

  database_name?: string;
  DatabaseName?: string;

  rabbitmq_vhost?: string;
  RabbitMQVHost?: string;

  check_interval_sec?: number;
  CheckIntervalSec?: number;

  enabled?: boolean;
  Enabled?: boolean;

  auto_restart?: boolean;
  AutoRestart?: boolean;

  state?: AgentServiceState;
  last_known_state?: AgentServiceState;
  LastKnownState?: AgentServiceState;

  status?: AgentServiceConfigStatus;
  Status?: AgentServiceConfigStatus;
  config_status?: AgentServiceConfigStatus;

  last_checked_at?: string;
  LastCheckedAt?: string;

  last_restarted_at?: string;
  LastRestartedAt?: string;

  created_at?: string;
  CreatedAt?: string;

  updated_at?: string;
  UpdatedAt?: string;
};

export type AgentServiceDetails = AgentService & {
  uptime_percent?: number;
  downtime_percent?: number;
  avg_response_ms?: number;
  restart_count?: number;
  total_checks?: number;
  estimated_downtime_min?: number;
  current_state?: string;
};

export type AgentServiceLog = {
  id?: string;
  _id?: string;
  ID?: string | { $oid?: string };

  tenant_id?: string;
  agent_id?: string;

  service_id?: string;
  ServiceID?: string | { $oid?: string };

  service_name?: string;
  service_type?: string;

  state?: AgentServiceState;
  State?: AgentServiceState;

  response_ms?: number;
  ResponseMS?: number;

  restarted?: boolean;
  Restarted?: boolean;

  error?: string;
  Error?: string;

  checked_at?: string;
  CheckedAt?: string;

  created_at?: string;
  CreatedAt?: string;
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

function toId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return value.$oid || value.Hex || value.hex || "";
  }

  return String(value);
}

export function getAgentServiceId(service: AgentService) {
  return toId(service.id) || toId(service._id) || toId(service.ID);
}

export function getAgentServiceAgentId(service: AgentService) {
  return toId(service.agent_id) || toId(service.AgentID);
}

export function getAgentServiceType(service: AgentService) {
  return service.service_type || service.type || service.Type || "";
}

export function normalizeAgentService(raw: any): AgentService {
  const id = toId(raw.id) || toId(raw._id) || toId(raw.ID);
  const agentId = toId(raw.agent_id) || toId(raw.AgentID);

  const type = raw.service_type || raw.type || raw.Type || "";

  const status = raw.status || raw.Status || raw.config_status || "enabled";

  /**
   * Important:
   * Backend returns `last_known_state`.
   */
  const state =
    raw.state ||
    raw.last_known_state ||
    raw.LastKnownState ||
    raw.current_state ||
    "pending";

  return {
    ...raw,

    id,
    _id: id,

    agent_id: agentId,

    name: raw.name || raw.Name || "",

    type,
    service_type: type,

    system_service: raw.system_service || raw.SystemService || "",

    host: raw.host || raw.Host || "",

    port: Number(raw.port || raw.Port || 0),

    username: raw.username || raw.Username || "",

    database_name: raw.database_name || raw.DatabaseName || "",

    rabbitmq_vhost: raw.rabbitmq_vhost || raw.RabbitMQVHost || "",

    check_interval_sec: Number(
      raw.check_interval_sec || raw.CheckIntervalSec || 60
    ),

    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : typeof raw.Enabled === "boolean"
          ? raw.Enabled
          : String(status).toLowerCase() === "enabled",

    auto_restart:
      typeof raw.auto_restart === "boolean"
        ? raw.auto_restart
        : Boolean(raw.AutoRestart),

    state,
    last_known_state: state,

    status,
    config_status: status,

    last_checked_at: raw.last_checked_at || raw.LastCheckedAt || "",

    last_restarted_at: raw.last_restarted_at || raw.LastRestartedAt || "",

    created_at: raw.created_at || raw.CreatedAt || "",

    updated_at: raw.updated_at || raw.UpdatedAt || "",
  };
}

export function normalizeAgentServiceLog(raw: any): AgentServiceLog {
  return {
    ...raw,

    id: toId(raw.id) || toId(raw._id) || toId(raw.ID),

    service_id: toId(raw.service_id) || toId(raw.ServiceID),

    state: raw.state || raw.State || "pending",

    response_ms: Number(raw.response_ms || raw.ResponseMS || 0),

    restarted:
      typeof raw.restarted === "boolean"
        ? raw.restarted
        : typeof raw.Restarted === "boolean"
          ? raw.Restarted
          : false,

    error: raw.error || raw.Error || "",

    checked_at: raw.checked_at || raw.CheckedAt || "",

    created_at: raw.created_at || raw.CreatedAt || "",
  };
}

function buildCreatePayload(payload: AgentServicePayload) {
  const type = payload.service_type;

  return {
    agent_id: payload.agent_id,
    name: payload.name,

    /**
     * Backend expects `type`.
     */
    type,

    system_service: payload.system_service,
    host: payload.host,
    port: Number(payload.port),

    username: payload.username || "",
    password: payload.password || "",
    database_name: type === "mongodb" ? payload.database_name || "admin" : "",
    rabbitmq_vhost: type === "rabbitmq" ? payload.rabbitmq_vhost || "/" : "",

    auto_restart: Boolean(payload.auto_restart),
    check_interval_sec: Number(payload.check_interval_sec),
  };
}

export const agentServiceApi = {
  view: async (): Promise<AgentService[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(
      "/agent-services/view"
    );

    return (response.data.data || []).map(normalizeAgentService);
  },

  create: async (payload: AgentServicePayload): Promise<AgentService> => {
    const requestPayload = buildCreatePayload(payload);

    console.log("[agent-services/create] payload", requestPayload);

    const response = await apiClient.post<ApiResponse<any>>(
      "/agent-services/create",
      requestPayload
    );

    return normalizeAgentService(response.data.data);
  },

  details: async (id: string): Promise<AgentServiceDetails> => {
    if (!id) {
      throw new Error("service id is required");
    }

    const response = await apiClient.get<ApiResponse<any>>(
      "/agent-services/details",
      {
        params: {
          id,
        },
      }
    );

    return normalizeAgentService(response.data.data) as AgentServiceDetails;
  },

  logs: async (
    serviceId: string,
    limit = 100
  ): Promise<{
    logs: AgentServiceLog[];
  }> => {
    if (!serviceId) {
      throw new Error("service_id is required");
    }

    const response = await apiClient.get<ApiResponse<any[]>>(
      "/agent-services/logs",
      {
        params: {
          service_id: serviceId,
          limit,
        },
      }
    );

    return {
      logs: (response.data.data || []).map(normalizeAgentServiceLog),
    };
  },

  restart: async (id: string): Promise<AgentService> => {
    if (!id) {
      throw new Error("service id is required");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      "/agent-services/restart",
      { id }
    );

    return normalizeAgentService(response.data.data);
  },

  disable: async (id: string): Promise<AgentService> => {
    if (!id) {
      throw new Error("service id is required");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      "/agent-services/disable",
      { id }
    );

    return normalizeAgentService(response.data.data);
  },

  enable: async (id: string): Promise<AgentService> => {
    if (!id) {
      throw new Error("service id is required");
    }

    const response = await apiClient.post<ApiResponse<any>>(
      "/agent-services/enable",
      { id }
    );

    return normalizeAgentService(response.data.data);
  },
};