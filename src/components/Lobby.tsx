import { commonStyles } from "@/styles/theme";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Lobby() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        commonStyles.screenContainer,
        commonStyles.centeredContainer,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Lobby Screen</Text>
      <Text style={{ fontSize: 16, color: "#666", marginTop: 8 }}>
        This is the lobby screen where players wait before the game starts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({});
