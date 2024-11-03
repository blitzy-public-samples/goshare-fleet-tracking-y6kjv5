/**
 * @fileoverview A customizable status bar component for the mobile driver application
 * that provides consistent status bar behavior across iOS and Android platforms.
 * 
 * Addresses requirements:
 * - Mobile Applications: React Native driver applications requiring consistent UI components
 * - Cross-platform compatibility: Ensuring consistent status bar behavior
 * 
 * Human Tasks:
 * 1. Ensure the app's Info.plist (iOS) has UIViewControllerBasedStatusBarAppearance set to false
 * 2. Verify Android styles.xml has appropriate status bar configuration
 */

// React - v18.0.0
import React, { useCallback } from 'react';
// React Native - v0.72.0
import { StatusBar as RNStatusBar, StatusBarStyle } from 'react-native';
// Internal imports
import { COLORS } from '../../constants/colors';

/**
 * Props interface for the StatusBar component defining customization options
 */
interface StatusBarProps {
  /**
   * Custom background color for the status bar
   * @default COLORS.primary.main
   */
  backgroundColor?: string;
  
  /**
   * Whether the status bar is translucent (Android only)
   * @default false
   */
  translucent?: boolean;
  
  /**
   * Whether the status bar should be hidden
   * @default false
   */
  hidden?: boolean;
  
  /**
   * Whether changes should be animated
   * @default true
   */
  animated?: boolean;
}

/**
 * Converts a hex color to RGB values
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const formattedHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(formattedHex);
  
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

/**
 * Updates the status bar style based on background color brightness
 * to ensure text readability
 */
const setStatusBarStyle = useCallback((backgroundColor: string): StatusBarStyle => {
  const { r, g, b } = hexToRgb(backgroundColor);
  // Calculate color brightness using W3C formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return appropriate status bar style based on background brightness
  return brightness >= 128 ? 'dark-content' : 'light-content';
}, []);

/**
 * CustomStatusBar component for consistent status bar styling across the application
 */
const CustomStatusBar: React.FC<StatusBarProps> = ({
  backgroundColor = COLORS.primary.main,
  translucent = false,
  hidden = false,
  animated = true
}) => {
  // Determine status bar style based on background color
  const barStyle = setStatusBarStyle(backgroundColor);

  return (
    <RNStatusBar
      backgroundColor={backgroundColor}
      barStyle={barStyle}
      translucent={translucent}
      hidden={hidden}
      animated={animated}
    />
  );
};

export default CustomStatusBar;