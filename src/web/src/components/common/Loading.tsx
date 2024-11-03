// @material-ui/core version: ^4.12.0

import React from 'react';
import { CircularProgress, Box } from '@material-ui/core';
import '../styles/components.css';

// Requirement: Web Dashboard UI Framework
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Material-UI component framework for consistent loading indicators
interface LoadingProps {
  size?: number;
  overlay?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

// Requirement: Real-time Data Visualization
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Loading state visualization for real-time data updates
const Loading: React.FC<LoadingProps> = ({
  size = 40,
  overlay = false,
  color = 'primary'
}) => {
  // Requirement: Cross-Platform Compatibility
  // Location: 1.2 Scope/Performance Requirements
  // Implementation: Responsive loading indicators that work across different browsers and devices
  if (overlay) {
    return (
      <Box
        className="loading-overlay"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={9999}
        bgcolor="rgba(255, 255, 255, 0.8)"
      >
        <CircularProgress
          className="loading-spinner"
          size={size}
          color={color}
        />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={2}
    >
      <CircularProgress
        className="loading-spinner"
        size={size}
        color={color}
      />
    </Box>
  );
};

export default Loading;