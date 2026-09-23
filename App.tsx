// import "./global.css";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";

import { Router, Routes, Route, Navigate } from "@/router";

import LoginScreen from "@/components/LoginScreen";
import CreateAccountScreen from "@/components/CreateAccountScreen";
import ForgotPasswordScreen from "@/components/ForgotPasswordScreen";
import HomeScreen from "@/components/HomeScreen";
import JoinRoom from "@/components/JoinRoom";
import Room from "@/components/Room";
import Lobby from "@/components/Lobby";
import AllRooms from "@/components/AllRooms";
import GameScreen from "@/components/GameScreen";
import RoundResultsScreen from "@/components/RoundResultsScreen";

import { CrossPlatformStorage } from "@/utils/storage";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";

// Needs to render inside <Router> since the hook reads router location/nav.
function AndroidBackHandler() {
  useAndroidBackHandler();
  return null;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthState = async () => {
      try {
        const accountId = await CrossPlatformStorage.getItem("accountId");
        setIsAuthenticated(!!accountId);
      } catch (error) {
        console.error("Failed to check auth state:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuthState();
  }, []);

  // Show loading or nothing while checking auth state
  if (isAuthenticated === null) {
    return null;
  }

  const defaultRoute = isAuthenticated ? "/home" : "/login";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Router>
          <AndroidBackHandler />
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/create-account" element={<CreateAccountScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/rooms" element={<AllRooms />} />
            <Route path="/join-room" element={<JoinRoom />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route
              path="/room/:roomId/code/:code/user/:userId"
              element={<GameScreen />}
            />
            <Route
              path="/room/:roomId/code/:code/user/:userId/round/:roundNumber"
              element={<RoundResultsScreen />}
            />
            <Route path="/lobby/:roomId" element={<Lobby />} />
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </Router>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
