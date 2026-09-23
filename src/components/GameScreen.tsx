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
  Animated,
} from "react-native";
import {
  ScrollView as GestureScrollView,
  LongPressGestureHandler,
  State as GestureState,
} from "react-native-gesture-handler";
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
  Combine,
  Sparkles,
  Star,
  Lock,
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

const POLL_INTERVAL_MS = 10000;

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const RED_SUITS = new Set(["diamonds", "hearts"]);

// One physical card the player owns. Every card always belongs to some set
// — an "ungrouped" card is really just a set of one — so there's a single
// list to render and no separate loose-hand-vs-grouped-sets branching. `id`
// is this entry's own position in the `ownedCards` array — stable for as
// long as the array lives, since edits only ever change an entry's
// `groupIndex`, never reorder or splice the array itself.
interface OwnedCard {
  card: GameCard;
  groupIndex: number;
}
interface OwnedEntry extends OwnedCard {
  id: number;
}

// Groups cards by rank only (suit is ignored), with same-rank groups of 2+
// placed first (biggest group first) and the leftover singles kept after —
// e.g. 10♣ 10♣ 10♥ and 8♠ 8♥ come out as two blocks, then any unpaired cards.
const sortEntriesByRank = <T extends { card: GameCard }>(entries: T[]): T[] => {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = entry.card.rank;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  const sets: T[][] = [];
  const singles: T[] = [];
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

// A comparable fingerprint of a full `sets` arrangement that's insensitive
// to ordering — cards within a group and the groups themselves are sorted
// into a canonical order first. Without this, comparing our local
// arrangement against the server's `laid_sets` would falsely "differ" any
// time the server round-trips the same cards back in a different order,
// which would otherwise re-trigger a save forever.
const canonicalizeSets = (sets: GameCard[][]) =>
  JSON.stringify(
    sets
      .map((group) => [...group].map((c) => `${c.rank}:${c.suit ?? ""}`).sort())
      .filter((group) => group.length > 0)
      .sort((a, b) => a.join(",").localeCompare(b.join(","))),
  );

// Purely informational — the lay-set endpoint itself validates nothing
// (any number of groups, any size, any ranks), so this is just used to show
// the player whether a group happens to be a genuine same-rank set. A JOKER
// is a wildcard here — [8, 8, JOKER] counts as a valid set of 8s.
const isSameRankGroup = (cards: GameCard[]) => {
  if (cards.length === 0) return false;
  const nonJokers = cards.filter((c) => c.rank !== "JOKER");
  if (nonJokers.length === 0) return true;
  return nonJokers.every((c) => c.rank === nonJokers[0].rank);
};

// True only for a genuine 4-of-a-kind — exactly 4 cards, all the same rank,
// with no JOKER standing in for any of them. (10,10,10,10) qualifies;
// (10,10,10,JOKER) does not — Show Joker only applies to a set built from
// four real matching cards, not one padded out with a wildcard.
const isPureFourOfAKind = (cards: GameCard[]) => {
  if (cards.length !== 4) return false;
  if (cards.some((c) => c.rank === "JOKER")) return false;
  return cards.every((c) => c.rank === cards[0].rank);
};

const cardColor = (card: GameCard) => {
  if (card.rank === "JOKER") return cardTable.goldDark;
  return card.suit && RED_SUITS.has(card.suit)
    ? "#DC2626"
    : cardTable.suitBlack;
};

export function PlayingCard({
  card,
  small,
  selected,
  isWildcard,
}: {
  card: GameCard;
  small?: boolean;
  selected?: boolean;
  isWildcard?: boolean;
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
      <View style={styles.cardCorner}>
        <Text
          style={[styles.cardRank, small && styles.cardRankSmall, { color }]}
        >
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
      {/* This rank has been revealed as this round's wildcard joker — badge
          it so it's obvious at a glance which of the player's own cards
          (hand or already-laid sets) can stand in for anything. */}
      {isWildcard && !isJoker && (
        <View style={styles.wildcardBadge}>
          <Star color={cardTable.gold} size={9} fill={cardTable.gold} />
        </View>
      )}
    </View>
  );
}

// Press-and-hold (~280ms) lifts the card and lets it follow the finger;
// releasing over a different set box moves it there. A quick tap (released
// before the hold threshold) never activates the long-press gesture at
// all, so it falls through untouched to the nested TouchableOpacity for
// normal select behavior — this is what keeps a plain tap from being
// swallowed by the drag gesture, and what keeps the drag from fighting the
// page's own scroll (a fast scroll swipe never holds still long enough to
// engage it either).
function DraggableCard({
  entry,
  selected,
  disabled,
  isWildcard,
  onPress,
  onDrop,
}: {
  entry: OwnedEntry;
  selected: boolean;
  disabled?: boolean;
  isWildcard?: boolean;
  onPress: () => void;
  onDrop: (id: number, absoluteX: number, absoluteY: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onGestureEvent = (event: any) => {
    if (!dragStartRef.current) return;
    const { absoluteX, absoluteY } = event.nativeEvent;
    pan.setValue({
      x: absoluteX - dragStartRef.current.x,
      y: absoluteY - dragStartRef.current.y,
    });
  };

  const onHandlerStateChange = (event: any) => {
    const { state, absoluteX, absoluteY } = event.nativeEvent;
    if (state === GestureState.ACTIVE) {
      dragStartRef.current = { x: absoluteX, y: absoluteY };
      setIsDragging(true);
      return;
    }
    if (
      state === GestureState.END ||
      state === GestureState.CANCELLED ||
      state === GestureState.FAILED
    ) {
      if (dragStartRef.current) {
        onDrop(entry.id, absoluteX, absoluteY);
      }
      dragStartRef.current = null;
      setIsDragging(false);
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 6,
      }).start();
    }
  };

  return (
    <LongPressGestureHandler
      minDurationMs={280}
      maxDist={100000}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={!disabled}
    >
      <Animated.View
        style={[
          { transform: pan.getTranslateTransform() },
          isDragging && styles.draggingCard,
        ]}
      >
        <TouchableOpacity
          onPress={disabled ? undefined : onPress}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <PlayingCard
            card={entry.card}
            small
            selected={selected}
            isWildcard={isWildcard}
          />
        </TouchableOpacity>
      </Animated.View>
    </LongPressGestureHandler>
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
  // Every card the player owns — seeded from `hand` + `laid_sets` together
  // (see the sync effect below) and edited purely locally from then on:
  // which group (if any) each card sits in. "Save Sets" is what actually
  // persists the current arrangement.
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([]);
  // One shared multi-select, by `id` (index into ownedCards) — works for a
  // loose card or one already sitting in a group, so cards from two
  // different existing sets can be selected together and regrouped.
  // Discard/Declare only act when it holds exactly one *loose* card.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [isDiscardHistoryOpen, setIsDiscardHistoryOpen] = useState(false);
  const [isHandSorted, setIsHandSorted] = useState(false);
  const [isSavingSets, setIsSavingSets] = useState(false);
  const [isShowingJoker, setIsShowingJoker] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [error, setError] = useState("");
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the server data `ownedCards` was last built from, so a
  // background poll that returns unchanged hand/laid_sets doesn't stomp on
  // in-progress local grouping — only a real change (our own draw, discard,
  // or save landing) re-syncs.
  const syncedSignatureRef = useRef<string | null>(null);
  // Pending debounce timer for the next auto-save.
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardSlotRef = useRef<View>(null);
  const [discardSlotLayout, setDiscardSlotLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  // On-screen frame of every rendered set box, keyed by groupIndex — kept
  // up to date via each box's own onLayout, and read (not reactive state,
  // since only drop-detection needs it) whenever a card is dropped.
  const setBoxFramesRef = useRef<
    Map<number, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const setBoxNodesRef = useRef<Record<number, View | null>>({});

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

  // Whether it's from a background poll or right after this player's own
  // discard/declare/score submission, the moment the round's status flips
  // to "finished" everyone lands on the same results screen.
  useEffect(() => {
    if (!roomId || !code || !userId || !game) return;
    if (game.status === "finished") {
      navigate(
        `/room/${roomId}/code/${code}/user/${userId}/round/${game.round_number}`,
      );
    }
  }, [game?.status, game?.round_number, roomId, code, userId, navigate]);

  const isMyTurn = !!game && game.current_turn_user_id === Number(userId);
  const canDraw =
    isMyTurn && !!game?.player.must_draw && !game?.player.has_drawn;
  // Round is over and waiting on scores: the winner has already declared,
  // and everyone listed in `pending_declarations` still owes their final
  // hand (partitioned into sets) to the score endpoint.
  const isAwaitingScores = game?.status === "awaiting_scores";
  const isWinner = isAwaitingScores && game?.winner === Number(userId);
  const isPendingDeclaration =
    isAwaitingScores &&
    !!game?.pending_declarations?.includes(Number(userId));
  // Discard/declare are turn-ending moves — still gated to your own turn
  // after drawing. Arranging sets is just personal bookkeeping, so it's
  // available any time (see ownedCards below), turn or no turn.
  const canActOnHand = isMyTurn && !!game?.player.has_drawn;
  const discardPile = game?.discard_pile ?? [];
  const topDiscard = discardPile.length > 0 ? discardPile[0] : null;

  // Re-sync ownedCards from the server only when the actual hand/laid_sets
  // content changes (our own draw/discard/save landing) — not on every
  // background poll, which would otherwise wipe out in-progress grouping
  // the player hasn't saved yet.
  const handSignature = game
    ? JSON.stringify(game.player.hand) +
      "|" +
      JSON.stringify(game.player.laid_sets)
    : null;

  useEffect(() => {
    if (!game || handSignature === null) {
      setOwnedCards([]);
      setSelectedIds([]);
      syncedSignatureRef.current = null;
      return;
    }
    if (syncedSignatureRef.current === handSignature) return;
    syncedSignatureRef.current = handSignature;

    // `hand` and `laid_sets` are always disjoint — every card the player
    // has is in exactly one of them. laid_sets groups keep their server
    // positions; every hand card becomes its own set of one after that.
    const laidOwned: OwnedCard[] = game.player.laid_sets.flatMap(
      (group, groupIndex) => group.map((card) => ({ card, groupIndex })),
    );
    const looseOwned: OwnedCard[] = game.player.hand.map((card, i) => ({
      card,
      groupIndex: game.player.laid_sets.length + i,
    }));
    setOwnedCards([...laidOwned, ...looseOwned]);
    setSelectedIds([]);
  }, [handSignature]);

  const ownedEntries: OwnedEntry[] = ownedCards.map((oc, id) => ({
    ...oc,
    id,
  }));

  // One list, every card in some set — a set of one renders the same way
  // as a set of three, just with nothing else in the box.
  const groupIndices = Array.from(
    new Set(ownedEntries.map((e) => e.groupIndex)),
  ).sort((a, b) => a - b);
  const allGroups = groupIndices.map((groupIndex) => ({
    groupIndex,
    entries: ownedEntries.filter((e) => e.groupIndex === groupIndex),
  }));

  // Show Joker is only enabled once one of the player's sets is a genuine
  // 4-of-a-kind (four matching cards, no joker filling in for one) — the
  // first such set found is what gets sent to the API.
  const jokerEligibleGroup = allGroups.find((g) =>
    isPureFourOfAKind(g.entries.map((e) => e.card)),
  );
  // Once the round is effectively over — someone's declared and it's just
  // waiting on scoring, or the game has fully finished — the wildcard joker
  // is fair game for everyone to see (no quad required, no draw/discard
  // gating). Otherwise it's still gated behind having a genuine
  // 4-of-a-kind, and `has_drawn` staying true from the moment a card is
  // drawn until it's discarded means the player is mid-turn holding one
  // extra card, so Show Joker (like every other hand action besides
  // discard/declare) has to wait until that's discarded.
  const isJokerOpenToAll =
    game?.status === "finished" || game?.status === "awaiting_scores";
  const canShowJoker = isJokerOpenToAll
    ? true
    : !!jokerEligibleGroup && !game?.player.has_drawn;
  // Once revealed, the server includes `wildcard_joker` on every game-state
  // response for this player — absent entirely until then, so this is null
  // both before the player has seen it and for every other player.
  const revealedJoker = game?.wildcard_joker ?? null;
  const wildcardRank = revealedJoker?.rank ?? null;

  // Sort only rearranges the sets-of-one (actual multi-card sets are a
  // deliberate arrangement the player made, so they stay put) — same-rank
  // singles cluster together, e.g. two lone 8s end up next to each other.
  const multiCardGroups = allGroups.filter((g) => g.entries.length > 1);
  const singleCardGroups = allGroups.filter((g) => g.entries.length === 1);
  const orderedSingles = isHandSorted
    ? sortEntriesByRank(singleCardGroups.map((g) => g.entries[0])).map(
        (entry) => ({ groupIndex: entry.groupIndex, entries: [entry] }),
      )
    : singleCardGroups;
  const displayGroups = [...multiCardGroups, ...orderedSingles];

  // Every card gets persisted as part of some set — including a lone card
  // as a set of one — so a card sitting in `hand` is never left out of
  // what actually gets saved. Compared (order-insensitively) against what
  // the server currently has to decide whether an auto-save is needed.
  const localSetsSignature = canonicalizeSets(
    allGroups.map((g) => g.entries.map((e) => e.card)),
  );
  const serverSetsSignature = game
    ? canonicalizeSets(game.player.laid_sets)
    : null;

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

  // `id` is a card's position in ownedCards — works the same whether the
  // card is currently loose or sitting inside an existing group, so tapping
  // one card from one set and another from a different set just selects
  // both, ready to be regrouped together. Always available, turn or not —
  // only Discard/Declare (below) are turn-gated.
  const handleCardPress = (id: number) => {
    if (isDiscarding || isDeclaring) return;
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  // Dragging a card and releasing over a different set box moves it there
  // directly — no selection or Group button needed. Dropping on empty
  // space, back on its own set, or nowhere in particular is a no-op (the
  // card springs back to where it started).
  const handleCardDrop = (id: number, absoluteX: number, absoluteY: number) => {
    const source = ownedCards[id];
    if (!source) return;

    for (const [groupIndex, frame] of setBoxFramesRef.current.entries()) {
      if (groupIndex === source.groupIndex) continue;
      if (
        absoluteX >= frame.x &&
        absoluteX <= frame.x + frame.width &&
        absoluteY >= frame.y &&
        absoluteY <= frame.y + frame.height
      ) {
        setOwnedCards((current) =>
          current.map((oc, i) => (i === id ? { ...oc, groupIndex } : oc)),
        );
        return;
      }
    }
  };

  const handleDiscard = async () => {
    if (!roomId || !userId || selectedIds.length !== 1 || isDiscarding) {
      return;
    }
    const owned = ownedCards[selectedIds[0]];
    if (!owned) return;

    setIsDiscarding(true);
    setError("");

    try {
      await GAME.discardCard(roomId, userId, owned.card);
      setSelectedIds([]);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to discard card:", err);
      setError(err?.message || "Failed to discard card. Please try again.");
    } finally {
      setIsDiscarding(false);
    }
  };

  // Moves whatever's currently selected — loose cards, cards pulled out of
  // other sets, or a mix — into a brand-new group. Repeat to build up as
  // many groups as you like, in any size, before saving them.
  const handleGroupSelected = () => {
    if (selectedIds.length === 0) return;
    const newGroupIndex =
      groupIndices.length > 0 ? Math.max(...groupIndices) + 1 : 0;

    setOwnedCards((current) =>
      current.map((oc, id) =>
        selectedIds.includes(id) ? { ...oc, groupIndex: newGroupIndex } : oc,
      ),
    );
    setSelectedIds([]);
  };

  // Breaks a set back apart — each of its cards becomes its own set of one
  // again, at a fresh index so it doesn't collide with any other set.
  const handleRemoveGroup = (groupIndex: number) => {
    setOwnedCards((current) => {
      const maxIndex = current.reduce(
        (max, oc) => Math.max(max, oc.groupIndex),
        -1,
      );
      let nextIndex = maxIndex + 1;
      return current.map((oc) =>
        oc.groupIndex === groupIndex ? { ...oc, groupIndex: nextIndex++ } : oc,
      );
    });
  };

  const handleSaveSets = async () => {
    if (!roomId || !userId || isSavingSets) return;

    setIsSavingSets(true);
    setError("");

    try {
      // Every group goes — including a lone card as a set of one. Leaving
      // any card out of what's saved is exactly what was silently losing
      // cards: a card sitting in `hand` isn't safe until it's represented
      // in `laid_sets` too.
      const sets = groupIndices.map((groupIndex) =>
        ownedCards
          .filter((oc) => oc.groupIndex === groupIndex)
          .map((oc) => oc.card),
      );
      await GAME.laySets(roomId, userId, sets);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to save sets:", err);
      setError(err?.message || "Failed to save sets. Please try again.");
    } finally {
      setIsSavingSets(false);
    }
  };

  const handleShowJoker = async () => {
    if (!roomId || !userId || !canShowJoker || isShowingJoker) return;

    setIsShowingJoker(true);
    setError("");

    try {
      // Once the game is finished there may be no qualifying quad at all —
      // the reveal no longer depends on one, so the set is only sent when
      // there is one to send.
      await GAME.showJoker(
        roomId,
        userId,
        jokerEligibleGroup?.entries.map((e) => e.card),
      );
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to show joker:", err);
      setError(err?.message || "Failed to show joker. Please try again.");
    } finally {
      setIsShowingJoker(false);
    }
  };

  // Auto-save: whenever the local arrangement doesn't match what the
  // server currently has for `laid_sets` — a group was formed/broken
  // apart, or a hand card hasn't been represented as a set yet — persist
  // it a moment later, no explicit "Save Sets" click required. Comparing
  // straight against the server (rather than "did we already save this
  // exact thing") means a freshly-loaded hand with unsaved loose cards
  // gets saved right away instead of waiting for the player to touch
  // anything. Debounced so a quick sequence of grouping actions collapses
  // into one call. `handleSaveSets` intentionally isn't a listed
  // dependency: this should key off the arrangement changing, not off it
  // being redefined every render.
  useEffect(() => {
    if (ownedCards.length === 0 || serverSetsSignature === null) return;
    if (localSetsSignature === serverSetsSignature) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSaveSets();
    }, 500);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSetsSignature, serverSetsSignature]);

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
    if (!roomId || !userId || selectedIds.length !== 1 || isDeclaring) return;
    const owned = ownedCards[selectedIds[0]];
    if (!owned) return;

    const confirmed = await confirmDeclare();
    if (!confirmed) return;

    setIsDeclaring(true);
    setError("");

    try {
      await GAME.declare(roomId, userId, owned.card);
      setSelectedIds([]);
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to declare:", err);
      setError(err?.message || "Failed to declare. Please try again.");
    } finally {
      setIsDeclaring(false);
    }
  };

  // Phase 2: submits this player's whole hand (every group currently on the
  // table, including any leftover singles as their own 1-card group) to the
  // score endpoint. Same source of truth as Save Sets (`allGroups`), just
  // sent to the scoring endpoint instead of lay-set.
  const handleSubmitScore = async () => {
    if (!roomId || !userId || !isPendingDeclaration || isSubmittingScore) {
      return;
    }

    setIsSubmittingScore(true);
    setError("");

    try {
      const sets = groupIndices.map((groupIndex) =>
        ownedCards
          .filter((oc) => oc.groupIndex === groupIndex)
          .map((oc) => oc.card),
      );
      const response = await GAME.submitScore(roomId, userId, sets);
      const message = `You scored ${response.data.points} points.`;
      // Alert.alert is a no-op on react-native-web — same reasoning as
      // confirmDeclare above.
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert(message);
      } else {
        Alert.alert("Score submitted", message);
      }
      await fetchGame(true);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to submit score:", err);
      setError(err?.message || "Failed to submit score. Please try again.");
    } finally {
      setIsSubmittingScore(false);
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
          <GestureScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Turn banner */}
            {isAwaitingScores ? (
              <View style={[styles.turnBanner, styles.turnBannerActive]}>
                <Text
                  style={[styles.turnBannerText, styles.turnBannerTextActive]}
                >
                  {isWinner
                    ? "You declared — round is being scored"
                    : `Player ${game?.winner} declared — round is being scored`}
                </Text>
                <Text style={styles.turnBannerHint}>
                  {isWinner
                    ? "Waiting on other players to submit their hands"
                    : isPendingDeclaration
                      ? "Arrange your final hand into sets, then submit for scoring"
                      : "Waiting on other players to submit their hands"}
                </Text>
              </View>
            ) : (
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
                    Select 1 card to discard or declare, or select any and
                    group them into a set
                  </Text>
                )}
                {!isMyTurn && (
                  <Text style={styles.turnBannerHint}>
                    You can still arrange your sets while you wait
                  </Text>
                )}
              </View>
            )}

            {/* Piles */}
            <View style={styles.pilesRow}>
              <TouchableOpacity
                style={styles.pileColumn}
                onPress={() => handleDraw("deck")}
                disabled={!canDraw || !!drawingSource}
                activeOpacity={0.8}
              >
                <View style={styles.closedDeckWrapper}>
                  {/* Sits behind the closed deck, tilted, peeking out along
                      the bottom edge — locked (joker symbol, face down)
                      until this player has revealed the wildcard joker,
                      then flips to show the actual card underneath. */}
                  <View style={styles.jokerPeekCard} pointerEvents="none">
                    {revealedJoker ? (
                      <PlayingCard card={revealedJoker} small isWildcard />
                    ) : (
                      <View
                        style={[
                          styles.card,
                          styles.cardSmall,
                          styles.jokerLockedCard,
                        ]}
                      >
                        <Lock color={cardTable.goldLight} size={16} />
                      </View>
                    )}
                  </View>
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
                  onPress={() => setIsHandSorted((sorted) => !sorted)}
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

            {/* Your sets — every card the player owns lives here, whether
                it's alone (a "set" of one) or grouped with others. Tapping
                a card selects it, wherever it currently sits, so a card
                from one set and a card from another can be picked together
                and regrouped via the Group button. "Save Sets" sends every
                set at once; the server stores them as-is with no
                validation, so any size/any rank is fine. Available any
                time, turn or not — only Discard/Declare need your turn. */}
            <View style={styles.setsSection}>
              <View style={styles.setsHeaderRow}>
                <Text style={styles.sectionHeading}>
                  Cards ({ownedEntries.length})
                </Text>

                {isPendingDeclaration && (
                  <View style={styles.headerActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.declareButton,
                        isSubmittingScore && styles.actionButtonDisabled,
                      ]}
                      onPress={handleSubmitScore}
                      disabled={isSubmittingScore}
                      activeOpacity={0.85}
                    >
                      {isSubmittingScore ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.declareButtonText,
                          ]}
                        >
                          Submit Sets
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {canActOnHand && (
                  <View style={styles.headerActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.discardButton,
                        (selectedIds.length !== 1 || isDeclaring) &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={handleDiscard}
                      disabled={
                        selectedIds.length !== 1 || isDiscarding || isDeclaring
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
                        (selectedIds.length !== 1 || isDiscarding) &&
                          styles.actionButtonDisabled,
                      ]}
                      onPress={handleDeclare}
                      disabled={
                        selectedIds.length !== 1 || isDiscarding || isDeclaring
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

              <View style={styles.handActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.groupButton,
                    selectedIds.length === 0 && styles.actionButtonDisabled,
                  ]}
                  onPress={handleGroupSelected}
                  disabled={selectedIds.length === 0}
                  activeOpacity={0.85}
                >
                  <Combine color="#FFFFFF" size={12} />
                  <Text
                    style={[styles.actionButtonText, styles.groupButtonText]}
                  >
                    {" "}
                    Group
                    {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.saveSetsButton,
                    isSavingSets && styles.actionButtonDisabled,
                  ]}
                  onPress={handleSaveSets}
                  disabled={isSavingSets}
                  activeOpacity={0.85}
                >
                  {isSavingSets ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveSetsButtonText}>Save Sets</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.showJokerButton,
                    (!canShowJoker || isShowingJoker) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={handleShowJoker}
                  disabled={!canShowJoker || isShowingJoker}
                  activeOpacity={0.85}
                >
                  {isShowingJoker ? (
                    <ActivityIndicator
                      color={cardTable.feltDark}
                      size="small"
                    />
                  ) : (
                    <>
                      <Sparkles color={cardTable.feltDark} size={12} />
                      <Text style={styles.actionButtonText}> Show Joker</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.setsGrid}>
                {displayGroups.map(({ groupIndex, entries }, position) => {
                  const sameRank = isSameRankGroup(entries.map((e) => e.card));

                  return (
                    <View
                      key={groupIndex}
                      ref={(node) => {
                        setBoxNodesRef.current[groupIndex] = node;
                      }}
                      onLayout={() => {
                        setBoxNodesRef.current[groupIndex]?.measureInWindow(
                          (x, y, width, height) => {
                            setBoxFramesRef.current.set(groupIndex, {
                              x,
                              y,
                              width,
                              height,
                            });
                          },
                        );
                      }}
                      style={styles.setBox}
                    >
                      <View style={styles.setBoxHeader}>
                        <Text style={styles.setBoxLabel}>
                          Set {position + 1}
                        </Text>
                        <View style={styles.setBoxHeaderRight}>
                          {sameRank && entries.length >= 3 && (
                            <Text style={styles.setBoxStatusPerfect}>Set</Text>
                          )}
                          {entries.length > 1 && (
                            <TouchableOpacity
                              onPress={() => handleRemoveGroup(groupIndex)}
                              hitSlop={8}
                            >
                              <X color={cardTable.textOnFeltMuted} size={14} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      <View style={styles.setBoxCards}>
                        {entries.map((entry) => (
                          <DraggableCard
                            key={entry.id}
                            entry={entry}
                            selected={selectedIds.includes(entry.id)}
                            disabled={isDiscarding || isDeclaring}
                            isWildcard={
                              !!wildcardRank && entry.card.rank === wildcardRank
                            }
                            onPress={() => handleCardPress(entry.id)}
                            onDrop={handleCardDrop}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}
          </GestureScrollView>
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
  closedDeckWrapper: {
    position: "relative",
    // Leaves clearance below the deck card for the joker slot's overhang
    // so it doesn't collide with the "Closed Deck" label.
    marginBottom: 0,
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
    // Explicitly above the joker slot behind it, so the deck card covers
    // most of it and only the tilted bottom edge peeks out below.
    zIndex: 2,
    elevation: 6,
  },
  // The joker slot, sitting behind the closed deck (lower zIndex/elevation
  // than closedDeckCard) and dropped down far enough that only its top
  // third is tucked under the deck — the rest is a clean, fully visible
  // rectangle below it, just tilted slightly, rather than a jagged sliver.
  // Locked (face down, Lock icon) until this player has revealed the
  // wildcard joker, then shows the real card.
  jokerPeekCard: {
    position: "absolute",
    top: -9,
    left: 48,
    zIndex: 1,
    elevation: 3,
    transform: [{ rotate: "90deg" }],
  },
  jokerLockedCard: {
    backgroundColor: cardTable.feltDark,
    borderWidth: 2,
    borderColor: `${cardTable.gold}99`,
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
    position: "relative",
    ...shadows.sm,
  },
  cardCorner: {
    position: "absolute",
    top: 6,
    left: 8,
    alignItems: "flex-start",
  },
  wildcardBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: cardTable.feltDark,
    justifyContent: "center",
    alignItems: "center",
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
  setsSection: {
    marginBottom: spacing.lg,
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerActionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  saveSetsButton: {
    backgroundColor: cardTable.felt,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  saveSetsButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  showJokerButton: {
    backgroundColor: cardTable.gold,
  },
  setsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  setBox: {
    width: 150,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}66`,
    padding: spacing.sm,
  },
  setBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  setBoxHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  setBoxLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: cardTable.textOnFelt,
  },
  setBoxStatusPerfect: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: cardTable.felt,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  setBoxCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    minHeight: 84,
    alignItems: "center",
  },
  draggingCard: {
    zIndex: 20,
    opacity: 0.85,
    ...shadows.lg,
  },
  handActionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  groupButton: {
    backgroundColor: cardTable.felt,
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
  groupButtonText: {
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
