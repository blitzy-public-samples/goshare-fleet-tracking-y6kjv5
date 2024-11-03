/**
 * HUMAN TASKS:
 * 1. Configure image compression settings for proof of delivery photos
 * 2. Verify camera and storage permissions are properly set up
 * 3. Test offline storage capacity limits for photos and signatures
 * 4. Validate proper SSL pinning configuration for API communication
 */

// React 18.0.0
import React, { useState, useCallback } from 'react';
// React Native 0.72.0
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  Image,
  Text,
  TextInput
} from 'react-native';
// React Native Image Picker 5.0.0
import { 
  launchCamera, 
  launchImageLibrary,
  ImagePickerResponse,
  Asset
} from 'react-native-image-picker';

// Internal imports
import { 
  Delivery, 
  ProofOfDelivery as ProofOfDeliveryType 
} from '../../types';
import { DeliveryService } from '../../services/delivery';
import SignatureCapture from './SignatureCapture';
import Button from '../common/Button';

interface ProofOfDeliveryProps {
  deliveryId: string;
  onComplete: () => void;
  onCancel?: () => void;
}

/**
 * ProofOfDelivery component for capturing delivery confirmation including
 * signature, photos and notes with offline support.
 * 
 * Implements requirements:
 * - Digital proof of delivery capabilities including signature capture, photo upload and notes
 * - Offline operation support for proof of delivery data
 */
const ProofOfDelivery: React.FC<ProofOfDeliveryProps> = ({
  deliveryId,
  onComplete,
  onCancel
}) => {
  // Component state
  const [step, setStep] = useState<number>(1);
  const [signature, setSignature] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize delivery service
  const deliveryService = new DeliveryService(null); // OfflineManager should be injected

  /**
   * Handles signature capture completion
   * Implements requirement: Digital proof of delivery - signature capture
   */
  const handleSignatureComplete = useCallback((signatureData: string) => {
    setSignature(signatureData);
    setStep(2);
  }, []);

  /**
   * Handles photo capture or selection
   * Implements requirement: Digital proof of delivery - photo upload
   */
  const handlePhotoCapture = useCallback(async () => {
    try {
      Alert.alert(
        'Add Photo',
        'Choose photo source',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const response = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                saveToPhotos: false
              });
              handleImageResponse(response);
            }
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const response = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                selectionLimit: 1
              });
              handleImageResponse(response);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (err) {
      setError('Failed to capture photo');
      console.error('Photo capture error:', err);
    }
  }, []);

  /**
   * Processes the image picker response
   * Implements requirement: Digital proof of delivery - photo processing
   */
  const handleImageResponse = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel || response.errorCode || !response.assets) {
      return;
    }

    const asset = response.assets[0];
    if (asset?.uri) {
      setPhotos(prev => [...prev, asset.uri]);
    }
  }, []);

  /**
   * Removes a photo from the collection
   */
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Handles final submission of proof of delivery
   * Implements requirements:
   * - Digital proof of delivery submission
   * - Offline operation support
   */
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required data
      if (!signature) {
        throw new Error('Signature is required');
      }
      if (photos.length === 0) {
        throw new Error('At least one photo is required');
      }

      // Create proof of delivery object
      const proof: ProofOfDeliveryType = {
        signature,
        photos,
        notes,
        timestamp: Date.now()
      };

      // Submit proof of delivery with offline support
      await deliveryService.submitProofOfDelivery(deliveryId, proof);

      // Notify completion
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proof of delivery');
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryId, signature, photos, notes, onComplete]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Step 1: Signature Capture */}
        {step === 1 && (
          <SignatureCapture
            deliveryId={deliveryId}
            onSignatureComplete={handleSignatureComplete}
            onSignatureCancel={onCancel}
          />
        )}

        {/* Step 2: Photo and Notes */}
        {step === 2 && (
          <>
            {/* Photo capture section */}
            <View>
              <Text style={styles.sectionTitle}>Photos</Text>
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image
                      source={{ uri: photo }}
                      style={styles.photoImage}
                    />
                    <Button
                      title="Remove"
                      onPress={() => handleRemovePhoto(index)}
                      variant="outline"
                    />
                  </View>
                ))}
                {photos.length < 3 && (
                  <Button
                    title="Add Photo"
                    onPress={handlePhotoCapture}
                    variant="outline"
                  />
                )}
              </View>
            </View>

            {/* Notes section */}
            <View style={styles.notesContainer}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add delivery notes..."
                textAlignVertical="top"
              />
            </View>

            {/* Error display */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <Button
                title="Back"
                onPress={() => setStep(1)}
                variant="outline"
                disabled={loading}
              />
              <Button
                title="Submit"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || !signature || photos.length === 0}
              />
            </View>
          </>
        )}
      </ScrollView>
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
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 16
  },
  photoItem: {
    width: '33%',
    aspectRatio: 1,
    padding: 4
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    marginBottom: 4
  },
  notesContainer: {
    marginVertical: 16
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  errorText: {
    color: '#ff0000',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default ProofOfDelivery;