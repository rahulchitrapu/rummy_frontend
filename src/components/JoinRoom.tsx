import React, { useState, useRef } from "react";
import { useNavigate } from "@/router";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  commonStyles,
  spacing,
  borderRadius,
  shadows,
  typography,
  cardTable,
} from "../styles/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Spade, Heart, Diamond, Club } from "lucide-react-native";
import { ROOM } from "@/api/room";

const CODE_LENGTH = 6;

const JoinRoom = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();

  // State for the 6-digit room code
  const [roomCode, setRoomCode] = useState(Array(CODE_LENGTH).fill(""));
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Refs for the input boxes to control focus
  const inputRefs = useRef<(TextInput | null | undefined)[]>([]);

  // Handle input change and auto-focus to next box
  const handleInputChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");

    if (numericText.length <= 1) {
      const newRoomCode = [...roomCode];
      newRoomCode[index] = numericText;
      setRoomCode(newRoomCode);

      // Auto-focus to next input if current input is filled and not the last input
      if (numericText.length === 1 && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace to focus previous input
  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && roomCode[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle join room action
  const handleJoinRoom = async () => {
    if (isJoining) return;

    const code = roomCode.join("");

    if (code.length !== CODE_LENGTH) {
      setErrorMessage(`Please enter the ${CODE_LENGTH}-digit room code`);
      return;
    }

    setErrorMessage("");
    setIsJoining(true);

    try {
      const response = await ROOM.joinRoom(code);
      const roomId = response.data.room?.id;

      if (!roomId) {
        setErrorMessage("Failed to join room. Please try again.");
        return;
      }

      navigate(`/lobby/${roomId}`);
    } catch (error: { status: number; message: string; data?: any } | any) {
      console.error("Failed to join room:", error);

      // The backend returns the room's details even on the "you're already
      // in this room" conflict — treat that as a soft-success and just take
      // the user to the lobby they're already part of, instead of leaving
      // them stuck on an error with no way forward.
      const roomFromError = error?.data?.room;
      if (roomFromError?.id) {
        navigate(`/lobby/${roomFromError.id}`);
        return;
      }

      setErrorMessage(
        error?.message ||
          "Room not found. Please check your code and try again.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const isCodeComplete = roomCode.join("").length === CODE_LENGTH;

  return (
    <LinearGradient
      colors={[cardTable.feltDark, cardTable.felt, cardTable.feltDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView
        style={[
          commonStyles.centeredContainer,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            // Add to the insets rather than replacing contentPadding's
            // paddingHorizontal — a longhand paddingLeft/Right here would
            // otherwise win over the shorthand and zero out side padding.
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate(-1)}
          activeOpacity={0.7}
        >
          <ArrowLeft color={cardTable.goldLight} size={20} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Spade color={cardTable.gold} size={28} />
            <Text style={styles.title}>Join Room</Text>
            <Text style={styles.subtitle}>
              Enter the {CODE_LENGTH}-digit room code to join
            </Text>
          </View>

          {/* Room Code Card */}
          <View style={styles.card}>
            <Text style={styles.codeLabel}>Room Code</Text>
            <View style={styles.inputContainer}>
              {roomCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit !== "" && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleInputChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                (!isCodeComplete || isJoining) && styles.disabledButton,
              ]}
              onPress={handleJoinRoom}
              disabled={!isCodeComplete || isJoining}
              activeOpacity={0.85}
            >
              <View style={styles.buttonContent}>
                <Text
                  style={[
                    styles.joinButtonText,
                    !isCodeComplete && styles.disabledButtonText,
                  ]}
                >
                  {isJoining ? "Joining..." : "Join Room"}
                </Text>
                <ArrowRight
                  color={!isCodeComplete ? cardTable.suitBlack : cardTable.feltDark}
                  size={20}
                  style={{ marginLeft: spacing.sm }}
                />
              </View>
            </TouchableOpacity>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Decorative suit row */}
          <View style={styles.suitRow}>
            <Spade color={cardTable.textOnFeltMuted} size={16} />
            <Heart color={cardTable.textOnFeltMuted} size={16} />
            <Diamond color={cardTable.textOnFeltMuted} size={16} />
            <Club color={cardTable.textOnFeltMuted} size={16} />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    fontSize: 30,
    color: cardTable.textOnFelt,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyLarge,
    color: cardTable.textOnFeltMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
    ...shadows.lg,
  },
  codeLabel: {
    ...typography.h4,
    color: cardTable.suitBlack,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  codeInput: {
    flex: 1,
    minWidth: 40,
    maxWidth: 48,
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
    color: cardTable.suitBlack,
    // TextInput has native default padding that, combined with a small
    // fixed-size box, was clipping/misaligning the digit — zero it out and
    // center manually instead.
    padding: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
    ...shadows.sm,
  },
  codeInputFilled: {
    borderColor: cardTable.gold,
    backgroundColor: `${cardTable.gold}14`,
    textAlign: "center",
  },
  joinButton: {
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  joinButtonText: {
    color: cardTable.feltDark,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#E2E8F0",
  },
  disabledButtonText: {
    color: cardTable.suitBlack,
  },
  errorBanner: {
    marginTop: spacing.md,
    backgroundColor: "rgba(220,38,38,0.1)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.3)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorBannerText: {
    ...typography.body,
    fontSize: 14,
    color: "#B91C1C",
    textAlign: "center",
    fontWeight: "500",
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.xxl,
    opacity: 0.6,
  },
});

export default JoinRoom;
