/**
 * HUMAN TASKS:
 * 1. Verify navigation transitions are smooth on both iOS and Android
 * 2. Test deep linking to settings screens
 * 3. Ensure proper header styling across different device sizes
 * 4. Validate back navigation behavior and state preservation
 */

// React and Navigation imports - versions specified for security
import React from 'react'; // ^18.0.0
import { createStackNavigator } from '@react-navigation/stack'; // ^6.0.0

// Screen components
import AppSettings from '../screens/settings/AppSettings';
import LocationSettings from '../screens/settings/LocationSettings';
import NotificationSettings from '../screens/settings/NotificationSettings';

// Navigation constants
import { ROUTES } from '../constants/navigation';

// Type definitions for the settings stack
type SettingsStackParamList = {
  [ROUTES.SETTINGS.APP]: undefined;
  [ROUTES.SETTINGS.LOCATION]: undefined;
  [ROUTES.SETTINGS.NOTIFICATION]: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator<SettingsStackParamList>();

/**
 * Returns default screen options for the settings stack
 * Implements requirement: Mobile Driver App Layout - Consistent navigation styling
 */
const getScreenOptions = () => ({
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 1, // Android shadow
    shadowOpacity: 0.1, // iOS shadow
  },
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitleAlign: 'center' as const,
  cardStyle: { backgroundColor: '#FFFFFF' },
  // Horizontal slide transition
  animationEnabled: true,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
});

/**
 * SettingsNavigator component managing navigation between settings screens
 * Implements requirements:
 * - Mobile Applications: Settings management for React Native driver application
 * - Mobile Driver App Layout: Navigation structure for settings screens
 * - Real-time GPS tracking: Access to location settings with 30-second intervals
 */
const SettingsNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.SETTINGS.APP}
      screenOptions={getScreenOptions}
    >
      {/* Main App Settings Screen */}
      <Stack.Screen
        name={ROUTES.SETTINGS.APP}
        component={AppSettings}
        options={{
          title: 'Settings',
        }}
      />

      {/* Location Settings Screen */}
      <Stack.Screen
        name={ROUTES.SETTINGS.LOCATION}
        component={LocationSettings}
        options={{
          title: 'Location Settings',
          headerBackTitleVisible: false,
        }}
      />

      {/* Notification Settings Screen */}
      <Stack.Screen
        name={ROUTES.SETTINGS.NOTIFICATION}
        component={NotificationSettings}
        options={{
          title: 'Notifications',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsNavigator;