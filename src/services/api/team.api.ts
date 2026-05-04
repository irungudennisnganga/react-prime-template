import { apiClient } from "./http";


export type TeamMember = {
  id: string;
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  can_manage_monitors: boolean;
  can_manage_ssl: boolean;
  can_manage_team: boolean;
  can_view_billing: boolean;
  invited_by?: string;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMemberPayload = {
  email: string;
  full_name: string;
  role: string;
  can_manage_monitors: boolean;
  can_manage_ssl: boolean;
  can_manage_team: boolean;
  can_view_billing: boolean;
};

export const teamApi = {
  async view(): Promise<TeamMember[]> {
    const response = await apiClient.get("/team/view");
    return response.data?.data || [];
  },

  async add(payload: TeamMemberPayload): Promise<TeamMember> {
    const response = await apiClient.post("/team/add", payload);
    return response.data?.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete("/team/delete", {
      params: { id },
    });
  },
};