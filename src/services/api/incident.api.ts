import { apiClient } from "./http";

export type IncidentStatus = "down" | "offline" | "degraded" | "resolved" | "pending" | string;

export type IncidentLog = {
  id?: string;
  _id?: string;
  monitor_id?: string;
  monitor_name?: string;
  target?: string;
  type?: string;
  status?: IncidentStatus;
  message?: string;
  response_time?: number;
  response_ms?: number;
  checked_at?: string;
  created_at?: string;
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

export const incidentApi = {
  view: async (): Promise<IncidentLog[]> => {
    const response = await apiClient.get<ApiResponse<IncidentLog[]>>(
      "/incidents/view"
    );

    return response.data.data || [];
  },
};