import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate, useParams } from "@/router";
import { ArrowLeft, RefreshCw, Layers } from "lucide-react-native";
import {
  commonStyles,
  spacing,
  typography,
  borderRadius,
  shadows,
  cardTable,
} from "@/styles/theme";
import { GAME, GameState } from "@/api/game";

const formatCard = (card: any): string => {
  if (typeof card === "string") return card;
  if (card && typeof card === "object") {
    if (card.rank && card.suit) return `${card.rank}${card.suit}`;
    if (card.code) return card.code;
  }
  return JSON.stringify(card);
};

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { roomId, code, userId } = useParams<{
    roomId: string;
    code: string;
    userId: string;
  }>();

  const [game, setGame] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchGame = useCallback(
    async (isRefresh = false) => {
      if (!roomId || !userId) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const response = await GAME.getGameState(roomId, userId);
        setGame(response.data);
      } catch (err: { status: number; message: string } | any) {
        console.error("Failed to load game state:", err);
        setError(err?.message || "Failed to load game.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [roomId, userId],
  );

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const currentTurnUserId = game?.turn_order?.[game.current_player_index];
  const isMyTurn =
    currentTurnUserId != null && String(currentTurnUserId) === userId;
  const discardPile = game?.discard_pile ?? [];
  const topDiscard =
    discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

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
            <Text style={styles.headerTitle}>Room {code}</Text>
            {game ? (
              <Text style={styles.headerSubtitle}>
                {isMyTurn ? "Your turn" : `Waiting on player ${currentTurnUserId}`}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => fetchGame(true)}
            activeOpacity={0.7}
            disabled={isRefreshing || isLoading}
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
            <Text style={styles.loadingText}>Loading game…</Text>
          </View>
        ) : error && !game ? (
          <View style={styles.centerFill}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchGame()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Turn banner */}
            <View
              style={[
                styles.turnBanner,
                isMyTurn && styles.turnBannerActive,
              ]}
            >
              <Text
                style={[
                  styles.turnBannerText,
                  isMyTurn && styles.turnBannerTextActive,
                ]}
              >
                {isMyTurn ? "Your turn" : `Waiting on player ${currentTurnUserId}`}
              </Text>
            </View>

            {/* Discard pile */}
            <View style={styles.discardSection}>
              <View style={styles.sectionHeadingRow}>
                <Layers color={cardTable.gold} size={16} />
                <Text style={styles.sectionHeading}>
                  Discard Pile ({discardPile.length})
                </Text>
              </View>
              <View style={styles.discardCard}>
                <Text style={styles.discardCardText}>
                  {topDiscard ? formatCard(topDiscard) : "Empty"}
                </Text>
              </View>
            </View>

            {/* Other players */}
            <View style={styles.playersSection}>
              <Text style={styles.sectionHeading}>Players</Text>
              <View style={styles.playersRow}>
                {(game?.players ?? []).map((player) => (
                  <View
                    key={player.user_id}
                    style={[
                      styles.playerChip,
                      String(player.user_id) === userId &&
                        styles.playerChipMe,
                      String(player.user_id) === String(currentTurnUserId) &&
                        styles.playerChipTurn,
                    ]}
                  >
                    <Text style={styles.playerChipName}>
                      {String(player.user_id) === userId
                        ? "You"
                        : `Player ${player.user_id}`}
                    </Text>
                    <Text style={styles.playerChipCount}>
                      {player.hand_count} cards
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* My hand */}
            <View style={styles.handSection}>
              <Text style={styles.sectionHeading}>
                Your Hand ({game?.hand?.length ?? 0})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.handRow}
              >
                {(game?.hand ?? []).map((card, index) => (
                  <View key={index} style={styles.handCard}>
                    <Text style={styles.handCardText}>{formatCard(card)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}
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
  turnBanner: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
    marginBottom: spacing.lg,
  },
  turnBannerActive: {
    backgroundColor: `${cardTable.gold}26`,
    borderColor: cardTable.gold,
  },
  turnBannerText: {
    ...typography.body,
    color: cardTable.goldLight,
    fontWeight: "600",
  },
  turnBannerTextActive: {
    color: cardTable.gold,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.h4,
    color: cardTable.textOnFelt,
    marginBottom: spacing.sm,
  },
  discardSection: {
    marginBottom: spacing.lg,
  },
  discardCard: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    ...shadows.md,
  },
  discardCardText: {
    ...typography.h3,
    color: cardTable.suitBlack,
  },
  playersSection: {
    marginBottom: spacing.lg,
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  playerChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
  },
  playerChipMe: {
    borderColor: cardTable.gold,
  },
  playerChipTurn: {
    backgroundColor: `${cardTable.gold}26`,
  },
  playerChipName: {
    ...typography.body,
    color: cardTable.textOnFelt,
    fontWeight: "600",
    fontSize: 13,
  },
  playerChipCount: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    marginTop: 2,
  },
  handSection: {
    flex: 1,
  },
  handRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  handCard: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    ...shadows.sm,
  },
  handCardText: {
    ...typography.body,
    fontWeight: "700",
    color: cardTable.suitBlack,
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
