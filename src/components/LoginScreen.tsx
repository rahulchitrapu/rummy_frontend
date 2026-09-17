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
 * LoginScreen component
 * Displays the sign-in form on a felt-and-gold card-table background,
 * matching HomeScreen's theme.
 */
const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (isSubmitting) return;

    // Clear any previous error message
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      // Call the auth API with the credentials
      const response = await authAPI.login({
        email: email,
        password: password,
      });

      if (response.success) {
        const { user } = response.data;
        const userId = user.id.toString();

        // Store user ID, name, and email in secure storage
        await CrossPlatformStorage.setItem("accountId", userId);
        await CrossPlatformStorage.setItem("name", user.name);
        await CrossPlatformStorage.setItem("email", user.email);

        // Navigate to home page with account details
        navigate("/home", {
          state: { accountId: userId, name: user.name, email: user.email },
        });
      } else {
        console.log("Login failed with response:", response);
        setErrorMessage("Login failed. Please try again.");
      }
    } catch (error: { status: number; message: string } | any) {
      console.error("Login error:", error);
      console.log("Error type:", typeof error);
      console.log("Error details:", JSON.stringify(error, null, 2));
      if (error.status === 401) {
        setErrorMessage(error.message || "Invalid credentials");
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
    console.log("=== LOGIN DEBUG END ===");
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
            // otherwise win over the shorthand and, on most phones where
            // insets.left/right are 0, zero out the side padding entirely.
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
              <Crown color={cardTable.gold} size={28} />
              <Text style={styles.brandTitle}>SQUARDS</Text>
            </View>
            <Text style={styles.brandSubtitle}>
              Sign in to take your seat at the table
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
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
                  placeholder="Enter your password"
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

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                isSubmitting && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={cardTable.feltDark} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
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

          {/* Footer Links */}
          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => navigate("/forgot-password")}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigate("/create-account")}>
              <Text style={styles.createAccountText}>Create Account</Text>
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
    fontSize: 36,
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
  signInButton: {
    backgroundColor: cardTable.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: cardTable.feltDark,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  forgotPasswordText: {
    color: cardTable.goldLight,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
  },
  createAccountText: {
    color: cardTable.textOnFeltMuted,
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

export default LoginScreen;
