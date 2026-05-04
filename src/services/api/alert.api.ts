import { apiClient } from "./http";


export type AlertEmail = {
  id: string;
  tenant_id?: string;
  monitor_id?: string;
  monitor_name?: string;
  target?: string;
  monitor_type?: string;
  to_email?: string;
  subject?: string;
  body?: string;
  event_type?: string;
  status?: string;
  tracking_token?: string;
  opened?: boolean;
  opened_at?: string | null;
  open_count?: number;
  click_count?: number;
  clicked_at?: string | null;
  last_open_ip?: string;
  last_user_agent?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  sent_at?: string | null;
};

export const alertEmailApi = {
  async list(params?: {
    limit?: number;
    status?: string;
    event_type?: string;
  }): Promise<AlertEmail[]> {
    const response = await apiClient.get("/alert-emails/view", {
      params,
    });

    return response.data?.data || [];
  },

  async details(id: string): Promise<AlertEmail> {
    const response = await apiClient.get("/alert-emails/details", {
      params: { id },
    });

    return response.data?.data;
  },
};