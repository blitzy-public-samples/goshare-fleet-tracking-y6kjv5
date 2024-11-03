/**
 * HUMAN TASKS:
 * 1. Verify proper SSL certificate pinning configuration in the build system
 * 2. Configure Firebase Cloud Messaging for push notifications
 * 3. Set up proper offline storage limits in device settings
 * 4. Ensure background location permissions are properly configured
 * 5. Test offline sync behavior with various network conditions
 */

// Third-party imports with versions
import { AppRegistry } from 'react-native'; // ^0.72.0

// Internal imports
import App from './src/App';

// Global app name constant
const APP_NAME = 'FleetTracker';

/**
 * Register the root component of the React Native application
 * Requirements addressed:
 * - Mobile Applications: React Native driver application registration
 * - Performance Requirements: Offline-first architecture setup
 * - Real-time Synchronization: 30-second update intervals configured in App.tsx
 */
AppRegistry.registerComponent(APP_NAME, () => App);