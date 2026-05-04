import { apiClient } from "./http";

export type MonitorType = "server" | "domain" | "url";

export type MonitorStatus =
  | "online"
  | "offline"
  | "pending"
  | "active"
  | "disabled"
  | "up"
  | "down"
  | string;

export type MonitorPayload = {
  name: string;
  type: MonitorType;
  target: string;
  interval: number;
};

export type Monitor = {
  id?: string;
  _id?: string;
  name: string;
  type: MonitorType;
  target: string;
  interval: number;
  status?: MonitorStatus;
  created_at?: string;
  updated_at?: string;
};

export type MonitorHistoryItem = {
  id?: string;
  monitor_id?: string;
  tenant_id?: string;
  status?: "up" | "down" | "online" | "offline" | "pending" | string;
  status_code?: number;
  response_ms?: number;
  response_time?: number;
  error?: string;
  message?: string;
  checked_at?: string;
  created_at?: string;
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

export function getMonitorId(monitor: Monitor) {
  return monitor.id || monitor._id || "";
}

export const monitorApi = {
  list: async (): Promise<Monitor[]> => {
    const response = await apiClient.get<ApiResponse<Monitor[]>>("/monitors/view");
    return response.data.data || [];
  },

  create: async (payload: MonitorPayload): Promise<Monitor> => {
    const response = await apiClient.post<ApiResponse<Monitor>>(
      "/monitors/create",
      payload
    );

    return response.data.data;
  },

  update: async (monitor: Monitor, payload: MonitorPayload): Promise<Monitor> => {
    const response = await apiClient.post<ApiResponse<Monitor>>(
      "/monitors/update",
      {
        id: getMonitorId(monitor),
        ...payload,
      }
    );

    return response.data.data;
  },

  disable: async (monitor: Monitor): Promise<Monitor> => {
    const response = await apiClient.post<ApiResponse<Monitor>>(
      "/monitors/disable",
      {
        id: getMonitorId(monitor),
      }
    );

    return response.data.data;
  },

  history: async (
    monitor: Monitor,
    range = "10m",
    limit = 500
  ): Promise<MonitorHistoryItem[]> => {
    const response = await apiClient.get<ApiResponse<MonitorHistoryItem[]>>(
      "/monitors/history",
      {
        params: {
          monitor_id: getMonitorId(monitor),
          range,
          limit,
        },
      }
    );

    return response.data.data || [];
  },
};