/**
 * HUMAN TASKS:
 * 1. Verify location permissions are properly configured in AndroidManifest.xml
 * 2. Test background location tracking behavior on different Android versions
 * 3. Ensure proper error handling and retry mechanisms for location updates
 * 4. Validate location accuracy settings based on device capabilities
 */

// React and React Native imports - versions specified for security
import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch
} from 'react-native'; // ^0.71.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { LOCATION_CONFIG } from '../../constants/config';
import { useLocation } from '../../hooks/useLocation';
import {
  checkLocationPermission,
  requestLocationPermission
} from '../../utils/permissions';
import Button from '../../components/common/Button';

// Interface for location settings state management
interface LocationSettingsState {
  hasPermission: boolean;
  backgroundTracking: boolean;
  highAccuracy: boolean;
  updateInterval: number;
}

/**
 * LocationSettings screen component for managing location tracking configuration
 * Implements requirements:
 * - Real-time GPS tracking with 30-second update intervals
 * - GPS and sensor integration for accurate location tracking
 * - Support for offline operation and efficient resource utilization
 */
const LocationSettings: React.FC = () => {
  const navigation = useNavigation();
  
  // Location tracking hook
  const {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking
  } = useLocation();

  // Local state management
  const [settings, setSettings] = useState<LocationSettingsState>({
    hasPermission: false,
    backgroundTracking: false,
    highAccuracy: true,
    updateInterval: LOCATION_CONFIG.updateInterval
  });

  /**
   * Checks and requests location permissions if needed
   * Implements requirement: GPS and sensor integration
   */
  const checkPermissions = useCallback(async () => {
    try {
      const hasPermission = await checkLocationPermission();
      setSettings(prev => ({ ...prev, hasPermission }));

      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Location access is needed for real-time tracking. Please grant permission in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Grant Permission',
              onPress: async () => {
                const granted = await requestLocationPermission();
                setSettings(prev => ({ ...prev, hasPermission: granted }));
              }
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        'Permission Error',
        'Failed to check location permissions. Please try again.'
      );
    }
  }, []);

  /**
   * Handles background tracking toggle with permission checks
   * Implements requirement: Real-time GPS tracking
   */
  const handleBackgroundTrackingToggle = useCallback(async (value: boolean) => {
    try {
      if (value) {
        const granted = await requestLocationPermission(true);
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Background location permission is needed for continuous tracking.'
          );
          return;
        }
      }

      // Stop current tracking if active
      if (isTracking) {
        stopTracking();
      }

      setSettings(prev => ({ ...prev, backgroundTracking: value }));

      // Restart tracking with new settings if it was active
      if (isTracking) {
        await startTracking();
      }
    } catch (err) {
      Alert.alert(
        'Settings Error',
        'Failed to update background tracking settings.'
      );
    }
  }, [isTracking, startTracking, stopTracking]);

  /**
   * Handles accuracy mode toggle
   * Implements requirement: GPS and sensor integration
   */
  const handleAccuracyToggle = useCallback((value: boolean) => {
    // Stop current tracking if active
    if (isTracking) {
      stopTracking();
    }

    setSettings(prev => ({ ...prev, highAccuracy: value }));

    // Restart tracking with new accuracy if it was active
    if (isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking, stopTracking]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  return (
    <ScrollView style={styles.container}>
      {/* Permission Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Permission</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Location Access
          </Text>
          <Button
            title={settings.hasPermission ? "Granted" : "Request Permission"}
            onPress={checkPermissions}
            variant={settings.hasPermission ? "secondary" : "primary"}
            disabled={settings.hasPermission}
          />
        </View>
        <Text style={styles.settingDescription}>
          Required for real-time location tracking
        </Text>
      </View>

      {/* Background Tracking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background Tracking</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Enable Background Updates
          </Text>
          <Switch
            value={settings.backgroundTracking}
            onValueChange={handleBackgroundTrackingToggle}
            disabled={!settings.hasPermission}
          />
        </View>
        <Text style={styles.settingDescription}>
          Allows tracking when app is minimized
        </Text>
      </View>

      {/* Accuracy Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accuracy Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            High Accuracy Mode
          </Text>
          <Switch
            value={settings.highAccuracy}
            onValueChange={handleAccuracyToggle}
            disabled={!settings.hasPermission}
          />
        </View>
        <Text style={styles.settingDescription}>
          Uses GPS for precise location (higher battery usage)
        </Text>
      </View>

      {/* Update Interval Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Interval</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Location Update Interval
          </Text>
          <Text style={styles.settingLabel}>
            30 seconds
          </Text>
        </View>
        <Text style={styles.settingDescription}>
          Fixed interval for optimal tracking and battery life
        </Text>
      </View>

      {/* Current Status Section */}
      {error && (
        <View style={styles.section}>
          <Text style={[styles.settingDescription, styles.error]}>
            Error: {error}
          </Text>
        </View>
      )}

      {currentLocation && (
        <View style={styles.section}>
          <Text style={styles.settingDescription}>
            Last Update: {new Date(currentLocation.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  settingLabel: {
    fontSize: 16
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4
  },
  error: {
    color: '#FF0000'
  }
});

export default LocationSettings;