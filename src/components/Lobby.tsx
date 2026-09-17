import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useNavigate, useParams } from "@/router";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Crown,
  Play,
  UserPlus,
  LogOut,
} from "lucide-react-native";
import { commonStyles, spacing, typography, borderRadius, shadows, cardTable } from "@/styles/theme";
import { ROOM, RoomDetails } from "@/api/room";
import { GAME } from "@/api/game";
import { CrossPlatformStorage } from "@/utils/storage";

const MAX_PLAYERS = 6;

export default function Lobby() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);

  useEffect(() => {
    CrossPlatformStorage.getItem("accountId").then(setAccountId);
  }, []);

  const fetchRoom = useCallback(
    async (isRefresh = false) => {
      if (!roomId) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const response = await ROOM.getRoomDetails(roomId);
        setRoom(response.data);
      } catch (err: { status: number; message: string } | any) {
        console.error("Failed to load room details:", err);
        setError(err?.message || "Failed to load room details.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const handleCopyCode = async () => {
    if (!room?.room_code) return;
    await Clipboard.setStringAsync(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Alert.alert's confirm/cancel buttons are a documented no-op on web
  // (react-native-web's Alert.alert() does nothing), so branch to the
  // browser's native confirm() there to keep the confirmation working on
  // every platform this app runs on.
  const confirmLeaveRoom = () =>
    new Promise<boolean>((resolve) => {
      const message = "Are you sure you want to leave this room?";

      if (Platform.OS === "web") {
        resolve(typeof window !== "undefined" ? window.confirm(message) : true);
        return;
      }

      Alert.alert("Leave Room", message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Leave", style: "destructive", onPress: () => resolve(true) },
      ]);
    });

  const handleLeaveRoom = async () => {
    if (isLeaving) return;

    const confirmed = await confirmLeaveRoom();
    if (!confirmed) return;

    if (!roomId) {
      navigate("/home");
      return;
    }

    setIsLeaving(true);
    setError("");

    try {
      await ROOM.leaveRoom(roomId);
      navigate("/home");
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to leave room:", err);
      setError(err?.message || "Failed to leave room. Please try again.");
    } finally {
      setIsLeaving(false);
    }
  };

  const players = room?.room_players ?? [];
  const currentPlayer = players.find(
    (p) => String(p.player.id) === accountId,
  );
  const isHost = currentPlayer?.is_host ?? false;
  const canStartGame = isHost && players.length >= 2 && !isStartingGame;

  const handleStartGame = async () => {
    if (isStartingGame || !roomId || !room) return;

    setIsStartingGame(true);
    setError("");

    try {
      await GAME.startGame(roomId);
      navigate(`/room/${roomId}/code/${room.room_code}/user/${accountId}`);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to start game:", err);
      setError(err?.message || "Failed to start game. Please try again.");
    } finally {
      setIsStartingGame(false);
    }
  };

  // Build a fixed 6-slot grid — filled with real players, the rest shown as
  // empty "waiting for player" slots.
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] ?? null);
  const rows = [slots.slice(0, 2), slots.slice(2, 4), slots.slice(4, 6)];

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
          styles.container,
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
            style={styles.iconButton}
            onPress={() => navigate("/home")}
            activeOpacity={0.7}
          >
            <ArrowLeft color={cardTable.goldLight} size={20} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Room Lobby</Text>
            {room ? (
              <Text style={styles.headerSubtitle}>
                {room.status === "waiting" ? "Waiting for players" : room.status}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => fetchRoom(true)}
            activeOpacity={0.7}
            disabled={isRefreshing || isLoading || isLeaving}
          >
            {isRefreshing ? (
              <ActivityIndicator color={cardTable.goldLight} size="small" />
            ) : (
              <RefreshCw color={cardTable.goldLight} size={18} />
            )}
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerFill}>
            <Text style={styles.loadingText}>Loading room…</Text>
          </View>
        ) : error && !room ? (
          <View style={styles.centerFill}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchRoom()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Room Code */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Room Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{room?.room_code}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <Check color={cardTable.felt} size={18} />
                  ) : (
                    <Copy color={cardTable.goldDark} size={18} />
                  )}
                  <Text
                    style={[
                      styles.copyButtonText,
                      copied && { color: cardTable.felt },
                    ]}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Players Grid */}
            <View style={styles.playersSection}>
              <View style={styles.playersHeadingRow}>
                <Text style={styles.playersHeading}>
                  Players ({players.length}/{MAX_PLAYERS})
                </Text>

                {isHost && (
                  <TouchableOpacity
                    style={[
                      styles.startGameButton,
                      !canStartGame && styles.startGameButtonDisabled,
                    ]}
                    onPress={handleStartGame}
                    disabled={!canStartGame}
                    activeOpacity={0.85}
                  >
                    {isStartingGame ? (
                      <ActivityIndicator
                        color={cardTable.feltDark}
                        size="small"
                        style={{ marginRight: 6 }}
                      />
                    ) : (
                      <Play
                        color={canStartGame ? cardTable.feltDark : cardTable.suitBlack}
                        size={14}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.startGameButtonText,
                        !canStartGame && styles.startGameButtonTextDisabled,
                      ]}
                    >
                      {isStartingGame ? "Starting…" : "Start Game"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isHost && !isStartingGame && players.length < 2 && (
                <Text style={styles.requirementText}>
                  Need at least 2 players to start
                </Text>
              )}

              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.playerRow}>
                  {row.map((entry, colIndex) =>
                    entry ? (
                      <View
                        key={entry.id}
                        style={[
                          styles.playerSlot,
                          styles.playerSlotFilled,
                        ]}
                      >
                        {entry.is_host && (
                          <View style={styles.crownBadge}>
                            <Crown color={cardTable.goldDark} size={12} />
                          </View>
                        )}
                        {String(entry.player.id) === accountId && (
                          <TouchableOpacity
                            style={styles.leaveBadge}
                            onPress={handleLeaveRoom}
                            disabled={isLeaving}
                            activeOpacity={0.7}
                          >
                            {isLeaving ? (
                              <ActivityIndicator
                                color={cardTable.suitRed}
                                size="small"
                              />
                            ) : (
                              <LogOut color={cardTable.suitRed} size={14} />
                            )}
                          </TouchableOpacity>
                        )}
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {entry.player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {entry.player.name}
                        </Text>
                        {String(entry.player.id) === accountId && (
                          <Text style={styles.youLabel}>You</Text>
                        )}
                        <View
                          style={[
                            styles.readyPill,
                            entry.is_ready
                              ? styles.readyPillReady
                              : styles.readyPillWaiting,
                          ]}
                        >
                          <Text
                            style={[
                              styles.readyPillText,
                              entry.is_ready
                                ? styles.readyPillTextReady
                                : styles.readyPillTextWaiting,
                            ]}
                          >
                            {entry.is_ready ? "Ready" : "Not Ready"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        key={`empty-${rowIndex}-${colIndex}`}
                        style={[styles.playerSlot, styles.playerSlotEmpty]}
                      >
                        <UserPlus color="rgba(255,255,255,0.35)" size={22} />
                        <Text style={styles.emptySlotText}>Waiting…</Text>
                      </View>
                    ),
                  )}
                </View>
              ))}
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Host starts the game via the button next to "Players" above;
                non-hosts just see a status line here. */}
            {!isHost && (
              <Text style={styles.waitingForHostText}>
                Waiting for the host to start the game…
              </Text>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  iconButton: {
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
  headerSubtitle: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    marginTop: 2,
  },
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
  },
  content: {
    flex: 1,
  },
  codeCard: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  codeLabel: {
    ...typography.caption,
    color: "#6B7280",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  codeText: {
    ...typography.h1,
    fontSize: 32,
    letterSpacing: 4,
    color: cardTable.suitBlack,
    fontWeight: "700",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: `${cardTable.goldDark}14`,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
  },
  copyButtonText: {
    ...typography.caption,
    color: cardTable.goldDark,
    fontWeight: "700",
  },
  playersSection: {
    marginBottom: spacing.lg,
  },
  playersHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  playersHeading: {
    ...typography.h4,
    color: cardTable.textOnFelt,
  },
  startGameButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  startGameButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  startGameButtonText: {
    color: cardTable.feltDark,
    fontSize: 13,
    fontWeight: "700",
  },
  startGameButtonTextDisabled: {
    color: cardTable.suitBlack,
  },
  playerRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  playerSlot: {
    flex: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  playerSlotFilled: {
    backgroundColor: cardTable.cardFace,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}30`,
    ...shadows.md,
  },
  playerSlotEmpty: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
  },
  crownBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: `${cardTable.gold}33`,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  leaveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: `${cardTable.suitRed}1A`,
    borderRadius: borderRadius.full,
    padding: 4,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cardTable.felt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  playerName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "600",
    color: cardTable.suitBlack,
    maxWidth: "100%",
  },
  youLabel: {
    ...typography.caption,
    fontSize: 10,
    color: cardTable.goldDark,
    fontWeight: "700",
    marginTop: 2,
  },
  readyPill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  readyPillReady: {
    backgroundColor: `${cardTable.felt}1A`,
  },
  readyPillWaiting: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  readyPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  readyPillTextReady: {
    color: cardTable.felt,
  },
  readyPillTextWaiting: {
    color: "#6B7280",
  },
  emptySlotText: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
    marginTop: spacing.xs,
  },
  requirementText: {
    ...typography.caption,
    fontSize: 12,
    color: cardTable.textOnFeltMuted,
    textAlign: "right",
    fontStyle: "italic",
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  waitingForHostText: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: "auto",
    marginBottom: spacing.md,
  },
  errorBanner: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
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
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    color: cardTable.feltDark,
    fontWeight: "700",
  },
});
