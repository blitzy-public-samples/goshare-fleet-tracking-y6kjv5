// @mui/material version ^5.0.0
import { TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';
import { theme } from '../../config/theme';
import { isValidEmail, isValidPhoneNumber } from '../../utils/validation';

/*
Human Tasks:
1. Verify that Material-UI v5 is installed with correct peer dependencies
2. Ensure theme.ts is properly configured with custom input styles
3. Test input validation with various data formats
4. Verify accessibility compliance with WCAG guidelines
*/

// Styled TextField component with theme integration
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.components?.MuiTextField?.styleOverrides?.root?.borderRadius,
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-error fieldset': {
      borderColor: theme.palette.error.main,
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    fontSize: '0.75rem',
  },
}));

// Input component props interface
interface InputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  type: 'text' | 'email' | 'tel' | 'password' | 'number';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
}

// Validate input based on type
const validateInput = (type: string, value: string): boolean => {
  // Return true if value is empty (required validation is handled separately)
  if (!value) return true;

  switch (type) {
    case 'email':
      // Requirement: Data validation and integrity - RFC 5322 compliant email validation
      return isValidEmail(value);
    case 'tel':
      // Requirement: Data validation and integrity - E.164 compliant phone number validation
      return isValidPhoneNumber(value);
    case 'number':
      // Validate numeric value range
      return !isNaN(Number(value)) && Number.isFinite(Number(value));
    case 'password':
      // Validate minimum security requirements
      return value.length >= 8 && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value);
    case 'text':
      // Validate against XSS and injection patterns
      return !/[<>{}]/g.test(value);
    default:
      return true;
  }
};

// Input component with Material-UI integration and validation
const Input: React.FC<InputProps> = ({
  id,
  name,
  label,
  value,
  type,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  onChange,
  onBlur,
}) => {
  // State for internal validation
  const [internalError, setInternalError] = React.useState<string>('');

  // Handle input validation on blur
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const isValid = validateInput(type, event.target.value);
    if (!isValid) {
      setInternalError(
        type === 'email'
          ? 'Please enter a valid email address'
          : type === 'tel'
          ? 'Please enter a valid phone number'
          : type === 'password'
          ? 'Password must be at least 8 characters with letters and numbers'
          : type === 'number'
          ? 'Please enter a valid number'
          : 'Please enter valid input'
      );
    } else {
      setInternalError('');
    }
    onBlur(event);
  };

  // Requirement: Web Dashboard UI Framework - Material-UI component framework implementation
  return (
    <StyledTextField
      id={id}
      name={name}
      label={label}
      value={value}
      type={type}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      error={Boolean(error || internalError)}
      helperText={error || internalError || helperText}
      onChange={onChange}
      onBlur={handleBlur}
      fullWidth
      variant="outlined"
      margin="normal"
      InputLabelProps={{
        shrink: true,
        style: {
          fontFamily: theme.typography.fontFamily,
          color: error || internalError ? theme.palette.error.main : theme.palette.text.secondary,
        },
      }}
      InputProps={{
        style: {
          fontFamily: theme.typography.fontFamily,
        },
      }}
      FormHelperTextProps={{
        style: {
          fontFamily: theme.typography.fontFamily,
          color: error || internalError ? theme.palette.error.main : theme.palette.text.secondary,
        },
      }}
    />
  );
};

export default Input;