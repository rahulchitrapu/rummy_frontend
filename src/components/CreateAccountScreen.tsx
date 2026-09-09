import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate } from "@/router";
import { Eye, EyeOff, Crown, Spade, Heart, Diamond, Club } from "lucide-react-native";
import { CrossPlatformStorage } from "../utils/storage";
import { authAPI } from "../api/auth";
import {
  commonStyles,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  cardTable,
} from "@/styles/theme";

/**
 * CreateAccountScreen component
 * Displays the sign-up form (felt-and-gold card-table theme, matching
 * LoginScreen/HomeScreen) and registers a new account via authAPI.register.
 */
const CreateAccountScreen = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    if (isSubmitting) return;

    setErrorMessage("");

    if (!name || !email || !password) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.register({ name, email, password });

      if (response.success) {
        const userId = response.data.user.id.toString();

        // Store user ID in secure storage, same as sign-in
        await CrossPlatformStorage.setItem("accountId", userId);

        // New account is signed in immediately — go straight to home
        navigate("/home", { state: { accountId: userId } });
      } else {
        console.log("Registration failed with response:", response);
        setErrorMessage("Account creation failed. Please try again.");
      }
    } catch (error: { status: number; message: string } | any) {
      console.error("Registration error:", error);
      if (error.status === 409) {
        setErrorMessage(error.message || "An account with this email already exists");
      } else {
        setErrorMessage(error.message || "Account creation failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.brandRow}>
              <Crown color={cardTable.gold} size={26} />
              <Text style={styles.brandTitle}>SQUARDS</Text>
            </View>
            <Text style={styles.brandSubtitle}>
              Create an account to start playing with friends
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {/* Name Field */}
            <View style={commonStyles.fieldContainer}>
              <Text style={commonStyles.fieldLabel}>Full Name</Text>
              <TextInput
                style={commonStyles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Field */}
            <View style={commonStyles.fieldContainer}>
              <Text style={commonStyles.fieldLabel}>Email Address</Text>
              <TextInput
                style={commonStyles.textInput}
                placeholder="Enter your email address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={commonStyles.fieldContainer}>
              <Text style={commonStyles.fieldLabel}>Password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={commonStyles.textInput}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: [{ translateY: -12 }],
                  }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={commonStyles.fieldContainer}>
              <Text style={commonStyles.fieldLabel}>Confirm Password</Text>
              <TextInput
                style={commonStyles.textInput}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={cardTable.feltDark} />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {errorMessage ? (
              <View
                style={[commonStyles.errorContainer, { marginTop: spacing.lg }]}
              >
                <Text style={commonStyles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Footer Link */}
          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => navigate("/login")}>
              <Text style={styles.signInText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
    justifyContent: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandTitle: {
    ...typography.h1,
    fontSize: 32,
    color: cardTable.textOnFelt,
    letterSpacing: 2,
  },
  brandSubtitle: {
    ...typography.body,
    color: cardTable.textOnFeltMuted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  card: {
    backgroundColor: cardTable.cardFace,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${cardTable.goldDark}40`,
    ...shadows.lg,
  },
  submitButton: {
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: cardTable.feltDark,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  footerContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  signInText: {
    color: cardTable.goldLight,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
  },
  suitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    opacity: 0.6,
    marginTop: spacing.xxl,
  },
});

export default CreateAccountScreen;
