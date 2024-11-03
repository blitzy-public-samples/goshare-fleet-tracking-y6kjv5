/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Set up proper SSL pinning for API communication
 * 3. Verify proper permissions for camera and storage access
 * 4. Configure offline storage limits in app configuration
 */

// Third-party imports
import React, { useCallback, useEffect, useState } from 'react'; // ^18.2.0
import { View, Text, StyleSheet, ScrollView } from 'react-native'; // ^0.71.0
import { useNavigation } from '@react-navigation/native'; // ^6.1.0

// Internal imports
import { 
  Delivery, 
  DeliveryStatus, 
  ProofOfDelivery 
} from '../../types';
import Button from '../common/Button';
import { useDelivery } from '../../hooks/useDelivery';

// Props interface as defined in the specification
interface DeliveryDetailsProps {
  deliveryId: string;
  isOffline?: boolean;
}

/**
 * DeliveryDetails component displays detailed delivery information with offline support
 * Implements requirements:
 * - Digital proof of delivery capabilities with offline support
 * - Mobile driver applications with offline-first architecture
 * - Two-way communication system with offline queueing
 */
export const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  deliveryId,
  isOffline = false
}) => {
  // Initialize hooks
  const navigation = useNavigation();
  const { 
    getDeliveryById, 
    updateDeliveryStatus, 
    submitProofOfDelivery 
  } = useDelivery();

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  /**
   * Fetches and sets delivery data
   * Implements requirement: Mobile driver applications with offline-first architecture
   */
  useEffect(() => {
    const deliveryData = getDeliveryById(deliveryId);
    if (deliveryData) {
      setDelivery(deliveryData);
    } else {
      setError('Delivery not found');
    }
  }, [deliveryId, getDeliveryById]);

  /**
   * Handles delivery status updates with offline support
   * Implements requirement: Two-way communication system with offline queueing
   */
  const handleStatusUpdate = useCallback(async (newStatus: DeliveryStatus) => {
    try {
      setLoading(true);
      setError(null);
      await updateDeliveryStatus(deliveryId, newStatus);
      
      // Optimistic update
      if (delivery) {
        setDelivery({ ...delivery, status: newStatus });
      }
    } catch (err) {
      setError('Failed to update status. Changes will sync when online.');
    } finally {
      setLoading(false);
    }
  }, [deliveryId, delivery, updateDeliveryStatus]);

  /**
   * Navigates to proof of delivery capture screen
   * Implements requirement: Digital proof of delivery capabilities
   */
  const handleProofOfDelivery = useCallback(() => {
    navigation.navigate('ProofOfDelivery', {
      deliveryId,
      isOffline,
      onComplete: async (proof: ProofOfDelivery) => {
        try {
          await submitProofOfDelivery(deliveryId, proof);
          if (delivery) {
            setDelivery({ ...delivery, proofOfDelivery: proof });
          }
        } catch (err) {
          setError('Failed to submit proof of delivery. Will retry when online.');
        }
      }
    });
  }, [deliveryId, isOffline, navigation, submitProofOfDelivery, delivery]);

  // Early return for loading state
  if (!delivery) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          {error || 'Loading delivery details...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Offline indicator */}
      {isOffline && (
        <View style={styles.offlineIndicator}>
          <Text>Working offline - Changes will sync when connected</Text>
        </View>
      )}

      {/* Delivery header */}
      <Text style={styles.header}>Delivery Details</Text>

      {/* Customer information section */}
      <View style={styles.section}>
        <Text style={styles.label}>Customer</Text>
        <Text style={styles.value}>{delivery.customer.name}</Text>
        <Text style={styles.value}>{delivery.customer.phone}</Text>
        <Text style={styles.value}>{delivery.customer.email}</Text>
      </View>

      {/* Address section */}
      <View style={styles.section}>
        <Text style={styles.label}>Delivery Address</Text>
        <Text style={styles.value}>{delivery.address}</Text>
      </View>

      {/* Status section */}
      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{delivery.status}</Text>
      </View>

      {/* Proof of delivery section */}
      <View style={styles.section}>
        <Text style={styles.label}>Proof of Delivery</Text>
        {delivery.proofOfDelivery ? (
          <>
            <Text style={styles.value}>Completed</Text>
            <Text style={styles.value}>
              {new Date(delivery.proofOfDelivery.timestamp).toLocaleString()}
            </Text>
          </>
        ) : (
          <Text style={styles.value}>Not submitted</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {/* Status update buttons */}
        {delivery.status === DeliveryStatus.PENDING && (
          <Button
            title="Start Delivery"
            onPress={() => handleStatusUpdate(DeliveryStatus.IN_PROGRESS)}
            loading={loading}
            disabled={loading || isOffline}
            variant="primary"
          />
        )}

        {delivery.status === DeliveryStatus.IN_PROGRESS && (
          <>
            <Button
              title="Complete Delivery"
              onPress={() => handleStatusUpdate(DeliveryStatus.COMPLETED)}
              loading={loading}
              disabled={loading || isOffline}
              variant="primary"
            />
            <Button
              title="Mark as Failed"
              onPress={() => handleStatusUpdate(DeliveryStatus.FAILED)}
              loading={loading}
              disabled={loading || isOffline}
              variant="secondary"
              style={styles.buttonSpacing}
            />
          </>
        )}

        {/* Proof of delivery button */}
        {delivery.status === DeliveryStatus.IN_PROGRESS && !delivery.proofOfDelivery && (
          <Button
            title="Capture Proof of Delivery"
            onPress={handleProofOfDelivery}
            disabled={loading}
            variant="outline"
            style={styles.buttonSpacing}
          />
        )}
      </View>
    </ScrollView>
  );
};

/**
 * Styles following Material Design specifications
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  value: {
    fontSize: 16,
    marginBottom: 8
  },
  buttonContainer: {
    marginTop: 16
  },
  buttonSpacing: {
    marginTop: 12
  },
  offlineIndicator: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16
  },
  error: {
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 16
  }
});

export default DeliveryDetails;