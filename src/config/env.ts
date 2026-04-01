// Environment configuration
export const ENV = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1", // Changed from placeholder to localhost for development
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || "SQUARDS",
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
};

// Debug logging
console.log("🔧 Environment Config:");
console.log("- API_BASE_URL:", ENV.API_BASE_URL);
console.log("- NODE_ENV:", ENV.NODE_ENV);
console.log(
  "- EXPO_PUBLIC_API_BASE_URL env var:",
  process.env.EXPO_PUBLIC_API_BASE_URL,
);

export default ENV;
