import { commonStyles, spacing, typography, borderRadius, shadows, cardTable } from "@/styles/theme";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Spade, Heart, Diamond, Club } from "lucide-react-native";

export default function Lobby() {
  const insets = useSafeAreaInsets();
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
        <View style={styles.brandRow}>
          <Crown color={cardTable.gold} size={26} />
          <Text style={styles.brandTitle}>SQUARDS</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Lobby</Text>
          <Text style={styles.subtitle}>
            This is the lobby screen where players wait before the game
            starts.
          </Text>
        </View>

        <View style={styles.suitRow}>
          <Spade color={cardTable.textOnFeltMuted} size={16} />
          <Heart color={cardTable.textOnFeltMuted} size={16} />
          <Diamond color={cardTable.textOnFeltMuted} size={16} />
          <Club color={cardTable.textOnFeltMuted} size={16} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  brandTitle: {
    ...typography.h2,
    color: cardTable.textOnFelt,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
    alignItems: "center",
    ...shadows.lg,
  },
  title: {
    ...typography.h2,
    color: cardTable.suitBlack,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    opacity: 0.6,
    marginTop: spacing.xxl,
  },
});
