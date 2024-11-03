/**
 * HUMAN TASKS:
 * 1. Verify proper SSL certificate pinning configuration in the build system
 * 2. Configure Firebase Cloud Messaging for push notifications
 * 3. Set up proper offline storage limits in device settings
 * 4. Ensure background location permissions are properly configured
 * 5. Test offline sync behavior with various network conditions
 */

// Third-party imports with versions
import React, { useEffect } from 'react'; // ^18.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.5.0
import { StatusBar, Platform } from 'react-native'; // ^0.72.0

// Internal imports
import AppNavigator from './navigation/AppNavigator';
import { store, persistor } from './store';
import { APP_CONFIG } from './constants/config';

/**
 * Root application component that sets up the core app structure
 * Requirements addressed:
 * - Mobile Applications: React Native driver application setup
 * - Real-time data synchronization: Redux store with persistence
 * - Performance Requirements: Offline-first architecture
 */
const App: React.FC = () => {
  useEffect(() => {
    // Configure application based on environment
    if (__DEV__) {
      console.log(`Running in ${APP_CONFIG.environment} mode`);
      console.log(`Version: ${APP_CONFIG.version} (${APP_CONFIG.buildNumber})`);
    }

    // Initialize background tasks for real-time sync
    const initBackgroundTasks = async () => {
      try {
        // Set up 30-second interval for location updates
        const locationUpdateInterval = setInterval(() => {
          if (store.getState().auth.isAuthenticated) {
            store.dispatch({ type: 'location/updateLocation' });
          }
        }, 30000); // 30-second intervals as per requirements

        return () => clearInterval(locationUpdateInterval);
      } catch (error) {
        console.error('Failed to initialize background tasks:', error);
      }
    };

    initBackgroundTasks();
  }, []);

  return (
    <SafeAreaProvider>
      {/* Configure StatusBar based on platform */}
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Platform.OS === 'android' ? '#007AFF' : undefined}
        translucent={Platform.OS === 'android'}
      />

      {/* Redux Provider for state management */}
      <Provider store={store}>
        {/* PersistGate for offline state persistence */}
        <PersistGate 
          loading={null} 
          persistor={persistor}
          onBeforeLift={() => {
            // Verify offline storage before lifting persistence gate
            const state = store.getState();
            if (state.offline.storageSize > 100 * 1024 * 1024) { // 100MB limit
              store.dispatch({ type: 'offline/clearOldData' });
            }
          }}
        >
          {/* Main navigation container */}
          <AppNavigator />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

/**
 * Default export of the root application component
 * Requirements addressed:
 * - Mobile Applications: Root component export
 * - Performance Requirements: Offline-first architecture
 */
export default App;