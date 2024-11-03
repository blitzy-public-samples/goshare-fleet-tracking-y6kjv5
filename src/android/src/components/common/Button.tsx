/**
 * @fileoverview A reusable, accessible button component for the mobile driver application
 * that supports different variants, states, loading indicators, and offline functionality.
 * 
 * Human Tasks:
 * 1. Verify that the Material Design color tokens match your design system
 * 2. Test accessibility features with screen readers on both iOS and Android
 * 3. Validate button contrast ratios meet WCAG standards
 */

// React 18.0.0
import React, { useCallback } from 'react';
// React Native 0.71.0
import { 
  TouchableOpacity, 
  ActivityIndicator, 
  Text, 
  StyleSheet, 
  ViewStyle 
} from 'react-native';

import { COLORS } from '../../constants/colors';

/**
 * Supported button variants following Material Design principles
 * Addresses requirement: Mobile Applications - Consistent UI/UX
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline';

/**
 * Props interface for the Button component
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Returns the appropriate Material Design colors based on button variant and state
 * Addresses requirement: Mobile Applications - Material Design principles
 */
const getButtonColors = (variant: ButtonVariant = 'primary', disabled: boolean) => {
  if (disabled) {
    return {
      background: COLORS.background.disabled,
      text: COLORS.text.disabled
    };
  }

  switch (variant) {
    case 'primary':
      return {
        background: COLORS.primary.main,
        text: COLORS.text.inverse
      };
    case 'secondary':
      return {
        background: COLORS.secondary.main,
        text: COLORS.text.inverse
      };
    case 'outline':
      return {
        background: 'transparent',
        text: COLORS.primary.main,
        border: COLORS.primary.main
      };
    default:
      return {
        background: COLORS.primary.main,
        text: COLORS.text.inverse
      };
  }
};

/**
 * Button component that implements Material Design principles and supports
 * different variants, states, and loading indicators.
 * 
 * Addresses requirements:
 * - Mobile Applications: React Native driver application UI component
 * - Offline-first architecture: Visual feedback for disabled states
 * - Digital proof of delivery: Interactive button for POD submission
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  accessibilityLabel,
  testID
}) => {
  // Memoized press handler to prevent unnecessary re-renders
  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  // Get appropriate colors based on variant and state
  const colors = getButtonColors(variant, disabled);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: variant === 'outline' ? styles.outline.borderWidth : 0,
          opacity: disabled ? 0.6 : 1
        },
        style
      ]}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading
      }}
      testID={testID}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={colors.text}
          style={styles.loading}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: colors.text }
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Styles following Material Design specifications
 */
const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    minWidth: 120
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false
  },
  loading: {
    marginRight: 8
  },
  outline: {
    borderWidth: 1
  }
});

export default Button;