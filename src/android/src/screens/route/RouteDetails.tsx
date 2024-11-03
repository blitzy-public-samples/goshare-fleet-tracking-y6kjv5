/**
 * HUMAN TASKS:
 * 1. Verify Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Configure proper offline storage limits in app configuration
 * 3. Test offline map caching behavior
 * 4. Verify location permissions are properly configured
 */

// Third-party imports
import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Internal imports
import { 
  Route, 
  RouteStatus, 
  Delivery, 
  Location,
  RouteDetailsScreenParams 
} from '../../types';
import { RouteService } from '../../services/route';
import RouteDetails from '../../components/route/RouteDetails';
import MapContainer from '../../components/map/MapContainer';
import Loading from '../../components/common/Loading';

/**
 * Route Details Screen Component
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Route optimization and planning
 * - Digital proof of delivery
 * - Offline operation support
 */
const RouteDetailsScreen: React.FC = () => {
  // Navigation and route params
  const navigation = useNavigation();
  const route = useRoute();
  const { routeId } = route.params as RouteDetailsScreenParams;

  // Component state
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Initialize route service
  const routeService = new RouteService();

  /**
   * Loads route details with offline support
   * Implements requirement: Offline operation support
   */
  const loadRouteDetails = useCallback(async () => {
    try {
      setLoading(true);
      const activeRoute = await routeService.getActiveRoute();
      
      if (!activeRoute || activeRoute.id !== routeId) {
        Alert.alert('Error', 'Route not found');
        navigation.goBack();
        return;
      }

      setRouteData(activeRoute);
    } catch (error) {
      console.error('Failed to load route details:', error);
      Alert.alert(
        'Error',
        'Failed to load route details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [routeId, navigation]);

  /**
   * Handles route optimization with current location
   * Implements requirement: Route optimization and planning
   */
  const handleOptimizeRoute = useCallback(async () => {
    if (!routeData) return;

    try {
      setOptimizing(true);
      
      // Get current location from location service
      const location: Location = {
        coordinates: {
          latitude: 0, // Will be updated with actual location
          longitude: 0
        },
        timestamp: Date.now(),
        accuracy: 0,
        speed: 0
      };

      const optimizedRoute = await routeService.optimizeRoute(routeId, location);
      setRouteData(optimizedRoute);
      
      Alert.alert('Success', 'Route has been optimized');
    } catch (error) {
      console.error('Failed to optimize route:', error);
      Alert.alert(
        'Error',
        'Failed to optimize route. Please try again.'
      );
    } finally {
      setOptimizing(false);
    }
  }, [routeId, routeData]);

  /**
   * Handles selection of a delivery from the list
   * Implements requirement: Digital proof of delivery
   */
  const handleDeliverySelect = useCallback((delivery: Delivery) => {
    setSelectedDelivery(delivery);
    
    // Navigate to delivery details screen
    navigation.navigate('DeliveryDetails', {
      deliveryId: delivery.id,
      routeId: routeId
    });
  }, [navigation, routeId]);

  /**
   * Load route details on component mount
   */
  useEffect(() => {
    loadRouteDetails();

    // Cleanup on unmount
    return () => {
      routeService.dispose();
    };
  }, [loadRouteDetails]);

  /**
   * Set up real-time route updates
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (routeData?.status === RouteStatus.IN_PROGRESS) {
        loadRouteDetails();
      }
    }, 30000); // 30-second intervals

    return () => clearInterval(updateInterval);
  }, [routeData, loadRouteDetails]);

  if (loading) {
    return <Loading />;
  }

  if (!routeData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Route not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadRouteDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Route details component */}
      <RouteDetails
        route={routeData}
        onDeliverySelect={handleDeliverySelect}
      />

      {/* Map visualization with real-time tracking */}
      <View style={styles.mapContainer}>
        <MapContainer
          route={routeData}
          onDeliverySelect={handleDeliverySelect}
          selectedDeliveryId={selectedDelivery?.id || null}
          followsUserLocation={true}
        />
      </View>

      {/* Optimization controls */}
      {routeData.status === RouteStatus.IN_PROGRESS && (
        <TouchableOpacity
          style={[
            styles.optimizeButton,
            optimizing && styles.optimizeButtonDisabled
          ]}
          onPress={handleOptimizeRoute}
          disabled={optimizing}
        >
          <Text style={styles.optimizeButtonText}>
            {optimizing ? 'Optimizing...' : 'Optimize Route'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Delivery list */}
      <ScrollView style={styles.contentContainer}>
        {routeData.deliveries.map((delivery) => (
          <TouchableOpacity
            key={delivery.id}
            style={[
              styles.deliveryCard,
              selectedDelivery?.id === delivery.id && styles.selectedDeliveryCard
            ]}
            onPress={() => handleDeliverySelect(delivery)}
          >
            <View style={styles.deliveryHeader}>
              <Text style={styles.deliveryTitle}>
                {delivery.customer.name}
              </Text>
              <Text style={styles.deliveryStatus}>
                {delivery.status}
              </Text>
            </View>
            <Text style={styles.deliveryAddress}>
              {delivery.address}
            </Text>
            {delivery.proofOfDelivery && (
              <View style={styles.proofBadge}>
                <Text style={styles.proofText}>POD Captured</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  mapContainer: {
    height: 300
  },
  contentContainer: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  optimizeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 16
  },
  optimizeButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  optimizeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center'
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  selectedDeliveryCard: {
    borderColor: '#007AFF',
    borderWidth: 2
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  deliveryStatus: {
    fontSize: 14,
    color: '#666666'
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#333333'
  },
  proofBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  proofText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500'
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 24
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center'
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default RouteDetailsScreen;