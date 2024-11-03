/**
 * HUMAN TASKS:
 * 1. Configure proper SSL certificate pinning for authentication endpoints
 * 2. Set up proper keychain/keystore access for secure token storage
 * 3. Verify proper encryption settings for authentication state
 * 4. Test navigation flow with various network conditions
 */

// Third-party imports - versions specified for security auditing
import React from 'react'; // ^18.0.0
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack'; // ^6.0.0

// Internal imports
import Login from '../screens/auth/Login';
import Profile from '../screens/auth/Profile';

/**
 * Type definition for authentication stack navigation parameters
 * Requirements addressed:
 * - Mobile Applications: Type-safe navigation implementation
 */
type AuthStackParamList = {
  Login: undefined;
  Profile: undefined;
};

// Create stack navigator with type safety
const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Default screen options following Material Design principles
 * Requirements addressed:
 * - Mobile Applications: Consistent navigation UI
 */
const screenOptions: StackNavigationOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: '#FFFFFF',
  },
  headerTintColor: '#000000',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  cardStyle: {
    backgroundColor: '#FFFFFF',
  },
};

/**
 * Authentication navigation stack component that manages the navigation flow
 * between authentication-related screens
 * 
 * Requirements addressed:
 * - Mobile Applications: React Native driver application navigation implementation
 * - Digital proof of delivery: Driver authentication and profile management
 * - Security and encryption: Secure navigation with protected routes
 */
const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName="Login"
    >
      {/* 
        Login screen with offline support and secure token management
        Requirements addressed:
        - Mobile Applications: Secure authentication flow
        - Security and encryption: Protected authentication routes
      */}
      <Stack.Screen
        name="Login"
        component={Login}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* 
        Profile screen with secure data handling
        Requirements addressed:
        - Digital proof of delivery: Profile management
        - Security and encryption: Secure data handling
      */}
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Driver Profile',
          headerLeft: () => null, // Prevent back navigation from profile
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;