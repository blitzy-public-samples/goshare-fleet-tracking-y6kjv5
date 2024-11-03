/**
 * @fileoverview Unit test suite for React Native mobile application UI components
 * Testing functionality, interactions, and rendering across different states and conditions
 * 
 * Human Tasks:
 * 1. Verify that all test cases pass on both iOS and Android platforms
 * 2. Validate accessibility testing with actual screen readers
 * 3. Add additional edge cases based on real-world usage patterns
 */

// React 18.0.0
import React from 'react';
// @testing-library/react-native 12.0.0
import { render, fireEvent, waitFor } from '@testing-library/react-native';
// @jest/globals 29.0.0
import { describe, test, expect, jest } from '@jest/globals';

// Internal component imports
import Button, { ButtonProps, ButtonVariant } from '../../src/components/common/Button';
import Card, { CardProps } from '../../src/components/common/Card';
import DeliveryCard, { DeliveryCardProps } from '../../src/components/delivery/DeliveryCard';

/**
 * Test suite for Button component
 * Addresses requirement: Mobile Applications - Testing React Native driver applications
 */
describe('Button Component', () => {
  // Mock function for testing button interactions
  const mockOnPress = jest.fn();

  // Default props for button tests
  const defaultProps: ButtonProps = {
    title: 'Test Button',
    onPress: mockOnPress,
    testID: 'test-button'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with title correctly and proper accessibility', () => {
    const { getByText, getByRole } = render(<Button {...defaultProps} />);
    
    const button = getByText('Test Button');
    const accessibleButton = getByRole('button');
    
    expect(button).toBeTruthy();
    expect(accessibleButton).toBeTruthy();
    expect(accessibleButton.props.accessibilityLabel).toBe('Test Button');
  });

  test('handles onPress events and provides feedback', () => {
    const { getByTestId } = render(<Button {...defaultProps} />);
    
    const button = getByTestId('test-button');
    fireEvent.press(button);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('shows ActivityIndicator when loading prop is true', () => {
    const { getByTestId } = render(
      <Button {...defaultProps} loading={true} testID="loading-button" />
    );
    
    const button = getByTestId('loading-button');
    expect(button.props.accessibilityState.busy).toBe(true);
  });

  test('prevents interaction when disabled prop is true', () => {
    const { getByTestId } = render(
      <Button {...defaultProps} disabled={true} testID="disabled-button" />
    );
    
    const button = getByTestId('disabled-button');
    fireEvent.press(button);
    
    expect(mockOnPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  test.each<ButtonVariant>(['primary', 'secondary', 'outline'])(
    'applies correct Material Design styles for %s variant',
    (variant) => {
      const { getByTestId } = render(
        <Button {...defaultProps} variant={variant} testID={`${variant}-button`} />
      );
      
      const button = getByTestId(`${variant}-button`);
      const styles = button.props.style;
      
      if (variant === 'outline') {
        expect(styles).toHaveProperty('borderWidth', 1);
      } else {
        expect(styles).toHaveProperty('borderWidth', 0);
      }
    }
  );
});

/**
 * Test suite for Card component
 * Addresses requirement: Mobile Applications - Testing React Native driver applications
 */
describe('Card Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children content correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Test Content</Text>
      </Card>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  test('handles onPress events with proper feedback', () => {
    const { getByTestId } = render(
      <Card onPress={mockOnPress} testID="touchable-card">
        <Text>Touchable Card</Text>
      </Card>
    );
    
    const card = getByTestId('touchable-card');
    fireEvent.press(card);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('applies elevation shadow styles correctly', () => {
    const elevation = 8;
    const { getByTestId } = render(
      <Card elevation={elevation} testID="elevated-card">
        <Text>Elevated Card</Text>
      </Card>
    );
    
    const card = getByTestId('elevated-card');
    expect(card.props.style).toContainEqual(expect.objectContaining({ elevation }));
  });

  test('prevents interaction when disabled', () => {
    const { getByTestId } = render(
      <Card onPress={mockOnPress} disabled={true} testID="disabled-card">
        <Text>Disabled Card</Text>
      </Card>
    );
    
    const card = getByTestId('disabled-card');
    fireEvent.press(card);
    
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  test('combines custom styles with default styles', () => {
    const customStyle = { backgroundColor: 'red', margin: 20 };
    const { getByTestId } = render(
      <Card style={customStyle} testID="styled-card">
        <Text>Styled Card</Text>
      </Card>
    );
    
    const card = getByTestId('styled-card');
    expect(card.props.style).toContainEqual(expect.objectContaining(customStyle));
  });
});

/**
 * Test suite for DeliveryCard component
 * Addresses requirement: Offline-first architecture - Validating component behavior
 */
describe('DeliveryCard Component', () => {
  // Mock delivery data for testing
  const mockDelivery = {
    id: 'test-delivery-1',
    status: 'IN_PROGRESS',
    address: '123 Test St, Test City, 12345',
    customer: {
      id: 'cust-1',
      name: 'John Doe',
      phone: '+1234567890'
    }
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders delivery information in correct format', () => {
    const { getByText, getByLabelText } = render(
      <DeliveryCard delivery={mockDelivery} />
    );
    
    expect(getByText(mockDelivery.address)).toBeTruthy();
    expect(getByText(mockDelivery.customer.name)).toBeTruthy();
    expect(getByLabelText(`Delivery address: ${mockDelivery.address}`)).toBeTruthy();
  });

  test('displays correct status color for each state', () => {
    const statuses = ['COMPLETED', 'IN_PROGRESS', 'FAILED', 'PENDING'];
    
    statuses.forEach(status => {
      const { getByText } = render(
        <DeliveryCard 
          delivery={{ ...mockDelivery, status }} 
          testID={`${status}-card`}
        />
      );
      
      const statusElement = getByText(status);
      expect(statusElement.parent.props.style).toContainEqual(
        expect.objectContaining({
          backgroundColor: expect.any(String)
        })
      );
    });
  });

  test('handles onPress events for delivery selection', () => {
    const { getByTestId } = render(
      <DeliveryCard 
        delivery={mockDelivery} 
        onPress={mockOnPress}
        testID="touchable-delivery-card"
      />
    );
    
    const card = getByTestId('touchable-delivery-card');
    fireEvent.press(card);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('shows formatted address and customer details', () => {
    const { getByText } = render(
      <DeliveryCard delivery={mockDelivery} />
    );
    
    const addressElement = getByText(mockDelivery.address);
    const customerElement = getByText(mockDelivery.customer.name);
    
    expect(addressElement.props.numberOfLines).toBe(2);
    expect(customerElement.props.numberOfLines).toBe(1);
  });

  test('prevents interaction when disabled', () => {
    const { getByTestId } = render(
      <DeliveryCard 
        delivery={mockDelivery}
        onPress={mockOnPress}
        disabled={true}
        testID="disabled-delivery-card"
      />
    );
    
    const card = getByTestId('disabled-delivery-card');
    fireEvent.press(card);
    
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});