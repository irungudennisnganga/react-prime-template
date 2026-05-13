import { apiClient } from "./http";

export type TenantApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

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

const normalizeTenantId = (value: any): string => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return value.$oid || value.Hex || value.hex || "";
  }

  return String(value);
};

const normalizeTenant = (tenant: any): TenantListItem => {
  const safeTenant = tenant || {};

  const id =
    normalizeTenantId(safeTenant.id) ||
    normalizeTenantId(safeTenant._id) ||
    normalizeTenantId(safeTenant.ID);

  return {
    ...safeTenant,
    id,
    _id: id,

    name: safeTenant.name || safeTenant.Name || "",
    slug: safeTenant.slug || safeTenant.Slug || "",

    created_at: safeTenant.created_at || safeTenant.CreatedAt || "",
    updated_at: safeTenant.updated_at || safeTenant.UpdatedAt || "",

    users_count: Number(
      safeTenant.users_count ||
        safeTenant.UsersCount ||
        safeTenant.user_count ||
        0
    ),

    monitors_count: Number(
      safeTenant.monitors_count ||
        safeTenant.MonitorsCount ||
        safeTenant.monitor_count ||
        0
    ),

    agents_count: Number(
      safeTenant.agents_count ||
        safeTenant.AgentsCount ||
        safeTenant.agent_count ||
        0
    ),
  };
};

export const tenantsApi = {
  listAll: async (): Promise<TenantApiResponse<TenantListItem[]>> => {
    const response = await apiClient.get<TenantApiResponse<any[]>>(
      "/tenants/all"
    );

    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeTenant)
        : [],
    };
  },
};