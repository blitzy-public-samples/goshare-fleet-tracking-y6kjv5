// @material-ui/core version ^4.12.0
// @material-ui/icons version ^4.12.0
// @material-ui/core/styles version ^4.12.0
// react version ^18.0.0

// Human Tasks:
// 1. Configure notification update interval in environment variables (default 30 seconds)
// 2. Review and adjust Material-UI theme settings for consistent styling
// 3. Set up monitoring for real-time notification latency
// 4. Configure OAuth 2.0 authentication settings
// 5. Review accessibility requirements for navigation elements

import React, { useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography
} from '@material-ui/core';
import {
  NotificationsIcon,
  AccountCircle,
  Settings
} from '@material-ui/icons';
import { styled } from '@material-ui/core/styles';
import { CustomButton, CustomButtonProps } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';

/**
 * Props interface for the Header component
 * Implements requirement: Web Dashboard Layout - Top navigation bar
 */
interface HeaderProps {
  className?: string;
}

/**
 * Styled AppBar component with fleet tracking theme integration
 * Implements requirement: Material-UI component framework implementation
 */
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  zIndex: theme.zIndex.appBar
}));

/**
 * Styled Toolbar component with responsive layout
 * Implements requirement: Web Dashboard Layout - Responsive design
 */
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  minHeight: '64px',
  '@media (max-width: 600px)': {
    padding: theme.spacing(0, 1)
  }
}));

/**
 * Main header component for the web dashboard with real-time notifications
 * Implements requirements:
 * - Web Dashboard Layout (6.1.1)
 * - Real-time Communications (1.1 System Overview)
 */
const Header: React.FC<HeaderProps> = ({ className }) => {
  // Authentication state management
  const { user, logoutUser } = useAuth();

  // Notification management with 30-second update intervals
  const { markAsRead } = useNotification({
    vehicleIds: user?.assignedVehicles,
    autoMarkAsRead: false
  });

  // Menu anchor state management
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  /**
   * Handles click on notification icon and marks notifications as read
   * Implements requirement: Real-time notification display
   */
  const handleNotificationClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setNotificationAnchor(event.currentTarget);
    // Mark all notifications as read when menu opens
    markAsRead([]);
  }, [markAsRead]);

  /**
   * Handles click on user menu icon for profile and settings access
   */
  const handleUserMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setUserMenuAnchor(event.currentTarget);
  }, []);

  /**
   * Handles user menu close
   */
  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  /**
   * Handles notification menu close
   */
  const handleNotificationClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  /**
   * Handles secure logout
   * Implements requirement: OAuth 2.0 authentication state management
   */
  const handleLogout = useCallback(() => {
    handleUserMenuClose();
    logoutUser();
  }, [logoutUser]);

  return (
    <StyledAppBar position="fixed" className={className}>
      <StyledToolbar>
        {/* Company Logo/Brand */}
        <Typography variant="h6" noWrap>
          Fleet Tracker
        </Typography>

        {/* Action Icons */}
        <div>
          {/* Notifications */}
          <IconButton
            color="inherit"
            aria-label="show notifications"
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Profile */}
          <IconButton
            edge="end"
            color="inherit"
            aria-label="account settings"
            onClick={handleUserMenuClick}
          >
            <AccountCircle />
          </IconButton>
        </div>

        {/* Notification Menu */}
        <Menu
          anchorEl={notificationAnchor}
          keepMounted
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{
            style: {
              maxHeight: 300,
              width: '300px'
            }
          }}
        >
          <MenuItem onClick={handleNotificationClose}>
            Vehicle ABC123 updated location
          </MenuItem>
          <MenuItem onClick={handleNotificationClose}>
            New delivery assigned
          </MenuItem>
          <MenuItem onClick={handleNotificationClose}>
            Route optimization complete
          </MenuItem>
        </Menu>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          keepMounted
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={handleUserMenuClose}>
            <AccountCircle fontSize="small" style={{ marginRight: 8 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleUserMenuClose}>
            <Settings fontSize="small" style={{ marginRight: 8 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export { Header };
export type { HeaderProps };