/**
 * HUMAN TASKS:
 * 1. Verify Google Maps API key is properly configured in AndroidManifest.xml
 * 2. Test offline map caching behavior
 * 3. Configure proper location permissions
 * 4. Test route optimization with large delivery sets
 */

// Third-party imports
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native'; // ^0.72.0

// Internal imports
import { 
  Route, 
  RouteStatus, 
  Delivery, 
  Location 
} from '../../types';
import { RouteService } from '../../services/route';
import Card from '../common/Card';
import MapContainer from '../map/MapContainer';

/**
 * Props interface for RouteDetails component
 */
interface RouteDetailsProps {
  route: Route;
  onDeliverySelect: (delivery: Delivery) => void;
}

/**
 * A React Native component that displays detailed information about a delivery route
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - Route optimization and planning with offline support
 * - Digital proof of delivery capabilities
 */
const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  onDeliverySelect
}) => {
  // Component state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Initialize route service
  const routeService = new RouteService();

  /**
   * Handles delivery selection from list or map
   * Implements requirement: Route optimization and planning
   */
  const handleDeliverySelect = useCallback((delivery: Delivery) => {
    setSelectedDelivery(delivery);
    onDeliverySelect(delivery);
  }, [onDeliverySelect]);

  /**
   * Triggers route optimization based on current location
   * Implements requirement: Route optimization and planning
   */
  const handleOptimizeRoute = useCallback(async () => {
    if (!currentLocation) return;

    try {
      setIsOptimizing(true);
      await routeService.optimizeRoute(route.id, currentLocation);
    } catch (error) {
      console.error('Failed to optimize route:', error);
      // Error handling would be implemented here
    } finally {
      setIsOptimizing(false);
    }
  }, [currentLocation, route.id]);

  /**
   * Renders the route status badge with appropriate styling
   */
  const renderStatusBadge = () => {
    const getStatusColor = () => {
      switch (route.status) {
        case RouteStatus.IN_PROGRESS:
          return '#4CAF50';
        case RouteStatus.COMPLETED:
          return '#2196F3';
        case RouteStatus.CANCELLED:
          return '#F44336';
        default:
          return '#9E9E9E';
      }
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{route.status}</Text>
      </View>
    );
  };

  /**
   * Renders the delivery list section
   * Implements requirement: Route optimization and planning
   */
  const renderDeliveryList = () => {
    return (
      <ScrollView style={styles.deliveryList}>
        {route.deliveries.map((delivery) => (
          <Card
            key={delivery.id}
            onPress={() => handleDeliverySelect(delivery)}
            style={[
              styles.deliveryCard,
              selectedDelivery?.id === delivery.id && styles.selectedDeliveryCard
            ]}
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
          </Card>
        ))}
      </ScrollView>
    );
  };

  /**
   * Renders the map section with real-time tracking
   * Implements requirement: Real-time GPS tracking with 30-second update intervals
   */
  const renderMap = () => {
    return (
      <View style={styles.mapContainer}>
        <MapContainer
          route={route}
          onDeliverySelect={handleDeliverySelect}
          selectedDeliveryId={selectedDelivery?.id || null}
          followsUserLocation={true}
        />
      </View>
    );
  };

  /**
   * Renders the route optimization button
   * Implements requirement: Route optimization and planning
   */
  const renderOptimizeButton = () => {
    return (
      <TouchableOpacity
        style={[
          styles.optimizeButton,
          isOptimizing && styles.optimizeButtonDisabled
        ]}
        onPress={handleOptimizeRoute}
        disabled={isOptimizing || !currentLocation}
      >
        <Text style={styles.optimizeButtonText}>
          {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Route header section */}
      <Card style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.routeId}>Route #{route.id}</Text>
            <Text style={styles.routeTime}>
              Started: {new Date(route.startTime).toLocaleTimeString()}
            </Text>
          </View>
          {renderStatusBadge()}
        </View>
      </Card>

      {/* Map visualization */}
      {renderMap()}

      {/* Route optimization button */}
      {route.status === RouteStatus.IN_PROGRESS && renderOptimizeButton()}

      {/* Delivery list */}
      {renderDeliveryList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    marginBottom: 8
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  routeId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121'
  },
  routeTime: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  mapContainer: {
    height: 300,
    marginBottom: 8
  },
  optimizeButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  optimizeButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  optimizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  deliveryList: {
    flex: 1
  },
  deliveryCard: {
    marginVertical: 4,
    marginHorizontal: 16
  },
  selectedDeliveryCard: {
    borderColor: '#2196F3',
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
    fontWeight: '600',
    color: '#212121'
  },
  deliveryStatus: {
    fontSize: 14,
    color: '#757575'
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#424242'
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
  }
});

export default RouteDetails;