/**
 * HUMAN TASKS:
 * 1. Ensure @react-navigation/bottom-tabs is installed with version ^6.0.0
 * 2. Ensure @expo/vector-icons is installed with version ^13.0.0
 * 3. Configure proper navigation theme colors in the app theme
 */

// Third-party imports with versions for security auditing
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // ^6.0.0
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0
import { useTheme } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { ROUTES, NavigationScreens } from '../../constants/navigation';
import { useAuth } from '../../hooks/useAuth';

// Screens
import ActiveRoute from '../../screens/route/ActiveRoute';
import DeliveryList from '../../screens/delivery/DeliveryList';
import Messages from '../../screens/home/Messages';
import Profile from '../../screens/auth/Profile';

// Constants for tab bar styling
const TAB_ICON_SIZE = 24;
const TAB_BAR_HEIGHT = 60;

// Create bottom tab navigator
const Tab = createBottomTabNavigator();

// Interface for tab bar icon props
interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

/**
 * Gets the appropriate Material icon for each tab with proper styling
 * Requirement: Visual feedback for active tab state (6.1.2 Mobile Driver App Layout)
 */
const getTabBarIcon = (routeName: string, focused: boolean) => {
  return ({ color, size }: TabBarIconProps) => {
    let iconName: keyof typeof MaterialIcons.glyphMap = 'error';

    switch (routeName) {
      case ROUTES.ROUTE.ACTIVE:
        iconName = 'route';
        break;
      case ROUTES.DELIVERY.LIST:
        iconName = 'local-shipping';
        break;
      case ROUTES.HOME.MESSAGES:
        iconName = 'message';
        break;
      case ROUTES.AUTH.PROFILE:
        iconName = 'person';
        break;
    }

    return (
      <MaterialIcons
        name={iconName}
        size={size}
        color={color}
        style={{ opacity: focused ? 1 : 0.7 }}
      />
    );
  };
};

/**
 * Main bottom tab navigation component that renders the primary navigation interface
 * Requirement: Bottom tab bar navigation providing access to Active Route, Deliveries, Messages, and Profile screens
 */
const BottomTabs = () => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => 
          getTabBarIcon(route.name, focused)({ color, size, focused }),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.ROUTE.ACTIVE}
        component={ActiveRoute}
        options={{
          title: 'Active Route',
        }}
      />
      
      <Tab.Screen
        name={ROUTES.DELIVERY.LIST}
        component={DeliveryList}
        options={{
          title: 'Deliveries',
        }}
      />
      
      <Tab.Screen
        name={ROUTES.HOME.MESSAGES}
        component={Messages}
        options={{
          title: 'Messages',
        }}
      />
      
      {isAuthenticated && (
        <Tab.Screen
          name={ROUTES.AUTH.PROFILE}
          component={Profile}
          options={{
            title: 'Profile',
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default BottomTabs;