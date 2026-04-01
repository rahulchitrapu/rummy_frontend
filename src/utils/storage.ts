import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform storage utility
 * Uses SecureStore on mobile and localStorage on web
 */
export class CrossPlatformStorage {
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        // Use localStorage for web
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          throw new Error("localStorage is not available");
        }
      } else {
        // Use SecureStore for mobile
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error("Failed to store item:", error);
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        // Use localStorage for web
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        } else {
          return null;
        }
      } else {
        // Use SecureStore for mobile
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error("Failed to get item:", error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        // Use localStorage for web
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // Use SecureStore for mobile
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        // Use localStorage for web
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.clear();
        }
      } else {
        // For mobile, we'll just remove specific keys since SecureStore doesn't have a clear method
        // This would need to be implemented based on your app's specific needs
        console.warn("Clear method not implemented for mobile SecureStore");
      }
    } catch (error) {
      console.error("Failed to clear storage:", error);
      throw error;
    }
  }
}
