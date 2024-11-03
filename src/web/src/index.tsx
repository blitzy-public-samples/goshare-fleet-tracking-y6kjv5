// Human Tasks:
// 1. Configure error tracking service credentials in environment variables
// 2. Set up performance monitoring service integration
// 3. Configure real-time data synchronization intervals in environment
// 4. Review and adjust React concurrent mode settings for production
// 5. Set up logging service integration for production environment

// React 18 core functionality and development mode strict checks
// @version ^18.0.0
import React, { StrictMode } from 'react';
// React 18 concurrent rendering API
// @version ^18.0.0
import { createRoot } from 'react-dom/client';
// Redux store provider for global state management
// @version ^8.1.0
import { Provider } from 'react-redux';

// Internal imports
import App from './App';
import { store } from './store';

// Requirement: Web Dashboard
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Get root DOM element for React application mounting
const rootElement = document.getElementById('root') as HTMLElement;

if (!rootElement) {
  throw new Error('Failed to find the root element. Please check your index.html file.');
}

// Requirement: Web Dashboard
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Create React 18 root using createRoot for concurrent rendering
const root = createRoot(rootElement);

// Requirement: Error Handling
// Location: Error Handling/Global error handling setup
// Implementation: Global error boundary setup
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Application Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1>Something went wrong</h1>
          <p>Please refresh the page or contact support if the problem persists.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Requirement: Real-time Communications
// Location: 1.1 System Overview/Core Backend Services
// Implementation: Set up real-time data synchronization with 30-second intervals
let syncInterval: NodeJS.Timeout;

const startRealtimeSync = (): void => {
  // Clear any existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Set up 30-second interval for real-time updates
  syncInterval = setInterval(() => {
    store.dispatch({ type: 'location/syncLocations' });
  }, 30000); // 30 seconds
};

// Requirement: Performance Optimizations
// Location: Performance Optimizations/React 18 concurrent rendering
// Implementation: Initialize React application with all required providers
const initializeApp = (): void => {
  // Start real-time synchronization
  startRealtimeSync();

  // Render the application with all providers and error boundary
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </StrictMode>
  );
};

// Requirement: Error Handling
// Location: Error Handling/Global error handling setup
// Implementation: Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Requirement: Performance Optimizations
// Location: Performance Optimizations/Efficient real-time data synchronization
// Implementation: Clean up resources on window unload
window.addEventListener('unload', () => {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
});

// Initialize the application
initializeApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    initializeApp();
  });
}