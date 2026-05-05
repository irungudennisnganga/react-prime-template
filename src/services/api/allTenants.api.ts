import { apiClient } from "./http";
import { ApiResponse } from "./index";  

export type TenantListItem = {
  id: string;
  _id?: string;

  name?: string;
  slug?: string;

  created_at?: string;
  updated_at?: string;

  users_count: number;
  monitors_count: number;
  agents_count: number;
};

const normalizeTenant = (tenant: any): TenantListItem => {
  return {
    ...tenant,
    id: tenant.id || tenant._id,
    users_count: Number(tenant.users_count || 0),
    monitors_count: Number(tenant.monitors_count || 0),
    agents_count: Number(tenant.agents_count || 0),
  };
};

export const tenantsApi = {
  listAll: async (): Promise<ApiResponse<TenantListItem[]>> => {
    const response = await apiClient.get<ApiResponse<TenantListItem[]>>(
      "/tenants/all"
    );

    return {
      ...response.data,
      data: Array.isArray(response.data.data)
        ? response.data.data.map(normalizeTenant)
        : [],
    };
  },
};