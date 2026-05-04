import { apiClient } from "./http";

export type AgentStatus = "active" | "inactive" | "offline" | "pending" | string;

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
  name: string;
  site?: string;
  status?: AgentStatus;
  hostname?: string;
  os?: string;
  arch?: string;
  version?: string;
  last_seen_at?: string;
  last_ip?: string;
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

export function getAgentId(agent: Agent) {
  return agent.id || agent._id || agent.agent_id || "";
}

export const agentApi = {
  view: async (): Promise<Agent[]> => {
    const response = await apiClient.get<ApiResponse<Agent[]>>("/agents/view");
    return response.data.data || [];
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
    const response = await apiClient.get<ApiResponse<AgentDetails>>(
      "/agents/details",
      {
        params: {
          id,
          page,
          page_size: pageSize,
        },
      }
    );

    return response.data.data;
  },
};