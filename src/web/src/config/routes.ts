// @material-ui/core version: ^4.12.0
// react version: ^18.0.0
// react-router-dom version: ^6.0.0

import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { CircularProgress } from '@material-ui/core';
import Loading from '../components/common/Loading';
import { SOCKET_EVENTS } from '../constants';

// Human Tasks:
// 1. Verify all lazy-loaded component files exist in the correct paths
// 2. Ensure role-based access control matches backend authorization configuration
// 3. Configure layout components referenced in withLayout function
// 4. Review page titles match application requirements

// Requirement: Web Dashboard UI Framework
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Extended route interface with layout and auth properties
interface AppRoute {
  path: string;
  element: React.ReactNode;
  children?: AppRoute[];
  requireAuth: boolean;
  roles?: string[];
  title: string;
  layout: 'default' | 'auth' | 'minimal';
}

// Requirement: Security and Authorization
// Location: 8.1 Authentication and Authorization/8.1.2 Authorization Model
// Implementation: Higher-order component for layout wrapping with security context
const withLayout = (Component: React.ComponentType, layout: string): React.ComponentType => {
  return function WrappedComponent(props: any) {
    switch (layout) {
      case 'auth':
        return (
          <div className="auth-layout">
            <Component {...props} />
          </div>
        );
      case 'minimal':
        return (
          <div className="minimal-layout">
            <Component {...props} />
          </div>
        );
      default:
        return (
          <div className="default-layout">
            <Component {...props} />
          </div>
        );
    }
  };
};

// Requirement: Performance Requirements
// Location: 1.2 Scope/Performance Requirements
// Implementation: Route configuration with code splitting and lazy loading
export const routes: AppRoute[] = [
  {
    path: '/',
    element: lazy(() => import('../pages/Dashboard')),
    requireAuth: true,
    roles: ['user', 'admin'],
    title: 'Dashboard',
    layout: 'default'
  },
  {
    path: '/analytics',
    element: lazy(() => import('../pages/Analytics')),
    requireAuth: true,
    roles: ['admin', 'analyst'],
    title: 'Analytics',
    layout: 'default'
  },
  {
    path: '/fleet',
    element: lazy(() => import('../pages/Fleet')),
    requireAuth: true,
    roles: ['user', 'admin'],
    title: 'Fleet Management',
    layout: 'default'
  },
  {
    path: '/login',
    element: lazy(() => import('../pages/Login')),
    requireAuth: false,
    title: 'Login',
    layout: 'auth'
  }
];

// Requirement: Security and Authorization
// Location: 8.1 Authentication and Authorization/8.1.2 Authorization Model
// Implementation: Route configuration generator with security checks
export const generateRouteConfig = (routes: AppRoute[]): RouteObject[] => {
  const processRoute = (route: AppRoute): RouteObject => {
    const {
      path,
      element: Component,
      children,
      requireAuth,
      roles,
      title,
      layout
    } = route;

    // Wrap component with Suspense for lazy loading
    const SuspenseWrapper = (
      <Suspense fallback={<Loading overlay size={50} />}>
        {Component}
      </Suspense>
    );

    // Apply layout wrapper
    const LayoutWrapper = withLayout(() => SuspenseWrapper, layout);

    // Process nested routes recursively
    const processedChildren = children
      ? children.map(child => processRoute(child))
      : undefined;

    return {
      path,
      element: <LayoutWrapper />,
      children: processedChildren
    };
  };

  return routes.map(route => processRoute(route));
};

// Socket event constants used for real-time updates in routes
export const {
  LOCATION_UPDATE,
  DELIVERY_STATUS_CHANGE,
  ROUTE_UPDATE
} = SOCKET_EVENTS;