/**
 * HUMAN TASKS:
 * 1. Verify Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Configure proper location permissions in app settings
 * 3. Test offline map caching behavior
 * 4. Verify proper SSL pinning for API communication
 */

// Third-party imports - versions specified for security and compatibility
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import {
  Route,
  RouteStatus,
  Delivery,
  Location
} from '../../types';
import { RouteService } from '../../services/route';
import { useLocation } from '../../hooks/useLocation';
import RouteDetails from '../../components/route/RouteDetails';
import MapContainer from '../../components/map/MapContainer';

/**
 * ActiveRoute screen component for managing active delivery routes
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Route optimization and planning
 * - Digital proof of delivery
 * - Offline operation support
 */
const ActiveRoute: React.FC = () => {
  // Navigation
  const navigation = useNavigation();

  // Component state
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize services
  const routeService = new RouteService();
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
   * Loads the active route data
   * Implements requirement: Offline operation support
   */
  const loadActiveRoute = useCallback(async () => {
    try {
      setIsLoading(true);
      const route = await routeService.getActiveRoute();
      setActiveRoute(route);

      // Start location tracking if route is active
      if (route && route.status === RouteStatus.IN_PROGRESS) {
        await startTracking();
      }
    } catch (error) {
      console.error('Failed to load active route:', error);
      Alert.alert(
        'Error',
        'Failed to load route. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [routeService, startTracking]);

  /**
   * Handles delivery selection
   * Implements requirement: Route optimization and planning
   */
  const handleDeliverySelect = useCallback((delivery: Delivery) => {
    setSelectedDelivery(delivery);
    navigation.navigate('DeliveryDetails', {
      deliveryId: delivery.id,
      routeId: activeRoute?.id
    });
  }, [navigation, activeRoute]);

  /**
   * Handles route completion request
   * Implements requirements:
   * - Digital proof of delivery
   * - Offline operation support
   */
  const handleRouteComplete = useCallback(async () => {
    if (!activeRoute) return;

    try {
      // Check if all deliveries are completed
      const incompleteDeliveries = activeRoute.deliveries.filter(
        delivery => delivery.status !== 'COMPLETED' || !delivery.proofOfDelivery
      );

      if (incompleteDeliveries.length > 0) {
        Alert.alert(
          'Incomplete Deliveries',
          'All deliveries must be completed with proof of delivery before completing the route.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Confirm route completion
      Alert.alert(
        'Complete Route',
        'Are you sure you want to complete this route?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            style: 'destructive',
            onPress: async () => {
              try {
                await routeService.completeRoute(activeRoute.id);
                stopTracking();
                navigation.navigate('RouteList');
              } catch (error) {
                console.error('Failed to complete route:', error);
                Alert.alert(
                  'Error',
                  'Failed to complete route. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling route completion:', error);
      Alert.alert(
        'Error',
        'An error occurred while completing the route.',
        [{ text: 'OK' }]
      );
    }
  }, [activeRoute, routeService, navigation, stopTracking]);

  /**
   * Handles route optimization request
   * Implements requirement: Route optimization and planning
   */
  const handleOptimizeRoute = useCallback(async () => {
    if (!activeRoute || !currentLocation) return;

    try {
      const optimizedRoute = await routeService.optimizeRoute(
        activeRoute.id,
        currentLocation
      );
      setActiveRoute(optimizedRoute);
      Alert.alert(
        'Success',
        'Route has been optimized based on current location.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to optimize route:', error);
      Alert.alert(
        'Error',
        'Failed to optimize route. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [activeRoute, currentLocation, routeService]);

  /**
   * Initialize component and start location tracking
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  useEffect(() => {
    loadActiveRoute();

    return () => {
      stopTracking();
    };
  }, [loadActiveRoute, stopTracking]);

  /**
   * Update route when location changes
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  useEffect(() => {
    if (currentLocation && activeRoute?.status === RouteStatus.IN_PROGRESS) {
      routeService.updateLocation(currentLocation).catch(console.error);
    }
  }, [currentLocation, activeRoute, routeService]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading route...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>No active route found.</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('RouteList')}
          >
            <Text style={styles.actionButtonText}>Go to Routes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Route</Text>
        {locationError && (
          <Text style={styles.errorText}>
            Location error: {locationError}
          </Text>
        )}
      </View>

      {/* Map section */}
      <View style={styles.mapContainer}>
        <MapContainer
          route={activeRoute}
          onDeliverySelect={handleDeliverySelect}
          selectedDeliveryId={selectedDelivery?.id || null}
          followsUserLocation={true}
        />
      </View>

      {/* Route details section */}
      <View style={styles.detailsContainer}>
        <RouteDetails
          route={activeRoute}
          onDeliverySelect={handleDeliverySelect}
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.optimizeButton]}
          onPress={handleOptimizeRoute}
          disabled={!currentLocation || activeRoute.status !== RouteStatus.IN_PROGRESS}
        >
          <Text style={styles.actionButtonText}>Optimize Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleRouteComplete}
          disabled={activeRoute.status !== RouteStatus.IN_PROGRESS}
        >
          <Text style={styles.actionButtonText}>Complete Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000'
  },
  errorText: {
    color: '#F44336',
    fontSize: 12
  },
  mapContainer: {
    height: '40%'
  },
  detailsContainer: {
    flex: 1
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8
  },
  optimizeButton: {
    backgroundColor: '#4CAF50'
  },
  completeButton: {
    backgroundColor: '#2196F3'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
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
  }
});

export default ActiveRoute;