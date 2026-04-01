import React, { useState, useCallback, useEffect } from "react";
import { ApiError, ApiResponse } from "../types/api";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<ApiResponse<T> | void>;
  reset: () => void;
}

/**
 * Custom hook for handling API calls with loading, error, and success states
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<ApiResponse<T> | void> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await apiFunction(...args);

        setState({
          data: response.data,
          loading: false,
          error: null,
        });

        return response;
      } catch (error) {
        const apiError = error as ApiError;
        setState({
          data: null,
          loading: false,
          error: apiError,
        });

        // Don't throw here, let the component handle the error through state
        console.error("API Error:", apiError);
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for making immediate API calls on component mount
 */
export function useApiEffect<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  deps: any[] = []
): UseApiState<T> {
  const { data, loading, error, execute } = useApi<T>(apiFunction);

  // Execute on mount and when dependencies change
  useEffect(() => {
    execute();
  }, deps);

  return { data, loading, error };
}
