// @material-ui/core version ^4.12.0
// @material-ui/core/styles version ^4.12.0
// react version ^18.0.0

import React from 'react';
import { Button as MuiButton } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { ButtonProps } from '../../types';

// Human Tasks:
// 1. Verify theme configuration is properly set up in the application
// 2. Ensure color palette values are defined in theme for all button variants
// 3. Review accessibility requirements for button contrast ratios
// 4. Confirm button size specifications with design team

/**
 * Custom button props interface extending Material-UI ButtonProps
 * Implements requirement: Web Dashboard UI Framework
 */
interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

/**
 * Styled button component with custom theme properties
 * Implements requirement: Material-UI component framework implementation
 */
const StyledButton = styled(MuiButton)(({ theme, size, variant }) => ({
  padding: theme.spacing(1, 2),
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  
  // Variant-specific styles
  ...(variant === 'primary' && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  
  ...(variant === 'secondary' && {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.secondary.dark,
    },
  }),
  
  ...(variant === 'outlined' && {
    border: `1px solid ${theme.palette.primary.main}`,
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  }),
  
  ...(variant === 'text' && {
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  }),
  
  // Size-specific styles
  ...(size === 'small' && {
    padding: theme.spacing(0.5, 1),
    fontSize: '0.875rem',
  }),
  
  ...(size === 'medium' && {
    padding: theme.spacing(1, 2),
    fontSize: '1rem',
  }),
  
  ...(size === 'large' && {
    padding: theme.spacing(1.5, 3),
    fontSize: '1.125rem',
  }),
  
  // Disabled state
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },
}));

/**
 * Custom button component for fleet tracking system
 * Implements requirements:
 * - Interactive Fleet Management Dashboard
 * - Web Dashboard UI Framework
 */
const CustomButton: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  startIcon,
  endIcon,
  onClick,
  children,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant === 'text' || variant === 'outlined' ? variant : 'contained'}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export { CustomButton };
export type { CustomButtonProps };