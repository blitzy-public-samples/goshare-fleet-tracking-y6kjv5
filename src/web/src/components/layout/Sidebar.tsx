// @mui/material version: ^5.0.0
// @mui/material/styles version: ^5.0.0
// react version: ^18.0.0
// react-router-dom version: ^6.0.0

// Human Tasks:
// 1. Configure Material-UI theme with proper color scheme
// 2. Review role-based access permissions with security team
// 3. Verify navigation item icons match design system
// 4. Test responsive behavior across different screen sizes

import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Divider,
  Badge,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  DirectionsCar as FleetIcon,
  Route as RouteIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../config/routes';
import { VEHICLE_STATUS } from '../../constants';

// Requirement: Web Dashboard UI Framework
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Styled components for responsive sidebar
const StyledDrawer = styled(Drawer)(({ theme, width }) => ({
  width: width,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  '& .MuiDrawer-paper': {
    width: width,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

const StyledListItem = styled(ListItem)(({ theme, active }) => ({
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '4px 8px',
  cursor: 'pointer',
  backgroundColor: active ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// Interfaces based on JSON specification
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  width: number;
}

interface NavItem {
  title: string;
  path: string;
  roles: string[];
  icon: React.ReactNode;
  children?: NavItem[];
}

// Navigation items configuration with role-based access
const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    roles: ['user', 'admin'],
    icon: <DashboardIcon />,
  },
  {
    title: 'Fleet Management',
    path: '/fleet',
    roles: ['user', 'admin'],
    icon: <FleetIcon />,
    children: [
      {
        title: 'Active Vehicles',
        path: '/fleet/active',
        roles: ['user', 'admin'],
        icon: <Badge color="success" variant="dot"><FleetIcon /></Badge>,
      },
      {
        title: 'Maintenance',
        path: '/fleet/maintenance',
        roles: ['admin'],
        icon: <Badge color="warning" variant="dot"><FleetIcon /></Badge>,
      },
    ],
  },
  {
    title: 'Routes',
    path: '/routes',
    roles: ['user', 'admin'],
    icon: <RouteIcon />,
  },
  {
    title: 'Analytics',
    path: '/analytics',
    roles: ['admin', 'analyst'],
    icon: <AnalyticsIcon />,
  },
  {
    title: 'Settings',
    path: '/settings',
    roles: ['admin'],
    icon: <SettingsIcon />,
  },
];

// Requirement: Authentication and Authorization
// Location: 8.1 Authentication and Authorization/8.1.2 Authorization Model
// Implementation: Sidebar component with role-based access control
const Sidebar: React.FC<SidebarProps> = ({ open, onClose, width }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Handle navigation item expansion
  const handleExpand = useCallback((title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  }, []);

  // Check if user has access to the navigation item
  const hasAccess = useCallback((roles: string[]) => {
    if (!user || !isAuthenticated) return false;
    return roles.includes(user.role);
  }, [user, isAuthenticated]);

  // Check if the path is active
  const isActivePath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location]);

  // Render navigation item with proper styling and access control
  const renderNavItem = (item: NavItem) => {
    if (!hasAccess(item.roles)) return null;

    const isActive = isActivePath(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);

    return (
      <React.Fragment key={item.path}>
        <StyledListItem
          active={isActive ? 1 : 0}
          onClick={() => {
            if (hasChildren) {
              handleExpand(item.title);
            } else {
              navigate(item.path);
            }
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.title} />
          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </StyledListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => 
                hasAccess(child.roles) && (
                  <StyledListItem
                    key={child.path}
                    active={isActivePath(child.path) ? 1 : 0}
                    sx={{ pl: 4 }}
                    onClick={() => navigate(child.path)}
                  >
                    <ListItemIcon>{child.icon}</ListItemIcon>
                    <ListItemText primary={child.title} />
                  </StyledListItem>
                )
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <StyledDrawer
      variant="permanent"
      open={open}
      width={width}
      PaperProps={{
        elevation: 2,
        sx: {
          backgroundColor: 'background.paper',
          overflowX: 'hidden',
        },
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
        <IconButton onClick={onClose}>
          <ChevronLeft />
        </IconButton>
      </div>
      <Divider />
      <List>
        {navigationItems.map(item => renderNavItem(item))}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;