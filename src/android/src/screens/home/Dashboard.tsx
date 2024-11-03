/**
 * HUMAN TASKS:
 * 1. Verify Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Test offline data synchronization behavior
 * 3. Verify location permissions are properly configured
 * 4. Test map performance with large route datasets
 * 5. Configure proper error tracking for failed route fetches
 */

// Third-party imports - versions specified for security and compatibility
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native'; // ^0.72.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Internal imports
import Loading from '../../components/common/Loading';
import MapContainer from '../../components/map/MapContainer';
import RouteList from '../../components/route/RouteList';
import { useLocation } from '../../hooks/useLocation';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { Delivery } from '../../types';

/**
 * Props interface for Dashboard screen
 */
interface DashboardProps {
  navigation: NavigationProp<RootStackParamList>;
}

/**
 * Main dashboard screen component for the mobile driver application
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Interactive mapping and route visualization
 * - Offline-first architecture for data handling
 */
const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [followsUserLocation, setFollowsUserLocation] = useState(true);

  // Redux state
  const dispatch = useDispatch();
  const activeRoute = useSelector((state: any) => state.route.activeRoute);
  const loading = useSelector((state: any) => state.route.loading);
  const error = useSelector((state: any) => state.route.error);

  // Location tracking hook with 30-second intervals
  const {
    currentLocation,
    isTracking,
    error: locationError,
    startTracking,
    stopTracking
  } = useLocation({
    enableHighAccuracy: true,
    interval: 30000, // 30-second intervals as per requirements
    distanceFilter: 10 // 10 meters minimum movement
  });

  /**
   * Handles route selection and navigation
   * Implements requirement: Interactive route management
   */
  const handleRouteSelect = useCallback((routeId: string) => {
    navigation.navigate('RouteDetails', { routeId });
  }, [navigation]);

  /**
   * Handles delivery marker selection on map
   * Implements requirement: Interactive mapping and route visualization
   */
  const handleDeliverySelect = useCallback((delivery: Delivery) => {
    setSelectedDeliveryId(delivery.id);
    setFollowsUserLocation(false);
  }, []);

  /**
   * Handles pull-to-refresh functionality
   * Implements requirement: Offline-first architecture
   */
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // Refresh route data
      await dispatch(routeActions.fetchActiveRoute());
      // Update location tracking
      await startTracking();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, startTracking]);

  /**
   * Start location tracking on component mount
   * Implements requirement: Real-time GPS tracking
   */
  useEffect(() => {
    startTracking().catch(err => {
      console.error('Failed to start location tracking:', err);
    });

    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  // Show loading state while initializing
  if (loading && !activeRoute) {
    return <Loading size="large" fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Map container with real-time location updates */}
      <View style={styles.mapContainer}>
        <MapContainer
          route={activeRoute}
          onDeliverySelect={handleDeliverySelect}
          selectedDeliveryId={selectedDeliveryId}
          followsUserLocation={followsUserLocation}
        />
      </View>

      {/* Route list with pull-to-refresh */}
      <View style={styles.listContainer}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2196F3']} // Material Design primary color
            />
          }
        >
          <RouteList
            onRouteSelect={handleRouteSelect}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        </ScrollView>
      </View>
    </View>
  );
};

/**
 * Styles following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  mapContainer: {
    height: '50%'
  },
  listContainer: {
    flex: 1
  }
});

export default Dashboard;