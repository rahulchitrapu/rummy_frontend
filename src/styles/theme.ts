import { StyleSheet } from "react-native";

// Theme colors
export const colors = {
  // Primary colors
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",

  // Background colors
  background: "#F8FAFC",
  backgroundSecondary: "#F1F5F9",
  backgroundPurple: "#F3E8FF",
  surface: "#FFFFFF",

  // Text colors
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  textDisabled: "#CBD5E1",
  textWhite: "#FFFFFF",

  // Status colors
  success: "#10B981",
  successLight: "#34D399",
  successBackground: "#ECFDF5",
  successBorder: "#D1FAE5",

  warning: "#F59E0B",
  warningBackground: "#FFFBEB",
  warningBorder: "#FDE68A",

  error: "#EF4444",
  errorBackground: "#FEF2F2",
  errorBorder: "#FECACA",

  info: "#3B82F6",
  infoBackground: "#EFF6FF",
  infoBorder: "#DBEAFE",

  // Border colors
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  borderDark: "#CBD5E1",
};

// Typography
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 26,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Common component styles
export const commonStyles = StyleSheet.create({
  // Container styles
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainerPurple: {
    flex: 1,
    backgroundColor: colors.backgroundPurple,
  },
  centeredContainer: {
    flex: 1,
    maxWidth: 760,
    alignSelf: "center",
    width: "100%",
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
  },

  // Text input styles
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.bodyLarge.fontSize,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  textInputFocused: {
    borderColor: colors.primary,
  },

  // Button styles
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },

  // Card styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },

  // Error styles
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.body.fontSize,
    fontWeight: "500",
    textAlign: "center",
  },

  // Form field styles
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  // Header styles
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  centeredText: {
    textAlign: "center",
  },
});
