/**
 * HUMAN TASKS:
 * 1. Verify signature pad dimensions are appropriate for different screen sizes
 * 2. Test signature capture functionality on various Android devices
 * 3. Validate offline storage capacity for signature data
 * 4. Configure proper SSL pinning for API communication
 */

// React 18.0.0
import React, { useCallback, useRef, useState } from 'react';
// React Native 0.71.0
import { View, StyleSheet } from 'react-native';
// react-native-signature-canvas 4.5.0
import SignatureView from 'react-native-signature-canvas';

// Internal imports
import Button from '../common/Button';
import { DeliveryService } from '../../services/delivery';
import { ProofOfDelivery } from '../../types';

/**
 * Props interface for the SignatureCapture component
 */
interface SignatureCaptureProps {
  deliveryId: string;
  onSignatureComplete: (signature: string) => void;
  onSignatureCancel?: () => void;
}

/**
 * SignatureCapture component for capturing customer signatures during delivery completion
 * Implements requirements:
 * - Digital proof of delivery capabilities with signature capture
 * - Offline-first architecture for signature capture and storage
 */
export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  deliveryId,
  onSignatureComplete,
  onSignatureCancel
}) => {
  // State management for loading and error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reference to the signature pad component
  const signatureRef = useRef<SignatureView>(null);

  // Delivery service instance for handling proof of delivery
  const deliveryService = new DeliveryService(null); // OfflineManager should be injected in production

  /**
   * Handles the signature data after capture
   * Implements requirement: Digital proof of delivery with offline support
   */
  const handleSignature = useCallback(async (signatureData: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate signature data
      if (!signatureData || signatureData === 'null') {
        throw new Error('Invalid signature data');
      }

      // Create proof of delivery object
      const proofOfDelivery: ProofOfDelivery = {
        signature: signatureData,
        photos: [], // Photos will be handled separately
        notes: '',
        timestamp: Date.now()
      };

      // Submit proof of delivery with offline support
      await deliveryService.submitProofOfDelivery(deliveryId, proofOfDelivery);

      // Notify parent component of completion
      onSignatureComplete(signatureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
      console.error('Signature capture error:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryId, onSignatureComplete]);

  /**
   * Clears the current signature from the canvas
   */
  const clearSignature = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
    setError(null);
  }, []);

  /**
   * Handles signature pad configuration
   */
  const signatureConfig = {
    penColor: '#000000',
    backgroundColor: '#ffffff',
    dotSize: 1,
    minWidth: 1,
    maxWidth: 3,
    velocityFilterWeight: 0.7
  };

  return (
    <View style={styles.container}>
      {/* Signature capture area */}
      <View style={styles.signatureContainer}>
        <SignatureView
          ref={signatureRef}
          onOK={handleSignature}
          onEmpty={() => setError('Please provide a signature')}
          webStyle={`
            .m-signature-pad {
              box-shadow: none;
              border: none;
            }
            .m-signature-pad--body {
              border: none;
            }
            .m-signature-pad--footer {
              display: none;
            }
          `}
          {...signatureConfig}
        />
      </View>

      {/* Error message display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title="Clear"
          onPress={clearSignature}
          variant="outline"
          disabled={loading}
        />
        <Button
          title="Save"
          onPress={() => signatureRef.current?.readSignature()}
          loading={loading}
          variant="primary"
        />
        {onSignatureCancel && (
          <Button
            title="Cancel"
            onPress={onSignatureCancel}
            variant="secondary"
            disabled={loading}
          />
        )}
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
    backgroundColor: '#ffffff',
    padding: 16
  },
  signatureContainer: {
    height: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  errorContainer: {
    marginBottom: 8
  },
  errorText: {
    color: '#ff0000',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default SignatureCapture;