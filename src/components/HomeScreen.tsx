import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
} from "lucide-react-native";
import {
  commonStyles,
  typography,
  spacing,
  borderRadius,
  shadows,
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
    await ROOM.createRoom();

    navigate("/lobby");
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
          commonStyles.contentPadding,
          styles.safeArea,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: insets.left,
            paddingRight: insets.right,
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
        <View style={styles.roomOptionsContainer}>
          {/* Join Room Option */}
          <TouchableOpacity
            style={styles.roomCard}
            activeOpacity={0.85}
            onPress={() => navigate("/join-room")}
          >
            <View style={[styles.accentBar, { backgroundColor: cardTable.felt }]} />
            <View
              style={[
                styles.roomOptionIconContainer,
                { backgroundColor: `${cardTable.felt}1A` },
              ]}
            >
              <Users color={cardTable.felt} size={26} />
            </View>
            <View style={styles.roomOptionTextContainer}>
              <Text style={styles.roomOptionTitle}>Join Room</Text>
              <Text style={styles.roomOptionDescription}>
                Enter a room code to join an existing table
              </Text>
            </View>
            <View style={[styles.suitBadge, { backgroundColor: `${cardTable.suitBlack}12` }]}>
              <Spade color={cardTable.suitBlack} size={14} />
            </View>
          </TouchableOpacity>

          {/* Create Room Option */}
          <TouchableOpacity
            style={styles.roomCard}
            activeOpacity={0.85}
            onPress={() => {
              createRoom();
            }}
          >
            <View style={[styles.accentBar, { backgroundColor: cardTable.gold }]} />
            <View
              style={[
                styles.roomOptionIconContainer,
                { backgroundColor: `${cardTable.goldDark}1A` },
              ]}
            >
              <Plus color={cardTable.goldDark} size={26} />
            </View>
            <View style={styles.roomOptionTextContainer}>
              <Text style={styles.roomOptionTitle}>Create Room</Text>
              <Text style={styles.roomOptionDescription}>
                Start a new table and invite others to join
              </Text>
            </View>
            <View style={[styles.suitBadge, { backgroundColor: `${cardTable.suitRed}12` }]}>
              <Diamond color={cardTable.suitRed} size={14} />
            </View>
          </TouchableOpacity>
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
    justifyContent: "space-between",
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
    ...shadows.lg,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  roomOptionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  roomOptionTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
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
  },
});

export default HomeScreen;
