/**
 * @fileoverview A reusable card component for the mobile driver application that provides
 * a consistent container with elevation, padding, and styling for content display.
 * 
 * Human Tasks:
 * 1. Verify that the shadow implementation works correctly on different Android versions
 * 2. Test touch feedback behavior on various Android devices
 * 3. Validate accessibility features with screen readers
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native'; // ^0.72.0
import { COLORS } from '../../constants/colors';

/**
 * Props interface for the Card component defining its customization and behavior options
 * Addresses requirement: Mobile Driver App - Consistent UI components
 */
export interface CardProps {
  /** Content to be rendered inside the card */
  children: React.ReactNode;
  /** Additional styles to be applied to the card container */
  style?: ViewStyle;
  /** Custom elevation value for Android shadow (default: 5) */
  elevation?: number;
  /** Optional callback for touch events */
  onPress?: () => void;
  /** Whether the card is in a disabled state */
  disabled?: boolean;
}

/**
 * A reusable card component that provides a consistent container with elevation,
 * padding, and styling for content display.
 * 
 * Addresses requirements:
 * - Mobile Driver App: React Native driver applications requiring consistent UI components
 * - Offline-first architecture: UI components that work consistently in both online and offline states
 * - Mobile Applications: Mobile application requiring consistent visual styling and user interaction patterns
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 5,
  onPress,
  disabled = false
}) => {
  /**
   * Handles the onPress event when the card is touchable,
   * providing haptic feedback when enabled
   */
  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  // If the card is touchable (has onPress), wrap content in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.container,
          { elevation },
          disabled && styles.disabled,
          style
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Otherwise render as a static View
  return (
    <View
      style={[
        styles.container,
        { elevation },
        disabled && styles.disabled,
        style
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Styles for the Card component following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: COLORS.grey[900],
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  disabled: {
    backgroundColor: COLORS.background.disabled,
    opacity: 0.7
  }
});