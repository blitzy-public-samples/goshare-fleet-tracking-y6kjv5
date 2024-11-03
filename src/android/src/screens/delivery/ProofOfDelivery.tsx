/**
 * HUMAN TASKS:
 * 1. Configure proper image compression settings for proof of delivery photos
 * 2. Verify camera and storage permissions are properly set up
 * 3. Test offline storage capacity limits for photos and signatures
 * 4. Validate proper SSL pinning configuration for API communication
 */

// Third-party imports
import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  SafeAreaView 
} from 'react-native'; // ^0.72.0
import { RouteProp } from '@react-navigation/native'; // ^6.0.0
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // ^6.0.0

// Internal imports
import { 
  ProofOfDelivery as ProofOfDeliveryType, 
  Delivery, 
  DeliveryStatus 
} from '../../types';
import { useDelivery } from '../../hooks/useDelivery';
import ProofOfDeliveryComponent from '../../components/delivery/ProofOfDelivery';
import SignatureCapture from '../../components/delivery/SignatureCapture';
import Loading from '../../components/common/Loading';

// Props interfaces
interface ProofOfDeliveryScreenProps {
  route: RouteProp<DeliveryStackParamList, 'ProofOfDelivery'>;
  navigation: NativeStackNavigationProp<DeliveryStackParamList>;
}

interface DeliveryStackParamList {
  ProofOfDelivery: ProofOfDeliveryScreenParams;
}

interface ProofOfDeliveryScreenParams {
  deliveryId: string;
}

/**
 * ProofOfDeliveryScreen component that manages the proof of delivery capture process
 * with offline-first support and automatic synchronization.
 * 
 * Implements requirements:
 * - Digital proof of delivery capabilities including signature capture, photo upload and notes
 * - Offline-first architecture for proof of delivery data
 * - Automatic synchronization when online
 */
const ProofOfDeliveryScreen: React.FC<ProofOfDeliveryScreenProps> = ({ 
  route, 
  navigation 
}) => {
  // Extract delivery ID from route params
  const { deliveryId } = route.params;

  // Component state
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [proofOfDelivery, setProofOfDelivery] = useState<ProofOfDeliveryType>({
    signature: null,
    photos: [],
    notes: '',
    timestamp: 0
  });

  // Initialize delivery hook
  const { 
    submitProofOfDelivery,
    getDeliveryById,
    loading: deliveryLoading 
  } = useDelivery();

  /**
   * Handles signature capture completion
   * Implements requirement: Digital proof of delivery - signature capture
   */
  const handleSignatureComplete = useCallback((signatureData: string) => {
    try {
      setProofOfDelivery(prev => ({
        ...prev,
        signature: signatureData
      }));
      setCurrentStep(2);
    } catch (err) {
      setError('Failed to process signature');
      console.error('Signature processing error:', err);
    }
  }, []);

  /**
   * Handles photo capture completion
   * Implements requirement: Digital proof of delivery - photo upload
   */
  const handlePhotoComplete = useCallback((photoUris: string[]) => {
    try {
      setProofOfDelivery(prev => ({
        ...prev,
        photos: [...prev.photos, ...photoUris]
      }));
      setCurrentStep(3);
    } catch (err) {
      setError('Failed to process photos');
      console.error('Photo processing error:', err);
    }
  }, []);

  /**
   * Handles final submission of proof of delivery
   * Implements requirements:
   * - Digital proof of delivery submission
   * - Offline operation support
   * - Automatic synchronization
   */
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required data
      if (!proofOfDelivery.signature) {
        throw new Error('Signature is required');
      }
      if (proofOfDelivery.photos.length === 0) {
        throw new Error('At least one photo is required');
      }

      // Add timestamp
      const finalProof: ProofOfDeliveryType = {
        ...proofOfDelivery,
        timestamp: Date.now()
      };

      // Submit proof of delivery with offline support
      await submitProofOfDelivery(deliveryId, finalProof);

      // Show success message
      Alert.alert(
        'Success',
        'Proof of delivery submitted successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proof of delivery');
      console.error('Submission error:', err);

      Alert.alert(
        'Error',
        'Failed to submit proof of delivery. Data will be saved offline and synced later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [deliveryId, proofOfDelivery, navigation, submitProofOfDelivery]);

  /**
   * Handles cancellation of proof of delivery capture
   */
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Confirmation',
      'Are you sure you want to cancel? All entered data will be lost.',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }, [navigation]);

  /**
   * Validates delivery exists on component mount
   */
  useEffect(() => {
    const delivery = getDeliveryById(deliveryId);
    if (!delivery) {
      Alert.alert(
        'Error',
        'Delivery not found',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [deliveryId, getDeliveryById, navigation]);

  // Show loading state
  if (loading || deliveryLoading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Step 1: Signature Capture */}
        {currentStep === 1 && (
          <SignatureCapture
            deliveryId={deliveryId}
            onSignatureComplete={handleSignatureComplete}
            onSignatureCancel={handleCancel}
          />
        )}

        {/* Step 2 & 3: Photo Upload and Notes */}
        {currentStep > 1 && (
          <ProofOfDeliveryComponent
            deliveryId={deliveryId}
            onComplete={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  stepIndicator: {
    marginBottom: 16
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16
  },
  errorContainer: {
    marginTop: 8,
    padding: 16
  },
  errorText: {
    color: '#ff0000',
    textAlign: 'center'
  }
});

export default ProofOfDeliveryScreen;