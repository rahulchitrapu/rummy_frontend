import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { Eye, EyeOff } from "lucide-react-native";
import { CrossPlatformStorage } from "../utils/storage";
import { authAPI } from "../api/auth";
import {
  commonStyles,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "@/styles/theme";

/**
 * LoginScreen component
 * Displays login form with email and password
 */
const WelcomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignIn = async () => {
    // Clear any previous error message
    setErrorMessage("");

    try {
      // Call the auth API with the credentials
      const response = await authAPI.login({
        email: email,
        password: password,
      });

      if (response.success) {
        const userId = response.data.user.id.toString();

        // Store user ID in secure storage
        await CrossPlatformStorage.setItem("accountId", userId);

        // Navigate to home page with account ID parameter
        navigation.navigate("Home", { accountId: userId });
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
    }
    console.log("=== LOGIN DEBUG END ===");
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
        {/* Flag Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.flagEmoji}>🏴</Text>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.brandText}>SQARDS</Text>
          <Text style={styles.subtitleText}>
            Sign in to continue your journey
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
          style={commonStyles.primaryButton}
          onPress={handleSignIn}
          activeOpacity={0.8}
        >
          <Text style={commonStyles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Error Message */}
        {errorMessage ? (
          <View
            style={[commonStyles.errorContainer, { marginBottom: spacing.lg }]}
          >
            <Text style={commonStyles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Footer Links */}
        <View style={styles.footerContainer}>
          <TouchableOpacity>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.createAccountText}>Create Account</Text>
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
  iconContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  flagEmoji: {
    fontSize: 60,
    marginBottom: 0,
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
    fontSize: 48,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: spacing.md,
  },
  subtitleText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
  },
  createAccountText: {
    color: colors.textSecondary,
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
  },
});

export default WelcomeScreen;
