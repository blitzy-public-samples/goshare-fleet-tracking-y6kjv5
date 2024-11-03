/**
 * @fileoverview A reusable card component that displays delivery information in the mobile driver application.
 * 
 * Human Tasks:
 * 1. Verify accessibility labels and hints are appropriate for screen readers
 * 2. Test color contrast ratios for status indicators meet WCAG guidelines
 * 3. Validate touch target sizes on different device sizes
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native'; // ^0.72.0
import { Card, CardProps } from '../common/Card';
import { Delivery, DeliveryStatus } from '../../types';
import { COLORS } from '../../constants/colors';

/**
 * Props interface for the DeliveryCard component
 * Addresses requirement: Mobile Driver App - Delivery management capabilities
 */
export interface DeliveryCardProps {
  /** Delivery data object containing id, status, address, and customer information */
  delivery: Delivery;
  /** Callback function triggered when the card is pressed */
  onPress?: () => void;
  /** Flag to disable card interaction */
  disabled?: boolean;
  /** Additional styles to be applied to the card container */
  style?: ViewStyle;
}

/**
 * Returns the appropriate color for the delivery status based on Material Design guidelines
 * Addresses requirement: Mobile Driver App - Visual status indicators
 */
const getStatusColor = (status: DeliveryStatus): string => {
  switch (status) {
    case DeliveryStatus.COMPLETED:
      return COLORS.status.success;
    case DeliveryStatus.IN_PROGRESS:
      return COLORS.status.warning;
    case DeliveryStatus.FAILED:
      return COLORS.status.error;
    case DeliveryStatus.PENDING:
    default:
      return COLORS.status.info;
  }
};

/**
 * A reusable card component that displays delivery information with status indicators
 * and interaction capabilities.
 * 
 * Addresses requirements:
 * - Mobile Driver App: React Native driver applications with delivery management capabilities
 * - Digital proof of delivery: UI components for managing digital proof of delivery workflows
 * - Offline-first architecture: Components that work consistently in both online and offline states
 */
export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onPress,
  disabled = false,
  style
}) => {
  /**
   * Handles the card press event with disabled state check
   * Addresses requirement: Mobile Driver App - User interaction handling
   */
  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <Card
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
      elevation={3}
    >
      <View style={styles.content}>
        <View style={styles.details}>
          <Text 
            style={styles.address}
            numberOfLines={2}
            accessibilityLabel={`Delivery address: ${delivery.address}`}
          >
            {delivery.address}
          </Text>
          <Text 
            style={styles.customer}
            numberOfLines={1}
            accessibilityLabel={`Customer: ${delivery.customer.name}`}
          >
            {delivery.customer.name}
          </Text>
          <View 
            style={[
              styles.statusContainer,
              { backgroundColor: getStatusColor(delivery.status) }
            ]}
          >
            <Text 
              style={styles.statusText}
              accessibilityLabel={`Status: ${delivery.status}`}
            >
              {delivery.status}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

/**
 * Styles for the DeliveryCard component following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  details: {
    flex: 1
  },
  address: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 4
  },
  customer: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text.inverse
  }
});