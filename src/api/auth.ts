import api from "../services/api";
import { ApiResponse } from "../types/api";

// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Auth API functions
export const authAPI = {
  /**
   * Login user
   */
  login: async (
    credentials: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> => {
    return api.post<LoginResponse>("/users/login", credentials);
  },

  /**
   * Register user
   */
  register: async (
    userData: RegisterRequest,
  ): Promise<ApiResponse<LoginResponse>> => {
    return api.post<LoginResponse>("/users/register", userData);
  },

  /**
   * Logout user
   */
  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    return api.post("/users/logout");
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    return api.get<User>("/users/profile");
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (
    refreshToken: string,
  ): Promise<ApiResponse<{ token: string }>> => {
    return api.post("/users/refresh", { refreshToken });
  },

  /**
   * Forgot password
   */
  forgotPassword: async (
    email: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    return api.post("/users/forgot-password", { email });
  },

  /**
   * Reset password
   */
  resetPassword: async (
    token: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    return api.post("/users/reset-password", { token, password: newPassword });
  },
};
