import ENV from "../config/env";
import { ApiResponse, ApiError, RequestConfig, HttpMethod } from "../types/api";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Add ngrok bypass header if using ngrok
        ...(ENV.API_BASE_URL.includes("ngrok") && {
          "ngrok-skip-browser-warning": "true",
        }),
      },
    });
  }

  /**
   * Set authentication token for API calls
   */
  setAuthToken(token: string) {
    this.axiosInstance.defaults.headers.common["Authorization"] =
      `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  removeAuthToken() {
    delete this.axiosInstance.defaults.headers.common["Authorization"];
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string) {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(key: string) {
    delete this.axiosInstance.defaults.headers.common[key];
  }

  /**
   * Make HTTP request using Axios
   */
  private async request<T = any>(
    method: HttpMethod,
    endpoint: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url: endpoint,
        data,
        params: config?.params,
        timeout: config?.timeout,
        headers: config?.headers,
        // Add ngrok bypass header if using ngrok
        ...(ENV.API_BASE_URL.includes("ngrok") && {
          headers: {
            ...config?.headers,
            "ngrok-skip-browser-warning": "true",
          },
        }),
      };

      const response: AxiosResponse<T> =
        await this.axiosInstance.request(axiosConfig);

      return {
        data: response.data,
        message: (response.data as any)?.message,
        success: true,
        status: response.status,
      };
    } catch (error: any) {
      console.log("❌ Request failed with error:");
      console.log("- Error:", error);

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        throw {
          message: "Request timeout",
          status: 408,
          code: "TIMEOUT",
        } as ApiError;
      }

      if (error.response) {
        // Server responded with error status

        throw {
          message:
            error.response.data?.message ||
            `HTTP ${error.response.status}: ${error.response.statusText}`,
          status: error.response.status,
          code: error.response.data?.code,
        } as ApiError;
      }

      // Unknown error
      throw {
        message: error.message || "An unexpected error occurred",
        status: 500,
        code: "UNKNOWN_ERROR",
      } as ApiError;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, { ...config, params });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, config);
  }
}

// Export singleton instance
const api = new ApiService();
export default api;
