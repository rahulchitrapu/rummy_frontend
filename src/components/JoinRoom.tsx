import React, { useState, useRef } from "react";
import { RootStackParamList } from "../types/navigation";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  commonStyles,
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
} from "../styles/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight } from "lucide-react-native";

const JoinRoom = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // State for the 4-digit room code
  const [roomCode, setRoomCode] = useState(["", "", "", ""]);
  const [isJoining, setIsJoining] = useState(false);

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
      if (numericText.length === 1 && index < 3) {
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
  const handleJoinRoom = () => {
    const code = roomCode.join("");

    if (code.length !== 4) {
      Alert.alert("Invalid Code", "Please enter a 4-digit room code");
      return;
    }

    setIsJoining(true);

    // Simulate joining process
    setTimeout(() => {
      if (code === "0000") {
        // Navigate to room with the code as roomId
        navigation.navigate("Room", { roomId: code, roomCode: code });
      } else {
        Alert.alert(
          "Invalid Room Code",
          "Room not found. Please check your code and try again.",
        );
      }
      setIsJoining(false);
    }, 1000);
  };

  return (
    <ScrollView
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
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={[styles.content, commonStyles.contentPadding]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Join Room</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit room code to join
          </Text>
        </View>

        {/* Room Code Input */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Room Code</Text>
          <View style={styles.inputContainer}>
            {roomCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
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
        </View>

        {/* Join Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              commonStyles.primaryButton,
              styles.joinButton,
              roomCode.join("").length !== 4 && styles.disabledButton,
            ]}
            onPress={handleJoinRoom}
            disabled={roomCode.join("").length !== 4 || isJoining}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text
                style={[
                  commonStyles.primaryButtonText,
                  roomCode.join("").length !== 4 && styles.disabledButtonText,
                ]}
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Text>
              <ArrowRight
                color={
                  roomCode.join("").length !== 4
                    ? colors.textDisabled
                    : colors.surface
                }
                size={20}
                style={{ marginLeft: spacing.sm }}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  codeContainer: {
    marginBottom: spacing.xxxl,
  },
  codeLabel: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  codeInput: {
    width: 60,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    fontSize: 24,
    fontWeight: "600",
    color: colors.textPrimary,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.infoBackground,
    textAlign: "center",
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
  },
  joinButton: {
    paddingVertical: spacing.lg,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: colors.borderDark,
  },
  disabledButtonText: {
    color: colors.textWhite,
  },
});

export default JoinRoom;
