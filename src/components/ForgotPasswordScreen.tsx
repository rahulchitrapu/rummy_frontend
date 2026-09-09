import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigate } from "@/router";
import { Eye, EyeOff } from "lucide-react-native";
import { authAPI } from "../api/auth";
import { commonStyles, colors, typography, spacing } from "@/styles/theme";

/**
 * ForgotPasswordScreen component
 *
 * Single-step form: enter your email + a new password and call
 * authAPI.resetPassword directly. There's no OTP/token step yet — that flow
 * (authAPI.forgotPassword) is being built separately.
 */
const ForgotPasswordScreen = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    setErrorMessage("");

    if (!email || !newPassword) {
      setErrorMessage("Please enter your email and a new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.resetPassword(email, newPassword);

      if (response.success) {
        // Password reset — send the user back to sign in with the new one.
        navigate("/login");
      } else {
        setErrorMessage("Failed to reset password. Please try again.");
      }
    } catch (error: { status: number; message: string } | any) {
      console.error("Reset password error:", error);
      setErrorMessage(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[
        commonStyles.screenContainerPurple,
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
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.brandText}>Reset Password</Text>
          <Text style={styles.subtitleText}>
            Enter your email and choose a new password
          </Text>
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

        {/* New Password Field */}
        <View style={commonStyles.fieldContainer}>
          <Text style={commonStyles.fieldLabel}>New Password</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              style={commonStyles.textInput}
              placeholder="Enter a new password"
              placeholderTextColor={colors.textTertiary}
              value={newPassword}
              onChangeText={setNewPassword}
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

        {/* Confirm New Password Field */}
        <View style={commonStyles.fieldContainer}>
          <Text style={commonStyles.fieldLabel}>Confirm New Password</Text>
          <TextInput
            style={commonStyles.textInput}
            placeholder="Re-enter your new password"
            placeholderTextColor={colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity
          style={[
            commonStyles.primaryButton,
            isSubmitting && styles.disabledButton,
          ]}
          onPress={handleResetPassword}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={commonStyles.primaryButtonText}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

        {/* Error Message */}
        {errorMessage ? (
          <View
            style={[commonStyles.errorContainer, { marginTop: spacing.lg }]}
          >
            <Text style={commonStyles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Footer Link */}
        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigate("/login")}>
            <Text style={styles.signInText}>Back to Sign In</Text>
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
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  brandText: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitleText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  footerContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  signInText: {
    color: colors.primary,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
  },
});

export default ForgotPasswordScreen;
