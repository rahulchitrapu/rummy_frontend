import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { useLocation, useNavigate } from "@/router";

// Screens with nothing to go back to — pressing back here should exit the
// app, same as the old @react-navigation stack did at its first screen.
const ROOT_PATHS = ["/home", "/login"];

/**
 * Wires the Android hardware back button to router navigation.
 *
 * react-router-native ships a `useHardwareBackButton` hook for this, but the
 * installed version's listener is a no-op (it never calls navigate or
 * returns true) — see node_modules/react-router-native/dist/index.js. With
 * no listener returning true, RN's BackHandler falls through to its default
 * behavior and exits the app instead of going back a screen. This
 * re-implements the wiring ourselves.
 */
export function useAndroidBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const isRootScreen = ROOT_PATHS.includes(location.pathname);

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isRootScreen) return false; // let Android exit the app here
        navigate(-1);
        return true;
      },
    );

    return () => subscription.remove();
  }, [location.pathname, navigate]);
}
