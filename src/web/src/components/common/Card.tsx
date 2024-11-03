/* HUMAN TASKS:
1. Verify Material-UI version 4.12.0 is installed and compatible
2. Test responsive behavior across different screen sizes
3. Validate accessibility features with screen readers
4. Ensure theme.css and components.css are properly imported in the build
*/

// @material-ui/core version: ^4.12.0
import React from 'react';
import { Card as MuiCard, CardHeader, CardContent, CardActions } from '@material-ui/core';
import '../../styles/theme.css';
import '../../styles/components.css';

/**
 * Requirement: Web Dashboard UI Framework
 * Location: 1.1 System Overview/Web Dashboard
 * Implementation: Material-UI based card component with consistent styling
 */
interface CardProps {
  title?: string;
  subheader?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  elevation?: number;
}

/**
 * Requirement: Cross-Platform Compatibility
 * Location: 1.2 Scope/Performance Requirements
 * Implementation: Responsive and accessible card component
 */
const Card: React.FC<CardProps> = ({
  title,
  subheader,
  children,
  actions,
  className = '',
  elevation = 2
}) => {
  // Combine custom class with base card class
  const cardClassName = `card ${className}`.trim();

  // Map elevation level to theme variables
  const elevationClass = `elevation-${Math.min(Math.max(elevation, 1), 4)}`;

  return (
    <MuiCard 
      className={cardClassName}
      style={{
        boxShadow: `var(--${elevationClass})`,
        margin: 'var(--spacing-md) 0',
        borderRadius: '8px'
      }}
      // Accessibility attributes
      role="article"
      aria-labelledby={title ? 'card-title' : undefined}
    >
      {/* Render header if title or subheader is provided */}
      {(title || subheader) && (
        <CardHeader
          id="card-title"
          title={title}
          subheader={subheader}
          style={{
            padding: 'var(--spacing-md)',
            borderBottom: title || subheader ? '1px solid var(--border-color)' : 'none'
          }}
          titleTypographyProps={{
            style: {
              fontSize: 'var(--font-size-h5)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)'
            }
          }}
          subheaderTypographyProps={{
            style: {
              fontSize: 'var(--font-size-base)',
              color: 'var(--text-secondary)'
            }
          }}
        />
      )}

      {/* Card content with consistent padding */}
      <CardContent
        style={{
          padding: 'var(--spacing-md)',
          '&:last-child': {
            paddingBottom: actions ? 'var(--spacing-md)' : 'var(--spacing-md)'
          }
        }}
      >
        {children}
      </CardContent>

      {/* Render actions if provided */}
      {actions && (
        <CardActions
          style={{
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            justifyContent: 'flex-end'
          }}
        >
          {actions}
        </CardActions>
      )}
    </MuiCard>
  );
};

export default Card;