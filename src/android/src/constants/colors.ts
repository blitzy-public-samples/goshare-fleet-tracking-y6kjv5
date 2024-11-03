/**
 * @fileoverview Color palette constants for the mobile driver application
 * following Material Design principles.
 * 
 * Addresses requirements:
 * - Mobile Applications: Consistent theming and branding for React Native apps
 * - Digital proof of delivery: Consistent color schemes for POD screens
 * - Mobile Driver App: Visual styling consistency
 */

/**
 * Primary brand colors used for main UI elements
 * Following Material Design color system
 */
const PRIMARY_COLORS = {
  main: '#1976D2',  // Primary brand color
  light: '#42A5F5', // Light variant for hover states
  dark: '#1565C0'   // Dark variant for active states
};

/**
 * Secondary colors used for accents and calls to action
 * Complementary to primary colors
 */
const SECONDARY_COLORS = {
  main: '#FF9800',  // Secondary brand color
  light: '#FFB74D', // Light variant for hover states
  dark: '#F57C00'   // Dark variant for active states
};

/**
 * Greyscale palette for neutral UI elements
 * Used for backgrounds, borders, and text
 */
const GREY_SCALE = {
  50: '#FAFAFA',   // Lightest grey - subtle backgrounds
  100: '#F5F5F5',  // Paper backgrounds
  200: '#EEEEEE',  // Disabled backgrounds
  300: '#E0E0E0',  // Borders
  400: '#BDBDBD',  // Disabled text
  500: '#9E9E9E',  // Secondary text
  600: '#757575',  // Secondary text (darker)
  700: '#616161',  // Primary text
  800: '#424242',  // Dark text
  900: '#212121'   // Darkest - high emphasis text
};

/**
 * Background colors for different surface types
 */
const BACKGROUND_COLORS = {
  default: '#FFFFFF', // Default background
  paper: '#F5F5F5',   // Elevated surface background
  disabled: '#EEEEEE' // Disabled component background
};

/**
 * Text colors for different typography contexts
 */
const TEXT_COLORS = {
  primary: '#212121',   // Primary text
  secondary: '#757575', // Secondary text
  disabled: '#9E9E9E',  // Disabled text
  inverse: '#FFFFFF'    // Text on dark backgrounds
};

/**
 * Status colors for different states and feedback
 */
const STATUS_COLORS = {
  success: '#4CAF50', // Success states and completed deliveries
  warning: '#FFC107', // Warning states and delayed deliveries
  error: '#F44336',   // Error states and failed deliveries
  info: '#2196F3'     // Information states and active deliveries
};

/**
 * Exported color palette object containing all color definitions
 * for consistent usage throughout the application
 */
export const COLORS = {
  primary: PRIMARY_COLORS,
  secondary: SECONDARY_COLORS,
  grey: GREY_SCALE,
  background: BACKGROUND_COLORS,
  text: TEXT_COLORS,
  status: STATUS_COLORS
};