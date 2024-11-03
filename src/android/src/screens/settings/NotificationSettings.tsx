/**
 * HUMAN TASKS:
 * 1. Configure Firebase Cloud Messaging in the Google Cloud Console
 * 2. Add google-services.json to android/app directory
 * 3. Configure notification icons in android/app/src/main/res/
 * 4. Update AndroidManifest.xml with required notification permissions
 * 5. Configure notification channels in device settings for Android 8.0+
 */

// Third-party imports
import React, { useEffect, useState, useCallback } from 'react'; // ^18.0.0
import { 
  View, 
  Text, 
  ScrollView, 
  Switch, 
  StyleSheet,
  Alert,
  Platform
} from 'react-native'; // ^0.72.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { NotificationService } from '../../services/notification';
import { StorageManager } from '../../utils/storage';

// Constants
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

// Custom hook for managing notification settings
const useNotificationSettings = () => {
  const [settings, setSettings] = useState({
    deliveryAlerts: true,
    routeUpdates: true,
    systemNotifications: true,
    soundEnabled: true
  });

  const storageManager = new StorageManager();
  const notificationService = new NotificationService();

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await storageManager.getData(NOTIFICATION_SETTINGS_KEY);
        if (savedSettings) {
          setSettings(savedSettings);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Update individual setting
  const updateSetting = useCallback(async (key: string, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await storageManager.storeData(NOTIFICATION_SETTINGS_KEY, newSettings);
      
      // Initialize notification service if any setting is enabled
      if (Object.values(newSettings).some(setting => setting)) {
        await notificationService.initialize();
      }
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.'
      );
    }
  }, [settings]);

  return {
    ...settings,
    updateSetting
  };
};

// Main notification settings screen component
export default class NotificationSettings extends React.Component {
  private notificationService: NotificationService;
  private storageManager: StorageManager;

  constructor(props: any) {
    super(props);
    // Initialize services
    this.notificationService = new NotificationService();
    this.storageManager = new StorageManager();

    // Set navigation options
    props.navigation.setOptions({
      headerTitle: 'Notification Settings',
      headerTitleAlign: 'center'
    });
  }

  // Handle permission request
  private handlePermissionRequest = async (): Promise<void> => {
    try {
      const granted = await this.notificationService.requestPermissions();
      if (granted) {
        await this.notificationService.initialize();
        Alert.alert(
          'Success',
          'Notification permissions granted successfully.'
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to receive important updates.'
        );
      }
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      Alert.alert(
        'Error',
        'Failed to request notification permissions. Please try again.'
      );
    }
  };

  // Render individual setting item
  private renderSettingItem = (
    label: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ): React.ReactNode => {
    return (
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#1e88e5' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>
    );
  };

  // Save notification settings
  private saveSettings = async (): Promise<void> => {
    try {
      const settings = {
        deliveryAlerts: true,
        routeUpdates: true,
        systemNotifications: true,
        soundEnabled: true
      };
      await this.storageManager.storeData(NOTIFICATION_SETTINGS_KEY, settings);
      await this.notificationService.initialize();
      Alert.alert(
        'Success',
        'Notification settings saved successfully.'
      );
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert(
        'Error',
        'Failed to save notification settings. Please try again.'
      );
    }
  };

  render() {
    const {
      deliveryAlerts,
      routeUpdates,
      systemNotifications,
      soundEnabled,
      updateSetting
    } = useNotificationSettings();

    return (
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDescription}>
            Configure which notifications you would like to receive
          </Text>

          {this.renderSettingItem(
            'Delivery Alerts',
            deliveryAlerts,
            (value) => updateSetting('deliveryAlerts', value)
          )}
          {this.renderSettingItem(
            'Route Updates',
            routeUpdates,
            (value) => updateSetting('routeUpdates', value)
          )}
          {this.renderSettingItem(
            'System Notifications',
            systemNotifications,
            (value) => updateSetting('systemNotifications', value)
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound Settings</Text>
          {this.renderSettingItem(
            'Enable Sound',
            soundEnabled,
            (value) => updateSetting('soundEnabled', value)
          )}
        </View>

        <View style={styles.permissionSection}>
          <Text style={styles.sectionTitle}>Notification Permissions</Text>
          <Text style={styles.permissionText}>
            {Platform.select({
              ios: 'Allow Fleet Tracker to send you notifications for important updates and alerts.',
              android: 'Enable notifications to receive delivery updates and important alerts.'
            })}
          </Text>
          <View style={styles.permissionButton} onTouchEnd={this.handlePermissionRequest}>
            <Text style={styles.permissionButtonText}>
              Request Notification Permissions
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginVertical: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e1e1e'
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333'
  },
  permissionSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginVertical: 8
  },
  permissionText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20
  },
  permissionButton: {
    backgroundColor: '#1e88e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});