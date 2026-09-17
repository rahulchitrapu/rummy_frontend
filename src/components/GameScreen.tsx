import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate, useParams } from "@/router";
import {
  ArrowLeft,
  RefreshCw,
  Layers,
  ChevronsRight,
  X,
  ArrowUpDown,
} from "lucide-react-native";
import {
  commonStyles,
  spacing,
  typography,
  borderRadius,
  shadows,
  cardTable,
} from "@/styles/theme";
import { GAME, GameCard, GameState, DrawSource } from "@/api/game";

const HAND_COLUMNS = 4;
const POLL_INTERVAL_MS = 10000;

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const RED_SUITS = new Set(["diamonds", "hearts"]);

const chunk = <T,>(items: T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
};

// Groups cards by rank only (suit is ignored), with same-rank groups of 2+
// placed first (biggest group first) and the leftover singles kept after —
// e.g. 10♣ 10♣ 10♥ and 8♠ 8♥ come out as two blocks, then any unpaired cards.
const sortHandByRank = (cards: GameCard[]): GameCard[] => {
  const groups = new Map<string, GameCard[]>();
  for (const card of cards) {
    const key = card.rank;
    const group = groups.get(key);
    if (group) {
      group.push(card);
    } else {
      groups.set(key, [card]);
    }
  }

  const sets: GameCard[][] = [];
  const singles: GameCard[] = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      sets.push(group);
    } else {
      singles.push(group[0]);
    }
  }
  sets.sort((a, b) => b.length - a.length);

  return [...sets.flat(), ...singles];
};

const cardColor = (card: GameCard) => {
  if (card.rank === "JOKER") return cardTable.goldDark;
  return card.suit && RED_SUITS.has(card.suit)
    ? "#DC2626"
    : cardTable.suitBlack;
};

function PlayingCard({
  card,
  small,
  selected,
}: {
  card: GameCard;
  small?: boolean;
  selected?: boolean;
}) {
  const color = cardColor(card);
  const isJoker = card.rank === "JOKER";
  return (
    <View
      style={[
        styles.card,
        small && styles.cardSmall,
        selected && styles.cardSelected,
      ]}
    >
      <Text style={[styles.cardRank, small && styles.cardRankSmall, { color }]}>
        {isJoker ? "★" : card.rank}
      </Text>
      {!isJoker && card.suit && (
        <Text
          style={[styles.cardSuit, small && styles.cardSuitSmall, { color }]}
        >
          {SUIT_SYMBOLS[card.suit]}
        </Text>
      )}
    </View>
  );
}

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
  const [drawingSource, setDrawingSource] = useState<DrawSource | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null,
  );
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [isDiscardHistoryOpen, setIsDiscardHistoryOpen] = useState(false);
  const [isHandSorted, setIsHandSorted] = useState(false);
  const [error, setError] = useState("");
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardSlotRef = useRef<View>(null);
  const [discardSlotLayout, setDiscardSlotLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const fetchGame = useCallback(
    async (isRefresh = false) => {
      if (!roomId || !userId) return;

      // Any fetch — automatic or a manual refresh — restarts the 10s poll
      // clock from this point, so a manual refresh doesn't leave a stale
      // poll firing right on its heels.
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
        const response = await GAME.getGameState(roomId, userId);
        setGame(response.data);
      } catch (err: { status: number; message: string } | any) {
        console.error("Failed to load game state:", err);
        setError(err?.message || "Failed to load game.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        pollTimeoutRef.current = setTimeout(
          () => fetchGame(true),
          POLL_INTERVAL_MS,
        );
      }
    },
    [roomId, userId],
  );

  useEffect(() => {
    fetchGame();
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [fetchGame]);

  const isMyTurn = !!game && game.current_turn_user_id === Number(userId);
  const canDraw =
    isMyTurn && !!game?.player.must_draw && !game?.player.has_drawn;
  const canActOnHand = isMyTurn && !!game?.player.has_drawn;
  const discardPile = game?.discard_pile ?? [];
  const topDiscard = discardPile.length > 0 ? discardPile[0] : null;
  const hand = game?.player.hand ?? [];
  const displayHand = isHandSorted ? sortHandByRank(hand) : hand;
  const handRows = chunk(displayHand, HAND_COLUMNS);

  // The discard/declare choice only exists right after drawing — once that
  // phase ends (turn passes, or the player draws again next turn) any
  // leftover selection from a previous decision should not carry over.
  useEffect(() => {
    setSelectedCardIndex(null);
  }, [canActOnHand]);

  const handleDraw = async (source: DrawSource) => {
    if (!roomId || !userId || !canDraw || drawingSource) return;
    if (source === "discard" && !topDiscard) return;

    setDrawingSource(source);
    setError("");

    try {
      await GAME.drawCard(roomId, userId, source);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to draw card:", err);
      setError(err?.message || "Failed to draw card. Please try again.");
    } finally {
      setDrawingSource(null);
    }
  };

  const handleSelectCard = (index: number) => {
    if (!canActOnHand || isDiscarding || isDeclaring) return;
    setSelectedCardIndex((current) => (current === index ? null : index));
  };

  const handleDiscard = async () => {
    if (!roomId || !userId || selectedCardIndex === null || isDiscarding) {
      return;
    }
    const card = displayHand[selectedCardIndex];
    if (!card) return;

    setIsDiscarding(true);
    setError("");

    try {
      await GAME.discardCard(roomId, userId, card);
      setSelectedCardIndex(null);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to discard card:", err);
      setError(err?.message || "Failed to discard card. Please try again.");
    } finally {
      setIsDiscarding(false);
    }
  };

  // Alert.alert's confirm/cancel buttons are a documented no-op on web
  // (react-native-web's Alert.alert() does nothing), so branch to the
  // browser's native confirm() there to keep the confirmation working on
  // every platform this app runs on.
  const confirmDeclare = () =>
    new Promise<boolean>((resolve) => {
      const message = "Are you sure you want to declare with this hand?";

      if (Platform.OS === "web") {
        resolve(typeof window !== "undefined" ? window.confirm(message) : true);
        return;
      }

      Alert.alert("Declare", message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Declare", style: "destructive", onPress: () => resolve(true) },
      ]);
    });

  const handleDeclare = async () => {
    if (!roomId || !userId || isDeclaring) return;

    const confirmed = await confirmDeclare();
    if (!confirmed) return;

    setIsDeclaring(true);
    setError("");

    try {
      await GAME.declare(roomId, userId);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to declare:", err);
      setError(err?.message || "Failed to declare. Please try again.");
    } finally {
      setIsDeclaring(false);
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
                Round {game.round_number} ·{" "}
                {isMyTurn
                  ? "Your turn"
                  : `Player ${game.current_turn_user_id}'s turn`}
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
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Turn banner */}
            <View
              style={[styles.turnBanner, isMyTurn && styles.turnBannerActive]}
            >
              <Text
                style={[
                  styles.turnBannerText,
                  isMyTurn && styles.turnBannerTextActive,
                ]}
              >
                {isMyTurn
                  ? "Your turn"
                  : `Waiting on Player ${game?.current_turn_user_id}`}
              </Text>
              {canDraw && (
                <Text style={styles.turnBannerHint}>
                  Draw a card from the closed or open deck
                </Text>
              )}
              {canActOnHand && (
                <Text style={styles.turnBannerHint}>
                  Select a card to discard, or declare
                </Text>
              )}
            </View>

            {/* Piles */}
            <View style={styles.pilesRow}>
              <TouchableOpacity
                style={styles.pileColumn}
                onPress={() => handleDraw("deck")}
                disabled={!canDraw || !!drawingSource}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.closedDeckCard,
                    !canDraw && styles.pileDisabled,
                  ]}
                >
                  {drawingSource === "deck" ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Layers color="#FFFFFF" size={22} />
                  )}
                  <Text style={styles.closedDeckCount}>
                    {game?.draw_pile_count ?? 0}
                  </Text>
                </View>
                <Text style={styles.pileLabel}>Closed Deck</Text>
              </TouchableOpacity>

              <View style={styles.pileColumn}>
                <View
                  ref={discardSlotRef}
                  style={styles.discardPileWrapper}
                  onLayout={() => {
                    discardSlotRef.current?.measureInWindow(
                      (x, y, width, height) => {
                        setDiscardSlotLayout({ x, y, width, height });
                      },
                    );
                  }}
                >
                  <TouchableOpacity
                    style={styles.discardExpandButton}
                    onPress={() => setIsDiscardHistoryOpen((open) => !open)}
                    activeOpacity={0.8}
                  >
                    {isDiscardHistoryOpen ? (
                      <X color="#FFFFFF" size={13} />
                    ) : (
                      <ChevronsRight color="#FFFFFF" size={13} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDraw("discard")}
                    disabled={
                      !canDraw ||
                      !topDiscard ||
                      !!drawingSource ||
                      isDiscardHistoryOpen
                    }
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.discardSlot,
                        (!canDraw || !topDiscard || isDiscardHistoryOpen) &&
                          styles.pileDisabled,
                      ]}
                    >
                      {drawingSource === "discard" ? (
                        <ActivityIndicator color={cardTable.suitBlack} />
                      ) : topDiscard ? (
                        <PlayingCard card={topDiscard} />
                      ) : (
                        <Text style={styles.emptyPileText}>Empty</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={styles.pileLabel}>Open Deck</Text>
              </View>

              <View style={styles.pileColumn}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    isHandSorted && styles.sortButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedCardIndex(null);
                    setIsHandSorted((sorted) => !sorted);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowUpDown
                    color={isHandSorted ? "#FFFFFF" : cardTable.feltDark}
                    size={20}
                  />
                </TouchableOpacity>
                <Text style={styles.pileLabel}>Sort</Text>
              </View>
            </View>

            {/* My hand */}
            <View style={styles.handSection}>
              <View style={styles.handHeaderRow}>
                <Text style={styles.sectionHeading}>
                  Your Hand ({hand.length})
                </Text>

                {canActOnHand && (
                  <View style={styles.handActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.discardButton,
                        (selectedCardIndex === null || isDeclaring) &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={handleDiscard}
                      disabled={
                        selectedCardIndex === null ||
                        isDiscarding ||
                        isDeclaring
                      }
                      activeOpacity={0.85}
                    >
                      {isDiscarding ? (
                        <ActivityIndicator
                          color={cardTable.feltDark}
                          size="small"
                        />
                      ) : (
                        <Text style={styles.actionButtonText}>Discard</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.declareButton,
                        (selectedCardIndex === null || isDiscarding) &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={handleDeclare}
                      disabled={
                        selectedCardIndex === null ||
                        isDiscarding ||
                        isDeclaring
                      }
                      activeOpacity={0.85}
                    >
                      {isDeclaring ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.declareButtonText,
                          ]}
                        >
                          Declare
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.handGrid}>
                {handRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.handRow}>
                    {row.map((card, colIndex) => {
                      const index = rowIndex * HAND_COLUMNS + colIndex;
                      return (
                        <TouchableOpacity
                          key={colIndex}
                          style={styles.handCardSlot}
                          onPress={() => handleSelectCard(index)}
                          disabled={!canActOnHand}
                          activeOpacity={canActOnHand ? 0.7 : 1}
                        >
                          <PlayingCard
                            card={card}
                            small
                            selected={selectedCardIndex === index}
                          />
                        </TouchableOpacity>
                      );
                    })}
                    {row.length < HAND_COLUMNS &&
                      Array.from({ length: HAND_COLUMNS - row.length }).map(
                        (_, padIndex) => (
                          <View
                            key={`pad-${padIndex}`}
                            style={styles.handCardSlot}
                          />
                        ),
                      )}
                  </View>
                ))}
              </View>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      {/* Discard history — rendered in a Modal so it floats above every
          other touchable on the table (Sort button, hand cards) instead of
          fighting them for zIndex/touch priority via absolute positioning.
          The backdrop is a sibling BEHIND the panel (not a Pressable
          wrapping it) — nesting the ScrollView inside one or more ancestor
          Pressables was the actual scroll-killer: a Pressable ancestor can
          claim the touch responder for its own press handling before the
          ScrollView ever gets a chance to recognize the drag as a scroll. */}
      <Modal
        visible={isDiscardHistoryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDiscardHistoryOpen(false)}
      >
        <View style={styles.discardHistoryOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsDiscardHistoryOpen(false)}
          />

          <View
            style={[
              styles.discardHistoryPanel,
              discardSlotLayout && {
                top: discardSlotLayout.y,
                left:
                  discardSlotLayout.x + discardSlotLayout.width + spacing.sm,
              },
            ]}
          >
            <Text style={styles.discardHistoryTitle}>
              Discard History ({discardPile.length})
            </Text>
            <ScrollView
              style={styles.discardHistoryScroll}
              contentContainerStyle={styles.discardHistoryContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {discardPile.length > 0 ? (
                discardPile.map((discarded, index) => (
                  <View key={index} style={styles.discardHistoryRow}>
                    <PlayingCard card={discarded} small />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyPileText}>Empty</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  // flexGrow (not flex) lets short content still fill the screen while
  // letting a taller hand (bigger card sizes, more cards) push past it and
  // become scrollable instead of clipping / overflowing off-screen.
  contentInner: {
    flexGrow: 1,
  },
  turnBanner: {
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
  turnBannerHint: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    marginTop: 2,
  },
  pilesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xxl,
    marginBottom: spacing.xl,
  },
  pileColumn: {
    alignItems: "center",
  },
  sortButton: {
    width: 56,
    height: 56,
    marginTop: 20,
    borderRadius: borderRadius.full,
    backgroundColor: cardTable.gold,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
  },
  sortButtonActive: {
    backgroundColor: cardTable.felt,
  },
  closedDeckCard: {
    width: 72,
    height: 96,
    borderRadius: borderRadius.md,
    backgroundColor: cardTable.felt,
    borderWidth: 2,
    borderColor: cardTable.gold,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    ...shadows.md,
  },
  closedDeckCount: {
    ...typography.body,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  discardSlot: {
    width: 72,
    height: 96,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  discardPileWrapper: {
    position: "relative",
  },
  discardExpandButton: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: cardTable.feltDark,
    borderWidth: 1,
    borderColor: cardTable.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  discardHistoryOverlay: {
    flex: 1,
  },
  // Base position is just a sane fallback for the one frame before
  // `discardSlotLayout` resolves — the real top/left (anchored to the right
  // of the open-deck card, wherever it actually measures on screen) is
  // applied inline once available.
  discardHistoryPanel: {
    position: "absolute",
    top: 100,
    left: 100,
    width: 100,
    // A ScrollView needs a definite bounded height from its ancestors to
    // scroll on native (Expo) — `maxHeight` alone lets Yoga size this panel
    // to its content instead of clamping it, so the list never overflows
    // and there's nothing to scroll. Web is more forgiving and masked this.
    height: 220,
    backgroundColor: cardTable.feltDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: cardTable.gold,
    padding: spacing.xs,
    ...shadows.md,
  },
  discardHistoryTitle: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: cardTable.goldLight,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  discardHistoryScroll: {
    flex: 1,
  },
  discardHistoryContent: {
    gap: spacing.xs,
    alignItems: "center",
  },
  discardHistoryRow: {
    alignItems: "center",
  },
  emptyPileText: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
  },
  pileDisabled: {
    opacity: 0.6,
  },
  pileLabel: {
    ...typography.caption,
    color: cardTable.textOnFeltMuted,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  card: {
    width: 72,
    height: 96,
    borderRadius: borderRadius.md,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  cardSmall: {
    width: 62,
    height: 84,
  },
  cardRank: {
    fontSize: 22,
    fontWeight: "700",
  },
  cardRankSmall: {
    fontSize: 18,
  },
  cardSuit: {
    fontSize: 20,
    marginTop: 2,
  },
  cardSuitSmall: {
    fontSize: 16,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: cardTable.gold,
    marginTop: -8,
  },
  sectionHeading: {
    ...typography.h4,
    color: cardTable.textOnFelt,
  },
  // No flex:1 here — this now lives inside a ScrollView's content, where a
  // fixed-flex child can compute to zero height; it should just size to its
  // own content and let the ScrollView grow/scroll around it.
  handSection: {},
  handHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  handActionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  handGrid: {
    gap: spacing.sm,
  },
  handRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  handCardSlot: {
    flex: 1,
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  discardButton: {
    backgroundColor: cardTable.gold,
  },
  declareButton: {
    backgroundColor: cardTable.suitRed,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: cardTable.feltDark,
    fontSize: 12,
    fontWeight: "700",
  },
  declareButtonText: {
    color: "#FFFFFF",
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
