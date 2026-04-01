import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import {
  commonStyles,
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "../styles/theme";
import { ArrowLeft, Users, Play, Crown } from "lucide-react-native";

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  isReady: boolean;
}

type RoomScreenRouteProp = {
  key: string;
  name: "Room";
  params: { roomId: string; roomCode?: string } | undefined;
};

const Room = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RoomScreenRouteProp>();

  const { roomId, roomCode } = route.params || {};

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
    navigation.goBack();
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
              <Crown color={colors.warning} size={14} />
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
      colors.primary,
      colors.success,
      colors.warning,
      colors.info,
      "#8B5CF6", // Purple
      "#EC4899", // Pink
    ];
    return avatarColors[index % avatarColors.length];
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <ArrowLeft color={colors.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Rummy Room</Text>
          <View style={styles.playerCountContainer}>
            <Users color={colors.success} size={16} />
            <Text style={styles.playerCount}>{players.length} Players</Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={[styles.content, commonStyles.contentPadding]}>
        {/* Players Section */}
        <View style={styles.playersSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Users color={colors.primary} size={24} />
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
                commonStyles.primaryButton,
                styles.startGameButton,
                !canStartGame && styles.disabledButton,
              ]}
              onPress={handleStartGame}
              disabled={!canStartGame}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Play
                  color={canStartGame ? colors.surface : colors.textWhite}
                  size={20}
                  style={styles.playIcon}
                />
                <Text
                  style={[
                    commonStyles.primaryButtonText,
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
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
  },
  playerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  playerCount: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
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
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningBackground,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  allReadyBadge: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
    marginRight: spacing.xs,
  },
  allReadyDot: {
    backgroundColor: colors.success,
  },
  statusBadgeText: {
    ...typography.body,
    color: colors.warning,
    fontWeight: "600",
    fontSize: 14,
  },
  allReadyText: {
    color: colors.success,
  },
  playersList: {
    flex: 1,
  },
  playersListContent: {
    paddingBottom: spacing.md,
  },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border,
  },
  avatarReady: {
    // Add a subtle glow effect for ready players
  },
  avatarText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  crownBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.warningBackground,
    borderRadius: borderRadius.full,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.surface,
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
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  youBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  youBadgeText: {
    ...typography.caption,
    color: colors.surface,
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
    backgroundColor: colors.success,
  },
  notReadyDot: {
    backgroundColor: colors.warning,
  },
  statusLabel: {
    ...typography.body,
    fontSize: 14,
  },
  readyLabel: {
    color: colors.success,
    fontWeight: "500",
  },
  notReadyLabel: {
    color: colors.warning,
    fontWeight: "500",
  },
  readyIndicator: {
    marginLeft: spacing.sm,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  checkMark: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  loaderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  gameControlsSection: {
    marginBottom: spacing.xl,
  },
  startGameButton: {
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
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
    backgroundColor: colors.borderDark,
  },
  disabledButtonText: {
    color: colors.textWhite,
  },
  requirementText: {
    ...typography.body,
    color: colors.warning,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default Room;
