import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate } from "@/router";
import {
  ArrowLeft,
  Users,
  ChevronRight,
  RefreshCw,
  Crown,
} from "lucide-react-native";
import {
  commonStyles,
  spacing,
  typography,
  borderRadius,
  shadows,
  cardTable,
} from "../styles/theme";
import { ROOM, RoomSummary } from "@/api/room";
import { CrossPlatformStorage } from "@/utils/storage";

const AllRooms = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const accountId = await CrossPlatformStorage.getItem("accountId");
      if (!accountId) {
        navigate("/login");
        return;
      }

      const response = await ROOM.getUserRooms(accountId);
      setRooms(response.data.rooms ?? []);
    } catch (err: { status: number; message: string } | any) {
      console.error("Failed to fetch rooms:", err);
      setError(err?.message || "Failed to load rooms.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

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
          <Text style={styles.headerTitle}>Your Rooms</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => fetchRooms(true)}
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
            <ActivityIndicator color={cardTable.goldLight} />
          </View>
        ) : error ? (
          <View style={styles.centerFill}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchRooms()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.centerFill}>
            <Text style={styles.emptyText}>
              You don't have any active rooms yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(room) => String(room.id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: room }) => (
              <TouchableOpacity
                style={styles.roomRow}
                activeOpacity={0.85}
                onPress={() => navigate(`/lobby/${room.id}`)}
              >
                <View style={styles.roomRowIconContainer}>
                  <Users color={cardTable.felt} size={20} />
                </View>
                <View style={styles.roomRowTextContainer}>
                  <View style={styles.roomRowTitleRow}>
                    <Text style={styles.roomRowCode}>{room.room_code}</Text>
                    {room.is_host && (
                      <View style={styles.hostBadge}>
                        <Crown color={cardTable.goldDark} size={11} />
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roomRowMeta}>
                    {room.status} · {room.member_count ?? 0}/
                    {room.max_players} players
                  </Text>
                </View>
                <ChevronRight color="#9CA3AF" size={20} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </LinearGradient>
  );
};

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
  headerTitle: {
    ...typography.h3,
    color: cardTable.textOnFelt,
  },
  centerFill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  roomRowIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    backgroundColor: `${cardTable.felt}1A`,
  },
  roomRowTextContainer: {
    flex: 1,
  },
  roomRowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  roomRowCode: {
    ...typography.body,
    fontWeight: "700",
    color: cardTable.suitBlack,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    backgroundColor: `${cardTable.gold}26`,
  },
  hostBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: cardTable.goldDark,
  },
  roomRowMeta: {
    ...typography.caption,
    color: "#6B7280",
    textTransform: "capitalize",
    marginTop: 2,
  },
  errorBanner: {
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

export default AllRooms;
