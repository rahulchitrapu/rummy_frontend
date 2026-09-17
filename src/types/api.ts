export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  // Raw response body from the server, when there is one — some endpoints
  // return useful data alongside an error status (e.g. joining a room you're
  // already in returns 4xx with the room's details attached), so callers
  // that need more than the message can read it from here.
  data?: any;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
