import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AUTH_TOKEN_KEY,
  SESSION_DATA_KEY,
  authApi,
  LoginPayload,
  SignupPayload,
} from "../../services/api";

type Tenant = {
  id: string;
  name: string;
  created_at: string;
};

type User = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  is_verified: boolean;
  role: string;
  created_at: string;
};

export type AuthState = {
  token: string | null;
  role: string | null;
  tenant: Tenant | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
};

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const storedSession = getStoredSession();

const initialState: AuthState = {
  token: localStorage.getItem(AUTH_TOKEN_KEY),
  role: storedSession?.role || null,
  tenant: storedSession?.tenant || null,
  user: storedSession?.user || null,
  isAuthenticated: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
  loading: false,
  error: null,
  successMessage: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const loginResponse = await authApi.login(payload);

      localStorage.setItem(AUTH_TOKEN_KEY, loginResponse.data.token);

      const sessionResponse = await authApi.checkSession();

      localStorage.setItem(
        SESSION_DATA_KEY,
        JSON.stringify(sessionResponse.data)
      );

      return {
        token: loginResponse.data.token,
        session: sessionResponse.data,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (payload: SignupPayload, { rejectWithValue }) => {
    try {
      const signupResponse = await authApi.signup(payload);

      /**
       * If your backend returns a token after signup, this supports auto-login.
       * If it does not return a token, the user can be redirected to login.
       */
      if (signupResponse.data?.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, signupResponse.data.token);

        const sessionResponse = await authApi.checkSession();

        localStorage.setItem(
          SESSION_DATA_KEY,
          JSON.stringify(sessionResponse.data)
        );

        return {
          token: signupResponse.data.token,
          session: sessionResponse.data,
          message: signupResponse.message || "Account created successfully.",
          autoLogin: true,
        };
      }

      return {
        token: null,
        session: null,
        message: signupResponse.message || "Account created successfully.",
        autoLogin: false,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Signup failed. Please try again."
      );
    }
  }
);

export const checkSession = createAsyncThunk(
  "auth/checkSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.checkSession();

      localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(response.data));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Session expired."
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },

    setAuthSession: (
      state,
      action: PayloadAction<{
        token: string;
        role: string;
        tenant: Tenant;
        user: User;
      }>
    ) => {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.tenant = action.payload.tenant;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.token = null;
      state.role = null;
      state.tenant = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.successMessage = null;

      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(SESSION_DATA_KEY);
    },
  },
  extraReducers: (builder) => {
    builder
      /**
       * LOGIN
       */
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.role = action.payload.session.role;
        state.tenant = action.payload.session.tenant;
        state.user = action.payload.session.user;
        state.isAuthenticated = true;
        state.successMessage = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload);
        state.successMessage = null;
        state.isAuthenticated = false;
      })

      /**
       * SIGNUP
       */
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.successMessage = action.payload.message;

        if (action.payload.autoLogin && action.payload.token && action.payload.session) {
          state.token = action.payload.token;
          state.role = action.payload.session.role;
          state.tenant = action.payload.session.tenant;
          state.user = action.payload.session.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload);
        state.successMessage = null;
        state.isAuthenticated = false;
      })

      /**
       * CHECK SESSION
       */
      .addCase(checkSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.loading = false;
        state.role = action.payload.role;
        state.tenant = action.payload.tenant;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(checkSession.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload);
        state.isAuthenticated = false;

        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(SESSION_DATA_KEY);
      });
  },
});

export const {
  logout,
  setAuthSession,
  clearAuthMessages,
} = authSlice.actions;

export default authSlice.reducer;