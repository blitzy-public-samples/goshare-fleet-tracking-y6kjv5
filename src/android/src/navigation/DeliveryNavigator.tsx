/**
 * HUMAN TASKS:
 * 1. Verify proper navigation configuration in navigation stack
 * 2. Test offline functionality with various network conditions
 * 3. Validate accessibility features for screen readers
 * 4. Ensure proper error message translations are configured
 */

// Third-party imports - versions specified in package.json
import React from 'react'; // ^18.0.0
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // ^6.0.0

// Internal imports
import DeliveryListScreen from '../screens/delivery/DeliveryList';
import DeliveryDetailsScreen from '../screens/delivery/DeliveryDetails';
import ProofOfDeliveryScreen from '../screens/delivery/ProofOfDelivery';
import DeliveryCompleteScreen from '../screens/delivery/DeliveryComplete';

/**
 * Type definitions for delivery stack navigation parameters with strict typing
 * Implements requirement: Type-safe routing system
 */
export type DeliveryStackParamList = {
  DeliveryList: undefined;
  DeliveryDetails: {
    deliveryId: string;
  };
  ProofOfDelivery: {
    deliveryId: string;
  };
  DeliveryComplete: {
    deliveryId: string;
  };
};

// Create native stack navigator with type safety
const Stack = createNativeStackNavigator<DeliveryStackParamList>();

/**
 * Material Design screen options for consistent UI
 * Implements requirement: Material Design principles
 */
const screenOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: '#FFFFFF'
  },
  headerTintColor: '#000000',
  headerTitleStyle: {
    fontWeight: 'bold'
  },
  animation: 'slide_from_right',
  // Enable hardware back button handling
  headerBackTitleVisible: false,
  // Enable gesture-based navigation
  gestureEnabled: true,
  // Prevent gesture-based navigation when offline sync is in progress
  gestureEnabled: true,
  // Add accessibility labels
  headerAccessibilityLabel: 'Navigation header'
};

/**
 * DeliveryNavigator component that manages the delivery-related screen stack navigation
 * with offline-first support and Material Design principles.
 * 
 * Implements requirements:
 * - Mobile driver applications: React Native driver applications with delivery management
 * - Digital proof of delivery: Integrated navigation flow for proof of delivery
 * - Offline operation support: Seamless navigation between delivery screens
 */
const DeliveryNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="DeliveryList"
      screenOptions={screenOptions}
    >
      {/* Delivery List Screen */}
      <Stack.Screen
        name="DeliveryList"
        component={DeliveryListScreen}
        options={{
          title: 'Deliveries',
          headerLargeTitle: true,
          // Enable pull-to-refresh functionality
          headerLargeTitleStyle: {
            fontSize: 34
          }
        }}
      />

      {/* Delivery Details Screen */}
      <Stack.Screen
        name="DeliveryDetails"
        component={DeliveryDetailsScreen}
        options={{
          title: 'Delivery Details',
          // Enable swipe back gesture
          gestureEnabled: true,
          // Add accessibility hint
          headerAccessibilityHint: 'View delivery details'
        }}
      />

      {/* Proof of Delivery Screen */}
      <Stack.Screen
        name="ProofOfDelivery"
        component={ProofOfDeliveryScreen}
        options={{
          title: 'Proof of Delivery',
          // Disable gesture navigation during signature/photo capture
          gestureEnabled: false,
          // Prevent accidental back navigation
          headerBackVisible: false,
          // Add accessibility hint
          headerAccessibilityHint: 'Capture proof of delivery'
        }}
      />

      {/* Delivery Complete Screen */}
      <Stack.Screen
        name="DeliveryComplete"
        component={DeliveryCompleteScreen}
        options={{
          title: 'Complete Delivery',
          // Prevent back navigation after completion
          headerLeft: () => null,
          // Add accessibility hint
          headerAccessibilityHint: 'Delivery completion confirmation'
        }}
      />
    </Stack.Navigator>
  );
};

export default DeliveryNavigator;