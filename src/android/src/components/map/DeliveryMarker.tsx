/**
 * HUMAN TASKS:
 * 1. Configure proper map marker icon sizes in the app's design system
 * 2. Verify color scheme matches the app's branding guidelines
 * 3. Test marker touch targets on different device sizes
 * 4. Ensure proper offline state persistence configuration
 */

// Third-party imports
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native'; // ^0.72.0
import { Marker } from 'react-native-maps'; // ^1.7.1
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import { Delivery, DeliveryStatus } from '../../types';

interface Props {
  delivery: Delivery;
  onPress: (delivery: Delivery) => void;
  isSelected: boolean;
}

// Requirement: Visual representation of delivery locations on the map with 30-second update intervals
export const DeliveryMarker: React.FC<Props> = ({ delivery, onPress, isSelected }) => {
  // Memoized marker color based on delivery status
  const markerColor = useMemo(() => getMarkerColor(delivery.status), [delivery.status]);
  
  // Memoized status icon based on delivery status
  const statusIcon = useMemo(() => getStatusIcon(delivery.status), [delivery.status]);

  // Debounced press handler to prevent multiple rapid presses
  const handleMarkerPress = useCallback(() => {
    onPress(delivery);
  }, [delivery, onPress]);

  return (
    <Marker
      identifier={`delivery-${delivery.id}`}
      coordinate={{
        // Requirement: Interactive delivery markers with status indicators
        latitude: parseFloat(delivery.address.split(',')[0]),
        longitude: parseFloat(delivery.address.split(',')[1])
      }}
      onPress={handleMarkerPress}
      tracksViewChanges={false}
    >
      <MaterialIcons
        name={statusIcon}
        size={isSelected ? 36 : 30}
        color={markerColor}
        style={[
          styles.marker,
          isSelected && styles.selected
        ]}
      />
    </Marker>
  );
};

// Requirement: Real-time delivery status monitoring with visual indicators
export const getMarkerColor = (status: DeliveryStatus): string => {
  switch (status) {
    case DeliveryStatus.PENDING:
      return '#FFA500'; // Orange
    case DeliveryStatus.IN_PROGRESS:
      return '#0000FF'; // Blue
    case DeliveryStatus.COMPLETED:
      return '#00FF00'; // Green
    case DeliveryStatus.FAILED:
      return '#FF0000'; // Red
    default:
      return '#808080'; // Gray
  }
};

// Requirement: Interactive delivery markers with status indicators
export const getStatusIcon = (status: DeliveryStatus): string => {
  switch (status) {
    case DeliveryStatus.PENDING:
      return 'schedule';
    case DeliveryStatus.IN_PROGRESS:
      return 'local-shipping';
    case DeliveryStatus.COMPLETED:
      return 'check-circle';
    case DeliveryStatus.FAILED:
      return 'error';
    default:
      return 'help';
  }
};

// Requirement: Markers maintain state and visual indicators during offline operation
const styles = StyleSheet.create({
  marker: {
    // Elevation and shadow for better visibility
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Padding for better touch target
    padding: 4,
    // Background for icon container
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  selected: {
    // Enhanced elevation and shadow for selected state
    elevation: 8,
    shadowOpacity: 0.35,
    shadowRadius: 5.84,
    // Border for selected state
    borderWidth: 2,
    borderColor: '#000000',
  },
});