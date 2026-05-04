import { apiClient } from "./http";

export type SSLStatus =
  | "valid"
  | "warning"
  | "expired"
  | "invalid"
  | "unknown"
  | string;

export type SSLRecord = {
  id?: string;
  _id?: string;
  monitor_id?: string;
  target: string;
  target_type?: string;
  status: SSLStatus;
  days_left?: number;
  expires_at?: string;
  issuer?: string;
  subject?: string;
  serial_number?: string;
  dns_names?: string[];
  checked_at?: string;
  last_error?: string;
};

export type SSLDetails = {
  monitor_id: string;
  target: string;
  target_type?: string;
  status: SSLStatus;
  days_left?: number;
  expires_at?: string;
  issuer?: string;
  subject?: string;
  serial_number?: string;
  dns_names?: string[];
  checked_at?: string;
  last_error?: string;
};

export type SSLHistoryItem = {
  id?: string;
  monitor_id?: string;
  target?: string;
  target_type?: string;
  status?: SSLStatus;
  days_left?: number;
  expires_at?: string;
  issuer?: string;
  checked_at?: string;
  error?: string;
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

export function getSSLMonitorId(row: SSLRecord) {
  return row.monitor_id || row.id || row._id || "";
}

export const sslApi = {
  view: async (): Promise<SSLRecord[]> => {
    const response = await apiClient.get<ApiResponse<SSLRecord[]>>("/ssl/view");
    return response.data.data || [];
  },

  details: async (monitorId: string): Promise<SSLDetails> => {
    const response = await apiClient.get<ApiResponse<SSLDetails>>(
      "/ssl/details",
      {
        params: {
          monitor_id: monitorId,
        },
      }
    );

    return response.data.data;
  },

  history: async (
    monitorId: string,
    range = "1m",
    limit = 1000
  ): Promise<SSLHistoryItem[]> => {
    const response = await apiClient.get<ApiResponse<SSLHistoryItem[]>>(
      "/ssl/history",
      {
        params: {
          monitor_id: monitorId,
          range,
          limit,
        },
      }
    );

    return response.data.data || [];
  },
};