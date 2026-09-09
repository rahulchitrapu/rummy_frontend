import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate, useParams, useLocation } from "@/router";
import {
  commonStyles,
  spacing,
  typography,
  borderRadius,
  shadows,
  cardTable,
} from "../styles/theme";
import { ArrowLeft, Users, Play, Crown } from "lucide-react-native";

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  isReady: boolean;
}

type RoomLocationState = { roomCode?: string } | null;

const Room = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const roomCode = (location.state as RoomLocationState)?.roomCode;

  // Mock current user ID - in real app, this would come from auth context
  const currentUserId = "user1";

  // State for players in the room
  const [players, setPlayers] = useState<Player[]>([
    { id: "user1", name: "You", isCreator: true, isReady: true },
    { id: "user2", name: "Alice", isCreator: false, isReady: true },
    { id: "user3", name: "Bob", isCreator: false, isReady: true },
  ]);

  // Check if current user is the room creator
  const isRoomCreator =
    players.find((p) => p.id === currentUserId)?.isCreator || false;

  // Check if all players are ready
  const allPlayersReady = players.every((player) => player.isReady);
  const canStartGame = isRoomCreator && players.length >= 2 && allPlayersReady;

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleStartGame = () => {
    // TODO: Start the rummy game
    console.log("Starting Rummy game with players:", players);
    // Add navigation to game screen or start game logic
  };

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerContent}>
        {/* Avatar */}
        <View
          style={[styles.avatarContainer, item.isReady && styles.avatarReady]}
        >
          <View
            style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}
          >
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          {item.isCreator && (
            <View style={styles.crownBadge}>
              <Crown color={cardTable.goldDark} size={14} />
            </View>
          )}
        </View>

        {/* Player Info */}
        <View style={styles.playerDetails}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.id === currentUserId && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                item.isReady ? styles.readyDot : styles.notReadyDot,
              ]}
            />
            <Text
              style={[
                styles.statusLabel,
                item.isReady ? styles.readyLabel : styles.notReadyLabel,
              ]}
            >
              {item.isReady ? "Ready to play" : "Getting ready..."}
            </Text>
          </View>
        </View>

        {/* Ready Indicator */}
        <View style={styles.readyIndicator}>
          {item.isReady ? (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          ) : (
            <View style={styles.loaderCircle}>
              <View style={styles.loaderDot} />
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Helper function to get consistent avatar colors
  const getAvatarColor = (index: number) => {
    const avatarColors = [
      cardTable.felt,
      cardTable.goldDark,
      "#8B5CF6", // Purple
      "#EC4899", // Pink
    ];
    return avatarColors[index % avatarColors.length];
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
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            // Add to the insets rather than replacing paddingHorizontal — a
            // longhand paddingLeft/Right here would otherwise win over the
            // shorthand and zero out side padding.
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <ArrowLeft color={cardTable.goldLight} size={20} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Rummy Room</Text>
            <View style={styles.playerCountContainer}>
              <Users color={cardTable.goldLight} size={14} />
              <Text style={styles.playerCount}>{players.length} Players</Text>
            </View>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Players Section */}
          <View style={styles.playersSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Users color={cardTable.gold} size={22} />
                <Text style={styles.sectionTitle}>Players in Room</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  allPlayersReady && styles.allReadyBadge,
                ]}
              >
                <View
                  style={[
                    styles.statusBadgeDot,
                    allPlayersReady && styles.allReadyDot,
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    allPlayersReady && styles.allReadyText,
                  ]}
                >
                  {allPlayersReady
                    ? "All Ready!"
                    : `${players.filter((p) => p.isReady).length}/${players.length} Ready`}
                </Text>
              </View>
            </View>

            <FlatList
              data={players}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => renderPlayer({ item, index })}
              style={styles.playersList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.playersListContent}
            />
          </View>

          {/* Start Game Button - Only visible to room creator */}
          {isRoomCreator && (
            <View style={styles.gameControlsSection}>
              <TouchableOpacity
                style={[
                  styles.startGameButton,
                  !canStartGame && styles.disabledButton,
                ]}
                onPress={handleStartGame}
                disabled={!canStartGame}
                activeOpacity={0.85}
              >
                <View style={styles.buttonContent}>
                  <Play
                    color={canStartGame ? cardTable.feltDark : cardTable.suitBlack}
                    size={20}
                    style={styles.playIcon}
                  />
                  <Text
                    style={[
                      styles.startGameButtonText,
                      !canStartGame && styles.disabledButtonText,
                    ]}
                  >
                    Start Rummy Game
                  </Text>
                </View>
              </TouchableOpacity>

              {!canStartGame && (
                <Text style={styles.requirementText}>
                  {players.length < 2
                    ? "Need at least 2 players to start"
                    : "All players must be ready to start"}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    ...typography.h3,
    color: cardTable.textOnFelt,
  },
  playerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  playerCount: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  playersSection: {
    flex: 1,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: cardTable.textOnFelt,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
  },
  allReadyBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: `${cardTable.gold}80`,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: cardTable.goldLight,
    marginRight: spacing.xs,
  },
  allReadyDot: {
    backgroundColor: cardTable.gold,
  },
  statusBadgeText: {
    ...typography.body,
    color: cardTable.goldLight,
    fontWeight: "600",
    fontSize: 14,
  },
  allReadyText: {
    color: cardTable.gold,
  },
  playersList: {
    flex: 1,
  },
  playersListContent: {
    paddingBottom: spacing.md,
  },
  playerCard: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}30`,
    ...shadows.md,
  },
  playerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E2E8F0",
  },
  avatarReady: {
    // Add a subtle glow effect for ready players
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  crownBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: `${cardTable.gold}33`,
    borderRadius: borderRadius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: cardTable.cardFace,
  },
  playerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  playerName: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: cardTable.suitBlack,
    marginRight: spacing.sm,
  },
  youBadge: {
    backgroundColor: cardTable.felt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  youBadgeText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  readyDot: {
    backgroundColor: cardTable.felt,
  },
  notReadyDot: {
    backgroundColor: cardTable.goldDark,
  },
  statusLabel: {
    ...typography.body,
    fontSize: 14,
  },
  readyLabel: {
    color: cardTable.felt,
    fontWeight: "500",
  },
  notReadyLabel: {
    color: cardTable.goldDark,
    fontWeight: "500",
  },
  readyIndicator: {
    marginLeft: spacing.sm,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cardTable.felt,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loaderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: cardTable.goldDark,
  },
  gameControlsSection: {
    marginBottom: spacing.xl,
  },
  startGameButton: {
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  startGameButtonText: {
    color: cardTable.feltDark,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    marginRight: spacing.sm,
  },
  disabledButton: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  disabledButtonText: {
    color: cardTable.suitBlack,
  },
  requirementText: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default Room;
