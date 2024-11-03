/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Set up proper SSL pinning for API communication
 * 3. Verify proper permissions for camera and storage access
 * 4. Configure offline storage limits in app configuration
 */

// Third-party imports - versions specified for security and compatibility
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native'; // ^0.72.0
import { useRoute, useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { 
  Delivery, 
  DeliveryStatus, 
  DeliveryDetailsScreenProps, 
  DeliveryDetailsScreenParams 
} from '../../types';
import { DeliveryService } from '../../services/delivery';
import { DeliveryCard } from '../../components/delivery/DeliveryCard';
import MapContainer from '../../components/map/MapContainer';

/**
 * DeliveryDetails screen component that displays detailed delivery information
 * and provides proof of delivery functionality with offline support.
 * 
 * Implements requirements:
 * - Digital proof of delivery capabilities
 * - Two-way communication system
 * - Mobile driver applications with offline-first architecture
 * - Offline operation support
 */
const DeliveryDetailsScreen: React.FC<DeliveryDetailsScreenProps> = () => {
  // Navigation and route params
  const navigation = useNavigation();
  const route = useRoute();
  const { deliveryId } = route.params as DeliveryDetailsScreenParams;

  // State management
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service initialization
  const deliveryService = new DeliveryService(/* offlineManager instance */);

  /**
   * Fetches delivery details with offline support
   * Implements requirement: Offline-first architecture
   */
  const fetchDeliveryDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await deliveryService.getDeliveryDetails(deliveryId);
      setDelivery(details);
    } catch (err) {
      setError('Failed to load delivery details. Please try again.');
      console.error('Error fetching delivery details:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  /**
   * Updates delivery status with offline queueing
   * Implements requirements: Two-way communication system, Offline operation support
   */
  const handleStatusUpdate = useCallback(async (newStatus: DeliveryStatus) => {
    if (!delivery) return;

    try {
      setUpdating(true);
      setError(null);
      await deliveryService.updateDeliveryStatus(delivery.id, newStatus);
      await fetchDeliveryDetails(); // Refresh delivery data
    } catch (err) {
      setError('Failed to update delivery status. Changes will sync when online.');
      console.error('Error updating delivery status:', err);
    } finally {
      setUpdating(false);
    }
  }, [delivery, fetchDeliveryDetails]);

  /**
   * Navigates to proof of delivery screen
   * Implements requirement: Digital proof of delivery capabilities
   */
  const navigateToProofOfDelivery = useCallback(() => {
    if (!delivery) return;

    navigation.navigate('ProofOfDelivery', {
      deliveryId: delivery.id,
      customerName: delivery.customer.name
    });
  }, [delivery, navigation]);

  // Initial data fetch
  useEffect(() => {
    fetchDeliveryDetails();

    // Cleanup on unmount
    return () => {
      deliveryService.dispose();
    };
  }, [fetchDeliveryDetails]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchDeliveryDetails}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No delivery found
  if (!delivery) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Delivery not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Delivery information card */}
        <DeliveryCard
          delivery={delivery}
          disabled={true}
          style={styles.card}
        />

        {/* Map view */}
        <View style={styles.mapContainer}>
          <MapContainer
            route={{ 
              id: 'single-delivery',
              deliveries: [delivery],
              status: 'IN_PROGRESS',
              startTime: Date.now(),
              endTime: 0
            }}
            selectedDeliveryId={delivery.id}
            onDeliverySelect={() => {}}
            followsUserLocation={true}
          />
        </View>

        {/* Customer information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.customerName}>{delivery.customer.name}</Text>
          <Text style={styles.customerDetail}>{delivery.customer.phone}</Text>
          <Text style={styles.customerDetail}>{delivery.customer.email}</Text>
        </View>

        {/* Delivery status section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Status</Text>
          <Text style={styles.status}>{delivery.status}</Text>
          {delivery.proofOfDelivery && (
            <Text style={styles.completedText}>
              Completed at: {new Date(delivery.proofOfDelivery.timestamp).toLocaleString()}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {delivery.status === DeliveryStatus.IN_PROGRESS && (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={navigateToProofOfDelivery}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Complete Delivery</Text>
          </TouchableOpacity>
        )}

        {delivery.status === DeliveryStatus.PENDING && (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={() => handleStatusUpdate(DeliveryStatus.IN_PROGRESS)}
            disabled={updating}
          >
            <Text style={styles.buttonText}>Start Delivery</Text>
          </TouchableOpacity>
        )}

        {updating && (
          <ActivityIndicator 
            size="small" 
            color="#FFFFFF" 
            style={styles.buttonSpinner} 
          />
        )}
      </View>
    </View>
  );
};

// Styles following Material Design guidelines
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flex: 1
  },
  card: {
    margin: 16
  },
  mapContainer: {
    height: 200,
    marginVertical: 16
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000'
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#000000'
  },
  customerDetail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  status: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF'
  },
  completedText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    marginHorizontal: 8
  },
  startButton: {
    backgroundColor: '#4CAF50'
  },
  completeButton: {
    backgroundColor: '#007AFF'
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonSpinner: {
    position: 'absolute',
    right: 24,
    top: '50%',
    marginTop: -8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#007AFF'
  }
});

export default DeliveryDetailsScreen;