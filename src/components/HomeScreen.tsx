import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate, useLocation } from "@/router";
import { CrossPlatformStorage } from "../utils/storage";
import {
  LogOut,
  Users,
  Plus,
  Crown,
  Spade,
  Heart,
  Diamond,
  Club,
  ChevronRight,
} from "lucide-react-native";
import {
  commonStyles,
  typography,
  spacing,
  borderRadius,
  cardTable,
} from "../styles/theme";
import { ROOM } from "@/api/room";

type HomeLocationState = { accountId?: string } | null;

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const location = useLocation();
  const routeAccountId = (location.state as HomeLocationState)?.accountId;
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState("");

  useEffect(() => {
    // Get account ID from route state or storage
    const getAccountId = async () => {
      try {
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
        navigate("/login");
      }
    };

    getAccountId();
  }, [routeAccountId]);

  const handleLogout = async () => {
    try {
      if (accountId) {
        await CrossPlatformStorage.removeItem("accountId");
      }

      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const createRoom = async () => {
    // Guard against double-taps/re-entrant calls firing off multiple
    // "create room" requests while the first one is still in flight.
    if (isCreatingRoom) return;

    setCreateRoomError("");
    setIsCreatingRoom(true);

    try {
      await ROOM.createRoom();
      navigate("/lobby");
    } catch (error: { status: number; message: string } | any) {
      console.error("Failed to create room:", error);
      setCreateRoomError(
        error?.message || "Failed to create room. Please try again.",
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <LinearGradient
      colors={[cardTable.feltDark, cardTable.felt, cardTable.feltDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View
        style={[
          commonStyles.centeredContainer,
          styles.safeArea,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            // Add to the insets rather than replacing contentPadding's
            // paddingHorizontal — a longhand paddingLeft/Right here would
            // otherwise win over the shorthand and, on most phones where
            // insets.left/right are 0, zero out the side padding entirely.
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        {/* Header */}
        <View>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <Crown color={cardTable.gold} size={24} />
              <Text style={styles.brandTitle}>SQUARDS</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut color={cardTable.goldLight} size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Ready for your next hand?</Text>

          {accountId ? (
            <View style={styles.playerChip}>
              <Text style={styles.playerChipText}>
                Player #{accountId}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Room Options */}
        <View style={styles.middleContent}>
          <View style={styles.roomOptionsContainer}>
            {/* Join Room Option */}
            <TouchableOpacity
              style={[styles.roomCard, isCreatingRoom && styles.roomCardDisabled]}
              activeOpacity={0.85}
              onPress={() => navigate("/join-room")}
              disabled={isCreatingRoom}
            >
              <LinearGradient
                colors={["#FFFFFF", cardTable.cardFace, `${cardTable.felt}0D`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.accentBar} />
              <View
                style={[
                  styles.roomOptionIconContainer,
                  {
                    backgroundColor: `${cardTable.felt}1A`,
                    borderColor: `${cardTable.felt}33`,
                  },
                ]}
              >
                <Users color={cardTable.felt} size={26} />
              </View>
              <View style={styles.roomOptionTextContainer}>
                <Text style={[styles.roomOptionEyebrow, { color: cardTable.felt }]}>
                  MULTIPLAYER
                </Text>
                <Text style={styles.roomOptionTitle}>Join Room</Text>
                <Text style={styles.roomOptionDescription}>
                  Enter a room code to join an existing table
                </Text>
              </View>
              <ChevronRight color="#9CA3AF" size={20} />
              <View
                style={[
                  styles.suitBadge,
                  { backgroundColor: `${cardTable.suitBlack}12` },
                ]}
              >
                <Spade color={cardTable.suitBlack} size={14} />
              </View>
            </TouchableOpacity>

            {/* Create Room Option */}
            <TouchableOpacity
              style={[styles.roomCard, isCreatingRoom && styles.roomCardDisabled]}
              activeOpacity={0.85}
              onPress={createRoom}
              disabled={isCreatingRoom}
            >
              <LinearGradient
                colors={["#FFFFFF", cardTable.cardFace, `${cardTable.gold}12`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.accentBar} />
              <View
                style={[
                  styles.roomOptionIconContainer,
                  {
                    backgroundColor: `${cardTable.goldDark}1A`,
                    borderColor: `${cardTable.goldDark}33`,
                  },
                ]}
              >
                {isCreatingRoom ? (
                  <ActivityIndicator color={cardTable.goldDark} />
                ) : (
                  <Plus color={cardTable.goldDark} size={26} />
                )}
              </View>
              <View style={styles.roomOptionTextContainer}>
                <Text style={[styles.roomOptionEyebrow, { color: cardTable.goldDark }]}>
                  HOST A TABLE
                </Text>
                <Text style={styles.roomOptionTitle}>Create Room</Text>
                <Text style={styles.roomOptionDescription}>
                  {isCreatingRoom
                    ? "Setting up your table…"
                    : "Start a new table and invite others to join"}
                </Text>
              </View>
              {!isCreatingRoom && <ChevronRight color="#9CA3AF" size={20} />}
              <View
                style={[
                  styles.suitBadge,
                  { backgroundColor: `${cardTable.suitRed}12` },
                ]}
              >
                <Diamond color={cardTable.suitRed} size={14} />
              </View>
            </TouchableOpacity>

            {createRoomError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{createRoomError}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Decorative suit row */}
        <View style={styles.suitFooter}>
          <Spade color={cardTable.textOnFeltMuted} size={16} />
          <Heart color={cardTable.textOnFeltMuted} size={16} />
          <Diamond color={cardTable.textOnFeltMuted} size={16} />
          <Club color={cardTable.textOnFeltMuted} size={16} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  middleContent: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandTitle: {
    ...typography.h2,
    color: cardTable.textOnFelt,
    letterSpacing: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
  },
  subtitle: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    marginTop: spacing.xs,
  },
  playerChip: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
  },
  playerChipText: {
    ...typography.caption,
    color: cardTable.goldLight,
    fontWeight: "600",
  },
  roomOptionsContainer: {
    gap: spacing.lg,
  },
  roomCard: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 6,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  roomCardDisabled: {
    opacity: 0.85,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: cardTable.gold,
  },
  roomOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    borderWidth: 2,
  },
  roomOptionTextContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  roomOptionEyebrow: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  roomOptionTitle: {
    ...typography.h4,
    color: cardTable.suitBlack,
    marginBottom: 4,
  },
  roomOptionDescription: {
    ...typography.body,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  suitBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  suitFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    opacity: 0.6,
    marginTop: spacing.xl,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: "rgba(220,38,38,0.16)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.4)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorBannerText: {
    ...typography.body,
    fontSize: 14,
    color: "#FCA5A5",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default HomeScreen;
