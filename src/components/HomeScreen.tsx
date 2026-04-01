import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { CrossPlatformStorage } from "../utils/storage";
import { LogOut, Users, Plus } from "lucide-react-native";
import {
  commonStyles,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles/theme";
import { ROOM } from "@/api/room";

type HomeScreenRouteProp = {
  key: string;
  name: "Home";
  params: { accountId?: string } | undefined;
};

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<HomeScreenRouteProp>();
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Get account ID from route params or storage
    const getAccountId = async () => {
      try {
        const routeAccountId = route.params?.accountId;
        if (routeAccountId) {
          setAccountId(routeAccountId);
        } else {
          const storedAccountId =
            await CrossPlatformStorage.getItem("accountId");
          setAccountId(storedAccountId);
        }
      } catch (error) {
        console.error("Failed to get account ID:", error);
        // If we can't get account ID, navigate back to login
        navigation.navigate("Login");
      }
    };

    getAccountId();
  }, [route.params]);

  const handleLogout = async () => {
    try {
      if (accountId) {
        await CrossPlatformStorage.removeItem("accountId");
      }

      navigation.navigate("Login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const createRoom = async () => {
    await ROOM.createRoom();

    navigation.navigate("Lobby");
  };

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
      {/* Header with logout button */}
      <View style={commonStyles.headerContainer}>
        <View style={commonStyles.headerContent}>
          <Text style={commonStyles.headerTitle}>Welcome to SQUARDS</Text>
          <TouchableOpacity
            style={styles.logoutIconButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut color={colors.error} size={24} />
          </TouchableOpacity>
        </View>
        <Text style={commonStyles.headerSubtitle}>Choose your action</Text>
      </View>

      <View style={[styles.content, commonStyles.contentPadding]}>
        {/* Room Options */}
        <View style={styles.roomOptionsContainer}>
          {/* Join Room Option */}
          <TouchableOpacity
            style={[styles.roomOptionButton, styles.joinRoomButton]}
            activeOpacity={0.8}
            onPress={() => {
              // TODO: Navigate to join room screen
              navigation.navigate("JoinRoom");
            }}
          >
            <View style={styles.roomOptionIconContainer}>
              <Users color={colors.success} size={28} />
            </View>
            <View style={styles.roomOptionTextContainer}>
              <Text style={styles.roomOptionTitle}>Join Room</Text>
              <Text style={styles.roomOptionDescription}>
                Enter a room code to join an existing room
              </Text>
            </View>
          </TouchableOpacity>

          {/* Create Room Option */}
          <TouchableOpacity
            style={[styles.roomOptionButton, styles.createRoomButton]}
            activeOpacity={0.8}
            onPress={() => {
              // TODO: Navigate to create room screen
              createRoom();
              console.log("Create Room pressed");
            }}
          >
            <View style={styles.roomOptionIconContainer}>
              <Plus color={colors.info} size={28} />
            </View>
            <View style={styles.roomOptionTextContainer}>
              <Text style={styles.roomOptionTitle}>Create Room</Text>
              <Text style={styles.roomOptionDescription}>
                Start a new room and invite others to join
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoutIconButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  content: {
    flex: 1,
    paddingTop: spacing.xxl,
    justifyContent: "flex-start",
  },
  roomOptionsContainer: {
    gap: spacing.lg,
  },
  roomOptionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.lg,
  },
  joinRoomButton: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successBackground,
  },
  createRoomButton: {
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBackground,
  },
  roomOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    ...shadows.sm,
  },
  roomOptionTextContainer: {
    flex: 1,
  },
  roomOptionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  roomOptionDescription: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

export default HomeScreen;
