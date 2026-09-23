import { useCallback, useEffect, useRef, useState } from "react";
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
import { ArrowLeft, Crown, RefreshCw } from "lucide-react-native";
import {
  commonStyles,
  spacing,
  typography,
  borderRadius,
  shadows,
  cardTable,
} from "@/styles/theme";
import { GAME, GameResultsResponse, GameResultsPlayer } from "@/api/game";
import { PlayingCard } from "@/components/GameScreen";

const POLL_INTERVAL_MS = 10000;

export default function RoundResultsScreen() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { roomId, code, userId, roundNumber } = useParams<{
    roomId: string;
    code: string;
    userId: string;
    roundNumber: string;
  }>();

  const [results, setResults] = useState<GameResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingNextRound, setIsStartingNextRound] = useState(false);
  const [error, setError] = useState("");
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(
    async (isRefresh = false) => {
      if (!roomId) return;

      // Same restart-the-clock behavior as GameScreen's poll: every fetch,
      // automatic or manual, pushes the next one out another 10s.
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const response = await GAME.getResults(roomId);
        setResults(response.data);
      } catch (err: { status: number; message: string } | any) {
        console.error("Failed to load round results:", err);
        setError(err?.message || "Failed to load round results.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        // Keeps polling GAME.getResults every 10s regardless of outcome, so
        // this screen keeps catching other players' score submissions as
        // they land — same always-on poll shape as GameScreen's fetchGame.
        pollTimeoutRef.current = setTimeout(
          () => fetchResults(true),
          POLL_INTERVAL_MS,
        );
      }
    },
    [roomId],
  );

  useEffect(() => {
    fetchResults();
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [fetchResults]);

  const isMe = (id: number) => id === Number(userId);
  const playerLabel = (id: number) => (isMe(id) ? "You" : `Player ${id}`);

  const allSubmitted = !!results && results.pending_declarations.length === 0;
  const isWinnerMe = !!results && isMe(results.winner);

  const handleNextRound = async () => {
    if (!roomId || !code || !userId || isStartingNextRound) return;

    setIsStartingNextRound(true);
    setError("");

    try {
      await GAME.startGame(roomId);
      navigate(`/room/${roomId}/code/${code}/user/${userId}`);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to start next round:", err);
      setError(err?.message || "Failed to start next round. Please try again.");
    } finally {
      setIsStartingNextRound(false);
    }
  };

  const renderPlayer = (player: GameResultsPlayer) => {
    // laid_sets can include a trailing empty group (a leftover single-card
    // slot that ended up with nothing in it) — nothing to render for that.
    const groups = player.laid_sets.filter((group) => group.length > 0);

    return (
      <View
        key={player.user_id}
        style={[
          styles.playerCard,
          player.is_winner && styles.playerCardWinner,
        ]}
      >
        <View style={styles.playerCardHeader}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName}>{playerLabel(player.user_id)}</Text>
            {player.is_winner && (
              <Crown color={cardTable.gold} size={16} fill={cardTable.gold} />
            )}
          </View>
          <View style={styles.playerScoreRow}>
            <Text style={styles.playerScoreValue}>
              {player.is_winner ? "0" : `+${player.this_round_lost}`}
            </Text>
            <Text style={styles.playerScoreLabel}>
              this round · total {player.total_score}
            </Text>
          </View>
        </View>

        {groups.length > 0 ? (
          <View style={styles.setsGrid}>
            {groups.map((group, index) => (
              <View key={index} style={styles.setBox}>
                {group.map((card, cardIndex) => (
                  <PlayingCard key={cardIndex} card={card} small />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHandText}>No cards shown</Text>
        )}
      </View>
    );
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
          styles.container,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
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
            <Text style={styles.headerSubtitle}>
              Round {roundNumber} Results
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => fetchResults(true)}
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
            <Text style={styles.loadingText}>Loading results…</Text>
          </View>
        ) : error && !results ? (
          <View style={styles.centerFill}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchResults()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : results ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.winnerBanner, styles.winnerBannerActive]}>
              <Text style={styles.winnerBannerText}>
                {isWinnerMe
                  ? "You won this round!"
                  : `${playerLabel(results.winner)} won this round`}
              </Text>
              <Text style={styles.winnerBannerHint}>
                {allSubmitted
                  ? "Every player has submitted their hand"
                  : `Waiting on ${results.pending_declarations
                      .map((id) => playerLabel(id))
                      .join(", ")} to submit`}
              </Text>
            </View>

            {results.wildcard_joker && (
              <View style={styles.jokerRow}>
                <Text style={styles.jokerLabel}>This round's Joker</Text>
                <PlayingCard card={results.wildcard_joker} small isWildcard />
              </View>
            )}

            <View style={styles.playersSection}>
              {results.players.map(renderPlayer)}
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {allSubmitted && (
              <TouchableOpacity
                style={[
                  styles.nextRoundButton,
                  isStartingNextRound && styles.actionButtonDisabled,
                ]}
                onPress={handleNextRound}
                disabled={isStartingNextRound}
                activeOpacity={0.85}
              >
                {isStartingNextRound ? (
                  <ActivityIndicator color={cardTable.feltDark} />
                ) : (
                  <Text style={styles.nextRoundButtonText}>Next Round</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : null}
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
  contentInner: {
    flexGrow: 1,
  },
  winnerBanner: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
    marginBottom: spacing.lg,
  },
  winnerBannerActive: {
    backgroundColor: `${cardTable.gold}26`,
    borderColor: cardTable.gold,
  },
  winnerBannerText: {
    ...typography.body,
    color: cardTable.gold,
    fontWeight: "700",
  },
  winnerBannerHint: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    marginTop: 2,
    textAlign: "center",
  },
  jokerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignSelf: "center",
  },
  jokerLabel: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    fontWeight: "600",
  },
  playersSection: {
    gap: spacing.md,
  },
  playerCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  playerCardWinner: {
    borderColor: cardTable.gold,
    backgroundColor: `${cardTable.gold}14`,
  },
  playerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  playerName: {
    ...typography.h4,
    color: cardTable.textOnFelt,
  },
  playerScoreRow: {
    alignItems: "flex-end",
  },
  playerScoreValue: {
    ...typography.body,
    fontWeight: "700",
    color: cardTable.textOnFelt,
  },
  playerScoreLabel: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
  },
  setsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  setBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  emptyHandText: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    fontStyle: "italic",
  },
  nextRoundButton: {
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  nextRoundButtonText: {
    color: cardTable.feltDark,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  actionButtonDisabled: {
    opacity: 0.5,
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
