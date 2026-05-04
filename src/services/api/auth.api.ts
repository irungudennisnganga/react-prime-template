import { apiClient } from "./http";

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  email: string;
  full_name: string;
  phone_number: string;
  password: string;
  company_name: string;
};

export type LoginResponse = {
  status: number;
  message: string;
  data: {
    token: string;
  };
};

export type SignupResponse = {
  status: number;
  message: string;
  data?: {
    token?: string;
  };
};

export type CheckSessionResponse = {
  status: number;
  message: string;
  data: {
    role: string;
    tenant: {
      id: string;
      name: string;
      created_at: string;
    };
    user: {
      id: string;
      email: string;
      full_name: string;
      phone_number: string;
      is_verified: boolean;
      role: string;
      created_at: string;
    };
  };
};

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/login", payload);
    return response.data;
  },

  signup: async (payload: SignupPayload): Promise<SignupResponse> => {
    const response = await apiClient.post<SignupResponse>("/signup", payload);
    return response.data;
  },

  checkSession: async (): Promise<CheckSessionResponse> => {
    const response = await apiClient.get<CheckSessionResponse>("/checksession");
    return response.data;
  },

  googleAuth: () => {
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api/v1";

    window.location.href = `${baseUrl}/auth/google/login`;
  },
};