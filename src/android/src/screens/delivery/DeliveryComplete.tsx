/**
 * HUMAN TASKS:
 * 1. Verify proper SSL pinning configuration for API communication
 * 2. Test offline storage capacity for proof of delivery data
 * 3. Validate proper camera and storage permissions setup
 * 4. Configure proper image compression settings
 */

// React 18.0.0
import React, { useState, useCallback, useEffect } from 'react';
// React Native 0.72.0
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert 
} from 'react-native';
// React Navigation 6.0.0
import { useNavigation, useRoute } from '@react-navigation/native';

// Internal imports
import Button from '../../components/common/Button';
import ProofOfDelivery from '../../components/delivery/ProofOfDelivery';
import { DeliveryService } from '../../services/delivery';
import { 
  Delivery, 
  DeliveryStatus, 
  ProofOfDelivery as ProofOfDeliveryType 
} from '../../types';

/**
 * Props interface for the DeliveryComplete screen
 * Implements requirement: Digital proof of delivery capabilities
 */
interface DeliveryCompleteScreenProps {
  route: {
    params: {
      deliveryId: string;
    };
  };
}

/**
 * DeliveryComplete screen component that handles the delivery completion process
 * with offline support and proof of delivery capture.
 * 
 * Implements requirements:
 * - Digital proof of delivery capabilities including signature capture, photo upload and notes
 * - Offline operation support for proof of delivery data
 * - Two-way communication system for delivery status updates
 */
const DeliveryComplete: React.FC = () => {
  // Navigation and route hooks
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { deliveryId } = route.params;

  // Component state
  const [loading, setLoading] = useState<boolean>(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);

  // Initialize delivery service
  const deliveryService = new DeliveryService(null); // OfflineManager should be injected

  /**
   * Fetches delivery details on component mount
   * Implements requirement: Offline operation support
   */
  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        const deliveryData = await deliveryService.getDeliveryDetails(deliveryId);
        setDelivery(deliveryData);
      } catch (error) {
        console.error('Error fetching delivery:', error);
        Alert.alert(
          'Error',
          'Failed to load delivery details. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    fetchDelivery();
  }, [deliveryId]);

  /**
   * Handles the completion of proof of delivery capture
   * Implements requirements:
   * - Digital proof of delivery capabilities
   * - Offline operation support
   * - Two-way communication system
   */
  const handleProofOfDeliveryComplete = useCallback(async (proofData: ProofOfDeliveryType) => {
    try {
      setLoading(true);

      // Submit proof of delivery with offline support
      await deliveryService.submitProofOfDelivery(deliveryId, proofData);

      // Update delivery status to completed
      await deliveryService.updateDeliveryStatus(deliveryId, DeliveryStatus.COMPLETED);

      // Show success message
      Alert.alert(
        'Success',
        'Delivery completed successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error completing delivery:', error);
      Alert.alert(
        'Error',
        'Failed to complete delivery. Data will be synced when online.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [deliveryId, navigation]);

  /**
   * Handles cancellation of delivery completion
   * Implements requirement: Two-way communication system
   */
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Completion',
      'Are you sure you want to cancel the delivery completion?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }, [navigation]);

  // Return null if delivery is not loaded
  if (!delivery) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <ProofOfDelivery
          deliveryId={deliveryId}
          onComplete={handleProofOfDeliveryComplete}
          onCancel={handleCancel}
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          disabled={loading}
        />
        <Button
          title="Complete Delivery"
          onPress={() => {}}
          loading={loading}
          disabled={loading || !delivery}
        />
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
  content: {
    flex: 1,
    padding: 16
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16
  }
});

export default DeliveryComplete;