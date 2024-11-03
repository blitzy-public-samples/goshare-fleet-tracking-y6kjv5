/**
 * HUMAN TASKS:
 * 1. Verify @expo/vector-icons is installed with version ^13.0.0
 * 2. Test tab navigation performance with large datasets
 * 3. Verify tab bar appearance on different Android versions
 */

// Third-party imports - versions specified for security and compatibility
import React from 'react'; // ^18.0.0
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // ^6.0.0
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import Dashboard from '../screens/home/Dashboard';
import Messages from '../screens/home/Messages';
import Notifications from '../screens/home/Notifications';
import { ROUTES } from '../constants/navigation';

/**
 * Type definition for home stack navigation parameters
 * Requirement: Mobile Driver App Layout (6.1.2)
 */
type HomeStackParamList = {
  Dashboard: undefined;
  Messages: undefined;
  Notifications: undefined;
};

// Create bottom tab navigator
const Tab = createBottomTabNavigator<HomeStackParamList>();

/**
 * Returns the appropriate icon for each tab based on route name and focus state
 * Requirement: Mobile Driver App Layout (6.1.2)
 */
const getTabBarIcon = (routeName: string, focused: boolean): JSX.Element => {
  let iconName: keyof typeof MaterialIcons.glyphMap;

  switch (routeName) {
    case ROUTES.HOME.DASHBOARD:
      iconName = 'home';
      break;
    case ROUTES.HOME.MESSAGES:
      iconName = 'message';
      break;
    case ROUTES.HOME.NOTIFICATIONS:
      iconName = 'notifications';
      break;
    default:
      iconName = 'error';
  }

  return (
    <MaterialIcons
      name={iconName}
      size={24}
      color={focused ? '#007AFF' : '#8E8E93'}
    />
  );
};

/**
 * Bottom tab navigator for home stack screens
 * Implements requirements:
 * - Mobile Driver App Layout (6.1.2): Bottom tab bar navigation structure
 * - Mobile Applications (1.1): React Native driver application
 * - Two-way communication system (1.2): Message and notification management
 */
const HomeNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          backgroundColor: '#FFFFFF',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600'
        }
      })}
    >
      <Tab.Screen
        name={ROUTES.HOME.DASHBOARD}
        component={Dashboard}
        options={{
          title: 'Dashboard',
          headerTitle: 'Driver Dashboard'
        }}
      />
      <Tab.Screen
        name={ROUTES.HOME.MESSAGES}
        component={Messages}
        options={{
          title: 'Messages',
          headerTitle: 'Messages'
        }}
      />
      <Tab.Screen
        name={ROUTES.HOME.NOTIFICATIONS}
        component={Notifications}
        options={{
          title: 'Notifications',
          headerTitle: 'Notifications'
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeNavigator;