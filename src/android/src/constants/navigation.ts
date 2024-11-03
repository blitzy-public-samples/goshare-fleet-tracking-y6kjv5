// @react-navigation/native version: ^6.0.0
import { NavigationProp } from '@react-navigation/native';

/**
 * Human Tasks:
 * 1. Ensure @react-navigation/native is installed with version ^6.0.0
 * 2. Configure navigation container in the root App component
 * 3. Set up stack navigators for each navigation stack (AUTH, HOME, DELIVERY, ROUTE, SETTINGS)
 */

/**
 * Addresses requirements:
 * - Mobile Driver App Layout (6.1.2): Navigation structure and screen organization
 * - Mobile Navigation: Bottom tab navigation with route screens, delivery management, and settings
 */

/**
 * Route name constants for consistent screen routing across the application
 */
export const ROUTES = {
  AUTH: {
    LOGIN: 'Login',
    PROFILE: 'Profile'
  },
  HOME: {
    DASHBOARD: 'Dashboard',
    MESSAGES: 'Messages',
    NOTIFICATIONS: 'Notifications'
  },
  DELIVERY: {
    LIST: 'DeliveryList',
    DETAILS: 'DeliveryDetails',
    COMPLETE: 'DeliveryComplete',
    PROOF: 'ProofOfDelivery'
  },
  ROUTE: {
    LIST: 'RouteList',
    DETAILS: 'RouteDetails',
    ACTIVE: 'ActiveRoute'
  },
  SETTINGS: {
    APP: 'AppSettings',
    LOCATION: 'LocationSettings',
    NOTIFICATION: 'NotificationSettings'
  }
} as const;

/**
 * Navigation stack names enum for type-safe stack navigation
 */
export enum NavigationScreens {
  AUTH_STACK = 'AuthStack',
  HOME_STACK = 'HomeStack',
  DELIVERY_STACK = 'DeliveryStack',
  ROUTE_STACK = 'RouteStack',
  SETTINGS_STACK = 'SettingsStack'
}

/**
 * Type definition for root navigation stack parameters
 * Ensures type safety in navigation between stacks
 */
export interface RootStackParamList {
  [NavigationScreens.AUTH_STACK]: undefined;
  [NavigationScreens.HOME_STACK]: undefined;
  [NavigationScreens.DELIVERY_STACK]: undefined;
  [NavigationScreens.ROUTE_STACK]: undefined;
  [NavigationScreens.SETTINGS_STACK]: undefined;
}

/**
 * Type definition for navigation props used across the application
 * Provides type-safe navigation methods and parameters
 */
export interface NavigationProps {
  navigation: NavigationProp<RootStackParamList>;
}