/**
 * HUMAN TASKS:
 * 1. Verify proper SSL certificate pinning for secure navigation
 * 2. Test offline navigation behavior with various network conditions
 * 3. Validate accessibility features for screen readers
 * 4. Ensure proper error message translations are configured
 */

// Third-party imports - versions specified for security auditing
import React from 'react'; // ^18.0.0
import { NavigationContainer } from '@react-navigation/native'; // ^6.0.0
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // ^6.0.0
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator';
import RouteNavigator from './RouteNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import SettingsNavigator from './SettingsNavigator';
import { useAuth } from '../hooks/useAuth';

/**
 * Type definitions for root tab navigation parameters
 * Requirements addressed:
 * - Mobile Applications: Type-safe navigation implementation
 */
type RootTabParamList = {
  Home: undefined;
  Routes: undefined;
  Deliveries: undefined;
  Settings: undefined;
};

// Create bottom tab navigator with type safety
const Tab = createBottomTabNavigator<RootTabParamList>();

// Constants for consistent styling
const TAB_ICON_SIZE = 24;
const TAB_BAR_HEIGHT = 60;

/**
 * Function to get the appropriate Material icon for each tab
 * Requirements addressed:
 * - Mobile Applications: Consistent navigation UI with Material Design
 */
const getTabBarIcon = (routeName: string, focused: boolean): JSX.Element => {
  let iconName: keyof typeof MaterialIcons.glyphMap;

  switch (routeName) {
    case 'Home':
      iconName = 'home';
      break;
    case 'Routes':
      iconName = 'map-marker';
      break;
    case 'Deliveries':
      iconName = 'local-shipping';
      break;
    case 'Settings':
      iconName = 'settings';
      break;
    default:
      iconName = 'error';
  }

  return (
    <MaterialIcons
      name={iconName}
      size={TAB_ICON_SIZE}
      color={focused ? '#007AFF' : '#8E8E93'}
    />
  );
};

/**
 * Main navigation container component that manages the overall navigation structure
 * Requirements addressed:
 * - Mobile Applications: React Native driver application with comprehensive navigation
 * - Offline-first architecture: Navigation handling with offline support
 * - Real-time GPS tracking: Integration with location tracking through navigation
 */
const AppNavigator: React.FC = () => {
  // Get authentication state using useAuth hook
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Show authentication navigator when not authenticated
        <AuthNavigator />
      ) : (
        // Show main app navigation when authenticated
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            headerShown: false,
            tabBarStyle: {
              height: TAB_BAR_HEIGHT,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E5E5',
              paddingBottom: 5,
              paddingTop: 5,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
              marginBottom: 5,
            },
          })}
        >
          {/* Home Tab - Dashboard, Messages, and Notifications */}
          <Tab.Screen
            name="Home"
            component={HomeNavigator}
            options={{
              title: 'Home',
            }}
          />

          {/* Routes Tab - Route list, details, and active route tracking */}
          <Tab.Screen
            name="Routes"
            component={RouteNavigator}
            options={{
              title: 'Routes',
            }}
          />

          {/* Deliveries Tab - Delivery management and proof of delivery */}
          <Tab.Screen
            name="Deliveries"
            component={DeliveryNavigator}
            options={{
              title: 'Deliveries',
            }}
          />

          {/* Settings Tab - App, location, and notification settings */}
          <Tab.Screen
            name="Settings"
            component={SettingsNavigator}
            options={{
              title: 'Settings',
            }}
          />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;