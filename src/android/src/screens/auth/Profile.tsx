/**
 * HUMAN TASKS:
 * 1. Configure proper validation rules for license numbers based on regional requirements
 * 2. Set up proper phone number formatting based on region
 * 3. Configure proper offline data sync settings for profile updates
 * 4. Verify proper data encryption settings for profile information
 */

// Third-party imports - versions specified for security auditing
import React, { useState, useEffect } from 'react'; // ^18.2.0
import { View, ScrollView, StyleSheet, Alert } from 'react-native'; // ^0.71.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

/**
 * Interface for profile form data
 * Requirement: Digital proof of delivery - Driver profile management
 */
interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
}

/**
 * Profile screen component for viewing and editing driver profile information
 * Requirements addressed:
 * - Mobile Applications: React Native driver application with offline-first architecture
 * - Digital proof of delivery: Driver profile management for delivery authentication
 * - Security and encryption: Secure handling of driver profile information
 */
const Profile: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout, loading: authLoading } = useAuth();

  // State management for form data, loading state, and validation errors
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    licenseNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Initialize form data with user profile
   * Requirement: Mobile Applications - User profile management
   */
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        licenseNumber: user.licenseNumber || ''
      });
    }
  }, [user]);

  /**
   * Validates the profile form data
   * Requirement: Security and encryption - Data validation
   */
  const validateForm = (data: ProfileFormData): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation - RFC 5322 compliant
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(data.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation - E.164 format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(data.phone)) {
      newErrors.phone = 'Invalid phone number format (E.164 required)';
    }

    // License number validation
    const licenseRegex = /^[A-Z0-9]{5,15}$/;
    if (!licenseRegex.test(data.licenseNumber)) {
      newErrors.licenseNumber = 'Invalid license number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles profile update with validation and error handling
   * Requirements addressed:
   * - Digital proof of delivery: Secure profile updates
   * - Security and encryption: Secure data handling
   */
  const handleUpdateProfile = async () => {
    try {
      if (!validateForm(formData)) {
        return;
      }

      setLoading(true);

      // TODO: Implement profile update API call with proper error handling
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        'Profile updated successfully',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles logout with confirmation
   * Requirement: Mobile Applications - Secure authentication
   */
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }]
              });
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to logout. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      testID="profile-screen"
    >
      <View style={styles.section}>
        <Input
          label="Full Name"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter your full name"
          error={errors.name}
          type="text"
          autoCapitalize="words"
          testID="name-input"
        />

        <Input
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          placeholder="Enter your email"
          error={errors.email}
          type="email"
          keyboardType="email-address"
          testID="email-input"
        />

        <Input
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
          placeholder="Enter phone number (E.164 format)"
          error={errors.phone}
          type="phone"
          keyboardType="phone-pad"
          testID="phone-input"
        />

        <Input
          label="Driver License Number"
          value={formData.licenseNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, licenseNumber: text }))}
          placeholder="Enter license number"
          error={errors.licenseNumber}
          type="text"
          autoCapitalize="characters"
          testID="license-input"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Update Profile"
          onPress={handleUpdateProfile}
          loading={loading}
          disabled={loading || authLoading}
          variant="primary"
          testID="update-button"
        />

        <Button
          title="Logout"
          onPress={handleLogout}
          disabled={loading || authLoading}
          variant="outline"
          testID="logout-button"
        />
      </View>
    </ScrollView>
  );
};

/**
 * Styles following Material Design principles
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
  buttonContainer: {
    marginTop: 24,
    gap: 16
  }
});

export default Profile;