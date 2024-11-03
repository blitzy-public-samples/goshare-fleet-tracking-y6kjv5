// @material-ui/core version: ^4.12.0

import React from 'react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@material-ui/core';
import { select, input } from '../../styles/components.css';

// Requirement: Web Dashboard UI Framework
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Type definitions for select component options and props
interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  name: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  className?: string;
}

// Requirement: Interactive Fleet Management Dashboard
// Location: 1.2 Scope/Core Functionality
// Implementation: Reusable select component for fleet management operations
const Select: React.FC<SelectProps> = ({
  name,
  label,
  value,
  onChange,
  options,
  disabled = false,
  error = false,
  helperText,
  className,
}) => {
  // Requirement: Interactive Fleet Management Dashboard
  // Location: 1.2 Scope/Core Functionality
  // Implementation: Handle select value changes with type safety
  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newValue = event.target.value;
    if (typeof newValue === 'string' || typeof newValue === 'number') {
      onChange(newValue);
    }
  };

  return (
    // Requirement: Web Dashboard UI Framework
    // Location: 1.1 System Overview/Web Dashboard
    // Implementation: Material-UI form control with consistent styling
    <FormControl
      fullWidth
      error={error}
      disabled={disabled}
      className={`${select} ${className || ''}`}
    >
      {/* Requirement: Cross-Platform Compatibility
          Location: 1.2 Scope/Performance Requirements
          Implementation: Accessible label for screen readers */}
      <InputLabel id={`${name}-label`} className={input}>
        {label}
      </InputLabel>

      {/* Requirement: Interactive Fleet Management Dashboard
          Location: 1.2 Scope/Core Functionality
          Implementation: Material-UI select with controlled value */}
      <MuiSelect
        labelId={`${name}-label`}
        id={name}
        value={value}
        onChange={handleChange}
        variant="outlined"
        className={input}
      >
        {/* Requirement: Interactive Fleet Management Dashboard
            Location: 1.2 Scope/Core Functionality
            Implementation: Render select options from provided array */}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>

      {/* Requirement: Web Dashboard UI Framework
          Location: 1.1 System Overview/Web Dashboard
          Implementation: Helper text for additional context */}
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

// Export component and type interfaces for use in fleet management forms
export type { SelectOption, SelectProps };
export default Select;