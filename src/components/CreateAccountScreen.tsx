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
import { CrossPlatformStorage } from "../utils/storage";
import { authAPI } from "../api/auth";
import { commonStyles, colors, typography, spacing } from "@/styles/theme";

/**
 * CreateAccountScreen component
 * Displays the sign-up form and registers a new account via authAPI.register
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
          <Text style={styles.welcomeText}>Create your</Text>
          <Text style={styles.brandText}>SQARDS account</Text>
          <Text style={styles.subtitleText}>
            Sign up to start playing with friends
          </Text>
        </View>

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
          style={[commonStyles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleCreateAccount}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={commonStyles.primaryButtonText}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
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
            <Text style={styles.signInText}>Already have an account? Sign In</Text>
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
  welcomeText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  brandText: {
    ...typography.h1,
    fontSize: 36,
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

export default CreateAccountScreen;
