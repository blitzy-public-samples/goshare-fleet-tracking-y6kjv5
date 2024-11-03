/**
 * @fileoverview A reusable loading indicator component for the mobile driver application
 * that provides visual feedback during asynchronous operations and data loading states.
 * 
 * Addresses requirements:
 * - Mobile Applications: React Native driver applications requiring consistent loading states
 * - Offline-first architecture: Visual feedback during offline data synchronization
 */

import React from 'react'; // ^18.0.0
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // ^0.70.0
import { COLORS } from '../../constants/colors';

/**
 * Props interface for the Loading component
 */
interface LoadingProps {
  /**
   * Size of the loading indicator
   * @default 'large'
   */
  size?: 'small' | 'large';
  
  /**
   * Color of the loading indicator
   * @default COLORS.primary.main
   */
  color?: string;
  
  /**
   * Whether to display the loader in full screen mode
   * @default false
   */
  fullScreen?: boolean;
}

/**
 * A customizable loading indicator component that provides visual feedback
 * during async operations
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color = COLORS.primary.main,
  fullScreen = false
}) => {
  return (
    <View style={[
      styles.container,
      fullScreen && styles.fullScreen
    ]}>
      <ActivityIndicator
        size={size}
        color={color}
        testID="loading-indicator"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 999
  }
});

export default Loading;