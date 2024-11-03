/**
 * @fileoverview A reusable modal component for the mobile driver application
 * that provides a customizable overlay dialog with content, backdrop, and animation support.
 * 
 * Addresses requirements:
 * - Mobile Applications: React Native driver application requiring modal dialogs for user interactions
 * - Digital proof of delivery capabilities: Modal component used in proof of delivery workflows
 * 
 * Human tasks:
 * 1. Ensure react-native-reanimated is installed and properly linked if using custom animations
 * 2. Test modal behavior with different device orientations
 * 3. Verify modal accessibility features with screen readers
 */

// External dependencies
import React, { useEffect, useState } from 'react'; // ^18.0.0
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native'; // ^0.71.0

// Internal dependencies
import { COLORS } from '../../constants/colors';

/**
 * Props interface for the Modal component
 */
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationEnabled?: boolean;
  backdropColor?: string;
  contentContainerStyle?: ViewStyle;
}

/**
 * Custom hook to manage modal animation value
 */
const useAnimatedValue = (): Animated.Value => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  return animation;
};

/**
 * CustomModal component providing a reusable modal dialog with animation support
 */
export const CustomModal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  animationEnabled = true,
  backdropColor,
  contentContainerStyle,
}) => {
  const animation = useAnimatedValue();

  const animatedStyle = animationEnabled
    ? {
        transform: [
          {
            scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }),
          },
        ],
        opacity: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      }
    : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationEnabled ? 'fade' : 'none'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={[
          styles.container,
          backdropColor && { backgroundColor: backdropColor },
        ]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <Animated.View
            style={[
              styles.content,
              animatedStyle,
              contentContainerStyle,
            ]}
          >
            {children}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * Styles for the modal component
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: COLORS.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});