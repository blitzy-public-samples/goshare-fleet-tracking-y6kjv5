/* HUMAN TASKS:
1. Verify Material-UI theme customization matches design system
2. Test alert auto-dismiss behavior across different browsers
3. Validate ARIA labels and accessibility features
4. Test alert animations with reduced motion preferences
*/

// @mui/material version: ^5.0.0
// @mui/icons-material version: ^5.0.0
// React version: ^18.0.0

import React, { useEffect, useState } from 'react';
import { Alert as MuiAlert } from '@mui/material';
import {
  ErrorIcon,
  WarningIcon,
  InfoIcon,
  CheckCircleIcon
} from '@mui/icons-material';
import '../../styles/components.css';

// Requirement: Real-time System Operation
// Location: 1.2 Scope/Performance Requirements
// Implementation: Alert component for displaying real-time system notifications
interface AlertProps {
  message: string;
  title: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  autoHideDuration?: number;
  duration?: number;
  onClose?: () => void;
  action?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  message,
  title,
  severity,
  autoHideDuration = false,
  duration = 6000,
  onClose,
  action
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Requirement: Real-time System Operation
  // Location: 1.2 Scope/Performance Requirements
  // Implementation: Auto-dismiss functionality for transient alerts
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoHideDuration && isVisible) {
      timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          onClose();
        }
      }, duration);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [autoHideDuration, duration, isVisible, onClose]);

  // Requirement: Real-time System Operation
  // Location: 1.2 Scope/Performance Requirements
  // Implementation: Alert dismissal handler
  const handleClose = (event: React.SyntheticEvent) => {
    if (event) {
      event.preventDefault();
    }
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  // Requirement: Two-way Communication System
  // Location: 1.2 Scope/Core Functionality
  // Implementation: Alert icon selection based on severity
  const getAlertIcon = (severity: 'error' | 'warning' | 'info' | 'success'): React.ReactNode => {
    switch (severity) {
      case 'error':
        return <ErrorIcon className="alert-icon" />;
      case 'warning':
        return <WarningIcon className="alert-icon" />;
      case 'info':
        return <InfoIcon className="alert-icon" />;
      case 'success':
        return <CheckCircleIcon className="alert-icon" />;
      default:
        return <InfoIcon className="alert-icon" />;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <MuiAlert
      severity={severity}
      onClose={handleClose}
      icon={getAlertIcon(severity)}
      className="alert-root"
      elevation={6}
      variant="filled"
    >
      <div className="alert-content">
        {title && (
          <div className="alert-title">
            {title}
          </div>
        )}
        <div className="alert-message">
          {message}
        </div>
        {action && (
          <div className="alert-action d-flex align-items-center">
            {action}
          </div>
        )}
      </div>
    </MuiAlert>
  );
};

export default Alert;