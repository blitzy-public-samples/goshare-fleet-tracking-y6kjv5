/**
 * HUMAN TASKS:
 * 1. Verify proper navigation configuration in app settings
 * 2. Test deep linking behavior for route-related screens
 * 3. Verify proper screen transitions on different Android devices
 * 4. Test navigation state persistence during offline mode
 */

// Third-party imports - versions specified for security and compatibility
import React from 'react'; // ^18.0.0
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'; // ^6.0.0

// Internal imports
import RouteList from '../screens/route/RouteList';
import RouteDetails from '../screens/route/RouteDetails';
import ActiveRoute from '../screens/route/ActiveRoute';

/**
 * Type definitions for route stack navigation parameters
 * Implements requirement: Interactive route management and navigation between route-related screens
 */
export interface RouteStackParamList {
  RouteList: undefined;
  RouteDetails: {
    routeId: string;
    isActive: boolean;
  };
  ActiveRoute: {
    routeId: string;
  };
}

// Initialize stack navigator with RouteStackParamList type
const Stack = createStackNavigator<RouteStackParamList>();

/**
 * Main navigation component for route-related screens with offline support
 * Implements requirements:
 * - Mobile Driver App: React Native driver applications with offline-first architecture
 * - Route optimization and planning: Interactive route management and navigation
 * - Real-time GPS tracking: Integration with real-time location tracking at 30-second intervals
 */
const RouteNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="RouteList"
      screenOptions={{
        // Material Design styling
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600'
        },
        cardStyle: {
          backgroundColor: '#FFFFFF'
        },
        // iOS-style transitions for smooth navigation
        ...TransitionPresets.SlideFromRightIOS,
        // Enable gesture-based navigation
        gestureEnabled: true,
        // Enable header back button
        headerBackTitleVisible: false
      }}
    >
      {/* Route List Screen */}
      <Stack.Screen
        name="RouteList"
        component={RouteList}
        options={{
          title: 'Routes',
          headerLeft: () => null, // Disable back button for root screen
        }}
      />

      {/* Route Details Screen */}
      <Stack.Screen
        name="RouteDetails"
        component={RouteDetails}
        options={{
          title: 'Route Details',
          // Enable swipe back gesture
          gestureEnabled: true,
          // Customize header appearance
          headerTitleAlign: 'center',
        }}
      />

      {/* Active Route Screen */}
      <Stack.Screen
        name="ActiveRoute"
        component={ActiveRoute}
        options={{
          title: 'Active Route',
          // Disable swipe back for active route to prevent accidental navigation
          gestureEnabled: false,
          // Prevent going back without proper route completion
          headerLeft: () => null,
          // Customize header appearance
          headerTitleAlign: 'center',
        }}
      />
    </Stack.Navigator>
  );
};

export default RouteNavigator;