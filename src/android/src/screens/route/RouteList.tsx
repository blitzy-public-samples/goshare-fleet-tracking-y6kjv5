/**
 * HUMAN TASKS:
 * 1. Configure proper offline storage limits in app configuration
 * 2. Set up proper error tracking and monitoring
 * 3. Verify accessibility features with screen readers
 * 4. Test pull-to-refresh behavior on different Android devices
 */

// Third-party imports
import React, { useEffect, useCallback, useState } from 'react'; // ^18.0.0
import { View, StyleSheet, RefreshControl } from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Internal imports
import { Route, RouteStatus } from '../../types';
import { RouteService } from '../../services/route';
import { RouteList as RouteListComponent } from '../../components/route/RouteList';

/**
 * Props interface for the RouteList screen component
 * Requirement: Interactive route management and status tracking
 */
interface RouteListScreenProps {
  navigation: any; // NavigationProp<RouteStackParamList>
}

/**
 * Main screen component for displaying and managing the list of routes with offline support
 * Requirements addressed:
 * - Mobile Driver App: React Native driver applications with offline-first architecture
 * - Route optimization and planning: Interactive route management and status tracking
 * - Offline operation support: Offline-first data handling capabilities for route management
 */
const RouteListScreen: React.FC<RouteListScreenProps> = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  
  // Initialize route service
  const routeService = new RouteService();

  // Redux state selectors
  const routes = useSelector((state: any) => state.route.routes);
  const loading = useSelector((state: any) => state.route.loading);
  const error = useSelector((state: any) => state.route.error);

  /**
   * Handles route selection and navigation with offline support
   * Requirement: Interactive route management and status tracking
   */
  const handleRouteSelect = useCallback(async (routeId: string) => {
    try {
      // Check if route is already active
      const activeRoute = await routeService.getActiveRoute();
      
      if (activeRoute && activeRoute.id !== routeId) {
        throw new Error('Another route is already active');
      }

      // Validate route status
      const selectedRoute = routes.find((route: Route) => route.id === routeId);
      if (!selectedRoute) return;

      if (selectedRoute.status === RouteStatus.COMPLETED) {
        throw new Error('Cannot select a completed route');
      }

      // Start route if not already started
      if (selectedRoute.status === RouteStatus.NOT_STARTED) {
        await routeService.startRoute(routeId);
      }

      // Navigate to route details
      navigation.navigate('RouteDetails', { routeId });
    } catch (error) {
      console.error('Error selecting route:', error);
      // Handle error through your error tracking system
    }
  }, [navigation, routes, routeService]);

  /**
   * Handles pull-to-refresh functionality with offline sync
   * Requirement: Offline-first data handling capabilities
   */
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await routeService.syncRouteUpdates();
    } catch (error) {
      console.error('Error refreshing routes:', error);
      // Handle error through your error tracking system
    } finally {
      setRefreshing(false);
    }
  }, [routeService]);

  /**
   * Setup 30-second interval updates for route data
   * Requirement: Real-time updates with 30-second intervals
   */
  useEffect(() => {
    const updateInterval = setInterval(() => {
      routeService.syncRouteUpdates().catch(console.error);
    }, 30000); // 30 seconds

    return () => {
      clearInterval(updateInterval);
      routeService.dispose();
    };
  }, [routeService]);

  return (
    <View style={styles.container}>
      <RouteListComponent
        onRouteSelect={handleRouteSelect}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

/**
 * Styles following Material Design principles
 * Requirement: Consistent visual presentation
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  errorText: {
    fontSize: 16,
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: 16
  }
});

export default RouteListScreen;