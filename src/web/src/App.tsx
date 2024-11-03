// @material-ui/core version: ^5.0.0
// react version: ^18.0.0
// react-router-dom version: ^6.0.0
// react-redux version: ^8.1.0

// Human Tasks:
// 1. Configure OAuth 2.0 client credentials in environment variables
// 2. Set up SSL certificates for secure communication
// 3. Configure CORS settings for API endpoints
// 4. Review session timeout settings
// 5. Set up error tracking service integration

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { generateRouteConfig } from './config/routes';
import { useAuth } from './hooks/useAuth';
import Loading from './components/common/Loading';
import store from './store';
import theme from './config/theme';

// Requirement: Authentication and Authorization
// Location: 8.1 Authentication and Authorization/8.1.1 Authentication Methods
// Implementation: Initial authentication check on application mount
const checkInitialAuth = async (): Promise<void> => {
  const { checkAuthStatus } = useAuth();
  try {
    await checkAuthStatus();
  } catch (error) {
    console.error('Authentication check failed:', error);
  }
};

// Requirement: Web Dashboard
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Root application component with Material-UI and routing
const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Requirement: Authentication and Authorization
  // Location: 8.1 Authentication and Authorization/8.1.1 Authentication Methods
  // Implementation: Check authentication status on mount
  useEffect(() => {
    checkInitialAuth();
  }, []);

  // Show loading state during initial authentication check
  if (isLoading) {
    return <Loading size={50} overlay />;
  }

  // Requirement: Real-time Communications
  // Location: 1.1 System Overview/Core Backend Services
  // Implementation: Application wrapper with all required providers
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Suspense fallback={<Loading size={50} overlay />}>
            <Routes>
              {generateRouteConfig(routes).map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={route.element}
                >
                  {route.children?.map((childRoute, childIndex) => (
                    <Route
                      key={childIndex}
                      path={childRoute.path}
                      element={childRoute.element}
                    />
                  ))}
                </Route>
              ))}
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

// Requirement: Web Dashboard
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Default export of root application component
export default App;