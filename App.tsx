import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import WelcomeScreen from "@/components/LoginScreen";
import HomeScreen from "@/components/HomeScreen";
import JoinRoom from "@/components/JoinRoom";
import Room from "@/components/Room";
import Lobby from "@/components/Lobby";

import { RootStackParamList } from "@/types/navigation";
import { CrossPlatformStorage } from "@/utils/storage";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["http://localhost:8081", "https://yourapp.com"],
  config: {
    screens: {
      Login: "/login",
      Home: "/home",
      JoinRoom: "/join-room",
      Room: "/room/:roomId",
      Lobby: "/lobby",
    },
  },
  fallback: "/login" as const,
};

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

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? "Home" : "Login"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="JoinRoom" component={JoinRoom} />
          <Stack.Screen name="Room" component={Room} />
          <Stack.Screen name="Lobby" component={Lobby} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
