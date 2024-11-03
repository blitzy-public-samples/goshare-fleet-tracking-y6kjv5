// Third-party imports
import React, { useEffect, useState } from 'react'; // ^18.2.0
import { TextInput, View, Text, StyleSheet } from 'react-native'; // ^0.71.0

// Internal imports
import { COLORS } from '../../constants/colors';
import { validateEmail, validatePhoneNumber } from '../../utils/validation';

// HUMAN TASKS:
// 1. Configure regional phone number validation settings in app configuration
// 2. Set up proper input masking rules for phone numbers based on region
// 3. Configure proper keyboard types for different input types in app settings

/**
 * Interface for Input component props
 * Requirement: Mobile Applications - Consistent form inputs
 */
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label?: string;
  error?: string;
  type?: 'text' | 'email' | 'phone';
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

/**
 * Reusable input component with built-in validation and Material Design styling
 * Requirements addressed:
 * - Mobile Applications: Consistent form inputs across the app
 * - Digital proof of delivery: Input validation for POD forms
 * - Data Security: Input validation and sanitization
 */
export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  type = 'text',
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);

  /**
   * Handles input validation based on type
   * Requirement: Data Security - Input validation for secure data handling
   */
  const handleValidation = (text: string, inputType: string): boolean => {
    switch (inputType) {
      case 'email':
        return validateEmail(text);
      case 'phone':
        // Using 'US' as default region - should be configurable
        return validatePhoneNumber(text, 'US');
      default:
        return text.length > 0;
    }
  };

  /**
   * Validates input on value change
   * Requirement: Digital proof of delivery - Form validation
   */
  useEffect(() => {
    if (value) {
      setIsValid(handleValidation(value, type));
    } else {
      setIsValid(true);
    }
  }, [value, type]);

  /**
   * Updates input state when disabled prop changes
   */
  useEffect(() => {
    if (disabled) {
      setIsFocused(false);
    }
  }, [disabled]);

  /**
   * Determines input style based on state
   */
  const getInputStyle = () => {
    return [
      styles.input,
      isFocused && { borderColor: COLORS.primary.main },
      !isValid && styles.inputError,
      disabled && styles.inputDisabled,
      error && styles.inputError
    ];
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grey[400]}
        style={getInputStyle()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        testID="input-field"
        accessibilityLabel={label || placeholder}
        accessibilityHint={`Enter ${label || placeholder}`}
        accessibilityState={{
          disabled: disabled,
          invalid: !isValid || !!error
        }}
      />
      
      {(error || !isValid) && (
        <Text style={styles.errorText}>
          {error || `Invalid ${type} format`}
        </Text>
      )}
    </View>
  );
};

/**
 * Styles following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grey[300],
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.default
  },
  inputError: {
    borderColor: COLORS.status.error
  },
  inputDisabled: {
    backgroundColor: COLORS.grey[200],
    color: COLORS.text.disabled
  },
  errorText: {
    color: COLORS.status.error,
    fontSize: 12,
    marginTop: 4
  }
});

// Export interface for external use
export type { InputProps };