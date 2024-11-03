/**
 * HUMAN TASKS:
 * 1. Verify that the Material Icons font is properly linked in the Android/iOS projects
 * 2. Ensure proper status bar configuration in native Android/iOS projects
 * 3. Configure proper navigation gesture handling in native layers
 */

// Third-party imports - versions specified for security auditing
import React from 'react'; // ^18.2.0
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native'; // ^0.72.0
import Icon from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0
import { useNavigation } from '@react-navigation/native'; // ^6.1.0

// Internal imports
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';

// Constants for Material Design specifications
const HEADER_HEIGHT = 56; // Standard Material Design header height
const ICON_SIZE = 24; // Standard Material Design icon size
const ICON_COLOR = COLORS.text.inverse;

// Props interface following Material Design patterns
interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
}

/**
 * Header component for mobile driver application with navigation controls and user status
 * Requirement: Mobile Applications - Consistent UI components and offline-first architecture
 * Requirement: Digital proof of delivery capabilities - UI components with consistent navigation patterns
 */
export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBack = false, 
  showMenu = false 
}) => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  /**
   * Handles navigation back action with state preservation
   * Requirement: Consistent navigation patterns
   */
  const handleBackPress = (): void => {
    navigation.goBack();
  };

  /**
   * Handles menu toggle action for navigation drawer
   * Requirement: Consistent navigation patterns
   */
  const handleMenuPress = (): void => {
    navigation.openDrawer();
  };

  return (
    <>
      {/* Status bar configuration for consistent UI */}
      <StatusBar
        backgroundColor={COLORS.primary.dark}
        barStyle="light-content"
      />
      
      {/* Header container with Material Design styling */}
      <View style={styles.container}>
        {/* Left section with navigation controls */}
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="arrow-back" size={ICON_SIZE} color={ICON_COLOR} />
            </TouchableOpacity>
          )}
          {showMenu && (
            <TouchableOpacity
              onPress={handleMenuPress}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Icon name="menu" size={ICON_SIZE} color={ICON_COLOR} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center section with title */}
        <View style={styles.centerSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right section with user status */}
        <View style={styles.rightSection}>
          {isAuthenticated && user && (
            <View style={styles.userStatus}>
              <Icon 
                name="account-circle" 
                size={ICON_SIZE} 
                color={ICON_COLOR}
                style={styles.userIcon}
              />
              <View style={styles.onlineIndicator} />
            </View>
          )}
        </View>
      </View>
    </>
  );
};

// Styles following Material Design guidelines
const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.grey[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  leftSection: {
    flexDirection: 'row',
    minWidth: 48,
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  rightSection: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text.inverse,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'left',
  },
  userStatus: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIcon: {
    opacity: 0.9,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.status.success,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
});

export default Header;