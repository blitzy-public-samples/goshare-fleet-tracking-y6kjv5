/**
 * HUMAN TASKS:
 * 1. Verify proper permission request dialogs are shown on both iOS and Android
 * 2. Test storage clearing functionality with different data volumes
 * 3. Validate offline data persistence after storage management
 * 4. Ensure proper error handling for permission denials
 */

// React 18.0.0
import React, { useState, useEffect, useCallback } from 'react';
// React Native 0.71.0
import {
  View,
  ScrollView,
  Text,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';

// Internal dependencies
import Button from '../../components/common/Button';
import { StorageManager, getStorageMetrics } from '../../utils/storage';
import usePermissions from '../../hooks/usePermissions';

// Interfaces
interface StorageMetrics {
  totalUsage: number;
  availableSpace: number;
  usageByType: object;
}

interface AppSettingsState {
  locationEnabled: boolean;
  notificationsEnabled: boolean;
  backgroundTrackingEnabled: boolean;
  storageMetrics: StorageMetrics | null;
}

/**
 * AppSettings component for managing application preferences and permissions
 * Implements requirements:
 * - Mobile Applications: Settings management for React Native driver application
 * - Offline-first architecture: Storage management and offline settings
 * - GPS and sensor integration: Location permission and tracking settings
 */
const AppSettings: React.FC = () => {
  // State management
  const [settings, setSettings] = useState<AppSettingsState>({
    locationEnabled: false,
    notificationsEnabled: false,
    backgroundTrackingEnabled: false,
    storageMetrics: null,
  });

  // Custom hooks
  const {
    locationPermission,
    notificationPermission,
    requestLocation,
    requestNotifications,
  } = usePermissions();

  // Load initial settings and metrics
  useEffect(() => {
    loadStorageMetrics();
    setSettings(prev => ({
      ...prev,
      locationEnabled: locationPermission,
      notificationsEnabled: notificationPermission,
    }));
  }, [locationPermission, notificationPermission]);

  /**
   * Loads current storage usage metrics
   * Implements requirement: Offline-first architecture - Storage management
   */
  const loadStorageMetrics = async () => {
    try {
      const metrics = await getStorageMetrics();
      setSettings(prev => ({ ...prev, storageMetrics: metrics as StorageMetrics }));
    } catch (error) {
      Alert.alert('Error', 'Failed to load storage metrics');
    }
  };

  /**
   * Handles location permission toggle
   * Implements requirement: GPS and sensor integration - Location tracking settings
   */
  const handleLocationToggle = useCallback(async () => {
    try {
      if (!settings.locationEnabled) {
        const granted = await requestLocation();
        if (granted) {
          setSettings(prev => ({
            ...prev,
            locationEnabled: true,
            backgroundTrackingEnabled: false,
          }));
        }
      } else {
        setSettings(prev => ({
          ...prev,
          locationEnabled: false,
          backgroundTrackingEnabled: false,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update location permission');
    }
  }, [settings.locationEnabled, requestLocation]);

  /**
   * Handles notification permission toggle
   * Implements requirement: Mobile Applications - Notification management
   */
  const handleNotificationToggle = useCallback(async () => {
    try {
      if (!settings.notificationsEnabled) {
        const granted = await requestNotifications();
        if (granted) {
          setSettings(prev => ({ ...prev, notificationsEnabled: true }));
        }
      } else {
        setSettings(prev => ({ ...prev, notificationsEnabled: false }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification permission');
    }
  }, [settings.notificationsEnabled, requestNotifications]);

  /**
   * Handles background tracking toggle
   * Implements requirement: GPS and sensor integration - Background tracking
   */
  const handleBackgroundTrackingToggle = useCallback(async () => {
    if (!settings.locationEnabled) {
      Alert.alert('Error', 'Please enable location services first');
      return;
    }

    setSettings(prev => ({
      ...prev,
      backgroundTrackingEnabled: !prev.backgroundTrackingEnabled,
    }));
  }, [settings.locationEnabled]);

  /**
   * Handles storage clearing with confirmation
   * Implements requirement: Offline-first architecture - Storage management
   */
  const handleClearStorage = useCallback(async () => {
    Alert.alert(
      'Clear Storage',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const storageManager = new StorageManager();
              await storageManager.clearStorage();
              await loadStorageMetrics();
              Alert.alert('Success', 'Storage cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage');
            }
          },
        },
      ]
    );
  }, []);

  // Format storage size for display
  const formatStorageSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Location Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Services</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Location</Text>
          <Switch
            value={settings.locationEnabled}
            onValueChange={handleLocationToggle}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Background Tracking</Text>
          <Switch
            value={settings.backgroundTrackingEnabled}
            onValueChange={handleBackgroundTrackingToggle}
            disabled={!settings.locationEnabled}
          />
        </View>
      </View>

      {/* Notification Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleNotificationToggle}
          />
        </View>
      </View>

      {/* Storage Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Management</Text>
        {settings.storageMetrics && (
          <>
            <Text style={styles.metricsText}>
              Used Space: {formatStorageSize(settings.storageMetrics.totalUsage)}
            </Text>
            <Text style={styles.metricsText}>
              Available: {formatStorageSize(settings.storageMetrics.availableSpace)}
            </Text>
          </>
        )}
        <Button
          title="Clear Storage"
          onPress={handleClearStorage}
          variant="outline"
          style={styles.clearButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
  },
  metricsText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  clearButton: {
    marginTop: 16,
  },
});

export default AppSettings;