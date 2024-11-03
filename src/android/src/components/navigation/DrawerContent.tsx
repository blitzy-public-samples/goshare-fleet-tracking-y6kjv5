/**
 * HUMAN TASKS:
 * 1. Ensure @expo/vector-icons is installed with version ^13.0.0
 * 2. Configure proper drawer navigation in the root App component
 * 3. Set up proper theme colors for drawer styling
 * 4. Verify proper navigation stack configuration
 */

// Third-party imports - versions specified for security auditing
import React, { FC } from 'react'; // ^18.2.0
import { StyleSheet, View, Text } from 'react-native'; // ^0.72.0
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer'; // ^6.0.0
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/navigation';

/**
 * Custom drawer content component for navigation that displays user profile and navigation options
 * Implements requirements from:
 * - Mobile Driver App Layout (6.1.2): Navigation structure including drawer navigation
 * - Mobile Applications (1.1): React Native driver applications with offline-first architecture
 */
const DrawerContent: FC<DrawerContentProps> = ({ navigation }) => {
  // Get authentication state and logout function
  const { user, logout, loading } = useAuth();

  /**
   * Handles user logout action with loading state management
   * Requirement: Secure authentication integration with proper state handling
   */
  const handleLogout = async (): Promise<void> => {
    if (loading) return;
    try {
      await logout();
      // Navigation will automatically redirect to login due to auth state change
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <DrawerContentScrollView>
      {/* User Profile Section */}
      <View style={styles.userSection}>
        <MaterialIcons name="account-circle" size={48} color="#666666" />
        <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* Navigation Items Section */}
      <View style={styles.drawerSection}>
        {/* Dashboard Navigation */}
        <DrawerItem
          icon={({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          )}
          label="Dashboard"
          onPress={() => navigation.navigate(ROUTES.HOME.DASHBOARD)}
        />

        {/* Routes Navigation */}
        <DrawerItem
          icon={({ color, size }) => (
            <MaterialIcons name="route" color={color} size={size} />
          )}
          label="Routes"
          onPress={() => navigation.navigate(ROUTES.ROUTE.LIST)}
        />

        {/* Deliveries Navigation */}
        <DrawerItem
          icon={({ color, size }) => (
            <MaterialIcons name="local-shipping" color={color} size={size} />
          )}
          label="Deliveries"
          onPress={() => navigation.navigate(ROUTES.DELIVERY.LIST)}
        />

        {/* Settings Navigation */}
        <DrawerItem
          icon={({ color, size }) => (
            <MaterialIcons name="settings" color={color} size={size} />
          )}
          label="Settings"
          onPress={() => navigation.navigate(ROUTES.SETTINGS.APP)}
        />
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <DrawerItem
          icon={({ color, size }) => (
            <MaterialIcons name="logout" color={color} size={size} />
          )}
          label={loading ? 'Logging out...' : 'Logout'}
          onPress={handleLogout}
          disabled={loading}
        />
      </View>
    </DrawerContentScrollView>
  );
};

/**
 * Styles for drawer content components
 * Implements consistent styling with proper spacing and borders
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  drawerSection: {
    marginTop: 16,
  },
  logoutSection: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 16,
  },
});

export default DrawerContent;